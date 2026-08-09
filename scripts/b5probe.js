// B5 / why the order summary appears twice on a phone, and what else is left
// in the summary column.
//
// The owner asked how the floating duplicate happened. Rather than guess, this
// finds every summary on the page at phone width, walks up from each one to
// name the two, and then reads WOOCOMMERCE'S OWN stylesheet for the rule that
// used to hide one - because whatever it is, we dequeued it and never ported
// it, and porting the mechanism beats inventing a new one.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 1200 } });
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('.wc-block-components-text-input').first().waitFor({ timeout: 25000 });
  await p.waitForTimeout(3500);

  // 1. WITH Woo's own CSS still loaded - what does it look like when it works?
  const withWoo = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.wc-block-components-checkout-order-summary, .wc-block-checkout__sidebar').forEach((el, i) => {
      const trail = [];
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        trail.unshift(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string'
          ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
      }
      const r = el.getBoundingClientRect();
      out.push({ i, cls: (el.getAttribute('class') || '').slice(0, 90),
        h: Math.round(r.height), display: getComputedStyle(el).display,
        parentDisplay: el.parentElement ? getComputedStyle(el.parentElement).display : null,
        trail: trail.slice(-4).join(' > ') });
    });
    return out;
  });
  console.log('WITH WOO CSS:');
  withWoo.forEach((x) => console.log('  #' + x.i + '  h=' + x.h + '  display=' + x.display + '  ' + x.trail));

  // 2. Woo's own rule. Read the sheet, not a blog post.
  const rules = await p.evaluate(async () => {
    const link = [...document.querySelectorAll('link[rel=stylesheet]')]
      .map((l) => l.href).find((h) => /blocks\/checkout\.css/.test(h));
    if (!link) return { error: 'no blocks/checkout.css on the page' };
    const css = await (await fetch(link)).text();
    const hits = [];
    const re = /@media[^{]+\{[\s\S]*?\}\s*\}/g;
    let m;
    while ((m = re.exec(css))) {
      if (/sidebar|order-summary/.test(m[0]) && /display\s*:\s*none|display\s*:\s*block/.test(m[0])) {
        hits.push(m[0].replace(/\s+/g, ' ').slice(0, 420));
      }
    }
    // and the unconditional ones
    const flat = [];
    const re2 = /([^{}]*(?:sidebar-layout|checkout__sidebar|checkout__main|order-summary)[^{}]*)\{([^{}]*)\}/g;
    while ((m = re2.exec(css))) {
      if (/display|position|order|flex/.test(m[2])) flat.push((m[1].trim() + ' { ' + m[2].trim() + ' }').replace(/\s+/g, ' ').slice(0, 260));
    }
    return { media: hits.slice(0, 8), flat: flat.slice(0, 14) };
  });

  // 3. And now dequeued - the state we ship
  await p.evaluate(() => { for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
    if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true; } });
  await p.addStyleTag({ content: CSS });
  await p.addScriptTag({ content: UI });
  await p.waitForTimeout(1500);
  const ours = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.wc-block-components-checkout-order-summary, .wc-block-checkout__sidebar').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      out.push({ i, h: Math.round(r.height), y: Math.round(r.top + window.scrollY), display: getComputedStyle(el).display });
    });
    const fam = {};
    for (const sel of ['.wc-block-components-totals-coupon-link', '.wc-block-components-totals-coupon__content',
                       '.wc-block-components-totals-discount__coupon-list', '.wc-block-components-checkout-order-summary__content',
                       '.wc-block-components-product-badge', '.wc-block-components-notices__notice',
                       '.wc-block-components-notice-snackbar-list', '.wc-block-components-chip',
                       '.wc-block-components-chip__remove', '.wc-block-components-panel__button']) {
      const e = document.querySelector(sel);
      fam[sel] = e ? Math.round(e.getBoundingClientRect().height) : null;
    }
    return { out, fam };
  });
  console.log('\nDEQUEUED (what we ship):');
  ours.out.forEach((x) => console.log('  #' + x.i + '  y=' + x.y + '  h=' + x.h + '  display=' + x.display));
  console.log('\nB5 families present on this page:');
  Object.entries(ours.fam).forEach(([k, v]) => console.log('  ' + (v === null ? 'MISS ' : 'ok h=' + v + '  ') + k));

  let txt = 'B5 / THE SUMMARY, TWICE\n\nWITH WOO CSS\n' + JSON.stringify(withWoo, null, 1) +
            '\n\nWOO MEDIA RULES MENTIONING THE SIDEBAR OR SUMMARY\n' + JSON.stringify(rules, null, 1) +
            '\n\nDEQUEUED\n' + JSON.stringify(ours, null, 1) + '\n';
  fs.writeFileSync(path.join(ROOT, 'b5-summary.txt'), txt, 'utf8');
  await p.screenshot({ path: 'b5-phone.png', fullPage: true });
  console.log('\n-> b5-summary.txt, b5-phone.png');
  await b.close();
})();