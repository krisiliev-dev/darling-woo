// Task #40, the last two halves - and only ONE of them is reachable.
//
// RTL: decide, don't port. B7's rule. The store is Bulgarian-only at launch and
// no RTL locale is installed, so an RTL stylesheet would dress a surface nobody
// can reach. What IS worth knowing is the COST of that decision, so the sibling
// scan counts physical-direction declarations in src/: the day someone adds an
// RTL locale, that number is the work.
//
// PRINT is reachable, and by exactly one customer action: printing an order
// confirmation. Browsers drop background colours in print by default, so every
// surface built from a color-mix() fill goes white - the same failure shape as
// forced-colors, one step further on. This measures which parts of the
// confirmation still read on paper, and what wastes it.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');

const SPEC = [
  ['order total row',  '<div class="d-table"><table><tr><th>Общо</th><td>13,50 €</td></tr></table></div>'],
  ['notice',           '<div class="d-notice">Поръчката е приета</div>'],
  ['card',             '<article class="d-card">артикул</article>'],
  ['panel',            '<div class="d-panel">детайли</div>'],
  ['header chrome',    '<header class="d-header"><div class="d-header__inner d-shell d-shell--bar">Дарлинг</div></header>'],
  ['footer chrome',    '<footer class="d-footer">футър</footer>'],
  ['buy button',       '<button class="d-btn d-btn--primary">Купи</button>'],
];

const PROBE = `() => {
  const out = [];
  document.querySelectorAll('[data-spec]').forEach((el) => {
    const t = el.firstElementChild || el;
    const c = getComputedStyle(t);
    const r = t.getBoundingClientRect();
    const bw = ['Top','Right','Bottom','Left'].map((s) => parseFloat(c['border' + s + 'Width']) || 0);
    out.push({
      name: el.getAttribute('data-spec'),
      shown: c.display !== 'none' && c.visibility !== 'hidden' && r.height > 0,
      h: Math.round(r.height),
      bg: c.backgroundColor,
      fg: c.color,
      border: Math.max.apply(null, bw),
      shadow: c.boxShadow === 'none' ? '' : 'yes',
    });
  });
  return out;
}`;

(async () => {
  const html = '<!doctype html><meta charset="utf-8"><style>' + CSS +
    '\nbody{margin:0;padding:16px;display:grid;gap:12px}</style>' +
    SPEC.map(([n, h]) => '<div data-spec="' + n + '">' + h + '</div>').join('\n');

  const browser = await chromium.launch();
  const lines = [];
  const say = (s) => { console.log(s); lines.push(s); };
  const runs = {};
  for (const m of ['screen', 'print']) {
    const p = await browser.newPage({ viewport: { width: 900, height: 900 } });
    await p.setContent(html, { waitUntil: 'load' });
    await p.emulateMedia({ media: m });
    await p.waitForTimeout(150);
    runs[m] = await p.evaluate('(' + PROBE + ')()');
    if (m === 'print') await p.screenshot({ path: 'print-preview.png', fullPage: true });
    await p.close();
  }

  say('print: what survives, and what wastes the paper');
  say('');
  say('  component            screen                          print');
  const gone = [], wasted = [];
  for (let i = 0; i < runs.screen.length; i++) {
    const a = runs.screen[i], b = runs.print[i];
    const A = (a.shown ? 'h=' + a.h : 'hidden') + (a.border ? ' border' : (a.shadow ? ' shadow' : ''));
    const B = (b.shown ? 'h=' + b.h : 'hidden') + (b.border ? ' border' : (b.shadow ? ' shadow' : ''));
    say('  ' + a.name.padEnd(20) + A.padEnd(32) + B);
    // *** THE HEADER IS SUPPOSED TO PRINT. *** The owner decided on 2026-08-10
    // that a printed order carries Darling branding, so a header on paper is
    // the requirement, not the defect. Only the footer is waste. A gate that
    // keeps flagging an approved decision teaches people to ignore it.
    if (/footer chrome/.test(a.name) && b.shown) wasted.push(a.name);
    if (!/chrome/.test(a.name) && b.shown && !b.border && !b.shadow) gone.push(a.name);
  }
  say('');
  if (wasted.length) say('*** PRINTS SITE CHROME: ' + wasted.join(', ') + ' - ink spent on navigation.');
  if (gone.length) say('*** NO EDGE ON PAPER: ' + gone.join(', ') + ' - backgrounds are dropped by default.');
  if (!wasted.length && !gone.length) say('nothing wasted, everything keeps a boundary.');
  fs.writeFileSync(path.join(ROOT, 'print-report.txt'), lines.join('\n') + '\n');
  console.log('\n-> print-report.txt, print-preview.png');
  await browser.close();
})();
