// Does the fallback actually catch a surface nobody has ever styled - and does
// it correctly LOSE to everything we styled deliberately?
//
// Both halves matter. A fallback that does not catch is useless; a fallback
// that wins is a disaster, because it would quietly flatten components the
// owner has already approved. So the specimens are deliberately INVENTED class
// names that appear in no stylesheet on earth, plus one real component as the
// control.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');

const HTML = `<!doctype html><meta charset="utf-8"><style>${CSS}
body{margin:0;padding:16px;background:var(--surface-page)}</style>
<div class="wc-block-imaginary-surface" id="surface">a surface from the future</div>
<button class="wc-block-imaginary__button" id="btn">press</button>
<input class="wc-block-imaginary__field" id="field" value="typed">
<div class="wc-block-imaginary__notice" id="notice">a notice</div>
<table class="wc-block-imaginary-table" id="table"><tr><th>k</th><td>v</td></tr></table>
<button class="d-btn d-btn--primary" id="control">a real one</button>
<div class="d-notice" id="control2">a real notice</div>`;

const PROBE = `(id) => {
  const e = document.getElementById(id);
  if (!e) return null;
  const c = getComputedStyle(e);
  return {
    color: c.color, bg: c.backgroundColor, radius: c.borderTopLeftRadius,
    borderStyle: c.borderTopStyle, borderWidth: c.borderTopWidth,
    pad: c.paddingTop, font: c.fontFamily.slice(0, 24),
    collapse: c.borderCollapse, shadow: c.boxShadow === 'none' ? '' : 'yes',
  };
}`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  await p.setContent(HTML, { waitUntil: 'load' });
  await p.waitForTimeout(200);

  const g = async (id) => p.evaluate(`(${PROBE})(${JSON.stringify(id)})`);
  const surface = await g('surface'), btn = await g('btn'), field = await g('field');
  const notice = await g('notice'), table = await g('table');
  const control = await g('control'), control2 = await g('control2');

  const fails = [];
  const ok = (what, cond, saw) => {
    if (cond) console.log('  ok   ' + what + '   ' + saw);
    else { fails.push(what + '  (saw ' + saw + ')'); console.log('  FAIL ' + what + '   ' + saw); }
  };

  console.log('CAUGHT - invented classes that exist in no stylesheet');
  ok('an unknown surface takes our ink', surface.color !== 'rgb(0, 0, 0)', surface.color);
  ok('an unknown button is not raw UA chrome', btn.borderStyle !== 'outset' && btn.bg !== 'rgb(240, 240, 240)', btn.borderStyle + ' / ' + btn.bg);
  ok('an unknown button has our radius', parseFloat(btn.radius) > 0, btn.radius);
  ok('an unknown field has our radius', parseFloat(field.radius) > 0, field.radius);
  ok('an unknown notice has an edge', notice.shadow === 'yes', notice.shadow || 'none');
  ok('an unknown table collapses', table.collapse === 'collapse', table.collapse);

  console.log('');
  console.log('LOSES - the control, styled deliberately, must be untouched');
  ok('a real button keeps its own background', control.bg !== btn.bg, control.bg + ' vs fallback ' + btn.bg);
  ok('a real notice keeps its own background', control2.bg !== notice.bg, control2.bg + ' vs fallback ' + notice.bg);

  console.log('');
  if (fails.length) { console.log('FALLBACKGATE FAIL'); for (const f of fails) console.log('  ' + f); }
  else console.log('fallbackgate: the net catches what nobody styled and loses to everything we did.');
  await b.close();
  if (fails.length) process.exit(1);
})();