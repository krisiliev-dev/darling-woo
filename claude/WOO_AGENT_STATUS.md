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
