/**
 * Slice 16 gate (OAuth prep): honest dark state + no regressions.
 *  - /my-account/ renders both auth cards exactly as gate13 verified
 *  - NO social buttons anywhere while providers are unconfigured
 *  - consent + a11y button still render (footer intact)
 *  - checkout smoke
 * Run:  STAGING_PASS=… node gate17.js
 */
const { chromium } = require('playwright');
const STAG = 'https://staging.darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({
      locale: 'bg-BG', viewport: { width: 1440, height: 1000 },
      httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' }
    });
    const page = await ctx.newPage();

    await page.goto(STAG + '/my-account/?g17=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    out.checks.account = await page.evaluate(() => ({
      login: !!document.querySelector('form.login'),
      register: !!document.querySelector('form.register'),
      side_by_side: (function () {
        const c1 = document.querySelector('.u-column1'), c2 = document.querySelector('.u-column2');
        if (!c1 || !c2) { return false; }
        const r1 = c1.getBoundingClientRect(), r2 = c2.getBoundingClientRect();
        return Math.abs(r1.top - r2.top) < 40 && r2.left > r1.right - 20;
      })(),
      no_social: !document.querySelector('.nsl-container, [class*="nsl-button"]'),
      consent_or_cookie: !!document.querySelector('[data-darling-consent]'),
      a11y_btn: !!document.querySelector('[data-darling-a11y]'),
    }));

    // wp-login must also stay clean (Nextend hooks it too)
    await page.goto(STAG + '/wp-login.php', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    out.checks.wplogin_no_social = await page.evaluate(() =>
      !document.querySelector('.nsl-container, [class*="nsl-button"]'));

    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const A = out.checks.account;
    const pass =
      A.login && A.register && A.side_by_side && A.no_social &&
      A.consent_or_cookie && A.a11y_btn &&
      out.checks.wplogin_no_social &&
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
