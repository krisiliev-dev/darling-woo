/* The counterfactual. The run above shows the nodes stay 1x1 after the dequeue -
 * but that proves nothing unless removing OUR rule as well makes them leak. A
 * gate that cannot fail is not a gate. */
const { chromium } = require('playwright');
const path = require('path');
const R = __dirname;
const MIRROR = process.env.DARLING_MIRROR || path.join(R, 'mirror');
const serve = require(path.join(R, 'dtest', 'serve'));
(async () => {
  const { server, port } = await serve.start(MIRROR);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 900 } });
  await p.goto('http://127.0.0.1:' + port + '/account.html', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  console.log(await p.evaluate(() => {
    const probe = () => [...document.querySelectorAll('.screen-reader-text')]
      .map((e) => { const b = e.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height); }).join(' ');
    for (const sh of [...document.styleSheets]) {
      const id = (sh.ownerNode && sh.ownerNode.id) || (sh.href || '').split('/').pop();
      if (/wc-blocks-style-css|woocommerce-general-css|wp-block-library-inline-css/.test(id)) sh.disabled = true;
    }
    const withOurs = probe();
    // now delete OUR rule too, from the built sheet
    let killed = 0;
    for (const sh of document.styleSheets) {
      if (!/darling\.build\.css/.test(sh.href || '')) continue;
      const walk = (list) => {
        for (let i = list.length - 1; i >= 0; i--) {
          const r = list[i];
          if (r.cssRules && r.selectorText === undefined) { walk(r.cssRules); continue; }
          if (r.selectorText && /\.screen-reader-text|\.d-vh/.test(r.selectorText)) {
            try { (r.parentRule || sh).deleteRule(i); killed++; } catch (e) {}
          }
        }
      };
      try { walk(sh.cssRules); } catch (e) {}
    }
    return 'with our rule:    ' + withOurs + '\nour rule deleted (' + killed + ' rules): ' + probe();
  }));
  await b.close(); server.close();
})();
