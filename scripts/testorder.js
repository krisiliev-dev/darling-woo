/* PLACE ONE TEST ORDER, SO THE POPULATED ACCOUNT PAGES CAN BE DESIGNED AGAINST
 * REAL MARKUP INSTEAD OF MY GUESS.
 *
 * The owner, asked directly and answering directly: "Feel free to place a test
 * order yourself." That authorisation is the only reason this file exists, and
 * it is narrower than it sounds. Read the next paragraph before running it.
 *
 * *** IT PAYS BY НАЛОЖЕН ПЛАТЕЖ AND TOUCHES NO CARD, EVER. ***
 * The shop offers two gateways, `cod` and `stripe`. This script selects cod and
 * IF COD IS NOT SELECTABLE IT STOPS. There is no branch that reaches Stripe, no
 * field here takes a card number, and there must never be one: entering payment
 * credentials is not something to automate, whoever asks. COD makes an order out
 * of a form submission and nothing else, which is exactly what is needed - the
 * point is the ORDER RECORD, not the payment.
 *
 * *** IT CREATES A REAL ORDER ON A REAL SHOP. *** Stock will decrement, Barsy
 * will see it, and staff may be emailed. That is unavoidable - a fake order
 * would produce fake markup and defeat the exercise. So it:
 *   - buys ONE unit of the CHEAPEST product it can find
 *   - writes ТЕСТ into the name and the address so nobody picks and packs it
 *   - prints the order number on stdout, loudly, so it can be cancelled
 * Cancelling is a wp-admin action and is deliberately NOT automated here.
 *
 *   node scripts/testorder.js            place it, print the number
 *   node scripts/testorder.js --dry      fill everything, stop BEFORE placing
 *
 * Run --dry first. It is the same code path up to the last click.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { readAcct } = require('./_acct');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const SITE = arg('--site', 'https://darlinghome.bg');
const DRY = process.argv.includes('--dry');
const SHOTS = path.resolve(arg('--shots', path.join(__dirname, 'mirror', 'order')));

/* Written into the order so a human reading it in wp-admin or in Barsy knows in
 * one glance that it is not a customer. */
const T = {
  first: 'ТЕСТ',
  last: 'Поръчка-дизайн',
  addr: 'ТЕСТОВА ПОРЪЧКА - да се откаже',
  city: 'София',
  post: '1000',
  phone: '0888000000',
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { user, pass } = readAcct();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 1400 } });
  const step = (s) => console.log('  ' + s);

  await page.goto(SITE + '/my-account/', { waitUntil: 'load' });
  await page.fill('#username', user);
  await page.fill('#password', pass);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}),
                     page.click('button[name="login"], .woocommerce-form-login__submit')]);
  if (!await page.evaluate(() => document.body.classList.contains('logged-in'))) {
    console.error('login did not take. Nothing done.'); await browser.close(); process.exit(1);
  }
  step('logged in');

  /* the cheapest thing in the catalogue, chosen rather than hard-coded */
  await page.goto(SITE + '/shop/', { waitUntil: 'load' });
  const pick = await page.evaluate(() => {
    const out = [];
    for (const li of document.querySelectorAll('li.product, .wc-block-grid__product, .wp-block-post')) {
      const a = li.querySelector('a[href*="/product/"]');
      const p = li.querySelector('.woocommerce-Price-amount, .wc-block-grid__product-price');
      if (!a || !p) continue;
      const n = parseFloat((p.textContent || '').replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(n)) out.push({ href: a.getAttribute('href'), price: n });
    }
    out.sort((x, y) => x.price - y.price);
    return out[0] || null;
  });
  if (!pick) { console.error('no product with a price on /shop/. Nothing done.'); await browser.close(); process.exit(1); }
  step('cheapest product ' + pick.price + ' -> ' + pick.href);

  /* *** EMPTY THE CART BEFORE ADDING, BECAUSE THE CART PERSISTS BETWEEN RUNS. ***
   * Two --dry runs and the totals came back at €27.00 for a €13.50 product: the
   * first run's unit was still in there and the second added another. A dry run
   * that changes state is not a dry run, and an order for two of something
   * nobody wants is a worse test artefact than an order for one. */
  await page.goto(SITE + '/cart/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  /* The block cart re-renders after every removal, so a handle taken before the
   * click is detached by the time it lands. Re-resolve at click time and treat a
   * detach as "it worked, look again" rather than as an error. */
  for (let i = 0; i < 12; i++) {
    const n = await page.evaluate(() =>
      document.querySelectorAll('.wc-block-cart-item__remove-link, a.remove').length);
    if (!n) break;
    await page.click('.wc-block-cart-item__remove-link, a.remove', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  const left = await page.evaluate(() =>
    document.querySelectorAll('.wc-block-cart-items__row, tr.woocommerce-cart-form__cart-item').length);
  step('cart emptied, ' + left + ' line(s) left');

  await page.goto(new URL(pick.href, SITE).href, { waitUntil: 'load' });
  const add = await page.$('button.single_add_to_cart_button:not(.disabled)');
  if (!add) { console.error('no enabled add-to-cart button. Nothing done.'); await browser.close(); process.exit(1); }
  await add.click();
  await page.waitForTimeout(2500);
  step('added 1 unit to the cart');

  await page.goto(SITE + '/checkout/', { waitUntil: 'load' });
  await page.waitForSelector('#shipping-first_name', { state: 'attached', timeout: 30000 });
  await page.waitForTimeout(1500);

  /* *** THE ADDRESS FORM IS ONLY THERE THE FIRST TIME. ***
   * Once the account has a saved address, WooCommerce collapses the checkout's
   * address form into a card with an Edit link and HIDES the inputs - they are
   * still in the DOM, still carrying their values, just not visible. The first
   * attempt at this waited for #shipping-first_name to be VISIBLE and timed out
   * 33 times against an input that already said ТЕСТ.
   * So: if the fields are hidden, the address is already saved and there is
   * nothing to type. Filling is for the first run only. */
  const formVisible = await page.isVisible('#shipping-first_name').catch(() => false);
  step(formVisible ? 'address form is open - filling it'
                   : 'address already saved on the account - nothing to fill');

  const set = async (sel, value) => {
    const el = await page.$(sel);
    if (!el) { step('MISSING ' + sel); return false; }
    await el.click();
    await el.fill('');
    await page.keyboard.type(value, { delay: 12 });   // the block checkout listens to key events
    await page.waitForTimeout(200);
    return true;
  };
  if (formVisible) {
    await set('#shipping-first_name', T.first);
    await set('#shipping-last_name', T.last);
    await set('#shipping-address_1', T.addr);
    await set('#shipping-city', T.city);
    await set('#shipping-postcode', T.post);
    await set('#shipping-phone', T.phone);
  }
  /* *** WAIT FOR THE SHIPPING RATES, DO NOT GUESS AT A TIMEOUT. ***
   * The first dry run filled everything, selected COD, and photographed a
   * checkout whose Настройки за доставка was still three grey skeleton bars and
   * whose Поръчай button was disabled. 2.5s was not enough for the courier rates
   * to come back, and a script that clicked anyway would have clicked a dead
   * button and reported something useless. Wait for the skeletons to GO. */
  /* *** WAIT FOR THE THING THAT ACTUALLY DECIDES, NOT FOR A CLASS NAME I GUESSED.
   * *** The first version waited on `.wc-block-components-shipping-rates-control`
   * and friends and reported "SHIPPING RATES DID NOT LOAD after 45s" on a
   * checkout where the rates had loaded perfectly well - the totals read
   * Доставка €1.64 BoxNow and the place-order button was enabled. The selector
   * was wrong; the page was fine. A readiness check that names markup is a
   * second thing that can be wrong.
   * So: wait for the TOTALS to carry a shipping line and the button to be
   * enabled. That is the state the click actually needs, expressed as itself. */
  const rated = await page.waitForFunction(() => {
    const b = document.querySelector('.wc-block-components-checkout-place-order-button');
    if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return false;
    const rows = [...document.querySelectorAll('.wc-block-components-totals-item')]
      .map((r) => (r.textContent || ''));
    return rows.length >= 2 && rows.some((x) => /\d/.test(x));
  }, { timeout: 60000 }).then(() => true).catch(() => false);
  step(rated ? 'shipping priced and the button is live' : 'CHECKOUT NEVER BECAME READY in 60s');
  if (!rated && !DRY) {
    console.error('\nRefusing to place an order on a checkout that never settled.');
    await page.screenshot({ path: path.join(SHOTS, '2-never-ready.png'), fullPage: true });
    await browser.close(); process.exit(2);
  }
  await page.waitForTimeout(1500);
  step(formVisible ? 'address filled, marked ТЕСТ' : 'using the saved ТЕСТ address');
  await page.screenshot({ path: path.join(SHOTS, '1-filled.png'), fullPage: true });

  /* *** COD OR NOTHING. *** */
  const cod = await page.$('#radio-control-wc-payment-method-options-cod');
  if (!cod) {
    console.error('\nНАЛОЖЕН ПЛАТЕЖ IS NOT ON THIS CHECKOUT. Stopping.\n' +
      'The only other gateway is Stripe and this script will not touch a card.\n' +
      'Nothing was ordered; there is one unit in the cart, remove it by hand.');
    await browser.close(); process.exit(2);
  }
  await cod.check({ force: true });
  await page.waitForTimeout(1200);
  const codOn = await page.evaluate(() => {
    const e = document.querySelector('#radio-control-wc-payment-method-options-cod');
    return !!e && e.checked;
  });
  if (!codOn) {
    console.error('\nCOD would not select. Stopping rather than falling through to Stripe.');
    await browser.close(); process.exit(2);
  }
  step('НАЛОЖЕН ПЛАТЕЖ selected (no card is touched by this script)');
  /* *** BoxNow "ДО АВТОМАТ" NEEDS A LOCKER PICKED, AND THE DEFAULT RATE IS
   * BoxNow. *** The first real attempt clicked Поръчай on a perfectly valid
   * checkout and got "Моля, изберете офис на куриера, за да продължите." The
   * delivery plugin renders a 3x3 matrix - BoxNow / Спиди / Еконт against
   * До автомат / До офис / До адрес - and two of those three rows require
   * choosing a specific office or locker from a map widget. Only ДО АДРЕС needs
   * nothing but the address that is already filled in.
   * So: pick a до-адрес rate. It costs more (€7.17 against €1.64) and that is
   * irrelevant for one test order that is going to be cancelled. */
  const rates = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.wc-block-components-radio-control__option, [class*="shipping"] label, [class*="rate"] label, [class*="shipping"] button')) {
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      const inp = el.querySelector('input[type="radio"]') || (el.control) || null;
      out.push({ txt: txt.slice(0, 60), id: (inp && inp.id) || el.id || '', tag: el.tagName });
    }
    return out;
  });
  console.log('  shipping options offered:');
  rates.forEach((r) => console.log('      [' + r.tag + '] ' + (r.id || '-') + '  ' + r.txt));

  const toAddress = await page.evaluate(() => {
    /* the row whose label says адрес, and any priced control inside it */
    const rows = [...document.querySelectorAll('tr, [class*="row"], [role="row"]')];
    for (const row of rows) {
      const label = (row.textContent || '');
      if (!/до адрес/i.test(label)) continue;
      const hit = row.querySelector('input[type="radio"], button, label');
      if (hit) { hit.click(); return (row.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80); }
    }
    /* fall back: any control whose own text mentions адрес and a price */
    for (const el of document.querySelectorAll('label, button, .wc-block-components-radio-control__option')) {
      const txt = (el.textContent || '');
      if (/адрес/i.test(txt) && /[\d,.]+/.test(txt)) { el.click(); return txt.replace(/\s+/g, ' ').trim().slice(0, 80); }
    }
    return null;
  });
  step(toAddress ? 'chose a до-адрес rate: ' + toAddress
                 : 'COULD NOT FIND a до-адрес rate - the default may need an office');
  await page.waitForTimeout(4000);


  const total = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.wc-block-components-totals-item')]
      .map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim());
    return rows.length ? rows.join('  |  ') : '(unknown)';
  });
  step('totals: ' + total);

  /* *** AND THE BUTTON HAS TO BE ALIVE BEFORE IT IS CLICKED. *** */
  const ready = await page.evaluate(() => {
    const b = document.querySelector('.wc-block-components-checkout-place-order-button');
    if (!b) return 'missing';
    if (b.disabled || b.getAttribute('aria-disabled') === 'true') return 'disabled';
    return 'ready';
  });
  step('place-order button: ' + ready);
  if (ready !== 'ready' && !DRY) {
    console.error('\nThe place-order button is ' + ready + '. NOT clicking it.');
    await page.screenshot({ path: path.join(SHOTS, '2-not-ready.png'), fullPage: true });
    await browser.close(); process.exit(2);
  }

  if (DRY) {
    await page.screenshot({ path: path.join(SHOTS, '2-dry-ready.png'), fullPage: true });
    console.log('\n--dry: everything is filled and COD is chosen. NOT placing the order.');
    await browser.close(); return;
  }

  const blocked = await page.evaluate(() => {
    const n = [...document.querySelectorAll('.wc-block-components-notice-banner, [role="alert"]')]
      .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    return n.find((x) => /офис|локер|автомат|изберете/i.test(x)) || null;
  });
  if (blocked) {
    console.error('\nCHECKOUT IS STILL ASKING FOR SOMETHING: ' + blocked + '\nNot clicking.');
    await page.screenshot({ path: path.join(SHOTS, '2-blocked.png'), fullPage: true });
    await browser.close(); process.exit(2);
  }

  const place = await page.$('.wc-block-components-checkout-place-order-button');
  if (!place) { console.error('no place-order button found. Nothing ordered.'); await browser.close(); process.exit(1); }
  await place.click();
  await page.waitForURL(/order-received/, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const url = page.url();
  const num = await page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/(\d{3,})/);
    return m ? m[1] : null;
  });
  if (!/order-received/.test(url)) {
    console.error('\nDID NOT REACH order-received. Current URL: ' + url +
      '\nCheck wp-admin before running this again - there may be a pending order.');
    await page.screenshot({ path: path.join(SHOTS, '3-failed.png'), fullPage: true });
    await browser.close(); process.exit(1);
  }
  await page.screenshot({ path: path.join(SHOTS, '3-received.png'), fullPage: true });
  fs.writeFileSync(path.join(SHOTS, 'order-received.html'),
    (await page.evaluate(() => document.documentElement.outerHTML))
      .replace(/(_wpnonce=)[a-f0-9]+/gi, '$1REDACTED'));

  console.log('\n*** ORDER PLACED ***');
  console.log('    url    ' + url);
  console.log('    number ' + (num || '(read it off the page)'));
  console.log('    total  ' + total);
  console.log('    CANCEL IT IN wp-admin. Stock is decremented and Barsy has seen it.');
  await browser.close();
})();
