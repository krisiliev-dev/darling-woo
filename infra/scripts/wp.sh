#!/usr/bin/env bash
# WP-CLI against the live site.  Usage:  scripts/wp.sh plugin list
#
# WordPress here is php-fpm with no CLI installed, so wp-cli runs as a separate
# container. Two things make that non-obvious, and both cost a failed run first:
#
#  1. wp-config.php reads its DB and Redis settings from the ENVIRONMENT, so the
#     cli container needs the same env or it cannot boot WordPress at all.
#  2. WORDPRESS_CONFIG_EXTRA (which holds the Redis defines) is MULTI-LINE, so
#     `--env-file` silently mangles it — env-file is line-based. Passing each var
#     as a separate -e argument is what actually survives.
#
# Sharing the wordpress container's network namespace gives us `db` and `redis`
# by name without publishing either port.
set -euo pipefail

APP_DIR=/srv/darling/prod
cd "$APP_DIR"

NET=$(docker compose ps --format '{{.Name}}' wordpress | head -1)
[ -n "$NET" ] || { echo "wp.sh: wordpress container is not running" >&2; exit 1; }

# base64 per-var so newlines survive the round trip through the shell.
ENV_ARGS=()
while IFS= read -r b64; do
	var=$(printf '%s' "$b64" | base64 -d)
	case "${var%%=*}" in
		PATH|HOME|HOSTNAME|PHP_*|PHPIZE_*) continue ;;   # cli image owns these
	esac
	ENV_ARGS+=( -e "$var" )
done < <(docker inspect -f '{{json .Config.Env}}' "$NET" | jq -r '.[] | @base64')

exec docker run --rm --network "container:$NET" \
	"${ENV_ARGS[@]}" \
	-v "$APP_DIR/wordpress:/var/www/html" \
	-u 33:33 \
	wordpress:cli wp --path=/var/www/html "$@"
