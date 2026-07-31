/**
 * Does the DISPLAYED shipping price follow the chosen payment method?
 *
 * Our courier fee depends on cash-on-delivery, so the price a customer is shown
 * must change when they switch between COD and card. The server-side fix (adding
 * the COD flag to the shipping package hash) makes the recalculation correct —
 * but only if the browser actually tells the server the payment method changed.
 *
 * Block checkout keeps a lot of state client-side, so this is not safe to assume:
 * if the payment method only reaches the server at submit, the customer sees one
 * price and is charged another. That is a consumer-law problem, not just a bug.
 *
 * Run:  STAGING_PASS=… node tests/cod-repricing.spec.js
 */
const { chromium } = require('playwright');

const BASE = 'https://staging.darlinghome.bg';
const PRODUCT_ID = process.env.PRODUCT_ID || '11';

// Свищов is in Веliko Tarnovo province. WooCommerce REQUIRES a Bulgarian province,
// and without it no rates are calculated at all — which looks exactly like broken
// shipping rather than an incomplete address.
const ADDRESS = {
  country: 'BG', state: 'BG-04', city: 'Свищов', postcode: '5250',
  address_1: 'ул. Цар Освободител 1', first_name: 'Тест', last_name: 'Поръчка',
};

const econtOffice = (pkgs) => {
  for (const p of pkgs || []) {
    for (const r of p.shipping_rates || []) {
      if (r.rate_id === 'darling_econt:office') return r.price / 100;
    }
  }
  return null;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: 'bg-BG', viewport: { width: 1280, height: 1600 },
    httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' },
  });
  const page = await ctx.newPage();
  const out = {};

  try {
    await page.goto(`${BASE}/?add-to-cart=${PRODUCT_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.goto(`${BASE}/checkout/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    // Establish the destination via the Store API so the test does not depend on
    // guessing which rendered input is which.
    out.addressSet = await page.evaluate(async (addr) => {
      const n = await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } });
      const nonce = n.headers.get('nonce') || '';
      const r = await fetch('/wp-json/wc/store/v1/cart/update-customer', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Nonce: nonce },
        body: JSON.stringify({ shipping_address: addr, billing_address: addr }),
      });
      return r.status;
    }, ADDRESS);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);

    const readRate = () => page.evaluate(async () => {
      const r = await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } });
      const c = await r.json();
      for (const p of c.shipping_rates || []) {
        for (const x of p.shipping_rates || []) {
          if (x.rate_id === 'darling_econt:office') return x.price / 100;
        }
      }
      return null;
    });

    // What the PAGE shows the customer, not just what the API holds — these are
    // allowed to disagree, and the disagreement is the whole point of the test.
    const readShown = () => page.evaluate(() => {
      const t = document.body.innerText || '';
      const m = t.match(/Еконт\s*—\s*до офис[^\d]{0,20}([\d.,]+)/);
      return m ? parseFloat(m[1].replace(',', '.')) : null;
    });

    // Select by radio VALUE, not by label text. Stripe's block renders the generic
    // label "Payment methods", so a text match silently selected nothing and the
    // test reported a confident FAIL having never switched payment method at all.
    const pick = async (value) => {
      const r = page.locator(`input[type="radio"][value="${value}"]`).first();
      if (!(await r.count())) return null;
      await r.check({ force: true, timeout: 8000 }).catch(async () => {
        await r.click({ force: true, timeout: 8000 }).catch(() => {});
      });
      return (await r.isChecked().catch(() => false)) ? value : `${value} (click did not stick)`;
    };

    out.picked_cod = await pick('cod');
    await page.waitForTimeout(6000);
    out.cod = { api: await readRate(), shown: await readShown() };

    out.picked_card = await pick('stripe');
    await page.waitForTimeout(6000);
    out.card = { api: await readRate(), shown: await readShown() };

    await page.screenshot({ path: 'tests/cod-repricing.png' }).catch(() => {});

    const c = out.cod.api, k = out.card.api;
    out.verdict =
      (c === null || k === null) ? 'INCONCLUSIVE — rate not found'
      : (c > k) ? `PASS — COD ${c.toFixed(2)} > card ${k.toFixed(2)}; the browser does re-price`
      : (c === k) ? `FAIL — both ${c.toFixed(2)}; payment method does NOT reach the server before submit`
      : `FAIL — card ${k.toFixed(2)} > COD ${c.toFixed(2)}, inverted`;

    if (out.cod.shown !== null && out.cod.api !== null && Math.abs(out.cod.shown - out.cod.api) > 0.005) {
      out.warning = `DISPLAYED ${out.cod.shown} != API ${out.cod.api} — customer is shown a price that is not the one in the cart`;
    }
  } catch (e) {
    out.error = String(e.message || e).slice(0, 200);
  } finally {
    console.log(JSON.stringify(out, null, 2));
    await browser.close();
  }
})();
