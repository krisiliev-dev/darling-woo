#!/usr/bin/env bash
# Component health for this box. Emits JSON for the panel to consume later.
# NOTE: this can never report that the box itself is down — liveness must come
# from an external pinger. This covers only what the box can see about itself.
set -uo pipefail
APP=/srv/darling/prod
cd "$APP" || exit 1
set -a; . ./.env 2>/dev/null; set +a

age_days() { [ -f "$1" ] && echo $(( ( $(date +%s) - $(date -d "$(cat "$1")" +%s) ) / 86400 )) || echo -1; }

CONTAINERS=$(docker compose ps --format '{{.Service}}:{{.State}}' </dev/null 2>/dev/null | paste -sd, -)
UP=$(docker compose ps --status running -q </dev/null 2>/dev/null | wc -l)
DB_OK=$(docker compose exec -T db mariadb -u root -p"${MYSQL_ROOT_PASSWORD:-}" -N -B -e "SELECT 1;" </dev/null 2>/dev/null | tr -d '\n' || echo 0)
# The Host header and the SNI name MUST be the live site. They said
# staging.darlinghome.bg until 2026-08-06, which survived the cutover unnoticed:
# the apex block 301s that hostname, so this check logged "ALERT: site returned
# 301" 45 times AND — the part that actually mattered — never checked the real
# site at all. A monitor pointed at a hostname that no longer exists is worse
# than no monitor: it reports failure while proving nothing.
HTTP=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "Host: darlinghome.bg" https://127.0.0.1/ 2>/dev/null || echo 000)
CERT_END=$(echo | openssl s_client -connect 127.0.0.1:443 -servername darlinghome.bg 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
CERT_DAYS=$([ -n "$CERT_END" ] && echo $(( ( $(date -d "$CERT_END" +%s) - $(date +%s) ) / 86400 )) || echo -1)
DISK=$(df -P / | awk 'NR==2{gsub("%","",$5); print $5}')

# The MAIL certificate renews on the same cron but is NOT served by nginx, so the
# check above cannot see it. A silent renewal failure there stops mail rather than
# the website — a quieter failure, and therefore one worth watching explicitly.
# Read it FROM THE PORT IT IS SERVED ON, not from the filesystem. The file lives
# under a root-owned certbot directory the darling user cannot read, so this check
# reported -1 forever — the "quieter failure worth watching" was itself the thing
# not being watched. Probing 993 also tests the cert as a mail client actually
# sees it, which the file never did.
MAIL_CERT_END=$(echo | timeout 10 openssl s_client -connect mail.darlinghome.bg:993 -servername mail.darlinghome.bg 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
MAIL_CERT_DAYS=$([ -n "$MAIL_CERT_END" ] && echo $(( ( $(date -d "$MAIL_CERT_END" +%s) - $(date +%s) ) / 86400 )) || echo -1)
MAIL_UP=$(docker compose ps --status running -q mailserver </dev/null 2>/dev/null | wc -l)
MEM=$(free -m | awk '/^Mem:/{printf "%d", $3*100/$2}')

# WP-Cron is run by the `wpcron` sidecar, not by WordPress itself (DISABLE_WP_CRON is on).
# Watch the QUEUE, not the container. "The container is up" and "scheduled work is happening"
# are different claims, and it was the second one that was false - silently, for weeks, while
# every container reported healthy. The `cron` option is a timestamp-keyed array kept in
# ascending order, so the FIRST key is the next thing due; if that moment is well in the past,
# nothing is draining the queue.
# A row we cannot read is an ALERT, not a pass. Reporting "fine" because the query failed is
# how a monitor ends up proving nothing while looking green.
CRON_BLOB=$(docker compose exec -T db mariadb -u root -p"${MYSQL_ROOT_PASSWORD:-}" -N -B \
  -e "SELECT option_value FROM wp_options WHERE option_name='cron' LIMIT 1;" \
  "${MYSQL_DATABASE:-}" </dev/null 2>/dev/null || echo "")
CRON_NEXT=$(printf '%s' "$CRON_BLOB" | sed -n 's/^a:[0-9]*:{i:\([0-9]\{9,\}\);.*/\1/p' | head -n1)
if [ -z "$CRON_BLOB" ]; then
  CRON_LATE_MIN=-1                     # queue unreadable - see the alert below
elif [ -z "$CRON_NEXT" ]; then
  CRON_LATE_MIN=0                      # queue readable and empty; nothing is due, nothing late
else
  CRON_LATE_MIN=$(( ( $(date +%s) - CRON_NEXT ) / 60 ))
  [ "$CRON_LATE_MIN" -lt 0 ] && CRON_LATE_MIN=0     # next event is in the future
fi

cat > "$APP/health.json" <<JSON
{
  "generated": "$(date -u +%FT%TZ)",
  "containers": "$CONTAINERS",
  "containers_running": $UP,
  "db_ok": ${DB_OK:-0},
  "http_code": $HTTP,
  "cert_days_remaining": $CERT_DAYS,
  "mail_cert_days_remaining": $MAIL_CERT_DAYS,
  "mailserver_running": $MAIL_UP,
  "disk_used_pct": $DISK,
  "mem_used_pct": $MEM,
  "cron_late_min": $CRON_LATE_MIN,
  "backup_age_days": $(age_days "$APP/.last-backup"),
  "restore_test_age_days": $(age_days "$APP/.last-restore-test")
}
JSON
cat "$APP/health.json"

# --- narrow, UNAUTHENTICATED document for the peer box ---
# Deliberately minimal: no versions, paths, counts, hostnames or product data.
# It answers only "is this box healthy and are its backups being tested".
age_h() { [ -f "$1" ] && echo $(( ( $(date +%s) - $(date -d "$(cat "$1")" +%s) ) / 3600 )) || echo -1; }
TABLES=$(cat "$APP/.restore-test-tables" 2>/dev/null || echo 0)
MECH_ONLY=$([ "${TABLES:-0}" -eq 0 ] && echo true || echo false)
OK=$([ "$UP" -ge 4 ] && [ "${DB_OK:-0}" = "1" ] && echo true || echo false)
mkdir -p "$APP/public"
cat > "$APP/public/peer-health.json" <<JSON
{"ok":$OK,"db":"$([ "${DB_OK:-0}" = "1" ] && echo ok || echo down)","restore_test_age_h":$(age_h "$APP/.last-restore-test"),"backup_age_h":$(age_h "$APP/.last-backup"),"offsite_age_h":$(age_h "$APP/.last-offsite"),"proves_mechanism_only":$MECH_ONLY}
JSON

# non-zero exit if anything is actually wrong, so cron mail / monitoring notices
FAIL=0
[ "$UP" -ge 4 ]            || { echo "ALERT: only $UP containers running"; FAIL=1; }
[ "${DB_OK:-0}" = "1" ]    || { echo "ALERT: database not responding"; FAIL=1; }
case "$HTTP" in 200|302|401) ;; *) echo "ALERT: site returned $HTTP"; FAIL=1;; esac
[ "$CERT_DAYS" -gt 14 ]    || { echo "ALERT: cert expires in $CERT_DAYS days"; FAIL=1; }
[ "$DISK" -lt 85 ]         || { echo "ALERT: disk ${DISK}% full"; FAIL=1; }
# Two separate failures, because they need different answers: one means the runner is dead,
# the other means this check is blind and cannot tell you either way.
[ "$CRON_LATE_MIN" -ge 0 ] || { echo "ALERT: cannot read the WP-Cron queue - staleness unknown"; FAIL=1; }
[ "$CRON_LATE_MIN" -lt 15 ] || { echo "ALERT: WP-Cron queue is ${CRON_LATE_MIN} min overdue - the wpcron runner is not draining it"; FAIL=1; }
exit $FAIL
