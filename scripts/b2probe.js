// B2 / what is actually in the payment region, dequeued.
//
// Same rule as B1: read the markup off the browser, not off the class names,
// and do it with Woo's stylesheets DISABLED so what is measured is the cutover
// state rather than "ours on top of theirs".
//
// It also clicks the second method, because a payment option that is not
// selected does not mount its content - Stripe's card fields do not exist in
// the DOM until its radio is chosen, and every earlier capture of this page
// was therefore a capture of one collapsed row.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');
const BASE = 'https://darlinghome.bg';

const KILL = () => {
  for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
    if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true;
  }
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1200 } });
  await p.goto(BASE + '/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  const n = await p.evaluate(async () => { const r = await fetch('/wp-json/wc/store/v1/cart', {credentials:'same-origin'}); return r.ok ? (await r.json()).items_count : -1; });
  console.log('cart items: ' + n);
  if (n < 1) { console.log('EMPTY CART - nothing below would be true'); await b.close(); process.exit(1); }

  await p.goto(BASE + '/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('.wc-block-components-text-input').first().waitFor({ timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(2500);
  await p.evaluate(KILL);
  await p.addStyleTag({ content: CSS });
  await p.addScriptTag({ content: UI });
  await p.waitForTimeout(1200);

  const radios = await p.locator('.wc-block-components-radio-control__input').all();
  console.log('payment radios: ' + radios.length);

  const dump = async (label) => {
    const out = await p.evaluate(() => {
      const clean = (el) => {
        const c = el.cloneNode(true);
        for (const nn of [c, ...c.querySelectorAll('*')]) {
          for (const a of [...nn.attributes]) {
            if (!/^(class|type|role|for|id|name|checked|aria-label|aria-hidden|alt|src)$/.test(a.name)) nn.removeAttribute(a.name);
            if (a.name === 'src' && a.value.length > 60) nn.setAttribute('src', a.value.slice(0, 55) + '...');
          }
          if (nn.tagName.toLowerCase() === 'svg') nn.innerHTML = '\u2026';
          if (nn.tagName === 'IFRAME') nn.innerHTML = '';
        }
        return c.outerHTML.replace(/></g, '>\n<');
      };
      const R = (s) => { const e = document.querySelector(s); if (!e) return null;
        const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
                 display: cs.display, border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
                 bg: cs.backgroundColor, pad: cs.padding, radius: cs.borderRadius, gap: cs.gap }; };
      const region = document.querySelector('.wp-block-woocommerce-checkout-payment-block, .wc-block-checkout__payment-method');
      const fams = {};
      for (const sel of ['.wc-block-checkout__payment-method',
                         '.wc-block-components-checkout-payment-methods',
                         '.wc-block-components-radio-control',
                         '.wc-block-components-radio-control-accordion-option',
                         '.wc-block-components-radio-control__option',
                         '.wc-block-components-radio-control__label-group',
                         '.wc-block-components-radio-control__description-group',
                         '.wc-block-components-radio-control__description',
                         '.wc-block-components-payment-method-icons',
                         '.wc-block-components-payment-method-label',
                         '.wc-block-components-radio-control-accordion-content',
                         '.wc-block-gateway-container',
                         '.wc-block-card-elements',
                         '.wc-block-checkout__no-payment-methods-notice']) fams[sel] = R(sel);
      return { html: region ? clean(region).slice(0, 5200) : 'NO PAYMENT REGION', fams };
    });
    return label + '\n' + '='.repeat(72) + '\n' + out.html + '\n\n' +
      Object.entries(out.fams).map(([k, v]) => '  ' + (v ? 'ok  ' : 'MISS ') + k + (v ? '\n        ' + JSON.stringify(v) : '')).join('\n');
  };

  let txt = await dump('A. AS IT ARRIVES (first method selected)');
  await p.locator('.wc-block-components-checkout-step--payment, .wp-block-woocommerce-checkout-payment-block')
    .first().screenshot({ path: 'b2-payment-a.png' }).catch(() => {});

  if (radios.length > 1) {
    await radios[1].click({ force: true }).catch((e) => console.log('could not select the second method: ' + e.message.split('\n')[0]));
    await p.waitForTimeout(3500);
    txt += '\n\n\n' + await dump('B. WITH THE SECOND METHOD SELECTED');
    await p.locator('.wc-block-components-checkout-step--payment, .wp-block-woocommerce-checkout-payment-block')
      .first().screenshot({ path: 'b2-payment-b.png' }).catch(() => {});
  }
  fs.writeFileSync(path.join(ROOT, 'b2-payment.txt'), txt, 'utf8');
  console.log('-> b2-payment.txt, ' + txt.length + ' bytes');
  await b.close();
})();