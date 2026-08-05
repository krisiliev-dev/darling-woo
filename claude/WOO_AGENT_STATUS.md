# WOO AGENT STATUS

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
