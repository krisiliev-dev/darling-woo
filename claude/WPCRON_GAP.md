# WP-Cron was off and nothing replaced it - fixed 2026-08-06

Found during a review pass, fixed the same night. This file stays because the SHAPE of the bug is
worth keeping: every container reported healthy, no error was logged, and the thing that was not
happening was the thing that decides whether a customer's card payment is recognised.

## What was wrong

`infra/docker-compose.yml` sets, inside WORDPRESS_CONFIG_EXTRA:

    define('DISABLE_WP_CRON', true);

Right on its own - the scheduler WordPress ships with fires on random page loads, so "in 960
seconds" really means "whenever somebody next visits". But turning it off is only half a change.
The other half is something that runs the queue instead, and there was nothing: no cron service
among the six in docker-compose, nothing in infra/scripts, nothing in deploy.sh. The only cron in
the repo was the Let's Encrypt renewal.

So these never ran:

    class-borica-gateway.php:511   wp_schedule_single_event(+960s, 'darling_borica_recheck')
    class-borica-gateway.php:644   the same from reschedule(), up to RECHECK_MAX times
    class-cart-capture.php:34      wp_schedule_event(daily, abandoned-cart job)

WooCommerce's own scheduled work mostly survives this, because Action Scheduler has an async
runner that piggybacks on ordinary requests. Plain wp_schedule_single_event has no such fallback,
and both of the above are plain WP-Cron.

The BORICA one is the expensive one. BORICA's protocol says a negative RC inside GUARDTIME (900s)
is provisional and final only after 960s, so the callback puts the order ON HOLD and re-queries
with TRTYPE=90 later. With no runner there is no later: the order sits on hold forever while the
card may well have been charged. Nothing goes red. It looks exactly like an order nobody has got
round to yet.

## The fix, in two halves

**A runner.** A `wpcron` service in infra/docker-compose.yml on the same wordpress:php8.3-fpm
image, mounting the same ./wordpress bind, running `php /var/www/html/wp-cron.php` every 60
seconds as www-data with the image entrypoint replaced (that entrypoint installs and rewrites
WordPress on the volume it is handed; this container must only read it).

A container and not a host crontab, because this file is what a rebuild carries - a line typed on
the box once is invisible and is gone the day the box is rebuilt. CLI and not a curl to
wp-cron.php, because HTTP would drag in the rate limits in 00-limits.conf, the staging basic-auth
gate, and a dependency on the site being reachable from inside its own network, all for a call
that never needed to leave the host.

WP_HOME and WP_SITEURL are passed to the sidecar even though wp-config.php is already on the
shared volume: that file resolves both through getenv() at RUNTIME, and under CLI there is no Host
header to fall back on, so without them every URL WordPress builds inside a scheduled job is wrong.

Checked against WordPress's own wp-cron.php rather than assumed: the early `die()` triggers on
$_POST / DOING_AJAX / a predefined DOING_CRON, none of which a CLI run has; DISABLE_WP_CRON is not
consulted anywhere in that file; and the `doing_cron` transient only prevents OVERLAPPING runs,
which at a 60-second cadence is what we want.

**A staleness watch, which is the half that keeps it fixed.** infra/scripts/health.sh now reads
the `cron` option out of wp_options. It is a timestamp-keyed array kept in ascending order, so the
first key is the next thing due; if that moment is more than 15 minutes in the past, nothing is
draining the queue and health.sh exits non-zero with cron_late_min in health.json.

Deliberately NOT "is the wpcron container running". "The container is up" and "scheduled work is
happening" are different claims, and it was the second one that was false while every container
reported healthy. A row we cannot read is its own separate ALERT rather than a pass, because a
monitor that reports fine when its query failed is worse than no monitor.

## What is verified, and what is not

Verified here: the compose file resolves (`docker compose config` clean, $$? unescapes to $?, the
Cyrillic SMTP_FROM_NAME survives), and the CLI behaviour of wp-cron.php against WordPress source.

NOT verified, and this is the acceptance test somebody has to actually run on the box:

1. `docker compose ps` shows wpcron running after the deploy.
2. Drive a real order into the on-hold-plus-scheduled state, wait out the 960 seconds, and read
   the outcome OFF THE ORDER. Not off the container, not off the log.
3. Break it on purpose - `docker compose stop wpcron`, wait 20 minutes, run health.sh - and
   confirm it goes red with cron_late_min. A monitor nobody has ever seen fail is not a monitor.

Note that this landed while GitHub Actions was failing to acquire runners, so the Deploy infra
workflow may not have run. Check that the change is actually ON the box before believing any of it.