/**
 * Sprint 20 gate: checkout i18n + shipping order, on the LIVE site.
 * Read-only against the money path: no order is placed; cart emptied after.
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/sprint20';
const LIVE = 'https://darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({ locale: 'bg-BG', viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(LIVE + '/?g20=1', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const r = await fetch('/wp-json/wc/store/v1/cart', { credentials: 'same-origin' });
      const nonce = r.headers.get('nonce');
      const c = await r.json();
      if (!c.items.length) {
        await fetch('/wp-json/wc/store/v1/cart/add-item', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Nonce: nonce },
          body: JSON.stringify({ id: 11, quantity: 1 })
        });
      }
    });
    await page.goto(LIVE + '/checkout/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    // rates only render once a deliverable address exists
    const fill = async (sel, val) => {
      const el = page.locator(sel).first();
      if (await el.count()) { await el.fill(val).catch(() => {}); }
    };
    await fill('#email', 'gate20@darling-gate.invalid');
    await fill('#billing-first_name, #shipping-first_name', 'Гейт');
    await fill('#billing-last_name, #shipping-last_name', 'Проверов');
    await fill('#billing-address_1, #shipping-address_1', 'ул. Тестова 1');
    await fill('#billing-city, #shipping-city', 'Свищов');
    await fill('#billing-postcode, #shipping-postcode', '5250');
    const prov = page.locator('#billing-state, #shipping-state, select[id*="state"]').first();
    if (await prov.count()) { await prov.selectOption('BG-04').catch(() => {}); }
    await page.waitForTimeout(7000);
    const body = await page.evaluate(() => document.body.innerText);
    out.checks.i18n = {
      no_place_order_en: !/Place Order/.test(body),
      porachai: /Поръчай/.test(body),
      no_contact_info_en: !/Contact information/.test(body),
      danni: /Данни за контакт/.test(body),
      no_payment_options_en: !/Payment options/.test(body),
      nachin: /Начин на плащане/.test(body),
      no_express_en: !/Express Checkout/.test(body),
      no_guest_en: !/checking out as a guest/.test(body),
      no_same_addr_en: !/Use same address for billing/.test(body),
      no_phone_en: !/Phone \(optional\)/.test(body),
      oblast: /Област/.test(body) && !/Щат\/Област/.test(body),
    };
    out.checks.ship_order = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.wc-block-components-shipping-rates-control label'))
        .map(l => l.textContent.replace(/\s+/g, ' ').trim()).filter(t => /€/.test(t));
      return labels.slice(0, 4);
    });
    await page.screenshot({ path: path.join(OUT, 'checkout-polish.png'), fullPage: true });
    // empty cart
    await page.evaluate(async () => {
      const r = await fetch('/wp-json/wc/store/v1/cart', { credentials: 'same-origin' });
      const nonce = r.headers.get('nonce'); const c = await r.json();
      for (const it of c.items) {
        await fetch('/wp-json/wc/store/v1/cart/remove-item', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Nonce: nonce },
          body: JSON.stringify({ key: it.key })
        });
      }
    });
    const I = out.checks.i18n;
    const first = (out.checks.ship_order[0] || '');
    const prices = out.checks.ship_order.map(l => parseFloat((l.match(/€\s?([\d.,]+)/) || [])[1] || '99'));
    const sorted = prices.every((p, i) => i === 0 || p >= prices[i - 1]);
    out.checks.cheapest_first = { first: first.slice(0, 50), sorted };
    const pass = Object.values(I).every(Boolean) && out.checks.ship_order.length >= 4 && sorted;
    out.verdict = pass ? 'GATE: PASS' : 'GATE: FAIL';
  } catch (e) {
    out.error = String(e.message || e).slice(0, 400);
    out.verdict = 'GATE: ERROR';
  } finally {
    console.log(JSON.stringify(out, null, 1));
    await b.close();
  }
})();
