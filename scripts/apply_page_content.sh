#!/bin/bash
# Slice 1: apply ported page content on staging. Expects /tmp/port/*.html uploaded.
set -euo pipefail
cd /srv/darling/prod

# CRLF strip (laptop writes CRLF, box wants LF)
mkdir -p /tmp/port/lf
for f in /tmp/port/*.html; do
  tr -d '\r' < "$f" > "/tmp/port/lf/$(basename "$f")"
done

# Make files visible inside the wp-cli container (mounts $PWD/wordpress at /var/www/html)
if sudo -n true 2>/dev/null; then SUDO="sudo -n"; else SUDO=""; fi
$SUDO mkdir -p wordpress/tmp-port
$SUDO cp /tmp/port/lf/*.html wordpress/tmp-port/
$SUDO chmod 644 wordpress/tmp-port/*.html

declare -A MAP=(
  [17]=page17_za-nas.html
  [18]=page18_pomosht.html
  [19]=page19_kontakti.html
  [20]=page20_obshti-usloviya.html
  [21]=page21_poveritelnost.html
  [22]=page22_dostavka.html
  [23]=page23_vrashtane.html
)
for id in 17 18 19 20 21 22 23; do
  echo "--- updating page $id from ${MAP[$id]}"
  scripts/wp.sh post update "$id" "/var/www/html/tmp-port/${MAP[$id]}"
done

echo '=== VERIFY: post_content byte lengths ==='
for id in 17 18 19 20 21 22 23; do
  n=$(scripts/wp.sh post get "$id" --field=post_content | wc -c)
  echo "page $id content bytes: $n"
done

echo '=== OPTIONS ==='
scripts/wp.sh option update woocommerce_terms_page_id 20
scripts/wp.sh option update wp_page_for_privacy_policy 21
echo '=== DELETE DRAFT 9 ==='
scripts/wp.sh post delete 9 --force

$SUDO rm -rf wordpress/tmp-port
rm -rf /tmp/port
echo 'APPLY DONE'
