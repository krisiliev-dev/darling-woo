/**
 * Slice 7 gate: footer v2 + branded 404.
 * Run:  STAGING_PASS=… node gate9.js
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice7';
const STAG = 'https://staging.darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({ locale: 'bg-BG', viewport: { width: 1440, height: 900 }, httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' } });
    const page = await ctx.newPage();

    // ---- 404 ----
    const resp = await page.goto(STAG + '/definitely-missing-404-probe-v2', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    out.checks.http404 = resp ? resp.status() : null;
    out.checks.p404 = await page.evaluate(() => ({
      h1: (document.querySelector('h1') || {}).innerText || null,
      copy_ok: /пролетно чистене/.test(document.body.innerText),
      btn_ok: /Обратно към магазина/.test(document.body.innerText),
      discover: /Открий нещо ново/.test(document.body.innerText),
      has_product: /Тестова табуретка/.test(document.body.innerText),
      no_english: !/Page not found|Type here|Search\b/.test(document.body.innerText),
      h1_font: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : null,
    }));
    await page.screenshot({ path: path.join(OUT, '404-v2.png'), fullPage: true });

    // ---- footer (on home) ----
    await page.goto(STAG + '/?g9=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    out.checks.footer = await page.evaluate(() => {
      const f = document.querySelector('.darling-footer');
      if (!f) return null;
      const t = f.innerText;
      const cs = (sel) => { const el = f.querySelector(sel); if (!el) return null; const st = getComputedStyle(el); return st.animationName; };
      const hrefs = [...f.querySelectorAll('a')].map(a => a.getAttribute('href') || '');
      return {
        eik: /ЕИК 206094211/.test(t),
        addr: /Хан Аспарух/.test(t),
        tel: hrefs.some(h => h === 'tel:+359893361670'),
        mail_orders: hrefs.some(h => h === 'mailto:orders@darlinghome.bg'),
        no_gmail: !/gmail/.test(f.innerHTML),
        maps: hrefs.some(h => h.startsWith('https://www.google.com/maps/search/')),
        socials: ['facebook.com/darling7sv', 'instagram.com/darling7.sv', 'tiktok.com/@darling7.sv'].every(u => hrefs.some(h => h.includes(u))),
        policies: /Политика за връщане/.test(t) && /Поверителност/.test(t),
        legal: (() => { const l = document.querySelector('.df-legal'); const lt = l ? l.innerText : ''; return /© 2026 Darling/.test(lt) && /Правила и условия/.test(lt) && /1 EUR = 1.95583/.test(lt); })(),
        star_anim: cs('.dff-s'),
        bow_anim: cs('.dff-bow'),
        wordmark_font: (() => { const w = f.querySelector('.dff-word'); return w ? getComputedStyle(w).fontFamily : null; })(),
        grid_3col: getComputedStyle(f).display === 'grid' && getComputedStyle(f).gridTemplateColumns.split(' ').length === 3,
        no_hoverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
        help_col: /помощ и информация/i.test(t),
      };
    });
    await page.screenshot({ path: path.join(OUT, 'footer-v2.png'), fullPage: true });

    // ---- money-path smoke ----
    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const p = out.checks.p404, f = out.checks.footer;
    const pass =
      out.checks.http404 === 404 &&
      p.h1 === 'Хм, тази страница я няма.' && p.copy_ok && p.btn_ok && p.discover && p.has_product &&
      p.no_english && /Playfair/.test(p.h1_font || '') &&
      f && f.eik && f.addr && f.tel && f.mail_orders && f.no_gmail && f.maps && f.socials &&
      f.policies && f.legal && f.grid_3col && f.no_hoverflow && f.star_anim === 'dhv-tw' && f.bow_anim === 'darling-float' &&
      /Playfair/.test(f.wordmark_font || '') && f.help_col &&
      out.checks.checkout_redirect;
    out.verdict = pass ? 'GATE: PASS' : 'GATE: FAIL';
  } catch (e) {
    out.error = String(e.message || e).slice(0, 300);
    out.verdict = 'GATE: ERROR';
  } finally {
    console.log(JSON.stringify(out, null, 1));
    await b.close();
  }
})();
