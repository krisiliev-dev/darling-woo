// THE WORKSHEET: every WooCommerce/Stripe stylesheet the STOREFRONT loads, what
// each one dresses, and whether we have an equivalent yet.
//
// The owner asked for this directly: "I want to make sure that every Woo style
// has a Darling equivalent... get all of the stylesheets Woo has and put them in
// a list so we can work through them."
//
// Handles come from WordPress itself (wp_styles->registered, editor sheets
// dropped — those dress wp-admin and never the storefront). The CSS is then
// fetched from the live site, because the plugin's assets are public and that is
// the same bytes a customer gets.
//
// *** A FAMILY COUNT IS NOT A WORK ESTIMATE. *** A sheet defines every variant
// of every feature, most of which this store will never switch on - B7 measured
// 21 such families and wrote zero rules for them. So `unnamed` here is an UPPER
// BOUND on the work, and the reachability walk (scripts/wooinv.js) is what turns
// it into a real number.
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const OURS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');

const ourClasses = new Set();
OURS.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{[^{}]*\}/g, '{}')
  .replace(/\.(-?[_a-zA-Z][\w-]*)/g, (m, c) => { ourClasses.add(c); return m; });

const lines = fs.readFileSync(path.join(ROOT, 'woo-handles.txt'), 'utf8').split(/\r?\n/);
const sheets = [];
for (const l of lines) {
  const i = l.indexOf('|http');
  if (i < 0) continue;
  sheets.push({ handle: l.slice(0, i).trim(), url: l.slice(i + 1).trim().replace(/^http:/, 'https:') });
}

// which sheets are the classic three vs per-block; used only to sort the worksheet
const CLASSIC = ['woocommerce-general', 'woocommerce-layout', 'woocommerce-smallscreen', 'woocommerce-blocktheme'];

(async () => {
  const rows = [];
  for (const s of sheets) {
    let css = '';
    try {
      const r = await fetch(s.url);
      if (!r.ok) { rows.push({ ...s, err: 'HTTP ' + r.status }); continue; }
      css = await r.text();
    } catch (e) { rows.push({ ...s, err: e.message.slice(0, 40) }); continue; }

    const clean = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
    // a rule is a selector list followed by a declaration block; at-rules that
    // only wrap (media, supports) are skipped by requiring a non-{ selector
    let rules = 0;
    const fam = new Set();
    clean.replace(/([^{}@][^{}]*)\{([^{}]*)\}/g, (m, sel, body) => {
      if (!body.includes(':')) return m;
      rules++;
      let c; const CLS = /\.(-?[_a-zA-Z][\w-]*)/g;
      while ((c = CLS.exec(sel))) fam.add(c[1]);
      return m;
    });
    const families = [...fam];
    const unnamed = families.filter((f) => !ourClasses.has(f));
    rows.push({ ...s, kb: Math.round(css.length / 102.4) / 10, rules, fam: families.length, named: families.length - unnamed.length, unnamed: unnamed.length, list: unnamed });
  }

  rows.sort((a, b) => (b.rules || 0) - (a.rules || 0));

  const out = [];
  const say = (x) => { console.log(x); out.push(x); };
  say('| handle | file | KB | rules | families | ours | to do |');
  say('|---|---|---:|---:|---:|---:|---:|');
  let tr = 0, tu = 0;
  for (const r of rows) {
    const file = r.url.split('/').pop();
    if (r.err) { say('| `' + r.handle + '` | ' + file + ' | — | — | — | — | **' + r.err + '** |'); continue; }
    tr += r.rules; tu += r.unnamed;
    say('| `' + r.handle + '` | ' + file + ' | ' + r.kb + ' | ' + r.rules + ' | ' + r.fam + ' | ' + r.named + ' | ' + r.unnamed + ' |');
  }
  say('');
  say('**' + rows.length + ' frontend sheets, ' + tr + ' rules, ' + tu + ' families with no Darling equivalent yet** (upper bound — see the header note).');
  say('');
  for (const r of rows) {
    if (!r.list || !r.list.length) continue;
    say('### ' + r.handle + '  (' + r.unnamed + ')');
    say('`' + r.list.sort().join('` `') + '`');
    say('');
  }
  fs.writeFileSync(path.join(ROOT, 'woo-worksheet.md'), out.join('\n') + '\n');
  console.log('\n-> woo-worksheet.md');
})();
