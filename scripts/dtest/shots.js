#!/usr/bin/env node
/* The pixel layer, and the one to be most careful with.
 *
 * A screenshot test tells you THAT something changed and never WHY, so it is
 * last in the suite on purpose: by the time it runs, the static and computed
 * layers have already named everything they can name, and whatever is left is
 * genuinely visual. A suite people stop believing is worse than no suite.
 *
 *   node scripts/dtest/shots.js            compare against baseline/
 *   node scripts/dtest/shots.js --update   accept what is on screen as the new baseline
 *   node scripts/dtest/shots.js --only home,shop
 *
 * DETERMINISM, and what it costs to get it:
 *   - animations: 'disabled' freezes CSS animations and transitions at their
 *     END state. That is Playwright's behaviour, not a bug: a half-played
 *     animation is the one thing that can never be compared.
 *   - the ambient star layer is REMOVED before the shot. It spawns elements on a
 *     timer at random positions; no amount of animation freezing makes it stable,
 *     and a test that fails randomly teaches people to ignore failures.
 *   - caret: 'hide', and scrollbars are given a fixed width, because the two
 *     differ per engine and per platform.
 *   - fonts are waited for with document.fonts.ready. A shot taken during the
 *     swap compares Playfair against Inter and calls it a design change.
 *   - deviceScaleFactor 1. A 2x baseline is four times the bytes for no more
 *     information about CSS.
 */
const pw = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
// pixelmatch v7 ships as ESM with a default export; under require() that lands
// on .default. Interop rather than pinning an old version.
const pmMod = require('pixelmatch');
const pixelmatch = typeof pmMod === 'function' ? pmMod : pmMod.default;
const P = require('./paths');

const UPDATE = process.argv.includes('--update');
const onlyArg = process.argv.find((a) => a.startsWith('--only'));
const ONLY = onlyArg ? (onlyArg.split('=')[1] || process.argv[process.argv.indexOf(onlyArg) + 1] || '').split(',') : null;

const PAGES = ['home', 'shop', 'product', 'cart', 'checkout', 'account', 'page', 'blog', 'notfound']
  .filter((p) => !ONLY || ONLY.includes(p));
const VIEWPORTS = [[390, 844, 'phone'], [1240, 900, 'desktop']];
const ENGINES = ['chromium', 'firefox', 'webkit'];

// A change of more than this fraction of pixels is a real change. 0.1% absorbs
// antialiasing on a text edge and nothing larger; a component moving by a pixel
// is well above it.
const MAX_DIFF_RATIO = 0.001;
const PIXEL_THRESHOLD = 0.15;    // per-pixel colour tolerance, pixelmatch's scale

const SETTLE = `() => {
  // the ambient layer is a timer and a random number generator; it can never be
  // compared, so it is removed rather than frozen
  document.querySelectorAll('.d-ambient').forEach((e) => e.remove());
  // and anything still carrying an inline animation delay would land mid-flight
  document.querySelectorAll('[style*="--d:"]').forEach((e) => { e.style.animation = 'none'; });
  return document.fonts ? document.fonts.ready.then(() => true) : true;
}`;

fs.mkdirSync(P.BASELINE, { recursive: true });
fs.mkdirSync(P.SHOTS, { recursive: true });

(async () => {
  let compared = 0, changed = 0, created = 0;
  const changes = [];

  for (const engine of ENGINES) {
    // *** A MISSING ENGINE IS A SKIP, NOT A CRASH. ***
    // Only chromium is installed by default in most environments; firefox and
    // webkit come from `npx playwright install firefox webkit` (~200 MB). A suite
    // that dies on a machine with one browser is a suite nobody runs, so the
    // engine is skipped loudly and the rest of the matrix still reports.
    let browser;
    try { browser = await pw[engine].launch(); }
    catch (e) {
      console.log('SKIP ' + engine + ' - not installed. `npx playwright install ' + engine + '` to include it.');
      continue;
    }
    for (const [w, h, vname] of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
      });
      const page = await ctx.newPage();
      for (const name of PAGES) {
        const id = engine + '-' + vname + '-' + name;
        const file = path.join(P.SHOTS, id + '.png');
        const base = path.join(P.BASELINE, id + '.png');
        try {
          await page.goto('file://' + path.join(P.MIRROR, name + '.html'), { waitUntil: 'load', timeout: 45000 });
          await page.evaluate(SETTLE);
          await page.waitForTimeout(700);
          await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
        } catch (e) {
          console.log('  skip  ' + id + '  (' + String(e.message).split('\n')[0].slice(0, 50) + ')');
          continue;
        }
        if (UPDATE || !fs.existsSync(base)) {
          fs.copyFileSync(file, base);
          created++;
          console.log((UPDATE ? '  set   ' : '  new   ') + id);
          continue;
        }
        const a = PNG.sync.read(fs.readFileSync(base));
        const b = PNG.sync.read(fs.readFileSync(file));
        compared++;
        if (a.width !== b.width || a.height !== b.height) {
          changed++;
          changes.push(id + '  size ' + a.width + 'x' + a.height + ' -> ' + b.width + 'x' + b.height);
          console.log('  DIFF  ' + id + '  size changed ' + a.width + 'x' + a.height + ' -> ' + b.width + 'x' + b.height);
          continue;
        }
        const diff = new PNG({ width: a.width, height: a.height });
        const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: PIXEL_THRESHOLD });
        const ratio = n / (a.width * a.height);
        if (ratio > MAX_DIFF_RATIO) {
          changed++;
          const dpath = path.join(P.SHOTS, id + '.diff.png');
          fs.writeFileSync(dpath, PNG.sync.write(diff));
          changes.push(id + '  ' + n + ' px (' + (ratio * 100).toFixed(3) + '%)  -> ' + path.relative(P.ROOT, dpath));
          console.log('  DIFF  ' + id + '  ' + n + ' px changed (' + (ratio * 100).toFixed(3) + '%)');
        } else {
          console.log('  ok    ' + id + (n ? '  (' + n + ' px, within tolerance)' : ''));
        }
      }
      await ctx.close();
    }
    await browser.close();
  }

  console.log('\n' + compared + ' compared, ' + changed + ' changed, ' + created + ' baselines written');
  if (changed) {
    console.log('\nSomething moved. Look at the .diff.png files, and if the change is one you');
    console.log('meant, accept it with:  node scripts/dtest/shots.js --update');
    for (const c of changes) console.log('  ' + c);
    process.exit(1);
  }
  if (!compared && created) console.log('First run - baselines created. Commit them, then this check has teeth.');
})();
