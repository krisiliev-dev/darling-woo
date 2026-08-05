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
