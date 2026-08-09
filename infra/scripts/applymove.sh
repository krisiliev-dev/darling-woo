#!/usr/bin/env bash
# Apply the moved checkout content. Kept as a FILE rather than a one-liner over
# ssh because the content has to reach wp-cli as ONE argument: passed inline,
# the shell split it and wp-cli read the first token as a filename and said
# "Unable to read content from 'wp:woocommerce/checkout'".
set -euo pipefail
cd /srv/darling/prod

NEW=/tmp/darling-checkout-new.html
[ -s "$NEW" ] || { echo "no new content at $NEW" >&2; exit 1; }

ID=$(./scripts/wp.sh option get woocommerce_checkout_page_id | tr -d '\r')
echo "checkout page id: $ID"

CONTENT=$(cat "$NEW")
./scripts/wp.sh post update "$ID" --post_content="$CONTENT"

echo "--- block order now ---"
./scripts/wp.sh post get "$ID" --field=post_content \
  | grep -o 'wp:woocommerce/checkout-[a-z-]*' \
  | grep -v 'order-summary' \
  | grep -v '^wp:woocommerce/checkout-fields' \
  | head -20

./scripts/wp.sh cache flush >/dev/null && echo "cache flushed"
