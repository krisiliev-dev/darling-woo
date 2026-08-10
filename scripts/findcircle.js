// NAME THE CIRCLE.
//
// It is on screen for a fraction of a second, so a single probe at one moment
// keeps missing it. This samples the first three seconds - DOM dump AND
// screenshot at each tick - and reports every element big enough to be it,
// SVGs included, because a stroked <svg> circle has no border-radius to find.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');

const BIG = () => {
  const out = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 300 || r.height < 300) continue;
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const isSvg = tag === 'svg' || tag === 'circle' || tag === 'path' || tag === 'img';
    const round = /50%|9999|circle/.test(cs.borderRadius) || parseFloat(cs.borderRadius) >= 150;
    // an svg, or something round, or something with a very thick border
    const thick = parseFloat(cs.borderTopWidth) >= 6;
    if (!isSvg && !round && !thick) continue;
    out.push({
      tag,
      cls: (el.getAttribute('class') || '').slice(0, 70),
      id: el.id || '',
      w: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.left), y: Math.round(r.top),
      radius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
      stroke: cs.stroke, strokeW: cs.strokeWidth, fill: cs.fill,
      viewBox: el.getAttribute ? (el.getAttribute('viewBox') || '') : '',
      parent: (el.parentElement && (el.parentElement.getAttribute('class') || el.parentElement.tagName)) ?
        String(el.parentElement.getAttribute('class') || el.parentElement.tagName).slice(0, 60) : '',
    });
  }
  return out;
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1240, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  await ctx.route('**/wp-json/wc/store/**', async (r) => { await new Promise((res) => setTimeout(res, 9000)); r.continue(); });

  // inject at document-start so our CSS is on from the first paint - the same
  // condition the broken capture was taken under
  await p.addInitScript({ content: `
    window.__darlingCss = ${JSON.stringify(CSS)};
    document.addEventListener('DOMContentLoaded', function () {
      for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
        if (/\\/themes\\/darling\\/style\\.css|assets\\/darling\\.css|wc-blocks|packages-style|woocommerce|all-products|cart\\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true;
      }
      var s = document.createElement('style'); s.textContent = window.__darlingCss;
      document.head.appendChild(s);
    });
  ` });

  await p.goto('https://darlinghome.bg/cart/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  let report = 'NAMING THE CIRCLE - cart, Store API held 9s, our CSS from first paint\n\n';
  for (const t of [150, 300, 500, 800, 1200, 1800, 2600]) {
    await p.waitForTimeout(t === 150 ? 150 : 0);
    const hits = await p.evaluate(BIG);
    report += '=== t+' + t + 'ms   ' + hits.length + ' candidate(s)\n';
    for (const h of hits) report += '  ' + JSON.stringify(h) + '\n';
    console.log('t+' + t + 'ms: ' + hits.length + (hits.length ? '  ' + hits.map((h) => h.tag + '.' + (h.cls.split(' ')[0] || '?') + ' ' + h.w + 'x' + h.h).join(' | ') : ''));
    await p.screenshot({ path: 'circ-' + t + '.png', clip: { x: 0, y: 0, width: 1240, height: 900 } });
    if (t !== 2600) await p.waitForTimeout(([300, 500, 800, 1200, 1800, 2600][[150, 300, 500, 800, 1200, 1800].indexOf(t)] - t));
  }
  fs.writeFileSync(path.join(ROOT, 'circle.txt'), report, 'utf8');
  console.log('-> circle.txt and circ-*.png');
  await b.close();
})();