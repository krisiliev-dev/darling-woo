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
  ⚠ Two follow-ups: (a) contact form — ✅ CLOSED in slice 3, see below;
  (b) privacy-policy "хостинг" wording — ✅ CONFIRMED by Kris 2026-08-05.
- **Slice 2 — ✅ DONE 2026-08-05.** Search results page + blog index shipped and
  gated on staging (deploys 31003458027/31003838259/31004036393/31004503913, all
  green). Details:
  - `templates/search.html` + `templates/product-search-results.html` — the second
    one is the key: **WooCommerce routes `post_type=product` searches to its own
    `product-search-results` template slug**, so `search.html` alone never renders
    for the header search link (found via body class on staging, not docs).
  - Single-result searches now stay on the results page like Shopify
    (`woocommerce_redirect_single_search_result` → false in functions.php).
  - `templates/home.html` blog index + page Блог (37) as posts page; front
    placeholder Начало (38); `show_on_front=page` — front page verified unchanged.
  - Gate (all rendered on staging, `_scratch_woo\gate2final_out.txt`): real-term
    product search shows styled page + product link; empty state Bulgarian; /blog/
    styled with empty state; front h1 intact; /checkout/ still 302 (money path
    untouched).
  - 🔍 **Open observation (logged, not chased):** core's query-title "Search
    results for:" prefix renders untranslated on WEB despite bg_BG packs installed
    and `<html lang="bg-BG">` — the same string translates via wp-cli. Worked
    around with static Bulgarian h1 (Shopify parity anyway). If other core
    front-end strings show English, this loader quirk is the suspect. bg_BG packs
    for core/woocommerce ARE now installed (were missing entirely before this
    sprint — `wp language core list` showed only en_US).
- **Slice 3 — visual/animation parity sweep**: home, collection, product, cart, 404
  against `reference/shopify-theme/` inventory + live site; responsive sweep beyond
  390px/desktop. My Account review.
- **Slice 3 — ✅ DONE 2026-08-05.** Contact form live on /kontakti/ (commit
  `6981713`, deploy 31007777832 green). `includes/class-contact-form.php` in
  darling-checkout (plugin owns the SMTP path; survives theme switch). Email-first
  per Kris: delivers to orders@darlinghome.bg via the box's own mail path; the
  panel can read the mailbox over IMAP later — one source of truth. Spam posture:
  honeypot + min-fill-time (pretend success) + 5/hour/IP rate limit (honest error);
  fail-open by design (contact is advice, not money). GATE PASSED on staging
  (`_scratch_woo\gate3_out.txt` + `gate3b_out.txt`): form renders with all Shopify
  fields; honeypot POST → fake success, no delivery; real POST → 302 izprateno AND
  maildir 10→11 with correct To/Reply-To/Subject; missing email → greshka=danni;
  both notices render. Lesson logged: `docker compose exec -T` eats a
  stdin-piped script — run gate scripts from a file on the box.
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


---

## Slice 4 — visual & animation parity sweep — DONE 2026-08-05 (woo agent v2, cloud)

Method: Playwright side-by-side captures of live Shopify (darlinghome.bg) vs staging at
390/768/1280/1440 px, full-page + fold, plus DOM/CSS probes (design tokens, keyframes,
computed animation, section maps, footer/header structure) and a logged-in My Account walk
(test customer `parity-customer`, role customer, created via wp-cli; password stashed
laptop-only in `_scratch_woo\parity4\.acct`). Evidence: `C:\Users\lora_\darling\_scratch_woo\parity4\`
(out\ = round 1 62 shots + probes.json; out2\ = cookie-dismissed Shopify + probes2.json +
account-review.json; out3\ = tall-viewport Shopify full pages; out4\ = post-fix gate).
Shopify fullPage screenshots need a tall viewport — the theme's scroll-timeline CSS clips
scrollHeight, and the cookie dialog must be dismissed first or it pins every shot.
`reference/shopify-theme/` untouched; staging `darling.css` verified BYTE-IDENTICAL to the
reference capture (FileHash 8D978CD4…70 both sides).

### Verdict

The ported `darling.css` is verbatim (tokens 16/16 identical, all 5 keyframes present) — but
the theme AROUND it is a sibling design, not a replica. Wrong font family site-wide, different
hero, different header/nav/search, missing home sections, default-Woo 404/cart-empty/listing
surfaces, and a much thinner cart drawer. Exact-replica requires rebuilding most templates.
One P0 bug found and FIXED+SHIPPED this sprint (below).

### Shipped in this slice — P0 drawer bug

**Closed cart drawer rendered as a visible, stuck „Зареждане…" panel on EVERY page at EVERY
viewport.** Root cause: `.darling-drawer--cart{display:flex}` unconditionally — overriding the
UA rule `dialog:not([open]){display:none}`; the dialog reported `open:false` yet
`visible:true` (probes.json → woo-drawer-onload). No console errors — pure CSS. Fix: `display:flex`
moved under `[open]` (commit `3050f74`, deploy 31011702800 green). GATE PASSED on staging
(`_scratch_woo\parity4\out4\`, gate4.js): closed drawer = `display:none`, zero-size box on
home/product/cart at 1440+390; opens on click (flex, body populates); closes clean.
The menu drawer never had the bug (no display override).

### Gap table (live Shopify = target ✕ staging = current)

| # | Surface | Gap | Sev |
|---|---|---|---|
| 1 | Typography, global | Shopify: Inter body 16px + Playfair Display serif headings/prices. Staging: Manrope everywhere, body 22px. Every page reads wrong | HIGH |
| 2 | Header | Shopify: serif „Darling" wordmark (h1 on home), nav = Продукти (mega-menu w/ 11 categories) + За нас/Помощ/Контакти, LARGE always-visible rounded search bar („Какво търсиш, darling?"). Staging: „Дарлинг"+bow sans logo, flat category nav, icon-only search | HIGH |
| 3 | Home hero | Shopify: full-width CHERRY band, serif „Тайната на една домакиня." (italic „домакиня"), white sub-copy, white bow + glow + 5 twinkling stars. Staging: cream bg, sans honey headline with the TEXT ROLES SWAPPED, pale bow, hero star/bow animations compute `none` (markup context differs), and the sub-copy DIVERGES from live („подбрани с грижа за всяко ъгълче" vs live „честно обозначени") | HIGH |
| 4 | Home sections | Staging missing: Изборът на Lady D product row (quick-„Добави" cards), trust row (4×: Еконт и Спиди / Наложен платеж / Лесно връщане / Реални магазини), newsletter band („Само хубави неща, обещаваме." + отстъпка copy + socials). „Ново при нас" should be „Ново в Darling". Категории = photo-card carousel on Shopify vs text tiles. Season band ✓ matches | HIGH |
| 5 | Ambient stars | 71 `.darling-ambient i` on live home vs 10 on staging | MED |
| 6 | Footer | Shopify: Помощ и информация links ✕ centre dff mark (✦✧✦ bow + serif Darling + tagline + socials) ✕ Информация block (ЕИК 206094211, ул. „Хан Аспарух" 1, тел. 089 336 1670, email→**orders@ swap per Kris rule**, Google Maps link, 4 policy links) + utilities bar (© 2026 Darling · Правила и условия). Staging: 3 generic columns, no address/phone/maps/utilities. dff star/bow animations DO work on staging | MED |
| 7 | Product page | Duplicate Отзиви block rendered twice (staging bug at normal viewport); wallet buttons (Apple/Google Pay/Link) shown — Shopify has none on product; breadcrumb w/ English „Uncategorized" — Shopify has no breadcrumb; raw „Налични 3" ×2 + SKU shown — Shopify shows neither; missing „По поръчка" badge box, „✦ Наложен платеж" info block, Доставка/Връщане и замяна accordions; related „Може да ви хареса" — Shopify has none; tab/button overlap at 1280 | HIGH |
| 8 | Listing (/shop/, categories) | Shopify: red banner w/ name+description+photo, filter sidebar (Наличност/Цена €-inputs), toolbar (N артикул(а) · Сортиране · grid/list toggles), white product cards. Staging: bare h1 („Магазин" — should be „Продукти" on shop), default Woo toolbar, no filters/banner/cards. Category empty-state copy differs | HIGH |
| 9 | Search page | Close-ish; missing product image/card in results, filter chips row, serif heading; red „Търсене" button not in Shopify layout | MED |
| 10 | Cart drawer content | Missing: free-shipping progress bar (.darling-shipbar + shimmer lives INSIDE the Shopify drawer — „Още €X / Y лв. до безплатна доставка, darling"), ✦ trust line, qty steppers + trash per item, dual currency (shows only „13.50 €"), Обща сума row + tax note, button „Преминаване към плащане" (has „Към плащане"). Shopify auto-opens drawer after add-to-cart; staging stays on page | HIGH |
| 11 | Cart page (empty) | ENGLISH on staging: „Your cart is currently empty!", „New in store" + sad-face. Shopify: serif „Количката ви е празна" + login prompt + „Продължи пазаруването". (Shopify's on-cart courier picker + фактура fields = old platform workaround — deliberately NOT replicated, superseded by native checkout) | HIGH |
| 12 | 404 | Staging = default template: stock photo + English „Page not found"/„Search". Shopify: „Хм, тази страница я няма." + witty copy + „Обратно към магазина" + „Открий нещо ново" product row | HIGH |
| 13 | My Account | Text 100% Bulgarian (account-review.json — zero stray Latin) but layout rough: nav renders as full-width stacked rows, content box floats offset; Изтегляния endpoint pointless for physical goods; registration disabled (Shopify offered register via hosted accounts). Shopify /account redirects to shopify.com hosted login → no visual target, style ours in-theme | MED |
| 14 | Responsive (768/1280) | Home category tiles overflow/clip at 768; product tabs/buttons overlap at 1280. Both inside templates already being rebuilt — no separate fixes | MED |
| 15 | Cookie consent | Shopify shows a GDPR cookie dialog; staging has none → owner decision | DECISION |
| 16 | `<title>`/branding | Staging „Дарлинг – Тайната на една домакиня." vs Shopify „Darling"; align at cutover | LOW |
| 17 | Accessibility widget (Т/БГ bubbles, 3rd-party app) | Not replicated → owner decision (recommend skip at launch) | DECISION |

### English-on-web strings CONFIRMED (predecessor's watch item now triggered)

Cart empty state („Your cart is currently empty!", „New in store"), 404 („Page not found",
„Search", „Type here…") render English on web while wp-cli translates them — same loader quirk
as the query-title prefix. Root-causing is now worthwhile and scheduled as slice 5.

### Decisions needed from Kris (please answer in NEW_QUEUE / chat)

1. **Cookie consent banner** — live site shows one (Shopify's). GDPR: staging sets cookies
   (session/Stripe). Add a lightweight consent banner, or launch without? (Legal call.)
2. **Wallet buttons on the product page** (Apple/Google Pay/Link) — remove for exact parity
   (recommended; wallets stay at checkout) or keep for conversion?
3. **Related products** („Може да ви хареса") on product page — Shopify has none; remove? (recommended)
4. **My Account**: hide „Изтегляния"? Enable customer registration (Shopify offered it)?
5. **Accessibility widget** — skip at launch? (recommended)
6. Free-shipping drawer bar threshold — component will be built; the VALUE ties into the
   delivery-fee design §4 answers you already owe the panel agent. Confirm: build the bar,
   hidden until the threshold is configured?
7. Newsletter section form — no email-marketing backend exists. Build the section for visual
   parity; wire „Абонирай ме" to orders@ mailbox delivery (like the contact form) until a real
   list tool is chosen?

### Proposed build slices (one sprint each, full gates)

- **Slice 5 — typography + i18n foundation**: self-host Inter + Playfair Display woff2, body
  16px, serif heading scale; root-cause the bg_BG web-render quirk (fixes cart/404/search
  strings in one move); shop page h1.
- **Slice 6 — header + home rebuild**: serif wordmark, nav (Продукти mega + pages), big search
  bar; red hero w/ EXACT live copy + dhv animations wired; Категории photo carousel (needs
  category images — reuse Shopify's, they're in the crawl captures); Изборът на Lady D; „Ново в
  Darling"; trust row; newsletter band; ambient density ~70.
- **Slice 7 — footer + 404** (brand 404 + „Открий нещо ново").
- **Slice 8 — product page**: dedup reviews, info panels + accordions, hide SKU/stock/breadcrumb,
  serif styles, wallet/related per decisions, fix 1280 overlap.
- **Slice 9 — listing + search**: banners, filters, toolbar, cards, empty states.
- **Slice 10 — cart drawer + cart page**: shipbar component + shimmer, trust line, steppers,
  dual currency, totals row, „Преминаване към плащане", auto-open on add, Bulgarian empty state.
- **Slice 11 — My Account layout** + endpoint set per decisions.

### Non-goals (explicit)

- Shopify cart-page courier picker + фактура fields (platform workaround, superseded by native checkout — re-adding would be a regression).
- `/agents.md`, hosted Shopify accounts, Judge.me/GTStandard fonts (app artifacts).

### Slice-4 decisions — ANSWERED by Kris, 2026-08-05 (evening)

1. Cookie consent → **YES, add a lightweight consent banner** (new slice 13).
2. Wallets on product page → **KEEP for conversion** (parity deviation, owner-approved).
3. Related products → **KEEP** („Може да ви хареса" stays; parity deviation, owner-approved).
4. My Account → **hide „Изтегляния"** (Downloads tab is for digital files — irrelevant for
   physical goods; explained to Kris). **Enable customer registration**, and add **Google +
   Facebook OAuth login** (new slice 12; will need OAuth app credentials created owner-side
   in Google Cloud Console / Meta for Developers when the slice lands).
5. Accessibility widget → **MUST HAVE** (new slice 14; identify what the live site uses first).
6. Free-shipping drawer bar → **YES, threshold €77** — bar ships in slice 10 and can show the
   real number immediately. NOTE for the delivery-fee work (panel §4): free-over threshold
   is hereby answered as **€77**; the actual free-shipping pricing rule lands with the
   delivery-fee calculator build, the drawer bar is display.
7. Newsletter → **build the frontend** (slice 6 home band); **panel agent tasked** to research
   mail-subscription plugins/solutions and wire the backend (see WOO_AGENT_STATUS.md task).

### Slice 5 — typography + i18n foundation — ✅ DONE 2026-08-05 (commit eda7d4a, deploy 31015060364 green)

- **Root-cause found for most "untranslated" strings: they were never translations at all.**
  The cart page's English („Your cart is currently empty!", „New in store", „You may be
  interested in…") is literal saved block content written into the page post_content at
  install time (en_US). Fixed by editing the content (post 6): now „Количката ви е празна." /
  „Ново в Darling" / „Може да ви хареса". The 404's English is core's fallback template —
  replaced by our branded 404 in slice 7. The only true loader quirk left is the worked-around
  query-title prefix — WATCH stays, priority dropped.
- **Fonts**: theme is a Twenty Twenty-Five CHILD theme — Manrope + 22px body were the parent's
  defaults. Child theme.json now declares self-hosted **Inter** (variable 400–700; latin +
  cyrillic + cyrillic-ext) and **Playfair Display** (variable 400–900 normal + italic; latin +
  cyrillic) via settings.typography.fontFamilies/fontFace (woff2 in theme/darling/assets/fonts/,
  served by the box); body = Inter 1rem/1.6, all headings = Playfair 500, buttons stay Inter.
- **Shop page title** (page 5) renamed „Магазин" → „Продукти" (query-title now matches Shopify).
- **GATE PASSED** (rendered staging, `_scratch_woo\parity4\out5\` + gate5.js): computed
  body font Inter 16px; h1 „Продукти"/hero render Playfair incl. Cyrillic (fonts API reports
  both families loaded; woff2 URLs return 200); cart page zero English, Bulgarian strings
  render in serif; /checkout/ still redirects when empty (money path untouched); my-account
  h1 serif. Screenshots: home-typo.png, cart-bg.png, shop-h1.png.

### Updated slice plan after decisions

6. Header + home rebuild (incl. newsletter band frontend — form delivers to orders@ via the
   contact-form path until the panel's subscription backend lands).
7. Footer + 404.
8. Product page: dedup reviews render, „По поръчка"/„Наложен платеж" panels, accordions,
   hide SKU + raw stock + breadcrumb, 1280 overlap — wallets and related STAY per Kris.
9. Listing + search: banners, filters, toolbar, cards, empty states.
10. Cart drawer + cart page: shipbar with **€77** + shimmer, trust line, steppers, dual
    currency, totals row, „Преминаване към плащане", auto-open on add.
11. My Account: two-column layout, hide Изтегляния, enable registration.
12. Social login: Google + Facebook OAuth (plugin selection; owner-side API credentials).
13. Cookie consent banner (lightweight, styled like the live site's).
14. Accessibility widget (identify live site's vendor, replicate or equivalent).
