/**
 * An office delivery must not be orderable without an office.
 *
 * Test order 13 was paid for by card with `darling_office_id` empty and the
 * shipping mode set to "до офис". The connector cannot build a waybill from that,
 * so it fails at fulfilment — after the customer has paid, which is the most
 * expensive place to find out.
 *
 * This asserts the negative case, which is the one that was broken. A test that
 * only checks a valid order succeeds would have passed happily all along.
 *
 * Run:  STAGING_PASS=… node tests/office-required.spec.js
 */
const { chromium } = require('playwright');

const BASE = 'https://staging.darlinghome.bg';
const PRODUCT_ID = process.env.PRODUCT_ID || '11';
const ADDRESS = {
  country: 'BG', state: 'BG-04', city: 'Свищов', postcode: '5250',
  address_1: 'ул. Цар Освободител 1', first_name: 'Тест', last_name: 'Поръчка',
  phone: '0888123456',
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
    await page.goto(`${BASE}/checkout/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    // COD deliberately: it settles server-side with no card involved, so the only
    // thing that can reject the order is our own validation.
    out.result = await page.evaluate(async ({ addr }) => {
      const n = await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } });
      const nonce = n.headers.get('nonce') || '';
      const H = { 'Content-Type': 'application/json', Nonce: nonce };

      await fetch('/wp-json/wc/store/v1/cart/update-customer', {
        method: 'POST', headers: H,
        body: JSON.stringify({ shipping_address: addr, billing_address: { ...addr, email: 'wootest@example.com' } }),
      });

      // Force the OFFICE rate, then submit with no office id.
      const cart = await (await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } })).json();
      const pkg = (cart.shipping_rates || [])[0];
      const officeRate = (pkg?.shipping_rates || []).find(r => /:office$/.test(r.rate_id));
      if (!officeRate) return { step: 'no office rate offered' };

      await fetch('/wp-json/wc/store/v1/cart/select-shipping-rate', {
        method: 'POST', headers: H,
        body: JSON.stringify({ package_id: pkg.package_id, rate_id: officeRate.rate_id }),
      });

      const r = await fetch('/wp-json/wc/store/v1/checkout', {
        method: 'POST', headers: H,
        body: JSON.stringify({
          billing_address: { ...addr, email: 'wootest@example.com' },
          shipping_address: addr,
          payment_method: 'cod',
          additional_fields: { 'darling/office-id': '' },   // <-- the bug
        }),
      });
      const body = await r.json();

      // CONTROL: the same request with a REAL office must still succeed. A rule
      // that rejects everything would "pass" the negative test while making
      // checkout impossible — a worse bug than the one being fixed.
      const off = await (await fetch('/wp-json/darling/v1/offices?carrier=econt&city=' + encodeURIComponent(addr.city))).json();
      const realId = (off.offices || [])[0]?.id || '';
      let control = { skipped: 'no office found' };
      if (realId) {
        const r2 = await fetch('/wp-json/wc/store/v1/checkout', {
          method: 'POST', headers: H,
          body: JSON.stringify({
            billing_address: { ...addr, email: 'wootest@example.com' },
            shipping_address: addr,
            payment_method: 'cod',
            additional_fields: { 'darling/office-id': String(realId) },
          }),
        });
        const b2 = await r2.json();
        control = { officeId: String(realId), status: r2.status, orderId: b2.order_id || null,
                    message: (b2.message || '').slice(0, 120) };
      }

      return {
        rateChosen: officeRate.rate_id,
        status: r.status,
        code: body.code || null,
        message: (body.message || '').slice(0, 160),
        detail: body.data ? JSON.stringify(body.data).slice(0, 300) : null,
        orderId: body.order_id || null,
        control,
      };
    }, { addr: ADDRESS });

    const s = out.result.status;
    out.verdict = out.result.orderId
      ? `FAIL — order ${out.result.orderId} was created with no office chosen`
      : (s >= 400 ? `PASS — rejected (HTTP ${s}): ${out.result.message}` : `INCONCLUSIVE — HTTP ${s}`);
  } catch (e) {
    out.error = String(e.message || e).slice(0, 220);
  } finally {
    console.log(JSON.stringify(out, null, 2));
    await browser.close();
  }
})();
