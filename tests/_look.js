const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale:'bg-BG', viewport:{width:1400,height:1000},
    httpCredentials:{username:'darling', password:process.env.STAGING_PASS} });
  const p = await ctx.newPage();
  await p.goto('https://staging.darlinghome.bg/', {waitUntil:'networkidle'});
  await p.waitForTimeout(3000);
  await p.screenshot({path:'tests/woo-home.png', fullPage:false});
  const info = await p.evaluate(() => ({
    title: document.title,
    h1: (document.querySelector('h1')||{}).innerText || null,
    navItems: [...document.querySelectorAll('nav a, header a')].map(a=>a.innerText.trim()).filter(Boolean).slice(0,12),
    products: document.querySelectorAll('.wc-block-grid__product, .woocommerce-loop-product__title, li.product').length,
    theme: (document.querySelector('link[href*="themes/"]')||{}).href || 'n/a',
    bodyText: (document.body.innerText||'').replace(/\n{2,}/g,'\n').slice(0,500),
  }));
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
