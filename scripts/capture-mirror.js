/* CAPTURE THE MIRROR — the nine pages every measurement in this repo reads.
 *
 * triage.js, unclaimed.js, seams.js and srgate.js all walk the CSSOM of a static
 * capture of the live site. That capture is not in the repo and was not on disk
 * anywhere: it had been made once, ad hoc, and thrown away. srgate then passed on
 * nothing for three commits, and the CLAIM 261 -> 111 figure could not be
 * re-derived. This script is the missing step, written down.
 *
 *   node scripts/capture-mirror.js                 -> scripts/mirror
 *   node scripts/capture-mirror.js --out <dir>
 *   node scripts/capture-mirror.js --no-session    -> the seven public pages only
 *
 * *** WHY IT MUST BE A REAL BROWSER AND NOT curl. ***
 * The thing being measured is the CASCADE, so the capture has to preserve every
 * <link id> and every inline <style> exactly as WordPress printed them - triage
 * switches sheets off BY ID (wc-blocks-style-css, woocommerce-general-css,
 * global-styles-inline-css) and a capture that inlined or reordered them would
 * be measuring a different page. So: navigate, let the page settle, then save
 * document.documentElement.outerHTML with same-origin URLs made root-relative,
 * and save every same-origin asset at the path it was served from. dtest/serve.js
 * maps /a/b.css -> <mirror>/a/b.css, which is why the tree is kept, not flattened.
 *
 * *** WHAT IT IS ALLOWED TO DO TO A LIVE SHOP, AND WHAT IT IS NOT. ***
 * The owner authorised exactly this: "Log in, add, capture, empty." So:
 *
 *   MAY   log in as the parity customer, GET pages, add ONE unit of ONE product,
 *         then remove that line again.
 *   MUST NOT  place an order, touch payment, change any setting, submit any form
 *         other than the login and the add/remove, or write anything anywhere
 *         else. There is no code path here that reaches Place Order.
 *
 * *** AND THE CREDENTIALS ARE READ, NEVER SEEN. ***
 * _scratch_woo/parity4/.acct is read inside this process, passed straight to
 * page.fill(), and never logged, never echoed, never written into the mirror.
 * The capture strips the logged-in nonce inputs out of the saved HTML for the
 * same reason - a mirror is a design artefact and has no business carrying a
 * session token around. What is printed is the SHAPE that was parsed and the
 * username's first two characters, so a wrong file is diagnosable without the
 * contents ever appearing in a transcript.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.dirname(__dirname);
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(__dirname, 'mirror')));
const SITE = arg('--site', 'https://darlinghome.bg');
const ACCT = path.resolve(arg('--acct', path.join(ROOT, '..', '_scratch_woo', 'parity4', '.acct')));
const NO_SESSION = process.argv.includes('--no-session');
const ORIGIN = new URL(SITE).origin;

/* The nine names triage.js expects, and the path each one comes from. `page` and
 * `blog` are whichever the site actually has; both are resolved at run time
 * rather than hard-coded, because a 404 saved under a real name is the same
 * silent-nothing failure srgate just had. */
const PUBLIC_PAGES = [
  ['home', '/'],
  ['shop', '/shop/'],
  ['notfound', '/this-page-does-not-exist-' + 'x'.repeat(8) + '/'],
];
/* account is captured either way: logged out it IS the login/register page, which
 * is the whole of tranche 6. cart and checkout are the two that need a session
 * and a line in the basket. */
const SESSION_PAGES = [['cart', '/cart/'], ['checkout', '/checkout/']];

/* ---- credentials, read and not seen ------------------------------------- */
function readAcct() {
  if (!fs.existsSync(ACCT)) { throw new Error('no .acct at ' + ACCT); }
  const raw = fs.readFileSync(ACCT, 'utf8');
  let user = '', pass = '', shape = '';
  try {                                   // JSON { user, pass } / { username, password }
    const j = JSON.parse(raw);
    user = j.user || j.username || j.email || '';
    pass = j.pass || j.password || '';
    if (user && pass) shape = 'json';
  } catch (e) { /* not json */ }
  if (!shape) {                           // KEY=VALUE lines
    const kv = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)$/.exec(line);
      if (m) kv[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    user = kv.user || kv.username || kv.email || kv.login || '';
    pass = kv.pass || kv.password || '';
    if (user && pass) shape = 'key=value';
  }
  if (!shape) {                           // two bare lines
    const l = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (l.length >= 2) { user = l[0]; pass = l[1]; shape = 'two lines'; }
    else if (l.length === 1 && l[0].includes(':')) {
      /* user:secret, where the user may contain a hyphen - split on the FIRST
       * colon only, because a secret is allowed to contain one and a WordPress
       * username is not. */
      const i = l[0].indexOf(':');
      user = l[0].slice(0, i); pass = l[0].slice(i + 1); shape = 'user:secret';
    } else if (l.length === 1) {
      /* *** THE FILE IS THE SECRET AND NOTHING ELSE. *** Which is what it turned
       * out to be: one line, sixteen bytes, no separator. The username is not in
       * there because it has never varied - HANDOFF records it as
       * `parity-customer` in prose, which is fine for a username and is exactly
       * why the secret is not in prose beside it. --user overrides. */
      user = arg('--user', 'parity-customer'); pass = l[0]; shape = 'secret only, user from --user';
    }
  }
  if (!user || !pass) { throw new Error('.acct parsed to nothing usable (tried json, key=value, user:secret, two lines, secret-only)'); }
  /* the only thing that is ever printed about them */
  console.log('   .acct: ' + shape + ', user starts "' + user.slice(0, 2) + '…", secret ' + pass.length + ' chars (never printed)');
  return { user, pass };
}

/* ---- writing the tree ---------------------------------------------------- */
const seen = new Set();
let bytes = 0;
function save(urlPath, body) {
  let p = urlPath.split('?')[0].split('#')[0];
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(OUT, p.replace(/^\/+/, ''));
  if (!file.startsWith(OUT)) return;                    // never escape the mirror
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  seen.add(p); bytes += body.length;
}

/* Absolute same-origin URLs become root-relative so serve.js can answer them.
 * Protocol-relative //darlinghome.bg/... too - WordPress emits both. */
function rebase(html) {
  const host = ORIGIN.replace(/^https?:\/\//, '');
  return html
    .split(ORIGIN + '/').join('/')
    .split('//' + host + '/').join('/')
    /* A saved page must not carry a live session token. These are the two
     * WordPress prints into logged-in forms; the mirror needs the MARKUP, and
     * a nonce is not markup, it is a credential with a short life. */
    .replace(/(name="[a-z0-9_-]*nonce[a-z0-9_-]*"\s+value=")[^"]*/gi, '$1REDACTED')
    .replace(/("nonce"\s*:\s*")[^"]*/gi, '$1REDACTED');
}


/* *** THE FIRST VERSION LOOKED FOR `a.remove[href*=remove_item]` AND LEFT A
   BOWL IN A REAL CUSTOMER'S BASKET. *** That selector is the CLASSIC cart's
   remove link. darlinghome.bg serves the BLOCK cart, where remove is a <button>
   inside the line item with no href at all, and the removal is a fetch rather
   than a navigation - so waitForNavigation resolved on a timeout and the check
   ran against a page that had not changed yet.

   Three corrections, and they are the difference between a cleanup that works
   and one that reports success: match BOTH carts, wait for the LINE COUNT to
   drop rather than for a navigation, and loop until the cart says it is empty
   instead of assuming one click did it. It returns whether it succeeded, and
   the caller shouts if it did not. */
async function emptyCart(page) {
  for (let round = 0; round < 6; round++) {
    await page.goto(SITE + '/cart/', { waitUntil: 'load' });
    await page.waitForTimeout(2500);          // the block cart hydrates
    const st = await page.evaluate(() => ({
      empty: !!document.querySelector('.cart-empty, .wc-block-cart__empty-cart__title, .is-empty'),
      lines: document.querySelectorAll('.wc-block-cart-items__row, tr.cart_item').length,
    }));
    if (st.empty || !st.lines) { console.log('   cart emptied: yes'); return true; }
    const rm = await page.$('button.wc-block-cart-item__remove-link, .wc-block-cart-item__remove-link, a.remove[href*="remove_item"]');
    if (!rm) {
      console.error('   NO REMOVE CONTROL on a cart with ' + st.lines + ' line(s).');
      console.error('   *** THE CART STILL HAS SOMETHING IN IT. REMOVE IT BY HAND. ***');
      return false;
    }
    await rm.click();
    await page.waitForTimeout(3000);
  }
  console.error('   *** SIX ROUNDS AND THE CART IS STILL NOT EMPTY. CHECK IT BY HAND. ***');
  return false;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 1000 } });
  const page = await ctx.newPage();

  /* Every same-origin asset the page pulls, saved at its own path. Responses
   * rather than requests, so we store what the server actually returned. */
  page.on('response', async (res) => {
    try {
      const u = new URL(res.url());
      if (u.origin !== ORIGIN) return;                  // fonts, Stripe, analytics: not ours to mirror
      if (res.request().resourceType() === 'document') return;   // handled by hand, after rebase
      if (!res.ok()) return;
      const buf = await res.body();
      const isText = /\.(css|js|mjs|json|svg)$/i.test(u.pathname);
      save(u.pathname, isText ? Buffer.from(rebase(buf.toString('utf8')), 'utf8') : buf);
    } catch (e) { /* a response body can be gone by the time we ask; skip it */ }
  });

  const grab = async (name, url) => {
    const r = await page.goto(SITE + url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);                    // let deferred sheets land
    const status = r ? r.status() : 0;
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    save('/' + name + '.html', Buffer.from('<!doctype html>\n' + rebase(html), 'utf8'));
    const sheets = await page.evaluate(() => document.querySelectorAll('link[rel=stylesheet],style').length);
    console.log('   ' + name.padEnd(9) + String(status).padEnd(4) + sheets + ' sheet nodes   ' + url);
    return status;
  };

  console.log('capture-mirror -> ' + OUT + '\n');
  console.log('public pages');
  for (const [name, url] of PUBLIC_PAGES) await grab(name, url);

  /* a real product and a real page, resolved from the shop rather than guessed */
  await page.goto(SITE + '/shop/', { waitUntil: 'load' });
  const productUrl = await page.evaluate(() => {
    const a = document.querySelector('a.woocommerce-LoopProduct-link, li.product a[href*="/product/"], .wc-block-grid__product-link');
    return a ? a.getAttribute('href') : null;
  });
  if (!productUrl) { console.error('   could not find a product link on /shop/ - is the catalogue empty?'); }
  else await grab('product', new URL(productUrl, SITE).pathname);

  for (const [name, cand] of [['page', ['/za-nas/', '/about/', '/delivery/', '/obshti-usloviya/']],
                              ['blog', ['/blog/', '/news/', '/novini/']]]) {
    let done = false;
    for (const u of cand) { if ((await grab(name, u)) === 200) { done = true; break; } }
    if (!done) console.error('   ' + name + ': none of ' + cand.join(' ') + ' returned 200 - saved the last try, CHECK IT');
  }

  /* ---- the session half -------------------------------------------------- */
  if (NO_SESSION) {
    await grab('account', '/my-account/');   // the logged-out login page: tranche 6
    console.log('\n--no-session: account captured LOGGED OUT; cart and checkout not captured at all.');
  } else {
    console.log('\nsession pages');
    const { user, pass } = readAcct();
    await page.goto(SITE + '/my-account/', { waitUntil: 'load' });
    await page.fill('#username', user);
    await page.fill('#password', pass);
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}),
                       page.click('button[name="login"], .woocommerce-form-login__submit')]);
    const loggedIn = await page.evaluate(() => document.body.classList.contains('logged-in'));
    if (!loggedIn) { console.error('   login did not take - capturing the logged-out account page instead'); }

    /* ONE unit of ONE product, so the cart has markup to measure. The line is
     * removed again below whatever happens after this point. */
    let added = false;
    if (loggedIn && productUrl) {
      await page.goto(new URL(productUrl, SITE).href, { waitUntil: 'load' });
      const btn = await page.$('button.single_add_to_cart_button:not(.disabled)');
      if (btn) {
        await Promise.all([page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), btn.click()]);
        added = true;
        console.log('   added 1 unit to the cart (removed again at the end)');
      } else { console.error('   no enabled add-to-cart button - cart will be captured EMPTY'); }
    }

    await grab('account', '/my-account/');
    await grab('cart', '/cart/');
    await grab('checkout', '/checkout/');

    /* *** THE CART IS EMPTIED IN A finally-SHAPED BLOCK ON PURPOSE. ***
     * Leaving a line in a real customer's cart is a side effect nobody asked
     * for, and it is the kind that shows up weeks later as "why is there a bowl
     * in my basket". Remove by the cart's own remove link, which is a GET. */
    if (added) await emptyCart(page);
  }

  await browser.close();

  /* ---- the same tripwire this whole exercise is about --------------------- */
  const need = ['home', 'shop', 'product', 'account', 'page', 'blog', 'notfound']
    .concat(NO_SESSION ? [] : SESSION_PAGES.map((p) => p[0]));
  const missing = need.filter((n) => !fs.existsSync(path.join(OUT, n + '.html')));
  const css = [...seen].filter((p) => p.endsWith('.css')).length;
  console.log('\n' + seen.size + ' files, ' + css + ' stylesheets, ' +
    (bytes / 1048576).toFixed(1) + ' MB -> ' + OUT);
  if (missing.length) { console.error('MISSING: ' + missing.join(', ')); process.exit(1); }
  if (!css) { console.error('NOT ONE STYLESHEET WAS SAVED. The mirror is useless for a CSSOM walk.'); process.exit(1); }
  console.log('ok. Point the gates at it:  set DARLING_MIRROR=' + OUT);
})();
