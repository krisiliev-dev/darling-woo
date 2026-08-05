#!/bin/bash
# Blog index config: Блог page as posts page. front-page.html keeps rendering '/'
# regardless of show_on_front, so the front page is untouched by this.
set -euo pipefail
cd /srv/darling/prod
W=scripts/wp.sh

get_page_id () { # by slug
  $W post list --post_type=page --name="$1" --field=ID | head -1
}

BLOG_ID=$(get_page_id blog)
if [ -z "$BLOG_ID" ]; then
  BLOG_ID=$($W post create --post_type=page --post_title='Блог' --post_name=blog --post_status=publish --porcelain)
  echo "created blog page id=$BLOG_ID"
else
  echo "blog page exists id=$BLOG_ID"
fi

HOME_ID=$(get_page_id nachalo)
if [ -z "$HOME_ID" ]; then
  HOME_ID=$($W post create --post_type=page --post_title='Начало' --post_name=nachalo --post_status=publish --porcelain)
  echo "created front placeholder id=$HOME_ID"
else
  echo "front placeholder exists id=$HOME_ID"
fi

$W option update show_on_front page
$W option update page_on_front "$HOME_ID"
$W option update page_for_posts "$BLOG_ID"

echo '=== verify options ==='
for o in show_on_front page_on_front page_for_posts; do
  echo "$o=$($W option get $o)"
done
echo 'BLOG SETUP DONE'
