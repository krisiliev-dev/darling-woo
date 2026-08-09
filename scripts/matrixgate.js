// GATE / the composition matrix holds
//
// The owner asked how we can know that a checkbox next to a table, inside a
// panel, inside a table, will display properly. Nobody can know it by reading
// CSS - reasoning does not survive two levels of nesting. So the gallery
// renders the combinations and this measures them.
//
// Three invariants, and they are deliberately the checkable ones. "Looks
// right" is not here; that is the owner's job and the screenshots are for him.
//
//   1 NOTHING STICKS OUT. Every element's border box is inside its parent's
//     content box. This is the one that catches a grid with a min-width, a
//     table wider than its cell, a percentage inside a flex row.
//   2 NO DOUBLE PADDING. A padded .d-box whose only element child is another
//     padded .d-box. The nesting failure is spacing, not alignment: three
//     surfaces each insetting their contents is 60px of air nobody asked for.
//   3 NO COMPONENT SETS ITS OWN OUTER MARGIN. Measured on the rendered
//     element, not grepped: each component is rendered alone in #mx-alone, so
//     a margin has nowhere to hide behind a sibling selector.
//
// Known exceptions live in scripts/matrix.allow.json with a reason each, the
// same way frozen-paint.allow.json works. An exception without a reason is a
// silenced failure.
//
//   node scripts/matrixgate.js          (needs the gallery built)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const ALLOW_FILE = path.join(__dirname, 'matrix.allow.json');
const ALLOW = fs.existsSync(ALLOW_FILE) ? JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')) : {};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto('file:///' + path.join(ROOT, 'theme/darling/gallery.html').replace(/\\/g, '/'),
               { waitUntil: 'load' });
  await p.waitForTimeout(1000);

  const out = await p.evaluate(() => {
    const sec = document.getElementById('matrix');
    if (!sec) return null;
    const name = (el) => {
      // A generated cell names itself, so an allow-list key is stable when the
      // grid grows. "div > div > d-box" is not a key anyone can maintain.
      const mx = el.getAttribute('data-mx');
      if (mx) return '[' + mx + ']';
      const c = (el.getAttribute('class') || '').split(/\s+/).filter((x) => /^(d-|wc-)/.test(x));
      return (c[0] || el.tagName.toLowerCase()) + (el.id ? '#' + el.id : '');
    };
    const where = (el) => {
      const trail = [];
      for (let n = el; n && n !== sec; n = n.parentElement) trail.unshift(name(n));
      return trail.join(' > ');
    };

    // 1 -- overflow
    const spill = [];
    for (const el of sec.querySelectorAll('*')) {
      const par = el.parentElement;
      if (!par || par === sec) continue;
      const pcs = getComputedStyle(par);
      // a scroller is allowed to have content past its edge - that is its job
      if (/auto|scroll|hidden|clip/.test(pcs.overflowX)) continue;
      if (getComputedStyle(el).position === 'absolute' || getComputedStyle(el).position === 'fixed') continue;
      const r = el.getBoundingClientRect(), pr = par.getBoundingClientRect();
      if (!r.width || !pr.width) continue;
      const left = pr.left + parseFloat(pcs.borderLeftWidth) + parseFloat(pcs.paddingLeft);
      const right = pr.right - parseFloat(pcs.borderRightWidth) - parseFloat(pcs.paddingRight);
      const over = Math.round(Math.max(r.right - right, left - r.left));
      if (over > 1) spill.push({ what: where(el), by: over });
    }

    // 2 -- double padding
    const dbl = [];
    for (const box of sec.querySelectorAll('.d-box')) {
      const pad = parseFloat(getComputedStyle(box).paddingTop);
      if (!pad) continue;
      const kids = [...box.children];
      if (kids.length !== 1) continue;
      const kid = kids[0];
      if (!kid.classList.contains('d-box')) continue;
      const kpad = parseFloat(getComputedStyle(kid).paddingTop);
      if (kpad > 0) dbl.push({ what: where(box), outer: pad, inner: kpad });
    }

    // 3 -- outer margins, on components rendered alone
    const margins = [];
    for (const holder of document.querySelectorAll('#mx-alone > [data-mx-alone]')) {
      // Some components have to be rendered inside a required ancestor - Woo's
      // field rules all start at .wc-block-components-form - so the element to
      // measure is marked rather than assumed to be the first child. Measuring
      // the wrapper is how the first run of this gate gave two Woo families a
      // clean bill they had not earned.
      const el = holder.querySelector('[data-mx-target]') || holder.firstElementChild;
      if (!el) continue;
      const cs = getComputedStyle(el);
      const m = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft']
        .map((k) => Math.round(parseFloat(cs[k]) * 100) / 100);
      if (m.some((x) => x !== 0)) {
        margins.push({ what: holder.getAttribute('data-mx-alone'), margin: m.join(' ') });
      }
    }
    const cells = sec.querySelectorAll('.mx-cell').length;
    return { spill, dbl, margins, cells };
  });
  await b.close();

  if (!out) { console.log('FAIL: no #matrix section in the gallery'); process.exit(1); }
  console.log('matrix: %d generated cells', out.cells);

  let bad = 0;
  const report = (title, rows, key, fmt) => {
    const live = rows.filter((r) => !ALLOW[key + ':' + (r.what || '')]);
    const waived = rows.length - live.length;
    console.log('\n%s: %d%s', title, live.length, waived ? '  (' + waived + ' allowed)' : '');
    for (const r of live) { console.log('  ' + fmt(r)); bad++; }
  };
  report('things sticking out of their container', out.spill, 'spill',
         (r) => r.what + '   by ' + r.by + 'px');
  report('padded boxes alone inside padded boxes', out.dbl, 'dbl',
         (r) => r.what + '   ' + r.outer + 'px around ' + r.inner + 'px');
  report('components setting their own outer margin', out.margins, 'margin',
         (r) => r.what + '   margin: ' + r.margin);

  if (bad) { console.log('\nMATRIXGATE FAIL: %d', bad); process.exit(1); }
  console.log('\nmatrixgate: nothing sticks out, nothing is double-padded, no component owns a margin.');
})();
