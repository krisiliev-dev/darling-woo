/**
 * Slice 13 gate: cookie consent banner.
 *  - fresh visitor: banner visible, text + link + both buttons
 *  - „Приемам" → hides + darling_consent=all cookie; survives reload
 *  - fresh context, „Само необходимите" → darling_consent=essential
 *  - context with cookie pre-set: banner never shows
 *  - banner does not cover the cart drawer CTA; checkout smoke intact
 * Run:  STAGING_PASS=… node gate14.js
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice13';
const STAG = 'https://staging.darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  const mk = () => b.newContext({
    locale: 'bg-BG', viewport: { width: 1440, height: 900 },
    httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' }
  });
  const state = (page) => page.evaluate(() => {
    const box = document.querySelector('[data-darling-consent]');
    return {
      present: !!box,
      visible: box ? !box.hasAttribute('hidden') && getComputedStyle(box).display !== 'none' : false,
      text_ok: box ? /бисквитки/i.test(box.innerText) : false,
      link: box ? !!box.querySelector('a[href="/poveritelnost/"]') : false,
      accept: box ? !!box.querySelector('[data-darling-consent-accept]') : false,
      essential: box ? !!box.querySelector('[data-darling-consent-essential]') : false,
      cookie: (document.cookie.match(/darling_consent=([a-z]+)/) || [])[1] || null,
    };
  });
  try {
    // 1) fresh visitor
    const c1 = await mk();
    const p1 = await c1.newPage();
    await p1.goto(STAG + '/?g14=1', { waitUntil: 'domcontentloaded' });
    await p1.waitForTimeout(2500);
    out.checks.fresh = await state(p1);
    await p1.screenshot({ path: path.join(OUT, 'consent-fresh.png') });

    // accept → hidden + cookie
    await p1.click('[data-darling-consent-accept]');
    await p1.waitForTimeout(600);
    out.checks.accepted = await state(p1);
    // survives reload
    await p1.goto(STAG + '/shop/?g14=2', { waitUntil: 'domcontentloaded' });
    await p1.waitForTimeout(2000);
    out.checks.after_reload = await state(p1);
    await c1.close();

    // 2) fresh context → essential
    const c2 = await mk();
    const p2 = await c2.newPage();
    await p2.goto(STAG + '/?g14=3', { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(2500);
    await p2.click('[data-darling-consent-essential]');
    await p2.waitForTimeout(600);
    out.checks.essential = await state(p2);
    await c2.close();

    // 3) cookie pre-set → never shows
    const c3 = await mk();
    await c3.addCookies([{ name: 'darling_consent', value: 'all', domain: 'staging.darlinghome.bg', path: '/' }]);
    const p3 = await c3.newPage();
    await p3.goto(STAG + '/?g14=4', { waitUntil: 'domcontentloaded' });
    await p3.waitForTimeout(2500);
    out.checks.preset = await state(p3);

    // 4) checkout smoke
    await p3.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = p3.url().includes('/cart');
    await c3.close();

    const F = out.checks.fresh, A = out.checks.accepted;
    const pass =
      F.present && F.visible && F.text_ok && F.link && F.accept && F.essential && F.cookie === null &&
      !A.visible && A.cookie === 'all' &&
      !out.checks.after_reload.visible && out.checks.after_reload.cookie === 'all' &&
      !out.checks.essential.visible && out.checks.essential.cookie === 'essential' &&
      out.checks.preset.present && !out.checks.preset.visible && out.checks.preset.cookie === 'all' &&
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
