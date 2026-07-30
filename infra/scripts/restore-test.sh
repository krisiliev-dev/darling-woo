#!/usr/bin/env bash
# Actually RESTORE the latest dump into a scratch database and verify it.
# An untested backup is a belief, not a backup. The timestamp this writes is
# what monitoring should watch — deliberately the restore-TEST date, not the
# backup date, so "we have backups" cannot quietly mean "we have never opened them".
set -euo pipefail
APP=/srv/darling/prod
cd "$APP"
set -a; . ./.env; set +a

LATEST=$(ls -1t "$APP"/backups/db-*.sql.gz 2>/dev/null | head -1)
[ -n "$LATEST" ] || { echo "[restore-test] FAIL: no dump found"; exit 1; }
echo "[restore-test] using $(basename "$LATEST")"

q() { docker compose exec -T db mariadb -u root -p"$MYSQL_ROOT_PASSWORD" -N -B -e "$1" </dev/null; }

SRC_TABLES=$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DATABASE';")

q "DROP DATABASE IF EXISTS restore_test; CREATE DATABASE restore_test;"
gunzip -c "$LATEST" | docker compose exec -T db mariadb -u root -p"$MYSQL_ROOT_PASSWORD" restore_test
DST_TABLES=$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='restore_test';")
q "DROP DATABASE restore_test;"

echo "[restore-test] source tables=$SRC_TABLES  restored tables=$DST_TABLES"
[ "$SRC_TABLES" = "$DST_TABLES" ] || { echo "[restore-test] FAIL: table count mismatch"; exit 1; }
if [ "$SRC_TABLES" = "0" ]; then
  echo "[restore-test] WARNING: database is empty (WordPress not installed yet) —"
  echo "[restore-test] this proves the mechanism, not the data. Re-check after install."
fi
echo "$SRC_TABLES" > "$APP/.restore-test-tables"
date -u +%FT%TZ > "$APP/.last-restore-test"
echo "[restore-test] ok"
