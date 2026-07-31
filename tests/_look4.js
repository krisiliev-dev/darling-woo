const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ locale:'bg-BG', viewport:{width:1400,height:1100},
    httpCredentials:{username:'darling', password:process.env.STAGING_PASS} });
  const p = await ctx.newPage();
  await p.goto('https://staging.darlinghome.bg/', {waitUntil:'networkidle'});
  await p.waitForTimeout(3500);
  const info = await p.evaluate(() => ({
    footer: !!document.querySelector('.darling-footer'),
    footFlair: !!document.querySelector('.darling-foot-flair .dff-bow'),
    footStars: document.querySelectorAll('.darling-foot-flair .dff-s').length,
    footCols: document.querySelectorAll('.darling-footer__col').length,
    designedWith: /Designed with/i.test(document.body.innerText),
    twentyTwentyFive: /Twenty Twenty-Five/i.test(document.body.innerText),
    eurRate: /1\.95583/.test(document.body.innerText),
  }));
  console.log(JSON.stringify(info, null, 1));
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForTimeout(1200);
  await p.screenshot({path:'tests/woo-footer.png'});
  await b.close();
})();
