/* GATE / AN EMPTY SLOT PAINTS NOTHING, AND A FULL ONE PAINTS ONCE
 *
 * fallback.css casts a deliberately wide net: anything WooCommerce calls a
 * notice, a __panel or a __card gets a surface, so an unported box is never raw
 * browser chrome. The net's whole risk is that WooCommerce also prints CONTAINERS
 * with those names - slots it fills later, or never - and a slot that catches the
 * net becomes a blank pill on a real page.
 *
 * *** THIS HAS NOW HAPPENED THREE TIMES. ***
 *   .woocommerce-notices-wrapper   empty on every page. Fixed with :empty and a
 *                                  name exclusion.
 *   .wc-block-store-notices        on /cart/ and /checkout/, NOT empty - Woo puts
 *                                  a bare <div> in it as a mount point - and not
 *                                  called wrapper. 1120x20 of surface under the
 *                                  header, on the live site, for months.
 *   the same slot, FILLED          the first fix double-boxed it: our surface
 *                                  around the notice and again around the slot.
 *
 * Each fix was one selector longer than the last, and the third one broke the
 * first: swapping :only-child:empty for :has(> [class*=notice]) cleaned up the
 * filled slot and quietly un-fixed the empty one, because a mount point is a
 * <div> with no class and a notice-name test cannot see it. The selector diff
 * read as a strict improvement. Only rendering all four states at once showed it.
 *
 * So the four states are a fixture, not a memory:
 *
 *   a  empty slot        a notice-named box holding an empty mount point   BARE
 *   b  classic wrapper   .woocommerce-notices-wrapper, no children         BARE
 *   c  a real notice     a notice banner with content in it                PAINTED
 *   d  filled slot       a slot holding a real notice banner               BARE
 *                        (the notice inside it paints; the slot must not)
 *
 *   node scripts/slotgate.js        exit 1 if any of the four is wrong
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const THEME = path.join(path.dirname(__dirname), 'theme', 'darling');
const CSS = path.join(THEME, 'darling.build.css');

const CASES = [
  ['a', 'empty slot - a mount point with nothing in it', false,
   '<div class="wc-block-store-notices woocommerce alignwide wp-block-woocommerce-store-notices"><div></div></div>'],
  ['b', 'the classic wrapper, printed on every Woo page', false,
   '<div class="woocommerce-notices-wrapper"></div>'],
  ['c', 'a real notice - this one MUST be painted', true,
   '<div class="wc-block-components-notice-banner is-info">' +
   '<div class="wc-block-components-notice-banner__content">Нещо се случи.</div></div>'],
  ['d', 'a slot holding a real notice - the notice paints, the slot must not', false,
   '<div class="wc-block-store-notices woocommerce">' +
   '<div class="wc-block-components-notice-banner is-info">' +
   '<div class="wc-block-components-notice-banner__content">Поръчката е приета.</div></div></div>'],
];

(async () => {
  if (!fs.existsSync(CSS)) {
    console.error('slotgate: no ' + CSS + ' - run the build first. NOT a pass.');
    process.exit(2);
  }
  const page = '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/darling.build.css">' +
    '<body>' + CASES.map(([id, , , html]) => html.replace('<div ', '<div id="' + id + '" ')).join('\n') + '</body>';

  const srv = http.createServer((q, r) => {
    if (q.url.startsWith('/darling.build.css')) {
      r.writeHead(200, { 'content-type': 'text/css; charset=utf-8' });
      return fs.createReadStream(CSS).pipe(r);
    }
    r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    r.end(page);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  await p.goto('http://127.0.0.1:' + srv.address().port + '/', { waitUntil: 'load' });
  await p.waitForTimeout(300);

  const seen = await p.evaluate((ids) => ids.map((id) => {
    const e = document.getElementById(id);
    if (!e) return { id, missing: true };
    const c = getComputedStyle(e);
    /* "painted" is any of the three things the net applies. Testing one of them
     * would pass a half-applied rule. */
    const painted = c.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                    c.boxShadow !== 'none' ||
                    parseFloat(c.paddingTop) > 0;
    return { id, painted, bg: c.backgroundColor, pad: c.paddingTop, shadow: c.boxShadow !== 'none' };
  }), CASES.map((c) => c[0]));

  await b.close(); srv.close();

  let bad = 0;
  for (const [id, what, want] of CASES) {
    const got = seen.find((s) => s.id === id);
    if (!got || got.missing) { console.log('  MISSING  ' + id); bad++; continue; }
    const ok = got.painted === want;
    if (!ok) bad++;
    console.log('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + id + '  ' +
      (got.painted ? 'painted' : 'bare   ') + ' (want ' + (want ? 'painted' : 'bare') + ')  ' + what);
  }
  if (bad) {
    console.log('\nslotgate FAILED: ' + bad + ' of ' + CASES.length + ' states wrong.');
    console.log('The net in fallback.css is catching a container, or has stopped catching a notice.');
    console.log('Both are one selector away and the last three fixes each broke a different one.');
    process.exit(1);
  }
  console.log('\nslotgate: an empty slot paints nothing and a full one paints once.');
})();
