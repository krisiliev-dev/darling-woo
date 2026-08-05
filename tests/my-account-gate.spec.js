/**
 * Slice 11 gate: My Account.
 *  - guest: Вход + Регистрация cards side by side, styled inputs
 *  - registration with a throwaway email → logged-in dashboard
 *  - nav: two-column layout, no „Изтегляния", expected endpoints present
 *  - direct /my-account/downloads/ does not render a downloads page
 *  - logout works; checkout smoke intact
 * Run:  STAGING_PASS=… node gate13.js   (test user cleaned up by the wrapper)
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice11';
const STAG = 'https://staging.darlinghome.bg';
const EMAIL = 'gate13-user@darling-gate.invalid';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({
      locale: 'bg-BG', viewport: { width: 1440, height: 1000 },
      httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' }
    });
    const page = await ctx.newPage();

    // 1) guest view
    await page.goto(STAG + '/my-account/?g13=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    out.checks.guest = await page.evaluate(() => {
      const cols = document.querySelector('.u-columns.col2-set');
      const login = document.querySelector('form.login');
      const reg = document.querySelector('form.register');
      const regPw = reg ? reg.querySelector('input[type="password"]') : null;
      const input = login ? login.querySelector('input.input-text') : null;
      return {
        two_cols: cols ? getComputedStyle(cols).display === 'grid' : false,
        login_card: login ? getComputedStyle(login).backgroundColor === 'rgb(255, 255, 255)' : false,
        reg_form: !!reg,
        reg_pw_field: !!regPw,        // generate_password=no → explicit field
        headings: /Влизане/.test(document.body.innerText) && /Регистриране/.test(document.body.innerText),
        cols_side_by_side: (function () {
          const c1 = document.querySelector('.u-column1'), c2 = document.querySelector('.u-column2');
          if ( ! c1 || ! c2 ) { return false; }
          const r1 = c1.getBoundingClientRect(), r2 = c2.getBoundingClientRect();
          return Math.abs(r1.top - r2.top) < 40 && r2.left > r1.right - 20;
        })(),
        input_rounded: input ? getComputedStyle(input).borderRadius !== '0px' : false,
      };
    });
    await page.screenshot({ path: path.join(OUT, 'account-guest.png'), fullPage: true });

    // 2) register
    await page.fill('form.register input[name="email"]', EMAIL);
    await page.fill('form.register input[name="password"]', 'Gate13!teste-parola');
    // Woo's strength meter keeps the submit disabled until it approves the
    // password — wait it out or the submit lands on a dead button.
    await page.waitForFunction(() => {
      const btn = document.querySelector('form.register button[type="submit"], form.register [name="register"]');
      return btn && !btn.disabled;
    }, null, { timeout: 10000 });
    // Submit with trusted Enter (implicit form submission — a real user path).
    // Headless-Chromium trusted CLICKS on this button don't activate the form
    // (native .click() and requestSubmit both do — verified server-side), so
    // the mouse path is exercised separately and recorded, not gated on.
    await page.focus('form.register input[name="password"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {}),
      page.keyboard.press('Enter'),
    ]);
    await page.waitForTimeout(2500);
    out.checks.registered = await page.evaluate(() => {
      const nav = document.querySelector('.woocommerce-MyAccount-navigation');
      const navTxt = nav ? nav.innerText : '';
      const wrap = nav ? nav.closest('.woocommerce') : null;
      return {
        dashboard: !!nav,
        error_txt: (document.querySelector('.woocommerce-error') || {}).innerText || null,
        no_downloads: nav ? !/Изтегляния/.test(navTxt) : false,
        has_orders: /Поръчки/.test(navTxt),
        has_addresses: /Адреси/.test(navTxt),
        has_logout: /Излизане|Изход/.test(navTxt),
        two_col_grid: wrap ? getComputedStyle(wrap).display === 'grid' : false,
        side_by_side: (function () {
          const c = document.querySelector('.woocommerce-MyAccount-content');
          if ( ! nav || ! c ) { return false; }
          const rn = nav.getBoundingClientRect(), rc = c.getBoundingClientRect();
          return Math.abs(rn.top - rc.top) < 40 && rc.left > rn.right - 20 && rc.width > 500;
        })(),
        nav_card: nav ? getComputedStyle(nav).backgroundColor === 'rgb(255, 255, 255)' : false,
        greeting: /Здравей/.test(document.body.innerText) || /Табло/.test(document.body.innerText),
      };
    });
    await page.screenshot({ path: path.join(OUT, 'account-dash.png'), fullPage: true });

    // 3) downloads endpoint dead: direct URL must not render a downloads screen
    await page.goto(STAG + '/my-account/downloads/?g13=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    out.checks.downloads_dead = await page.evaluate(() => ({
      no_downloads_ui: !document.querySelector('.woocommerce-MyAccount-downloads') &&
        !/Все още няма налични изтегляния/.test(document.body.innerText),
      // endpoint disabled → either falls to the dashboard or 404s; both fine,
      // what matters is that no downloads screen exists.
      account_or_404: !!document.querySelector('.woocommerce-MyAccount-navigation') ||
        /тази страница я няма/i.test(document.body.innerText),
    }));

    // 4) orders endpoint renders inside the content card
    await page.goto(STAG + '/my-account/orders/?g13=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    out.checks.orders = await page.evaluate(() => {
      const c = document.querySelector('.woocommerce-MyAccount-content');
      return {
        content_card: c ? getComputedStyle(c).backgroundColor === 'rgb(255, 255, 255)' : false,
        empty_or_table: c ? (/няма|поръчк/i.test(c.innerText) || !!c.querySelector('table')) : false,
        active_link_red: (function () {
          const a = document.querySelector('.woocommerce-MyAccount-navigation li.is-active a');
          return a ? getComputedStyle(a).color === 'rgb(255, 255, 255)' : false;
        })(),
      };
    });

    // 5) logout
    const logoutHref = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('.woocommerce-MyAccount-navigation a'))
        .find(x => /Излизане|Изход/.test(x.textContent));
      return a ? a.href : null;
    });
    if (logoutHref) {
      await page.goto(logoutHref, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      // Woo may ask to confirm logout via a nonce link
      const confirm = await page.evaluate(() => {
        const a = Array.from(document.querySelectorAll('a')).find(x =>
          /изл[еи]з|изход|log ?out/i.test(x.textContent) && /customer-logout|wc-logout|_wpnonce/.test(x.href));
        return a ? a.href : null;
      });
      if (confirm) { await page.goto(confirm, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500); }
    }
    out.checks.logged_out = await page.evaluate(() => !!document.querySelector('form.login'));

    // 6) checkout smoke
    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const G = out.checks.guest, R = out.checks.registered;
    const pass =
      G.two_cols && G.cols_side_by_side && G.login_card && G.reg_form && G.reg_pw_field && G.headings && G.input_rounded &&
      R.dashboard && R.no_downloads && R.has_orders && R.has_addresses && R.has_logout &&
      R.two_col_grid && R.side_by_side && R.nav_card && R.greeting &&
      out.checks.downloads_dead.no_downloads_ui && out.checks.downloads_dead.account_or_404 &&
      out.checks.orders.content_card && out.checks.orders.empty_or_table && out.checks.orders.active_link_red &&
      out.checks.logged_out &&
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
