# Handoff — storefront session

Written 2026-07-31. Read this first, then `PLAN.md`.

This covers what the storefront session owns, what state it is in, what is
genuinely finished versus merely built, and the mistakes worth not repeating.

---

## 1. The project

„Дарлинг 7" ООД — a Bulgarian home-goods retailer in Свищов. The storefront is
migrating **Shopify → self-hosted WooCommerce**.

The guiding principle everything else follows from:

> **Barsy is the fiscal and document system of record. WooCommerce is a shop window.**

Money, stock, invoices and fiscal documents live in Barsy. The shop displays,
collects and hands over. When the two disagree, Barsy is right.

### Why the migration happened
Shopify Basic cannot do carrier-calculated shipping (the Carrier Service API is
Plus-only), so live Еконт/Спиди rates were impossible — the workaround was a flat
rate plus a cart-page estimate that express checkout bypassed. On Woo the real
courier fee is a native shipping rate on every checkout route. That is the whole
reason for the move; do not trade it away.

---

## 2. Three sessions, three lanes

| Session | Owns | Repo |
|---|---|---|
| **storefront** (this one) | WooCommerce, theme, checkout plugin, storefront infra, mail server | `darling-woo` |
| **panel** (`Darling admin panel build`) | Admin panel, courier adapters, Barsy business logic | `darling-admin-panel` |
| **Hermes** (`Hermes setup access`) | Barsy⇄storefront connector, order mapping, stock | connector |

Coordinate by cross-session message. It has worked well — three real bugs this
week were caught because one session re-tested another's "verified".

**Do not build in another lane.** When something is theirs, hand it over with the
contract and the evidence, and say what you need back.

---

## 3. Infrastructure

Two Contabo VPSs.

```
169.58.89.40   woo box    staging.darlinghome.bg · mail.darlinghome.bg
169.58.69.210  panel box  panel.darlinghome.bg
```

**woo box** runs Docker Compose: `db` (MariaDB 11), `redis`, `wordpress`
(php8.3-fpm), `nginx`, `mailserver` (docker-mailserver 14.0), `roundcube`.

- SSH as `darling` (has sudo). **Root login is disabled** — `ssh root@` fails by
  design, that is not a fault.
- App dir `/srv/darling/prod`, repo checkout `/srv/darling/repo`.
- Deploy: `gh workflow run deploy.yml --ref main` (manual dispatch, not on push).
  It PHP-lints and `nginx -t`s **before** applying, then health-checks after — it
  has already caught one bad config before it reached the site.
- wp-cli: `/srv/darling/prod/scripts/wp.sh <args>`. php-fpm has no CLI, and
  `--env-file` mangles the multi-line `WORDPRESS_CONFIG_EXTRA`, so the script
  passes each env var separately. Use it; do not reinvent it.

### Secrets — where, not what
- `/srv/darling/prod/.env` — DB, panel token, SMTP, (BORICA paths when they land)
- `/srv/darling/prod/.staging-password` — plaintext, used by the deploy health check.
  **If you change the nginx password you MUST update this file or every deploy fails.**
- `/srv/darling/prod/.wp-admin-password` — the WordPress admin password
- `nginx/conf.d/.htpasswd` — bcrypt only, not recoverable

### Two login gates on staging (easy to confuse)
1. Browser popup (nginx): user **`darling`**
2. WordPress form: user **`darling_admin`**

---

## 4. What is done and verified

Everything below was checked against the running system, not assumed.

**Checkout plugin** (`plugin/darling-checkout/`) — deliberately a plugin, not theme
code, so checkout survives a theme change.
- Courier office picker with **server-side validation** against the panel's live
  office list; an unvalidated office blocks the order.
- Carrier **registry** (`class-carriers.php`) — adding a courier is a config entry.
  A carrier stays dark until the panel can serve it, checked *before* quoting so an
  unprovisioned courier can never fall through to the fallback price.
- Фактура (VAT invoice) fields with ЕИК validation; GPSR product panel; EUR/BGN
  dual display (rate 1.95583); pseudonymous cart capture with a 30-day purge.
- BORICA gateway built (credentials pending). ⚠ **MAC field order unverified** —
  confirm against their doc pack before go-live.
- SMTP via `phpmailer_init`, credentials in env and never the database.

**Payments** — Stripe official plugin, **test mode verified end to end** including
the webhook marking an order paid. COD enabled. BORICA hidden until configured.

**Mail server** — self-hosted on the woo box. Gmail reports `dkim=pass spf=pass
dmarc=pass`; inbound delivers; **not an open relay** (verified `554 Relay access
denied`). Runbook: `infra/MAIL.md`. Webmail at `https://mail.darlinghome.bg`.

**Performance** — nginx FastCGI micro-cache, 60s. **15 → 266 rps.** Cart isolation
proven with two browser sessions (A sees its item, B sees none). Every
per-customer surface bypasses the cache.

**Security** — wp-login rate limited (429), author enumeration blocked, fail2ban
jail verified with a real ban, 2FA plugin installed (**owner has not enrolled**).

**Theme** — `theme/darling/`. Ported `darling.css` verbatim from the live Shopify
site rather than reimplementing: it carries the `--d-*` tokens and every bespoke
animation. Header, nav, mobile drawer, cart drawer, homepage, product template,
category listing, footer. Bulgarian throughout.

`reference/shopify-theme/` holds the **captured** Shopify CSS and markup with an
animation inventory. **Do not edit it** — its value is being exactly what the live
site serves. Port *from* it.

---

## 5. What is NOT done

### 🚨 Open bug — checkout does not re-price on payment-method change
Card shows 4.88 instead of 4.48. **Three attempts failed.** Full notes in
`PLAN.md`, including the wire capture proving the browser *does* send
`{"payment_method":"stripe"}`, and the three eliminated hypotheses.

Completed **orders are priced correctly** — this is a checkout display gap, not an
undercharge. Do not attempt a fourth fix without instrumenting that request end to
end first.

### Storefront, unblocked
- Search results page (header links to it; never styled)
- Responsive sweep between 390px and desktop — only those two are checked
- My Account reviewed properly rather than only styled
- `darling_fallback="yes"` fixture owed to Hermes (harness in
  `tests/make-fallback-order.php` does not yet produce an order)

### Blocked on the catalogue (Phase 2)
- 301 map for **4,589 product URLs** (+72 categories). Category slugs already match
  the Shopify collection slugs, so categories are a straight rewrite — only products
  need a lookup table.
- Google Merchant Center + Meta feeds (depend on GTINs — ties to the GS1 work)
- Product templates verified against real products rather than one test item

---

## 6. Waiting on the owner

| | Why it matters |
|---|---|
| 🚨 **Declare the e-shop with НАП** (чл. 52м) | **Legally required before trading.** Must name `darlinghome.bg`, not staging. Yields the УИН. Has lead time you do not control. |
| **Domain decision** | `darling7.com` and `darlinghome.bg` are BOTH live and BOTH indexable, and the old site self-canonicalises every product — they compete in search. The 301 map's target depends on this answer. |
| **Rotate credentials** | R2 token, Stripe live secret, staging password, mailbox password. A live Stripe secret key was exposed in a transcript. |
| **Enrol 2FA** | Installed, not enrolled. |
| **Barsy speditors** | All four existing couriers read "cannot deliver anywhere". Hermes calls it a latent fault; it will surface as a courier problem, not a config one. |
| **Ask BOX NOW** | Do lockers price by compartment size? If so the storefront has no parcel dimensions to send — a product-data problem before an API one. |
| **Accountant** | Приложение 29 vs 38, `paym` mapping, whether COD is contractually a ППП. |
| **Content for 7 pages** | Общи условия, Поверителност, Доставка, Връщане carry legal obligations. They are deliberate placeholders with a visible marker. |
| **Mail hardening (DNS)** | SPF `~all`→`-all`, DMARC `p=none`→`quarantine`, raise TTLs, drop bgdns MX fallbacks — all DNS, all owner-side. |

---

## 7. The pattern behind most bugs this week

**Two views of the same state that disagree, where only comparing them reveals it.**

- Speedy's quote path priced without COD while its booking path attached it
- The panel's repo and its box ran different code — CI green, deploy green, change absent
- This repo and its box drifted on fail2ban config, never synced
- The office was collected and validated but never reached the order meta

And the guard-shaped variant: **a defensive construct that degrades to a falsy
value is not a guard.** `function_exists()` around a missing WooCommerce helper
returned `''` and wrote blank office ids; a bare `except` skipped a money
invariant and made it look passed. Both are "be safe if this isn't available",
and both produce silent wrong data.

Required question for any such construct: *what does this do when the thing is
missing?* If the answer is "returns empty and carries on", it is a way of not
noticing.

### Method rules earned the hard way
- **Verify at the layer that matters.** "Verified upstream" and "verified where
  customers are charged" are different claims. Attach a location to "verified".
- **Never use bash `/dev/tcp` to test a port.** It gave three false negatives and I
  told the owner to open a Contabo support ticket that was not needed. Use
  `curl -v telnet://host:port` or read the banner.
- **Use `dig`, not `nslookup`.** nslookup misrenders TXT and PTR records.
- **`networkidle` is unusable on /checkout/** — Stripe's iframes hold connections
  open. Use `domcontentloaded` plus explicit waits.
- **Assert that an edit applied.** A `str.replace()` that silently matched nothing
  once reported "all six edits applied" while applying five.
- **Test the negative case with a positive control.** A validation rule that
  rejects everything passes the negative test and breaks checkout.

---

## 8. Owner's working preferences

- Wants the storefront to be an **exact replica** of the Shopify site — animations,
  drawers, framing, responsiveness included, not just approximate styling.
- Prefers continuing in one session over starting fresh, and said so explicitly.
- Trusts the accountant over research readings on Bulgarian tax questions. When
  they conflict, the accountant wins.
- Told me directly: **never look up a real customer's phone against
  nekorekten/nepostop to test tooling.** Standing rule.
- Do not paste secrets into chat. Credentials get set on the box by the owner.

---

## 9. Tests — run these after touching checkout

```
tests/checkout-picker.spec.js   office picker, invoice fields, no token leak
                                (NOTE: does not set the BG province, so rates read 0 —
                                 a limitation of the test, not the site)
tests/cod-repricing.spec.js     THE open regression lives here
tests/office-required.spec.js   negative + positive control; creates a real order
tests/cart-drawer.spec.js       two sessions, proves cart isolation under caching
tests/card-checkout.spec.js     full Stripe test-card checkout incl. webhook
tests/borica-mac.php            signing plumbing (field ORDER still unverified)
```

All need `STAGING_PASS`. WooCommerce **requires a Bulgarian province** — Свищов is
`BG-04`; without it no shipping rates are returned at all, which looks exactly like
broken shipping.

---

## 10. If you do one thing first

Chase the **НАП declaration** with the owner. Everything else on this list can be
fixed by working; that one has an external lead time, is legally required before
trading, and is the only item that can quietly become the reason launch slips.
