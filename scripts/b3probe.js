// B3 / the express slab, in both of its states.
//
// The owner sees a "Burzo plashtane" title with nothing under it. Headless
// Chromium renders a Google Pay button there, so the empty state cannot be
// reproduced by loading the page - it has to be CAUSED. Blocking js.stripe.com
// causes it honestly: the express element never mounts, which is the same DOM
// a browser with no available wallet ends up with.
//
// Runs twice and dumps the markup and the measured height of the express
// region in each state, so a rule can be written against the difference rather
// than against a guess about it.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');

const KILL = () => { for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
  if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true; } };

async function run(block) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1240, height: 1100 } });
  if (block) {
    await ctx.route('**://js.stripe.com/**', (r) => r.abort());
    await ctx.route('**://*.stripe.com/**', (r) => r.abort());
  }
  const p = await ctx.newPage();
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('.wc-block-components-text-input').first().waitFor({ timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(5000);
  await p.evaluate(KILL);
  await p.addStyleTag({ content: CSS });
  await p.addScriptTag({ content: UI });
  await p.waitForTimeout(1500);

  const r = await p.evaluate(() => {
    const clean = (el) => { const c = el.cloneNode(true);
      for (const n of [c, ...c.querySelectorAll('*')]) {
        for (const a of [...n.attributes]) if (!/^(class|id|role|type|aria-label|aria-hidden|style)$/.test(a.name)) n.removeAttribute(a.name);
        if (n.tagName === 'IFRAME') n.innerHTML = '';
      }
      return c.outerHTML.replace(/></g, '>\n<'); };
    const ex = document.querySelector('.wc-block-components-express-payment');
    if (!ex) return { present: false };
    const R = (e) => { const b2 = e.getBoundingClientRect(); return [Math.round(b2.width), Math.round(b2.height)]; };
    const buttons = ex.querySelectorAll('button');
    const frames = ex.querySelectorAll('iframe');
    const wrapper = ex.closest('.wc-block-checkout__form > div') || ex.parentElement;
    return {
      present: true,
      exRect: R(ex), exDisplay: getComputedStyle(ex).display,
      wrapperRect: R(wrapper), wrapperDisplay: getComputedStyle(wrapper).display,
      buttons: buttons.length, buttonRects: [...buttons].map(R),
      iframes: frames.length, iframeRects: [...frames].map(R),
      title: (ex.querySelector('.wc-block-components-express-payment__title') || {}).textContent || null,
      rule: !!document.querySelector('.wc-block-components-express-payment-continue-rule'),
      ruleRect: document.querySelector('.wc-block-components-express-payment-continue-rule')
        ? R(document.querySelector('.wc-block-components-express-payment-continue-rule')) : null,
      html: clean(ex).slice(0, 1800),
    };
  });
  await p.screenshot({ path: block ? 'b3-express-empty.png' : 'b3-express-live.png',
                       clip: { x: 0, y: 0, width: 1240, height: 460 } });
  await b.close();
  return r;
}

(async () => {
  const live = await run(false);
  const empty = await run(true);
  const txt = 'B3 / THE EXPRESS SLAB IN BOTH STATES\n\n' +
    '=== WITH STRIPE REACHABLE (a wallet button mounts)\n' + JSON.stringify(live, null, 1) + '\n\n' +
    '=== WITH js.stripe.com BLOCKED (the state the owner sees)\n' + JSON.stringify(empty, null, 1) + '\n';
  fs.writeFileSync(path.join(ROOT, 'b3-express.txt'), txt, 'utf8');
  console.log('live : ' + JSON.stringify({ ex: live.exRect, buttons: live.buttons, iframes: live.iframes, wrapper: live.wrapperRect }));
  console.log('empty: ' + JSON.stringify({ ex: empty.exRect, buttons: empty.buttons, iframes: empty.iframes, wrapper: empty.wrapperRect }));
  console.log('-> b3-express.txt');
})();