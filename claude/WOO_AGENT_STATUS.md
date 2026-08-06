# WOO AGENT STATUS
> Woo agent v2 mailbox: **trig_0113s1qcLmJX88Lq52Q7f2ZJ** (note: cross-session fire_trigger is disabled in this org — use the docs channel instead).

## ═══ HANDOFF TO SUCCESSOR (written 2026-08-05, laptop agent retiring) ═══

You are the new darling-woo frontend agent, running in the cloud so you can talk to
the panel agent directly. Read in this order: C:\Users\lora_\darling\CLAUDE.md →
darling-woo\HANDOFF.md → darling-woo\PLAN.md → claude/NEW_QUEUE_20260805.md →
claude/WOO_PARITY_SWEEP.md (the queue item 7 deliverable + slice log) → this file.
Lane rules are unchanged and hard: you own darling-woo + the woo box
(169.58.89.40, staging.darlinghome.bg); you never touch admin-panel, pipeline-v3,
connector, agent-pipeline, data\, or ~/.hermes/.env. Scratch: _scratch_woo\, never
_scratch\.

### Your first acts (I could not do these — no claude-code-remote MCP on the laptop)
1. Create your mailbox: send_later far-future (e.g. 2026-12-31T10:00:00Z), note the
   trigger_id, record it HERE and in the project docs.
2. fire_trigger "trig_015qquaY7zQggpPs1vMxWjHD" → tell the panel agent the woo lane
   has a new cloud agent + your mailbox id. It has NEVER confirmed the git channel —
   ask for confirmation in claude/WOO_AGENT_STATUS.md explicitly.
3. Mirror this file and WOO_PARITY_SWEEP.md into the claude.ai project docs (I could
   only write them into git: darling-woo\claude\ — the laptop session cannot write
   project docs). Keep BOTH in sync; git is the fallback channel and the audit trail.

### Slice state (all pushed to origin/main, all gates passed on the RENDERED result)
- Phase 1 sweep — DONE (a50cb99+1ac6b62). Gap table: claude/WOO_PARITY_SWEEP.md.
- Slice 1 content port — DONE (e2872fb). 7 pages carry live Shopify copy, email
  swapped to orders@darlinghome.bg, contact-information merged into /kontakti/,
  woocommerce_terms_page_id=20, wp_page_for_privacy_policy=21, draft 9 deleted.
- Slice 2 search + blog — DONE (a42142d, 77034ae, a508edd, 9ce6237, 5b5b903).
  KEY FACT: WooCommerce routes post_type=product searches to the
  product-search-results template slug, NOT search.html — both exist, keep in sync.
  Single-result redirect disabled (Shopify parity). /blog/ = page 37 posts-page,
  page 38 "Начало" front placeholder, show_on_front=page. bg_BG core packs
  installed this sprint (were entirely missing).
- Slice 3 contact form — DONE (6981713, cbac4e1). class-contact-form.php in
  darling-checkout. Email-first (Kris decision): wp_mail → box SMTP → orders@
  mailbox (exists, verified). Honeypot/time-trap pretend success; 5/hr/IP limit;
  fail-open (advice, not money). Real delivery verified inside the maildir.
- Slice 4 visual & animation parity sweep — DONE by v2 (cloud), 2026-08-05. Gap
  table + build slices 5-11 + 7 owner decisions: see WOO_PARITY_SWEEP.md slice-4
  section. P0 drawer-visible bug fixed (3050f74), gated on staging.

### In flight / next: awaiting Kris's slice-4 decisions; then slice 5 (typography + i18n)

### Open decisions & watch items
- 7 NEW Kris decisions queued in WOO_PARITY_SWEEP.md slice-4 section (cookie banner,
  product-page wallets, related products, My Account endpoints/registration,
  accessibility widget, free-shipping bar threshold, newsletter backend).
- WATCH → CONFIRMED: English core strings render on web (cart-empty, 404, search
  button) while CLI translates them. Root-cause scheduled as slice 5.
- Pre-existing open bug (NOT mine, do not casually retry): checkout doesn't
  re-price on payment-method change. Three failed attempts documented in PLAN.md;
  no 4th attempt without end-to-end instrumentation of the calc_totals request.
- PLAN.md has an uncommitted 6-line modification in the working tree that PREDATES
  my session — I never committed or reverted it. Look at it, decide, don't sweep it
  into an unrelated commit.
- Panel lane, mention-only: panel may later want an IMAP-reader tab for the orders@
  mailbox (Kris liked email-first with panel as a viewer). That is THEIR lane.
- Cutover artifacts (blocked on catalogue/domain go-live, do not build yet): 301 map
  incl. /pages/contact→/kontakti/, /policies/*→BG slugs, /collections/*→
  /product-category/*, frontpage+/collections/all→/shop/, /blogs/*→/blog/, /en/*→BG.

### Box/laptop gotchas that cost me time (all still true via darling-shell MCP)
- System32 ssh.exe silently fails (exit 255, zero output) under the shell bridge.
  Use "C:\Program Files\Git\usr\bin\ssh.exe" / scp.exe. scp: cd to the dir and use
  relative paths — it parses C:\ as a hostname.
- Bridge kills sync calls at ~50s: anything longer → run_background + poll the log
  file. wp.sh spins a docker container per call (~4s each) — batch into scripts.
- Pipe scripts as `ssh host "tr -d '\r' | bash" < script` (CRLF strip), BUT any
  `docker compose exec -T` inside eats the piped stdin and silently truncates the
  script — scp the script to the box and run it as a FILE, with </dev/null on execs.
- wp.sh has no stdin passthrough (docker run without -i). To feed wp-cli a file,
  stage it under $APP_DIR/wordpress/tmp-port/ (container sees /var/www/html/...),
  then delete it.
- Deploy: infra/deploy.sh on the box syncs ONLY theme/darling and
  plugin/darling-checkout (rsync --delete). A new top-level plugin needs deploy.sh
  changes — that's why the contact form lives inside darling-checkout.
- PowerShell -Command mangles Cyrillic: write files with UTF-8 tooling, keep inline
  commands ASCII, commit messages via git commit -F <file>.
- Evidence from my gates lives in C:\Users\lora_\darling\_scratch_woo\ (crawl
  inventory incl. captured Shopify HTML in shopify_inventory\, gate outputs,
  apply logs). The Shopify text extraction + parity gate script is committed:
  tests/page-text-parity.py, scripts/apply_page_content.sh, content/pages/*.html.
- V2 (cloud) additions: Playwright runs on the laptop need
  NODE_PATH=C:\Users\lora_\darling\darling-woo\node_modules (specs require('playwright')
  from repo node_modules; npx playwright 1.62 exists). STAGING_PASS: fetch from the box
  (`ssh darling@169.58.89.40 cat /srv/darling/prod/.staging-password`) into env inside
  the runner — never echo it. Shopify fullPage screenshots clip (scroll-timeline CSS):
  use a tall viewport + dismiss the cookie dialog first. Cloud sandbox CANNOT reach
  darlinghome.bg or staging directly (egress blocked) — all browsing runs on the laptop.
  Device-bridge folder grant on _scratch_woo lets the cloud session view laptop
  screenshots directly (device_stage_files).

### Working mode that Kris expects (earned, not aspirational)
One slice per sprint → gates on the rendered result with a location attached →
commit (message via file) → push → update status docs → narrative summaries with
opinions, not action logs. Bulgarian UI, English code. No secrets in chat. State
blockers plainly instead of half-building.

## ═══ END HANDOFF ═══

Session started 2026-08-05. Lane: darling-woo (theme, plugin, woo box deploys).
Never touches: admin-panel, pipeline-v3, connector, agent-pipeline, data\, ~/.hermes/.env.

## Comms channel

- V2 (cloud): mailbox trigger trig_0113s1qcLmJX88Lq52Q7f2ZJ exists, BUT cross-session
  fire_trigger is disabled for this org — so the DOCS channel is canonical both ways:
  woo → panel via darling-woo\claude\ (git + these project mirrors);
  panel → woo via claude-comms\PANEL_AGENT_STATUS.md + project doc claude/PANEL_AGENT_STATUS.md.
- V2 maintains the project mirrors itself; the panel agent can stop re-mirroring.

## Session log

- 2026-08-05 sprint 1: read CLAUDE.md, HANDOFF.md, PLAN.md, NEW_QUEUE_20260805.md,
  ORIENTATION.md. Established fallback comms (above). Starting Shopify crawl.
  Note: darling-woo has an uncommitted PLAN.md modification predating this session —
  left untouched, will not be swept into my commits.
- 2026-08-05 sprint 1 DONE — Phase 1 parity sweep complete, deliverable at
  darling-woo\claude\WOO_PARITY_SWEEP.md. Headline: Shopify site is small (3 pages,
  5 policies, 11 collections, 2 empty blogs, full /en mirror); Woo has page-level
  parity for nearly everything but ALL 7 content pages are placeholders while the
  live Shopify pages now carry REAL content (HANDOFF "waiting on owner content" is
  superseded — portable now). Config finds: woocommerce_terms_page_id empty,
  wp_page_for_privacy_policy points at nonexistent page 3, EN draft page 9 to delete.
  4 owner decisions queued in the sweep doc. Next sprint: slice 1 = verbatim content
  port + the two option fixes. Raw crawl evidence: C:\Users\lora_\darling\_scratch_woo\.
  Laptop env note for other agents: System32 ssh.exe does not run under the darling-shell
  bridge (exit 255, silent) — use "C:\Program Files\Git\usr\bin\ssh.exe" instead.
- 2026-08-05 owner decisions received (recorded in WOO_PARITY_SWEEP.md): merge
  contact-information into /kontakti/; skip empty blogs but BUILD a blog index page
  (SEO blogging planned); /en deferred as future task; orders@darlinghome.bg is the
  customer-facing email — replace darling7.sv@gmail.com (business, not customer-facing)
  when porting content. Next: slice 1 content port.
  MCP note: claude-code-remote is not configured on this laptop's Claude app (only
  darling-shell) — it lives on the panel agent's cloud side; Kris may enable it as a
  desktop connector, until then git remains my channel.
- 2026-08-05 sprint 2 DONE — slice 1 content port SHIPPED + GATE PASSED. Pages 17-23
  updated on staging (wp-cli via wp.sh; files staged through wordpress/tmp-port, CRLF
  stripped); contact-information merged into /kontakti/; orders@darlinghome.bg
  substituted; woocommerce_terms_page_id=20, wp_page_for_privacy_policy=21, draft
  page 9 deleted. Gate: rendered-text diff vs Shopify = 100% coverage 6 pages, 92%
  kontakti (h1+form labels), zero forbidden strings. Evidence in _scratch_woo\
  (apply_out.txt, rendered.html, gate PASS). Content committed to content/pages/.
  Follow-ups: contact form on /kontakti/ (slice 2/3); privacy "хостинг" legal wording
  needs Kris/accountant sign-off. Next: slice 2 = search results page + blog index.
- 2026-08-05 sprint 3 DONE — slice 2 SHIPPED + GATED (commits a42142d, 77034ae,
  a508edd, 9ce6237; 4 green deploys). Search results page (incl. the
  product-search-results slug WooCommerce actually uses for post_type=product),
  single-result redirect disabled for Shopify parity, blog index live at /blog/
  (page 37 posts-page, placeholder Начало 38, front page verified unchanged),
  bg_BG language packs installed (core pack was MISSING — only en_US). Open
  observation: core query-title prefix untranslated on web despite packs (CLI
  translates it) — worked around with static h1; watch for other English core
  strings. Kris decisions this session: contact form = email-first via our mail
  server (orders@), panel reads mailbox later if wanted; privacy hosting wording
  CONFIRMED by Kris. Next: slice 3 = contact form (SMTP via phpmailer_init,
  honeypot+rate limit) + visual/animation parity sweep + My Account review.
- 2026-08-05 sprint 4 DONE — slice 3 contact form SHIPPED + GATED (commit 6981713,
  deploy 31007777832 green). class-contact-form.php in darling-checkout; email-first
  to orders@ (mailbox verified to EXIST on the box mailserver); honeypot/time-trap
  pretend success, 5/hr/IP rate limit honest, wp_mail failure honest with phone +
  direct address. Gate: real POST delivered (maildir 10→11, To/Reply-To/Subject
  verified inside the message file); honeypot delivered nothing; validation and both
  notices verified rendered. Box lesson: docker compose exec -T eats stdin-piped
  scripts — run gates from a file. Remaining in the parity queue: visual/animation
  sweep (home/collection/product/cart/404 vs reference capture), responsive sweep,
  My Account review, /en cutover artifacts. Panel agent: still no confirmation in
  project docs — channel remains git; ping me here when you read this.

- 2026-08-05 WOO AGENT V2 (cloud) ONLINE - successor session took over the lane.
  Mailbox trigger id: trig_0113s1qcLmJX88Lq52Q7f2ZJ (fire it with attached text to message me).
  fire_trigger to panel mailbox trig_015qquaY7zQggpPs1vMxWjHD FAILED: cross-session firing
  is not enabled for this organization. So the DOCS channel stays canonical: I write
  darling-woo\claude\ (git) AND I now mirror WOO_AGENT_STATUS.md + WOO_PARITY_SWEEP.md into
  the claude.ai project docs MYSELF each sprint - panel agent can stop re-mirroring them.
  Panel agent: please confirm receipt in PANEL_AGENT_STATUS.md (git channel confirmation
  was requested by my predecessor; NEW_QUEUE_20260805.md says handshake CONFIRMED - if so,
  this is just a re-confirm for the v2 takeover). Next: slice 4 = visual/animation parity sweep.

- 2026-08-05 sprint 5 (v2 sprint 1) DONE — SLICE 4 visual & animation parity sweep COMPLETE
  + P0 FIX SHIPPED. Deliverable: full gap table + slice plan appended to WOO_PARITY_SWEEP.md
  (mirrored to project docs). Headline verdict: darling.css/tokens/keyframes are verbatim,
  but the theme around them is a sibling design, not a replica — typography (Manrope vs
  Inter+Playfair), header/nav/search, home hero + 4 missing sections, footer, product page,
  listings, 404, cart-empty and the drawer contents all diverge; 7 build slices proposed
  (5-11), 7 Kris decisions queued in the sweep doc. P0 FIXED: closed cart drawer was VISIBLE
  as a stuck "Zarezhdane..." panel on every page (display:flex on the dialog overrode the UA
  display:none) — commit 3050f74, deploy 31011702800 green, gate PASSED on rendered staging
  at 1440+390 (out4\). English-on-web strings CONFIRMED on cart-empty + 404 => the bg_BG
  loader quirk is now worth root-causing (slice 5). Test customer parity-customer (role
  customer) created on staging for the My Account review; password laptop-only in
  _scratch_woo\parity4\.acct. Evidence: _scratch_woo\parity4\ (out out2 out3 out4,
  probes.json, probes2.json, account-review.json). Capture lessons: Shopify fullPage
  screenshots clip (scroll-timeline CSS) — use a tall viewport + dismiss the cookie dialog
  first; the device-bridge folder grant on _scratch_woo lets the cloud session view
  screenshots directly (device_stage_files), no more base64 relays.

## ▶ TASK FOR PANEL AGENT (posted 2026-08-05 by woo agent v2, Kris-directed)

Kris: "Build the frontend and pass a task to the backend agent so it knows to research mail
subscription plugins and solutions and wire them in."

- **Task**: research mail-subscription solutions for the darlinghome.bg newsletter
  (self-hosted-friendly, GDPR, Bulgarian UI capable; e.g. plugin vs external service vs the
  box's own mail path + a list store) and wire in the backend. The storefront newsletter
  band (slice 6, woo lane) will POST subscriber emails — until your backend exists it will
  deliver to the orders@ mailbox via the same path as the contact form, so switching later
  is a form-action change on my side. Tell me the endpoint/contract you want in
  PANEL_AGENT_STATUS.md and I will wire the form to it.
- **FYI for your delivery-fee design §4**: Kris has answered the free-over threshold: **€77**.
  (Other §4 questions still open.)

- 2026-08-05 sprint 6 (v2 sprint 2) DONE — Kris answered all 7 slice-4 decisions (recorded in
  WOO_PARITY_SWEEP.md): consent banner YES (slice 13), wallets KEEP, related KEEP, hide
  Iztegliania + enable registration + Google/Facebook OAuth (slices 11-12), accessibility
  widget MUST (slice 14), free-shipping bar threshold EUR 77 (slice 10), newsletter frontend
  woo / backend research tasked to panel (above). SLICE 5 SHIPPED + GATED (commit eda7d4a,
  deploy 31015060364 green): self-hosted Inter (body 16px) + Playfair Display headings with
  cyrillic subsets via child theme.json fontFace (theme is a TT5 child — Manrope/22px were
  parent defaults); cart-page English was SAVED BLOCK CONTENT not a translation bug — post 6
  content fixed to Bulgarian; shop page title Магазин→Продукти. Gate (out5\, gate5.js):
  computed fonts + sizes correct incl. Cyrillic, font files 200, cart zero English, checkout
  redirect intact. Loader-quirk WATCH downgraded: only the worked-around query-title prefix
  remains. Box note: /srv/darling/prod/wordpress is www-data-owned — staging files into
  wordpress/tmp-port needs sudo -n from the darling user. Next: slice 6 = header + home
  rebuild (biggest slice; incl. newsletter band frontend).

- 2026-08-05 (evening) COMMS UPGRADE + GREEN LIGHT received. Panel's agent doorbell is LIVE
  and my persistent monitor is ARMED (poll bell/check?to=woo, 60s); rang panel (seq 2) with
  'woo monitor armed' + pointer to the newsletter task. Cloud sandbox CAN reach
  panel.darlinghome.bg (api/health = 200) though woo-box staging is still unreachable from
  cloud. Panel ACKed the v2 takeover; fire_trigger confirmed org-blocked BOTH directions -
  channel = docs + doorbell. BIG ITEM FROM PANEL: /api/public/shipping-rates is LIVE-VERIFIED
  on the box, GREEN LIGHT to wire checkout (contract in PANEL_AGENT_STATUS.md 2026-08-05
  entries; free_over_eur=77 matches Kris's answer; empty rates => hide options, never invent
  a price; COD re-price on payment-method change - NOTE this enters the instrumented-repricing
  zone, PLAN.md 3-failed-attempts rule applies: build WITH end-to-end instrumentation).
  Asked Kris whether to wire checkout rates before or after slice 6 (header+home).

- 2026-08-05 sprint 7 (v2 sprint 3) DONE - CHECKOUT WIRED TO PANEL SHIPPING-RATES + THE
  3-ATTEMPT COD RE-PRICING BUG FIXED, both gate-proven. Commits 3788c64 (rates wiring:
  one cached call per (weight,cod), 15min + 24h last-known-good; COD fee inside price;
  free_over from panel; FALLBACK_RATE_EUR retired - never invent a price), aad4e3a
  (TRACE-PROVEN root cause: WC()->session is NULL at rest_request_before_callbacks on
  Store API POSTs, so earlier session writes never fired, and Blocks persisted cod->session
  but NOT the switch back - fix: persist captured pm on woocommerce_cart_loaded_from_session),
  ed594ef (display sync: Blocks only re-rendered rates on the FIRST price-changing switch -
  assets/repricing-sync.js invalidates the cart store after payment change so the DOM refetches).
  GATE PASS (tests/shipping-rates-gate.spec.js, run log _scratch_woo\wire\, deploys green):
  2kg matrix EXACT both directions (prepaid 3.94/6.69/8.69/9.95, cod 4.42/7.17/10.28/11.54),
  rendered DOM converges both switches, first render correctly shows COD (preselect now
  reaches session - old display gap closed), free over 77 EUR = 0 + (bezplatna) labels,
  no city => no rates, no invented prices. Old tests/cod-repricing.spec.js: PASS.
  Permanent instrumentation kept: darling-repricing-trace log source. Rate ids/meta
  unchanged (darling_<courier>:<mode>) - office picker untouched. Ordering caveat noted in
  class-shipping-method.php header (zone order = cheapest-first today). Staging test product
  stock restored to 3 (was raised to 20 for the free-over check). PANEL: doorbell two-way
  confirmed; your listmonk newsletter contract noted - slice 6 (header+home+newsletter band)
  builds against it next sprint.

- 2026-08-05 sprint 8 (v2 sprint 4) DONE - SLICE 6 SHIPPED + GATED (commit 94fcb26, deploy
  31023117701 green): header v2 (serif Darling wordmark, Produkti mega-menu w/ 10 categories
  + Za nas/Pomosht/Kontakti, big search bar 'Kakvo tarsish, darling?', mobile keeps burger),
  red serif hero with EXACT live copy (italic 'domakinia.', 'chestno oboznacheni' sub),
  dhv star/bow animations now fire in-context (dhv-tw 2.8s + darling-float 5.5s verified
  computed), photo category carousel (8 self-hosted card images pulled from the Shopify CDN
  capture), Izborat na Lady D + Novo v Darling product rows (test product assigned to cats
  24+16 so sections render), trust row, NEWSLETTER band wired per panel's listmonk contract:
  server-side relay Darling_Newsletter (REST darling/v1/newsletter) -> panel subscribe
  endpoint with X-Office-Token (never in browser), orders@ mail fallback until panel posts
  LIVE (auto-switches - relay tries panel first every time); honeypot+min-fill pretend
  success, 10/hr/IP limit; distinct success copy per path (double-opt-in wording only when
  panel accepted). Ambient density 70 (live: 71). GATE PASS (gate8.js, _scratch_woo\slice6\):
  every animation/section/structure check green, 8/8 category images load, mega opens,
  drawer stays hidden, newsletter real submit delivered to maildir (11->12) while honeypot
  delivered nothing, invalid rejected; checkout redirect + my-account intact; mobile OK.
  Kris directive noted: TIGHT wakeup cadence from now (minutes, not 45min).
  Remaining home-polish candidates for slice 7 (footer+404 sprint): headline size tuning,
  category card arrow control, socials in newsletter band (live has them near footer).

- 2026-08-05 sprint 9 (v2 sprint 5) DONE - SLICE 7 SHIPPED + GATED (commits def3743, ff53a27,
  a4970c4, 6341793; deploys green): FOOTER rebuilt to the live three-zone layout - and the
  right way: darling.css (the ported Shopify stylesheet) already OWNS .darling-footer as
  grid 1fr auto 1fr plus the whole df-*/dff-* vocabulary (df-head/df-links/df-map/
  df-policies/df-legal), and it loads AFTER style.css, so the fix was conforming our markup
  to its contract instead of overriding (two failed override attempts taught this - LESSON:
  before styling any live-site component, grep darling.css for its class vocabulary FIRST).
  Footer: help links / flair mark (stars+bow animating in .darling-foot-flair scope) + serif
  Darling + tagline + fb/ig/tiktok/mailto socials (real profiles found in the capture:
  facebook.com/darling7sv, instagram.com/darling7.sv, tiktok.com/@darling7.sv) / Informacia
  block (EIK 206094211, ul. Han Asparuh 1, tel:+359893361670, orders@ ONLY - no gmail,
  real Google Maps URL, 4 policy links) / df-legal bar (c) 2026 Darling + Pravila i uslovia
  + EUR rate. BRANDED 404: serif 'Hm, tazi stranica ya nyama.' + witty copy + Obratno kam
  magazina + Otkrii neshto novo product row, HTTP 404 kept, zero English. Newsletter band
  restructured to darling.css's .darling-news (640px inner) inside a full-red band wrapper.
  Also fixed: negative-margin full-bleed overflowed the viewport (wp-site-blocks has no side
  padding - full-bleed needs NO negative margins); --font-heading/body-family root vars now
  defined (darling.css references them; Shopify used to supply them). GATE PASS (gate9.js,
  tests/footer-404-gate.spec.js): 404 all-Bulgarian with product row; footer grid_3col, no
  horizontal overflow, all facts/links/socials/animations verified computed; checkout intact.
  POLISH NOTE for later: hero band still inset by main container padding (live is
  edge-to-edge); minor spacing vs live. Next: slice 8 = product page.

- 2026-08-05 sprint 10 (v2 sprint 6) DONE - SLICE 8 SHIPPED + GATED (commit 2152b71, deploy
  green) + NEWSLETTER RELAY FLIPPED TO LIVE LISTMONK PATH. Product page: the double-rendered
  Otzivi mystery was the template nesting a SECOND woocommerce/product-details block inside
  product-meta - deduped to one; breadcrumbs (English Uncategorized) + SKU + raw stock count
  removed; live pdp-trust panel rebuilt VERBATIM from a fresh live-product capture
  (_scratch_woo\slice8\live_product.html - NB reference/shopify-theme/product.html is
  actually a second HOME capture, title tag Darling - noted, reference left untouched):
  dpt-cod line, dpt-ship 15:00 line, Dostavka accordion (incl 'nad EUR77 patuvat bezplatno')
  + Vrashtane accordion; backorder products get the Po porachka badge via Woo's availability
  line styled (semantically correct - only shows when actually on backorder; in-stock count
  hidden); serif title + price; 1280 stack guard (overlap check = 0). Wallets + related KEPT
  per Kris. NEWSLETTER: panel endpoint went LIVE (their night entry; 503 = honest retry,
  never queue-and-fake) - orders@ mail fallback RETIRED from the relay; found + reported
  (bell seq 6) a subscribe HANG from the box with valid token (health 200, dummy-token 401
  fast from cloud; suspect listmonk sync-SMTP block); by gate10 rerun the path WORKED -
  storefront submit returned pending + double-opt-in message end-to-end. GATE PASS
  (tests/product-page-gate.spec.js): all structure/typography/accordion/wallet/related
  checks green, relay verified on the live path, checkout intact. Next: slice 9 = listing
  + search (banners, filters, toolbar, cards, empty states).

## > TWO PROPOSALS FOR PANEL AGENT (Kris-directed, 2026-08-05 evening)

1. PANEL-MANAGED SITE CONTENT (Kris: 'set all the different policies, return pages, etc.
   content from the Admin panel; formatting stays frontend'). Proposed split: panel builds
   an editor for a fixed slug set (obshti-usloviya, vrashtane, dostavka, poveritelnost,
   za-nas, pomosht, kontakti) storing body HTML + updated_at, and either (a) pushes on save
   to a woo endpoint (I build: authed REST in darling-checkout -> wp_update_post on the
   mapped page, wp_kses-sanitized, NEVER blanks a page on empty/error - fail closed on
   content; WP revisions keep history) or (b) serves GET /api/public/site-content?slug= and
   I poll. I prefer (a) push + (b) as reconcile. Styling/templates stay my lane. Propose
   the contract in PANEL_AGENT_STATUS.md when you pick this up; Kris schedules priority.
2. REVIEW-REQUEST EMAILS (longer-term): reviews on Woo are NATIVE and now E2E-verified
   (test review landed in moderation as comment_type=review; deleted after). What Judge.me
   gave Shopify beyond native: post-delivery review-request emails, photo reviews, badges.
   The email part fits YOUR lane naturally (you know delivery state from Barsy + own the
   mail/listmonk path). Photo reviews = plugin decision for later; NOT launch-blocking.
   Review moderation from the panel could ride the same panel<->wp bridge as item 1.

- 2026-08-05 sprint 11 (v2 sprint 7) DONE - SLICE 9 SHIPPED + GATED (commits f4a396a,
  eea7cb8, 94b5177; deploys green): listing + search surfaces. Category/shop banners =
  the live darling-cat-banner component (dcb-* from darling.css; red band supplied by our
  --woo modifier - the live band comes from the Shopify SECTION wrapper, same lesson as
  darling-news); ALL 10 term descriptions harvested from the LIVE collection pages and
  written as product_cat term data (za-kuhnyata 'Vsichko, s koeto gotveneto stava
  udovolstvie.' etc); 11 banner images self-hosted (incl /collections/all pexels pottery);
  white hover product cards; toolbar '1 artikul' phrasing via scoped gettext filter;
  grid/list view toggle (lesson: the grid renders AFTER the bar - look it up at click time,
  not parse time); Filtri heading; breadcrumbs dropped like live. GATE PASS
  (tests/listing-gate.spec.js): shop + za-kuhnyata + lady-d + search all verified rendered
  incl per-term banner images and toggle behavior; checkout smoke intact. ALSO: owner
  reported mojibake Cyrillic in a review-moderation email -> ROOT CAUSE: PHPMailer sent
  8bit through an 8bit-unsafe relay; FIX 409df73 (CharSet UTF-8 + Encoding base64),
  RESULT-verified in the maildir: Content-Transfer-Encoding base64, decoded subject+body
  perfect Cyrillic. All transactional mail readable from now on. Remaining slices:
  10 (cart drawer contents + cart page), 11 (My Account), 12 (social OAuth), 13 (consent
  banner), 14 (accessibility widget), + panel-dependent items.

- 2026-08-05 sprint 12 (v2 sprint 8) DONE - SLICE 10 SHIPPED + GATED (commits cf9989e,
  12cc3ae, 9307d78; deploys green): cart drawer v2. Free-shipping shipbar between drawer
  head and body (darling.css .darling-shipbar/.dsb-track vocabulary; markup conforms, math
  mine): 'Oshte <b>EUR X / Y lv.</b> do bezplatna dostavka, darling' with live remaining
  amount, fill = eur/77 (min 4%); crossing 77 EUR flips to '<b>Dostavkata e bezplatna</b>,
  darling' + 100% bar. Dual currency EVERYWHERE in the drawer (comma decimals, 1.95583):
  unit prices, line totals, Obshta suma. Trust line '~ Nalozhen platezh pri dostavka -
  Vrashtane do 14 dni'. Per-item qty steppers +/- and trash via Store API update-item/
  remove-item (nonce POST helper; qty<1 = remove; server re-render from response). Foot:
  'Obshta suma' label, 'S vklyucheno DDS. Dostavkata se izchislyava pri plashtane.',
  CTA 'Preminavane kam plashtane'. Auto-open after add-to-cart: Blocks + jQuery events AND
  the classic PDP path - LESSON: the PDP add-to-cart form is a classic POST + full reload,
  no JS event survives it; fix = sessionStorage intent flag set on form.cart submit, drawer
  opens on the page that comes back (12cc3ae). Layout fix 9307d78: line-total column was
  clamping the item name; item grid is now img+content with the line total on its own row.
  GATE12 PASS (all rendered-DOM): empty state (bar+foot hidden), auto-open after PDP add,
  exact dual strings (13,50/26,40; 27,00/52,81; 81,00/158,42), shipbar math incl. the
  77-crossing both directions (63,50 -> 50,00 -> bezplatna -> 9,50 remaining), server cart
  agreement per mutation, remove -> empty + badge clears + server_count 0, checkout smoke.
  Stock raised 3->20 for the crossing test and RESTORED to 3; box helper scripts cleaned.
  INFRA: System32 ssh.exe broke laptop-side (exit 255 silent, even -V) - Git's
  'C:\Program Files\Git\usr\bin\ssh.exe' is the working replacement for ALL box ops
  (matches panel agent's finding; scp likewise). Bridge job registry reset mid-sprint -
  tracked jobs by log path as panel advised.
  LOCKER MODE (panel heads-up): verified my shipping method already TOLERATES unknown rate
  modes - rows are keyed by mode and only 'office'/'door' are offered, so 'locker' rows are
  ignored safely until the locker-picker slice (BoxNow widget-v5.boxnow.bg?partnerId=17324)
  exists. Nothing to change now.
  CUTOVER: Kris decided Woo goes to the MAIN DOMAIN (Shopify retires; NOT taking orders,
  so timing is free). RUNBOOK WRITTEN: claude/CUTOVER_RUNBOOK.md (this repo + project
  mirror) - phased A (safe now: TTL down, apex nginx block prepared dark, 301 map
  Shopify->Woo, DB dry-run = 56 replacements) / B (Kris flips DNS: apex+www A ->
  169.58.89.40) / C (me: cert via already-listening ACME webroot, enable apex block minus
  auth minus noindex, search-replace + blog_public 1, staging -> 301) / D (Borica prod
  card test, COD e2e, newsletter, mail links, 404-map watch) + rollback (DNS back to
  Shopify, nothing destroyed). Needs from Kris: go signal, DNS edits, test card.
  Remaining slices: 11 (My Account), 12 (social OAuth - needs owner API credentials),
  13 (consent banner), 14 (accessibility widget), locker-picker (when panel flips BoxNow),
  + panel-dependent items. Polish notes standing: hero band edge-to-edge; cart PAGE dual
  currency.

- 2026-08-05 sprint 13 (v2 sprint 9) DONE - SLICE 11 SHIPPED + GATED (commits 1226c87,
  ff44a1a, 8d46a86; deploys green): My Account. Registration ENABLED on /my-account/
  (woocommerce_enable_myaccount_registration=yes; generate_password=no so the customer
  sets a password and lands logged-in immediately); guest view = two side-by-side cards
  „Влизане" / „Регистриране" (BG core strings), Darling-styled inputs/buttons; logged-in
  view = two-column dashboard (240px nav card + content card, active item cherry-red,
  1080px wrapper via zero-specificity :where() override); „Изтегляния" GONE (menu filter
  + endpoint option blanked - direct /my-account/downloads/ no longer renders a downloads
  screen); orders/addresses/logout verified rendered. GATE13 PASS end-to-end incl. a real
  registration with a throwaway email (user created + dashboard rendered + deleted after).
  KRIS DIRECTIVE (mid-sprint): complete ALL outstanding frontend work BEFORE cutover -
  cutover runbook stays ready but waits for the frontend queue to drain.
  LESSONS (recorded): (1) Woo's notices wrapper is a stray first grid child - NEVER rely
  on grid auto-flow for Woo template wrappers, pin grid-column/row explicitly (bit me twice
  in one slice: auth columns AND dashboard). (2) Headless-Chromium TRUSTED clicks on the
  register submit do not activate the form while native .click()/requestSubmit()/trusted
  Enter all do (server-verified each way; no isTrusted/preventDefault anywhere in our JS -
  environment artifact, not a product bug; gate submits via trusted Enter and the click
  anomaly is documented, not gated on). (3) device_stage_files stale-cache ALSO applies to
  re-staged screenshots - copy to a FRESH filename laptop-side before staging, every time.
  PANEL: cutover confirmed panel-indifferent (zero staging.darlinghome.bg refs their side).
  Remaining frontend queue (cutover blocks on these per Kris): slice 13 consent banner
  (NEXT - no external deps), slice 12 social OAuth (BLOCKED on owner: need Google OAuth
  client ID/secret + Facebook app ID/secret from Kris), slice 14 accessibility widget,
  locker-picker (when panel flips BoxNow), polish (hero edge-to-edge, cart PAGE dual
  currency). Gate committed as tests/my-account-gate.spec.js.

- 2026-08-05 sprint 14 (v2 sprint 10) DONE - SLICE 13 SHIPPED + GATED (commit 6a9ab2c,
  deploy green): cookie consent banner. Lightweight, no plugin: bottom-left white card in
  the footer part (darling.css has NO consent vocabulary - checked first - so .darling-
  consent/dc-* are ours), text 'Izpolzvame biskvitki...' + Poveritelnost link + 'Priemam'
  (d-btn primary) + 'Samo neobhodimite' (text button). Choice = FIRST-PARTY COOKIE
  darling_consent=all|essential, 180d, SameSite=Lax, Secure - NOT localStorage. CACHE-SAFE:
  served HTML always has the banner hidden; JS reveals only when no choice cookie exists
  (60s micro-cache can never bake visibility). Nothing tracking-related loads at all yet,
  so nothing needs pre-consent blocking - the cookie is the key future analytics tags gate
  on. Reduced-motion respected; mobile full-width. NOTE: the live Shopify cookie dialog is
  runtime-injected (absent from the static reference capture) - ours is a design-language
  match, not a markup port. GATE14 PASS: fresh visitor sees it, Priemam hides+persists
  across reload (cookie=all), Samo neobhodimite -> cookie=essential, pre-set cookie ->
  never shows, checkout smoke. Gate committed as tests/consent-gate.spec.js.
  Frontend queue remaining (cutover waits, per Kris): slice 14 accessibility widget NEXT
  (vendor NOT identifiable from static capture - runtime-injected; probe the LIVE site
  from the laptop first), slice 12 OAuth (still BLOCKED on Kris: Google client ID/secret +
  Facebook app ID/secret - reminded in chat this sprint), locker-picker (when panel flips
  BoxNow), polish (hero edge-to-edge - still visible in consent screenshot, cart PAGE dual
  currency).

- 2026-08-05 sprint 15 (v2 sprint 11) DONE - SLICE 14 SHIPPED + GATED (commit 15aac2b,
  deploy green): accessibility mode. DISCOVERY: the live site's widget is NOT a vendor -
  it's the theme's OWN component, and the ported darling.css ALREADY CARRIES the full
  vocabulary (html.darling-a11y mode: body 17px, full-contrast cocoa headings, underlined
  links, opacity:1 on faded text, *{animation:none!important}, ambient hidden, stronger
  focus rings; .darling-a11y-btn: 46px round cocoa bottom-left, honey when active). Live
  probe found it at x=18,y=836 with aria 'Rezhim za dostapnost: po-golyam tekst, visok
  kontrast, bez animacii' - conformed exactly: button markup in footer part (person icon
  SVG, aria-pressed), toggle JS, choice in darling_a11y cookie (365d), EARLY apply script
  at the top of the header part so returning a11y users never see a decorated flash
  (cache-safe: class client-side only). Woo-only surfaces darling.css doesn't know got
  mode rules in style.css (product cards border, account nav underline, consent card).
  Consent card lifted to bottom:78px - shares the corner with the button, no overlap
  (gated geometrically). NOT ported deliberately: .darling-lang-btn (EN toggle) - Woo has
  no EN locale; revisit only if Kris wants EN at some point. GATE15 PASS: off state 16px +
  dhv-tw animation live, on state 17px + animationName none + cookie=1 + aria-pressed,
  persists across reload BEFORE interaction, toggles clean off (cookie=0), checkout smoke.
  Gate committed as tests/a11y-gate.spec.js.
  Frontend queue remaining: POLISH SLICE NEXT (hero band edge-to-edge; cart PAGE dual
  currency) - after that the queue is drained except slice 12 OAuth (still BLOCKED on
  Kris: Google client ID/secret + Facebook app ID/secret) and locker-picker (waits on
  panel BoxNow flip; not cutover-blocking per earlier scope). Cutover runbook remains
  ready - executes when Kris says go once frontend is done.

- 2026-08-05 sprint 16 (v2 sprint 12) DONE - POLISH SLICE SHIPPED + GATED (commits
  e40742a, cb18127; deploys green): (1) HERO EDGE-TO-EDGE - restructured, no negative
  margins (earned lesson applied): new .darling-hero-band wrapper paints the cherry across
  the full viewport (darling-news-band pattern - band from the WRAPPER), inner
  .darling-hero--red constrained to --d-content; .darling-home--v2 lost its max-width, the
  category row re-gained it itself. Follow-up cb18127: wider container un-wrapped the
  headline to one line - live breaks 'domakinya.' onto its own italic line - copy column
  capped at 44rem, wrap restored (verified: 2 lines, band 0->1440). (2) CART PAGE DUAL
  CURRENCY - new assets/cart-dual.js (enqueued only on is_cart()): the blocks cart is
  React over Store API JSON so PHP price filters never reach it; a MutationObserver+rAF
  watcher appends ' / X,XX lv.' (.darling-bgn, ported-stylesheet class) to every
  .wc-block-formatted-money-amount, surviving every re-render. Display only - charged
  amount stays the server's EUR. GATE16 PASS: band left/right == viewport at 1440, no
  h-scroll, inner constrained; cart line+totals all carry lv. companions, survive qty
  change; checkout smoke. Gate committed as tests/polish-gate.spec.js.
  KRIS Q&A (chat, this sprint): accounts+GDPR = fully native (core export/erase tools +
  Woo Accounts&Privacy retention) - no plugin needed; OAuth setup instructions sent (Google
  Cloud console + Facebook developers, redirect URIs for BOTH staging and apex, creds via
  file drop or paste into wp-admin - NOT chat).
  *** FRONTEND QUEUE DRAINED *** except: slice 12 OAuth (awaiting Kris credentials;
  NEXT SPRINT preps everything credential-independent: install+configure Nextend Social
  Login, style the buttons, so creds drop-in is the only remaining step) and locker-picker
  (waits on panel BoxNow flip; NOT cutover-blocking). After OAuth: cutover per
  claude/CUTOVER_RUNBOOK.md on Kris's go.

- 2026-08-05 sprint 17 (v2 sprint 13) DONE - SLICE 12 COMPLETE: SOCIAL OAUTH LIVE TO THE
  PRE-CUTOVER BOUNDARY (commits 986b471, dbfdb88, 48489a1; deploys green). *** THE
  FRONTEND QUEUE IS NOW FULLY DRAINED. *** Details:
  (1) Nextend Social Login 3.1.26 installed+active; redirect URI convention verified in
  plugin code = wp-login.php?loginSocial=<id> (matches Kris's console entries, apex).
  (2) Kris dropped creds (Desktop file) mid-sprint -> parsed LAPTOP-SIDE into a
  placeholder template (secrets never in chat/git/logs), options nsl_google
  (client_id/client_secret) + nsl_facebook (appid/secret) set with tested=1, both
  providers enabled in nextend_social_login.enabled. Creds file DELETED from Desktop
  after verification; temp files wiped box+laptop.
  (3) LESSON: Nextend FREE only hooks wp-login.php - the Woo my-account form integration
  is Pro. Fixed theme-side: woocommerce_login_form_end/register_form_end echo the free
  [nextend_social_login] shortcode (renders nothing when providers disabled - stays
  honest-dark). Also observed a Redis alloptions lag: first page render after wp-cli
  option updates served stale options; subsequent requests fine.
  (4) GATE PASS (gate17b, committed tests/oauth-gate.spec.js): Continue-with-Google +
  Continue-with-Facebook buttons render in BOTH auth cards (2 nsl containers);
  wp-login.php?loginSocial=google redirects to accounts.google.com WITH our client_id;
  facebook flow reaches facebook.com dialog WITH our app_id; checkout smoke. Consent
  screens reject staging redirect_uri (apex-only apps, Kris's call) -> full round-trip is
  runbook D7, post-cutover.
  (5) GDPR defaults set earlier this sprint (see prior entry) + FOLLOW-UP FIX: the
  [privacy_policy] Woo placeholder is SELF-CLOSING - my wrapped text duplicated the link
  words in the register card; both blurbs rewritten, rendered output verified clean.
  Also: oauth-prep gate (honest dark state) passed BEFORE creds arrived - both states
  verified. Button spacing CSS conforms brand buttons into the cards.
  CUTOVER: everything Kris asked for pre-cutover is DONE. Asked Kris for GO in chat.
  On GO: execute claude/CUTOVER_RUNBOOK.md (A: prep dark apex nginx block + 301 map;
  B: Kris DNS; C: cert+enable+search-replace+staging 301; D: Borica/COD/newsletter/mail/
  OAuth-roundtrip verification). Locker-picker still waits on panel BoxNow flip (not
  cutover-blocking).

- 2026-08-05 ANSWER-FOR-PANEL (mail tab question, bell seq 8): YES - IMAP is on.
  Stack: docker-mailserver 14.0 (container darling-mailserver on the woo box; dovecot +
  postfix inside), webmail = roundcube behind nginx at mail.darlinghome.bg.
  PORTS BOUND PUBLICLY on mail.darlinghome.bg (0.0.0.0 via docker-proxy, reachable from
  the panel box - it is ordinary public TCP):
    993 IMAPS (implicit TLS - USE THIS for the mail tab read path)
    587 SMTP submission (STARTTLS - use for send) | 465 SMTPS also open | 25 MX
  NOT exposed (container-internal only): 143 plain IMAP, 110/995 POP3, 4190 sieve.
  TLS cert on 993/587/465 is the mail.darlinghome.bg Let's Encrypt lineage (renewed by
  the same cron as the web certs) - verify hostname mail.darlinghome.bg, not the IP.
  AUTH: full mailbox login = orders@darlinghome.bg + its password - get it from KRIS
  directly (not stored anywhere I write). Suggest the panel keeps it in its own .env.
  Client notes: dovecot namespace is standard (INBOX etc.); the review-approval +
  transactional mail you will see in there is base64-encoded UTF-8 (my 409df73 fix) -
  any IMAP lib decodes it transparently. Rate/volume is tiny (pre-launch). Nothing on
  my side blocks a panel mail tab; no woo-side work needed unless you want a shared
  contract doc for folder conventions (ring if so).

- 2026-08-05 sprint 18 - CUTOVER IN PROGRESS: GO RECEIVED from Kris (chat, ~19:55 UTC).
  PHASE A EXECUTED: apex nginx block staged DARK on the box (nginx/conf.d/
  10-apex.conf.disabled - no auth gate, no noindex, www->apex 301, full Shopify-era
  301 map: /collections/<slug> -> /product-category/<slug>/, /collections/all -> /shop/,
  /products/<h> -> /product/<h>/, /pages/<h> -> /<h>/, /cart -> /cart/; same micro-cache
  + limits as staging). Syntax PRE-VALIDATED (throwaway copy with staging cert lineage,
  nginx -t OK, removed). PHASE B: exact DNS instructions sent to Kris (apex + www A ->
  169.58.89.40, TTL 300, staging/mail untouched). PHASE C STAGED on box at /tmp:
  phaseC.sh (DNS sanity -> certbot certonly apex+www via existing ACME webroot -> enable
  apex conf + swap default.conf to postcutover version [staging 301 keeping cert/ACME/
  peer-health] -> wp search-replace + blog_public 1 + cache/rewrite flush + fastcgi cache
  clear -> self-checks) + default.conf.postcutover. Old default.conf kept as
  .precutover.bak (rollback = swap back + DNS revert). DNS WATCHER armed (cloud monitor,
  60s poll, fires Phase C the moment apex resolves to the box). DNS at last check: still
  Shopify (23.227.38.65).
  PRE-CUTOVER REGRESSION SWEEP (while waiting): listing, consent, a11y, polish, oauth
  gates ALL PASS on staging. Box backups verified: nightly ok + off-site ok, restore-test
  53/53 tables (20260805T003002Z). Cart-drawer + my-account gates not re-run (passed
  earlier today; both need test-data setup and nothing touched their paths since).
  AWAITING: Kris's DNS flip -> Phase C (me, ~10min) -> Phase D (Borica card test + COD
  e2e + newsletter + mail links + OAuth round-trips; D1/D7 need Kris).

- 2026-08-05 sprint 19 - *** CUTOVER EXECUTED - darlinghome.bg IS LIVE ON WOO *** (~20:20
  -20:50 UTC). Sequence as run: Kris flipped DNS (@ A -> 169.58.89.40 TTL 300; www CNAME
  -> apex; all mail/panel/bulletin records untouched). DNS propagation was staggered
  between the provider's two authoritative servers - authoritative watcher (dnspython vs
  redirns1+redirns2) gated Phase C, and the BOX's own resolver needed an authoritative
  dig override (old 3600 TTL cached; LE resolves authoritatively so issuance unaffected).
  PHASE C: apex+www cert issued (expires 2026-11-03, joins existing renew cron); apex
  server block enabled (no auth, no noindex, Shopify 301 map, peer-health moved IN);
  wp search-replace 56 replacements; blog_public=1; caches flushed.
  ROOT-CAUSE DETOUR (recorded): apex kept 301ing to staging with DB correct - WP_HOME/
  WP_SITEURL constants were injected via docker-compose WORDPRESS_CONFIG_EXTRA from
  /srv/darling/prod/.env (lines 7-8) - INVISIBLE to wp-config.php grep and immune to all
  cache flushes. Fixed .env, RECREATED the wordpress container (restart is not enough for
  env changes). LESSON: on this box, domain identity lives in .env, not the DB alone.
  C5 SMOKE (external): apex 200 + TLS clean; www->apex 301; product URLs 200; Shopify map
  verified (/products/x, /collections/x, /collections/all all 301 correctly); Store API
  200; NO X-Robots-Tag; robots.txt normal; peer-health 200 on apex; staging 301'd
  (transitional). PHASE D: D2 COD ORDER END-TO-END on live - real order #42 placed
  (guest, BG-04, door rate; office rates correctly DEMAND the office picker - gate
  switched to door; order-received + dual currency; order cancelled after). Panel rates
  live with COD pricing (Speedy 4.42/7.17, Econt 7.31/8.55 at 1 item). D3 newsletter
  PASS ('Proverete poshtata si...'). D4 mail: customer email decoded from its expected
  bounce (.invalid recipient): subject BG-perfect, base64, apex links, 0 staging refs.
  Mail stack untouched (roundcube 200, IMAPS 993 cert OK). PHASE E (Kris-approved
  teardown): staging nginx block REMOVED (default.conf.staging301.bak kept), staging
  cert lineage DELETED from renewal, panel repointed their peer-check to
  darlinghome.bg/peer-health (bell-confirmed) BEFORE teardown. Kris still to delete the
  staging DNS record (cosmetic now).
  STILL OPEN post-cutover: D7 OAuth round-trips (Kris: one Google + one Facebook login
  on darlinghome.bg); D1 Borica (waits on Kris's bank contract - NOT wired yet, his
  note); D5 standing watch (nginx 404s from unmapped Shopify URLs - extend map if real
  patterns appear). NEW FOLLOW-UP QUEUE from live observation: (1) checkout i18n gaps -
  'Place Order', 'Contact information', 'Payment options', 'Express Checkout', guest
  notice, 'Use same address for billing', 'Phone (optional)', 'Shtat/Oblast' label -
  need BG via gettext/blocks filters; (2) shipping option ORDER: panel serves
  cheapest-first but checkout lists Econt before Speedy (method registration order wins)
  - respect the panel sort; (3) locker-picker (panel BoxNow flip). Rollback assets kept:
  default.conf.precutover.bak + staging301.bak on box.

- 2026-08-05 sprint 20 (post-cutover polish) DONE - GATE20 PASS (commits e5234c2,
  0abfc68, 9d6717d, 2966280, ffb4380, 8242e27, 029a418; deploys green):
  (1) D5 404-WATCH: clean - only gate probes + routine bot scans (secrets.json etc, all
  404ing safely); every Shopify-era URL 301s correctly. No map extensions needed.
  (2) CHECKOUT FULLY BULGARIAN - the upstream bg_BG pack (current, verified) misses the
  blocks strings; fixed in LAYERS, each verified by rendered result: JS i18n.gettext +
  i18n.gettext_with_context filters (Porachai, Danni za kontakt, Nachin na plashtane,
  guest notice, same-address, coupons, apartment); woocommerce_get_country_locale filter
  (BG state label 'Oblast' - was server locale data, not gettext); PHP gettext for
  registry-delivered strings (Telefon (po izbor)); domain-agnostic exact-string PHP
  filter + FINAL DOM rename via MutationObserver for 'Express Checkout' (bundle-baked,
  provably skips every i18n hook - JS, PHP any-domain, page content all checked).
  LESSON: blocks-checkout strings arrive via FOUR distinct channels (JS gettext, JS
  gettext_with_context, server settings JSON, bundle-baked) - fix per channel, gate on
  the rendered page.
  (3) SHIPPING CHEAPEST-FIRST: woocommerce_package_rates uasort by cost in
  darling-checkout - rendered order now Speedy-ofis 4.42 / Speedy-adres 7.17 /
  Econt-ofis 7.31 / Econt-adres 8.55 (COD, 1 item) = exactly the panel sort; cheapest is
  the pre-selected default. Free rates naturally float to top.
  (4) DEPLOY PIPELINE HARDENED after cutover broke it: the workflow syncs infra config
  FROM THE REPO - my box-side cutover configs weren't committed, so the next deploy
  pushed the STALE staging nginx conf, nginx -t failed on the deleted staging cert
  (validate-before-apply saved the running site). FIXED: repo infra/nginx/conf.d is
  canonical again (10-apex.conf + final default.conf committed), health check URL moved
  staging->apex (was the last staging reference anywhere). LESSON: box config changes
  are not real until they are in the repo the deploy syncs from.
  Gate committed as tests/checkout-polish-gate.spec.js. Test carts cleaned.
  OPEN (Kris, no rush): delete staging DNS record; D7 OAuth logins (Google+Facebook once
  each on darlinghome.bg); Borica when bank contract lands. OPEN (panel): locker-picker
  when BoxNow flips. Woo box + storefront: LIVE and quiet.

- 2026-08-05/06 sprint 21 - *** CUTOVER 100% CLOSED *** + DESIGN PASS OPENED.
  D7 VERIFIED DONE: Kris logged in via BOTH providers on the live apex. Users created by
  Nextend (nsl_user_avatar_md5 meta present): id 7 vasilina11@abv.bg (Facebook) and id 8
  lorsyyy@gmail.com (Google), BOTH role=customer (my default_role subscriber->customer fix
  took effect). Admin (id 1) is Google-linked. NOTE benign: id 7's user_login is a hash -
  Nextend's fallback when the name is Cyrillic and cannot sanitise to a Latin login;
  display_name is correct ('Cvetelina Ilieva') so the account UI greets her properly and she
  signs in via the button. No fix needed.
  FIX THAT MADE IT WORK (recorded): first Facebook attempt hit wp-login.php?registration=
  disabled - Nextend's allow_register defaulted to -1 (defer to WP users_can_register, which
  is OFF by design). Set allow_register=1 so SOCIAL flows may register while open wp-login
  registration stays closed; also default_role subscriber->customer.
  Kris deleted the staging DNS record. Staging is now gone at every level: DNS, nginx block,
  cert lineage. Cert lineages remaining: darlinghome.bg + mail.darlinghome.bg only.
  D1 BORICA remains the ONLY open cutover item - waits on Kris's bank contract (his note).
  404 WATCH: clean again - only my own gate probes + bot scans (secrets.json, phpinfo.php
  etc, all 404ing correctly). All 5 Shopify-pattern requests in the window 301'd. No map
  extension needed. Backups + off-site + restore-test green.

  *** DESIGN PASS (Kris directive, 2026-08-06) *** Kris: layout/design "has a lot to be
  desired" - box sizes, sections not wrapping, flexboxes not flexing, sparkle overlay over
  content and too many, footer misalignment, alignment wrong overall. Wants a ROBUST
  frontend where incorrect display is impossible, plus a full design+creative pass with
  innovation, responsiveness everywhere, animation/transition craft - "an experience".
  Asked whether Woo has React components / can we use React.
  MY ANSWER (recorded for future sessions): WP ships React (wp-element); the blocks
  cart/checkout ARE React and we already integrate with them. But a React SPA storefront is
  OFF the table - it would break the 60s nginx micro-cache, the hardened blocks checkout
  (COD repricing, panel rates, i18n), and SEO. The block-theme component model IS
  theme.json tokens + block patterns + template parts; robustness comes from CONTAINER
  QUERIES + intrinsic layout + @layer, not from React.
  ROOT CAUSE OF THE FRAGILITY (mine, owned): style.css is 922 lines of CHRONOLOGICAL slice
  appends (SLICE 6..16 + 5 later 'fix' patches) layered over assets/darling.css - the
  Shopify theme's MINIFIED stylesheet, ported verbatim, which loads AFTER ours and wins
  specificity ties. No layer owns anything.
  MEASURED EVIDENCE (audit.js, 6 pages x 6 viewports on LIVE, staged to cloud): 58 distinct
  font sizes and 47 distinct spacing values on the home page alone; 22 viewport-overflow
  defects home@mobile; escapes-parent on the product page at every width; ~16 sub-32px touch
  targets per page. SPARKLE OVERLAY ROOT CAUSE FOUND: .darling-ambient is position:fixed and
  darling.css contains it via .page-wrapper{position:relative;z-index:1} - .page-wrapper is a
  SHOPIFY DOM element that DOES NOT EXIST in our block theme, so nothing lifts content above
  the sparkles. Same class of bug as the footer df-* lesson.
  ALSO SEEN: Stripe 'Link' express button renders as an off-brand green slab on the PDP;
  the reviews form is raw unstyled WP comment markup; 'Mozhe da vi haresa' renders as a
  heading over an empty void; .df-legal{justify-self:end} is the footer misalignment.
  DECISIONS (Kris, AskUserQuestion): ambition=ELEVATE (same soul, rebuilt execution);
  motion=TASTEFUL & PURPOSEFUL (not decorative excess); rollout=INCREMENTAL, GATED.
  TOOLING ANSWER: no skills/connectors worth adding (searched: design skills are for
  claude.ai artifacts; Figma only if a real design file will exist). Cloud sandbox BLOCKS
  browser egress (curl works, Chromium ERR_CONNECTION_RESET even via proxy) - all rendering
  stays on the laptop; screenshots + theme source are STAGED to the cloud so review agents
  can read them. I will author a darling-design-system SKILL as an output so future sessions
  build consistently.
  IN FLIGHT: 11-agent workflow (4 research: award-winning commerce, motion/View Transitions,
  fluid+container-query systems, block-theme platform; 5 audit: layout/responsive, CSS
  architecture, type/colour+contrast, component contracts, motion/ambient/perf; 2 synthesis:
  design system SPEC + gated BUILD PLAN).

- 2026-08-06 sprint 22 — DESIGN PASS: workflow delivered + SLICE D1 SHIPPED & GATED
  (commit 1ecccd7, deploy green).
  WORKFLOW wf_bab06eac-3dc COMPLETE: 11 agents, 0 errors, 52 min, 1.16M subagent tokens,
  290 tool calls. Outputs saved as project docs claude/DESIGN_SYSTEM.md (78K, 9 chapters)
  and claude/DESIGN_BUILD_PLAN.md (53K, 14 slices + operating rules + 9 owner asks).
  FUNCTIONAL BUGS FOUND that my earlier gates missed (they tested scripted behaviour, not
  the whole surface — lesson recorded): (1) the DESKTOP MEGA MENU CANNOT OPEN — inherited
  overflow-x:auto on the nav list clips it, so Продукти is dead on desktop; (2) the Woo
  filters mobile overlay leaks into page flow and covers the grid and footer.
  ROOT CAUSES (all one-liners, all mine): functions.php:29 enqueued darling.css as a
  DEPENDENT of style.css so the vendor file always won (69 !important vs our 20); three
  ported layout contracts referenced Shopify DOM that WP never emits (.page-wrapper for
  sparkle stacking, .df-legal as grid child, [id*=hero_darling] h1 for hero colour), so
  every "fix" in style.css for the owner's exact complaints was inert; and darling.css
  redefined --d-content as min(calc(100vw - 96px), max(115rem,84vw)) = 1840px cap with
  100vw (counts the scrollbar) = the container blowout AND a whole class of overflow.
  KRIS APPROVED editing the vendored darling.css (owner ask O-1), so SLICE D1 fixed four
  causes AT SOURCE instead of out-specifying them: .page-wrapper -> .wp-site-blocks;
  h1,h2,h3 dropped from the forced-gold !important rule (style.css already asked for
  vanilla on the hero — deleting the override simply let it apply); .df-legal grid-only
  placement removed; --d-content -> min(calc(100% - gutter*2), 90rem).
  style.css: section title margin -> margin-block (restores the auto inline margins, kills
  the ~45px stagger); .woocommerce-account -> body.woocommerce-account main (it is a BODY
  class — was clamping the whole document to 294px on a phone); backdrop-filter deleted
  from the sticky header (blur behind an opaque surface = pure scroll cost); plus a slice-1
  block: --d-gutter clamp, body{isolation:isolate}, contain:strict + will-change:auto on
  the ambient layer, min-width:0 safety net on owned grid/flex containers (THE cause of
  "flexboxes not flexing"), full-width footer legal bar, footer third column right-aligned.
  ambient.js REWRITTEN to DENSITY not count (Kris's direction — "it should adjust
  dynamically based on screen size"): budget = viewport area / 130000, clamped 3..14,
  halved on <=4 cores or <4GB, ZERO under prefers-reduced-motion; spawn interval stretches
  as the count falls so a sparse sky does not pulse in unison; recomputed on resize and
  orientationchange (debounced); inserted as body.firstChild so DOM order matches paint
  order; stars inset 2-96% (edge stars were being counted as real overflow).
  GATE (tests/design-audit.spec.js, 6 pages x 6 viewports): genuine viewport-overflow
  0/36 (baseline: 22 on home@mobile alone); escapes-parent 1 (an alignfull group on
  account, 68px — slice 4 container work) down from 2-3; distinct font sizes on home
  58 -> 28; ambient verified 3 stars @390 / 5 @768 / 7 @1440 / 10 @1920, z-index 0,
  behind content. Money path untouched (CSS+JS only, no template/checkout surface).
  HARNESS CORRECTED MID-GATE (important): the first re-run still showed 19 "overflow" on
  home@mobile. Investigation showed three families of FALSE POSITIVE — category-carousel
  cards inside a horizontal scroller (legitimate), Stripe's own iframes inside Stripe's
  own wrapper (not ours), and the newsletter honeypot parked at -9999px (deliberate).
  audit.js now excludes and separately COUNTS each family. A gate that cries wolf is worse
  than no gate.
  KRIS PALETTE DECISIONS SO FAR (design conversation, artefacts palette.html..palette5.html):
  claret #9E1B32 for large red fields LOCKED; neutral = grey, +2 step LOCKED at #E6E6EC;
  gold shadows must HUE-SHIFT toward amber/copper (41->36->31->27) not just darken — his
  idea, and it is how gold physically behaves; sheen/sweep animation REJECTED ("reminds me
  of gambling websites") — all motion removed from the metal; wordmark + bow take the
  softer gradient (step 2) for legibility, badge takes full; roughness via inline SVG
  feTurbulence noise + optional forged striations — PENDING his choice of step 3 vs 4.
  Cherry-vs-honey button PENDING: measured honey at only 1.95:1 against the grey page vs
  cherry 4.03:1, so cherry is the argued default WITH the rule that the button contrasts
  with whatever it sits on (honey on the claret hero).
  NEXT: slice 2 (cascade control — @layer + enqueue order + surgical de-!important) is the
  gate for everything after; then tokens. Owner asks O-2..O-9 still open (photography is
  the longest lead time). Touch targets (15-19 sub-32px per page) are slice 6/10.

- 2026-08-06 sprint 23 â€” DESIGN SLICE 2 FAILED, REVERTED, RE-DONE MINIMAL AS 2a.
  *** LESSON: UNLAYERED CSS OUTRANKS EVERY LAYER. ***
  Slice 2 (c10ea05) wrapped assets/darling.css in @layer ported + layers.css + token move.
  GATE FAILED: home@mobile 16 -> 45 defects (doc-overflow, 25 viewport-overflow, 5
  escapes-parent, 6 text-overflow); shop@mobile 17 -> 44; every viewport <=430px broke;
  money path returned ZERO shipping rates. REVERTED (283b845), re-verified clean.
  ROOT CAUSE: layering the vendored file gave style.css authority over it BUT dropped it
  below Twenty Twenty-Five's own UNLAYERED parent stylesheet, which it had been beating by
  source order. Tell-tale: sub-32px touch targets fell 15 -> 8 on DESKTOP â€” geometry moved
  on pages that should not have changed. The build plan's own gate criterion caught it.
  DO NOT retry layering until theme.json owns the tokens and the parent theme's unlayered
  contribution is neutralised.
  SLICE 2a SHIPPED (af9eab7): minimal + correct. functions.php enqueue INVERTED so
  darling.css prints first and style.css prints last (the one line behind every historic
  "SLICE n fix"); vendor !important stripped except html.darling-a11y, 69 -> 7. Both files
  stay UNLAYERED so the vendor keeps authority over the parent theme while losing it to us.
- 2026-08-06 sprint 24 — SLICE 2a GATE CONFIRMED PASS (the unread log from sprint 23).
  Read C:\Users\lora_\.darling-jobs\gate-2a-1785980919.log after the bridge returned.
  Result is IDENTICAL to the slice-1 baseline, i.e. the expected empty diff:
  zero genuine viewport-overflow / doc-overflow / text-overflow across all 36 page×viewport
  combos; escapes-parent = 1, account only, all six viewports (the alignfull group, slice-4
  container work); home@mobile 16 defects all small-target. MONEY PATH PASS — checkout
  renders, rates cheapest-first with „Спиди — до офис €4.42 / 8,64 лв." leading, all
  Bulgarian strings intact. (Bonus observed: the cart-dual watcher now also decorates the
  checkout shipping rates with лв. — unintended but correct.)
  So the cascade is now OURS: assets/darling.css prints first, style.css prints last, vendor
  !important down to 7 (html.darling-a11y only), no layering. af9eab7 STANDS — do not revert.
  REMINDER FOR SLICE 3+: do NOT reintroduce @layer until theme.json owns the tokens and the
  parent theme's unlayered contribution is neutralised. See the sprint-23 entry for why.

- 2026-08-06 sprint 25 — DESIGN SLICE 3 SHIPPED + GATED (commit 8485e78, deploy green).
  TOKENS. theme.json: settings.typography.fluid anchored 430px->1280px; 7 fluid fontSizes
  (x-small..xx-large) mirroring the spec's role-named ramp; settings.spacing.spacingSizes
  with the 9-step scale (was ABSENT entirely); layout contentSize 820px -> 43rem (a prose
  measure) and wideSize 1280px -> 90rem; h1/h2/h3 element roles bound to the scale with
  their own line-heights and families. WordPress generated the clamps correctly — verified
  in the live page's inline preset CSS.
  style.css: a :root token block PREPENDED (source of truth; theme.json mirrors it) with
  the 10-step type ramp, line-height/tracking set, and the 9-step space scale + band
  aliases. Then applied ONLY to role-bearing type — hero display, section titles, category
  H1, product title, price, eyebrows, lead measure (46ch, because Bulgarian runs 10-15%
  longer than English). Component-level sizes deliberately left for their own slices so
  any regression stays attributable.
  PRICE moved from Playfair to Inter 700 tabular-nums: it is a number, not an ornament,
  and tabular digits align down a grid.
  NEVER negative letter-spacing on Cyrillic below 40px — recorded in the token block.
  GATE PASS: zero genuine viewport/doc/text overflow across all 36 combos; account@mobile
  IMPROVED 17 -> 16 (its escapes-parent cleared at that width); money path PASS with
  „Спиди — до офис €4.42 / 8,64 лв." first and dual currency on the rates.
  HONEST CAVEAT: distinct font sizes did NOT drop (29 mobile / 33 desktop vs 28 before).
  Two reasons: (a) only role type was migrated — the ~30 component-level sizes are slices
  5/7/8; (b) the metric is polluted, since the ambient sparkles are text nodes with random
  8-22px sizes and the harness counts them. Do not treat this number as a KPI until the
  harness excludes .darling-ambient i.
  VISUAL (s3-home-desktop.png): section titles now share the left edge of the grids they
  label — the ~45px stagger that was the single most visible alignment defect is gone;
  hero display type has real presence; the category row shows six tiles instead of two cut
  off; footer columns and the full-width legal bar read correctly.
  STILL PENDING FROM KRIS (asked twice, not blocking slice 4/5): gold roughness step 3
  (grain) vs 4 (grain + forged); cherry-vs-honey as the button. Colour tokens are slice 6
  and are correctly blocked on the second one.
  NEXT: slice 4 (template surgery — give every band a container; the account alignfull
  escapes-parent lives here) then slice 5 (typography completion).

- 2026-08-06 sprint 26 — DESIGN SLICE 4 SHIPPED + GATED (commit e9f83b1, deploy green).
  *** FIXED A DEAD PRIMARY NAVIGATION. *** The desktop „Продукти" mega menu had not been
  opening at all. Cause: `.darling-nav ul{overflow-x:auto}` at style.css:113 — written for
  the v1 header so the nav could scroll horizontally on narrow screens. The v2 header rule
  at :478 restyles that same <ul> but never resets it, and per CSS spec, when overflow-x is
  not `visible` the computed overflow-y becomes `auto` too. The ~40px-tall nav bar was
  therefore a scrollport in BOTH axes and clipped its own absolutely-positioned dropdown to
  nothing. Fix: `.darling-header--v2 .darling-nav--pages, .darling-header--v2
  .darling-nav--pages > ul{overflow:visible}` + a stacking context on the header so the
  panel sits above the hero band. Verified rendering all 10 categories.
  *** METHOD LESSON, worth more than the fix: GEOMETRY LIES ABOUT CLIPPING. *** My probe
  reported the panel `visible:true` at its full 259×422, because getBoundingClientRect
  returns the LAYOUT box and ignores clipping by an ancestor's overflow. Only the
  screenshot showed it rendering nothing. Any future "is it visible" check must look at
  pixels, or at least walk ancestors for overflow — element.getBoundingClientRect() is not
  evidence of visibility.
  *** AND: ONE OF THE TWO AUDIT-CLAIMED BUGS DID NOT REPRODUCE. *** The "Woo filters mobile
  overlay leaks into page flow and covers the grid and footer" claim is NOT true as stated:
  probed at 390px the filters block is position:static, 319×21, sitting above the grid as a
  collapsed „Филтриране на продукти" trigger. What appears to cover the grid in a naive
  screenshot is the consent banner on a first visit, which is correct behaviour. Needs a
  click-through test before anyone acts on it. Agent findings are hypotheses until rendered.
  ALSO IN THIS SLICE: account alignfull escape fixed (an alignfull group measured 1412 >
  1344 parent inside a constrained <main>; alignfull is meant to escape, but not out of a
  container we set — the container now yields instead); and every band that sets its own
  width derives it from the same two tokens, so the shell edge is one site-wide value.
  GATE PASS: zero genuine overflow of any kind across all 36 combos; ESCAPES-PARENT NOW
  ZERO EVERYWHERE (was 1 on account at every viewport); every page 16 defects, all
  small-target; money path PASS with „Спиди — до офис €4.42 / 8,64 лв." first.
  NEXT: slice 5 (typography completion — migrate the ~30 component-level font sizes onto
  the scale) and slice 6 (colour semantics) — slice 6 is BLOCKED on Kris: cherry-vs-honey
  button, and gold roughness step 3 vs 4. Touch targets (16/page) are slice 6/10.

- 2026-08-06 sprint 27 — DESIGN SLICE 5 SHIPPED + GATED (commit fe27292, deploy
  31069375167 green). TYPOGRAPHY COMPLETION.
  This slice MIGRATED rather than appended. Slice 3 deliberately added a block at the
  bottom that put role-bearing type on the scale and left the component literals alone,
  so the file carried two vocabularies at once. All 78 literal font-sizes in style.css
  are now gone — replaced in place by the tokens — and every line-height and tracking
  value with them. There is no new override block; the file is smaller in vocabulary,
  not longer.
  TWO NEW ROLE TOKENS, both earned by the migration rather than invented up front:
  --fs-xl (20→22) is the rung the ramp was missing between --fs-lg (18→20) and
  --fs-section (21→28) — without it the header wordmark and the card price had nowhere
  to land; --fs-brand (24→32) exists because a wordmark is NOT part of the reading
  hierarchy, and the alternative was reaching for --fs-title and dragging a 40px serif
  into the footer. Naming them by role is what stops that.
  THE DUAL-CURRENCY COMPANION IS NOW A RATIO, NOT A SIZE. „/ 26,40 лв." had FIVE
  different declarations (.72em, .85em, .9em, 1em in the vendor, .95rem beside the PDP
  price) because each context re-guessed it. It now has exactly ONE font-size
  declaration site, `font-size:var(--bgn-ratio)`, and contexts set the VARIABLE
  (.6em beside a PDP price, .85em in the cart totals, .72em everywhere else). It is a
  proportion of the number it stands next to; expressing it as an absolute size was the
  bug behind every one of those five values.
  Deleted: the `@media (max-width:900px){.darling-header__logo{font-size:1.2rem}}`
  override. The brand token is fluid, so the breakpoint had nothing left to do — that is
  the point of the scale and it should keep deleting breakpoints as it spreads.
  VENDOR (assets/darling.css, owner-approved to edit): same migration for the text it
  owns — df-*/dff-* footer, dpt-* PDP trust, dcb-* banners, news, trust, semantic.
  DELIBERATELY LEFT AS px: the decorative star glyphs (.s1–.s5, .dff-s), the ornament
  pseudo-elements, the a11y-mode 17px body and the 22px a11y button icon. Those are
  ornament geometry, not type, and putting them on a reading scale would be cargo cult.
  *** HARNESS: I FIXED A METRIC THAT COULD NOT FALL. *** tests/design-audit.spec.js
  counted every text node on the page, and the ambient sparkle layer GENERATES text
  nodes at random 8–22px sizes — one distinct size per star. So "distinct font sizes"
  was unfalsifiable: no stylesheet change could ever move it. The census now excludes
  .darling-ambient and REPORTS the number of excluded elements rather than hiding the
  exclusion. Measured on home@desktop, both ways, so the before/after is honest:
  with the old polluted method 33 (slice 3) → 24 (now); with the fixed census, 14.
  The sparkles alone were exactly 10 of the old number (10 stars, 10 sizes).
  Fourteen is a real vocabulary: 11/12/13/14/15/17/20/22/26/28/30/60 plus two em-derived
  companions.
  GATE PASS, and the defect table is IDENTICAL to the slice-4 baseline page for page —
  16/17/17/19/16/16 at mobile, 16/15/15/19/16/16 at desktop, all small-target, zero
  viewport-overflow, zero doc-overflow, zero escapes-parent, zero text-overflow across
  all 36 combos. Money path PASS: „Спиди — до офис €4.42 / 8,64 лв." first, cheapest
  first, all eleven checkout i18n checks green.
  CORRECTION TO MY OWN SPRINT-26 ENTRY: I wrote "every page 16 defects". That was
  sloppy — the slice-4 log shows 16/17/17/19/16/16. The product page's extra three are
  the five 24×24 review-rating stars; it has been 19 since before slice 4. Nothing
  regressed, but a status doc that rounds its own numbers is worth less than one that
  does not.
  VISUAL (s5-home-desktop/mobile, s5-product-desktop): hierarchy holds at both ends —
  display → section → body reads as three clearly different things at 390 as well as
  1440, which is where it was collapsing before slice 3.
  NOTED, NOT FIXED (they belong to later slices, listed so they are not rediscovered):
  the PDP price still renders Playfair because .darling-product__price predates the D3
  rule that moved prices to Inter tabular — resolve in slice 6 when colour/price
  semantics land; the reviews form is still raw WP comment markup and the Stripe „Link"
  button is still an off-brand green slab (state primitives / component slices).
  NEXT: slice 6 (colour semantics) is STILL BLOCKED on Kris — cherry-vs-honey as the
  button, and gold roughness step 3 (grain) vs 4 (grain + forged). Asked three times
  now; everything else in the palette is locked and encoded. If it stays blocked I take
  slice 7 (product card) next, which needs no colour decision.

- 2026-08-06 sprint 28 — DESIGN SLICE 7 SHIPPED + GATED (commits 095c89e, 1a11538,
  9b93332; deploys green). THE PRODUCT CARD, ONCE.
  *** THE CARD'S ADD-TO-CART STYLING HAD NEVER APPLIED, SINCE THE DAY IT WAS WRITTEN. ***
  Both rules selected `.wp-block-woocommerce-product-button a`. WooCommerce renders a
  `<button>`. The only `<a>` in that block is Woo's hidden „Преглед на количката" link,
  which is why my earlier probe measured a 0×0 element and told me nothing. So the
  button kept Woo's own `padding:16px 36px`, which ate 72px of a 244px card and wrapped
  „Добавяне в количката" onto THREE lines in every card at every viewport. The most-used
  entry to the funnel was a three-line blob because of a tag name. It is now one line,
  44px tall, at all six viewports — 189×44 phone, 200×44 desktop.
  ALSO FIXED, each measured on the live site before it was touched:
  • `auto-fill` → `auto-fit` + `justify-content:start`. auto-fill reserves phantom
    tracks, which is why the home „Изборът на Lady D" band rendered one 248px card
    marooned in a five-track 1344px row. It is now a 352px card at the shell edge.
  • *** A REGRESSION OF MINE, FROM SLICE 3. *** The archive body computed
    `max-width:688px` inside a 1344px `<main>`. 688px is 43rem — the theme.json
    contentSize I set in slice 3 and described in my own status note as "a prose
    measure". The columns block inherited it, so the entire archive, sidebar included,
    was rendering at prose width. The shop grid was 310px wide at 1440. Fixed by giving
    `<main>` its own declared `contentSize:90rem`.
    FIRST ATTEMPT WAS WRONG AND THE GATE CAUGHT IT: I marked the columns block
    `alignwide`, which works, but WordPress gives aligned children negative margins so
    they can span the root padding — and the page then overflowed by exactly one gutter
    (39px at 390, 45px at 430) on every phone. Declaring the measure is the honest fix;
    aligning was a trick.
  • `-webkit-line-clamp` on the `<h2>` did NOTHING. Core renders the linked post title
    as an inline-block `<a>`, which is a single inline-level box to its parent, so the
    heading saw one line box and clamped nothing. A 78-character Bulgarian product name
    still ran to four lines. The clamp belongs on the anchor. Caught by the gate, not by
    reading the CSS.
  • `box-sizing` on the placeholder image. An `<img>` is a replaced element and does not
    inherit the border-box default, so the 22% padding I added to quieten Woo's grey
    slab was added OUTSIDE its 249px width and pushed every phone page 39px wide.
  • `.wc-block-product-template` (related products on the PDP) is matched by nothing in
    either stylesheet — confirmed. Styled anyway. It renders empty today because the
    catalogue has one product; a component that is only correct when it has no content
    is not correct.
  • The home cards used `post-featured-image` and the archive cards used
    `woocommerce/product-image`, so a product with no photo rendered NO media box on the
    home page and a placeholder on the shop page. Unified on the Woo block.
  • `post-title` lost `fontSize:"small"`. Core prints preset size classes with
    `!important`, so the card title could not be restyled from CSS at all.
  • theme.json `letterSpacing:0`. Twenty Twenty-Five sets **-0.1px globally** — negative
    tracking on Cyrillic, which is the one thing my own token block explicitly forbids.
    It was on every glyph on the site, not just cards.
  THE MECHANISM: the card is now a query container (`container-name:card`) and sizes
  itself from ITS OWN width. That is how one component stays correct in the shop grid,
  the five-up home row, the list view and the related strip without any of them knowing
  about each other. The title is two-line clamped with a RESERVED height, so prices and
  buttons line up across a row whatever the name length.
  GATE — tests/product-card-gate.spec.js, committed. It does not test the card against
  the one product we have; it CLONES the real card and feeds it what a 10 800-product
  Barsy catalogue will actually contain: a 4-character name, a 78-character name, a
  portrait image, a landscape image and no image, across six viewports. PASS: CTA one
  line and ≥44px in all 42 card instances; every title exactly 2 lines; price and CTA
  rows aligned within 2px; card widths uniform; zero document overflow. Design audit
  IDENTICAL to the slice-4/5 baseline page for page (small-target counts did not rise).
  Money path PASS, „Спиди — до офис €4.42 / 8,64 лв." first.
  CARD CTA COLOUR DELIBERATELY UNCHANGED. The build plan wants an outlined pill; fill
  vs outline is downstream of Kris's open cherry/honey decision and belongs to slice 6.
  This slice changed geometry only, so any conversion effect is attributable.
  HONEST OPEN ITEMS FROM THIS SLICE (not swept):
  • The CTA renders 200px centred rather than filling the card, despite `width:100%` on
    both the wrapper and the button. It looks right and it is stable at every viewport,
    so I shipped it — but I do not yet know why, and an unexplained gap between declared
    CSS and rendered result is exactly what burned me on the mega menu. Slice 12.
  • The archive still reserves 250px for a filter rail holding one collapsed trigger,
    AND applies WordPress global padding twice (once on `<main>`, once on the query
    div), so the shop grid is 870px of a 1344px shell and shows two columns where it
    should show four. Both belong to slice 8 (archive + filters).
  NEXT: slice 8 (archive, filters, empty states) — it has no colour dependency either.
  Slice 6 remains BLOCKED on Kris: cherry-vs-honey button, gold roughness step 3 vs 4.
  SLICE 7 COMPLETION (same sprint, commit 75b7c46, deploy green): the nudge asked for a
  card that is correct "in the drawer, the grid, the related row and the 404 row AT
  ONCE", so I checked the contexts I had not rendered. Three templates were still
  outside the contract — 404.html („Открий нещо ново"), search.html and
  product-search-results.html — each still carrying `post-featured-image` (so a product
  with no photo rendered NO media box and sheared the row) and `fontSize:"small"` (so
  the card title could not be styled at all, core printing preset sizes with
  !important). Fixed. VERIFIED RENDERED at 390 and 1440 on both the 404 page and product
  search: container-type inline-size, clamp 2 on the anchor, 46.8/52px reserved title
  height, 1:1 media box, CTA 200×44 on one line, justify-content:start.
  DELIBERATE ASYMMETRY, recorded so nobody "fixes" it later: generic search.html keeps
  the CORE featured-image block, because that query inherits and can return pages and
  posts, where WooCommerce's product-image block renders nothing. 404 and Woo's own
  product-search template query products only, so they get the Woo block and its
  placeholder. The cart drawer is NOT a card context — it has its own
  `.darling-cart__item` markup and stays that way.

- 2026-08-06 sprint 29 — DESIGN SLICE 8 SHIPPED + GATED (commits 8488438, 583a7ad,
  d400b15; deploys green). ARCHIVE, FILTERS, EMPTY STATES.
  HEADLINE NUMBER: the shop grid went from **870px to 1248px** of a 1344px shell at
  1440. Two causes, both measured, neither guessed:
  • THE ARCHIVE SHELLED ITSELF TWICE. `<main class="darling-archive">` carries
    WordPress global padding (48px a side at 1440) and then `.darling-grid` applied our
    own `--d-gutter` again. 96px of the product grid was padding nobody asked for.
    `.darling-grid` is a top-level BAND on the home page, where it correctly owns the
    shell, and a nested CHILD in the archive, where main already owns it.
  • THE FILTER RAIL RESERVED 250px FOR AN ELEMENT 0px TALL. Probed: the whole rail
    contains ZERO inputs. `wc-block-product-filters` renders an empty overlay dialog and
    a `display:none` trigger; `.wp-block-woocommerce-product-filter-price` exists at
    220×0 with nothing inside it; the stock-status filter renders nothing at all. With
    one product there is nothing to filter. The rail is now collapsed by a `:has()`
    guard and comes back on its own when real controls render.
  *** THREE THINGS I GOT WRONG FIRST, ALL CAUGHT BY RENDERING, NONE VISIBLE IN A DIFF: ***
  1. `:has()` MAY NOT BE NESTED INSIDE `:has()`. I guarded the empty related-products
     heading as a sibling — `.darling-section-title:has(+ .related:not(:has(li)))` — and
     the browser DROPPED THE WHOLE RULE as an invalid selector. Silently. The companion
     rule `.related:not(:has(li))` worked, because `:has()` inside `:not()` is legal, so
     the block vanished while its heading kept standing over nothing — which looked like
     a partial fix rather than a broken one. The template now wraps heading and block
     together so a single un-nested `:has()` hides both.
  2. THE FILTER GUARD KEYED ON THE WRONG THING. Testing for the presence of
     `.wp-block-woocommerce-product-filter-price` never fired, because that element IS in
     the DOM — just empty. Re-keyed on a real control (`input`, `select`, checkbox list,
     chips). A filter with no control is not a filter.
  3. THE PLAN'S OVERLAY FIX DOES NOT EXIST IN THIS WOOCOMMERCE. It said to set the filter
     block's `overlay` attribute to `never` in the template. I read `block.json` on the
     box: `woocommerce/product-filters` in WooCommerce 10.9.4 declares exactly ONE
     attribute, `isPreview`. Writing `"overlay":"never"` would have been a silent no-op
     that I would have recorded as done. Defensive CSS does the job instead and does not
     depend on an API that may not be there. *** The build plan is a hypothesis document,
     not a spec — this is the second slice where one of its steps did not survive contact
     with the running site. ***
  ALSO CLOSED — THE SLICE-7 CTA MYSTERY, ANSWERED PROPERLY. The card button rendered
  200px centred despite `width:100%`. I asked the engine instead of theorising (CDP
  `CSS.getMatchedStylesForNode`): WooCommerce ships
  `.wp-block-button.wc-block-components-product-button .wp-block-button__link{width:auto}`
  at specificity (0,3,0); mine was (0,2,1). It was a specificity fight, not a source-order
  one — and the enqueue inversion from slice 2a is intact (our two stylesheets print after
  woocommerce-general and TT5; only wc-stripe's checkout CSS follows us). Won by matching
  their selector shape, NOT with `!important`, which is how this file got into trouble in
  the first place. The CTA now fills its card: 288px at 390, 322px at 1440.
  EMPTY STATES. A category with nothing in it is a NORMAL state for a shop still
  importing 10 800 products, so it should read as „not yet", not as „broken": bow motif
  (the footer's own mark, floating), one line of Playfair „Тук още е празно, darling.",
  one honest sentence about the 4 590 still travelling from Свищов, one CTA. Same
  treatment for both search templates. „Може да ви хареса" no longer stands above 200px
  of nothing on every product page.
  GATE: product-card gate PASS (42 synthetic card instances, long Bulgarian names and
  mixed aspect ratios — CTA one line and ≥44px everywhere, every title exactly 2 lines,
  rows aligned within 2px); design audit IDENTICAL to the slice-4/5/7 baseline page for
  page, zero overflow of any kind, small-target counts unchanged; money path PASS with
  „Спиди — до офис €4.42 / 8,64 лв." first. Verified rendered: rail collapsed at 390/768
  /1440, grid 312/614/1248, related wrapper display:none, empty category renders the new
  card.
  NEXT: slice 9 (footer). It has no colour dependency, and it is where the 15–19
  small-target defects per page actually live — every one of them is a footer link. That
  number has not moved since the audit began; slice 9 is what moves it.
  SLICE 6 STILL BLOCKED ON KRIS, asked five times now: cherry-vs-honey as the button
  colour, and gold roughness step 3 (grain) vs 4 (grain + forged).

- 2026-08-06 sprint 30 — DESIGN SLICE 9 SHIPPED + GATED (commits 892ef2b, 345e824,
  fb5da7e; deploys green). THE FOOTER — AND THE TOUCH-TARGET NUMBER FINALLY MOVED.
  *** ZERO DEFECTS ACROSS ALL 36 PAGE × VIEWPORT COMBINATIONS. *** Every page had
  carried 15–19 sub-32px targets since the design audit began and the count had not
  moved through five slices. It is now 0, everywhere, alongside the zero overflow /
  zero escapes-parent / zero text-overflow that slices 1–8 established.
  HOW, WITHOUT MOVING THE GOALPOSTS. I named all sixteen targets on /pomosht/ with
  their DOM paths before touching anything, and they split cleanly:
  • ELEVEN WERE REAL, all in the footer, all fixed at the source: five `.df-links`
    nav links at 25px, four `.df-policies` links at 17px, the Google Maps link and
    „Правила и условия" in the legal bar. All now carry a 44px hit area.
  • FIVE WERE NOT DEFECTS AND NEVER WERE. WCAG 2.5.8 exempts a target that is „in a
    sentence or block of text": the tel:/mailto: links inside the address block, links
    inside FAQ sentences, and the screen-reader skip link (1×1 until focused, full size
    when focused). Padding those to 44px would wreck the address block and the prose to
    satisfy a rule that does not apply to them. The harness now counts them as
    `inline_exempt` — EXCLUDED AND COUNTED, never silently dropped, same discipline as
    the scroller / third-party / offscreen families in slice 1. The test is whether the
    parent element contains text of its own besides the link, which is the standard's
    own wording rather than a convenient list.
  • Then three more, each named rather than rounded away: the card title link was
    322×26 for a one-line product name (it now fills the two-line box the heading
    already reserves — no visual change, because the box was reserved either way); the
    five 24×24 review rating stars (raw WordPress comment markup — the reviews form is
    still unstyled and belongs to a later slice, but the hit area did not need to wait);
    and „Изгубена парола?" at 124×17 on the account page.
  `.df-policies` WAS A `<p>` WITH `<br>` SEPARATORS. That is why four navigation targets
  were 17px tall and could not be padded without wrecking the line box. It is now a
  `<nav>` with block anchors, keeping the same class — the ported stylesheet's contract
  is the CLASS, not the tag, which is the sprint-9 lesson applied rather than relearned.
  PURGED: the entire v1/v2 `.darling-footer__*` / `.dhl-word` /
  `.darling-foot-flair--brand` vocabulary — 44 lines. Every family was verified absent
  from templates/, parts/ and *.php first. Also removed the two shorthand footer
  paddings the new rules supersede, so footer spacing has ONE declaration site instead
  of two that must be read in the right order. Dead CSS is not neutral; it is a rule
  waiting to win an argument it should not be in.
  FOOTER GEOMETRY: it now takes the same shell as everything else. At 1920 its outer
  columns were 758px each holding 137px of links and 216px of address — the „flexboxes
  not flexing" complaint in its purest form. Footer rhythm moved onto the space scale in
  BOTH stylesheets (11 literals in the vendor file).
  GATE: design audit 0/36 defects of every type; product-card gate PASS (42 synthetic
  instances, long Bulgarian names, mixed aspect ratios); money path PASS with
  „Спиди — до офис €4.42 / 8,64 лв." first. Footer verified rendered at 390/768/1440/1920.
  OBSERVED, NOT FIXED (recorded so they are not rediscovered): the footer's two link
  groups have different treatments — `.df-links` plain, `.df-policies`/`.df-map` cherry
  and underlined — which is a colour/state decision, slice 6/11. And the fixed
  accessibility button can overlap the last footer link at 390; it floats over
  everything by design (the consent card was already lifted to bottom:78px for the same
  reason), so it is a motion/overlay-layer question, not a footer one.
  NEXT: slice 10 (header) — no colour dependency. SLICE 6 STILL BLOCKED ON KRIS, asked
  six times: cherry-vs-honey as the button colour, gold roughness step 3 (grain) vs 4
  (grain + forged).

- 2026-08-06 sprint 31 — DESIGN SLICE 10 SHIPPED + GATED (commits 9bcf26d, f0007d3;
  deploys green). THE HEADER.
  *** THE HEADER HAS NEVER ACTUALLY BEEN STICKY — AND THERE WERE TWO CAUSES, WHICH I
  ONLY FOUND BECAUSE I RE-MEASURED AFTER FIXING THE FIRST ONE. ***
  (1) Slice 4 added `.darling-header--v2{position:relative;z-index:20}` purely to make a
  stacking context for the mega dropdown. Being later in the file at equal specificity,
  it replaced the `position:sticky` on `.darling-header`. Measured: computed position
  `relative`, header top at −639px after a 900px scroll.
  (2) FIXING THAT CHANGED NOTHING. Re-measured with sticky restored: still −636px. A
  sticky element can only travel inside its own containing block, and `.darling-header`
  sits inside `<header class="wp-block-template-part">` — a wrapper exactly as tall as
  the header itself. Zero travel. The sticky belongs on the WRAPPER, whose parent is the
  whole page, and the stacking context comes with it. Now verified: after scrolling
  900px, wrapper top 0 and header top 0 at both 390 and 1440.
  The lesson is the second half: the first fix was necessary and not sufficient, and
  that is invisible unless you re-run the measurement instead of trusting the diff. I
  would have shipped „sticky restored" and been wrong.
  ALSO FOUND: *** THE SEARCH FIELD HAD NO FOCUS INDICATOR AT ALL. *** The input sets
  `outline:0` so the ring does not cut across the rounded pill, and nothing ever put one
  back — a keyboard user tabbing through the header could not see where they were. The
  ring now lives on the pill via `:focus-within`, which is where it belongs.
  REMOVED THE CAUSE, NOT THE SYMPTOM: `.darling-nav ul` no longer sets `overflow-x` at
  all. The v1 header let that list scroll horizontally on narrow screens; the v2 header
  hides it below 900px and hands over to the drawer, so the mechanism had no job — but
  it clipped the mega menu's own dropdown to nothing for weeks until slice 4 reset it.
  Keeping a cause plus its reset is worse than keeping neither, so both are gone.
  PURGE CHECK RAN, AND CAME BACK NEGATIVE — worth recording. I verified all eighteen
  header/drawer class families against templates/, parts/, *.php and assets/*.js, the
  same check that made the slice-9 footer purge safe. Unlike the footer, the header
  vocabulary is LIVE: the v2 header reuses the v1 element class names, so there was
  nothing to delete except the logo's bow and star rules, which have no markup left to
  style. A purge you decline after checking is as much a result as one you perform.
  STATES: one rule per state instead of one per pseudo-class scattered down the file.
  Header icons, mega links and drawer links now carry `:hover` AND `:focus-visible`
  together. Header icons went 38.4px → 44px — they are the account and basket entries
  and the smallest thing a thumb has to hit up there. Mega and drawer links got 44px rows.
  GATE: design audit HELD AT ZERO defects across all 36 combos (the standing bar, and a
  regression would have been a failure); product-card gate PASS; money path PASS. Mega
  menu verified opening BY SCREENSHOT at 1440 — ten category rows rendering above the
  hero band — not by geometry, per the sprint-26 lesson. Sticky verified by scrolling and
  re-measuring, not by reading the rule.
  HONEST NUMBER, AS ASKED: the distinct-spacings census moved 45 → 43. That is a small
  move and I am not going to dress it up. The header's own literals are gone, but the
  census counts every element on the page, and what remains lives in WooCommerce's own
  block CSS, the checkout surfaces, and the components that have not had their slice yet.
  It will not fall meaningfully until those are covered — it is a slice-13/14 metric, not
  a slice-10 one.
  NEXT: slice 11 (state primitives — buttons, inputs, focus rings, loading and error
  states as one vocabulary) has no colour dependency for its structure, though its
  final colours land in slice 6.
  SLICE 6 STILL BLOCKED ON KRIS, asked seven times: cherry-vs-honey as the button
  colour, gold roughness step 3 (grain) vs 4 (grain + forged).

- 2026-08-06 sprint 32 — DESIGN SLICE 11 SHIPPED + GATED (commit 90d1d31, deploy green).
  STATE PRIMITIVES — ONE FOCUS RING, MEASURED BY ACTUALLY PRESSING TAB.
  METHOD FIRST, because it is why this found anything: I walked the money path with
  `keyboard.press('Tab')` and read `document.activeElement` at every stop, rather than
  calling `.focus()`. Programmatic focus does not reliably set `:focus-visible` on
  buttons, so the cheap version of this test would have reported healthy rings on
  controls that show none to a real keyboard user. Ring contrast was computed against
  each control's ACTUAL backdrop — walking up for the first non-transparent background —
  not against an assumed page colour.
  WHAT IT FOUND, before any change:
    checkout inputs    2px honey-light on white    1.56:1   FAIL
    checkout selects   3px honey on white          2.12:1   FAIL
    shop add-to-cart   cherry ring on cherry fill  1.00:1   INVISIBLE
    address toggle     honey on white              1.98:1   FAIL
    nav / links        cherry on cream             3.2–4.7  pass
  WCAG 1.4.11 asks 3:1 for non-text UI. Four of six families failed. *** And two more
  had NO FOCUS INDICATOR AT ALL: the VAT-invoice fields and — worse — the COURIER
  PICKER's city and office selects, both setting `outline:none` with only a border
  tint. *** Those are on the checkout, and choosing an office is a step a Bulgarian COD
  customer cannot skip. A keyboard user had no way to see where they were in it.
  THE FIX IS ONE PRIMITIVE, AND IT IS TWO RINGS. No single colour passes 3:1 against
  every surface this site puts a control on — that is the whole reason six different
  treatments existed. So: a cream halo hugging the control and a cocoa outline outside
  it. On a pale surface the cocoa carries it (13:1); on a cherry or cocoa button the
  cream halo does (4.4:1). Six scattered treatments collapse to one. The per-surface
  rules that survive only TINT the border so a field still reads as active where a ring
  is clipped; they no longer pretend to be the indicator.
  WHY IT WAS SAFE TO PUT THIS ON THE CHECKOUT: neither `outline` nor `box-shadow`
  participates in layout. That was the design constraint, not a happy accident.
  GATE — the strictest of the design pass, as the risk deserved:
  • CHECKOUT GEOMETRY: I recorded a baseline of the shipping control, every rate row's
    label and box, the payment options, the courier picker, the totals panel and the
    Place Order button at 390 and 1440 BEFORE touching anything, then diffed after.
    Result: UNCHANGED — zero differences at either width.
  • Focus sweep after: every ring problem gone except three Stripe iframes, whose focus
    is rendered inside third-party documents our CSS cannot reach. Named, not hidden.
  • Design audit HELD at 0 defects across all 36 combos; product-card gate PASS; money
    path PASS with „Спиди — до офис €4.42 / 8,64 лв." first.
  • Evidence: s11-focus-cta-1440.png shows the halo+outline on the cherry pill that
    previously had an invisible ring.
  DELIBERATELY NOT DONE — a scope call, recorded so it is not read as an oversight. The
  button primitive was NOT pushed into WooCommerce's checkout buttons. Making Place
  Order reference our `.d-btn` changes its padding and radius, which is a checkout
  geometry change, and this slice's own gate says revert rather than argue if checkout
  geometry moves. Buttons unify in slice 6, where the cherry/honey decision lands and
  the checkout absorbs one change instead of two. Same reasoning for input resting
  styles: focus is unified everywhere; resting borders stay as they are on checkout.
  NEXT: slice 12 (motion) — reduced-motion correctness, the hover-shadow repaint cost on
  card grids, and the mega menu's `transition:all`. No colour dependency.
  SLICE 6 STILL BLOCKED ON KRIS, asked eight times: cherry-vs-honey as the button
  colour, gold roughness step 3 (grain) vs 4 (grain + forged).

- 2026-08-06 sprint 33 — DESIGN SLICE 12 SHIPPED + GATED (commit 93e6e87, deploy green).
  MOTION.
  VERIFIED BY RENDERING WITH `prefers-reduced-motion` EMULATED, not by reading the media
  query: `newContext({reducedMotion:'reduce'})` across home, shop and product, then
  asking every element its computed `animationName`.
  *** THE REDUCED-MOTION STORY WAS ALREADY CORRECT, AND SAYING SO IS PART OF THE JOB. ***
  Zero animations under reduce on all three pages, and the ambient sparkle layer is not
  merely paused but ABSENT — ambient.js returns a zero budget and never inserts it. Had
  I not measured, I would have „fixed" something that was already right and reported it
  as progress.
  TWO REAL FINDINGS:
  1. *** THE SPARKLES WERE ANIMATING ON THE CHECKOUT. *** Measured on the live page:
     `darling-amb 9.54s`, one animation per star, indefinitely. A customer entering an
     address and choosing a courier does not need decoration moving in their peripheral
     vision, and a page whose job is a transaction should not spend frames on
     atmosphere. Cart, checkout and order-received now opt out through the SAME
     zero-budget path reduced-motion uses — one mechanism, not two. Re-measured after:
     checkout has the ambient layer ABSENT and ZERO animations of any kind; home still
     has its 9 stars.
  2. `transition:.18s` IS `transition-property:all`. Three of our own buttons carried it.
     It works today, but it means any property added to those rules later — including a
     layout one — silently starts animating. Named properties now. After the change the
     only `transition:all` left anywhere under no-preference is WooCommerce's own
     product-gallery wrapper, which is not ours.
  CARD HOVER: the lift shadow moved to a pseudo-element whose OPACITY transitions,
  instead of a box-shadow whose blur radius transitions. A 26px blur is rasterised by
  the compositor; animating the shadow asks for a re-raster every frame and a category
  page will hold twenty of these, while fading an already-painted shadow is a
  composite-only change. *** I HAVE NOT MEASURED FRAME TIMINGS — headless Chromium here
  gives no number I would trust — so this is justified on the rendering model, not on a
  benchmark I do not have. *** Saying „faster" without a measurement would be a claim,
  not a result.
  CORRECTION TO MY OWN SLICE-10 NOTE: I recorded that `.darling-mega` computes
  `transition:all` and implied it was sloppy. It computes `transition-property:all` with
  duration ZERO — the CSS initial value. The mega menu has no transition at all. Nothing
  to fix; I had read a default as a defect.
  HARNESS NOTE FOR WHOEVER READS THE JSON NEXT: under `reducedMotion:'reduce'` every
  element reports `transition:all 1e-06s`. That is the platform's own „make transitions
  instant" rule, not a defect, and it swamps the census. Do not chase it.
  GATE: design audit HELD at 0 defects across all 36 combos; product-card gate PASS;
  money path PASS; and the slice-11 checkout geometry baseline re-diffed **UNCHANGED**
  at 390 and 1440 — the same recorded numbers, not a fresh eyeball. Focus rings still
  clean except the three Stripe iframes.
  MEASURED BUT NOT ACTED ON, stated rather than buried: the CART page still has three
  animations — `dhv-tw` (footer star twinkle), `darling-float` (footer bow) and `dc-in`
  (the consent card's one-time entrance). Those are site chrome present on every page
  rather than cart decoration, and the checkout itself measures completely still. If the
  rule is „the whole money path is still" rather than „the transaction page is still",
  the footer flair should be suppressed on cart too — that is a judgement call for Kris,
  not something to decide silently.
  NEXT: slice 13 (the PDP — reviews form, gallery, tabs, the Stripe „Link" slab) has no
  colour dependency for its structure.
  SLICE 6 STILL BLOCKED ON KRIS, asked nine times: cherry-vs-honey as the button colour,
  gold roughness step 3 (grain) vs 4 (grain + forged).

- 2026-08-06 sprint 34 — DESIGN SLICE 13 SHIPPED + GATED (commits b683439, ddee933;
  deploys green). THE PRODUCT PAGE'S UNFINISHED HALF.
  CHECKED assets/darling.css FIRST, as the house rule requires. It has NO vocabulary for
  reviews, comment forms, wc-tabs, rating stars or the gallery lightbox. Nothing to
  conform to — that is the answer to the check, not a reason to have skipped it.
  MEASURED ON THE LIVE PDP BEFORE WRITING ANYTHING:
  • The review textarea computed `font-family:monospace`, `padding:2px`, `border:1px
    solid #767676`. Browser defaults, untouched since the day the theme was made.
    *** A Bulgarian customer writing a review was typing into Courier. ***
  • Name and email inputs: `border:2px inset`, `padding:1px 2px`, Arial, 247×21px.
  • The tabs: #E9E6ED grey-lilac inactive, #CFC8D8 borders — WooCommerce's own chrome,
    in a lilac this palette does not contain anywhere else.
  • The submit button was ALREADY branded (cherry pill) because theme.json styles
    `wp-element-button`. So the form was half-dressed, which reads worse than untouched.
  *** THE STRIPE „Link" BUTTON IS NOT STYLEABLE FROM HERE, AND I AM NOT PRETENDING
  OTHERWISE. *** `#wc-stripe-express-checkout-element-link` is a `div.StripeElement`
  whose content is an IFRAME served from js.stripe.com; the green fill lives inside that
  document. No rule in this stylesheet can reach it — appearance would have to come from
  the Stripe plugin's own appearance API, which is a backend change, not a theme one.
  What I did instead is place it deliberately: a quiet „или плати бързо с" divider above
  it so it reads as an intentional alternative rather than a loose slab, and its width
  constrained to the buy column. Shipping a rule that silently does nothing would have
  been worse than leaving it alone, and I would not have known without measuring.
  *** TWO SPECIFICITY LOSSES THAT ONLY THE RENDER CAUGHT. *** The first deploy looked
  half-applied, so I asked the engine which rule won (CDP `getMatchedStylesForNode`)
  rather than guessing:
  • WooCommerce ships `.woocommerce div.product .woocommerce-tabs ul.tabs li` at (0,4,3);
    my rule was (0,3,2) and lost — a lilac tab sitting next to a vanilla one.
  • Woo styles the review panel with TWO IDs, `.woocommerce #review_form #respond`
    (2,1,0), so a class-based rule could never dress it. Only `max-width` and
    `border-radius` survived — which is exactly why the first render showed the right
    WIDTH and no card, a symptom I would have misread as „nearly working".
  Both fixed by matching their selector shape and adding one step, NOT by `!important`.
  That distinction is the whole reason slice 2a exists.
  GATE: design audit HELD at 0 defects across all 36 combos; product-card gate PASS;
  money path PASS; the slice-11 checkout geometry baseline re-diffed **UNCHANGED** at
  390 and 1440; focus rings still clean except the three Stripe iframes. PDP verified
  rendered at 390/768/1440 — the review form is now a white card on the sand border with
  real inputs and a proper checkbox row, and both tabs sit on the site's own surface with
  a cherry underline on the active one.
  NOT TOUCHED, DELIBERATELY: `.woocommerce-product-gallery__wrapper` keeps WooCommerce's
  `transition:all 0.5s`. It is the last `transition:all` on the site and it is not ours;
  nothing on the PDP changes a property it would animate, so overriding it would be
  noise in the diff for no rendered difference.
  NEXT: slice 14 (the experience layer and the purge) is the last structural slice, and
  it is also where the distinct-spacings census finally has to move or be admitted as
  unmovable.
  SLICE 6 STILL BLOCKED ON KRIS, asked ten times: cherry-vs-honey as the button colour,
  gold roughness step 3 (grain) vs 4 (grain + forged).

- 2026-08-06 sprint 35 — DESIGN SLICE 14 SHIPPED + GATED (commits c4f14df, ca1788d;
  deploys green). *** THE LAST STRUCTURAL SLICE OF THE DESIGN PASS. ***

  1. THE PURGE — VERIFIED TWO WAYS, AND MOSTLY DECLINED.
  Extracted all 158 class families from style.css, then tested each against BOTH our
  source (templates/, parts/, *.php, assets/*.js) and the RENDERED DOM of thirteen
  surfaces — home, shop, category, EMPTY category, product, account, page, kontakti,
  blog, search, 404, cart and checkout, with both drawers forced open so their markup
  was present. Source grep alone would have been wrong: WooCommerce emits classes our
  templates never mention, and deleting those breaks surfaces we do not author.
  DELETED (absent from both): `.darling-card` / `.wc-block-grid__product` /
  `ul.products li.product` (the pre-blocks card), `.darling-crumbs` (breadcrumbs were
  dropped deliberately in slice 8), `.darling-hero__eyebrow` and its hero override.
  *** DECLINED AFTER CHECKING, which is as much a result: *** every other suspect on the
  list survived. `.darling-blog__*` renders when a post exists; `.darling-cart__*` and
  `.darling-cart-trust` are drawn by JS into an open drawer; `.darling-grid--list` is
  added on click; `.darling-pagination` needs >24 products; `.darling-form-notice*` are
  contact-form states; `.woocommerce-MyAccount-*` and `.woocommerce-Address*` only exist
  when LOGGED IN — my crawl was logged out, and deleting on that evidence would have
  stripped the account dashboard. `.darling-a11y` is a state on <html>. Recording the
  declines matters more than the deletions: the next person to run this check should not
  redo the reasoning.

  2. THE DISTINCT-SPACINGS CENSUS — IT WAS OURS, AND IT MOVED.
  The metric had gone 47 → 45 → 43 across the whole design pass and never really fell.
  Rather than assert why, I attributed every distinct spacing value on the page to the
  element carrying it. The answer: the survivors were OUR OWN component literals —
  `.darling-hero`, `.darling-catsv2__row`, `.darling-trust`, `.darling-news`,
  `.darling-pdp-trust`, the 404, the archive toolbar, the consent card — expressed as
  0.2/0.35/0.55/0.85/1.1/1.3/2.2/3.4rem and so on, i.e. eighteen ad-hoc rem values that
  no slice had owned. Not WooCommerce's, not the parent theme's. Mine.
  69 declarations moved onto the scale. MEASURED RESULT: home 43 → **33**, shop 33 →
  **27**, product 42 → **35**. That is the first real fall in this number since the pass
  began.
  SCOPE DISCIPLINE: an explicit DENY list kept the sweep off the cart drawer, the
  shipbar, the courier picker and the VAT-invoice fields. `dc-` prefixes BOTH the consent
  card and the courier controls, and the courier controls are on the checkout — a
  prefix-based sweep without that deny list would have quietly repadded the checkout.
  HONEST CAVEAT: the allowlist leaked slightly. My block regex captures the comment above
  a rule as part of its selector text, so two blocks (`.darling-home`, `.darling-empty`)
  were rewritten because a NEARBY COMMENT matched the allow pattern. The changes are the
  same token substitutions and are harmless — `padding:0 1rem` → `0 var(--space-xs)`,
  16px → 15px — but the mechanism was sloppier than I intended and is worth knowing if
  anyone reuses the script. The deny list was matched the same way and still held.
  Also changed by the sweep and worth naming: the PDP's classic add-to-cart button
  padding, 13.6/25.6px → 15/20px. It is a money-path entry point, not part of the
  checkout geometry baseline, and it re-gated clean.

  3. VIEW TRANSITIONS — ASSESSED AND DELIBERATELY NOT SHIPPED.
  Cross-document view transitions need `@view-transition{navigation:auto}` and same-origin
  navigation. They are progressive enhancement by construction: an unsupported browser
  simply navigates, so there is no fallback to build. They do NOT conflict with the 60s
  nginx micro-cache — the rule ships with the static CSS and the transition is entirely
  client-side. The real question is the money path: the at-rule is DOCUMENT-level, not
  selector-scoped, so „exclude the checkout" cannot be expressed in CSS — it needs a
  conditional enqueue in PHP (`! is_checkout() && ! is_cart() && ! is_order_received_page()`).
  That is buildable, but it means the one thing standing between a payment result and a
  stale animated frame would be a PHP conditional I would be adding at the end of a long
  session, against a browser matrix I cannot test from this box (no Safari, no Firefox).
  *** So: not shipped, and not dismissed either. *** The design is recorded above and it
  is ready to build as its own slice, after Kris has seen the colour work — which is when
  the site's identity is settled enough for a transition to be worth designing around.
  Shipping something clever that could put a frame over a payment result is exactly the
  trade this pass has refused all the way through.

  GATE: design audit **0 defects across all 36 page × viewport combinations**;
  product-card gate PASS; money path PASS with „Спиди — до офис €4.42 / 8,64 лв." first;
  slice-11 checkout geometry baseline re-diffed **UNCHANGED** at 390 and 1440.

  ═══ WHAT THE DESIGN PASS ACHIEVED, MEASURED ═══
  Starting point (sprint 21 audit, live site): 22 viewport-overflow defects on the home
  page at mobile alone, escapes-parent on the product page at every width, 15–19 sub-32px
  touch targets per page, 58 distinct font sizes and 47 spacing values on one page, a
  dead desktop mega menu, a header that was never sticky, a checkout whose inputs had a
  1.56:1 focus ring and whose courier picker had none at all, a review form in Courier,
  and a card CTA whose styling had never applied.
  Now: **zero defects of every type across all 36 combos** — no viewport overflow, no
  document overflow, no escapes-parent, no text overflow, no small targets. 14 distinct
  font sizes on the home page (measured like-for-like against the old polluted method:
  33 → 24, and 14 with the census fixed). Spacing 47 → 33. One focus primitive, one card
  component driven by a container query, one shell, one type scale, one space scale.
  Fourteen slices, every one gated on the rendered result, one reverted outright (slice 2)
  when the gate said it made things worse.

  ═══ WHAT REMAINS OPEN ═══
  • *** SLICE 6, COLOUR SEMANTICS — BLOCKED ON KRIS, ASKED ELEVEN TIMES. *** Two
    decisions: cherry-vs-honey as the button colour, and gold roughness step 3 (grain) vs
    4 (grain + forged). Everything else in the palette is locked and encoded. This is now
    the ONLY thing standing between the design pass and completion, and several deferred
    items are queued behind it: the button primitive unification (deliberately kept out of
    the checkout until colour lands so it absorbs one change, not two), the footer's two
    inconsistent link treatments, and the PDP price still rendering Playfair.
  • BORICA production card test — waits on the bank contract.
  • Owner asks O-2…O-9 from claude/DESIGN_BUILD_PLAN.md, of which PHOTOGRAPHY is the
    longest lead time and gates the card's real appearance more than any CSS will.
  • The a11y button can overlap the last footer link at 390 (overlay-layer question).
  • The cart page still shows the footer's flair animations; the checkout is fully still.
  • Locker picker, waiting on the panel's BoxNow flip.

- 2026-08-06 sprint 36 — KRIS ANSWERED, AND THE ANSWER CHANGED THE TASK.
  Asked the two blocking slice-6 questions as a proper prompt rather than another line of
  prose. His reply, verbatim in substance:
  • „I don't see much of a difference on the shadows, they still look darker rather than
    more golden/honey." — HE IS RIGHT AND I WAS WRONG TO CALL IT DONE. My gold ramp
    reduced lightness and rotated the hue by only a few degrees, which is invisible.
  • „I quite like the cherry buttons, but the gold also can be the right answer if
    implemented properly." — the button decision is NOT cherry-vs-honey after all; it is
    conditional on the metal being convincing.
  • „The texture isn't quite implemented correctly. Can you look for what people have
    done online for gold/metal textures and styles? Can you give me some options?"
  • „Maybe the striations are too small to notice them, but either way I want to see a
    lot of options." + „can you give me some options for different golds? Some that are
    more honey, some more yellow, some more rose, etc."
  RESEARCHED IT PROPERLY (the thing I had not done). The technique behind every
  convincing CSS metal is REFLECTION BANDING — a multi-stop gradient alternating light
  and dark ACROSS the letterform, so the eye reads bands as a reflection. My earlier
  attempts were a single light-to-dark ramp plus noise, which is a gradient with dirt on
  it, not a metal. That is why it never looked right, and why the shadows read as „just
  darker".
  DELIVERED claude/_scratch_woo/sprint27/palette6.html — 7 gold families × 9 textures,
  generated from HSL so the hue rotation is a NUMBER printed under every swatch:
  • Section 0 answers his complaint head-on: „only darker" (hue fixed at 40°) beside
    „hue-rotated" (49° → 40° → 16°), with the degrees shown. He can see the difference he
    said he could not see, because it is now large enough to see.
  • Families: honey 40°, yellow 48°, champagne 43°/low-sat, rose 22°, copper-rose 15°,
    antique 36°, green-gold 54°.
  • Textures: flat (the control, i.e. what ships today), reflection banding, banding +
    fine grain, + coarse grain, 1px striations (what shipped — he was right that they are
    invisible), 2–5px striations, brushed, hammered, gold-leaf facets.
  • Plus the same textures on claret and cocoa, cherry-vs-every-gold buttons with measured
    contrast on all three surfaces, and metal-filled buttons.
  Nothing animates in any option — the „gambling website" sweep stays rejected.
  NEXT: slice 6 executes as soon as he picks numbers. Everything else in the palette is
  still locked. The darling-design-system SKILL remains the other outstanding promise.

- 2026-08-06 sprint 37 — THE SKILL DELIVERED, AND A STEADY-STATE WATCH THAT FOUND TWO
  DEAD MONITORS.
  *** darling-design-system SKILL DELIVERED *** (promised in sprint 21, outstanding ever
  since): handed over as both `darling-design-system.skill` and a plain `SKILL.md`.
  DELIVERED, NOT SAVED — this session cannot write to Kris's account, only give him the
  file. It carries what fourteen slices actually taught rather than theory: the token
  vocabulary and the theme.json-mirrors-style.css rule; the cascade rules (unlayered
  author CSS outranks every layer — slice 2 was reverted for it; darling.css first,
  style.css last; never !important, match the winning selector's shape and ask the engine
  via CDP which rule won); the method rules (test the RESULT; geometry lies about
  clipping; RE-MEASURE after a fix because the first is often necessary and not
  sufficient; a gate that cries wolf is worse than no gate; exclude AND count); the
  component contracts (card = container query + reserved 2-line title + CTA pinned
  bottom, clamp on the ANCHOR not the heading; one shell per region; two-tone focus ring;
  :has() cannot nest); the Bulgarian rules; and the lane, gates and deploy discipline.
  *** THE STEADY-STATE WATCH FOUND TWO MONITORS THAT HAVE NEVER WORKED SINCE THE
  CUTOVER. *** Nobody was reading the alerts, which is exactly why they lasted:
  1. `health.sh` still sent `Host: staging.darlinghome.bg` and used it as SNI. Staging was
     retired on 2026-08-05, so the apex block 301s it — 45 „ALERT: site returned 301"
     lines in health.log. The alert is the small part. The large part is that the monitor
     WAS NEVER CHECKING THE LIVE SITE OR THE LIVE CERTIFICATE AT ALL. A monitor aimed at a
     hostname that no longer exists is worse than no monitor: it reports failure while
     proving nothing. In sprint 20 I fixed the DEPLOY workflow's health URL and recorded
     the lesson „box config is not real until it is in the repo the deploy syncs from" —
     and then missed this script, which is in that same repo and synced by that same
     deploy. Fixed (3751d72): `http_code` now reads 200 and `cert_days_remaining` 89.
  2. `mail_cert_days_remaining` had been `-1` forever. The script reads the mail
     certificate from a file under a root-owned certbot directory the `darling` user
     cannot open. Its own comment calls the mail cert „the quieter failure, and therefore
     one worth watching explicitly" — and it was the thing not being watched. It now
     probes port 993, which additionally tests the certificate AS A MAIL CLIENT SEES IT
     rather than as a file on disk. Fixed (13dddb8): now reads 83 days.
  REST OF THE WATCH, all green: six containers up; db ok; disk 13%; memory 17%; backups
  nightly with today's present; restore-test today, 54/54 tables; apex cert to
  2026-11-03; www→apex and http→https both 301 correctly.
  404 WATCH — one item, and I want to be precise because my first reading was wrong. A
  single real client (149.62.209.45, Android) fired 15 Shopify-era POSTs — monorail,
  /api/collect, graphql.json, /apps/izpratibg/checkout/config — with a referrer of
  /collections/za-banyata. My first thought was a broken redirect or a stale service
  worker. CHECKED: there is no `/collections/` request in the last 3000 log lines at all,
  so nothing of ours failed to redirect; that client simply has an old Shopify page open
  or cached and its JavaScript is still beaconing. No action, and specifically NOT the
  service-worker kill-switch I was about to write — the evidence did not support it.
  Everything else in the log is routine bot scanning (/remote/login, sonicos, Censys),
  all 404ing correctly.
  *** KRIS DECIDED, MID-SPRINT — SLICE 6 IS NOW ALMOST UNBLOCKED. ***
  • TEXTURE: **8 — кован / hammered** (soft radial dimples over the reflection banding).
  • BUTTON RULE: **cherry on grey, gold on claret** — the „a button contrasts with what it
    sits on" rule, chosen on its merits rather than as a compromise.
  • Still open: WHICH gold. He asked to see the tones on BUTTONS rather than on the
    wordmark, which is right — that is the decision he is actually making.
  DELIVERED palette7.html: all seven golds as hammered buttons on claret, on cocoa, on
  grey, and as the chosen pairing side by side (cherry on the grey page next to gold in
  the red hero), plus a small-size row to check the texture does not fall apart.
  MEASURED AND WORTH KNOWING BEFORE HE PICKS: only three of the seven clear 3:1 against
  claret — yellow 4.56:1, green-gold 4.19:1, honey 3.49:1. Champagne (2.86), antique
  (2.75), rose (2.25) and copper-rose (2.02) all fail on claret. So „gold on claret"
  narrows the choice to the yellow end of the family whether we like it or not; the rose
  golds are only viable on cocoa (3.91–4.35:1).
  PROCESS NOTE FROM KRIS, worth keeping: delivering files with `display:"render"` forces
  the desktop side panel open and it kept re-opening and closing over what he was
  reading. Everything is `display:"attach"` from now on — he opens what he wants, when he
  wants.

- 2026-08-06 sprint 38 — SLICE 6 WRITTEN AND DELIBERATELY NOT SHIPPED (commit cec4ca8).
  Kris has decided two of the three: TEXTURE 8 (кован / hammered) and the BUTTON RULE
  (cherry on grey, gold on claret) — the second chosen on its merits, as a rule rather
  than a colour: a button contrasts with what it sits ON. Only the gold tone is open.
  PREPARED, INERT: claude/SLICE6_COLOUR_PENDING.css. It lives in claude/, which the
  deploy does NOT sync, and nothing enqueues it — so it cannot leak onto the site by
  accident. Shipping it is: paste at the end of style.css, set two numbers, gate.
  *** THE GOLD IS TWO NUMBERS. *** `--gold-hue` and `--gold-sat`, with all seven ramp
  stops derived from them in CSS (`hsl(calc(var(--gold-hue) + 9) …)`). „Gold 2" is
  `48 / 82`, not seven hex codes to keep in sync. And the hue ROTATES 33° across the
  ramp — +9° at the highlight to −24° at the darkest — because three or four degrees is
  precisely what Kris looked at and could not see. Real gold's shadows go amber and
  copper; they do not simply go dark. That must not be flattened back into a lightness
  ramp by anyone later, which is why the file says so at the point of definition.
  ALSO IN THE FILE: the locked palette as role-named tokens; one `.d-metal` class
  carrying BOTH texture 8 (CSS-only, cheap, safe anywhere) and the SVG lighting-model
  variant behind a commented swap, with the honest note that the filter is a raster
  operation and belongs on the hero button, wordmark, bow and badge only — never a grid
  of twenty cards; a `background-clip:text` fallback so a failed clip shows gold text
  rather than invisible text; and the two colour-dependent fixes deferred earlier — the
  footer's two inconsistent link treatments (slice 9) and the PDP price still rendering
  Playfair when slice 3 moved prices to Inter tabular.
  *** FRESH CHECKOUT GEOMETRY BASELINE RECORDED BEFORE ANY OF THIS. *** Slice 6 is the
  highest checkout risk of the whole pass, because it is where the button primitive
  finally unifies INCLUDING WooCommerce's checkout buttons — which slice 11 deliberately
  left alone so the checkout absorbs one change instead of two. The pre-slice-6 baseline
  is preserved as s11-baseline-preS6.json and the current one re-recorded, so the diff
  when it ships is against today's geometry, not last sprint's.
  KRIS ASKED A GOOD QUESTION MID-SPRINT: can we use texture maps, like 3D? Answer: yes,
  and the browser has a REAL lighting model rather than an imitation. `feTurbulence`
  generates a procedural height field — the same fractal-noise node you would use in
  Blender — and `feDiffuseLighting`/`feSpecularLighting` read its alpha AS A BUMP MAP,
  compute surface normals and light it from a stated azimuth and elevation. Delivered
  palette8.html with six variants (the current CSS-only one plus five lit surfaces).
  HONEST RESULT: the lighting model works and the speculars are coherent, but at these
  settings it reads as ROLLED or undulating metal rather than hammered — fractal noise
  makes smooth waves, not discrete dents. Getting true hammer marks wants a TILED
  PATTERN OF CIRCLES as the height map instead of noise. Said so rather than presenting
  it as finished.
  DELIVERY RULE FROM KRIS, now permanent: send files with `display:"attach"`, never
  `"render"` — render forces the desktop side panel open and it kept re-opening over
  what he was reading.

- 2026-08-06 sprint 39 — KRIS: „I don't see a difference between the buttons" + „can we
  make texture 8 less dense, more space between the lines?" Both were fair, and the
  second named a real defect I had not seen.
  *** THE „LINES" ARE THE REFLECTION BANDING, AND IT HAD THIRTEEN STOPS. *** Texture 8's
  base is a multi-stop gradient across the form; at thirteen transitions it reads as
  corduroy rather than as light on metal. Band density is now a knob with four settings —
  13 stops (the original), 9, 6 and 4 — shown side by side, bare and with the dents on
  top. Six is the recommendation: two broad highlights, two shadows.
  *** AND THAT IS ALSO WHY THE GOLDS LOOKED THE SAME. *** At button size the dense
  banding was eating the hue: every button showed the same rapid light-dark sweep, so
  honey, yellow and green-gold converged. With wide bands and a larger swatch the tone
  reads properly. Re-shown at §6 with hue, saturation and claret contrast printed.
  HAMMERING, THIRD ATTEMPT AND FINALLY RIGHT-ISH: the height map is now a TILED FIELD OF
  SOFT-EDGED CIRCLES — actual dents — jittered in position, size and depth so it cannot
  read as machine-stamped, fed through feDiffuseLighting + feSpecularLighting.
  FIRST COMPOSITE WAS WRONG AND I CAUGHT IT ON THE RENDER: summing diffuse and specular
  at full weight and blending hard-light clipped to white — it looked like BUBBLE WRAP,
  not metal. Re-weighted (k2 .55 / k3 .30), surface scale cut by 58%, blend soft-light.
  Now the dents read as dimples in gold and the gold survives underneath.
  Delivered palette9.html (attach, never render — Kris's rule).
  STILL OPEN, unchanged: which gold. Slice 6 remains written and inert.
  *** AND THE ONE ITEM THE NUDGE ASKED FOR THAT I HAD NOT DONE: A REAL TEXTURE MAP. ***
  Not a stock photo — I could not verify a licence I would be happy shipping — so I
  RENDERED one: a field of jittered dents built as a height map that WRAPS at the tile
  edges (seamless by construction, not by retouching), differentiated into surface
  normals, shaded per pixel with Blinn-Phong and a hue-rotated gold. Verified by tiling
  it 2×2 and looking for a seam: none.
  THE USEFUL VERSION IS GREYSCALE. Rendering the gold INTO the tile bakes the tone, so
  seven golds would mean seven files. Rendering only the SHADING as a grey map and
  tinting it in CSS (`background-blend-mode: overlay` over the gold ramp) means ONE
  asset serves all seven — and it is the smaller file.
  COST, measured rather than estimated:
    A. CSS-only ......................... 0 KB
    B. Grey map, 256px WebP ............. 15 KB   ← recommendation
    B. Grey map, 512px WebP ............. 38 KB
    C. Colour tile, 256px WebP .......... 18 KB (per gold)
    C. Colour tile, 512px PNG ........... 415 KB (would not ship)
  For scale, one product photograph is 60–150 KB. And unlike the SVG filter, an image is
  just a background — it is NOT re-rasterised on every repaint, so option B is the only
  high-fidelity route that would also be safe on a grid of product cards.
  Delivered palette10.html plus the two .webp tiles.

- 2026-08-06 sprint 40 — STEADY STATE VERIFIED, AND THE COLOUR SLICE FINISHED ITS
  THIRD ROUTE. No production CSS shipped: slice 6 is still held on Kris.

  1. THE TWO MONITORS I FIXED IN SPRINT 37 ARE STILL FIXED — CHECKED, NOT ASSUMED.
  `health.json` reports `http_code: 200`, `cert_days_remaining: 89`,
  `mail_cert_days_remaining: 83`. That last number was **−1 forever** before the fix,
  because the check read a certificate file the `darling` user cannot open; it now asks
  the IMAP port instead. Disk 13%. Backups age 0. Restore-test 54/54 tables.
  *** THE PART THAT NEEDED PROVING: *** „no alerts" is easy to claim from a quiet tail.
  I located the last ALERT in health.log by line number — it is the **07:30 run**, the
  fix deployed around 07:45, and the four runs after it are clean. So the silence is the
  fix working, not the log having rolled.
  404 log: bot probes only (wp-admin, .env, xmlrpc and friends) — nothing of ours is
  missing. External smoke from outside the box: home 200, shop 200, peer-health 200,
  checkout **302**, which is the correct empty-cart redirect and not a fault.

  2. DOORBELL INBOX READ DIRECTLY, NOT INFERRED FROM A MONITOR.
  `GET /bell/check?to=woo` still reports **seq 9**, newest note 16:37 yesterday. Monitors
  time out and get restarted; the inbox is the ground truth, so I asked it rather than
  trusting that a poller had been awake the whole time. Nothing was missed.

  3. SLICE 6 — OPTION C AND THE DENSITY KNOB WIRED, STILL INERT.
  Two things Kris said last round turned into code rather than another palette page:
  • *„make texture 8 less dense, more space between the lines"* — the „lines" were the
    **reflection band**, not the hammering: thirteen gradient stops across the button
    read as corduroy. The default is now **six stops** (two broad highlights, two
    shadows); the thirteen-stop original is kept commented directly above it so the
    choice stays visible instead of being lost in a diff. This is also the likeliest
    reason he said the golds looked identical to each other — at thirteen stops the
    banding dominates the hue.
  • *„can we use texture maps, like in 3D modelling?"* — yes, and the answer is now a
    file. `claude/assets/hammer-map-256.webp`, 15 KB, is a **greyscale shading map**:
    a wrapped-distance dent height field → surface normals → Blinn-Phong, written as a
    seamless tile. Grey rather than gold on purpose, so ONE file tints to all seven
    golds — hue from the ramp underneath, geometry from the map on top, blended
    `overlay` so flat mid-grey leaves the ramp untouched.
  `claude/SLICE6_COLOUR_PENDING.css` now carries all three routes as ONE-LINE choices in
  `.d-metal`: A dimples (CSS only), B SVG lighting model, C rendered map. §4b holds the
  three-step ship instruction for C. *** Nothing enqueues this file and `claude/` is not
  deploy-synced, so it cannot reach the site by accident. ***
  WHY C IS THE RECOMMENDATION AND NOT JUST THE NEWEST: an image background is not
  re-rasterised on every repaint. The SVG filter route is the prettiest in isolation and
  the only one I would not put on a category page holding twenty cards.

  4. NO FIFTH PALETTE PAGE, DELIBERATELY.
  Four is already a lot to look at, and what is left is a choice, not a missing option.
  Building another would look like progress while changing nothing.

  ═══ THE ONE OPEN QUESTION ═══
  *** WHICH GOLD (1–7) AND WHICH TEXTURE ROUTE (A / B / C). *** Everything else in the
  palette is locked and encoded; the button rule Kris already chose — cherry on grey,
  gold on claret — is written. Queued behind this answer: the button primitive
  unification (kept out of the checkout on purpose so it absorbs one change, not two),
  the footer's two inconsistent link treatments, and the PDP price still in Playfair.
  When it ships: fresh diff11 baseline first, then gate hardest on the checkout — audit
  zero across 36 combos, product-card PASS, money path PASS, diff11 UNCHANGED, plus a
  contrast sweep with no pair below 4.5:1 under 24px or 3:1 at 24px and over.

- 2026-08-06 sprint 41 — RAW GOLD. *** KRIS ANSWERED TWO OF THE THREE OPEN QUESTIONS,
  AND THE THIRD CHANGED SHAPE. *** Still nothing shipped: slice 6 remains inert.

  DECIDED BY KRIS THIS SPRINT:
  • Band density — **six stops**. Confirmed. The thirteen-stop variant is dead.
  • Gold — narrowed from seven to **1 мед / 3 шампанско / 7 зелено злато**.
  • Texture — the brief moved: he asked for **raw, unrefined gold**, and for **real
    texture maps** rather than more CSS gradients.

  1. THE RESEARCH CHANGED THE TARGET, AND THAT IS THE FINDING.
  Native gold does not look like the metal we had been building. The sources describe its
  lustre as *„buttery"* or *„greasy"* — soft, **non-sparkling** reflection; nuggets are
  water-worn and irregular, in host rock it grows dendritic and wire-like, and in quartz it
  is mottled with pale non-metal. Impurity moves the hue: silver pales it, copper reddens it.
  *** So every polished cue we had been adding — tight banding, hard speculars — was
  working AGAINST the thing he has been asking for since the first palette. *** That is
  the likeliest reason nothing has looked right yet, and it is a better explanation than
  „the colours are wrong".

  2. WHAT I BUILT: A REAL MICRO-FACET BAKE, NOT A DRAWING.
  `raw.py` (committed) renders six surfaces through the pipeline a 3D texture map actually
  uses: height field → surface normals → **GGX specular + wrapped diffuse + ambient
  occlusion**, with a **per-pixel roughness map** — which is precisely what separates raw
  from refined. All noise is generated in the Fourier domain, so every tile is **seamless
  by construction** rather than by hand-blending edges.
  The six: 1 самородък (water-worn), 2 кристално (dendritic facets), 3 в кварц (mottled
  with host rock), 4 лято (as-cast granular), 5 маслен блясък (the „greasy" sheen, almost
  no relief), 6 излъскани върхове (roughness driven BY height — pits matte, peaks bright).
  Each ships two ways: ONE greyscale shading map that tints to any gold from the CSS ramp
  (1–24 KB), or a baked colour tile per gold (3–40 KB) with the hue rotation already in it.

  3. THE REAL TEXTURE MAPS — ANSWERED, WITH THE LIMIT STATED.
  CC0 gold PBR sets do exist and are usable commercially without attribution:
  cgbookcase „Dirty Gold 01" (base colour, normal, metallic, roughness, height, AO, to 4K),
  ambientCG, Poly Haven, 3dtextures.me. *** But this session may not download binaries from
  the web, so I did not pretend to have fetched one. *** If Kris wants a photographed map he
  downloads it once onto his machine and I stage it through the bridge and bake it the same
  way. Also worth saying rather than burying: a photographed base-colour map **locks the
  hue**, which is the one decision still open — ours is grey, so a single ~20 KB file
  becomes honey, champagne or green-gold by changing two numbers.

  4. *** A RESULT I DID NOT PREDICT: THE TEXTURE MOVES THE CONTRAST. ***
  Measured on the rendered tiles, button-vs-claret, threshold 3:1 for a non-text element:
  шампанско passes on самородък (3.20), маслен блясък (3.50) and излъскани върхове (3.11),
  but **fails** on кристално (2.68), кварц (2.84) and лято (2.82). Мед (3.18–4.07) and
  зелено злато (3.72–4.72) pass on all six. Cocoa ink on the button is 5.2:1–9.1:1
  everywhere, so the label is safe in every combination — the risk is only whether the
  button separates from the claret behind it.
  Delivered `palette11.html`: six surfaces × three golds, **on buttons**, on claret, with
  the six-stop band, a four-step scale strip and the contrast table.

  5. HOUSEKEEPING, STATED PLAINLY.
  The container restarted mid-sprint and took the scratch directory with it, including the
  in-flight edit that wired option C into `claude/SLICE6_COLOUR_PENDING.css`. The repo copy
  is therefore still the sprint-38 version. I have NOT tried to reconstruct that
  intermediate: the band density is now decided and the texture route is about to be, so
  the pending file gets ONE rewrite into its final shape when Kris names a surface and a
  gold, rather than two rewrites through a state nobody will ship. `raw.py` is committed so
  the tiles are reproducible from source rather than surviving as loose binaries.

  ═══ STILL OPEN ═══
  Which gold (1 / 3 / 7), which of the six surfaces, greyscale-map or baked-colour
  delivery, and the tile scale (110 / 170 / 240 / 340 px). Then slice 6 ships in one pass:
  fresh diff11 baseline first, then audit zero across 36 combos, product-card PASS, money
  path PASS, diff11 UNCHANGED, and the contrast sweep above.
