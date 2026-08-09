// B6 / the states nobody screenshots: loading, error, empty.
//
// Two of the three are reachable without breaking anything:
//   EMPTY   - /checkout/ with no cart. The documented trap becomes the fixture.
//   LOADING - the first frames of a real load, before the store data arrives.
// The third, the error state, is not provoked here: a checkout error means a
// failed payment attempt on a live store.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');

const KILL = () => { for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
  if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true; } };

(async () => {
  const b = await chromium.launch();
  let txt = 'B6 / LOADING, ERROR AND EMPTY\n\n';

  // ---- LOADING: catch the first frames. Throttle so the frames exist at all.
  {
    const ctx = await b.newContext({ viewport: { width: 1240, height: 1000 } });
    const p = await ctx.newPage();
    // seed a cart in this context first
    await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
    const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
    await p.goto(prod, { waitUntil: 'domcontentloaded' });
    const f = p.locator('form.cart').first();
    if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
    // slow the Store API down so the skeleton has time to be a picture
    await ctx.route('**/wp-json/wc/store/**', async (r) => {
      await new Promise((res) => setTimeout(res, 6000)); r.continue();
    });
    await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(1200);
    await p.evaluate(KILL);
    await p.addStyleTag({ content: CSS });
    await p.addScriptTag({ content: UI });
    await p.waitForTimeout(500);
    const s1 = await p.evaluate(() => {
      const R = (sel) => { const e = document.querySelector(sel); if (!e) return null;
        const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return { h: Math.round(r.height), w: Math.round(r.width), display: cs.display,
          bg: cs.backgroundColor, anim: cs.animationName, radius: cs.borderRadius, op: cs.opacity }; };
      const out = {};
      for (const sel of ['.wc-block-cart--is-loading', '.wc-block-checkout--is-loading',
                         '.wc-block-components-skeleton', '.wc-block-components-skeleton__element',
                         '.wc-block-components-skeleton__element--static',
                         '.wc-block-components-skeleton--checkout-payment-container',
                         '.wc-block-components-spinner', '.wc-block-components-loading-mask',
                         '.wc-block-components-loading-mask__children']) out[sel] = R(sel);
      const sk = document.querySelector('.wc-block-components-skeleton__element');
      return { out, count: document.querySelectorAll('.wc-block-components-skeleton__element').length,
               html: sk ? sk.outerHTML.slice(0, 260) : null };
    });
    txt += '=== LOADING (Store API held for 6s)\n' + JSON.stringify(s1, null, 1) + '\n\n';
    console.log('loading: ' + s1.count + ' skeleton elements');
    await p.screenshot({ path: 'b6-loading.png', clip: { x: 0, y: 0, width: 1240, height: 900 } });
    await ctx.close();
  }

  // ---- EMPTY: a fresh context, no cart at all.
  {
    const ctx = await b.newContext({ viewport: { width: 1240, height: 900 } });
    const p = await ctx.newPage();
    await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(5000);
    await p.evaluate(KILL);
    await p.addStyleTag({ content: CSS });
    await p.addScriptTag({ content: UI });
    await p.waitForTimeout(900);
    const s2 = await p.evaluate(() => {
      const clean = (el) => { const c = el.cloneNode(true);
        for (const n of [c, ...c.querySelectorAll('*')]) {
          for (const a of [...n.attributes]) if (!/^(class|role|href|type)$/.test(a.name)) n.removeAttribute(a.name);
          if (n.tagName.toLowerCase() === 'svg') n.innerHTML = '\u2026'; }
        return c.outerHTML.replace(/></g, '>\n<'); };
      const e = document.querySelector('.wc-block-checkout-empty, .wc-block-components-checkout-empty, .wp-block-woocommerce-checkout');
      const R = (sel) => { const x = document.querySelector(sel); if (!x) return null;
        const r = x.getBoundingClientRect(); const cs = getComputedStyle(x);
        return { h: Math.round(r.height), display: cs.display, align: cs.textAlign, font: cs.fontSize }; };
      const out = {};
      for (const sel of ['.wc-block-checkout-empty', '.wc-block-components-checkout-empty',
                         '.wc-block-checkout-error', '.wc-block-components-checkout-return-to-cart-button',
                         '.wc-block-checkout__actions .wc-block-components-checkout-return-to-cart-button',
                         '.wc-block-components-notice-banner']) out[sel] = R(sel);
      return { out, html: e ? clean(e).slice(0, 2000) : 'NOTHING RENDERED', title: document.title };
    });
    txt += '=== EMPTY CART\n' + JSON.stringify(s2, null, 1) + '\n';
    console.log('empty: ' + (s2.out['.wc-block-checkout-empty'] ? 'the empty block renders' : 'no .wc-block-checkout-empty'));
    await p.screenshot({ path: 'b6-empty.png', fullPage: true });
    await ctx.close();
  }

  fs.writeFileSync(path.join(ROOT, 'b6-states.txt'), txt, 'utf8');
  console.log('-> b6-states.txt, b6-loading.png, b6-empty.png');
  await b.close();
})();