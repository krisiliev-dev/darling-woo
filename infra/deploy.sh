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
cp "$REPO_DIR/infra/renew-certs.sh"      renew-certs.sh && chmod +x renew-certs.sh
# --delete would remove .htpasswd, which is server-side only
rsync -a --exclude '.htpasswd' "$REPO_DIR/infra/nginx/conf.d/" nginx/conf.d/

echo "[deploy] validating before applying…"
docker compose config -q </dev/null

echo "[deploy] applying…"
docker compose up -d --remove-orphans </dev/null
docker compose exec -T nginx nginx -t </dev/null
docker compose exec -T nginx nginx -s reload </dev/null

echo "[deploy] health check…"
code=$(curl -s -o /dev/null -w '%{http_code}' -u "darling:$(cat "$APP_DIR/.staging-password")" https://staging.darlinghome.bg/ || echo 000)
echo "[deploy] site returned $code"
[ "$code" = "200" ] || [ "$code" = "302" ] || { echo "[deploy] FAILED health check"; exit 1; }
echo "[deploy] ok"
