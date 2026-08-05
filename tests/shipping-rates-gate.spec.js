/**
 * Sprint gate: checkout wired to the panel shipping-rates table.
 *
 * Asserts the EXACT panel matrix at 2kg (verified panel-side 2026-08-05):
 *   prepaid: speedy office 3.94 / speedy door 6.69 / econt office 8.69 / econt door 9.95
 *   cod:     4.42 / 7.17 / 10.28 / 11.54
 *
 * Since aad4e3a the block checkout's PRESELECTED Наложен платеж reaches the
 * session, so the FIRST render correctly shows COD prices (closing the old
 * "first render shows prepaid" display gap). Flow asserted here:
 *   first render = COD → pick card = prepaid (API + rendered DOM converge)
 *   → pick COD again = COD (API + DOM converge)
 * plus: free over EUR 77, and no rates without a city.
 *
 * Run:  STAGING_PASS=… node gate7.js
 */
const { chromium } = require('playwright');

const BASE = 'https://staging.darlinghome.bg';
const ADDRESS = {
  country: 'BG', state: 'BG-04', city: 'Свищов', postcode: '5250',
  address_1: 'ул. Цар Освободител 1', first_name: 'Тест', last_name: 'Поръчка',
};
const EXPECT_PREPAID = { 'darling_speedy:office': 3.94, 'darling_speedy:door': 6.69, 'darling_econt:office': 8.69, 'darling_econt:door': 9.95 };
const EXPECT_COD     = { 'darling_speedy:office': 4.42, 'darling_speedy:door': 7.17, 'darling_econt:office': 10.28, 'darling_econt:door': 11.54 };

async function newCheckout(browser, qty) {
  const ctx = await browser.newContext({
    locale: 'bg-BG', viewport: { width: 1280, height: 1600 },
    httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?add-to-cart=11&quantity=${qty}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  return { ctx, page };
}

const setAddress = (page) => page.evaluate(async (addr) => {
  const n = await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } });
  const nonce = n.headers.get('nonce') || '';
  const r = await fetch('/wp-json/wc/store/v1/cart/update-customer', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Nonce: nonce },
    body: JSON.stringify({ shipping_address: addr, billing_address: addr }),
  });
  return r.status;
}, ADDRESS);

const readRates = (page) => page.evaluate(async () => {
  const r = await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } });
  const c = await r.json();
  const out = {};
  for (const p of c.shipping_rates || []) {
    for (const x of p.shipping_rates || []) {
      out[x.rate_id] = { price: x.price / 100, name: x.name };
    }
  }
  return out;
});

function match(actual, expected) {
  const diffs = [];
  for (const [id, price] of Object.entries(expected)) {
    const a = actual[id];
    if (!a) { diffs.push(`${id}: MISSING`); continue; }
    if (Math.abs(a.price - price) > 0.005) diffs.push(`${id}: got ${a.price} want ${price}`);
  }
  for (const id of Object.keys(actual)) {
    if (id.startsWith('darling_') && !(id in expected)) diffs.push(`${id}: UNEXPECTED (${actual[id].price})`);
  }
  return diffs;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    // ---- A: 2kg matrix — first render (COD preselected), card, back to COD ----
    const { page } = await newCheckout(browser, 2);
    out.checks.addressSet = await setAddress(page);
    await page.goto(`${BASE}/checkout/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);

    const first = await readRates(page);
    out.checks.first_render_cod = { rates: first, diffs: match(first, EXPECT_COD) };

    // Retry the pick: the display-sync refetch can remount the payment block
    // mid-click, so a single attempt can land on a node being replaced.
    const pick = async (value) => {
      for (let i = 0; i < 4; i++) {
        const r = page.locator(`input[type="radio"][value="${value}"]`).first();
        if (!(await r.count())) { await page.waitForTimeout(1500); continue; }
        await r.check({ force: true, timeout: 8000 }).catch(async () => { await r.click({ force: true, timeout: 8000 }).catch(() => {}); });
        await page.waitForTimeout(1200);
        if (await page.locator(`input[type="radio"][value="${value}"]`).first().isChecked().catch(() => false)) return 'ok';
      }
      return `${value}: did not stick after retries`;
    };
    const waitRates = async (rateId, notPrice, ms = 25000) => {
      const t0 = Date.now();
      let cur = null;
      while (Date.now() - t0 < ms) {
        cur = await readRates(page);
        if (cur[rateId] && Math.abs(cur[rateId].price - notPrice) > 0.005) return cur;
        await page.waitForTimeout(1200);
      }
      return cur;
    };
    const shownSpeedyOffice = () => page.evaluate(() => {
      const m = (document.body.innerText || '').match(/Спиди\s*—\s*до офис[^\d]{0,24}([\d.,]+)/);
      return m ? parseFloat(m[1].replace(',', '.')) : null;
    });
    // The RENDERED price must converge to the API price — poll, because React
    // re-renders a beat after the totals response lands.
    const shownConverges = async (want, ms = 15000) => {
      const t0 = Date.now(); let s = null;
      while (Date.now() - t0 < ms) {
        s = await shownSpeedyOffice();
        if (s !== null && Math.abs(s - want) < 0.005) return { converged: true, shown: s };
        await page.waitForTimeout(1000);
      }
      return { converged: false, shown: s };
    };

    await page.waitForSelector('input[type="radio"][value="cod"]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);

    out.checks.pick_card = await pick('stripe');
    const cardRates = await waitRates('darling_speedy:office', first['darling_speedy:office'] ? first['darling_speedy:office'].price : -1);
    out.checks.card = { rates: cardRates, diffs: match(cardRates, EXPECT_PREPAID) };
    out.checks.card_shown = await shownConverges(EXPECT_PREPAID['darling_speedy:office']);

    await page.waitForTimeout(4000); // let the display-sync refetches settle
    out.checks.pick_cod = await pick('cod');
    const codRates = await waitRates('darling_speedy:office', cardRates && cardRates['darling_speedy:office'] ? cardRates['darling_speedy:office'].price : -1);
    out.checks.cod = { rates: codRates, diffs: match(codRates, EXPECT_COD) };
    out.checks.cod_shown = await shownConverges(EXPECT_COD['darling_speedy:office']);
    await page.screenshot({ path: 'C:/Users/lora_/darling/_scratch_woo/wire/gate7-checkout.png' }).catch(() => {});

    // ---- B: free over 77 ----
    const b = await newCheckout(browser, 6); // 6 × 13.50 = 81.00
    await setAddress(b.page);
    await b.page.goto(`${BASE}/checkout/`, { waitUntil: 'domcontentloaded' });
    await b.page.waitForTimeout(9000);
    const freeRates = await readRates(b.page);
    const freeDiffs = [];
    for (const [id, r] of Object.entries(freeRates)) {
      if (!id.startsWith('darling_')) continue;
      if (r.price !== 0) freeDiffs.push(`${id}: price ${r.price}, want 0`);
      if (!/безплатна/.test(r.name)) freeDiffs.push(`${id}: label lacks (безплатна): ${r.name}`);
    }
    if (!Object.keys(freeRates).some(k => k.startsWith('darling_'))) freeDiffs.push('no darling rates at all');
    out.checks.free_over = { rates: freeRates, diffs: freeDiffs };

    // ---- C: no city -> no rates ----
    const c = await newCheckout(browser, 1);
    const noCity = await readRates(c.page);
    out.checks.no_city = { leak: Object.keys(noCity).filter(k => k.startsWith('darling_')) };

    const all =
      out.checks.first_render_cod.diffs.length === 0 &&
      out.checks.card.diffs.length === 0 &&
      out.checks.card_shown.converged &&
      out.checks.cod.diffs.length === 0 &&
      out.checks.cod_shown.converged &&
      out.checks.free_over.diffs.length === 0 &&
      out.checks.no_city.leak.length === 0;
    out.verdict = all ? 'GATE: PASS' : 'GATE: FAIL';
  } catch (e) {
    out.error = String(e.message || e).slice(0, 300);
    out.verdict = 'GATE: ERROR';
  } finally {
    console.log(JSON.stringify(out, null, 1));
    await browser.close();
  }
})();
