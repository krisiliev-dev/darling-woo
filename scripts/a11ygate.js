// The accessibility mode is one contract across three files and no compiler:
//
//   parts/header.html   an inline script WRITES the class before first paint
//   parts/footer.html   the switch TOGGLES it and stores the cookie
//   src/patterns/a11y.css   every rule READS it
//
// They disagreed. Both scripts said `darling-a11y`, which is the legacy name, so
// they agreed with each other and neither agreed with the stylesheet - which has
// keyed `html.d-a11y` since the day it was written. Nothing errors when that
// happens: the switch flips a class nobody listens to, the page does not change,
// and the person who would notice is the least likely to report it.
//
// So: one name, checked. And the old name is banned outright, because a single
// leftover is enough to make a rule dead in a file that still looks alive -
// hero.css carried `html.darling-a11y` for exactly that reason.
const fs = require('fs');
const path = require('path');
let fails = 0;
const ok = (c, label, detail) => { if (!c) fails++;
  console.log('  %s  %s%s', c ? 'PASS' : '*FAIL*', label, detail ? '   ' + detail : ''); };

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.(css|js|html|php)$/.test(e.name)) out.push(p);
  }
  return out;
};

console.log('THE ACCESSIBILITY CLASS, IN EVERY FILE THAT TOUCHES IT');

// Two kinds of file are exempt, for two different reasons:
//   - style.css and assets/darling.css are the sheets the cutover DELETES. They
//     are allowed to keep the old name until they go.
//   - darling.build.css and gallery.html are GENERATED. Checking them checks
//     their sources twice and reports the second copy as a finding - and the
//     gallery, being documentation, legitimately quotes the legacy name in
//     prose while explaining why it is legacy.
const EXEMPT = [
  'theme/darling/style.css',
  'theme/darling/assets/darling.css',
  'theme/darling/darling.build.css',
  'theme/darling/gallery.html',
];
const files = walk('theme/darling').filter((f) => !EXEMPT.includes(f.replace(/\\/g, '/')));

// *** COMMENTS ARE STRIPPED, AND THE ATTRIBUTE IS NOT THE CLASS. ***
// The first version of this gate flagged five files and was wrong about four:
// a11y.css MENTIONS the legacy name in the comment that explains why it is
// legacy, and footer.html carries `data-darling-a11y`, which is the hook the
// script finds the button by and has nothing to do with the class. A gate that
// cannot tell a name from a mention of a name gets switched off.
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LEGACY_RE = /(?<![-\w])darling-a11y(?![-\w])/;

const stale = [];
const live = [];
for (const f of files) {
  const s = strip(fs.readFileSync(f, 'utf8'));
  if (LEGACY_RE.test(s)) stale.push(f.replace(/\\/g, '/'));
  if (/\bd-a11y\b/.test(s)) live.push(f.replace(/\\/g, '/'));
}

for (const f of live) console.log('     d-a11y      ' + f);
for (const f of stale) console.log('     *legacy*    ' + f);

ok(stale.length === 0,
  '*** NO FILE OUTSIDE THE TWO DOOMED SHEETS STILL SAYS darling-a11y ***',
  stale.length ? stale.join(', ') : 'clean');

// And the three ends of the contract are all present, because "no stale names"
// is also true of a file that dropped the class entirely.
const need = [
  ['theme/darling/parts/header.html', /classList\.add\('d-a11y'\)/, 'the pre-paint writer'],
  ['theme/darling/parts/footer.html', /classList\.toggle\('d-a11y'\)/, 'the switch'],
  ['theme/darling/src/patterns/a11y.css', /html\.d-a11y/, 'the stylesheet'],
];
for (const [f, re, what] of need) {
  const s = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  ok(re.test(s), what + ' is still there', f);
}

// The cookie name is the fourth end of it and is easy to typo.
const hdr = fs.readFileSync('theme/darling/parts/header.html', 'utf8');
const ftr = fs.readFileSync('theme/darling/parts/footer.html', 'utf8');
ok(/darling_a11y=1/.test(hdr) && /darling_a11y=/.test(ftr),
  'and the reader and the writer agree on the cookie name', 'darling_a11y');

console.log('\n%s   %d failed', fails ? 'RESULT: FAILURES' : 'RESULT: one class', fails);
process.exit(fails ? 1 : 0);
