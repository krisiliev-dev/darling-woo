/**
 * Slice 14 gate: accessibility mode.
 *  - button renders (46px round, bottom-left), aria-pressed=false, mode off
 *  - click → html.darling-a11y, body 17px, animations dead, cookie=1, aria true
 *  - reload → mode already on BEFORE interaction (early header script)
 *  - click again → off, cookie=0
 *  - consent card sits ABOVE the button (no overlap)
 *  - checkout smoke
 * Run:  STAGING_PASS=… node gate15.js
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice14';
const STAG = 'https://staging.darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  const st = (page) => page.evaluate(() => {
    const btn = document.querySelector('[data-darling-a11y]');
    const r = btn ? btn.getBoundingClientRect() : null;
    const flair = document.querySelector('.dff-s');
    return {
      btn: !!btn,
      round46: r ? Math.round(r.width) === 46 && Math.round(r.height) === 46 : false,
      bottom_left: r ? r.left < 80 && r.top > window.innerHeight - 120 : false,
      pressed: btn ? btn.getAttribute('aria-pressed') : null,
      mode: document.documentElement.classList.contains('darling-a11y'),
      body_px: getComputedStyle(document.body).fontSize,
      flair_anim: flair ? getComputedStyle(flair).animationName : 'absent',
      cookie: (document.cookie.match(/darling_a11y=([01])/) || [])[1] || null,
    };
  });
  try {
    const ctx = await b.newContext({
      locale: 'bg-BG', viewport: { width: 1440, height: 900 },
      httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' }
    });
    const page = await ctx.newPage();
    await page.goto(STAG + '/?g15=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    out.checks.off = await st(page);

    // consent card must sit above the button while both are visible
    out.checks.no_overlap = await page.evaluate(() => {
      const c = document.querySelector('[data-darling-consent]');
      const btn = document.querySelector('[data-darling-a11y]');
      if (!c || !btn || c.hasAttribute('hidden')) { return 'consent-hidden'; }
      const rc = c.getBoundingClientRect(), rb = btn.getBoundingClientRect();
      return rc.bottom <= rb.top + 2;
    });

    await page.click('[data-darling-a11y]');
    await page.waitForTimeout(800);
    out.checks.on = await st(page);
    await page.screenshot({ path: path.join(OUT, 'a11y-on.png'), fullPage: false });

    // reload: mode applied before any interaction
    await page.goto(STAG + '/shop/?g15=2', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    out.checks.reload = await st(page);

    // toggle off
    await page.click('[data-darling-a11y]');
    await page.waitForTimeout(800);
    out.checks.off_again = await st(page);

    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const O = out.checks.off, N = out.checks.on, R = out.checks.reload, F = out.checks.off_again;
    const pass =
      O.btn && O.round46 && O.bottom_left && O.pressed === 'false' && !O.mode && O.body_px === '16px' &&
      (out.checks.no_overlap === true || out.checks.no_overlap === 'consent-hidden') &&
      N.mode && N.pressed === 'true' && N.body_px === '17px' && N.cookie === '1' &&
      (N.flair_anim === 'none' || N.flair_anim === 'absent') &&
      R.mode && R.pressed === 'true' && R.body_px === '17px' &&
      !F.mode && F.pressed === 'false' && F.cookie === '0' && F.body_px === '16px' &&
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
