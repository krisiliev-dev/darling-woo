/** D2 retry: place the COD order with an enabled-wait on the button. */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/cutover';
const LIVE = 'https://darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({ locale: 'bg-BG', viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(LIVE + '/?gd2=1', { waitUntil: 'domcontentloaded' });
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
    await page.waitForTimeout(5000);
    const fill = async (sel, val) => {
      const el = page.locator(sel).first();
      if (await el.count()) { await el.fill(val).catch(() => {}); }
    };
    await fill('#email', 'gate-d@darling-gate.invalid');
    await fill('#billing-first_name, #shipping-first_name', 'Гейт');
    await fill('#billing-last_name, #shipping-last_name', 'Тестов');
    await fill('#billing-address_1, #shipping-address_1', 'ул. Тестова 1');
    await fill('#billing-city, #shipping-city', 'Свищов');
    await fill('#billing-postcode, #shipping-postcode', '5250');
    await fill('#billing-phone, #shipping-phone', '0893361670');
    const prov = page.locator('#billing-state, #shipping-state, select[id*="state"]').first();
    if (await prov.count()) { await prov.selectOption('BG-04').catch(() => {}); }
    await page.waitForTimeout(6000);
    // Office rates demand the office picker (correct guard) — take a door
    // rate for this gate; the office flow was E2E-gated pre-cutover.
    const door = page.locator('.wc-block-components-shipping-rates-control label:has-text("до адрес")').first();
    if (await door.count()) { await door.click().catch(() => {}); }
    await page.waitForTimeout(4000);
    // COD radio (id pattern radio-control-wc-payment-method-options-cod)
    const cod = page.locator('input[id*="payment-method"][value="cod"], input[value="cod"]').first();
    if (await cod.count()) { await cod.check({ force: true }).catch(() => {}); }
    await page.waitForTimeout(3500);
    // Wait for the place-order button to be enabled and settled
    const btn = page.locator('.wc-block-components-checkout-place-order-button');
    await page.waitForFunction(() => {
      const b2 = document.querySelector('.wc-block-components-checkout-place-order-button');
      return b2 && !b2.disabled && !b2.classList.contains('wc-block-components-button--loading');
    }, null, { timeout: 20000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    // If still on checkout after 8s, click once more (first click sometimes
    // only commits the focused field's validation pass).
    await page.waitForTimeout(8000);
    if (!/order-received/.test(page.url())) {
      out.checks.second_click = true;
      await btn.click().catch(() => {});
    }
    await page.waitForURL(/order-received/, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    out.checks.errors = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.wc-block-components-validation-error, .wc-block-store-notice.is-error'))
        .map(e => e.textContent.trim().slice(0, 80)).slice(0, 5));
    out.checks.order = {
      url: page.url().slice(0, 130),
      received: /order-received/.test(page.url()),
      thanks: await page.evaluate(() => /Благодарим|получена|приета/i.test(document.body.innerText)),
      total_dual: await page.evaluate(() => /лв\./.test(document.body.innerText)),
    };
    await page.screenshot({ path: path.join(OUT, 'd2b-received.png'), fullPage: true });
    const O = out.checks.order;
    out.verdict = (O.received && O.thanks) ? 'GATE: PASS' : 'GATE: FAIL';
  } catch (e) {
    out.error = String(e.message || e).slice(0, 400);
    out.verdict = 'GATE: ERROR';
  } finally {
    console.log(JSON.stringify(out, null, 1));
    await b.close();
  }
})();
