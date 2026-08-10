// Task #40, the forced-colors half - and it is the one cross-cutting pass with a
// KNOWN answer before you run it, which is exactly why it needs running.
//
// Windows High Contrast (`forced-colors: active`) throws away author colours and
// substitutes the user's palette. Two rules matter for this design system:
//
//   * background-image and box-shadow are DROPPED ENTIRELY.
//   * background-color and color are overridden by the system palette.
//
// Our surfaces are built from `color-mix()` fills with an `inset 0 0 0 1px`
// box-shadow standing in for a border - patterns/notice.css, the new
// adopted/account.css meter, the field edges. In forced-colors every one of
// those hairlines disappears and every fill flattens to Canvas, so anything
// whose ONLY boundary is a box-shadow becomes an invisible box.
//
// This measures which components still have an edge a user can see.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');

const SPECIMENS = [
  ['notice (info)',        '<div class="d-notice">Бележка</div>'],
  ['notice (error)',       '<div class="d-notice d-notice--error">Грешка</div>'],
  ['notice (success)',     '<div class="d-notice d-notice--success">Готово</div>'],
  ['password meter short', '<div class="woocommerce-password-strength short">слаба</div>'],
  ['password meter strong','<div class="woocommerce-password-strength strong">силна</div>'],
  ['text field',           '<input class="wc-block-components-text-input" value="x">'],
  ['panel',                '<div class="d-panel">панел</div>'],
  ['card',                 '<article class="d-card">карта</article>'],
  ['button primary',       '<button class="d-btn d-btn--primary">Купи</button>'],
  ['button ghost',         '<button class="d-btn d-btn--ghost">Назад</button>'],
  ['table',                '<table class="d-table"><tr><td>клетка</td></tr></table>'],
];

const PROBE = `() => {
  const out = [];
  document.querySelectorAll('[data-spec]').forEach((el) => {
    const t = el.firstElementChild || el;
    const c = getComputedStyle(t);
    const bw = ['Top','Right','Bottom','Left'].map((s) => parseFloat(c['border' + s + 'Width']) || 0);
    out.push({
      name: el.getAttribute('data-spec'),
      border: Math.max.apply(null, bw),
      // *** outline-width IS NOT AN EDGE ON ITS OWN. *** Chrome reports the
      // specified width even when outline-style is none, so the first version of
      // this probe read 3px off a bare table and concluded the whole system was
      // safe. A measurement that cannot fail is not a measurement.
      outline: (c.outlineStyle && c.outlineStyle !== 'none') ? (parseFloat(c.outlineWidth) || 0) : 0,
      outlineStyle: c.outlineStyle,
      shadow: c.boxShadow === 'none' ? '' : 'yes',
      bgImage: c.backgroundImage === 'none' ? '' : 'yes',
      bg: c.backgroundColor,
      fg: c.color,
    });
  });
  return out;
}`;

(async () => {
  const html = '<!doctype html><meta charset="utf-8"><style>' + CSS +
    '\nbody{margin:0;padding:16px;display:grid;gap:14px}</style>' +
    SPECIMENS.map(([n, h]) => '<div data-spec="' + n + '">' + h + '</div>').join('\n');

  const browser = await chromium.launch();
  const lines = [];
  const say = (s) => { console.log(s); lines.push(s); };
  const runs = {};

  for (const mode of ['none', 'active']) {
    const ctx = await browser.newContext({ forcedColors: mode, colorScheme: 'light', viewport: { width: 900, height: 900 } });
    const p = await ctx.newPage();
    await p.setContent(html, { waitUntil: 'load' });
    await p.waitForTimeout(200);
    runs[mode] = await p.evaluate('(' + PROBE + ')()');
    await p.screenshot({ path: 'fc-' + mode + '.png', fullPage: true });
    await ctx.close();
  }

  say('forced-colors: what still has a visible edge?   (box-shadow is DROPPED when active)');
  say('');
  say('  component               normal                        forced-colors');
  const naked = [];
  for (let i = 0; i < runs.none.length; i++) {
    const a = runs.none[i], b = runs.active[i];
    const edgeA = a.border > 0 ? 'border ' + a.border : (a.shadow ? 'shadow only' : 'NONE');
    const edgeB = b.border > 0 ? 'border ' + b.border : (b.outline > 0 ? 'outline ' + b.outline : 'NONE');
    if (edgeB === 'NONE') naked.push(a.name);
    say('  ' + a.name.padEnd(23) + edgeA.padEnd(30) + edgeB);
  }
  say('');
  if (naked.length) {
    say('*** ' + naked.length + ' of ' + runs.none.length + ' LOSE THEIR ONLY BOUNDARY: ' + naked.join(', '));
    say('    In high contrast these are text on Canvas with nothing round it.');
  } else {
    say('every specimen keeps an edge in forced-colors.');
  }
  fs.writeFileSync(path.join(ROOT, 'fc-report.txt'), lines.join('\n') + '\n');
  console.log('\n-> fc-report.txt, fc-none.png, fc-active.png');
  await browser.close();
})();
