/* PULL WooCOMMERCE'S REAL MARKUP OUT OF THE MIRROR, FOR THE GALLERY.
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
 *   node scripts/_extract.js              both halves
 *   node scripts/_extract.js --account    the six account pages only (no browser)
 *
 * *** TWO HALVES, BECAUSE TWO CAPTURES ARE TWO DIFFERENT THINGS. ***
 *
 *   checkout, cart        scripts/mirror/*.html. These pages are BLOCKS: the
 *                         markup in the saved file is a mount point and the DOM
 *                         only exists after React has run. So they have to be
 *                         loaded in a real browser off dtest/serve and read out
 *                         of the live DOM.
 *
 *   the six account pages scripts/mirror/account/*.html, saved by acctpages.js
 *                         as document.documentElement.outerHTML AFTER load - so
 *                         they are ALREADY the settled DOM, select2's injected
 *                         spans and all. Booting a browser to re-read a file
 *                         that is already the answer buys nothing, so this half
 *                         is plain parsing and runs anywhere.
 *
 * *** AND THE PATHS COME FROM __dirname NOW. *** The first version had
 * C:/Users/lora_/... written into it three times, so it ran on exactly one
 * machine and silently could not be re-run anywhere the repo was checked out.
 * Nothing about what it does needed that.
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
 *   href on every link     a specimen is not a way out of the gallery. Every
 *                          href becomes "#", so a click during a review cannot
 *                          land on the live shop - and cannot log the reviewer
 *                          out, which /my-account/customer-logout/ is one click
 *                          from doing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const MIRROR = path.join(__dirname, 'mirror');
const SPECIMENS = path.join(ROOT, 'theme', 'darling', 'specimens');
const ONLY_ACCOUNT = process.argv.includes('--account');

/* the two block pages, read out of a browser */
const BLOCK_PAGES = [
  ['checkout', 'checkout', '.wp-block-woocommerce-checkout'],
  ['cart', 'cart', '.wp-block-woocommerce-cart'],
];

/* *** THE ACCOUNT SPECIMENS ARE SPLIT NAV-FROM-CONTENT ON PURPOSE. ***
 * All six pages carry the same six-item nav. Six copies of it in one gallery is
 * six chances to review the same list and no chance to see the CONTENT columns
 * side by side. So the nav is lifted once, as its own specimen, and each page
 * contributes only what is different about it. `account-page` keeps both
 * together for the one specimen that is about the LAYOUT rather than about any
 * page - which is the actual complaint: with no two-column rule the nav runs
 * the full height of the page and the notice lands halfway down it. */
const ACCOUNT_PAGES = [
  ['account-page', 'dashboard', '.woocommerce'],                          // nav + content, the layout
  ['account-nav', 'dashboard', '.woocommerce-MyAccount-navigation'],      // the nav alone
  ['account-dashboard', 'dashboard', '.woocommerce-MyAccount-content'],
  ['account-orders', 'orders', '.woocommerce-MyAccount-content'],
  ['account-addresses', 'addresses', '.woocommerce-MyAccount-content'],
  ['account-address-form', 'address-billing', '.woocommerce-MyAccount-content'],
  ['account-payment', 'payment-methods', '.woocommerce-MyAccount-content'],
  ['account-details', 'edit-account', '.woocommerce-MyAccount-content'],
];

/* Runs both in the page (as a string passed to evaluate) and here in node
 * against a jsdom-free parse, so it is written once as a function over a DOM
 * and given whichever DOM the caller has. */
function scrub(root, name, doc) {
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
    if (e.tagName === 'INPUT' && /email/i.test(e.getAttribute('name') || '')) e.setAttribute('value', 'mariya@example.com');
  });
  return c.outerHTML;
}

const launder = (html) => html
  .replace(/parity-customer@[a-z0-9.-]+/gi, 'mariya@example.com')
  .replace(/parity-customer/gi, 'mariya');

function write(name, html) {
  fs.mkdirSync(SPECIMENS, { recursive: true });
  const f = path.join(SPECIMENS, name + '.html');
  const before = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  fs.writeFileSync(f, html);
  const verb = before === null ? 'new    ' : before === html ? 'same   ' : 'CHANGED';
  console.log('  ' + verb + '  ' + name.padEnd(22) + (html.length / 1024).toFixed(1) + ' KB   ' +
    (html.match(/class="/g) || []).length + ' class attrs');
  return before !== null && before !== html;
}

/* ---- the account half: no browser, the capture is already the DOM --------- */
function accountHalf() {
  const { JSDOM } = requireJsdom();
  let moved = 0;
  console.log('account pages (static)');
  for (const [name, page, sel] of ACCOUNT_PAGES) {
    const f = path.join(MIRROR, 'account', page + '.html');
    if (!fs.existsSync(f)) {
      console.error('  MISSING  ' + f + '  - run scripts/acctpages.js');
      process.exitCode = 1;
      continue;
    }
    const dom = new JSDOM(fs.readFileSync(f, 'utf8'));
    const root = dom.window.document.querySelector(sel);
    if (!root) { console.error('  ' + name + ': ' + sel + ' NOT FOUND in ' + page + '.html'); process.exitCode = 1; continue; }
    /* href="#" AFTER the clone, so the scrub above stays about identity */
    const html = launder(scrub(root, name, dom.window.document))
      .replace(/\shref="[^"]*"/g, ' href="#"');
    if (write(name, html)) moved++;
  }
  return moved;
}

function requireJsdom() {
  try { return require('jsdom'); }
  catch (e) {
    console.error('_extract --account needs jsdom:  npm i -D jsdom');
    process.exit(2);
  }
}

/* ---- the block half: a real browser, because the markup is a mount point -- */
async function blockHalf() {
  const { chromium } = require('playwright');
  const serve = require(path.join(__dirname, 'dtest', 'serve'));
  const { server, port } = await serve.start(MIRROR);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1200 } });
  console.log('\nblock pages (browser)');
  for (const [name, page, sel] of BLOCK_PAGES) {
    /* *** NOT waitUntil:'load'. *** The mirror is deliberately partial - it
     * saves same-origin assets and nothing else - so a page that references one
     * font from a CDN never fires `load` and the whole run dies on a 30s
     * timeout. It did, the first time this ran outside the machine it was
     * written on. What this actually needs is the block's own root to exist,
     * which is a thing it can wait for by name. */
    await p.goto('http://127.0.0.1:' + port + '/' + page + '.html', { waitUntil: 'domcontentloaded' });
    const there = await p.waitForSelector(sel, { timeout: 20000 }).then(() => true).catch(() => false);
    if (!there) {
      console.error('  ' + name + ': ' + sel + ' never appeared in ' + page + '.html' +
        ' - the block did not boot in this mirror. Specimen NOT rewritten.');
      process.exitCode = 1;
      continue;
    }
    await p.waitForTimeout(1500);
    const html = await p.evaluate(({ sel, name, src }) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      // eslint-disable-next-line no-new-func
      return new Function('return ' + src)()(root, name, document);
    }, { sel, name, src: scrub.toString() });
    if (!html) { console.error('  ' + name + ': ' + sel + ' NOT FOUND in ' + page + '.html'); process.exitCode = 1; continue; }
    write(name, launder(html));
  }
  await b.close(); server.close();
}

(async () => {
  accountHalf();
  if (!ONLY_ACCOUNT) await blockHalf();
  console.log('\n-> ' + SPECIMENS);
})();
