// *** THE FIFTH ONE, BEFORE THE OWNER FINDS IT. ***
//
// Four times now the accessibility mode has made something LOUDER instead of
// quieter, and every one was reported by the owner rather than caught here:
//
//     the notices' star rain    froze mid-fall
//     the cart's streak         painted at full strength on hover
//     the progress bar's sheen  read as "a gradient on the fill"
//     the burst                 nine stars, held
//
// They are all the same bug. `animation:none` is not a volume control - it stops
// the thing that was HIDING the paint. Anything whose resting appearance is
// invisible only because an animation is moving it becomes permanently visible
// the moment the animation stops.
//
// So: find everything that animates in the normal mode, turn the mode on, and
// ask whether it still paints. Most answers are fine - a star that is a static
// star is a star - so the ones that have been looked at live in an allowlist
// with a reason each, and this fails only on something NEW.
//
//   node scripts/frozengate.js            check against the allowlist
//   node scripts/frozengate.js --write    re-record it (read the diff!)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const F = 'file:///' + path.resolve('theme/darling/gallery.html').replace(/\\/g, '/');
const ALLOW = path.resolve('scripts/frozen-paint.allow.json');
const WRITE = process.argv.includes('--write');

/* gallery.html INLINES the stylesheet, so a build without a regenerate leaves
 * this measuring the previous one - and passing on it, in the same words. See
 * scripts/_fresh.js: that trap gave a clean all-clear on a 78-element change. */
require('./_fresh').assertGalleryFresh();

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1400 } });
  await p.goto(F);
  await p.waitForTimeout(900);

  const found = await p.evaluate(() => {
    // A key that survives re-ordering the gallery: the element's own classes
    // plus the pseudo. Two elements with the same classes are the same
    // component, which is the granularity this question lives at.
    const key = (el, ps) => {
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/)
        .filter(Boolean).filter((c) => !/^is-|^has-/.test(c)).sort().join('.');
      return (cls ? '.' + cls : el.tagName.toLowerCase()) + (ps || '');
    };
    const all = [...document.querySelectorAll('*')];
    const animated = [];
    for (const el of all) {
      for (const ps of [null, '::before', '::after']) {
        const cs = getComputedStyle(el, ps || undefined);
        if (cs.animationName && cs.animationName !== 'none') {
          animated.push([el, ps, key(el, ps)]);
        }
      }
    }

    document.documentElement.classList.add('d-a11y');
    // force a reflow so the mode's declarations are in before we measure
    void document.body.offsetHeight;

    // *** A PSEUDO-ELEMENT OF A display:none HOST STILL REPORTS A COMPUTED
    // STYLE. *** The first run flagged .d-notice__stars::before, which cannot
    // paint anything because its host span is display:none in this mode -
    // getComputedStyle just does not know that. Walk up.
    const hidden = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const c = getComputedStyle(n);
        if (c.display === 'none' || c.visibility === 'hidden'
            || parseFloat(c.opacity) < 0.02) return true;
      }
      return false;
    };
    const paints = (el, ps) => {
      if (hidden(el)) return false;
      const cs = getComputedStyle(el, ps || undefined);
      if (ps && (cs.content === 'none' || cs.content === 'normal')) return false;
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (parseFloat(cs.opacity) < 0.02) return false;
      const w = parseFloat(cs.width), h = parseFloat(cs.height);
      if (!(w > 0.5 && h > 0.5)) return false;
      const bg = cs.backgroundColor;
      const transparent = !bg || bg === 'transparent' || /,\s*0\)$/.test(bg);
      const hasImage = cs.backgroundImage && cs.backgroundImage !== 'none';
      const hasMask = (cs.maskImage && cs.maskImage !== 'none')
        || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none');
      const hasBorder = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderRightWidth) > 0;
      return hasImage || hasMask || hasBorder || !transparent;
    };

    const still = new Map();
    for (const [el, ps, k] of animated) {
      if (!paints(el, ps)) continue;
      const cs = getComputedStyle(el, ps || undefined);
      if (!still.has(k)) {
        still.set(k, { key: k, animation: cs.animationName,
          w: Math.round(parseFloat(cs.width)), h: Math.round(parseFloat(cs.height)) });
      }
    }
    document.documentElement.classList.remove('d-a11y');
    return [...still.values()].sort((a, b) => a.key.localeCompare(b.key));
  });

  await b.close();

  const keys = found.map((f) => f.key);
  console.log('STILL PAINTING WITH THE MODE ON: ' + keys.length);
  // Node's console.log has no %-52s, and the first run of this gate printed the
  // format string itself forty-one times. Pad by hand.
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, Math.max(n, s.length));
  for (const f of found) {
    console.log('     ' + pad(f.key, 50) + ' ' + pad(f.animation, 20)
      + f.w + 'x' + f.h);
  }

  if (WRITE) {
    const prev = fs.existsSync(ALLOW) ? JSON.parse(fs.readFileSync(ALLOW, 'utf8')) : { allow: {} };
    const out = { _note: 'Written by scripts/frozengate.js --write. Every key needs a '
      + 'REASON, and "it looked fine" is not one - four of these shipped as bugs.',
      allow: {} };
    for (const k of keys) out.allow[k] = prev.allow[k] || 'UNREVIEWED';
    fs.writeFileSync(ALLOW, JSON.stringify(out, null, 1) + '\n');
    console.log('\nwrote %s - %d entries, %d still UNREVIEWED', path.relative('.', ALLOW),
      keys.length, Object.values(out.allow).filter((v) => v === 'UNREVIEWED').length);
    process.exit(0);
  }

  if (!fs.existsSync(ALLOW)) {
    console.error('\n::error::no allowlist. Run: node scripts/frozengate.js --write');
    process.exit(1);
  }
  const allow = JSON.parse(fs.readFileSync(ALLOW, 'utf8')).allow || {};
  const fresh = keys.filter((k) => !(k in allow));
  const unreviewed = keys.filter((k) => allow[k] === 'UNREVIEWED');
  const gone = Object.keys(allow).filter((k) => !keys.includes(k));

  console.log('');
  if (fresh.length) {
    console.error('::error::something new keeps painting when its animation stops.');
    console.error('Four of these have shipped as bugs, every one reported as the plain');
    console.error('mode making something LOUDER. Decide which this is:');
    console.error('  - decoration the animation was hiding -> remove it in a11y.css');
    console.error('    (content:none / display:none), do not merely still it;');
    console.error('  - or it reads correctly standing still -> add it to');
    console.error('    scripts/frozen-paint.allow.json with the reason.');
    for (const k of fresh) console.error('    NEW  ' + k);
  }
  for (const k of unreviewed) console.error('    UNREVIEWED  ' + k + '  (needs a reason)');
  for (const k of gone) console.log('    (gone, harmless) ' + k);

  const bad = fresh.length + unreviewed.length;
  console.log('\n%s   %d', bad ? 'RESULT: FAILURES' : 'RESULT: nothing new is frozen', bad);
  process.exit(bad ? 1 : 0);
})();
