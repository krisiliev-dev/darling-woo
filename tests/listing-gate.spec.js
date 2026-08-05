/**
 * Slice 9 gate: listing + search surfaces.
 * Run:  STAGING_PASS=… node gate11.js
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice9';
const STAG = 'https://staging.darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({ locale: 'bg-BG', viewport: { width: 1440, height: 900 }, httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' } });
    const page = await ctx.newPage();

    // /shop/ — banner, toolbar, cards
    await page.goto(STAG + '/shop/?g11=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    out.checks.shop = await page.evaluate(() => {
      const banner = document.querySelector('.darling-cat-banner');
      const img = document.querySelector('.darling-cat-banner .dcb-img');
      const grid = document.querySelector('.darling-grid .wp-block-post-template');
      const card = grid ? grid.querySelector(':scope > li, :scope > .wp-block-post') : null;
      return {
        h1: (document.querySelector('h1') || {}).innerText || null,
        banner_present: !!banner,
        coming_line: /идваме с пълни ръце/.test(document.body.innerText),
        banner_img: img ? getComputedStyle(img).backgroundImage.includes('banners/all.jpg') : false,
        count_phrase: /1 артикул/.test(document.body.innerText) && !/Показване на единствения/.test(document.body.innerText),
        toggle_buttons: document.querySelectorAll('[data-darling-view]').length,
        card_bg: card ? getComputedStyle(card).backgroundColor : null,
        product_link: /Тестова табуретка/.test(document.body.innerText),
      };
    });
    // list toggle works
    await page.click('[data-darling-view="list"]').catch(() => {});
    await page.waitForTimeout(600);
    out.checks.list_toggle = await page.evaluate(() => {
      const g = document.querySelector('.darling-archive .darling-grid');
      return g ? g.classList.contains('darling-grid--list') : false;
    });
    await page.screenshot({ path: path.join(OUT, 'shop-v2.png'), fullPage: true });

    // category with description + per-term banner image
    await page.goto(STAG + '/product-category/za-kuhnyata/?g11=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    out.checks.category = await page.evaluate(() => {
      const img = document.querySelector('.darling-cat-banner .dcb-img');
      return {
        h1: (document.querySelector('h1') || {}).innerText || null,
        desc: /готвенето става удоволствие/.test(document.body.innerText),
        coming: /идваме с пълни ръце/.test(document.body.innerText),
        img_slug: img ? getComputedStyle(img).backgroundImage.includes('za-kuhnyata') : false,
        content_ok: /В тази категория още няма продукти/.test(document.body.innerText) || /Тестова табуретка/.test(document.body.innerText),
        no_breadcrumb: !document.querySelector('.darling-crumbs'),
      };
    });
    await page.screenshot({ path: path.join(OUT, 'category-v2.png'), fullPage: true });

    // Lady D category now has the product
    await page.goto(STAG + '/product-category/izborat-na-lady-d/?g11=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    out.checks.ladyd = await page.evaluate(() => ({
      desc: /дамата с панделката/.test(document.body.innerText),
      has_product: /Тестова табуретка/.test(document.body.innerText),
    }));

    // search page keeps its structure + cards
    await page.goto(STAG + '/?s=%D1%82%D0%B0%D0%B1%D1%83%D1%80%D0%B5%D1%82%D0%BA%D0%B0&post_type=product&g11=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    out.checks.search = await page.evaluate(() => {
      const grid = document.querySelector('.darling-grid .wp-block-post-template');
      const card = grid ? grid.querySelector(':scope > li, :scope > .wp-block-post') : null;
      return {
        h1: (document.querySelector('h1') || {}).innerText || null,
        has_product: /Тестова табуретка/.test(document.body.innerText),
        card_bg: card ? getComputedStyle(card).backgroundColor : null,
      };
    });
    await page.screenshot({ path: path.join(OUT, 'search-v2.png'), fullPage: true });

    // money-path smoke
    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const s = out.checks.shop, c = out.checks.category;
    const pass =
      s.h1 === 'Продукти' && s.banner_present && s.coming_line && s.banner_img &&
      s.count_phrase && s.toggle_buttons === 2 && s.card_bg === 'rgb(255, 255, 255)' && s.product_link &&
      out.checks.list_toggle &&
      c.h1 === 'За кухнята' && c.desc && c.coming && c.img_slug && c.content_ok && c.no_breadcrumb &&
      out.checks.ladyd.desc && out.checks.ladyd.has_product &&
      out.checks.search.h1 === 'Резултати от търсенето' && out.checks.search.has_product &&
      out.checks.search.card_bg === 'rgb(255, 255, 255)' &&
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
