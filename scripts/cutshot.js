/* WHAT THE DEQUEUE ACTUALLY LOOKS LIKE.
 *
 * triage says 329 declarations will MOVE when the sheets go. It cannot say
 * whether a move is a regression or an improvement: 71% of them are WooCommerce
 * adding something, and whether we want it back is a design ruling, not a
 * measurement. So: render each page twice against our own build, once with their
 * sheets on and once with them off, and let the two pictures be the argument.
 *
 * KEEP is triage's own keep-list, so this is the same cutover triage performs -
 * global-styles stripped to its custom properties, @font-face kept whole.
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const R = 'C:/Users/lora_/darling/darling-woo/scripts';
const OUT = 'C:/Users/lora_/darling/_scratch_woo/sync/cutshots';
const serve = require(path.join(R, 'dtest', 'serve'));
const PAGES = ['checkout', 'cart', 'product', 'shop', 'account', 'home'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, port } = await serve.start(path.join(R, 'mirror'));
  const b = await chromium.launch();
  for (const pg of PAGES) {
    for (const w of [1240, 390]) {
      const p = await b.newPage({ viewport: { width: w, height: 1200 }, deviceScaleFactor: 1 });
      await p.goto('http://127.0.0.1:' + port + '/' + pg + '.html', { waitUntil: 'load' });
      await p.waitForTimeout(1200);
      await p.screenshot({ path: OUT + '/' + pg + '-' + w + '-before.png', fullPage: true });
      const off = await p.evaluate(() => {
        const KEEP = new Set(['darling-system-css']);
        const gone = [];
        for (const sh of [...document.styleSheets]) {
          const id = (sh.ownerNode && sh.ownerNode.id) || (sh.href || '').split('/').pop().split('?')[0] || '';
          if (/darling\.build\.css/.test(sh.href || '') || KEEP.has(id)) continue;
          if (/^$/.test(id)) continue;                       // anonymous: the @font-face block
          if (id === 'global-styles-inline-css') {
            /* strip to custom properties + @font-face, the way triage does */
            let rules; try { rules = sh.cssRules; } catch (e) { continue; }
            const keep = [];
            for (const r of rules) {
              if (r.constructor && r.constructor.name === 'CSSFontFaceRule') { keep.push(r.cssText); continue; }
              if (!r.style) continue;
              const vars = [...r.style].filter((n) => n.startsWith('--'));
              if (vars.length) keep.push(r.selectorText + '{' + vars.map((n) => n + ':' + r.style.getPropertyValue(n)).join(';') + '}');
            }
            sh.disabled = true;
            const s = document.createElement('style'); s.id = 'gs-stripped';
            s.textContent = keep.join('\n'); document.head.appendChild(s);
            gone.push(id + ' (stripped to ' + keep.length + ' rules)');
            continue;
          }
          sh.disabled = true; gone.push(id);
        }
        return gone;
      });
      await p.waitForTimeout(900);
      await p.screenshot({ path: OUT + '/' + pg + '-' + w + '-after.png', fullPage: true });
      if (w === 1240) console.log(pg + ': ' + off.length + ' sheets off');
      await p.close();
    }
  }
  await b.close(); server.close();
  console.log('-> ' + OUT);
})();
