const { chromium } = require('playwright');
const path = require('path');
/* Paths are relative to this script. The MIRROR is a static capture of the live
 * site built by the dtest harness and is NOT in this repo yet; point DARLING_MIRROR
 * at it, or run this from the scratch copy that has one. */
const R = __dirname;
const MIRROR = process.env.DARLING_MIRROR || path.join(R, 'mirror');
const serve = require(path.join(R, 'dtest', 'serve'));
(async () => {
  const { server, port } = await serve.start(MIRROR);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 900 } });
  let leaks = 0;
  for (const pg of ['product', 'account', 'cart', 'home']) {
    await p.goto('http://127.0.0.1:' + port + '/' + pg + '.html', { waitUntil: 'load' });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const probe = () => [...document.querySelectorAll('.screen-reader-text')].map((e) => {
        const b = e.getBoundingClientRect();
        return { t: (e.textContent || '').trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) };
      });
      const before = probe();
      const off = [];
      for (const sh of [...document.styleSheets]) {
        const id = (sh.ownerNode && sh.ownerNode.id) || (sh.href || '').split('/').pop();
        if (/wc-blocks-style-css|woocommerce-general-css|wp-block-library-inline-css/.test(id)) { sh.disabled = true; off.push(id); }
      }
      return { off, before, after: probe() };
    });
    console.log(pg + '   disabled: ' + r.off.join(', '));
    r.after.forEach((a, i) => {
      const bf = r.before[i];
      const ok = a.w <= 1 && a.h <= 1 ? 'OK  ' : 'LEAK';
      if (ok === 'LEAK') leaks++;
      console.log('   ' + ok + '  ' + (bf.w + 'x' + bf.h).padEnd(10) + '-> ' + (a.w + 'x' + a.h).padEnd(10) + '"' + a.t + '"');
    });
  }
  await b.close(); server.close();
  if (leaks) {
    console.log('\n' + leaks + ' node(s) became visible. Hidden text on the page is the ' +
      'loudest dequeue regression there is - do not remove those sheets.');
    process.exit(1);
  }
  console.log('\nall clear: every .screen-reader-text node stays 1x1 with the three sheets off.');
})();
