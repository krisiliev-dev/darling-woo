const { chromium } = require('playwright');
const BASE='https://staging.darlinghome.bg';
(async () => {
  const b = await chromium.launch({headless:true});
  const ctx = await b.newContext({locale:'bg-BG', viewport:{width:1400,height:1000},
    httpCredentials:{username:'darling', password:process.env.STAGING_PASS}});
  const p = await ctx.newPage();
  const pages = [['home','/'],['shop','/shop/'],['category','/product-category/za-kuhnyata/'],
                 ['cart','/cart/'],['checkout','/checkout/'],['account','/my-account/'],['page','/za-nas/']];
  for (const [name,path] of pages) {
    await p.goto(BASE+path,{waitUntil:'networkidle'}).catch(()=>{});
    await p.waitForTimeout(1800);
    const i = await p.evaluate(() => {
      const t = document.body.innerText || '';
      const en = (t.match(/\b(Cart|Checkout|My account|Add to cart|Shop|Username|Password|Log in|Remember me|Register|Lost your password|Продукт|Coupon|Apply|Proceed|Return to)\b/g)||[]);
      return { header: !!document.querySelector('.darling-header'),
               footer: !!document.querySelector('.darling-footer'),
               english: [...new Set(en)].slice(0,6) };
    });
    console.log('  %s %s hdr:%s ftr:%s en:%s', name.padEnd(9), path.padEnd(30),
      i.header?'y':'N', i.footer?'y':'N', i.english.length? i.english.join(','):'-');
  }
  await b.close();
})();
