// Does every cell of the composition matrix do what its two primitives promise?
//
// Written because the owner looked at the grid and said he was not sure it was
// correct, and squinting at a 1132px-wide picture of a 5000px section is not an
// answer. So: predict each cell from the semantics, measure it, print the
// disagreements.
//
// *** THE FIRST TWO VERSIONS OF THIS FILE WERE WRONG IN THREE WAYS, AND EVERY
// ONE OF THEM ACCUSED THE CSS. *** Kept as comments because they are the
// interesting part:
//   - a cluster is a row WHILE ITS CHILDREN FIT. Two splits in a 230px cell do
//     not fit, and wrapping is the cluster working.
//   - a switcher answers to ITS OWN width, not its parent's. Inside a cluster
//     it is as wide as its content, so it stacks - correctly - even though the
//     cluster around it is 1000px.
//   - a split puts BOTH of the things handed to it in its main column, so they
//     stack no matter how wide it is. Its row-ness is main beside aside, which
//     is a different measurement entirely.
//
//   node mxverify.js
const { chromium } = require('playwright');
const path = require('path');

const GAP = { stack: [24, 30], inline: [8, 10], xs: [12, 15], none: [-1, 1] };
const SWITCH_AT = 480;   // --threshold, 30rem
// The split has no breakpoint any more - it wraps when the main column cannot
// have --main-min (60%) of the container. Solving for the container: it is two
// columns while  container - gap - aside  >=  0.6 * container, i.e. from about
// aside/0.4 + gap. With --aside 21rem and --space-l that is around 880px.
const SPLIT_AT = 880;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto('file:///' + path.join(path.dirname(__dirname), 'theme/darling/gallery.html').replace(/\\/g, '/'),
               { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const rows = await p.evaluate(() => {
    const R = (e) => { const r = e.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
    const inner = (e) => { const cs = getComputedStyle(e);
      return Math.round(e.getBoundingClientRect().width
        - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth)); };
    // how are these siblings arranged, and how far apart?
    const arrange = (els) => {
      if (els.length < 2) return { row: null, gap: null, fits: null };
      const g = els.map(R);
      const row = Math.abs(g[0].y - g[1].y) < 4 && g[1].x > g[0].x;
      return { row, gap: row ? g[1].x - (g[0].x + g[0].w) : g[1].y - (g[0].y + g[0].h),
               sum: g.reduce((n, x) => n + x.w, 0) };
    };
    const splitState = (el) => {
      const main = el.querySelector(':scope > .d-split__main');
      const aside = el.querySelector(':scope > .d-split__aside');
      if (!main || !aside) return null;
      const m = R(main), a = R(aside);
      // *** THE THRESHOLD IS NOT A CONSTANT AND ASSUMING IT WAS ACCUSED THE CSS
      // OF A BUG IT DID NOT HAVE. *** The split wraps when the main column
      // cannot keep --main-min, so the width it happens at depends on THIS
      // split's --aside and gap - and the matrix's stub asides are 5rem, not
      // the 21rem default. Read them off the element.
      const cs = getComputedStyle(el);
      const asideBasis = parseFloat(getComputedStyle(aside).flexBasis) || 0;
      const gap = parseFloat(cs.columnGap) || 0;
      // getComputedStyle returns min-width as the AUTHORED percentage string,
      // not a used pixel length, so parseFloat gives 60 - and dividing 60 by
      // the container turned 60% into 22% and the threshold into nonsense.
      const rawMin = getComputedStyle(main).minWidth;
      const minPct = rawMin.endsWith('%') ? parseFloat(rawMin) / 100
                                          : (parseFloat(rawMin) || 0) / Math.max(1, inner(el));
      const at = Math.round((asideBasis + gap) / Math.max(0.05, 1 - minPct));
      return { beside: Math.abs(m.y - a.y) < 4 && a.x > m.x, width: inner(el), at };
    };

    const out = [];
    for (const cell of document.querySelectorAll('#matrix .mx-cell')) {
      const key = cell.getAttribute('data-mx');
      const [outer, innerKind] = key.replace('wide ', '').split('>');
      const host = cell.lastElementChild;
      const holder = outer === 'split' ? host.querySelector(':scope > .d-split__main') : host;
      const groups = [...holder.children];
      const first = groups[0];
      const leaves = first ? [...first.querySelectorAll('.mx-leaf')] : [];
      out.push({
        key, outer, inner: innerKind,
        outerWidth: inner(holder),
        outerArr: arrange(groups),
        outerSplit: outer === 'split' ? splitState(host) : null,
        innerWidth: first ? inner(first) : null,
        innerArr: arrange(innerKind === 'split' && first
          ? [...first.querySelector(':scope > .d-split__main').children] : leaves),
        innerSplit: innerKind === 'split' && first ? splitState(first) : null,
      });
    }
    return out;
  });
  await b.close();

  // What SHOULD a primitive do with the children handed to it, at this width?
  const predict = (kind, width, arr) => {
    if (kind === 'stack')    return { row: false, gap: 'stack' };
    if (kind === 'box')      return { row: false, gap: 'none' };
    // both children go in main, so they stack whatever the width is
    if (kind === 'split')    return { row: false, gap: 'none' };
    if (kind === 'switcher') return { row: width >= SWITCH_AT, gap: 'xs' };
    if (kind === 'cluster') {
      // *** A CLUSTER PROMISES A ROW THAT WRAPS, SO BOTH OUTCOMES ARE CORRECT
      // AND ONLY THE GAP IS AN ASSERTION. *** Trying to predict which one from
      // the measured widths is circular - once the children have wrapped they
      // are full width, so "would they have fitted" is unanswerable after the
      // fact. This is the check being honest about what it can know.
      return { row: arr ? arr.row : null, gap: 'inline',
               note: arr && !arr.row ? ' (wrapped)' : '' };
    }
  };
  const judge = (arr, exp) => {
    if (!arr || arr.row === null) return 'ok (one child)';
    if (arr.row !== exp.row) return 'WRONG: ' + (arr.row ? 'side by side' : 'stacked')
      + ', expected ' + (exp.row ? 'side by side' : 'stacked');
    const [lo, hi] = GAP[exp.gap];
    if (arr.gap < lo - 1 || arr.gap > hi + 1) return 'WRONG GAP: ' + arr.gap + 'px, expected ' + lo + '-' + hi;
    return 'ok' + (exp.note || '');
  };

  let bad = 0;
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log(pad('cell', 22) + pad('width', 7) + pad('outer', 40) + 'inner');
  for (const r of rows) {
    const eo = predict(r.outer, r.outerWidth, r.outerArr);
    const ei = predict(r.inner, r.innerWidth, r.innerArr);
    let a = judge(r.outerArr, eo), c = judge(r.innerArr, ei);
    // the split's real question: is the aside beside the main column?
    for (const [st, w, tag] of [[r.outerSplit, r.outerWidth, 'outer'], [r.innerSplit, r.innerWidth, 'inner']]) {
      if (!st) continue;
      const want = st.width >= st.at;
      const msg = st.beside === want ? '' : 'WRONG: aside ' + (st.beside ? 'beside' : 'below')
        + ' main at ' + st.width + 'px, wraps at ' + st.at + 'px';
      if (msg) { if (tag === 'outer') a = msg; else c = msg; }
      else if (tag === 'outer') a += ' (aside ' + (st.beside ? 'beside' : 'below') + ')';
      else c += ' (aside ' + (st.beside ? 'beside' : 'below') + ')';
    }
    if (a.includes('WRONG') || c.includes('WRONG')) bad++;
    console.log(pad(r.key, 22) + pad(String(r.outerWidth), 7) + pad(a, 40) + c);
  }
  console.log('\n%d of %d cells disagree with what their primitives promise', bad, rows.length);
  if (bad) process.exit(1);
})();
