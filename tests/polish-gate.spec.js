/**
 * Slice 15 gate: polish.
 *  - hero band spans the full viewport at 1440px, no horizontal overflow,
 *    inner copy still constrained
 *  - /cart/ shows "/ X,XX лв." companions on line price + totals, and they
 *    survive a qty change (React re-render)
 *  - checkout smoke
 * Run:  STAGING_PASS=… node gate16.js
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice15';
const STAG = 'https://staging.darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({
      locale: 'bg-BG', viewport: { width: 1440, height: 900 },
      httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' }
    });
    const page = await ctx.newPage();

    // 1) hero geometry
    await page.goto(STAG + '/?g16=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    out.checks.hero = await page.evaluate(() => {
      const band = document.querySelector('.darling-hero-band');
      const inner = document.querySelector('.darling-hero--red');
      if (!band || !inner) { return { band: false }; }
      const rb = band.getBoundingClientRect(), ri = inner.getBoundingClientRect();
      return {
        band: true,
        left: Math.round(rb.left), right: Math.round(rb.right),
        vw: window.innerWidth,
        full_bleed: Math.round(rb.left) === 0 && Math.abs(Math.round(rb.right) - window.innerWidth) <= 1,
        inner_constrained: ri.width < rb.width || (ri.left > 20 && rb.left === 0) ||
          getComputedStyle(inner).maxWidth !== 'none',
        no_hscroll: document.documentElement.scrollWidth <= window.innerWidth,
        cherry: getComputedStyle(band).backgroundColor,
      };
    });
    await page.screenshot({ path: path.join(OUT, 'hero-fullbleed.png') });

    // 2) cart page dual currency — add item via Store API, then visit /cart/
    await page.evaluate(async () => {
      const r = await fetch('/wp-json/wc/store/v1/cart', { credentials: 'same-origin' });
      const nonce = r.headers.get('nonce');
      await fetch('/wp-json/wc/store/v1/cart/add-item', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Nonce: nonce },
        body: JSON.stringify({ id: 11, quantity: 1 })
      });
    });
    await page.goto(STAG + '/cart/?g16=2', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelectorAll('.wp-block-woocommerce-cart .wc-block-formatted-money-amount').length > 0,
      null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const cartState = () => page.evaluate(() => {
      const amounts = Array.from(document.querySelectorAll('.wp-block-woocommerce-cart .wc-block-formatted-money-amount'));
      const withBgn = amounts.filter(a => a.querySelector('.darling-bgn'));
      const sample = withBgn[0] ? withBgn[0].textContent : null;
      return {
        amounts: amounts.length,
        with_bgn: withBgn.length,
        all_have: amounts.length > 0 && amounts.every(a => a.querySelector('.darling-bgn') || /^0|^€?\s*0/.test(a.textContent)),
        sample,
        lv_format: withBgn.every(a => / \/ [\d\s.,]+ лв\./.test(a.textContent)),
      };
    });
    out.checks.cart = await cartState();
    await page.screenshot({ path: path.join(OUT, 'cart-dual.png'), fullPage: true });

    // qty + → re-render keeps companions
    await page.click('.wc-block-components-quantity-selector__button--plus');
    await page.waitForTimeout(3500);
    out.checks.cart_after_qty = await cartState();
    out.checks.qty_now = await page.evaluate(() =>
      (document.querySelector('.wc-block-components-quantity-selector__input') || {}).value || null);

    // cleanup cart
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

    // 3) checkout smoke (cart now empty → redirect)
    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const H = out.checks.hero, C = out.checks.cart, Q = out.checks.cart_after_qty;
    const pass =
      H.band && H.full_bleed && H.no_hscroll && H.inner_constrained &&
      C.amounts > 0 && C.with_bgn > 0 && C.lv_format &&
      Q.with_bgn > 0 && Q.lv_format && out.checks.qty_now === '2' &&
      out.checks.checkout_redirect;
    out.verdict = pass ? 'GATE: PASS' : 'GATE: FAIL';
  } catch (e) {
    out.error = String(e.message || e).slice(0, 400);
    out.verdict = 'GATE: ERROR';
  } finally {
    console.log(JSON.stringify(out, null, 1));
    await b.close();
  }
})();
