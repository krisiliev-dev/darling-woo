// *** THE GALLERY CANNOT ANSWER THIS ONE, SO IT GETS ITS OWN GATE. ***
//
// The filter overlay's light dismiss is the one piece of batch A that is
// behaviour rather than paint. A screenshot cannot show it, and the gallery has
// no Interactivity runtime - it pins `.is-overlay-opened` by hand, so there is
// no close handler to observe and no state to change.
//
// So this stands the real darling-ui.js over WooCommerce's real markup and
// watches the CLOSE BUTTON, because "we click their button rather than touching
// their state" is the entire claim. If a future edit reaches into the class
// list instead, case 1 still passes and this file still fails - the button is
// what is asserted on, not the outcome.
//
// Four cases, because the interesting failures here are the FALSE POSITIVES.
// Case 3 is not hypothetical: it failed the first time this ran. A `click`
// fires on the nearest common ancestor of press and release, so dragging a
// price handle out of the panel and letting go arrives with e.target === the
// overlay, which is outside the dialog by every test the handler can make on
// the event alone.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JS = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');

const HTML = `<!doctype html><meta charset="utf-8"><style>
 body{margin:0}
 .wc-block-product-filters__overlay{position:fixed;inset:0;background:rgba(0,0,0,.4)}
 .wc-block-product-filters__overlay-wrapper{width:100%;height:100%}
 .wc-block-product-filters__overlay-dialog{position:absolute;inset-block:0;
   inset-inline-start:0;width:320px;background:#fff}
</style>
<div class="wc-block-product-filters is-overlay-opened">
 <button class="wc-block-product-filters__open-overlay">open</button>
 <div class="wc-block-product-filters__overlay">
  <div class="wc-block-product-filters__overlay-wrapper">
   <div class="wc-block-product-filters__overlay-dialog" role="dialog">
    <button class="wc-block-product-filters__close-overlay">close</button>
    <div style="height:300px">panel body</div>
   </div>
  </div>
 </div>
</div>
<script>window.__closes = 0;
document.querySelector('.wc-block-product-filters__close-overlay')
  .addEventListener('click', function () { window.__closes++; });
</script>
<script>${JS}</script>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  await p.setContent(HTML);
  await p.waitForTimeout(200);

  const closes = () => p.evaluate(() => window.__closes);
  const rows = [];
  const check = (name, got, want) => {
    rows.push([got === want ? 'PASS' : 'FAIL', name, `+${got}`, `want +${want}`]);
    return got === want;
  };

  const attached = await p.evaluate(
    () => !!document.querySelector('.wc-block-product-filters').dataset.dInit);

  let n = await closes();
  await p.mouse.click(700, 350);                                  // the scrim
  let m = await closes(); const c1 = check('click the scrim', m - n, 1); n = m;

  await p.mouse.click(150, 400);                                  // inside
  m = await closes(); const c2 = check('click inside the panel', m - n, 0); n = m;

  await p.mouse.move(150, 400); await p.mouse.down();             // press in,
  await p.mouse.move(700, 400); await p.mouse.up();               // release out
  m = await closes(); const c3 = check('drag from panel to scrim', m - n, 0); n = m;

  await p.evaluate(() => document.querySelector('.wc-block-product-filters')
    .classList.remove('is-overlay-opened'));
  await p.mouse.click(700, 350);                                  // not open
  m = await closes(); const c4 = check('scrim while not open', m - n, 0);

  await b.close();

  console.log('  %s  the handler is wired at init', attached ? 'PASS' : 'FAIL');
  for (const [v, name, got, want] of rows) {
    console.log('  %s  %s %s %s', v, name.padEnd(28), got.padEnd(4), want);
  }
  const ok = attached && c1 && c2 && c3 && c4;
  console.log('\nRESULT: %s', ok ? 'light dismiss behaves   0 failed' : '*** FAILED ***');
  process.exit(ok ? 0 : 1);
})();
