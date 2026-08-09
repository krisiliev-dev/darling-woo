const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1100 } });
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('.wc-block-components-text-input').first().waitFor({ timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => {
    const form = document.querySelector('.wc-block-checkout__form');
    const cs = getComputedStyle(form);
    return { formDisplay: cs.display, formTag: form.tagName,
      children: [...form.children].map((c) => ({
        tag: c.tagName, cls: (c.getAttribute('class') || '').slice(0, 110),
        h: Math.round(c.getBoundingClientRect().height) })) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();