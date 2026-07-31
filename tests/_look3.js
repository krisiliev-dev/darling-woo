const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale:'bg-BG', viewport:{width:1400,height:1000},
    httpCredentials:{username:'darling', password:process.env.STAGING_PASS} });
  const p = await ctx.newPage();
  await p.goto('https://staging.darlinghome.bg/', {waitUntil:'networkidle'});
  await p.waitForTimeout(3500);
  const info = await p.evaluate(() => ({
    hero: !!document.querySelector('.darling-hero'),
    heroTitle: (document.querySelector('.darling-hero__title')||{}).textContent,
    heroVisual: !!document.querySelector('.darling-hero-visual .dhv-bow'),
    heroStars: document.querySelectorAll('.darling-hero-visual .dhv-s').length,
    categories: document.querySelectorAll('.darling-cats a').length,
    season: !!document.querySelector('.darling-season'),
    productGrid: !!document.querySelector('.darling-grid'),
    stillBlogIndex: /Sorry, but nothing was found/i.test(document.body.innerText),
  }));
  console.log(JSON.stringify(info, null, 1));
  await p.screenshot({path:'tests/woo-front.png', fullPage:false});
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(1200);
  console.log('  mobile hero visual hidden:', await p.evaluate(()=>{
    const v=document.querySelector('.darling-hero .darling-hero-visual');
    return v ? getComputedStyle(v).display : 'absent';
  }));
  await p.screenshot({path:'tests/woo-front-mobile.png', fullPage:false});
  await b.close();
})();
