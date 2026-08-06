# WP-Cron is off, and nothing replaced it

Found 2026-08-06 by the panel session during a review pass over the day's landings.
NOT FIXED - deliberately. The fix is an infra change and infra/** auto-deploys to the live
shop; this was found at the end of a long day. It is written down instead. Pick it up first.

## The fact

`infra/docker-compose.yml` line 52, inside WORDPRESS_CONFIG_EXTRA:

    define('DISABLE_WP_CRON', true);

That is the right setting - the traffic-triggered cron WordPress ships with fires on random
page loads and is unusable for anything that has to happen at a particular time. But turning
it off is only half the change. The other half is something that runs the queue instead, and
there is nothing: no cron service in docker-compose (services are db, redis, wordpress, nginx,
mailserver, roundcube), no wp-cron line in infra/scripts, nothing in deploy.sh. The only cron
in the whole repo is the Let's Encrypt renewal, which is a host crontab entry for certs.

I could not read the box's own crontab from here (the deploy key carries a forced command, by
design), so I cannot rule out a hand-added entry on the server. That does not change the
conclusion: if it exists it is not in the repo, so a rebuild loses it and nobody knows it is
load-bearing.

## What is scheduled, and therefore what is not running

    class-borica-gateway.php:511   wp_schedule_single_event(+960s, 'darling_borica_recheck')
    class-borica-gateway.php:644   the same, from reschedule(), up to RECHECK_MAX times
    class-cart-capture.php:34      wp_schedule_event(daily, abandoned-cart job)

WooCommerce's own scheduled work mostly survives this, because Action Scheduler has an async
runner that piggybacks on ordinary requests. Plain `wp_schedule_single_event` has no such
fallback. Both of the events above are plain WP-Cron.

## Why the BORICA one matters

The whole point of the recheck is the case where the gateway answers with something that is
not final. BORICA's own protocol says a negative RC inside GUARDTIME (900s) is provisional and
only final after 960s. The callback therefore puts the order ON HOLD and schedules a TRTYPE=90
status query for +960s.

With no cron, that query never runs. The order stays on hold forever. The customer's card may
well have been charged - we simply never ask. Nothing goes red, no error is logged, no email
is sent: it looks exactly like an order nobody has got round to yet. A dead poller looks like
a quiet day.

This is not bleeding today: `is_available()` keeps the gateway off the checkout until the key
file is present, and the credentials have not arrived. It IS a go-live blocker. The recheck
path must be proven to actually fire before the first real card payment.

## The fix, when someone picks it up

A sidecar in infra/docker-compose.yml on the same `wordpress:php8.3-fpm` image, sharing the wp
volume, running `php /var/www/html/wp-cron.php` on a 60s loop, is the version that stays in the
repo and survives a rebuild. It needs no HTTP, so it is not subject to the nginx rate limits in
00-limits.conf and does not need the staging basic-auth credentials - which a curl to
wp-cron.php on staging would.

Whatever is chosen, TEST THE RESULT, not the config: put a real order into the on-hold +
scheduled state, wait out the 960s, and confirm from the order itself that the recheck ran.
"The container is up" is not the same claim.

## Second-order

The same gap silently disables the abandoned-cart daily job in class-cart-capture.php. Nobody
has noticed, which is the point.