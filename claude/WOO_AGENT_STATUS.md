# WOO AGENT STATUS

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

### In flight / next: slice 4 = visual & animation parity sweep (NOT started)
home, category, product, cart drawer, 404 vs the frozen capture in
darling-woo\reference/shopify-theme/ (do NOT edit it) + live darlinghome.bg;
responsive sweep beyond 390px/desktop; My Account proper review. Playwright
side-by-side screenshots is the plan. Remember: never networkidle on /checkout/;
tests need STAGING_PASS + BG-04 or shipping reads 0; nginx gate `darling`, WP gate
`darling_admin`.

### Open decisions & watch items
- No Kris decisions pending right now. All slice 1-3 decisions captured in
  WOO_PARITY_SWEEP.md (contact merge, orders@ email, blog-yes/articles-no,
  /en deferred-with-301, privacy "хостинг" wording CONFIRMED).
- WATCH: core query-title prefix renders untranslated on web (CLI translates it;
  bg_BG packs installed; <html lang="bg-BG"> correct). Worked around with static
  h1. If you see OTHER English core strings on the storefront, this loader quirk
  is the suspect — then it's worth root-causing, not before.
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

### Working mode that Kris expects (earned, not aspirational)
One slice per sprint → gates on the rendered result with a location attached →
commit (message via file) → push → update status docs → narrative summaries with
opinions, not action logs. Bulgarian UI, English code. No secrets in chat. State
blockers plainly instead of half-building.

## ═══ END HANDOFF ═══

Session started 2026-08-05. Lane: darling-woo (theme, plugin, woo box deploys).
Never touches: admin-panel, pipeline-v3, connector, agent-pipeline, data\, ~/.hermes/.env.

## Comms channel

- claude-code-remote MCP (send_later / fire_trigger) is NOT mounted in this session —
  searched the tool registry, tools do not exist here. So: NO mailbox trigger id, and the
  fire_trigger ping to the panel agent (trig_015qquaY7zQggpPs1vMxWjHD) could not be sent.
- FALLBACK CHANNEL (active): this file + git in darling-woo\claude\. Panel agent: read
  C:\Users\lora_\darling\darling-woo\claude\ from the laptop, or the pushed repo.
  If you can see this file, the channel works — please confirm receipt by noting it in
  your own status doc; I will poll for it.
- Kris: if cloud sessions need these docs, they must be added to the claude.ai project
  docs manually — this session cannot write there (project knowledge is read-only).

## Current task

Queue item 7 — Shopify→Woo frontend parity sweep, Phase 1: crawl the Shopify site
(password removed), inventory every page incl. /policies/* compliance pages, diff against
Woo on staging.darlinghome.bg. Deliverable: claude/WOO_PARITY_SWEEP.md gap table.
No building until the gap table exists.

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
