# CUTOVER RUNBOOK — staging.darlinghome.bg → darlinghome.bg

Written 2026-08-05 by the woo agent (owner of the woo box + WP mechanics), on
Kris's directive relayed via PANEL_AGENT_STATUS.md. Kris executes the DNS step;
everything else here is mine to run on request. Shopify is fully pre-launch and
NOT taking orders (Kris, 2026-08-05) — there is no double-sell window and no
timing constraint: the runbook can execute whenever Kris says go.

Current facts (verified on the box 2026-08-05):

- DNS today: `darlinghome.bg` → 23.227.38.65 (Shopify), `www` → 23.227.38.74
  (Shopify), `staging.darlinghome.bg` → 169.58.89.40 (woo box).
- nginx port-80 server already answers for `darlinghome.bg www.darlinghome.bg`
  and serves the ACME webroot — HTTP-01 issuance works the minute DNS flips.
- WP `siteurl`/`home` = `https://staging.darlinghome.bg`; no WP_HOME/WP_SITEURL
  constants in wp-config.php (DB is the single source).
- `wp search-replace` dry-run staging→apex: **56 replacements** (5 options,
  36 guids, 11 sessions, rest scattered) — small, seconds to run.
- `blog_public = 0` (search engines discouraged) — MUST flip at cutover.
- Staging basic-auth gate: nginx `auth_basic` with a `$request_uri` map that
  already exempts the two payment callbacks (`wc-api=wc_stripe`,
  `wc-api=darling_borica`).
- `X-Robots-Tag "noindex, nofollow"` header in the 443 server — marked in the
  config itself "Removed at cutover".
- Certs renew via `renew-certs.sh` (certbot webroot, cron 2×/day) — a new cert
  lineage for the apex just joins that rotation, nothing to add.
- WC API callbacks (Borica return, Stripe webhook) derive from `home` at
  runtime — they follow the domain automatically after step C3. The BORICA
  terminal registration already names `https://darlinghome.bg/wc-api/darling_borica/`
  (prod terminal registered against the apex — the bank side is already correct
  and is exactly why the return URL works only AFTER cutover).

---

## Phase A — safe NOW, before any DNS change (≈15 min, zero risk)

**A1. Lower DNS TTL (Kris, at the DNS provider).** Set the A records for
`darlinghome.bg` and `www` to TTL 300 a day before the flip, so the switch
propagates in minutes, not hours. (Check what TTL they carry today while there.)

**A2. Prepare the apex nginx server block (me).** Add
`server_name darlinghome.bg www.darlinghome.bg;` HTTPS server to `conf.d/`,
mirroring the staging one MINUS `auth_basic` and MINUS the `X-Robots-Tag`
header, pointing at cert path `/etc/letsencrypt/live/darlinghome.bg/`. Ship it
**commented out / as `.disabled` file** — it cannot load before the cert exists
(nginx refuses to start on a missing cert file). The staging server block keeps
working untouched.

**A3. Rehearse the DB flip (me).** `wp search-replace --dry-run` already run
(56 changes). Nothing else in the DB references the domain in a way WP-CLI
can't rewrite (no serialized-URL surprises at this size).

**A4. Redirect map Shopify→Woo (me).** The live Shopify URL structure
(`/products/<handle>`, `/collections/<handle>`, `/pages/<handle>`) differs from
Woo (`/product/<slug>/`, `/product-category/<slug>/`, `/<page>/`). Prepare an
nginx `map $uri` 301 block for the apex server: the 10 collection→category
pairs (slugs already mirrored 1:1 in Woo), `/products/(.*)` → `/product/$1/`
(slugs were carried over at import), `/pages/…` → the static pages, `/cart` →
`/cart/`. Goes into the apex server block from A2, active from first request —
old Google results and any printed/QR links keep working. (Full pair list to be
generated from the category table at execution time; the mechanics are one map
+ one `if` return.)

**A5. Inventory — nothing else on the box keys on the hostname.** Verified:
crons reference paths not domains; panel calls are outbound (panel.darlinghome.bg,
unaffected); mail (`mail.darlinghome.bg`) has its own server block + cert,
untouched; `/peer-health` is host-agnostic. The doorbell + office-token contracts
don't mention the storefront domain at all.

## Phase B — DNS flip (Kris, ~2 min)

**B1.** At the DNS provider: point `darlinghome.bg` **A → 169.58.89.40** and
`www.darlinghome.bg` **A (or CNAME to apex) → 169.58.89.40**. Leave
`staging.darlinghome.bg` and `mail.darlinghome.bg` exactly as they are.

**B2.** Tell me (chat or bell) — I take it from here. Nothing breaks in the gap:
until DNS propagates, visitors still see Shopify; the moment it lands they hit
our port-80 server, which 301s to https (cert arrives in C1, so the first
minutes may show a cert warning on the apex — that window is what C1 minimizes;
with TTL 300 it is minutes).

## Phase C — box-side switch (me, ≈10 min, ordered)

**C1. Issue the apex cert** (as soon as `darlinghome.bg` resolves to the box —
I poll from the box itself):
`docker run --rm -v .../conf:/etc/letsencrypt -v .../www:/var/www/certbot certbot/certbot certonly --webroot -w /var/www/certbot -d darlinghome.bg -d www.darlinghome.bg`
— HTTP-01 against the already-listening port-80 server.

**C2. Enable the apex server block** from A2 (rename `.disabled` → `.conf`,
`docker compose exec nginx nginx -t`, then reload). HTTPS is now up on the apex,
no auth gate, no noindex, redirect map live. `www` 301s to the apex.

**C3. Flip WordPress to the apex:**
- `wp search-replace 'https://staging.darlinghome.bg' 'https://darlinghome.bg' --all-tables` (the 56)
- `wp option update blog_public 1` (allow indexing)
- `wp cache flush` + clear the nginx fastcgi micro-cache (rm the cache dir contents; it self-rebuilds)

**C4. Repoint staging.** Replace the staging server block's content with a
plain `return 301 https://darlinghome.bg$request_uri;` (cert + ACME location
stay so renewal keeps working). The staging basic-auth password retires with it.

**C5. Smoke immediately** (scripted, from the laptop): apex 200 + valid TLS;
`www` → apex 301; a product URL renders; an old Shopify-style
`/products/<slug>` 301s to `/product/<slug>/`; `/wp-json/wc/store/v1/cart` OK;
`robots` clean (no X-Robots-Tag, blog_public=1); staging 301s; mail.darlinghome.bg
untouched.

## Phase D — post-switch verification (me + Kris, same hour)

**D1. Borica production test** — one real small-value card payment on the apex
(the terminal's registered Return-URL is now literally correct). Verify: order
paid, response RSA-verified, amount matched. Refund it after.
**D2. COD test order** end-to-end (rates from panel, office picker, order lands).
**D3. Newsletter subscribe** from the live footer (checks the panel relay from
the new origin — server-side, should be indifferent, verify anyway).
**D4. Woo transactional email** (order confirmation) — links must show the apex,
Cyrillic intact (base64 fix is domain-independent, verify anyway).
**D5. Monitors:** point the health/peer checks' external expectations at the
apex where they name a URL (peer-check hits the IP, unaffected — verified A5);
watch `docker compose logs nginx` for 404 spikes from unmapped Shopify URLs and
extend the A4 map if any real pattern shows up.
**D6. Search Console (Kris, non-blocking):** add the apex property, submit
`https://darlinghome.bg/wp-sitemap.xml`.
**D7. Social login round-trip (me + Kris's test account).** The Google and
Facebook OAuth apps are registered against the APEX ONLY (Kris's call — staging
retires), so the full login flow is untestable before the flip. Post-cutover:
log in via Google and via Facebook once each on darlinghome.bg; verify a WP
user is created/linked and lands on the dashboard. Config is done pre-cutover;
this is the only OAuth step that must wait.

## Rollback (any point after B1)

DNS back to the Shopify IPs (TTL 300 → minutes) — Shopify storefront is intact
and keeps existing until Kris retires it. Box-side: staging block still exists
until C4, and even after C4 reverting is re-running C3/C4 with the names
swapped. No step above destroys anything.

## What I need from others

- **Kris:** the go signal; the DNS edits (A1, B1); the Borica test card (D1);
  Search Console (D6). Optional but recommended: keep the Shopify subscription
  alive for a week after cutover as the rollback target.
- **Panel agent:** nothing blocking. FYI only — storefront domain changes;
  panel-side webhooks/allowlists don't reference it (confirmed in A5 from my
  side; flag if anything panel-side keys on `staging.darlinghome.bg`).
