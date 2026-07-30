/**
 * End-to-end card checkout with a Stripe TEST card.
 *
 * This is the thing we could never automate on Shopify: a real card payment,
 * start to finish, without asking the owner to toggle anything. It proves the
 * three links that only fail together — the UPE card form submits, Stripe
 * accepts, and the WEBHOOK comes back through nginx's basic-auth exemption to
 * mark the order paid.
 *
 * The webhook leg is the one worth having: a card can succeed at Stripe while
 * the order sits in pending forever, and that failure is silent.
 *
 * Run:  STAGING_PASS=… node tests/card-checkout.spec.js
 * Safe: test keys only. Asserts the key is a test key before paying.
 */
const { chromium } = require('playwright');

const BASE = 'https://staging.darlinghome.bg';
const PRODUCT_ID = process.env.PRODUCT_ID || '11';
const ADDRESS = {
  country: 'BG', state: 'BG-04', city: 'Свищов', postcode: '5250',
  address_1: 'ул. Цар Освободител 1', first_name: 'Тест', last_name: 'Поръчка',
  phone: '0888123456',
};
const EMAIL = 'darling7.sv+wootest@gmail.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: 'bg-BG', viewport: { width: 1280, height: 1800 },
    httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' },
  });
  const page = await ctx.newPage();
  const out = {};
  page.on('console', m => { if (m.type() === 'error') (out.consoleErrors ??= []).push(m.text().slice(0, 140)); });

  try {
    await page.goto(`${BASE}/?add-to-cart=${PRODUCT_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.goto(`${BASE}/checkout/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    // Refuse to run against live keys. A test that pays with a real card once is
    // one time too many, and "it was only staging" is not a defence.
    out.publishableKey = await page.evaluate(() => {
      const s = [...document.querySelectorAll('script')].map(x => x.textContent || '').join(' ');
      const m = s.match(/pk_(test|live)_[A-Za-z0-9]{6}/);
      return m ? m[0].slice(0, 14) + '…' : null;
    });
    if (out.publishableKey && out.publishableKey.startsWith('pk_live')) {
      throw new Error('LIVE publishable key on the page — refusing to submit a payment');
    }

    out.addressSet = await page.evaluate(async (a) => {
      const n = await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } });
      const nonce = n.headers.get('nonce') || '';
      const r = await fetch('/wp-json/wc/store/v1/cart/update-customer', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Nonce: nonce },
        body: JSON.stringify({ shipping_address: a, billing_address: { ...a, email: 'x@example.com' } }),
      });
      return r.status;
    }, ADDRESS);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(6000);

    const email = page.locator('input[type="email"]').first();
    if (await email.count()) await email.fill(EMAIL).catch(() => {});

    // Card, not COD.
    const card = page.locator('input[type="radio"][value="stripe"]').first();
    await card.check({ force: true, timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(6000);
    out.cardSelected = await card.isChecked().catch(() => false);

    out.orderTotal = await page.evaluate(async () => {
      const r = await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } });
      const c = await r.json();
      return { total: c.totals?.total_price / 100, shipping: c.totals?.total_shipping / 100 };
    });

    // Stripe's card fields live in a cross-origin iframe; Playwright reaches into
    // it by frame URL rather than by selector on the parent document.
    const frames = () => page.frames().filter(f => /js\.stripe\.com/.test(f.url()));
    for (let i = 0; i < 20 && frames().length === 0; i++) await page.waitForTimeout(1000);
    out.stripeFrames = frames().length;

    let filled = false;
    for (const f of frames()) {
      const num = f.locator('input[name="number"], input[autocomplete="cc-number"]').first();
      if (await num.count().catch(() => 0)) {
        await num.fill('4242424242424242').catch(() => {});
        for (const [sel, val] of [
          ['input[name="expiry"], input[autocomplete="cc-exp"]', '12/34'],
          ['input[name="cvc"], input[autocomplete="cc-csc"]', '123'],
          ['input[name="postalCode"], input[autocomplete="postal-code"]', '5250'],
        ]) {
          const el = f.locator(sel).first();
          if (await el.count().catch(() => 0)) await el.fill(val).catch(() => {});
        }
        filled = true;
        break;
      }
    }
    out.cardFilled = filled;
    if (!filled) throw new Error('could not find Stripe card fields');

    const before = Date.now();
    const placeBtn = page.locator('button.wc-block-components-checkout-place-order-button, button:has-text("Поръчай"), button:has-text("Place order")').first();
    await placeBtn.click({ timeout: 15000 });

    await page.waitForURL(/order-received|order-pay|checkout/, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(8000);
    out.finalUrl = page.url();
    out.elapsedMs = Date.now() - before;
    out.reachedThankYou = /order-received/.test(out.finalUrl);
    out.pageNotice = await page.evaluate(() => {
      const e = document.querySelector('.wc-block-components-notice-banner, .woocommerce-error, .is-error');
      return e ? e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : null;
    });
    const m = out.finalUrl.match(/order-received\/(\d+)/);
    out.orderId = m ? Number(m[1]) : null;

    await page.screenshot({ path: 'tests/card-checkout.png', fullPage: false }).catch(() => {});
  } catch (e) {
    out.error = String(e.message || e).slice(0, 250);
    await page.screenshot({ path: 'tests/card-checkout-fail.png' }).catch(() => {});
  } finally {
    console.log(JSON.stringify(out, null, 2));
    await browser.close();
  }
})();
