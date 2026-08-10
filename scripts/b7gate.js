// B7 / DECIDE, DO NOT PORT - and the decision needs to be made from whether a
// thing is REACHABLE, not from whether it has a class name.
//
// "Porting CSS for a surface nobody can reach is how a stylesheet gets to
// 166 KB" - CHECKOUT_PHASES. So this walks every surface a customer can get to
// and reports, per family, where it actually renders. Re-runnable after a
// plugin update, which is the point: reachability is a fact about the store's
// settings today, not a property of the class.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);

const FAMILIES = [
  // B7's own list
  '.wc-block-components-local-pickup-rates-control',
  '.wc-block-checkout__pickup-options',
  '.wc-block-components-address-autocomplete-suggestions',
  '.wc-block-components-address-autocomplete-suggestions-container',
  '.wc-block-components-password-strength',
  '.wc-block-components-checkbox-list',
  '.wc-block-mini-cart__drawer',
  '.wc-block-mini-cart',
  // the ones tonight's phases turned up
  '.wc-block-checkout-empty',
  '.wc-block-checkout-error',
  '.wc-block-checkout__shipping-method',
  '.wc-block-checkout__shipping-method-option',
  '.wc-block-components-radio-control__description-group',
  '.wc-block-components-payment-method-icons',
  '.wc-block-gateway-container',
  '.wc-block-card-elements',
  '.wc-block-checkout__no-payment-methods-notice',
  '.wc-block-components-product-badge',
  '.wc-block-components-totals-coupon-link',
  // the numbered-steps variant: 19 rules, and B1 left it undecided. It is a
  // block ATTRIBUTE, not a setting, so it can be switched on by editing the
  // page - which is exactly the kind of change that needs a gate watching it.
  '.wc-block-checkout__form--with-step-numbers',
  // and the two libraries C was about
  '.select2-container',
  '.pswp',
];

const SEEDED = ['/cart/', '/checkout/'];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1240, height: 1000 } });
  const p = await ctx.newPage();

  // seed once - the cart persists in this context
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }

  const pages = ['/', '/shop/', prod, '/cart/', '/checkout/', '/my-account/', '/my-account/lost-password/'];
  const seen = {};
  for (const fam of FAMILIES) seen[fam] = [];

  for (const u of pages) {
    const url = u.startsWith('http') ? u : 'https://darlinghome.bg' + u;
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForTimeout(4000);
    } catch (e) { console.log('  (' + u + ' did not settle)'); continue; }
    // on the checkout, also type an address so the shipping surfaces exist
    if (u === '/checkout/') {
      const t = async (sel, v) => { const el = p.locator(sel).first(); if (await el.count()) { await el.click(); await el.fill(v); await p.waitForTimeout(150); } };
      await t('#email', 'test@darlinghome.bg');
      await t('.wc-block-components-address-form__first_name input', '\u041c\u0430\u0440\u0438\u044f');
      await t('.wc-block-components-address-form__last_name input', '\u041f\u0435\u0442\u0440\u043e\u0432\u0430');
      await t('.wc-block-components-address-form__address_1 input', '\u0443\u043b. 1');
      await t('.wc-block-components-address-form__city input', '\u0421\u0432\u0438\u0449\u043e\u0432');
      await t('.wc-block-components-address-form__postcode input', '5250');
      await p.waitForTimeout(8000);
    }
    const found = await p.evaluate((fams) => {
      const out = {};
      for (const f2 of fams) {
        const e = document.querySelector(f2);
        out[f2] = e ? Math.round(e.getBoundingClientRect().height) : null;
      }
      return out;
    }, FAMILIES);
    let n = 0;
    for (const fam of FAMILIES) if (found[fam] !== null) { seen[fam].push(u + '(' + found[fam] + 'px)'); n++; }
    console.log(u + '  ->  ' + n + ' of ' + FAMILIES.length + ' present');
  }
  await b.close();

  let txt = 'B7 / REACHABILITY - measured across every surface a customer can reach\n\n';
  const gone = [], here = [];
  for (const fam of FAMILIES) (seen[fam].length ? here : gone).push(fam);
  txt += '=== PRESENT SOMEWHERE (' + here.length + ')\n';
  for (const fam of here) txt += '  ' + fam + '\n      ' + seen[fam].join('  ') + '\n';
  txt += '\n=== NOT REACHABLE ON ANY SURFACE (' + gone.length + ')\n';
  for (const fam of gone) txt += '  ' + fam + '\n';
  fs.writeFileSync(path.join(ROOT, 'b7-reach.txt'), txt, 'utf8');
  console.log('\npresent: ' + here.length + '   unreachable: ' + gone.length + '   -> b7-reach.txt');

  /* *** AND IT IS A GATE, BECAUSE A DECISION MADE AGAINST A MEASUREMENT ROTS
     WHEN THE MEASUREMENT CHANGES. *** B7 decided not to port twenty families
     because nothing a customer can reach renders them. Switch local pickup on
     in wp-admin, place a mini-cart block in a template, or enable address
     autocomplete, and one of them appears - unstyled, on a live shop, with
     nobody having changed a line of CSS. This fails the moment that happens. */
  const EXPECTED_PRESENT = ['.pswp'];       // PhotoSwipe is live on the product gallery - that is C's decision, not B7's
  const surprises = here.filter((f2) => EXPECTED_PRESENT.indexOf(f2) < 0);
  const vanished = EXPECTED_PRESENT.filter((f2) => here.indexOf(f2) < 0);
  if (surprises.length || vanished.length) {
    console.log('\nB7GATE FAIL');
    for (const f2 of surprises) console.log('  now reachable and unstyled: ' + f2 + '   ' + seen[f2].join(' '));
    for (const f2 of vanished) console.log('  expected present and gone: ' + f2);
    process.exit(1);
  }
  console.log('b7gate: every family B7 decided against is still unreachable.');
})();