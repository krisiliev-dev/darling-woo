const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
/* Paths are relative to this script. The MIRROR is a static capture of the live
 * site built by the dtest harness and is NOT in this repo yet; point DARLING_MIRROR
 * at it, or run this from the scratch copy that has one. */
const R = __dirname;
const MIRROR = process.env.DARLING_MIRROR || path.join(R, 'mirror');
const serve = require(path.join(R, 'dtest', 'serve'));
const PAGES = ['product', 'account', 'cart', 'home'];

/* *** THIS GATE WAS PASSING ON NOTHING, AND IT PASSED FOR DAYS. ***
 * With no mirror on disk the static server 404s every page, p.goto() resolves
 * anyway on an error document, querySelectorAll('.screen-reader-text') finds
 * zero nodes, zero leaks are counted, and the gate prints "all clear" and exits
 * 0. Four pages of nothing, reported as four pages of proof - and it was
 * reported that way in three separate commits.
 *
 * The same blindness seams.js had when file:// made every stylesheet
 * cross-origin and it returned "0 seams" as a pass. The cure is the same one:
 * a gate must assert that it SAW something before it is allowed to say nothing
 * was wrong. Absence of evidence is the failure mode, not the pass condition. */
function tripwire(pagesSeen, nodesSeen) {
  if (!fs.existsSync(MIRROR)) {
    console.error('srgate: NO MIRROR at ' + MIRROR + '. This gate tests a capture of the\n' +
      '        live site; without one it can only prove that nothing is nothing.\n' +
      '        Set DARLING_MIRROR, or capture one. NOT a pass.');
    process.exit(2);
  }
  const missing = PAGES.filter((p) => !fs.existsSync(path.join(MIRROR, p + '.html')));
  if (missing.length) {
    console.error('srgate: mirror is missing ' + missing.join(', ') + '. NOT a pass.');
    process.exit(2);
  }
  if (!nodesSeen) {
    console.error('srgate: ' + pagesSeen + ' pages loaded and NOT ONE .screen-reader-text node\n' +
      '        was found on any of them. Either the mirror is stale or the class is\n' +
      '        gone; either way this gate proved nothing. NOT a pass.');
    process.exit(2);
  }
}

(async () => {
  tripwire(0, 1);   // the on-disk half, before spending a browser launch
  const { server, port } = await serve.start(MIRROR);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 900 } });
  let leaks = 0, nodesSeen = 0, pagesSeen = 0;
  for (const pg of PAGES) {
    await p.goto('http://127.0.0.1:' + port + '/' + pg + '.html', { waitUntil: 'load' });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      /* *** THE TEST IS "IS ANYTHING PAINTED", NOT "IS THE BOX 1x1". ***
       * An absolutely positioned <caption> measures 1x10 in Chrome however the
       * height is specified - the table wrapper wins - and it is still
       * completely invisible, because clip-path:inset(50%) paints nothing at
       * any size. Asserting 1x1 would have failed a node that is perfectly
       * hidden. Asserting "clipped, one pixel wide, and still in the
       * accessibility tree" is the actual requirement, and it keeps its teeth:
       * delete our rule and clip-path goes to none, which fails. */
      const probe = () => [...document.querySelectorAll('.screen-reader-text')].map((e) => {
        const b = e.getBoundingClientRect();
        const c = getComputedStyle(e);
        return { t: (e.textContent || '').trim().slice(0, 30),
                 w: Math.round(b.width), h: Math.round(b.height),
                 clipped: c.clipPath !== 'none',
                 announced: c.display !== 'none' && c.visibility !== 'hidden' };
      });
      const before = probe();
      const off = [];
      for (const sh of [...document.styleSheets]) {
        const id = (sh.ownerNode && sh.ownerNode.id) || (sh.href || '').split('/').pop();
        if (/wc-blocks-style-css|woocommerce-general-css|wp-block-library-inline-css/.test(id)) { sh.disabled = true; off.push(id); }
      }
      return { off, before, after: probe() };
    });
    pagesSeen++; nodesSeen += r.after.length;
    console.log(pg + '   ' + r.after.length + ' node(s), disabled: ' + (r.off.join(', ') || 'NONE'));
    r.after.forEach((a, i) => {
      const bf = r.before[i];
      const hidden = a.clipped && a.w <= 1;
      const ok = hidden && a.announced ? 'OK  ' : (a.announced ? 'LEAK' : 'MUTE');
      if (ok !== 'OK  ') leaks++;   // MUTE is a failure too: hidden from the screen reader as well
      console.log('   ' + ok + '  ' + (bf.w + 'x' + bf.h).padEnd(10) + '-> ' + (a.w + 'x' + a.h).padEnd(10) + '"' + a.t + '"');
    });
  }
  await b.close(); server.close();
  tripwire(pagesSeen, nodesSeen);
  if (leaks) {
    console.log('\n' + leaks + ' node(s) became visible. Hidden text on the page is the ' +
      'loudest dequeue regression there is - do not remove those sheets.');
    process.exit(1);
  }
  console.log('\nall clear: ' + nodesSeen + ' .screen-reader-text node(s) across ' + pagesSeen +
    ' page(s) stay clipped and announced with the three sheets off.');
})();
