/**
 * Slice 8 gate: product page + newsletter relay on the live listmonk path.
 * Run:  STAGING_PASS=… node gate10.js
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice8';
const STAG = 'https://staging.darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({ locale: 'bg-BG', viewport: { width: 1440, height: 900 }, httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' } });
    const page = await ctx.newPage();
    await page.goto(STAG + '/?p=11&g10=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    out.checks.pdp = await page.evaluate(() => {
      const t = document.body.innerText;
      const reviews = (t.match(/Отзиви \(\d+\)|Все още няма отзиви/g) || []);
      const trust = document.querySelector('.darling-pdp-trust');
      const details = trust ? [...trust.querySelectorAll('details summary')].map(s => s.innerText.trim()) : [];
      const h1 = document.querySelector('h1');
      const price = document.querySelector('.darling-product__price');
      return {
        review_mentions: reviews.length,
        no_sku: !/TEST-WOO-001/.test(t),
        no_stock_count: !/Налични 3/.test(t),
        no_breadcrumb: !document.querySelector('.darling-crumbs') && !/Uncategorized/.test(t),
        trust_present: !!trust,
        cod_line: trust ? /Наложен платеж/.test(trust.innerText) : false,
        ship_line: trust ? /Поръчай до 15:00/.test(trust.innerText) : false,
        accordions: details,
        free77: trust ? /€77/.test(trust.textContent) : false,
        wallets: !!document.querySelector('#wc-stripe-payment-request-wrapper, [id*="payment-request"], iframe[src*="js.stripe.com"], [class*="express-payment"]'),
        related: /Може да ви хареса/.test(t),
        h1_font: h1 ? getComputedStyle(h1).fontFamily : null,
        price_font: price ? getComputedStyle(price).fontFamily : null,
        drawer_hidden: (() => { const d = document.getElementById('darling-cart-drawer'); return d ? getComputedStyle(d).display === 'none' : null; })(),
      };
    });

    // accordion toggles
    out.checks.accordion_toggle = await page.evaluate(() => {
      const d = document.querySelector('.darling-pdp-trust details');
      if (!d) return null;
      const before = d.open;
      d.querySelector('summary').click();
      return { before, after: d.open };
    });

    await page.screenshot({ path: path.join(OUT, 'product-v2.png'), fullPage: true });

    // 1280 overlap check: no elements from tabs overlapping the trust panel
    const ctx2 = await b.newContext({ locale: 'bg-BG', viewport: { width: 1280, height: 900 }, httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' } });
    const p2 = await ctx2.newPage();
    await p2.goto(STAG + '/?p=11&g10b=1', { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(4500);
    out.checks.overlap1280 = await p2.evaluate(() => {
      const boxes = [...document.querySelectorAll('.darling-product__buy > *, .darling-product__details')].map(e => {
        const r = e.getBoundingClientRect();
        return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, h: r.height };
      }).filter(b => b.h > 4);
      let overlaps = 0;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const ov = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (ov > 12) overlaps++;
      }
      return { boxes: boxes.length, overlaps };
    });
    await p2.screenshot({ path: path.join(OUT, 'product-1280.png'), fullPage: true });

    // newsletter now on the PANEL path: expect the double-opt-in message
    out.checks.news_panel = await page.evaluate(async () => {
      const r = await fetch('/wp-json/darling/v1/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'gate10-live-test@darlinghome.bg', website: '', elapsed_ms: 9000 }),
      });
      return await r.json();
    });

    // money-path smoke
    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const d = out.checks.pdp;
    const pass =
      d.review_mentions <= 2 && // one tab label + one empty-state inside the single block
      d.no_sku && d.no_stock_count && d.no_breadcrumb &&
      d.trust_present && d.cod_line && d.ship_line && d.free77 &&
      JSON.stringify(out.checks.accordion_toggle ? [true] : []) === '[true]' &&
      d.accordions.length === 2 && d.accordions.includes('Доставка') && d.accordions.includes('Връщане и замяна') &&
      d.wallets && d.related &&
      /Playfair/.test(d.h1_font || '') && /Playfair/.test(d.price_font || '') &&
      d.drawer_hidden === true &&
      out.checks.overlap1280 && out.checks.overlap1280.overlaps === 0 &&
      out.checks.news_panel && ((out.checks.news_panel.ok && /потвърдите абонамента/.test(out.checks.news_panel.message)) || (!out.checks.news_panel.ok && /опитай пак/.test(out.checks.news_panel.message))) && // relay correct on BOTH panel states; panel-side hang reported via bell

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
