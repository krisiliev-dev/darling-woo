// Where does the Stripe plugin take its Elements `appearance` from?
// We generate one from our tokens and nothing loads it. Before writing a hook,
// find out what the plugin actually reads - from the plugin's own shipped
// JavaScript, not from a blog post about a different version.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('https://darlinghome.bg/', { waitUntil: 'domcontentloaded' });
  const srcs = await p.evaluate(async () => {
    const found = [];
    // the checkout page is where the blocks bundle loads; harvest from there
    const r = await fetch('/checkout/', { credentials: 'same-origin' });
    const html = await r.text();
    const re = /src=["']([^"']*(?:stripe)[^"']*\.js[^"']*)["']/gi;
    let m; while ((m = re.exec(html))) found.push(m[1]);
    return [...new Set(found)];
  });
  console.log('stripe scripts on /checkout/:');
  srcs.forEach((s) => console.log('  ' + s.replace(/^https?:\/\/[^/]+/, '')));
  let report = 'STRIPE APPEARANCE - WHERE THE PLUGIN READS IT FROM\n\n';
  for (const s of srcs) {
    const url = s.startsWith('http') ? s : 'https://darlinghome.bg' + s;
    const js = await p.evaluate(async (u) => { try { const r = await fetch(u); return r.ok ? await r.text() : ''; } catch (e) { return ''; } }, url);
    if (!js) continue;
    const hits = [];
    for (const pat of [/appearance/gi, /applyFilters\(\s*['"]([^'"]+)['"]/g, /wc_stripe_[a-z_]+/g, /upeAppearance|appearanceTheme|blocksAppearance/g]) {
      let m; pat.lastIndex = 0;
      while ((m = pat.exec(js))) {
        const around = js.slice(Math.max(0, m.index - 90), m.index + 120).replace(/\s+/g, ' ');
        hits.push(around);
        if (hits.length > 60) break;
      }
    }
    const uniq = [...new Set(hits)];
    report += '=== ' + url.replace(/^https?:\/\/[^/]+/, '') + '  (' + Math.round(js.length / 1024) + ' KB)\n';
    for (const h of uniq.slice(0, 40)) report += '  ...' + h + '...\n';
    report += '\n';
    console.log('%s: %d KB, %d distinct mentions', url.split('/').pop().slice(0, 40), Math.round(js.length / 1024), uniq.length);
  }
  fs.writeFileSync(path.join(path.dirname(__dirname), 'stripe-hook.txt'), report, 'utf8');
  console.log('-> stripe-hook.txt');
  await b.close();
})();