// B4 / shipping - and the whole point is that it does not exist until there is
// an address.
//
// CHECKOUT_PHASES says it in capitals: do not style this from the class names,
// seed an address first. Every capture of this page so far has had an empty
// address form, so the shipping section has only ever been the sentence
// "add an address to see the options".
//
// So this types one. A real Bulgarian address, in Svishtov, where the shop is.
// Nothing is submitted - filling a checkout form places no order; it updates
// the cart session, which is what makes Woo fetch rates.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');
const ALLOFF = !!process.env.ALLOFF;

const ADDR = {
  first_name: '\u041c\u0430\u0440\u0438\u044f',          // ÐœÐ°Ñ€Ð¸Ñ�
  last_name: '\u041f\u0435\u0442\u0440\u043e\u0432\u0430', // ÐŸÐµÑ‚Ñ€Ð¾Ð²Ð°
  address_1: '\u0443\u043b. \u0426\u0430\u0440 \u041e\u0441\u0432\u043e\u0431\u043e\u0434\u0438\u0442\u0435\u043b 1',
  city: '\u0421\u0432\u0438\u0449\u043e\u0432',           // Ð¡Ð²Ð¸Ñ‰Ð¾Ð²
  postcode: '5250',
  phone: '0888123456',
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1400 } });
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  const n = await p.evaluate(async () => { const r = await fetch('/wp-json/wc/store/v1/cart', {credentials:'same-origin'}); return r.ok ? (await r.json()).items_count : -1; });
  console.log('cart items: ' + n);
  if (n < 1) { console.log('EMPTY CART'); await b.close(); process.exit(1); }

  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('.wc-block-components-text-input').first().waitFor({ timeout: 25000 });
  await p.waitForTimeout(3000);

  // email first - Woo will not push the address until the form is coherent
  const type = async (sel, value) => {
    const el = p.locator(sel).first();
    if (!(await el.count())) { console.log('  no field: ' + sel); return false; }
    await el.click();
    await el.fill(value);
    await p.waitForTimeout(250);
    return true;
  };
  await type('#email', 'test@darlinghome.bg');
  for (const [k, v] of Object.entries(ADDR)) {
    const ok = await type('.wc-block-components-address-form__' + k + ' input', v);
    console.log('  ' + k + (ok ? ' = ' + v : ''));
  }
  // blur, so the last field commits, then let the rates request run
  await p.locator('h2').first().click({ force: true }).catch(() => {});
  console.log('waiting for rates...');
  await p.waitForTimeout(9000);

  const beforeCss = await p.evaluate(() => ({
    rates: document.querySelectorAll('.wc-block-components-shipping-rates-control__package .wc-block-components-radio-control__option').length,
    msg: (document.querySelector('.wc-block-components-shipping-rates-control__no-shipping-address-message') || {}).textContent || null,
  }));
  console.log('rate rows: ' + beforeCss.rates + (beforeCss.msg ? '   (still showing: ' + beforeCss.msg.trim().slice(0, 60) + ')' : ''));

  if (ALLOFF) {
    await p.evaluate(() => { for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
      if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true; } });
    await p.addStyleTag({ content: CSS });
    await p.addScriptTag({ content: UI });
    await p.waitForTimeout(1500);
  }

  const out = await p.evaluate(() => {
    const clean = (el) => { const c = el.cloneNode(true);
      for (const nn of [c, ...c.querySelectorAll('*')]) {
        for (const a of [...nn.attributes]) if (!/^(class|type|role|for|id|name|checked|aria-label|aria-hidden)$/.test(a.name)) nn.removeAttribute(a.name);
        if (nn.tagName.toLowerCase() === 'svg') nn.innerHTML = '\u2026';
      }
      return c.outerHTML.replace(/></g, '>\n<'); };
    const R = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        display: cs.display, cols: cs.gridTemplateColumns, gap: cs.gap, pad: cs.padding,
        border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor }; };
    const fams = {};
    for (const sel of ['.wc-block-components-shipping-rates-control',
                       '.wc-block-components-shipping-rates-control__package',
                       '.wc-block-components-shipping-rates-control__package-item',
                       '.wc-block-checkout__shipping-option',
                       '.wc-block-checkout__shipping-method',
                       '.wc-block-checkout__shipping-method-option',
                       '.wc-block-checkout__shipping-method-option-title',
                       '.wc-block-checkout__shipping-method-option-price',
                       '.wc-block-checkout__shipping-method-option-icon',
                       '.wc-block-components-totals-shipping',
                       '.wc-block-components-totals-shipping__change-address-button',
                       '.wc-block-components-shipping-rates-control__no-shipping-address-message',
                       '.wc-block-components-address-card',
                       '.wc-block-components-address-address-wrapper']) fams[sel] = R(sel);
    const step = document.querySelector('.wc-block-checkout__shipping-option, .wp-block-woocommerce-checkout-shipping-methods-block');
    const totals = document.querySelector('.wc-block-components-totals-shipping');
    return { fams, html: step ? clean(step).slice(0, 4000) : 'NO SHIPPING STEP',
             totalsHtml: totals ? clean(totals).slice(0, 1200) : null };
  });

  let txt = 'B4 / SHIPPING, WITH AN ADDRESS IN THE FORM' + (ALLOFF ? '  (Woo dequeued)' : '  (Woo still loaded)') + '\n\n';
  txt += Object.entries(out.fams).map(([k, v]) => (v ? 'ok   ' : 'MISS ') + k + (v ? '\n       ' + JSON.stringify(v) : '')).join('\n');
  txt += '\n\n=== THE SHIPPING STEP\n' + out.html + '\n\n=== THE TOTALS ROW\n' + (out.totalsHtml || 'not rendered') + '\n';
  fs.writeFileSync(path.join(ROOT, process.env.OUTTXT || 'b4-shipping.txt'), txt, 'utf8');
  await p.screenshot({ path: process.env.OUT || 'b4-shipping.png', fullPage: true });
  console.log('-> ' + (process.env.OUTTXT || 'b4-shipping.txt') + ' and ' + (process.env.OUT || 'b4-shipping.png'));
  await b.close();
})();