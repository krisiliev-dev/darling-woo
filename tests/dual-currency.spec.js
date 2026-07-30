/**
 * Verify EUR/BGN dual display in the BLOCK cart and checkout — and that the
 * arithmetic is right. A wrong conversion in a legally-required display is
 * worse than no conversion.
 */
const { chromium } = require('playwright');
const BASE = 'https://staging.darlinghome.bg';
const RATE = 1.95583;

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({
    locale: 'bg-BG', viewport: { width: 1280, height: 1400 },
    httpCredentials: { username: 'darling', password: process.env.STAGING_PASS },
  })).newPage();
  const out = {};
  try {
    await p.goto(`${BASE}/?add-to-cart=${process.env.PRODUCT_ID || 11}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);

    for (const page of ['cart', 'checkout']) {
      await p.goto(`${BASE}/${page}/`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(7000);
      out[page] = await p.evaluate((rate) => {
        const spans = [...document.querySelectorAll('.darling-bgn')];
        const checks = spans.map((s) => {
          const host = s.parentElement;
          const full = host ? host.textContent : '';
          const eurTxt = full.replace(s.textContent, '');
          const eur = parseFloat(eurTxt.replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.'));
          const bgn = parseFloat(s.textContent.replace(/[^\d.,-]/g, '').replace(',', '.'));
          const expected = Math.round(eur * rate * 100) / 100;
          return { eur, bgn, expected, ok: Math.abs(bgn - expected) < 0.011 };
        }).filter((c) => isFinite(c.eur) && isFinite(c.bgn));
        return {
          scriptOk: !!document.querySelector('script[src*="dual-currency.js"]'),
          decorated: spans.length,
          allArithmeticCorrect: checks.length > 0 && checks.every((c) => c.ok),
          sample: checks.slice(0, 4),
        };
      }, RATE);
    }
    out.verdict = (out.cart.decorated > 0 && out.cart.allArithmeticCorrect &&
                   out.checkout.decorated > 0 && out.checkout.allArithmeticCorrect)
      ? 'PASS - dual display present and arithmetically correct on both pages'
      : 'FAIL - see above';
  } catch (e) { out.error = String(e.message).slice(0, 200); }
  finally { console.log(JSON.stringify(out, null, 2)); await b.close(); }
})();
