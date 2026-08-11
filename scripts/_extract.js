/* PULL THE REAL CHECKOUT AND CART MARKUP OUT OF THE MIRROR, FOR THE GALLERY.
 *
 * The owner, on the cutover screenshots: "For both the checkout after looks
 * great, with small adjustments. I think we can leave whatever styling the
 * before applies and start from the after. Put it in our gallery as its own
 * sections and we can review it."
 *
 * So the specimen has to be the REAL markup - WooCommerce's block output, class
 * for class - rendered with our CSS and nothing of theirs. Hand-written markup
 * would be a specimen of my guess about their DOM, and this project has already
 * paid for that twice.
 *
 * WHAT IS STRIPPED, AND WHY EACH ONE
 *   <script>, <noscript>   the gallery is a static page; a checkout script that
 *                          half-boots is worse than none
 *   data-* JSON blobs      the block editor stores whole serialised carts in
 *                          attributes; kilobytes of noise that style nothing
 *   the customer's email   the capture ran as a real account. A gallery is a
 *                          document we hand around; it does not carry an address
 *   id attributes          duplicated ids across two sections break label/for
 *                          and would fail namegate. Prefixed instead of dropped,
 *                          so the label associations survive.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const R = 'C:/Users/lora_/darling/darling-woo/scripts';
const serve = require(path.join(R, 'dtest', 'serve'));
const OUT = 'C:/Users/lora_/darling/_scratch_woo/sync';

const WANT = [
  ['checkout', 'checkout', '.wp-block-woocommerce-checkout'],
  ['cart', 'cart', '.wp-block-woocommerce-cart'],
];

(async () => {
  const { server, port } = await serve.start(path.join(R, 'mirror'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1200 } });
  const out = {};
  for (const [name, page, sel] of WANT) {
    await p.goto('http://127.0.0.1:' + port + '/' + page + '.html', { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const html = await p.evaluate(({ sel, name }) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      const c = root.cloneNode(true);
      c.querySelectorAll('script, noscript, template').forEach((e) => e.remove());
      c.querySelectorAll('*').forEach((e) => {
        for (const a of [...e.attributes]) {
          if (a.name.startsWith('data-') && a.value.length > 120) e.removeAttribute(a.name);
          if (a.name === 'id' && a.value) e.setAttribute('id', name + '-' + a.value);
          if (a.name === 'for' && a.value) e.setAttribute('for', name + '-' + a.value);
          if (a.name === 'aria-describedby' && a.value) e.setAttribute('aria-describedby', a.value.split(/\s+/).map((x) => name + '-' + x).join(' '));
          if (a.name === 'aria-labelledby' && a.value) e.setAttribute('aria-labelledby', a.value.split(/\s+/).map((x) => name + '-' + x).join(' '));
          if (a.name === 'aria-controls' && a.value) e.setAttribute('aria-controls', name + '-' + a.value);
        }
        /* a live value in a static specimen reads as a filled form; keep the
         * ones that demonstrate a state and blank the identifying one */
        if (e.tagName === 'INPUT' && /email/i.test(e.getAttribute('name') || '')) e.setAttribute('value', 'mariya@example.com');
      });
      return c.outerHTML;
    }, { sel, name });
    if (!html) { console.error(name + ': ' + sel + ' NOT FOUND in ' + page + '.html'); continue; }
    const clean = html.replace(/parity-customer@[a-z0-9.-]+/gi, 'mariya@example.com')
                      .replace(/parity-customer/gi, 'mariya');
    out[name] = clean;
    console.log(name.padEnd(9) + (clean.length / 1024).toFixed(1) + ' KB   ' +
      (clean.match(/class="/g) || []).length + ' class attrs');
  }
  fs.writeFileSync(OUT + '/wcmarkup.json', JSON.stringify(out));
  console.log('-> wcmarkup.json');
  await b.close(); server.close();
})();
