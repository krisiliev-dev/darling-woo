const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale:'bg-BG', viewport:{width:1400,height:1000},
    httpCredentials:{username:'darling', password:process.env.STAGING_PASS} });
  const p = await ctx.newPage();
  for (const [label, url] of [['shop','https://staging.darlinghome.bg/shop/'],
                              ['category','https://staging.darlinghome.bg/product-category/za-kuhnyata/']]) {
    await p.goto(url, {waitUntil:'networkidle'});
    await p.waitForTimeout(2500);
    const i = await p.evaluate(() => ({
      title: (document.querySelector('.darling-archive__title')||{}).innerText,
      grid: !!document.querySelector('.darling-grid'),
      products: document.querySelectorAll('.darling-grid li').length,
      empty: !!document.querySelector('.darling-empty'),
      header: !!document.querySelector('.darling-header'),
      footer: !!document.querySelector('.darling-footer'),
      english: /\b(Cart|Checkout|My account|Add to cart|Shop)\b/.test(document.body.innerText),
    }));
    console.log('  ' + label + ': ' + JSON.stringify(i));
  }
  await p.screenshot({path:'tests/woo-category.png'});
  await b.close();
})();
