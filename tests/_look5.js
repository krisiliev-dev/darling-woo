const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale:'bg-BG', viewport:{width:1400,height:1100},
    httpCredentials:{username:'darling', password:process.env.STAGING_PASS} });
  const p = await ctx.newPage();
  await p.goto('https://staging.darlinghome.bg/?p=11', {waitUntil:'networkidle'}).catch(()=>{});
  await p.waitForTimeout(1500);
  await p.goto('https://staging.darlinghome.bg/shop/', {waitUntil:'networkidle'});
  await p.waitForTimeout(2500);
  const link = await p.evaluate(()=> {
    const a=[...document.querySelectorAll('a')].find(a=>/\/product\//.test(a.href));
    return a? a.href : null;
  });
  if(!link){ console.log('  no product link found on /shop/'); await b.close(); return; }
  await p.goto(link, {waitUntil:'networkidle'});
  await p.waitForTimeout(3000);
  const info = await p.evaluate(() => ({
    url: location.pathname.slice(0,40),
    h1count: document.querySelectorAll('h1').length,
    h1: (document.querySelector('h1')||{}).innerText,
    price: (document.querySelector('.darling-product__price')||{}).innerText,
    addToCart: !!document.querySelector('.darling-product__atc'),
    trustRow: document.querySelectorAll('.darling-trust li').length,
    breadcrumbs: !!document.querySelector('.darling-crumbs'),
    header: !!document.querySelector('.darling-header'),
    footer: !!document.querySelector('.darling-footer'),
    bgnDual: /лв\./.test(document.body.innerText),
  }));
  console.log(JSON.stringify(info,null,1));
  await p.screenshot({path:'tests/woo-product.png'});
  await b.close();
})();
