// B5 / the applied-coupon states, which do not exist until a coupon is applied.
//
// A temporary 5% coupon with usage_limit 1 was created for this and is deleted
// straight afterwards. Same rule as B4: do not style from the class names.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');
const CODE = process.env.CODE;
const W = parseInt(process.env.W || '1240', 10);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: 1200 } });
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }

  // apply through the Store API - the same call the coupon form makes, and it
  // does not depend on our own coupon field being open or styled
  const res = await p.evaluate(async (code) => {
    const n = await fetch('/wp-json/wc/store/v1/cart', { credentials: 'same-origin' });
    const nonce = n.headers.get('nonce') || n.headers.get('Nonce') || '';
    const r = await fetch('/wp-json/wc/store/v1/cart/apply-coupon', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Nonce': nonce, 'X-WC-Store-API-Nonce': nonce },
      body: JSON.stringify({ code: code }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, coupons: (j.coupons || []).map((c) => c.code), msg: j.message || null };
  }, CODE);
  console.log('apply-coupon: ' + JSON.stringify(res));

  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('.wc-block-components-text-input').first().waitFor({ timeout: 25000 });
  await p.waitForTimeout(3500);
  await p.evaluate(() => { for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
    if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true; } });
  await p.addStyleTag({ content: CSS });
  await p.addScriptTag({ content: UI });
  await p.waitForTimeout(1600);

  const out = await p.evaluate(() => {
    const clean = (el) => { const c = el.cloneNode(true);
      for (const n of [c, ...c.querySelectorAll('*')]) {
        for (const a of [...n.attributes]) if (!/^(class|type|role|aria-label|aria-hidden)$/.test(a.name)) n.removeAttribute(a.name);
        if (n.tagName.toLowerCase() === 'svg') n.innerHTML = '\u2026';
      }
      return c.outerHTML.replace(/></g, '>\n<'); };
    const R = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { h: Math.round(r.height), w: Math.round(r.width), display: cs.display,
        bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
        radius: cs.borderRadius, font: cs.fontSize, colour: cs.color, pad: cs.padding }; };
    const fams = {};
    for (const sel of ['.wc-block-components-totals-coupon-link', '.wc-block-components-totals-coupon__content',
                       '.wc-block-components-totals-discount', '.wc-block-components-totals-discount__coupon-list',
                       '.wc-block-components-chip', '.wc-block-components-chip__text',
                       '.wc-block-components-chip__remove', '.wc-block-components-chip__remove-icon',
                       '.wc-block-components-product-badge']) fams[sel] = R(sel);
    const disc = document.querySelector('.wc-block-components-totals-discount');
    const list = document.querySelector('.wc-block-components-totals-discount__coupon-list');
    return { fams, discHtml: disc ? clean(disc).slice(0, 1500) : null,
             listHtml: list ? clean(list).slice(0, 900) : null };
  });
  let txt = 'B5 / A COUPON IS APPLIED\n\n' +
    Object.entries(out.fams).map(([k, v]) => (v ? 'ok   ' : 'MISS ') + k + (v ? '\n       ' + JSON.stringify(v) : '')).join('\n') +
    '\n\n=== THE DISCOUNT ROW\n' + (out.discHtml || 'not rendered') +
    '\n\n=== THE COUPON LIST\n' + (out.listHtml || 'not rendered') + '\n';
  fs.writeFileSync(path.join(ROOT, 'b5-coupon.txt'), txt, 'utf8');
  const side = p.locator('.wc-block-checkout__sidebar').first();
  await side.screenshot({ path: process.env.OUT || 'b5-coupon.png' }).catch(() => p.screenshot({ path: process.env.OUT || 'b5-coupon.png' }));
  console.log('-> b5-coupon.txt and ' + (process.env.OUT || 'b5-coupon.png'));
  await b.close();
})();