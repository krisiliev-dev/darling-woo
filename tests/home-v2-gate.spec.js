/**
 * Slice 6 gate: header v2 + home rebuild + newsletter relay.
 * Run:  STAGING_PASS=… node gate8.js
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice6';
const STAG = 'https://staging.darlinghome.bg';
const PASS = process.env.STAGING_PASS || '';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({ locale: 'bg-BG', viewport: { width: 1440, height: 900 }, httpCredentials: { username: 'darling', password: PASS } });
    const page = await ctx.newPage();
    await page.goto(STAG + '/?g8=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000); // let ambient stars accumulate

    out.checks.home = await page.evaluate(() => {
      const cs = (sel, root) => { const el = (root || document).querySelector(sel); if (!el) return null; const st = getComputedStyle(el); return { anim: st.animationName, dur: st.animationDuration }; };
      const hero = document.querySelector('.darling-hero--red');
      const heroStyle = hero ? getComputedStyle(hero) : null;
      const h1 = document.querySelector('h1');
      const wm = document.querySelector('.darling-header__logo.darling-wordmark');
      const search = document.querySelector('.darling-search input[type="search"]');
      const cats = [...document.querySelectorAll('.darling-catsv2__row img')];
      const drawer = document.getElementById('darling-cart-drawer');
      return {
        h1_text: h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : null,
        h1_font: h1 ? getComputedStyle(h1).fontFamily : null,
        h1_has_em: !!(h1 && h1.querySelector('em')),
        hero_bg: heroStyle ? heroStyle.backgroundColor : null,
        sub_ok: /честно обозначени/.test(document.body.innerText),
        hero_star: cs('.darling-hero-visual .dhv-s'),
        hero_bow: cs('.darling-hero-visual .dhv-bow'),
        season: cs('.darling-season'),
        wordmark: wm ? { text: wm.innerText.trim(), font: getComputedStyle(wm).fontFamily } : null,
        search_placeholder: search ? search.placeholder : null,
        mega_links: document.querySelectorAll('.darling-mega a').length,
        cat_imgs: cats.length,
        cat_imgs_loaded: cats.filter(i => i.naturalWidth > 0).length,
        sections: {
          categories: /Категории/.test(document.body.innerText),
          ladyd: /Изборът на Lady D/.test(document.body.innerText),
          season_band: /Лято в двора/.test(document.body.innerText),
          novo: /Ново в Darling/.test(document.body.innerText),
          trust: /Реални магазини/.test(document.body.innerText) && /Лесно връщане/.test(document.body.innerText),
          news: /Само хубави неща/.test(document.body.innerText) && /Абонирай ме/.test(document.body.innerText),
        },
        ambient_count: document.querySelectorAll('.darling-ambient i').length,
        drawer_hidden: drawer ? getComputedStyle(drawer).display === 'none' : null,
        lady_d_has_product: /Тестова табуретка/.test(document.body.innerText),
      };
    });

    // mega menu opens on hover
    await page.hover('.darling-nav__mega > a').catch(() => {});
    await page.waitForTimeout(600);
    out.checks.mega_visible = await page.evaluate(() => {
      const m = document.querySelector('.darling-mega');
      return m ? getComputedStyle(m).display !== 'none' : false;
    });

    await page.screenshot({ path: path.join(OUT, 'home-v2-fold.png') });
    await page.screenshot({ path: path.join(OUT, 'home-v2-full.png'), fullPage: true });

    // newsletter: real submit (fallback path -> mailbox) then honeypot
    out.checks.news_real = await page.evaluate(async () => {
      const r = await fetch('/wp-json/darling/v1/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'gate8-test@darlinghome.bg', website: '', elapsed_ms: 9000 }),
      });
      return await r.json();
    });
    out.checks.news_honeypot = await page.evaluate(async () => {
      const r = await fetch('/wp-json/darling/v1/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bot@spam.example', website: 'http://spam', elapsed_ms: 9000 }),
      });
      return await r.json();
    });
    out.checks.news_invalid = await page.evaluate(async () => {
      const r = await fetch('/wp-json/darling/v1/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', website: '', elapsed_ms: 9000 }),
      });
      return await r.json();
    });

    // money-path smoke: empty-cart checkout still redirects; account 200
    const r1 = await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');
    const r2 = await page.goto(STAG + '/my-account/', { waitUntil: 'domcontentloaded' });
    out.checks.account_http = r2 ? r2.status() : null;
    await ctx.close();

    // mobile fold
    const m = await b.newContext({ locale: 'bg-BG', viewport: { width: 390, height: 844 }, httpCredentials: { username: 'darling', password: PASS } });
    const mp = await m.newPage();
    await mp.goto(STAG + '/?g8m=1', { waitUntil: 'domcontentloaded' });
    await mp.waitForTimeout(4000);
    out.checks.mobile = await mp.evaluate(() => ({
      burger_visible: (() => { const b = document.querySelector('.darling-header__burger'); return b ? getComputedStyle(b).display !== 'none' : false; })(),
      big_search_hidden: (() => { const s = document.querySelector('.darling-search'); return s ? getComputedStyle(s).display === 'none' : true; })(),
      h1: (document.querySelector('h1') || {}).innerText || null,
    }));
    await mp.screenshot({ path: path.join(OUT, 'home-v2-m390.png'), fullPage: true });

    const h = out.checks.home;
    const pass =
      h.h1_text === 'Тайната на една домакиня.' && h.h1_has_em &&
      /Playfair/.test(h.h1_font || '') &&
      h.hero_bg === 'rgb(212, 42, 60)' &&
      h.sub_ok &&
      h.hero_star && h.hero_star.anim === 'dhv-tw' &&
      h.hero_bow && h.hero_bow.anim === 'darling-float' &&
      h.season && h.season.anim === 'darling-drift' &&
      h.wordmark && h.wordmark.text === 'Darling' && /Playfair/.test(h.wordmark.font) &&
      h.search_placeholder === 'Какво търсиш, darling?' &&
      h.mega_links === 10 && out.checks.mega_visible &&
      h.cat_imgs === 8 && h.cat_imgs_loaded === 8 &&
      Object.values(h.sections).every(Boolean) &&
      h.ambient_count >= 30 &&
      h.drawer_hidden === true &&
      h.lady_d_has_product &&
      out.checks.news_real && out.checks.news_real.ok && /Записахме те/.test(out.checks.news_real.message) &&
      out.checks.news_honeypot && out.checks.news_honeypot.ok && /потвърдите/.test(out.checks.news_honeypot.message) &&
      out.checks.news_invalid && out.checks.news_invalid.ok === false &&
      out.checks.checkout_redirect &&
      out.checks.account_http === 200 &&
      out.checks.mobile.burger_visible && out.checks.mobile.big_search_hidden;
    out.verdict = pass ? 'GATE: PASS' : 'GATE: FAIL';
  } catch (e) {
    out.error = String(e.message || e).slice(0, 300);
    out.verdict = 'GATE: ERROR';
  } finally {
    console.log(JSON.stringify(out, null, 1));
    await b.close();
  }
})();
