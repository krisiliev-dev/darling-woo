#!/usr/bin/env bash
# Runs ON the server, invoked by CI as a forced command.
# Syncs versioned infra config from the repo and applies it.
# Never touches .env, .htpasswd, certs, or data volumes.
set -euo pipefail

REPO_DIR=/srv/darling/repo
APP_DIR=/srv/darling/prod
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/github_darling_woo -o IdentitiesOnly=yes"

echo "[deploy] fetching origin/main…"
git -C "$REPO_DIR" fetch --quiet origin main
git -C "$REPO_DIR" reset --hard --quiet origin/main
echo "[deploy] at $(git -C "$REPO_DIR" rev-parse --short HEAD)"

echo "[deploy] syncing infra config…"
cd "$APP_DIR"
cp "$REPO_DIR/infra/docker-compose.yml" docker-compose.yml
cp "$REPO_DIR/infra/php/uploads.ini"     php/uploads.ini
cp "$REPO_DIR/infra/php/fpm-pool.conf"  php/fpm-pool.conf
cp "$REPO_DIR/infra/renew-certs.sh"      renew-certs.sh && chmod +x renew-certs.sh
# --delete would remove .htpasswd, which is server-side only
rsync -a --exclude '.htpasswd' "$REPO_DIR/infra/nginx/conf.d/" nginx/conf.d/
mkdir -p "$APP_DIR/scripts" "$APP_DIR/public"
rsync -a "$REPO_DIR/infra/scripts/" "$APP_DIR/scripts/"
# Theme is versioned too, so a redeploy restores it exactly.
# wp-content is owned by the php-fpm user (uid 33), not by us — hence sudo,
# and hence chown afterwards so WordPress can still manage the files.
sudo -n mkdir -p "$APP_DIR/wordpress/wp-content/themes/darling"
sudo -n rsync -a --delete "$REPO_DIR/theme/darling/" "$APP_DIR/wordpress/wp-content/themes/darling/"
sudo -n chown -R 33:33 "$APP_DIR/wordpress/wp-content/themes/darling"

# Our own plugin, versioned the same way.
# Syntax-check BEFORE installing it: a PHP fatal in an active plugin white-screens
# the whole site, and the deploy would have "succeeded".
for f in $(find "$REPO_DIR/plugin" -name '*.php'); do
  docker run --rm -v "$REPO_DIR/plugin:/p:ro" --entrypoint php wordpress:cli     -l "/p/${f#$REPO_DIR/plugin/}" >/dev/null </dev/null || { echo "[deploy] PHP SYNTAX ERROR in $f"; exit 1; }
done
sudo -n mkdir -p "$APP_DIR/wordpress/wp-content/plugins/darling-checkout"
sudo -n rsync -a --delete "$REPO_DIR/plugin/darling-checkout/" "$APP_DIR/wordpress/wp-content/plugins/darling-checkout/"
sudo -n chown -R 33:33 "$APP_DIR/wordpress/wp-content/plugins/darling-checkout"
chmod +x "$APP_DIR"/scripts/*.sh

echo "[deploy] validating before applying…"
docker compose config -q </dev/null

echo "[deploy] applying…"
docker compose up -d --remove-orphans </dev/null
docker compose exec -T nginx nginx -t </dev/null
docker compose exec -T nginx nginx -s reload </dev/null

echo "[deploy] health check…"
# Retry: nginx -s reload has a brief window where the listener is not yet ready,
# and a health check that fails intermittently is worse than none — people learn
# to re-run it instead of believing it.
# Note: `code=$(curl -w '%{http_code}') || code=000` and NOT `... || echo 000`:
# curl prints 000 *and* exits non-zero on connection failure, so the echo form
# concatenates into "000000".
URL="${WP_HOME:-https://staging.darlinghome.bg}/"
PW_FILE="$APP_DIR/.staging-password"
AUTH=()
[ -r "$PW_FILE" ] && AUTH=(-u "darling:$(cat "$PW_FILE")")
code=000
for attempt in 1 2 3 4 5; do
  sleep 2
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${AUTH[@]}" "$URL" 2>/dev/null) || code=000
  case "$code" in 200|302) break ;; esac
  echo "[deploy]   attempt $attempt: $code"
done
echo "[deploy] site returned $code"
case "$code" in
  200|302) echo "[deploy] ok" ;;
  *) echo "[deploy] FAILED health check after 5 attempts"; exit 1 ;;
esac
