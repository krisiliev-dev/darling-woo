// AUDIT / what does WooCommerce actually DO about alignment, and do we?
//
// The owner's question: "What does the Woo style cover in terms of alignment?
// We need to make sure we take care of each thing that Woo took care of."
//
// So this does not read one file. It opens five real pages, takes every
// stylesheet WooCommerce/Stripe enqueue on them, and counts the declarations
// that decide WHERE SOMETHING SITS - not colour, not type. Then it asks, for
// every class family that carries one, whether our built stylesheet says
// anything about that family at all.
//
// It reports three numbers per family: Woo's alignment declarations, ours, and
// whether we have any rule for it. A family with alignment in Woo and nothing
// in ours is a hole the dequeue will open.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'https://darlinghome.bg';
const OURS = fs.readFileSync(path.join(__dirname, '..', 'theme/darling/darling.build.css'), 'utf8');
const OUT = path.join(__dirname, '..', 'align-audit.txt');

// The properties that decide position. Deliberately broad: a margin is an
// alignment decision as much as a justify-content is, and most of the checkout
// bugs so far were margins.
const ALIGN = /^(text-align|text-align-last|vertical-align|align-items|align-self|align-content|justify-content|justify-items|justify-self|place-items|place-content|place-self|gap|row-gap|column-gap|grid-gap|display|flex|flex-direction|flex-wrap|flex-flow|flex-basis|flex-grow|flex-shrink|order|grid|grid-template|grid-template-columns|grid-template-rows|grid-template-areas|grid-column|grid-row|grid-area|grid-auto-flow|grid-auto-columns|grid-auto-rows|float|clear|position|top|right|bottom|left|inset|inset-block|inset-inline|margin|margin-top|margin-right|margin-bottom|margin-left|margin-block|margin-inline|margin-block-start|margin-block-end|margin-inline-start|margin-inline-end|padding|padding-top|padding-right|padding-bottom|padding-left|padding-block|padding-inline|width|min-width|max-width|height|min-height|max-height|direction|writing-mode|transform|translate|columns|column-count)$/;

// Split a stylesheet into (selector, declarations) pairs. Brace-counting rather
// than a regex, because Woo ships nested CSS and at-rules and a regex reports
// "0 rules, 56 media blocks" - which it did, once, and I believed it.
function rules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0, depth = 0, start = 0, sel = '';
  const stack = [];
  while (i < css.length) {
    const c = css[i];
    if (c === '{') {
      const head = css.slice(start, i).trim();
      stack.push(head);
      depth++; i++; start = i; continue;
    }
    if (c === '}') {
      const head = stack.pop();
      const body = css.slice(start, i);
      // a block whose body has declarations and whose head is not an at-rule
      if (head && head[0] !== '@' && /[a-z-]+\s*:/.test(body.replace(/[^{}]*\{[\s\S]*?\}/g, ''))) {
        out.push([head, body.replace(/[^{}]*\{[\s\S]*?\}/g, '')]);
      }
      depth--; i++; start = i; continue;
    }
    i++;
  }
  return out;
}

function decls(body) {
  const res = [];
  for (const part of body.split(';')) {
    const k = part.indexOf(':');
    if (k < 0) continue;
    const prop = part.slice(0, k).trim().toLowerCase();
    if (ALIGN.test(prop)) res.push(prop);
  }
  return res;
}

const FAMILY = /\.((?:wc|wp-block-woocommerce|woocommerce)[a-z0-9_-]*)/g;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 900 } });

  // seed a cart so /checkout/ and /cart/ are not the empty-cart trap
  await p.goto(BASE + '/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  const n = await p.evaluate(async () => { const r = await fetch('/wp-json/wc/store/v1/cart', {credentials:'same-origin'}); return r.ok ? (await r.json()).items_count : -1; });
  console.log('cart items: ' + n);

  const PAGES = ['/', '/shop/', prod, '/cart/', '/checkout/', '/my-account/'];
  const sheets = new Map();
  for (const u of PAGES) {
    try {
      await p.goto(u.startsWith('http') ? u : BASE + u, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForTimeout(1800);
    } catch (e) { console.log('  (' + u + ' did not settle: ' + e.message.split('\n')[0] + ')'); }
    const hrefs = await p.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href));
    let added = 0;
    for (const h of hrefs) {
      if (!/woocommerce|wc-blocks|wc-|stripe|packages-style|store-notices|photoswipe|select2|brands|blocktheme/i.test(h)) continue;
      if (sheets.has(h)) continue;
      const css = await p.evaluate(async (u2) => { try { const r = await fetch(u2); return r.ok ? await r.text() : ''; } catch (e) { return ''; } }, h);
      if (css) { sheets.set(h, css); added++; }
    }
    console.log(u + '  -> ' + hrefs.length + ' sheets, ' + added + ' new third-party');
  }
  await b.close();

  // ---- count
  const propTotals = new Map();
  const fam = new Map();     // family -> {props:Set, rules:n}
  let ruleCount = 0, alignRules = 0;
  for (const [href, css] of sheets) {
    for (const [sel, body] of rules(css)) {
      ruleCount++;
      const d = decls(body);
      if (!d.length) continue;
      alignRules++;
      for (const prop of d) propTotals.set(prop, (propTotals.get(prop) || 0) + 1);
      const names = new Set();
      let m; FAMILY.lastIndex = 0;
      while ((m = FAMILY.exec(sel))) names.add(m[1]);
      for (const nm of names) {
        if (!fam.has(nm)) fam.set(nm, { props: new Set(), rules: 0 });
        const e = fam.get(nm); e.rules++;
        for (const prop of d) e.props.add(prop);
      }
    }
  }

  // ---- what do WE say about each family?
  const ourRules = rules(OURS);
  const ourFam = new Map();
  for (const [sel, body] of ourRules) {
    const d = decls(body);
    let m; FAMILY.lastIndex = 0;
    while ((m = FAMILY.exec(sel))) {
      const nm = m[1];
      if (!ourFam.has(nm)) ourFam.set(nm, { props: new Set(), rules: 0 });
      const e = ourFam.get(nm); e.rules++;
      for (const prop of d) e.props.add(prop);
    }
  }

  const L = [];
  L.push('WHAT WOOCOMMERCE DOES ABOUT ALIGNMENT, AND WHETHER WE DO IT TOO');
  L.push('');
  L.push('sheets read: ' + sheets.size);
  for (const h of sheets.keys()) L.push('  ' + h.replace(/^https?:\/\/[^/]+/, ''));
  L.push('');
  L.push('rules: ' + ruleCount + '   of which carry a positioning declaration: ' + alignRules);
  L.push('');
  L.push('-- BY PROPERTY (how often Woo positions something with it) ------------');
  for (const [k, v] of [...propTotals].sort((a, b2) => b2[1] - a[1])) L.push('  ' + String(v).padStart(5) + '  ' + k);
  L.push('');

  const rows = [...fam].sort((a, b2) => b2[1].rules - a[1].rules);
  const uncovered = rows.filter((r) => !ourFam.has(r[0]));
  const covered = rows.filter((r) => ourFam.has(r[0]));
  L.push('-- FAMILIES WITH POSITIONING IN WOO AND NO RULE OF OURS ---------------');
  L.push('   ' + uncovered.length + ' of ' + rows.length + ' families. Each is a hole the dequeue opens.');
  L.push('');
  for (const [nm, e] of uncovered.slice(0, 120)) {
    L.push('  ' + String(e.rules).padStart(4) + '  .' + nm);
    L.push('        ' + [...e.props].sort().join(' '));
  }
  if (uncovered.length > 120) L.push('  ... and ' + (uncovered.length - 120) + ' more');
  L.push('');
  L.push('-- FAMILIES WE ALREADY TOUCH, AND THE PROPERTIES WE DO NOT SET --------');
  L.push('   (Woo positions with these; our rule for the same family is silent)');
  L.push('');
  let gaps = 0;
  for (const [nm, e] of covered) {
    const ours = ourFam.get(nm);
    const missing = [...e.props].filter((x) => !ours.props.has(x)).sort();
    if (!missing.length) continue;
    gaps++;
    L.push('  .' + nm + '   (woo ' + e.rules + ' rules, ours ' + ours.rules + ')');
    L.push('        missing: ' + missing.join(' '));
  }
  L.push('');
  L.push('families we touch but leave a positioning property unanswered: ' + gaps);
  fs.writeFileSync(OUT, L.join('\n'), 'utf8');
  console.log('\n-> ' + OUT + '  (' + L.length + ' lines)');
  console.log('sheets ' + sheets.size + ', rules ' + ruleCount + ', positioning rules ' + alignRules +
              ', families ' + rows.length + ', uncovered ' + uncovered.length + ', partial ' + gaps);
})();