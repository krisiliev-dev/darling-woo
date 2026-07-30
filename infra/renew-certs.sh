#!/usr/bin/env bash
# Renew Let's Encrypt certs and reload nginx. Cron, twice daily.
set -uo pipefail
BASE=/srv/darling/prod
cd "$BASE" || exit 1
docker run --rm \
  -v "$BASE/nginx/certbot/conf:/etc/letsencrypt" \
  -v "$BASE/nginx/certbot/www:/var/www/certbot" \
  certbot/certbot renew --webroot -w /var/www/certbot --quiet </dev/null
docker compose exec -T nginx nginx -s reload </dev/null 2>/dev/null \
  || docker compose restart nginx </dev/null
