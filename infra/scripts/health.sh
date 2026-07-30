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
HTTP=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "Host: staging.darlinghome.bg" https://127.0.0.1/ 2>/dev/null || echo 000)
CERT_END=$(echo | openssl s_client -connect 127.0.0.1:443 -servername staging.darlinghome.bg 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
CERT_DAYS=$([ -n "$CERT_END" ] && echo $(( ( $(date -d "$CERT_END" +%s) - $(date +%s) ) / 86400 )) || echo -1)
DISK=$(df -P / | awk 'NR==2{gsub("%","",$5); print $5}')

# The MAIL certificate renews on the same cron but is NOT served by nginx, so the
# check above cannot see it. A silent renewal failure there stops mail rather than
# the website — a quieter failure, and therefore one worth watching explicitly.
MAIL_CERT=/srv/darling/prod/nginx/certbot/conf/live/mail.darlinghome.bg/fullchain.pem
MAIL_CERT_END=$([ -r "$MAIL_CERT" ] && openssl x509 -in "$MAIL_CERT" -noout -enddate 2>/dev/null | cut -d= -f2)
MAIL_CERT_DAYS=$([ -n "$MAIL_CERT_END" ] && echo $(( ( $(date -d "$MAIL_CERT_END" +%s) - $(date +%s) ) / 86400 )) || echo -1)
MAIL_UP=$(docker compose ps --status running -q mailserver </dev/null 2>/dev/null | wc -l)
MEM=$(free -m | awk '/^Mem:/{printf "%d", $3*100/$2}')

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
exit $FAIL
