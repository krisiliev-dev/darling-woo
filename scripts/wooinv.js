// "Have we covered everything Woo does?" - answered with a count, not a feeling.
//
// The stage-6 parse read TWO sheets: blocks/checkout.css and packages-style.css.
// WooCommerce enqueues more than that, and the password meter proved the cost -
// it lives in woocommerce.css, no phase list ever saw it, and it was live on
// /my-account/ the whole time.
//
// So this walks every customer surface, and for each one asks THREE questions
// whose intersection is the actual remaining work:
//
//   1. which families does each Woo/Stripe sheet DEFINE?
//   2. which of those are PRESENT in the DOM of a page a customer can reach?
//   3. which of those does darling.build.css NOT name?
//
// (1) alone overcounts wildly - a sheet defines every variant of every feature.
// (2) is B7's lesson: a family nobody can reach is not work. (3) is the gap.
//
// *** THE WALKER CHECKS selectorText BEFORE cssRules. *** Chrome's CSS nesting
// support gives EVERY style rule a cssRules property, so a walker that recurses
// on `if (r.cssRules)` descends past every rule and reports an empty stylesheet.
// The first stage-6 run said "0 rules, 56 media blocks" for exactly this reason.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const OURS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const BASE = process.env.BASE || 'https://darlinghome.bg';

const SURFACES = ['/', '/shop/', '/cart/', '/checkout/', '/my-account/', '/my-account/lost-password/'];
const WOO = /woocommerce|wc-blocks|packages-style|select2|stripe|upe-|express-checkout|store-notices|cart-link|all-products/i;

// every class our build names, from selectors only - a class inside a comment
// is not drawn
const ourClasses = new Set();
OURS.replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{[^{}]*\}/g, '{}')
  .replace(/\.(-?[_a-zA-Z][\w-]*)/g, (m, c) => { ourClasses.add(c); return m; });

const COLLECT = `() => {
  const sheets = {};
  const CLS = /\\.(-?[_a-zA-Z][\\w-]*)/g;
  const walk = (rules, bag) => {
    for (const r of rules) {
      // selectorText FIRST - see the header comment
      if (r.selectorText) {
        bag.rules++;
        let m;
        while ((m = CLS.exec(r.selectorText))) bag.fam.add(m[1]);
      } else if (r.cssRules) {
        walk(r.cssRules, bag);
      }
    }
  };
  for (const s of document.styleSheets) {
    const href = s.href || '(inline)';
    if (!/woocommerce|wc-blocks|packages-style|select2|stripe|upe-|express-checkout|store-notices|cart-link|all-products/i.test(href)) continue;
    const name = href.split('/').pop().split('?')[0];
    const bag = sheets[name] || (sheets[name] = { rules: 0, fam: new Set() });
    try { walk(s.cssRules, bag); } catch (e) { bag.blocked = true; }
  }
  const present = new Set();
  document.querySelectorAll('*').forEach((el) => {
    const c = typeof el.className === 'string' ? el.className : '';
    c.split(/\\s+/).forEach((x) => { if (x) present.add(x); });
  });
  const out = { sheets: {}, present: [...present] };
  for (const k in sheets) out.sheets[k] = { rules: sheets[k].rules, fam: [...sheets[k].fam], blocked: !!sheets[k].blocked };
  return out;
}`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const perSheet = {};
  const presentAll = new Set();
  const lines = [];
  const say = (s) => { console.log(s); lines.push(s); };

  for (const s of SURFACES) {
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + s, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await p.waitForTimeout(3000);
      const r = await p.evaluate('(' + COLLECT + ')()');
      for (const k in r.sheets) {
        const t = perSheet[k] || (perSheet[k] = { rules: 0, fam: new Set(), blocked: false });
        t.rules = Math.max(t.rules, r.sheets[k].rules);
        r.sheets[k].fam.forEach((f) => t.fam.add(f));
        t.blocked = t.blocked || r.sheets[k].blocked;
      }
      r.present.forEach((c) => presentAll.add(c));
      say('walked ' + s + '  (' + Object.keys(r.sheets).length + ' woo sheets, ' + r.present.length + ' classes in DOM)');
    } catch (e) {
      say('walked ' + s + '  FAILED: ' + e.message.split('\n')[0]);
    }
    await p.close();
  }

  say('');
  say('=== PER SHEET: defined / present on a real page / not named by us');
  say('');
  say('  sheet                          rules  defined  present  UNNAMED');
  let totalGap = 0;
  const gapByName = {};
  const names = Object.keys(perSheet).sort();
  for (const n of names) {
    const t = perSheet[n];
    const defined = [...t.fam];
    const present = defined.filter((f) => presentAll.has(f));
    const unnamed = present.filter((f) => !ourClasses.has(f));
    totalGap += unnamed.length;
    gapByName[n] = unnamed;
    say('  ' + n.padEnd(30) + String(t.rules).padStart(5) + String(defined.length).padStart(9) +
        String(present.length).padStart(9) + String(unnamed.length).padStart(9) + (t.blocked ? '  (CORS-blocked)' : ''));
  }
  say('');
  say('TOTAL families defined by Woo, reachable on a real page, and NOT named by our build: ' + totalGap);
  say('');
  for (const n of names) {
    if (!gapByName[n].length) continue;
    say('--- ' + n + ' (' + gapByName[n].length + ')');
    say('    ' + gapByName[n].sort().join('\n    '));
  }
  fs.writeFileSync(path.join(ROOT, 'woo-inventory.txt'), lines.join('\n') + '\n');
  console.log('\n-> woo-inventory.txt');
  await browser.close();
})();
