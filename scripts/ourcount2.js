// Our rule count, measured with the SAME counter as scripts/wsheet.js.
// Two numbers from two parsers are not a comparison; they are two numbers.
const fs = require('fs'); const path = require('path');
const ROOT = path.dirname(__dirname);
const SRC = path.join(ROOT, 'theme/darling/src');

function count(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  let rules = 0; const fam = new Set();
  clean.replace(/([^{}@][^{}]*)\{([^{}]*)\}/g, (m, sel, body) => {
    if (!body.includes(':')) return m;
    rules++;
    let c; const CLS = /\.(-?[_a-zA-Z][\w-]*)/g;
    while ((c = CLS.exec(sel))) fam.add(c[1]);
    return m;
  });
  return { rules, fam };
}

const groups = {};
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!f.endsWith('.css')) continue;
    const rel = path.relative(SRC, p).replace(/\\/g, '/');
    const g = rel.includes('/') ? rel.split('/')[0] : 'root';
    const r = count(fs.readFileSync(p, 'utf8'));
    (groups[g] = groups[g] || []).push({ rel, ...r });
  }
};
walk(SRC);

let total = 0; const allFam = new Set();
const lines = [];
for (const g of Object.keys(groups).sort()) {
  const files = groups[g].sort((a, b) => b.rules - a.rules);
  const sub = files.reduce((n, f) => n + f.rules, 0);
  total += sub;
  lines.push('== ' + g + '  (' + sub + ' rules, ' + files.length + ' files)');
  for (const f of files) {
    f.fam.forEach((x) => allFam.add(x));
    if (f.rules >= 12) lines.push('   ' + String(f.rules).padStart(4) + '  ' + f.rel + '  (' + f.fam.size + ' families)');
  }
}
console.log(lines.join('\n'));
console.log('\nOURS: ' + total + ' rules, ' + allFam.size + ' distinct classes, across ' +
  Object.values(groups).reduce((n, a) => n + a.length, 0) + ' files');

const build = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const b = count(build);
console.log('BUILD: ' + b.rules + ' rules, ' + b.fam.size + ' classes, ' + Math.round(build.length / 1024) + ' KB');
