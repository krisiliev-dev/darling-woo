const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale:'bg-BG', viewport:{width:1400,height:900},
    httpCredentials:{username:'darling', password:process.env.STAGING_PASS} });
  const p = await ctx.newPage();
  await p.goto('https://staging.darlinghome.bg/', {waitUntil:'networkidle'});
  await p.waitForTimeout(3500);
  const info = await p.evaluate(() => ({
    headerPresent: !!document.querySelector('.darling-header'),
    navLinks: [...document.querySelectorAll('.darling-nav a')].map(a=>a.textContent.trim()),
    drawerPresent: !!document.getElementById('darling-menu-drawer'),
    cartBadge: !!document.querySelector('[data-darling-cart-count]'),
    ambientStars: document.querySelectorAll('.darling-ambient i').length,
    bow: !!document.querySelector('.darling-header__logo .dhv-bow'),
  }));
  console.log(JSON.stringify(info,null,1));
  await p.screenshot({path:'tests/woo-header.png'});
  // mobile
  await p.setViewportSize({width:390,height:844});
  await p.waitForTimeout(1200);
  const m = await p.evaluate(() => ({
    burgerVisible: getComputedStyle(document.querySelector('.darling-header__burger')).display,
    navVisible: getComputedStyle(document.querySelector('.darling-nav')).display,
  }));
  console.log('  mobile:', JSON.stringify(m));
  await p.click('.darling-header__burger').catch(()=>{});
  await p.waitForTimeout(900);
  console.log('  drawer open after tap:', await p.evaluate(()=>document.getElementById('darling-menu-drawer').open));
  await p.screenshot({path:'tests/woo-drawer.png'});
  await b.close();
})();
