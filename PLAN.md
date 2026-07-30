# Дарлинг 7 — Shopify → WooCommerce migration plan

**Decision:** 2026-07-27, owner. Migrate the storefront from Shopify Basic to self-hosted WooCommerce.
**Rationale:** stop paying for workarounds. Checkout customisation (courier office picker, VAT invoice
fields) is Plus-gated on Shopify (€2,100/mo); on Woo it is ours to build. We already own the courier
adapters, the quote endpoint, the design system and the product pipeline — the platform is the only
rented part.
**No launch deadline.** We launch when ready. This plan optimises for *correctness and low running
cost*, not speed.

---

## 0. Guiding principles

1. **Don't rebuild what's portable.** CSS/design system, brand voice, copy, Cloudflare semantic-search
   Worker, the admin panel, all Barsy-side connector logic, and the enrichment/taxonomy pipeline all
   carry over untouched.
2. **Own the integration layer.** Custom „Darling" plugin instead of third-party courier plugins.
   We have the APIs; a thin plugin calling our own panel is fewer moving parts, no €218 licence,
   no multi-courier conflict, no dependence on someone else's maintenance.
3. **Build for the block checkout (Store API) from day one.** The classic shortcode checkout is being
   deprecated; third-party BG courier plugins are still tied to it. Building our own sidesteps this.
4. **Webhooks are an optimisation, never the source of truth** — and for a durable reason, not
   because of Woo's defaults. *Webhooks are fire-and-forget delivery whose **sender** may not be
   running.* Delivery rides Action Scheduler/WP-Cron, so a wedged PHP-FPM, locked DB or stuck queue
   means **no attempt is made at all**; and some events never queue in the first place (gateway edge
   cases, direct DB writes, transitions during a failed request) — no retry policy resends an event
   that was never created. The reconciler answers *"which orders exist in Woo that Barsy hasn't
   booked?"*, a question no retry count can answer. **This holds even with infinite retries.**
5. **Parallel, not big-bang.** Shopify keeps running until Woo is proven. ~€19–27/mo is cheap insurance.
6. **The catalogue is the real launch blocker** (9,385 products, no categories) and is platform-agnostic.
   It proceeds in parallel and is not blocked by this migration.

---

## 1. Target architecture

```
                     ┌───────────────────────────┐
  Barsy (ERP,        │  Enrichment pipeline      │  ← source of truth for
  system of record)  │  (categories, copy, specs)│    products & taxonomy
        │            └────────────┬──────────────┘
        │                         │ bulk push (REST/WP-CLI)
        ▼                         ▼
  ┌───────────┐            ┌──────────────┐        ┌─────────────────────┐
  │ connector │◄──orders───│ WooCommerce  │◄──────►│ darling-checkout    │
  │ (Hermes)  │──stock────►│ (VPS #2)     │        │ plugin (ours)       │
  └─────┬─────┘  polling   └──────┬───────┘        │ • office picker     │
        │        + webhooks       │                │ • live rates        │
        ▼                         │                │ • VAT invoice       │
  ┌───────────┐                   │                │ • GPSR gate         │
  │  Barsy    │                   │                │ • cart capture      │
  └───────────┘                   ▼                └──────────┬──────────┘
                          ┌──────────────┐                    │
                          │ Admin panel  │◄───────────────────┘
                          │ (VPS #1)     │  /api/public/couriers/{offices,quote}
                          └──────────────┘
```

Nothing about Barsy, the panel, the pipeline or the search Worker changes shape.

---

## 2. Phases

### Phase 0 — Foundations (no store yet)
- [ ] **Provision VPS #2** (Contabo) — *separate box from the panel*; a bulk import or Action
      Scheduler storm must not starve the panel.

      **SPEC (owner to order):**
      | | Minimum | **Recommended** |
      |---|---|---|
      | vCPU | 4 | **6** |
      | RAM | 8 GB | **16 GB** |
      | Disk | 100 GB **NVMe** | **200 GB NVMe** |
      | OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
      | Location | **EU (Germany)** | **EU (Germany)** |
      | Rough cost | ~€8–12/mo | ~€15–20/mo |

      Notes:
      - **Insist on the NVMe tier.** Contabo vCPUs are shared and the non-NVMe tiers are the usual
        cause of "WooCommerce is slow" — MariaDB random I/O on `wp_postmeta` is the bottleneck.
      - **RAM is the parameter that matters most.** `innodb_buffer_pool_size` ≈ 55% of RAM must
        hold the `wp_postmeta` + `wc_product_meta_lookup` working set for 9k products; undersizing
        shows up first as crawling admin product search and filtered listings.
      - ⚠️ **Datacentre location: choose EU/Germany**, even if the panel sits elsewhere. The panel is
        staff-facing and latency-tolerant; the storefront is customer-facing in Bulgaria.
        (Cloudflare fronts static assets, but checkout and admin are dynamic and uncacheable.)
      - Skip Contabo's backup add-on as the *primary* — we run our own off-box backups with tested
        restores (§4). Their snapshot feature is still useful as a pre-upgrade rollback.
      - 6 vCPU/16 GB is the recommendation because the catalogue import, image processing and
        Action Scheduler all spike concurrently in Phase 2; being cramped there costs days.

      ✅ **DECIDED (owner, 2026-07-27): start on the MINIMUM tier (4 vCPU / 8 GB / NVMe), upgrade
      before launch.** This is a sound call — the minimum is comfortably enough for Phases 0, 1 and 3
      (install, theme, plugin development, low-traffic testing). Two caveats, both manageable:
      - The pinch point is **Phase 2 (catalogue import)**: 9k products + image processing + Action
        Scheduler spiking together is where 8 GB may struggle or OOM. Mitigate by **batching the
        import** and not running image processing concurrently — slower, not broken.
      - ⚠️ **Confirm whether Contabo upgrades in place or requires a rebuild.** Either way the risk is
        low *because* of how we're building: Docker + CI/CD + off-box backups mean re-provisioning on
        a bigger box is a restore, not a migration. Sizing up later is genuinely cheap here.
- [ ] Stack: Docker + **Nginx** (not Caddy — no mature FastCGI micro-cache) + PHP 8.3/8.4 + OPcache
      + MariaDB + **Redis** object cache. `innodb_buffer_pool_size` ≈ 55% RAM.
- [ ] Staging + production, GitHub Actions CI/CD mirroring the panel's setup.
- [ ] **Backups with tested restores** (orders are money), off-box.
- [ ] **Monitoring + alerting** — see §4, this is the price of self-hosting.
- [ ] Cloudflare in front; cache rules bypassing `woocommerce_cart_hash`, `wp_woocommerce_session_`,
      `wordpress_logged_in_`, and `/cart|/checkout|/my-account|/wp-admin`.
- [ ] ⚠️ **OWNER ACTION — start the payment-gateway application now.** myPOS KYC takes days;
      Borica vPOS 2–6 weeks. This is the longest lead-time item in the whole plan.

### Phase 1 — Store skeleton
- [ ] WooCommerce, **HPOS on, compatibility mode off**.
- [ ] Currency EUR, BG VAT 20%, Bulgarian address formats, EUR/BGN dual display if still required.
- [ ] **Language: BULGARIAN ONLY at launch** (owner decision, 2026-07-27). No Polylang, no
      translation layer, **saves ~$198/yr** and removes a plugin from the attack surface.
      ⚠️ **Design for EN, don't build it:** keep all customer-facing strings in the theme's
      translation functions (never hardcoded), keep the pipeline emitting both BG and EN copy into
      product meta, and avoid language-specific slugs/permalink assumptions. Adding Polylang Pro
      later then becomes configuration + a term-duplication script, not a rewrite.
- [ ] Block theme carrying the existing design system: `--d-*` CSS tokens, paper aesthetic, sparkles,
      Lady D, tagline „Тайната на една домакиня.", accessibility toggle, BG/EN switcher.
      **The CSS transfers nearly verbatim; only templates are rewritten.**

### Phase 2 — Catalogue import (the real work)
- [ ] Push **from our pipeline**, not a Shopify export — the pipeline is the source of truth.
- [ ] Per product: SKU **= Barsy code** (the join key), title, BG description, images, price,
      **weight** (needed for live rates), barcode/EAN, GPSR fields, brand.
- [ ] Categories: our own BG merchandising tree (~50) as `product_cat` terms.
- [ ] Taxonomy/feed plumbing: canonical **numeric Google Product Category** written to
      `_wc_facebook_google_product_category` as **post meta AND `product_cat` term meta**
      (term meta gives category-level defaults free), plus a private `_darling_gpc`.
      Shopify's taxonomy (MIT, `github.com/Shopify/product-taxonomy`, v2026-05) stays our internal
      canonical class + attribute scaffold — pinned and forked into the pipeline.
      ⚠️ Google publishes **no Bulgarian taxonomy file** → use numeric IDs, self-author BG labels.
- [ ] Inventory: tracking ON, backorders **"Do not allow"** by default, per-product override from
      Barsy `sale_below_zero` (mirrors today's DENY/CONTINUE mapping).

### Phase 3 — `darling-checkout` plugin ← the reason we're migrating

**Build-vs-adopt evaluated on staging, 2026-07-30 — verdict: BUILD.**
*Bulgarisation for WooCommerce* (5.0★/43, actively maintained, WC-tested 10.9) was
installed and inspected, not judged from its listing. Findings:
- ❌ **Zero block-checkout support** — 0 files referencing `IntegrationInterface`/
  `StoreApi`/`ExtendSchema`, no `cart_checkout_blocks` declaration, no block JS.
  It hooks `woocommerce_checkout_fields`, `woocommerce_after_checkout_validation`,
  `woocommerce_checkout_update_order_review` — all **classic-checkout only**.
  Adopting it would mean running the shortcode checkout WooCommerce is deprecating.
- 🔁 **Its two biggest features duplicate things we already own**: PDF invoices
  (we issue фактури through Barsy `Invoices_save`) and courier labels/waybills
  (the panel's Speedy/Econt adapters already create them, credentials server-side).
  Adopting it would put courier credentials and invoice generation in two places.
⇒ The only piece we'd actually use is the checkout office picker — which our own
`/api/public/couriers/*` endpoints already back. So we build: block-native, thin,
panel-driven. Bulgarisation remains a useful GPL reference implementation.
Everything that was a cart-page workaround becomes a first-class checkout integration:
- [ ] **Courier office picker in checkout** (Store API / block checkout), fed by the panel's
      `/api/public/couriers/{carrier}/offices`. Econt + Speedy now; BOX NOW/Sameday later.
- [ ] **Live shipping rates** — a Woo shipping method calling the panel's `/quote`
      (weight + destination → real fee). Replaces the flat 4.99 € *and* the line-item hack.
      Applies to every checkout route, so **no express-checkout bypass and no revenue leak**.
- [ ] **VAT invoice fields in checkout** with the required-field enforcement we already designed
      (Фирма/ЕИК/Град/Адрес mandatory, ЕИК 9 or 13 digits). Writes the **same 7 meta keys** the
      connector already reads — frozen contract, do not rename.
- [ ] **GPSR** display + sell gate.
- [ ] **Cart capture** — replaces Кошници's dependency on Shopify `checkouts/*` webhooks
      (Woo has no native abandoned-cart event; we emit our own).
      🔒 **PII design rules — settle before the event shape is fixed.** On Shopify we were a
      *recipient* of checkout data and the GDPR erasure topics were handled for us. With our own
      plugin **we become the data controller**, and Кошници is the panel's most PII-dense surface:
      contact details for people who never bought and never became customers. Therefore:
      - key on a **pseudonymous cart id**, never on email/phone;
      - **do not persist contact fields until an order is actually placed**;
      - **hard 30-day retention**, enforced by a purge job — not by intention;
      - erasure/export path for the pseudonymous record.
      Cheap now, awkward to retrofit once carts are flowing. This is the line between an
      abandoned-cart feature and an unmanaged database of people who browsed.
- [ ] Written for block checkout from the start; no legacy-checkout debt.

### Phase 4 — Connector port (Hermes)
Measured: ~2,100 lines Shopify-coupled; **55–60% survives untouched** (all Barsy-side logic).
**Effort: 3–5 weeks** — port ~40–45% **plus build a reliability subsystem that does not exist today**
(Shopify gave it free). Re-proving, not coding, is the bulk.

- [ ] Woo REST adapter replacing `shopify_api.py` / `shopify_orders.py`.
- [ ] Order intake: map Woo order payload → the existing normalised dict.
- [ ] 🚨 **STOCK MODEL — decide before coding, not during.**
      ⚠️ *An earlier draft of this plan claimed the on_hand/committed/available problem "disappears"
      on Woo. That was **wrong, and dangerously so** — it reads as one less thing to build.*
      Woo has **one** number, and the COD hard-decrement makes that worse, not better:
      ```
      Barsy 9 · Woo 9
      customer orders 1   → Woo hard-decrements to 8   (Barsy still 9 — only a clientorder reserved)
      stock mirror runs   → pushes Barsy's 9 → Woo back to 9
      ⇒ the sold unit REAPPEARS → oversell
      ```
      Shopify's split was **load-bearing, not incidental**: the mirror wrote `on_hand` only and
      Shopify derived `available = on_hand − committed`, so a sync could never undo a reservation.
      Woo removes the field that made this solvable. Options:
      1. **Woo owns stock between order and finalise; mirror is finalise-driven and pushes deltas,
         never absolutes.** Closest to today's semantics. *(Hermes's recommendation.)*
      2. **Mirror absolutes minus un-finalised order quantities** — rebuild `committed` ourselves
         from open orders. More code, but absolutes are self-healing where deltas accumulate drift.
      3. Never mirror downward; only correct upward (restocks, deliveries, revisions). Weakest.
      **RESOLVED — hybrid, owned by Hermes:** (1) as the operating mode, plus (2)'s formula as a
      periodic drift-correcting audit. **Deltas always; absolutes only when provably correct;
      alert otherwise.** Two guards, both learned from live bugs on 2026-07-27:
      - 🚫 **The audit must derive open orders from the polling reconciler's authoritative order
        list — NEVER from `ORDERS_STATE`.** That ledger is container-local and is wiped on
        recreate (proven live: it rebuilds from webhooks as `kind='clientorder'`, loses every
        finalise record, and silently returned `[]` from `list_cod_accounts` after a redeploy).
        An absolute push computed from a lossy ledger would be `Barsy_stock − wrong_open_qty`
        — and an absolute push **overwrites**, so the error is total, not partial.
      - 🛑 **The audit must FAIL CLOSED.** If open orders can't be determined confidently
        (reconciler behind, API error, ambiguous state) it must **not** push an absolute — it
        alerts. Same rule as `reversal_unverifiable`: a guard that silently proceeds when it
        cannot verify is worse than no guard, because it looks like it passed.
- [ ] **Reversals — a distinct mapping job, not a port.** `shopify_order_cancellation_to_barsy` and
      `shopify_refund_to_barsy` parse Shopify refund shapes (`refund_line_items`, `transactions`);
      Woo uses `/orders/{id}/refunds`, per-line refund totals, and status→`cancelled`.
      Carries the **reversal invariant** (`would_reverse == refund_total`) — money-critical.
- [ ] **Money invariants: re-map, don't port.** `total_mismatch` (intake) and the reversal check read
      Shopify's `total_price`, `total_discount` and `discount_allocations`. Woo represents discounts
      differently (line `subtotal` vs `total`, plus coupon lines). Logic survives; field mapping is new.
      These caught real bugs on 2026-07-27 — keep them explicit.
- [ ] **`ship_order` largely evaporates — a genuine win.** Its Shopify half (`fulfillmentCreate` to
      clear `committed`) has no Woo equivalent and becomes a status transition. The Barsy
      waybill/speditor stamp survives unchanged. Listed so nobody ports dead code.
- [ ] 🚨 **Reliability layer (NEW CONSTRUCTION, mandatory):**
      - polling reconciler on `/wp-json/wc/v3/orders?modified_after=` as **source of truth**
        (rationale in §0 principle 4 — holds even with infinite retries);
      - 🚨 **Idempotency keyed on the WOO ORDER ID, claimed atomically** — *not* on delivery id.
        *(Corrected 2026-07-27: delivery id is correct **within** a path and useless **across**
        paths.)* Push and poll are two routes to the same action, so if a push books an order and
        its ack is lost, the poll sees it unbooked and **books it again → two Barsy sales, two
        decrements, two бона.** The claim must be a single atomic write, **never check-then-act**,
        or two concurrent paths both pass the "not booked" test before either writes.
        ⚠️ Not theoretical: the connector's finalise guard is currently in-process and dies on
        restart, so today's real backstop against a double decrement is Barsy returning 501.
      - heartbeat per successful cycle (panel raises on **age**, never error count);
      - system cron with `DISABLE_WP_CRON=true`.
- [ ] **Webhook config (mu-plugin, cheap and does most of the work):** raise
      `woocommerce_max_webhook_delivery_failures` so webhooks never silently self-disable;
      re-queue failed deliveries via Action Scheduler with backoff; receiver returns 200 immediately
      and processes async. Then `status != active` monitoring is belt-and-braces, not load-bearing.
- [ ] **Carry the secret-normalisation fix across.** `X-WC-Webhook-Signature` is the same
      HMAC-SHA256+base64 primitive, so the CRLF-poisoned-secret class of bug transfers with it.
- [ ] Re-prove everything: forward chain, finalise, бон, invoicing, COD, discounts, shipping,
      oversell block, storno.

### Phase 5 — Admin panel adaptation (panel session) — ~3–5 days
- [ ] `woo_orders` adapter emitting the **same normalised dict** → Онлайн поръчки, Home, insights
      and COD work unchanged. (This existing normalisation boundary is the migration's best asset.)
- [ ] Woo webhook receiver twin (`x-wc-webhook-signature`, Woo topic names); the Shopify GDPR
      topic handlers simply vanish.
- [ ] `app/ids.py::numeric_oid` degrades to a no-op on Woo's integer ids; status vocabulary remap.
- [ ] Кошници rewired to the plugin's cart-capture events.

### Phase 6 — Payments, SEO, feeds
- [ ] ✅ **Stripe registered (owner, 2026-07-27) — primary gateway.** 1.5% + €0.25 EEA cards.
      Chosen for Apple/Google Pay and **payout straight to the company bank account** (unlike myPOS,
      whose e-money balance must be swept). Also brings: block-checkout-compatible official plugin,
      built-in SCA/3DS handling, Radar fraud screening, programmatic refunds (useful for the storno
      path), and payout/balance reports for reconciliation.
      🎯 **Underrated benefit for us: Stripe's test mode.** Test cards mean I can run **fully
      automated end-to-end card checkouts** in CI — the exact thing we could not do on Shopify
      without asking the owner to toggle test mode. This materially improves how well we can prove
      the pipeline before launch.
- [ ] ⏳ **Borica to evaluate as a second gateway** (~1.2%, €0 fixed → ~€0.48/order at €40 AOV vs
      Stripe's ~€0.85). Natural split: **wallets → Stripe** (Express Checkout buttons render
      separately), **manual card entry → Borica**. Woo runs both cleanly, so the cheap path takes the
      volume and Stripe covers the wallets Borica generally can't. Owner is checking with the bank.
      Only worth it if the quoted rate is genuinely ≤~1.3%; otherwise Stripe alone is simpler.
- [ ] COD via Woo's built-in gateway; real logic stays in our plugin/panel exactly as today.
- [ ] PCI: use redirect/iframe flows only → **SAQ A**. Never self-host card fields.
- [ ] SEO: RankMath or SEOPress (free tiers are ample), Product/Offer/Breadcrumb schema,
      hreflang, sitemaps.
- [ ] **301 map**: legacy `darling7.com/product-name-<id>.html` (~4,590 URLs) → new slugs.
      Server-level rules, not a DB-backed redirect plugin, at this volume.
- [ ] Feeds: Google Merchant Center + Meta catalog (Meta accepts `google_product_category`).

### Phase 7 — Hardening & cutover
- [ ] 🔺 **UPGRADE THE VPS** from the starting minimum (4 vCPU / 8 GB) to the recommended tier
      (**6 vCPU / 16 GB / 200 GB NVMe**) *before* go-live. Trigger points, whichever comes first:
      the Phase 2 catalogue import struggling, `innodb_buffer_pool` unable to hold the working set,
      PHP-FPM `max_children` saturation under load test, or simply "we are about to open the shop".
      Verify Contabo's upgrade path (in-place vs rebuild) — a rebuild is fine, it's a restore from
      our own backups onto a bigger box.
- [ ] Security: 2FA, least-privilege admin, WAF, fail2ban, disable file editing, staging-first updates.
      *(SSH itself was hardened in Phase 0 — see the first-value-wins note there.)*
- [ ] Load test; verify cache hit ratios; Action Scheduler health.
- [ ] Full end-to-end order tests (COD + card) mirroring what we proved on Shopify, including the
      oversell block and — once the fiscal device is wired — **storno**, still outstanding.
- [ ] Accountant confirms the Н-18 / СУПТО position before go-live.
- [ ] Cutover: DNS, redirects live, `noindex` removed, Shopify decommissioned after a soak period.

---

## 3. Cost (self-hosted, deliberately lean)

| Item | Cost |
|---|---|
| VPS #2 (Contabo, NVMe) | ~€10–15/mo |
| WooCommerce + our plugin + payment plugins | €0 |
| Courier integration (ours, not the €218 commercial one) | €0 |
| SEO + feed plugins (free tiers) | €0 |
| Polylang Pro + Woo add-on *(only if EN at launch)* | ~$198/yr |
| Shopify, run in parallel until cutover | €19–27/mo, then €0 |
| **Steady state** | **≈ €12–15/mo + optional $198/yr** |

Versus Shopify: Basic €19–27/mo but **Grow annual €56/mo** would have been required for live carrier
rates, and checkout fields were never available at any price below Plus (€2,100/mo).
Payments also favour Woo: ~€100–130 saved per €10,000 of card revenue.

---

## 4. The honest maintenance caveat

The owner has designated me as maintenance. I can do the *work* — patching, updates, monitoring
review, incident response, restores — but I only act **when invoked**. I am not a pager. So the plan
must make maintenance *event-driven rather than attention-driven*:

- [ ] **Automated**: unattended security updates, nightly off-box backups, health checks with
      auto-restart, Action Scheduler queue monitoring, webhook-disabled detection + auto-reactivation.
- [ ] **Scheduled**: a recurring maintenance job (the existing cron infrastructure already does this)
      where I review updates, apply them on staging, run smoke tests, then promote.
- [ ] **Alerting**: uptime + error alerts to the owner's phone, so a 2am outage reaches a human even
      if it doesn't reach me.

Without that automation, "the AI maintains it" is a gap. With it, it's genuinely workable.

### 4.1 Monitoring model (panel session's design — adopted)

**Liveness lives outside, component health lives in the panel.** A health page hosted *in* the panel
cannot tell you the panel is down — a smoke alarm wired to the burning building. So:

| Layer | Owner | Covers |
|---|---|---|
| **External pinger** (3rd-party) | outside both boxes | shop up? panel up? → the only true liveness signal |
| **Panel health** | panel | Barsy reachable · Woo REST reachable · webhook status · poller heartbeat · queue depth · backup/restore age |

**Design for staleness, not errors.** Same class as the rule that already bit this project:
*a failed read must never report 0* — a dead reader and a genuinely empty result look identical.
A stopped poller looks exactly like "no orders today", which on a slow Tuesday nobody questions.
⇒ the reconciler writes a **heartbeat on every successful cycle**, and the panel raises on
**heartbeat age**, never on error count. An error is loud; silence is what costs orders.

**Webhook fragility is mostly a *default*, and we self-host, so we configure it away.**
*(Correction, 2026-07-27 — owner caught this; an earlier draft treated "zero retries, permanently
disabled after 5 failures" as a fixed property of WooCommerce. It is not.)*
- Auto-disable is a **filter, not a constant**: `apply_filters('woocommerce_max_webhook_delivery_failures', 5)`.
  An mu-plugin returning a high value **removes the silent-permanent-disable landmine entirely.**
- Core fires an action after each delivery attempt → we can **re-queue failures through Action
  Scheduler with backoff**, i.e. our own retry policy. Since we're writing `darling-checkout` anyway,
  we may skip core webhooks and own the outbound queue outright.
- The short delivery timeout is filterable too, but the correct fix is receiver-side: **return 200
  immediately, process async** (the panel's receiver already does this).
⇒ `webhook_disabled` monitoring drops from *load-bearing* to **belt-and-braces**. Still worth having
(`GET /wp-json/wc/v3/webhooks` exposes `status: active|paused|disabled`), but nobody should design
around a constraint we removed.
⚠️ **Our own retries make idempotency MORE necessary, not less** — retrying means duplicate
deliveries *by design*, so the receiver needs a delivery-id key regardless. That requirement stands.
📋 **Verify the exact filter name and defaults against the WooCommerce version we actually deploy**,
not anyone's recollection. Cheap to test; this project has twice paid for trusting memory over the
live system.

### 4.2 Push/poll split — use Woo's core webhooks, don't hand-roll the queue
*(Settled 2026-07-27. An earlier note suggested owning the outbound queue in `darling-checkout`
since we're writing it anyway; that was **retracted** — making the poller the guarantee inverts the
argument.)*

| Events | Transport | Why |
|---|---|---|
| orders · refunds · customers | **Woo core webhooks** (failure threshold raised) | Push is *only* latency optimisation now, so it must be **cheap, not reliable** |
| cart / abandoned-cart | **`darling-checkout`, our shape** | No core topic exists — this is why the third-party-plugin route existed |
| correctness for all of it | **the poller** | §0 principle 4 |

- Once the reconciler is the guarantee, a silently dead webhook downgrades from *lost orders* to
  *orders appear a few minutes late* — nuisance, not incident. Core webhooks' weaknesses only bite
  if they're load-bearing, and they aren't.
- Hand-rolling means writing **and then maintaining** queue, backoff, dead-letter, HMAC and delivery
  logging — duplicating what Woo already ships, security-patches, and provides a wp-admin delivery
  log for. A poor trade for a component we've deliberately designed to be allowed to fail.
- 🎯 **The clincher is payload shape.** Core webhooks deliver the **same WC REST order object the
  polling API returns**, so **one normalisation function serves both push and poll and they cannot
  drift.** Hand-rolling gives two shapes for the same order — exactly how a subtle field mismatch
  survives testing and surfaces as a mis-booked total. Especially unwelcome sitting next to a
  `total_mismatch` guard that already needs re-tuning for Woo's discount/shipping/tax handling.
- Receiver detail, cheap now and annoying later: **our cart events use the same
  `x-wc-webhook-signature` scheme as core**, so the panel has ONE verification path, not two.

**Do not build a second issues system.** The panel already has `ProcessingIssue` — deduped by
(source, kind, order_ref) so a retry storm bumps a counter instead of spamming rows, with a nav
badge, a Home strip and a Проблеми page where staff resolve items. Every anomaly here becomes a
new `kind` + Bulgarian message: `webhook_disabled`, `poller_stale`, `order_missing_in_barsy`,
`backup_stale`. Hours, not days — and staff have one place to look.

**Page the owner for very little.** Phone only for: **shop down · payments failing · orders not
booking**. Everything else is a panel badge. Alert fatigue is how monitoring dies, and a
maintenance person who is not a pager can afford *fewer* false alarms than a human on-call, not more.

**Backups: surface the restore-*test* date, not the backup date.** An untested backup is a belief,
not a backup. The restore drill writes a timestamp the panel reads and lets go stale visibly —
otherwise "we have backups" quietly means "we have files we've never opened".

---

## 5. Decisions needed from the owner

1. **English at launch, or Bulgarian first?** Deferring EN saves ~$198/yr and simplifies Phase 1–2
   considerably. The market is Bulgaria; EN can be added later without rework if we plan for it.
2. **Payment gateway** — myPOS (fast, 1.30% + €0.10) vs Borica through the existing bank
   (potentially ~1.2% with €0 fixed, funds direct to the company account, but 2–6 weeks and
   Apple Pay is doubtful). **Start the application in Phase 0 regardless — it's the long pole.**
3. **VPS**: provision a second Contabo box, or size up and isolate differently?

## 6. Open risks

| Risk | Mitigation |
|---|---|
| Woo webhooks unreliable *(largely a default we configure — §4.1)* | Poller is the guarantee; core webhooks kept as cheap latency optimisation (§4.2) |
| 🚨 **Double-booking created BY the belt-and-braces design** — push books an order, its ack is lost, the poll sees it unbooked and books it again → two Barsy sales, two decrements, two бона | Idempotency keyed on **Woo order id**, claimed **atomically** (never check-then-act). Discovered in production, not review, if missed |
| 🚨 **Reconciliation covers only one direction.** "In Woo but not in Barsy" is the easy half — an order **trashed in WP admin** stops appearing in the poll, so we conclude nothing happened while Barsy holds a booked sale | Either a reverse sweep (Barsy-booked orders that no longer exist in Woo) **or** a hard operational rule that orders are never trashed. Decide in Phase 4 |

---

## 7. Security & ops backlog — carried items, so nothing is lost

Small, cheap-now/awkward-later items. Owner column = who does it.

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | 🔐 **Pin the SSH host key in CI instead of `ssh-keyscan`.** The panel workflow runs `ssh-keyscan -H "$SERVER_HOST" >> known_hosts` **on every run** — trust-on-first-use *every time*, so a MITM at deploy time would be undetected and the deploy would ship a `.env`-bearing container to whatever answered. Fix: store the host key in a `SERVER_SSH_HOST_KEY` secret and write that to `known_hosts`. Panel box key (read from inside the box, not scanned): fingerprint `SHA256:DTTn2wbXWDRgKZSgYrAzctXBMUeOxdl2jn2Bnu4cTzA`. Do the same for the Woo box when its CI lands. | panel session (2-line workflow edit) | ⏳ key supplied |
| 2 | ✅ **Forced command on the panel CI key** — `restrict,command="bash /home/darling/product-review/admin-panel/deploy.sh"`. A stolen CI key can now only run the deploy, not get a shell. | me | ✅ done 2026-07-30, awaiting panel's manual-dispatch re-verify |
| 3 | **Forced command on the Woo CI key** — currently `restrict` only; add `command="…deploy.sh"` once the Woo deploy script exists. | me, Phase 0 | ⏳ |
| 4 | **Lower the apex TTL to ~300s** *before* cutover, so DNS propagation is minutes not hours. | owner | ⏳ |
| 5 | **Cutover DNS**: apex A `23.227.38.65` → `169.58.89.40`; `www` CNAME `shops.myshopify.com` → the box (or 301 www→apex in nginx); retire `staging`; **leave MX and `panel` alone**. | owner, Phase 7 | ⏳ |
| 6 | **Verify the WooCommerce webhook filter names/defaults against the version we actually deploy** (`woocommerce_max_webhook_delivery_failures` etc.) — not from anyone's recollection. | me, Phase 4 | ⏳ |
| 7 | **Surface the restore-*test* date** (not the backup date) in the panel, and let it go stale visibly. | me + panel | ⏳ |
| 8 | **Pre-launch cleanup** — delete `TEST-STOOL-001`, test orders #1001–#1006, test customers. ⚠️ Do **not** delete the look-alike production config: Barsy article `DELIVERY`/11365, paymethod 6 „Наложен платеж", the company ЕИК/МОЛ or Speditors entries. | Hermes owns the list | ⏳ |
| 9 | **Accountant signs off the Н-18 / СУПТО position** for the new stack before go-live. | owner | ⏳ |
| 9a | 🚨 **DECLARE THE E-SHOP WITH НАП BEFORE TRADING STARTS — hard legal prerequisite (чл. 52м, ал. 1).** Submitted through the НАП portal; declared content includes payment methods, virtual-POS contract + terminal number, receiving accounts and QR. Returns a **unique e-shop identifier** (чл. 52т, ал. 1). Changes must be reported within **7 days**. Form referenced as Приложение 33 / e-service „Информация, подавана от лице по чл. 3" — confirm the current annex number. **Nothing we build touches this; the shop must not open without it.** | owner | ⏳ |
| 9b | **Resolve the regime contradiction:** бон-at-packing (default regime, no monthly filing) and the Приложение 38 monthly XML (чл. 3, ал. 17 alternative regime) are **alternatives, not additives**. The accountant has asked for the monthly XML, which implies the alternative regime — but the бон-at-packing design implies the default one. Ask him which regime Дарлинг is actually on, because only one of the two obligations applies. | owner + accountant | ⏳ |
| 9c | **Confirm whether Darling's fiscal receipts print a УНП.** A УНП is only printed by declared СУПТО software; its presence or absence is the practical tell for which regime the business is in. No fiscal device is connected yet, so nothing prints today. | owner + Lukanet | ⏳ |
| 9d | 🚨 **Ask the accountant the CONSEQUENCE question, not just the file question: "if we move to чл. 3, ал. 17, does the бон-at-packing step go away?"** Hermes's point: electing the alternative regime does not merely add a monthly XML — it **invalidates the бон-at-packing design**, because the чл. 3, ал. 17 document is issued *instead of* a fiscal receipt. So this changes the finalise flow in the connector, not just a reporting output. Better answered before the Woo connector port than after. | owner + accountant | ⏳ |
| 10 | **Add `restrict` + forced command thinking to any future deploy key** — pattern is now established on both boxes. | me | ✅ pattern set |
| 11 | **`SERVER_SSH_KEY` can still run the deploy from anywhere GitHub Actions runs.** The forced command bounds what it can *do* (the important half), but the key itself isn't origin-bound. Accepted risk for a two-VPS shop; revisit if CI ever handles more. | — | 📌 accepted, logged |
| 12 | **Nothing verifies the deployed image is what CI tested** — the box rebuilds from source rather than promoting a CI-built artifact. The remaining "trust the pipeline" gap. Not worth solving at this scale, but catalogued rather than forgotten. | — | 📌 accepted, logged |
| 13a | 📌 **ACCEPTED RISK (owner, 2026-07-30): no external monitor for the both-boxes-down case.** Reasoning: both down almost certainly means a Contabo-wide incident, which Contabo notifies about; the boxes get brought back as soon as possible. Two caveats recorded, not objections: (a) Contabo notifies about *infrastructure* incidents, but an **account/billing suspension** also takes both boxes down and arrives as a different kind of email — worth not filtering Contabo mail; (b) **changes applied to both boxes at once are themselves a correlated risk** (today's SSH hardening touched both), mitigated by continuing to test on the Woo box before the panel. A **DNS/registrar failure at SuperHosting** is *not* in this gap — peer-check resolves by hostname and alerts by email, so it would be caught. | owner | 📌 accepted |
| 13 | **Ops/health surfaces in the panel must hang off the new system-authority guard** (`current_sysadmin` backend / `canSystem(me)` frontend), not business roles — the panel now separates system access from Barsy-manager business authority. | me + panel, when §4.1 monitoring lands | ⏳ |

**Note on item 1 (host-key pinning) — ✅ DONE 2026-07-30.** `ssh-keyscan` removed from the panel workflow; `SERVER_SSH_HOST_KEY` secret now written straight to `known_hosts`. The panel session verified the key I supplied **two independent ways** before trusting it (`ssh-keygen -l` on the supplied line, plus its own independent `ssh-keyscan`), both matching `SHA256:DTTn2wbXWDRgKZSgYrAzctXBMUeOxdl2jn2Bnu4cTzA` — sensible, since *"here is the host key, trust me"* is exactly what an attacker would say. Verified green by real deploy run 30519660082. The rebuild-mismatch caveat lives **in a workflow comment**, not just here: a rebuilt box fails with a host-key mismatch, that is CORRECT, and it must **not** be "fixed" by restoring `ssh-keyscan` — replacement key comes from `/etc/ssh/ssh_host_ed25519_key.pub` on the box.
| Oversell race under concurrency | Reservation on (`hold_stock_minutes` set), backorders off, ERP reconciliation |
| WordPress attack surface | Minimal plugin count (we build our own), 2FA, WAF, auto-updates, staging |
| Storno still unproven | Unchanged by platform — waits on the fiscal device |
| Catalogue (9,385 products, no categories) | The actual blocker; proceeds in parallel, platform-agnostic |
