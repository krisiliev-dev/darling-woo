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
const eq = (what, a, b) => {
  if (Math.abs(a - b) > T) fails.push(what + ': ' + a + ' vs ' + b + ' (' + Math.abs(a - b) + 'px apart)');
  else console.log('  ok  ' + what + '  x=' + a);
};

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
        stackH: q('.d-stack > h3'), shellContent: contentLeft('.d-shell') };
    });
  });
  if (!m) { console.log('FAIL: no #align section in the gallery'); process.exit(1); }
  if (m.length !== 4) fails.push('expected 4 alignment demos, found ' + m.length);

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
  eq('our control text on the text rail', m[2].checkText, m[2].guides[1]);
  eq('Woo control text on the text rail', m[2].wooText, m[2].guides[1]);
  eq('the shell that holds them starts on the page rail', m[2].shellContent, m[2].guides[0]);

  console.log('4 rhythm');
  eq('stack heading on the page rail', m[3].stackH, m[3].guides[0]);

  await b.close();
  if (fails.length) { console.log('\nALIGNGATE FAIL'); fails.forEach((f) => console.log('  ' + f)); process.exit(1); }
  console.log('\naligngate: every component in #align is on its own token.');
})();