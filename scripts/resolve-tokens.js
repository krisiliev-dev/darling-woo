/* =============================================================================
   resolve-tokens.js
   Turn src/ into a flat table of RESOLVED values, so anything that is not CSS
   can be generated from the same source of truth.

   *** THE PROBLEM THIS SOLVES. ***
   Four of the things left on the list are the same design expressed in a format
   that cannot read a custom property:

     - Stripe's card fields are in a cross-origin iframe and take a JSON
       `appearance` object, not CSS.
     - WooCommerce emails are inlined into HTML and go through mail clients that
       have never heard of var(), oklab() or color-mix().
     - Print needs colours that survive print-color-adjust.
     - A forced-colors audit needs to know what a token IS to say whether it
       disappeared.

   Every one of them needs `--tint-cherry` as `#EBD3D6`, not as
   `color-mix(in oklab, var(--c-cherry) 15%, var(--c-grey-050))`.

   *** AND THE ONLY HONEST RESOLVER IS A BROWSER. ***
   Re-implementing oklab interpolation, relative colour syntax and clamp() in
   node would be a second engine that agrees with Chrome until it does not, and
   the day it disagrees the emails are the wrong colour and nobody finds out for
   a month. So the built stylesheet is loaded into the real engine, each token
   is assigned to a real property on a probe element, and the COMPUTED value is
   read back. Whatever Chrome says is what ships.

   Output: theme/darling/tokens.resolved.json
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'theme', 'darling', 'src');
const BUILT = path.join(ROOT, 'theme', 'darling', 'darling.build.css');
const OUT = path.join(ROOT, 'theme', 'darling', 'tokens.resolved.json');

function tokenNames() {
  const names = [];
  for (const dir of ['tokens', 'base']) {
    const d = path.join(SRC, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(n => n.endsWith('.css'))) {
      const css = fs.readFileSync(path.join(d, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) names.push(m[1]);
    }
  }
  return [...new Set(names)].sort();
}

(async () => {
  const names = tokenNames();
  const css = fs.readFileSync(BUILT, 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><head><style>' + css +
    '</style></head><body><div id="probe"></div></body></html>');

  const out = await page.evaluate((names) => {
    const probe = document.getElementById('probe');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const ctx = cv.getContext('2d', { willReadFrequently: true });

    /* *** oklab() IS A COMPUTED VALUE, NOT A HEX STRING. ***
       Chrome computes color-mix(in oklab, ...) to oklab(0.928 0.017 0.0002),
       and every consumer downstream - Stripe, an email client, a print sheet -
       needs sRGB. Rather than reimplement the conversion, paint one pixel and
       read the bytes back. Whatever the engine actually renders is what ships. */
    const toHex = (v) => {
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000';
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        const h = (n) => n.toString(16).padStart(2, '0');
        return '#' + h(d[0]) + h(d[1]) + h(d[2]) + (d[3] < 255 ? h(d[3]) : '');
      } catch (e) { return null; }
    };

    const res = {};
    for (const n of names) {
      const entry = { raw: getComputedStyle(document.documentElement).getPropertyValue(n).trim() };

      /* *** THE INHERITED VALUE HAS TO CHANGE ON THE PARENT, NOT THE PROBE. ***
         `style.color = 'var(--x)'` always parses, so an invalid token becomes
         invalid-at-computed-value-time and `color` falls back to INHERITED -
         not to whatever the probe had a moment ago. Setting two different
         colours on the probe itself therefore proves nothing, which is how the
         first version classified all 163 tokens as colours including the
         spacing scale. Vary the PARENT: if the probe follows it, the token did
         not resolve. */
      probe.style.color = 'var(' + n + ')';
      document.body.style.color = 'rgb(1, 2, 3)';
      const c1 = getComputedStyle(probe).color;
      document.body.style.color = 'rgb(4, 5, 6)';
      const c2 = getComputedStyle(probe).color;
      probe.style.color = '';

      if (c1 === c2) {
        entry.type = 'colour';
        entry.computed = c1;
        entry.hex = toHex(c1);
      } else {
        /* *** NOT `width`. *** getComputedStyle().width on a block element
           returns the USED width in pixels, so an invalid value reads as
           "1264px" and every font stack in the system was classified as a
           length. letter-spacing keeps its specified value when valid and
           computes to the literal string "normal" when not, so it can tell the
           two apart. */
        probe.style.letterSpacing = 'var(' + n + ')';
        const w = getComputedStyle(probe).letterSpacing;
        probe.style.letterSpacing = '';
        if (w && w !== 'normal') { entry.type = 'length'; entry.computed = w; }
        else { entry.type = 'other'; entry.computed = entry.raw; }
      }
      res[n] = entry;
    }
    document.body.style.color = '';
    return res;
  }, names);
  /* rgb() -> hex, because every consumer downstream is a format that wants hex:
     Stripe's appearance object, an email client, a print stylesheet. */
  let colours = 0, lengths = 0;
  /* out, not stamped: the fingerprint is not a token. */
for (const v of Object.values(out)) {
    if (v.type === 'colour') colours++;
    if (v.type === 'length') lengths++;
  }

  /* *** THE TABLE RECORDS WHICH STYLESHEET MADE IT. ***
     This file needs a real browser to exist - it resolves color-mix() by
     measuring rather than by re-implementing, because a re-implementation that
     agrees with Chrome today disagrees with it eventually - and CI has no
     browser and this repo has no package.json to install one with. So instead
     of checking the table by regenerating it, CI checks that the stylesheet it
     was made from is the stylesheet that is committed. One input, one hash.
     It cannot tell you the table is correct; it can tell you it is not stale,
     and stale is the failure that actually happens. */
  const stamped = Object.assign(
    { _built_sha256: crypto.createHash('sha256').update(css).digest('hex') },
    out);
  fs.writeFileSync(OUT, JSON.stringify(stamped, null, 1));
  console.log('resolve-tokens: %d tokens -> %d colours, %d lengths, %d other',
    names.length, colours, lengths, names.length - colours - lengths);
  console.log('  sample: --tint-cherry  %s  ->  %s',
    (out['--tint-cherry'] || {}).raw, (out['--tint-cherry'] || {}).hex);
  console.log('  sample: --surface-page %s  ->  %s',
    (out['--surface-page'] || {}).raw, (out['--surface-page'] || {}).hex);
  console.log('  written to ' + path.relative(ROOT, OUT));
  await browser.close();
})();