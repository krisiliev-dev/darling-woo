/**
 * Verify the checkout actually renders: live courier rates, the invoice fields,
 * and the progressively-enhanced office picker.
 *
 * Run:  node tests/checkout-picker.spec.js
 * Needs: STAGING_PASS env var (nginx basic-auth password for staging).
 */
const { chromium } = require('playwright');

const BASE = 'https://staging.darlinghome.bg';
const PASS = process.env.STAGING_PASS || '';
const PRODUCT_ID = process.env.PRODUCT_ID || '11';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: 'bg-BG',
    viewport: { width: 1280, height: 1600 },
    httpCredentials: { username: 'darling', password: PASS },
  });
  const page = await ctx.newPage();
  const out = {};
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 120)));

  try {
    // --- get a product into the cart ---
    // Use WooCommerce's add-to-cart URL rather than clicking: block themes render
    // the button differently and a markup-dependent click made this test lie
    // (checkout silently redirected to /cart/ with an empty cart).
    await page.goto(`${BASE}/?add-to-cart=${PRODUCT_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    out.cartCount = await page.evaluate(async () => {
      const r = await fetch('/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } });
      const c = await r.json();
      return c.items_count;
    });
    if (!out.cartCount) { throw new Error('cart still empty after add-to-cart'); }

    // --- checkout ---
    await page.goto(`${BASE}/checkout/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    out.url = page.url();

    out.assets = await page.evaluate(() => ({
      pickerScript: !!document.querySelector('script[src*="office-picker.js"]'),
      configPresent: typeof window.DarlingOffice !== 'undefined',
      endpoint: window.DarlingOffice ? window.DarlingOffice.endpoint : null,
      tokenLeaked: /98bbd7/.test(document.documentElement.innerHTML),
    }));

    out.fields = await page.evaluate(() => {
      const t = document.body.innerText || '';
      return {
        officeInput: !!document.querySelector('[data-darling-office="1"]'),
        invoiceCheckbox: /Искам фактура за фирма/i.test(t),
        eikField: /ЕИК/i.test(t),
        gpsrOrDual: /лв\./.test(t),
      };
    });

    // --- fill a Bulgarian address so shipping can be priced ---
    for (const [sel, val] of [
      ['input[id*="email" i]', 'darling7.sv+wootest@gmail.com'],
      ['input[id*="first" i]', 'Тест'],
      ['input[id*="last" i]', 'Поръчка'],
      ['input[id*="address_1" i], input[id*="address-1" i]', 'ул. Цар Освободител 1'],
      ['input[id*="postcode" i]', '5250'],
      ['input[id*="city" i]', 'Свищов'],
    ]) {
      const el = page.locator(sel).first();
      if (await el.count()) await el.fill(val).catch(() => {});
    }
    await page.waitForTimeout(7000);

    out.shipping = await page.evaluate(() => {
      const t = document.body.innerText || '';
      const rates = (t.match(/(Еконт|Спиди)\s*—\s*до (офис|адрес)[^\n]*/g) || []).map(s => s.trim());
      return { rateCount: rates.length, rates: rates.slice(0, 4) };
    });

    // --- pick an office rate and see whether the picker appears ---
    const officeRate = page.locator('label:has-text("до офис"), input[type="radio"]').first();
    await officeRate.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(6000);

    out.picker = await page.evaluate(() => {
      const sel = document.getElementById('darling-office-select');
      return {
        selectRendered: !!sel,
        optionCount: sel ? sel.options.length : 0,
        firstOptions: sel ? [...sel.options].slice(0, 3).map(o => o.textContent.trim().slice(0, 40)) : [],
      };
    });

    await page.screenshot({ path: 'tests/checkout.png', fullPage: false }).catch(() => {});
    out.pageErrors = errors;
  } catch (e) {
    out.error = String(e.message || e).slice(0, 200);
    out.pageErrors = errors;
  } finally {
    console.log(JSON.stringify(out, null, 2));
    await browser.close();
  }
})();
