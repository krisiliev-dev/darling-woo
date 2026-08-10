// wc-block-checkout-error - the one B7 family that had no decision, produced
// for real. And it turns out it has NOTHING to do with Stripe.
//
// Read out of the plugin's own bundle:
//
//   const so = !!getSetting("checkoutData", {}).code
//   zt = ["woocommerce_rest_product_out_of_stock",
//         "woocommerce_rest_product_not_purchasable",
//         "woocommerce_rest_product_partially_out_of_stock",
//         "woocommerce_rest_product_too_many_in_cart",
//         "woocommerce_rest_cart_item_error"]
//
// So it is a PAGE-LOAD state driven by a server-side setting, and every code
// that reaches it is a CART problem. A declined card produces a notice, not
// this. I said the opposite in the B7 commit message; that was wrong.
//
// Which means it can be produced with no payment at all: put the product in the
// cart, make the product unbuyable, load /checkout/. Two phases, because the
// change has to happen BETWEEN the add and the load:
//
//   node scripts/b7error.js seed     <- adds to cart, saves the session
//   (out of band) set the product out of stock on the box
//   node scripts/b7error.js shoot    <- loads that session, captures the state
//   (out of band) put the product back in stock
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const BASE = process.env.BASE || 'https://darlinghome.bg';
const STATE = path.join(ROOT, '.b7cart.json');
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');
const MODE = process.argv[2] || 'shoot';

// every class the error branch renders, including Woo's own typo:
// `wc-block-checkout-error_title` has ONE underscore, not two.
const FAMILY = [
  '.wc-block-checkout-error',
  '.wc-block-checkout-error__image',
  '.wc-block-checkout-error_title',
  '.wc-block-checkout-error__description',
  '.wc-block-must-login-prompt',
];

const PROBE = `() => {
  const out = {};
  for (const sel of ${JSON.stringify(FAMILY)}) {
    const e = document.querySelector(sel);
    if (!e) { out[sel] = 'MISS'; continue; }
    const b = e.getBoundingClientRect();
    const c = getComputedStyle(e);
    out[sel] = {
      rect: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
      display: c.display, pad: c.padding, border: c.borderTopWidth + ' ' + c.borderTopStyle,
      color: c.color, bg: c.backgroundColor, size: c.fontSize, weight: c.fontWeight,
      align: c.textAlign,
      txt: (e.textContent || '').trim().slice(0, 90),
    };
  }
  out['_settingCode'] = (window.wcSettings && window.wcSettings.checkoutData && window.wcSettings.checkoutData.code) || null;
  return out;
}`;

(async () => {
  const browser = await chromium.launch();

  if (MODE === 'seed') {
    const ctx = await browser.newContext({ viewport: { width: 1240, height: 1400 } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/shop/', { waitUntil: 'domcontentloaded' });
    const href = await p.locator('a[href*="/product/"]').first().getAttribute('href');
    await p.goto(href, { waitUntil: 'domcontentloaded' });
    const form = p.locator('form.cart').first();
    await form.locator('button[type="submit"], input[type="submit"]').first().click();
    await p.waitForLoadState('domcontentloaded');
    await p.waitForTimeout(1500);

    // do not trust the click - ask the cart
    await p.goto(BASE + '/cart/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);
    const n = await p.evaluate(() => document.querySelectorAll('.wc-block-cart-items__row, .wc-block-cart-item__wrap').length);
    console.log('cart rows after seeding: ' + n);
    if (!n) { console.log('SEED FAILED - nothing in the cart, do not run shoot'); process.exit(1); }
    await ctx.storageState({ path: STATE });
    console.log('session saved -> ' + STATE);
    await browser.close();
    return;
  }

  if (!fs.existsSync(STATE)) { console.log('no ' + STATE + ' - run `seed` first'); process.exit(1); }
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 1400 }, storageState: STATE });
  const p = await ctx.newPage();

  // networkidle can never settle on the error page - the block bails out before
  // the Store API polling starts, and Stripe keeps a socket open regardless
  const resp = await p.goto(BASE + '/checkout/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('status ' + (resp && resp.status()) + '   landed on ' + p.url());
  await p.waitForTimeout(2500);

  const before = await p.evaluate('(' + PROBE + ')()');
  console.log('\n=== WITH WOO STYLES (before)');
  console.log(JSON.stringify(before, null, 1));
  if (before['.wc-block-checkout-error'] === 'MISS') {
    console.log('\nthe error state did not render. checkoutData.code = ' + before._settingCode);
    console.log('the product is probably still buyable - check the box before blaming the capture.');
  }
  await p.screenshot({ path: 'b7-error-before.png', fullPage: true });

  // the cutover state: our old sheet AND Woo's off, our build on
  const off = await p.evaluate(() => {
    const killed = [];
    for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
      if (/\/themes\/darling\/style\.css|assets\/darling\.css/.test(l.href) ||
          /wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) {
        l.disabled = true; killed.push(l.href.split('/').pop());
      }
    }
    return killed;
  });
  console.log('\nsheets disabled: ' + JSON.stringify(off));
  await p.addStyleTag({ content: CSS });
  await p.addScriptTag({ content: UI });
  await p.waitForTimeout(1200);

  const after = await p.evaluate('(' + PROBE + ')()');
  console.log('\n=== DEQUEUED, OURS ON (after)');
  console.log(JSON.stringify(after, null, 1));
  await p.screenshot({ path: 'b7-error-after.png', fullPage: true });

  fs.writeFileSync(path.join(ROOT, 'b7-error.txt'),
    'BEFORE (Woo styles on)\n' + JSON.stringify(before, null, 1) +
    '\n\nAFTER (dequeued, ours on)\n' + JSON.stringify(after, null, 1) + '\n');
  console.log('\n-> b7-error.txt, b7-error-before.png, b7-error-after.png');
  await browser.close();
})();
