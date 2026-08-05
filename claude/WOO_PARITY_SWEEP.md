# Shopify → Woo frontend parity sweep — Phase 1 gap table

Queue item 7, Phase 1. Woo agent, 2026-08-05.
Nothing was built in this phase — this is the inventory + diff the build slices will follow.

## Method (verification locations)

- Shopify (live, password removed): https://darlinghome.bg — confirmed Shopify via
  `powered-by: Shopify` response header. Crawled sitemap.xml (9 sub-sitemaps) + probed
  well-known/policy paths + extracted homepage nav links.
  Raw evidence: `C:\Users\lora_\darling\_scratch_woo\shopify_inventory\`
  (all_sitemap_urls.txt, probes.csv, html\*.html, text\*.txt).
- Woo (staging.darlinghome.bg): `wp post list` / `wp option get` via
  `/srv/darling/prod/scripts/wp.sh` over SSH, plus authenticated HTTP status probes run
  ON the box. Raw evidence: `_scratch_woo\woo_pages.txt`, `woo_pages2.txt`, `woo_nav.txt`.

## Shopify site inventory (complete)

The Shopify site is SMALL: 1 published product (табуретка-стълба test item), 11 collections,
3 static pages, 5 live policy pages, 2 empty blogs, and a full `/en/` locale mirror of all of
it. Total distinct BG-locale pages: 24 + system pages (cart, search, account).

## Gap table: page → exists in Woo? → content matches?

| # | Shopify page | Woo equivalent | Exists? | Content matches? |
|---|---|---|---|---|
| 1 | `/` (home) | `/` | YES | ~ — template built & ported (HANDOFF §4); pixel/animation diff = Phase 2 |
| 2 | `/pages/za-nas` | `/za-nas/` (page 17) | YES | **NO — placeholder** (⚠ marker) vs 438 chars real copy |
| 3 | `/pages/pomosht` | `/pomosht/` (page 18) | YES | **NO — placeholder** vs 1,084 chars real FAQ |
| 4 | `/pages/contact` | `/kontakti/` (page 19, slug differs) | YES | **NO — placeholder**, and Woo shows `orders@darlinghome.bg` while Shopify shows `darling7.sv@gmail.com` + phone + address — contact-data mismatch to resolve, not just copy |
| 5 | `/policies/terms-of-service` | `/obshti-usloviya/` (page 20) | YES | **NO — placeholder** vs 2,408 chars real Общи условия |
| 6 | `/policies/privacy-policy` | `/poveritelnost/` (page 21) | YES | **NO — placeholder** vs 1,561 chars real policy |
| 7 | `/policies/shipping-policy` | `/dostavka/` (page 22) | YES | **NO — placeholder** vs 938 chars real (Woo placeholder text is actually closer to reality — live rates — than Shopify's; port + reconcile) |
| 8 | `/policies/refund-policy` | `/vrashtane/` (page 23) | YES | **NO — placeholder** vs 1,502 chars real (чл. 50 ЗЗП 14-day text) |
| 9 | `/policies/contact-information` | — | **NO** | Near-duplicate of Контакти (trade name, ЕИК/ДДС, address, phone). DECISION: separate page, or fold into `/kontakti/` + 301 |
| 10 | `/cart` | `/cart/` | YES | ~ — cart drawer built & verified; page-level visual diff = Phase 2 |
| 11 | `/checkout` | `/checkout/` (302 when empty — correct) | YES | ~ — done & verified minus known re-pricing display bug |
| 12 | `/search` | `/?s=` only; `/search/` 404s | **PARTIAL** | **NO** — search results page never styled (known HANDOFF gap); Shopify has a styled `/search` |
| 13 | `/collections/all` | `/shop/` | YES | ~ — listing template built; Phase 2 visual diff |
| 14 | 11 collections (`dekoraciya-za-doma, frontpage*, izborat-na-lady-d, parti, pochistvane, podaraci, promocii, za-banyata, za-decata, za-gradinata, za-kuhnyata`) | `/product-category/<slug>/` — the 10 real collections match Woo terms **1:1 by slug** (verified `Compare-Object`: only `frontpage` differs; Woo's 11th term is the default `uncategorized`, term 15) | YES 10/10 | ~ — template built; per-category check blocked on catalogue (Phase 2 of the migration) |
| 15 | `/blogs/новини`, `/blogs/saveti` | `/blog/` 404s, 0 posts | **NO** | Both Shopify blogs have **zero articles** (index pages only). DECISION: replicate empty blog indexes or defer; 301 at cutover either way |
| 16 | `/account/login`, `/account/register` (302 to Shopify accounts) | `/my-account/` | YES | ~ — styled only, never properly reviewed (HANDOFF gap) |
| 17 | `/en/*` — full EN locale mirror (pages, collections, blogs, product) | — | **NO** | Owner decided BG-only at launch. DECISION for cutover: 301 `/en/*` → BG equivalents (recommended) |
| 18 | `/agents.md` (Shopify auto agentic-discovery file) | — | NO | Not replicable, not needed. Noted for completeness |
| 19 | 404 page (styled by theme) | Woo 404 template | ? | Unverified — add to Phase 2 visual sweep |

`*` `frontpage` is Shopify's internal default collection, not in nav — no Woo equivalent
needed; 301 to `/shop/` in the cutover map.

## Findings beyond the table (config/cleanup, found during the sweep)

1. **`woocommerce_terms_page_id` is EMPTY** — checkout cannot reference Общи условия
   (page 20). Set it. (Location: `wp option get woocommerce_terms_page_id` → blank.)
2. **`wp_page_for_privacy_policy=3`** but no page 3 exists in the publish list — should
   point to 21 (Поверителност).
3. **Draft page 9 "Refund and Returns Policy"** — English WP/Woo default, draft. Delete
   pre-launch (add to the existing pre-launch cleanup list).
4. **Woo homepage head leaks WP cruft** Shopify doesn't have: `/xmlrpc.php?rsd`,
   `/wp-json/`, `/feed/`, `/comments/feed/` links. Cosmetic parity + hardening
   (xmlrpc discovery). (Location: `woo_nav.txt`.)
5. **Shopify's own footer links to `/policies/` which 404s on Shopify itself** — a dead
   link on the source site. Do NOT replicate; flag to owner (fixable on Shopify or
   simply omit in Woo).
6. **HANDOFF §6 "Content for 7 pages waiting on owner" is SUPERSEDED**: the owner has
   published real Bulgarian content for all 7 (4 policies + за нас + помощ + контакти)
   on the live Shopify site. It can now be ported verbatim — that's Phase 2 slice 1.
7. Contact email mismatch (finding in row 4): Shopify says `darling7.sv@gmail.com`,
   Woo placeholder says `orders@darlinghome.bg`. Which is canonical for the storefront?
   Owner call — the mail server on the woo box serves @darlinghome.bg.

## Proposed Phase 2 slices (one sprint each, full gates)

- **Slice 1 — content port — ✅ DONE 2026-08-05.** All 7 pages (17–23) updated on
  staging via wp-cli; contact-information merged into Контакти; email swapped to
  `orders@darlinghome.bg`; findings 1–3 fixed (`woocommerce_terms_page_id=20`,
  `wp_page_for_privacy_policy=21`, draft page 9 deleted — wp reported Success on all).
  **GATE PASSED**: rendered staging text vs Shopify text = 100% word coverage on 6
  pages, 92% on Контакти (missing words are the h1 + contact-form labels only);
  zero forbidden strings (gmail / "Shopify" / placeholder marker) on any page.
  Evidence: `_scratch_woo\apply_out.txt`, `_scratch_woo\rendered.html`, gate script
  `tests/page-text-parity.py` (run: `python gate_diff.py` → GATE: PASS).
  Content sources committed to `content/pages/` in this repo.
  ⚠ Two follow-ups: (a) **contact form on Контакти not ported** (Shopify uses a
  native contact form — Woo needs an equivalent; slice 2/3 item, stated not
  half-built); (b) **privacy-policy legal delta needs sign-off**: Shopify text names
  "Shopify (платформата на магазина)" as a data recipient — replaced with
  "доставчика на хостинг на онлайн магазина"; Kris/accountant should confirm the
  wording since it's legal text.
- **Slice 2 — search results page** styled to theme + **blog posts index page**
  (decision 2: needed for planned SEO blogging; no articles ported — both Shopify
  blogs are empty).
- **Slice 3 — visual/animation parity sweep**: home, collection, product, cart, 404
  against `reference/shopify-theme/` inventory + live site; responsive sweep beyond
  390px/desktop. My Account review.
- **Cutover artifacts (later, with 301 map):** `/pages/contact`→`/kontakti/`,
  `/policies/*`→BG slugs, `/collections/*`→`/product-category/*`, `/collections/all`+
  `frontpage`→`/shop/`, `/blogs/*`→TBD, `/en/*`→BG.

## Open decisions — ANSWERED by Kris, 2026-08-05

1. `/policies/contact-information` → **MERGE into Контакти** (`/kontakti/`). One contact
   page carrying the legal identity block (trade name, ЕИК/ДДС, address, phone); 301
   both Shopify contact URLs to `/kontakti/` at cutover.
2. Empty blogs → **ignore the two empty Shopify blogs, but BUILD a blog page** — a
   styled posts index is needed because SEO blog writing is planned. Added to slice 2.
3. `/en/` → **not at launch, confirmed**; it exists as a future task. Cutover 301
   `/en/*` → BG stands.
4. Emails: **`darling7.sv@gmail.com` is the business email, NOT customer-facing.
   `orders@darlinghome.bg` is the customer-facing address.** ⚠ Slice-1 port rule:
   the live Shopify pages (Контакти, contact-information, privacy policy) all show
   the gmail — when porting, replace it with `orders@darlinghome.bg` everywhere
   customer-facing. Do not copy the gmail verbatim.
