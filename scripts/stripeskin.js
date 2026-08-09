// Does our appearance object actually reach INSIDE Stripe's iframe?
//
// The plugin reads wc_stripe_upe_params.blocksAppearance and, when it is
// absent, generates one by sampling the page's own inputs with
// getComputedStyle. It is absent today, which is why the card fields look like
// a guess at our theme rather than our theme.
//
// This proves the object works BEFORE any PHP is written or deployed: set the
// key on the global at document-start, let the plugin mount normally, and
// photograph the result. If the iframe changes, the wiring is the only thing
// left to do.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const APP = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/stripe-appearance.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');
const INJECT = process.env.PLAIN ? '' : APP + `
;(function () {
  var apply = function () {
    if (typeof window.wc_stripe_upe_params === 'object' && window.wc_stripe_upe_params) {
      window.wc_stripe_upe_params.blocksAppearance = window.darlingStripeAppearance;
      window.wc_stripe_upe_params.appearance = window.darlingStripeAppearance;
    }
  };
  apply();
  var n = 0, t = setInterval(function () { apply(); if (++n > 60) clearInterval(t); }, 100);
})();`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1200 } });
  if (INJECT) await p.addInitScript({ content: INJECT });
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(4500);
  console.log('blocksAppearance present: ' + await p.evaluate(() =>
    !!(window.wc_stripe_upe_params && window.wc_stripe_upe_params.blocksAppearance)));

  await p.evaluate(() => { for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
    if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true; } });
  await p.addStyleTag({ content: CSS });
  await p.addScriptTag({ content: UI });
  await p.waitForTimeout(800);

  const radios = await p.locator('.wc-block-components-radio-control__input').all();
  if (radios.length > 1) { await radios[1].click({ force: true }); await p.waitForTimeout(5000); }
  const region = p.locator('.wc-block-checkout__payment-method').first();
  await region.screenshot({ path: process.env.OUT || 'b2-stripe.png' });
  console.log('shot ' + (process.env.OUT || 'b2-stripe.png'));
  await b.close();
})();