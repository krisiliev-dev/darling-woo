// GATE / the express slab appears only when there is something in it
//
// Two states, and the second one has to be CAUSED because it cannot be waited
// for: headless Chromium always offers Google Pay, and blocking js.stripe.com
// removes the region from the DOM entirely rather than emptying it. So the
// empty state is reproduced the way Stripe produces it - the iframe stays and
// its height goes to zero - and what is asserted is OUR response to that.
//
//   node scripts/expressgate.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');

const fails = [];
const check = (what, got, want) => {
  if (got === want) { console.log('  ok  ' + what + '  ' + JSON.stringify(got)); }
  else { fails.push(what + ': got ' + JSON.stringify(got) + ', expected ' + JSON.stringify(want)); }
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1100 } });
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('.wc-block-components-text-input').first().waitFor({ timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(5000);
  await p.evaluate(() => { for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
    if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true; } });
  await p.addStyleTag({ content: CSS });
  await p.addScriptTag({ content: UI });
  await p.waitForTimeout(1600);

  const read = () => p.evaluate(() => {
    const ex = document.querySelector('.wc-block-components-express-payment');
    if (!ex) return { present: false };
    const rule = document.querySelector('.wc-block-components-express-payment-continue-rule');
    return { present: true, state: ex.getAttribute('data-d-express'),
             visible: ex.getBoundingClientRect().height > 0,
             ruleVisible: rule ? rule.getBoundingClientRect().height > 0 : null,
             rowHeight: Math.round((ex.querySelector('.wc-block-components-express-payment__event-buttons') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) };
  });

  console.log('1 a wallet is offered');
  const live = await read();
  if (!live.present) { console.log('  the express region is not on the page at all - nothing to gate'); await b.close(); process.exit(0); }
  check('marked live', live.state, 'live');
  check('region visible', live.visible, true);
  check('continue rule visible', live.ruleVisible, true);

  console.log('2 the wallet collapses, which is what Stripe does when none is available');
  await p.evaluate(() => {
    // Stripe keeps the iframe and animates its height to 0. Reproduce exactly
    // that rather than removing anything, so the script is answering the real
    // DOM and not a convenient one.
    const ex = document.querySelector('.wc-block-components-express-payment');
    for (const el of ex.querySelectorAll('iframe, .__PrivateStripeElement, [style*="min-height"]')) {
      el.style.setProperty('height', '0px', 'important');
      el.style.setProperty('min-height', '0px', 'important');
    }
  });
  await p.waitForTimeout(1200);
  const empty = await read();
  check('marked empty', empty.state, 'empty');
  check('region hidden', empty.visible, false);
  check('continue rule hidden', empty.ruleVisible, false);

  await p.screenshot({ path: 'b3-express-after.png', clip: { x: 0, y: 0, width: 1240, height: 420 } });
  await b.close();
  if (fails.length) { console.log('\nEXPRESSGATE FAIL'); fails.forEach((x) => console.log('  ' + x)); process.exit(1); }
  console.log('\nexpressgate: the slab is there when a wallet is, and gone when it is not.');
})();