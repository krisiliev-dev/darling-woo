#!/usr/bin/env bash
# Nightly backup. Fails CLOSED: a backup that silently produces an empty or
# corrupt dump is worse than no backup, because it looks like protection.
set -euo pipefail
APP=/srv/darling/prod
cd "$APP"
set -a; . ./.env; set +a

TS=$(date -u +%Y%m%dT%H%M%SZ)
DEST="$APP/backups"
mkdir -p "$DEST"

echo "[backup] $TS"

# --- database (the money) ---
docker compose exec -T db mariadb-dump -u root -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --quick --routines --events "$MYSQL_DATABASE" </dev/null \
  | gzip > "$DEST/db-$TS.sql.gz"

# integrity gates — refuse to keep something we cannot restore
[ -s "$DEST/db-$TS.sql.gz" ] || { echo "[backup] FAIL: dump is empty"; rm -f "$DEST/db-$TS.sql.gz"; exit 1; }
gzip -t "$DEST/db-$TS.sql.gz" || { echo "[backup] FAIL: dump is corrupt"; rm -f "$DEST/db-$TS.sql.gz"; exit 1; }
gunzip -c "$DEST/db-$TS.sql.gz" | head -5 | grep -qi 'mariadb\|mysql dump' \
  || { echo "[backup] FAIL: dump header not recognised"; rm -f "$DEST/db-$TS.sql.gz"; exit 1; }

# --- uploads (irreplaceable: product imagery) ---
if [ -d "$APP/wordpress/wp-content/uploads" ]; then
  tar -czf "$DEST/uploads-$TS.tar.gz" -C "$APP/wordpress/wp-content" uploads
fi

# --- config (small, and painful to reconstruct) ---
tar -czf "$DEST/config-$TS.tar.gz" -C "$APP" .env nginx/conf.d php 2>/dev/null || true

# --- retention ---
find "$DEST" -name 'db-*.sql.gz'      -mtime +7  -delete
find "$DEST" -name 'uploads-*.tar.gz' -mtime +7  -delete
find "$DEST" -name 'config-*.tar.gz'  -mtime +30 -delete

# --- off-site copy to Cloudflare R2 ---
# Different provider on purpose: cross-copying to the other Contabo box would
# share a failure domain (account suspension, DC incident) with the original.
# Deliberately NOT `|| true`: a silently-failing off-site copy is the failure
# you only discover when you need it.
R2="r2:darling-woocommerce-website-backups"
if "$HOME/bin/rclone" copy "$DEST" "$R2/"       --include 'db-*.sql.gz' --include 'uploads-*.tar.gz' --include 'config-*.tar.gz'       --transfers 2 --retries 3 2>&1; then
  date -u +%FT%TZ > "$APP/.last-offsite"
  rm -f "$APP/.offsite-failed"
  echo "[backup] off-site ok"
else
  echo "[backup] WARN: R2 UPLOAD FAILED — local backup kept, OFF-SITE COPY IS NOW STALE" >&2
  date -u +%FT%TZ > "$APP/.offsite-failed"
fi

date -u +%FT%TZ > "$APP/.last-backup"
echo "[backup] ok — $(du -sh "$DEST" | cut -f1) total, db dump $(du -h "$DEST/db-$TS.sql.gz" | cut -f1)"
