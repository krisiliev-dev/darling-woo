const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const UI = fs.readFileSync(path.join(ROOT, 'theme/darling/assets/darling-ui.js'), 'utf8');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1200 } });
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('.wc-block-components-text-input').first().waitFor({ timeout: 25000 });
  await p.waitForTimeout(3500);
  await p.evaluate(() => { for (const l of document.querySelectorAll('link[rel=stylesheet]')) {
    if (/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled = true; } });
  await p.addStyleTag({ content: CSS });
  await p.addScriptTag({ content: UI });
  await p.waitForTimeout(2500);
  const look = () => p.evaluate(() => {
    const ex = document.querySelector('.wc-block-components-express-payment');
    if (!ex) return { present: false };
    const row = ex.querySelector('.wc-block-components-express-payment__event-buttons');
    return { present: true, attr: ex.getAttribute('data-d-express'),
      hasRow: !!row, rowH: row ? Math.round(row.getBoundingClientRect().height) : null,
      rowKids: row ? row.children.length : null,
      exH: Math.round(ex.getBoundingClientRect().height),
      inner: ex.innerHTML.replace(/\s+/g, ' ').slice(0, 300) };
  });
  console.log('before typing: ' + JSON.stringify(await look()));
  const type = async (sel, v) => { const el = p.locator(sel).first(); if (await el.count()) { await el.click(); await el.fill(v); await p.waitForTimeout(200); } };
  await type('#email', 'test@darlinghome.bg');
  await type('.wc-block-components-address-form__first_name input', '\u041c\u0430\u0440\u0438\u044f');
  await type('.wc-block-components-address-form__last_name input', '\u041f\u0435\u0442\u0440\u043e\u0432\u0430');
  await type('.wc-block-components-address-form__address_1 input', '\u0443\u043b. 1');
  await type('.wc-block-components-address-form__city input', '\u0421\u0432\u0438\u0449\u043e\u0432');
  await type('.wc-block-components-address-form__postcode input', '5250');
  await p.locator('h2').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(9000);
  console.log('after typing : ' + JSON.stringify(await look()));
  await b.close();
})();