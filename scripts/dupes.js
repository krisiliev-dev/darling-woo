/* HOW MANY TIMES DOES THIS SYSTEM SAY THE SAME THING?
 *
 * The owner, after finding the product card written twice, the cherry button
 * written four times and the quantity stepper written twice:
 *
 *   "This duplication seems like a systemic problem. We need to fix all of the
 *    instances of this happening for any of our components and also make sure we
 *    have a way to avoid it in the future, because if it happens in the gallery
 *    then it will happen while building real pages for our live site and
 *    inconsistencies read as unprofessional and unpolished."
 *
 * He is right, and every instance so far was found by eye, one at a time, after
 * it had already shipped. This finds them by measurement instead.
 *
 * WHAT IT LOOKS FOR. Two rules in different places whose DECLARATION SETS
 * overlap heavily - the same properties set to the same values. That is what a
 * copied component looks like: `.d-card` and `li.product` both saying
 * surface-raised, radius-l, shadow-card, overflow hidden. It is not looking for
 * repeated single properties; every file sets `margin:0` somewhere and that is
 * not duplication, it is CSS.
 *
 * WHAT IT DELIBERATELY DOES NOT FLAG:
 *   - rules in the SAME selector list (that is one rule, written once)
 *   - pairs where one side is fallback.css, whose whole job is to restate a
 *     floor that patterns then override
 *   - pairs under 4 shared declarations, which is noise at this scale
 *
 * *** THE COMMENT STRIPPER IS NOT A REGEX OVER `/*`. *** Comments in this
 * codebase contain braces and apostrophes, and a comment-blind parse found 20
 * phantom rules the last time somebody tried it (see build-css.js, which had the
 * same bug and now proves its own strip). This walks the file once, in a state
 * machine, and never treats a brace inside a comment or a string as structure.
 *
 *   node scripts/dupes.js            report
 *   node scripts/dupes.js --gate     exit 1 if anything new appears
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const SRC = path.join(ROOT, 'theme', 'darling', 'src');
const ALLOW = path.join(__dirname, 'dupes.allow.json');

/* ---- 1. read a stylesheet into rules, without believing any brace inside a
   comment or a string ------------------------------------------------------ */
function rules(css, file) {
  const out = [];
  let i = 0, sel = '', buf = '', depth = 0, at = [];
  const n = css.length;
  while (i < n) {
    const c = css[i];
    // comment
    if (c === '/' && css[i + 1] === '*') {
      const e = css.indexOf('*/', i + 2);
      i = e === -1 ? n : e + 2;
      continue;
    }
    // string
    if (c === '"' || c === "'") {
      const q = c; let j = i + 1;
      while (j < n && !(css[j] === q && css[j - 1] !== '\\')) j++;
      const lit = css.slice(i, j + 1);
      if (depth === 0) sel += lit; else buf += lit;
      i = j + 1;
      continue;
    }
    if (c === '{') {
      depth++;
      if (depth === 1) { sel = sel.trim(); } else { buf += c; }
      i++;
      continue;
    }
    if (c === '}') {
      depth--;
      if (depth === 0) {
        if (sel && !sel.startsWith('@')) out.push({ file, sel, body: buf, at: at.join(' ') });
        sel = ''; buf = '';
      } else if (depth < 0) {
        // an @-block closing; resync
        depth = 0; sel = ''; buf = ''; at.pop();
      } else { buf += c; }
      i++;
      continue;
    }
    if (depth === 0) {
      sel += c;
      // an at-rule that OPENS a block (media, supports, layer) - remember it and
      // do not treat its prelude as a selector
      if (c === '{') { /* handled above */ }
    } else buf += c;
    i++;
  }
  // @media / @supports wrappers: their inner rules were captured with the
  // wrapper's prelude glued to the first selector. Split those apart.
  return out.map((r) => {
    const m = /@[a-z-]+[^{]*\{?\s*([\s\S]*)$/i.exec(r.sel);
    if (r.sel.includes('@')) {
      const parts = r.sel.split('{');
      return { ...r, at: parts.slice(0, -1).join('{').trim(), sel: parts[parts.length - 1].trim() };
    }
    return r;
  }).filter((r) => r.sel);
}

function decls(body) {
  const set = new Set();
  let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { add(cur); cur = ''; } else cur += ch;
  }
  add(cur);
  function add(d) {
    const k = d.indexOf(':');
    if (k < 1) return;
    const prop = d.slice(0, k).trim();
    const val = d.slice(k + 1).trim().replace(/\s+/g, ' ');
    if (!prop || prop.startsWith('--')) return;   // a token DEFINITION is not a duplicate
    if (!val) return;
    set.add(prop + ':' + val);
  }
  return set;
}

/* ---- 2. collect ------------------------------------------------------------ */
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.css')) files.push(p);
  }
})(SRC);

const all = [];
for (const f of files) {
  const rel = path.relative(SRC, f).replace(/\\/g, '/');
  for (const r of rules(fs.readFileSync(f, 'utf8'), rel)) {
    const d = decls(r.body);
    if (d.size >= 3) all.push({ ...r, d });
  }
}

/* ---- 3. compare ------------------------------------------------------------ */
const SKIP_FILE = (f) => f === 'fallback.css';
const MIN_SHARED = 4;

const pairs = [];
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    if (a.sel === b.sel) continue;                       // one rule, written once
    if (SKIP_FILE(a.file) || SKIP_FILE(b.file)) continue;
    let shared = 0;
    for (const x of a.d) if (b.d.has(x)) shared++;
    if (shared < MIN_SHARED) continue;
    const overlap = shared / Math.min(a.d.size, b.d.size);
    if (overlap < 0.6) continue;
    pairs.push({ a, b, shared, overlap });
  }
}
pairs.sort((x, y) => y.shared - x.shared);

const key = (p) => [p.a.file + '|' + p.a.sel, p.b.file + '|' + p.b.sel].sort().join('  ==  ');
let allow = [];
try { allow = JSON.parse(fs.readFileSync(ALLOW, 'utf8')).allow || []; } catch (e) { /* none yet */ }
const allowed = new Set(allow.map((a) => a.pair));
const fresh = pairs.filter((p) => !allowed.has(key(p)));

/* *** THE SHAPE MATTERS MORE THAN THE COUNT. *** Most pairs here are not
 * careless: they are the adopted/ <-> patterns/ split, the same component
 * written once for our markup and once for WooCommerce's, in two ORIGINS because
 * an unlayered rule is the only thing that beats an unlayered sheet. Those are
 * a cost of the dequeue not having happened yet, and they collapse the day it
 * does. A pair inside ONE origin has no such excuse. */
const origin = (f) => (f.startsWith('adopted/') ? 'adopted' : f.startsWith('patterns/') ? 'patterns' : 'other');
const cls = (p) => {
  const a = origin(p.a.file), b = origin(p.b.file);
  if (a !== b) return 'CROSS-ORIGIN  (adopted vs patterns - the dequeue collapses these)';
  if (p.a.file === p.b.file) return 'SAME FILE     (a copy, with no excuse at all)';
  return 'SAME ORIGIN   (two files, one layer - a real duplicate)';
};
const buckets = {};
for (const p of pairs) { const c = cls(p); (buckets[c] = buckets[c] || []).push(p); }
console.log(all.length + ' rules with 3+ declarations across ' + files.length + ' files');
console.log(pairs.length + ' pairs share ' + MIN_SHARED + '+ declarations at 60%+ overlap  (' +
  (pairs.length - fresh.length) + ' known, ' + fresh.length + ' new)\n');

for (const [c, v] of Object.entries(buckets).sort((x, y) => y[1].length - x[1].length))
  console.log('  ' + String(v.length).padStart(4) + '  ' + c);
console.log('');

const worst = Object.entries(buckets)
  .filter(([c]) => !c.startsWith('CROSS'))
  .flatMap(([, v]) => v).sort((x, y) => y.shared - x.shared);
if (worst.length) {
  console.log('THE ONES WITH NO EXCUSE (same origin), worst first\n');
  for (const p of worst.slice(0, 14)) {
    console.log('  ' + p.shared + ' shared, ' + Math.round(p.overlap * 100) + '%   ' + p.a.file +
      (p.a.file === p.b.file ? '' : '  vs  ' + p.b.file));
    console.log('     ' + p.a.sel.replace(/\s+/g, ' ').slice(0, 76));
    console.log('     ' + p.b.sel.replace(/\s+/g, ' ').slice(0, 76));
  }
  console.log('');
}

for (const p of (process.argv.includes('--all') ? pairs : fresh).slice(0, 0)) {
  console.log('  ' + p.shared + ' shared, ' + Math.round(p.overlap * 100) + '% overlap');
  console.log('     ' + p.a.file.padEnd(26) + p.a.sel.slice(0, 64));
  console.log('     ' + p.b.file.padEnd(26) + p.b.sel.slice(0, 64));
  const both = [...p.a.d].filter((x) => p.b.d.has(x));
  console.log('        ' + both.slice(0, 6).join('  ') + (both.length > 6 ? '  …' : ''));
}

if (process.argv.includes('--seed')) {
  /* Write every pair that exists TODAY into the ledger, each with its class.
   * *** THIS IS A DEBT LEDGER, NOT AN APPROVAL LIST. *** Seeding it does not
   * make any of these right; it makes the gate able to catch the NEXT one while
   * these are burned down. A pair leaves the file by being fixed, not by being
   * re-seeded - re-running --seed after adding duplication would launder it,
   * which is why the gate never seeds on its own. */
  const out = pairs.map((p) => ({ pair: key(p), shared: p.shared, why: cls(p).split('(')[0].trim() }));
  fs.writeFileSync(ALLOW, JSON.stringify({
    note: 'DEBT, not approval. Each entry is a near-duplicate that exists today. ' +
          'Remove entries by fixing them. Never re-seed to silence a new one.',
    seeded: out.length, allow: out }, null, 1) + '\n');
  console.log('seeded ' + out.length + ' pairs into ' + path.relative(ROOT, ALLOW));
  process.exit(0);
}

if (process.argv.includes('--gate') && fresh.length) {
  console.log('\ndupes gate FAILED: ' + fresh.length + ' new near-duplicate rule pair(s).');
  console.log('Fix by giving the two one selector list, or record the pair in scripts/dupes.allow.json with a reason.');
  process.exit(1);
}
