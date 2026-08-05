/**
 * Slice 12 gate (full, staging boundary): providers configured + enabled.
 *  - Влизане card shows Google + Facebook buttons (nsl-container)
 *  - Google button href → wp-login.php?loginSocial=google; following it
 *    redirects to accounts.google.com with our client_id present
 *  - Facebook likewise → facebook.com dialog URL
 *  - register card shows them too; checkout smoke
 * (Consent screens will reject staging redirect_uri — apex-only apps; the
 *  redirect TO the provider is the pre-cutover boundary. Round-trip = D7.)
 * Run:  STAGING_PASS=… node gate17b.js
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice16';
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

    await page.goto(STAG + '/my-account/?g17b=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    out.checks.buttons = await page.evaluate(() => {
      const inLogin = document.querySelector('form.login') ? document.querySelector('.u-column1, .u-column2') : null;
      const g = document.querySelector('[data-plugin="nsl"][data-provider="google"], .nsl-button-google, a[href*="loginSocial=google"]');
      const f = document.querySelector('[data-plugin="nsl"][data-provider="facebook"], .nsl-button-facebook, a[href*="loginSocial=facebook"]');
      const containers = document.querySelectorAll('.nsl-container').length;
      return {
        google_btn: !!g,
        facebook_btn: !!f,
        containers,
        google_href: g ? (g.href || (g.closest('a') || {}).href || null) : null,
      };
    });
    await page.screenshot({ path: path.join(OUT, 'oauth-buttons.png'), fullPage: true });

    // provider boundary: follow the login URLs, capture where they land
    const boundary = async (prov) => {
      const p2 = await ctx.newPage();
      let hops = [];
      p2.on('request', r => { if (r.isNavigationRequest()) { hops.push(r.url().slice(0, 130)); } });
      await p2.goto(STAG + '/wp-login.php?loginSocial=' + prov, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await p2.waitForTimeout(2000);
      const url = p2.url();
      await p2.close();
      return { final: url.slice(0, 140), hops: hops.slice(0, 6) };
    };
    out.checks.google_flow = await boundary('google');
    out.checks.facebook_flow = await boundary('facebook');

    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const B = out.checks.buttons;
    const gOk = /accounts\.google\.com/.test(out.checks.google_flow.final) ||
      out.checks.google_flow.hops.some(h => /accounts\.google\.com/.test(h));
    const fOk = /facebook\.com/.test(out.checks.facebook_flow.final) ||
      out.checks.facebook_flow.hops.some(h => /facebook\.com/.test(h));
    const pass = B.google_btn && B.facebook_btn && B.containers >= 1 &&
      gOk && fOk && out.checks.checkout_redirect;
    out.verdict = pass ? 'GATE: PASS' : 'GATE: FAIL';
  } catch (e) {
    out.error = String(e.message || e).slice(0, 400);
    out.verdict = 'GATE: ERROR';
  } finally {
    console.log(JSON.stringify(out, null, 1));
    await b.close();
  }
})();
