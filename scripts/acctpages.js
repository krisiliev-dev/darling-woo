/* THE MY-ACCOUNT SUB-PAGES — markup only, for the gallery.
 *
 * capture-mirror.js saves nine pages and every asset each one serves, because
 * the gates it feeds walk the CSSOM and need the sheets in their original order.
 * This is a much smaller thing: the profile section of the gallery needs the
 * MARKUP of the account sub-pages and nothing else, because a specimen is
 * rendered against darling.build.css, not against whatever the live site was
 * serving that day. So no assets, no rewriting, no tree - six HTML files.
 *
 *   node scripts/acctpages.js                -> scripts/mirror/account/<name>.html
 *   node scripts/acctpages.js --out <dir>
 *
 * *** WHAT IT IS ALLOWED TO DO. *** The same authorisation as capture-mirror,
 * minus the half of it that touches the shop: log in as the parity customer and
 * GET six pages. It adds nothing to a cart, submits no form but the login, and
 * never requests /my-account/customer-logout/ - that link is in the nav and
 * following it would end the session mid-capture.
 *
 * Credentials come from _acct.js and are passed straight to page.fill(). The
 * first draft of this file carried its OWN copy of that parser and failed on
 * its first run: the copy knew json, key=value and two bare lines, and the real
 * file is a single line holding the secret alone. Two implementations of a
 * format nobody documents is two chances to be wrong, so there is now one.
 *
 * The saved HTML has its nonces stripped, for the same reason capture-mirror
 * strips them: a specimen is a design artefact and has no business carrying a
 * session token into a repository.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { readAcct } = require('./_acct');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(__dirname, 'mirror', 'account')));
const SITE = arg('--site', 'https://darlinghome.bg');

/* dashboard is captured again here so all six live in one directory and the
 * gallery generator has one place to read from. customer-logout is deliberately
 * absent. */
const PAGES = [
  ['dashboard', '/my-account/'],
  ['orders', '/my-account/orders/'],
  ['addresses', '/my-account/edit-address/'],
  ['address-billing', '/my-account/edit-address/billing/'],
  ['payment-methods', '/my-account/payment-methods/'],
  ['edit-account', '/my-account/edit-account/'],
];

/* The single order's own page. Its id is not knowable in advance, so it is read
   off the orders list rather than hard-coded - and if there are no orders yet,
   it is skipped with a line rather than saved as a 404 under a real name. */
const ORDER_PAGE = ['order-view', /\/my-account\/view-order\/(\d+)\//];

/* nonces are per-session and must not land in the repo */
const scrub = (h) => h
  .replace(/(_wpnonce=)[a-f0-9]+/gi, '$1REDACTED')
  .replace(/(name="[^"]*nonce[^"]*"\s+value=")[^"]*"/gi, '$1REDACTED"')
  .replace(/("nonce":\s*")[^"]*"/gi, '$1REDACTED"');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { user, pass } = readAcct();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 1400 } });

  await page.goto(SITE + '/my-account/', { waitUntil: 'load' });
  await page.fill('#username', user);
  await page.fill('#password', pass);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}),
                     page.click('button[name="login"], .woocommerce-form-login__submit')]);
  const loggedIn = await page.evaluate(() => document.body.classList.contains('logged-in'));
  if (!loggedIn) {
    console.error('LOGIN DID NOT TAKE. Every page below would be the login form. Not writing anything.');
    await browser.close();
    process.exit(1);
  }
  console.log('logged in\n');

  let bad = 0;
  for (const [name, url] of PAGES) {
    const res = await page.goto(SITE + url, { waitUntil: 'load' });
    const status = res ? res.status() : 0;
    await page.waitForTimeout(400);
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    /* the tripwire: a redirect back to the login form is a 200, and saving it
     * under the name "orders" is exactly the silent-nothing failure srgate had */
    const isLogin = /woocommerce-form-login|id="username"/.test(html);
    const main = (html.match(/<main[\s\S]*?<\/main>/) || [''])[0];
    if (status !== 200 || isLogin || !main) { bad++; }
    fs.writeFileSync(path.join(OUT, name + '.html'), scrub(html));
    console.log('  ' + name.padEnd(17) + String(status).padEnd(4) +
      String(main.length).padStart(6) + ' bytes of <main>' +
      (isLogin ? '   <- THIS IS THE LOGIN FORM, NOT THE PAGE' : '') +
      (main ? '' : '   <- NO <main> AT ALL'));
  }

  /* -- the order page, if there is an order ------------------------------- */
  await page.goto(SITE + '/my-account/orders/', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const orderHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href*="view-order"]')][0];
    return a ? a.getAttribute('href') : null;
  });
  if (!orderHref) {
    console.log('  order-view        -- no orders on this account, skipped');
  } else {
    const res = await page.goto(new URL(orderHref, SITE).href, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    const main = (html.match(/<main[\s\S]*?<\/main>/) || [''])[0];
    fs.writeFileSync(path.join(OUT, 'order-view.html'), scrub(html));
    console.log('  order-view       ' + String(res ? res.status() : 0).padEnd(4) +
      String(main.length).padStart(6) + ' bytes of <main>   ' + orderHref);
  }

  await browser.close();
  if (bad) { console.error('\n' + bad + ' of ' + PAGES.length + ' pages are not what they claim to be.'); process.exit(1); }
  console.log('\nok -> ' + OUT);
})();
