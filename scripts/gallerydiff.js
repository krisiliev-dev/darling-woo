// GALLERY vs LIVE - turn "it does not look like the gallery" into a list.
//
// The owner, 2026-08-10: "Everything needs to look like our gallery, thats where
// the reviews I have been doing have been happening and what I want our final
// website to look like." So the gallery is the specification, and any component
// that renders differently on the site is a defect with an address.
//
// WHAT IT COMPARES, AND WHAT IT DELIBERATELY DOES NOT
//
// APPEARANCE only: type, colour, edge, shadow, animation. NOT geometry - width,
// x, margin and padding legitimately differ between a specimen in a catalogue
// and the same component inside a page, so including them would bury the signal
// under noise that is not wrong. Padding IS included, because a component that
// pads itself differently in the two places is a real difference, but it is
// reported in its own section so it can be read separately.
//
// A COMPONENT IS A CLASS PRESENT IN BOTH. Anything only in the gallery is
// unshipped; anything only on the site is unspecified. Both lists are printed,
// because those two are where most of the work actually is.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const GALLERY = 'file:///' + path.join(ROOT, 'theme', 'darling', 'gallery.html').replace(/\\/g, '/');
const BASE = process.env.BASE || 'https://darlinghome.bg';
const PAGES = (process.env.PAGES || '/,/shop/,/my-account/').split(',');

const LOOK = ['font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing',
  'line-height', 'text-transform', 'color', 'background-color', 'background-image',
  'border-top-width', 'border-top-style', 'border-top-color', 'border-radius',
  'box-shadow', 'opacity', 'animation-name', 'animation-duration'];
const BOX = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap'];

// One representative per class: the FIRST visible instance. A component with two
// states in the gallery and one on the site would otherwise compare a hover
// specimen against a resting element.
// *** ONE REPRESENTATIVE PER CLASS WAS COMPARING UNLIKE THINGS. ***
// The first version took the first visible instance of each class on each side.
// That put the gallery's `.d-prose.d-prose--card` specimen against a plain
// `.d-prose` on the site and reported five differences - background, border,
// radius, shadow - none of which were real: one is the card MODIFIER and the
// other is not. Same for .d-finish (a swatch against a pill) and .d-icon (an
// icon in a demo row against one in the header, taking a different currentColor).
//
// So harvest every instance with its full d- class SIGNATURE, and pair
// signatures across the two sides before comparing. When no signature matches,
// still report - but say so, so the row is read as a comparison of unlike
// specimens rather than as a defect.
const HARVEST = `(props) => {
  const out = {};
  for (const e of document.querySelectorAll('[class]')) {
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const c = getComputedStyle(e);
    if (c.visibility === 'hidden' || c.display === 'none') continue;
    const classes = String(e.className).split(/\\s+/).filter(x => /^d-[a-z0-9-]+$/.test(x));
    if (!classes.length) continue;
    const sig = classes.slice().sort().join(' ');
    const v = { _sig: sig };
    for (const p of props) v[p] = c.getPropertyValue(p);
    for (const cls of classes) { (out[cls] = out[cls] || []).push(v); }
  }
  return out;
}`;


const norm = (k, v) => {
  if (k === 'background-image' || k === 'box-shadow') return String(v).replace(/\s+/g, ' ').slice(0, 70);
  if (k === 'font-family') return String(v).replace(/["']/g, '').split(',')[0].trim();
  return String(v).trim();
};

(async () => {
  const browser = await chromium.launch();
  const props = LOOK.concat(BOX);

  const gp = await browser.newPage({ viewport: { width: 1240, height: 1200 } });
  await gp.goto(GALLERY, { waitUntil: 'load', timeout: 60000 });
  await gp.waitForTimeout(2500);
  const gallery = await gp.evaluate('(' + HARVEST + ')(' + JSON.stringify(props) + ')');
  await gp.close();
  console.log('gallery: ' + Object.keys(gallery).length + ' d- components rendered');

  const live = {};
  const seenOn = {};
  for (const url of PAGES) {
    const lp = await browser.newPage({ viewport: { width: 1240, height: 1200 } });
    await lp.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
    await lp.waitForTimeout(2500);
    const got = await lp.evaluate('(' + HARVEST + ')(' + JSON.stringify(props) + ')');
    for (const k of Object.keys(got)) { if (!live[k]) { live[k] = got[k]; seenOn[k] = url; } }
    await lp.close();
    console.log('live ' + url + ': ' + Object.keys(got).length + ' d- components');
  }
  await browser.close();

  // pair a gallery instance with a live instance of the SAME signature where one
  // exists; otherwise take the first of each and flag the row.
  const pick = (cls) => {
    const g = gallery[cls] || [], l = live[cls] || [];
    for (const a of g) for (const b of l) if (a._sig === b._sig) return { a, b, unlike: null };
    if (!g.length || !l.length) return null;
    return { a: g[0], b: l[0], unlike: '[' + g[0]._sig + ']  vs  [' + l[0]._sig + ']' };
  };

  const both = Object.keys(gallery).filter((k) => live[k]).sort();
  const onlyGallery = Object.keys(gallery).filter((k) => !live[k]).sort();
  const onlyLive = Object.keys(live).filter((k) => !gallery[k]).sort();

  const lines = [];
  const say = (s) => { console.log(s); lines.push(s); };

  say('');
  say('======== APPEARANCE DIFFERENCES  (' + both.length + ' components in both)');
  let n = 0;
  let unlikeCount = 0;
  for (const cls of both) {
    const pr = pick(cls);
    if (!pr) continue;
    const diffs = [];
    for (const p of LOOK) {
      const a = norm(p, pr.a[p]), b = norm(p, pr.b[p]);
      if (a !== b) diffs.push('      ' + p.padEnd(18) + 'gallery ' + a + '   |   live ' + b);
    }
    if (!diffs.length) continue;
    n++;
    if (pr.unlike) unlikeCount++;
    say('  .' + cls + '   (live: ' + seenOn[cls] + ')' +
        (pr.unlike ? '   UNLIKE SPECIMENS ' + pr.unlike : ''));
    for (const d of diffs) say(d);
  }
  say('  -> ' + n + ' of ' + both.length + ' differ in appearance, ' + unlikeCount +
      ' of those comparing unlike specimens');

  say('');
  say('======== PADDING / GAP DIFFERENCES  (read separately: a page is not a catalogue)');
  let m = 0;
  for (const cls of both) {
    const pr = pick(cls);
    if (!pr) continue;
    const diffs = [];
    for (const p of BOX) {
      const a = norm(p, pr.a[p]), b = norm(p, pr.b[p]);
      if (a !== b) diffs.push('      ' + p.padEnd(18) + 'gallery ' + a + '   |   live ' + b);
    }
    if (!diffs.length) continue;
    m++;
    say('  .' + cls + (pr.unlike ? '   UNLIKE SPECIMENS' : ''));
    for (const d of diffs) say(d);
  }
  say('  -> ' + m + ' of ' + both.length + ' differ in padding or gap');

  say('');
  say('======== IN THE GALLERY, NOT ON THESE PAGES  (' + onlyGallery.length + ') - unshipped, or just not on these three');
  say('  ' + onlyGallery.join(' '));
  say('');
  say('======== ON THE SITE, NOT IN THE GALLERY  (' + onlyLive.length + ') - shipped without a reviewed specimen');
  say('  ' + onlyLive.join(' '));

  fs.writeFileSync(path.join(ROOT, 'gallery-diff.txt'), lines.join('\n') + '\n');
  console.log('\n-> gallery-diff.txt');
})();