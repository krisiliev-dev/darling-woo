// GATE / the gallery's alignment section tells the truth
//
// The #align section draws guides from tokens and stands components beside
// them. A guide drawn from --gutter is always where --gutter is, so the guide
// alone proves nothing: the gate is whether the COMPONENTS are still on it.
// If someone re-adds a max-width and a padding to a pattern, this separates.
//
//   node scripts/aligngate.js        (needs the gallery built)
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.dirname(__dirname);
const T = 1;   // px. Sub-pixel layout rounds; a real drift is tens of px.

const fails = [];
/* *** THIS GATE PASSED ON NOTHING, AND HERE IS THE ARITHMETIC THAT LET IT. ***
 * q() returns null when the element is not in the gallery, and guides[i] is
 * undefined when the guide is not drawn. Math.abs(null - undefined) is NaN, and
 * `NaN > 1` is FALSE - so the old comparison fell into the else and printed
 * `ok`. Measured, not reasoned: with all ten .gl guides renamed out of the
 * gallery, this gate still printed all thirteen assertions as ok and exited 0
 * with the sentence "every component in #align is on its own token."
 *
 * It is one of the five gates scripts/deploy.js runs. Second time on this
 * project a gate has been green because it was looking at nothing - srgate was
 * the first, for three commits - so the rule is now written down where it can be
 * read: A COMPARISON WITH A MISSING OPERAND IS A FAILURE, NOT A PASS. Never let
 * a NaN reach a `>`; test for the absence first and say which side was missing,
 * because "the guide is not drawn" and "the component is not there" are two
 * different repairs. */
const eq = (what, a, b) => {
  const bad = [a === null || a === undefined || Number.isNaN(a) ? 'the component' : null,
    b === null || b === undefined || Number.isNaN(b) ? 'the guide' : null].filter(Boolean);
  if (bad.length) { fails.push(what + ': MEASURED NOTHING - ' + bad.join(' and ') + ' missing (a=' + a + ', b=' + b + ')'); return; }
  if (Math.abs(a - b) > T) fails.push(what + ': ' + a + ' vs ' + b + ' (' + Math.abs(a - b) + 'px apart)');
  else console.log('  ok  ' + what + '  x=' + a);
};

/* gallery.html INLINES the stylesheet, so a build without a regenerate leaves
 * this measuring the previous one - and passing on it, in the same words. See
 * scripts/_fresh.js: that trap gave a clean all-clear on a 78-element change. */
require('./_fresh').assertGalleryFresh();

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto('file:///' + path.join(ROOT, 'theme/darling/gallery.html').replace(/\\/g, '/'),
               { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const m = await p.evaluate(() => {
    const sec = document.getElementById('align');
    if (!sec) return null;
    const pages = [...sec.querySelectorAll('.algn-page')];
    const L = (e) => e && Math.round(e.getBoundingClientRect().left);
    const R = (e) => e && Math.round(e.getBoundingClientRect().right);
    return pages.map((pg) => {
      const base = L(pg);
      const g = [...pg.querySelectorAll('.gl:not(.gl--was)')].map((x) => L(x) - base);
      const q = (sel, f) => { const e = pg.querySelector(sel); return e ? (f || L)(e) - base : null; };
      const contentLeft = (sel) => { const e = pg.querySelector(sel); if (!e) return null;
        return Math.round(e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft || 0)) - base; };
      return { guides: g,
        logo: q('.d-header__logo'), title: contentLeft('.d-section-title'), card: q('.d-card'),
        splitH: q('.d-split__main h3'), splitField: q('.d-split__main .d-field'),
        asideRight: q('.d-split__aside', R),
        checkText: q('.d-check span'), wooText: q('.wc-block-components-checkbox__label'),
        checkBox: q('.d-check input'), wooBox: q('.wc-block-components-checkbox__input'),
        stackH: q('.d-stack > h3'), shellContent: contentLeft('.d-shell') };
    });
  });
  if (!m) { console.log('FAIL: no #align section in the gallery'); process.exit(1); }
  if (m.length !== 4) fails.push('expected 4 alignment demos, found ' + m.length);

  /* *** SAY OUT LOUD WHAT WAS FOUND, BEFORE ASSERTING ANYTHING ABOUT IT. ***
   * The per-assertion guard above catches a missing operand one at a time. This
   * catches the whole instrument being pointed at an empty page, which is the
   * shape the failure actually took: thirteen ok lines and nothing measured.
   * The counts are the ones the four demos are BUILT with, so a demo that loses
   * a guide is a red gate rather than a quieter green one. */
  /* What each demo is BUILT with, counting only .gl:not(.gl--was) - demo 1 draws
   * a fourth, .gl--was, marking where content sat while --page-max was a
   * max-width and --gutter a padding, and that one is history rather than a
   * rail. Demo 4 makes one assertion and needs one guide; it is not an
   * oversight. */
  const WANT_GUIDES = [3, 2, 3, 1];
  m.forEach((pg, i) => {
    if (!pg.guides || pg.guides.length !== WANT_GUIDES[i]) {
      fails.push('demo ' + (i + 1) + ' draws ' + ((pg.guides || []).length) +
        ' guides, not ' + WANT_GUIDES[i] + ' - the gate has nothing to measure against');
    }
  });
  console.log('guides found per demo: ' + m.map((pg) => (pg.guides || []).length).join(', ') +
    '   (want ' + WANT_GUIDES.join(', ') + ')');

  console.log('1 the page rail');
  // The logo is deliberately NOT on the page rail: the owner asked for the bar
  // further out. --gutter-bar in space.css, and this is what keeps it honest.
  eq('logo on the bar rail', m[0].logo, m[0].guides[2]);
  eq('section title on the page rail', m[0].title, m[0].guides[0]);
  eq('first card on the page rail', m[0].card, m[0].guides[0]);

  console.log('2 the split');
  eq('split heading on the page rail', m[1].splitH, m[1].guides[0]);
  eq('split field on the page rail', m[1].splitField, m[1].guides[0]);
  eq('aside ends on the right rail', m[1].asideRight, m[1].guides[1] + 1);

  console.log('3 the control column');
  // Two rails here since the owner asked for the control to be inset: the
  // control sits one --inline in from the page rail, the text one --inline
  // past the control. guides are [page, control, text].
  eq('our tick box on the control rail', m[2].checkBox, m[2].guides[1]);
  eq('Woo tick box on the control rail', m[2].wooBox, m[2].guides[1]);
  eq('our control text on the text rail', m[2].checkText, m[2].guides[2]);
  eq('Woo control text on the text rail', m[2].wooText, m[2].guides[2]);
  eq('the shell that holds them starts on the page rail', m[2].shellContent, m[2].guides[0]);

  console.log('4 rhythm');
  eq('stack heading on the page rail', m[3].stackH, m[3].guides[0]);

  await b.close();
  if (fails.length) { console.log('\nALIGNGATE FAIL'); fails.forEach((f) => console.log('  ' + f)); process.exit(1); }
  console.log('\naligngate: every component in #align is on its own token.');
})();