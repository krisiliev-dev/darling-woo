// B6, second look: the loading families are the CART's, not the checkout's.
// The checkout renders with its data already in the page - six seconds of held
// Store API produced no skeleton at all - so if these states exist anywhere on
// this store it is /cart/.
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const ROOT=path.dirname(__dirname);
const CSS=fs.readFileSync(path.join(ROOT,'theme/darling/darling.build.css'),'utf8');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1240,height:1000}});
 const p=await ctx.newPage();
 await p.goto('https://darlinghome.bg/shop/',{waitUntil:'domcontentloaded'});
 const prod=await p.locator('a[href*="/product/"]').first().getAttribute('href');
 await p.goto(prod,{waitUntil:'domcontentloaded'});
 const f=p.locator('form.cart').first(); if(await f.count()){await f.locator('button[type=submit],input[type=submit]').first().click();await p.waitForLoadState('domcontentloaded');}
 await ctx.route('**/wp-json/wc/store/**', async (r)=>{ await new Promise(res=>setTimeout(res,7000)); r.continue(); });
 await p.goto('https://darlinghome.bg/cart/',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(1000);
 const seen=await p.evaluate(()=>{
   const out={};
   for(const sel of ['.wc-block-cart--is-loading','.wc-block-components-skeleton',
     '.wc-block-components-skeleton__element','.wc-block-components-skeleton__element--static',
     '.wc-block-components-spinner','.wc-block-components-loading-mask',
     '.wc-block-cart__submit-button','.wc-block-components-button--loading']){
     const e=document.querySelector(sel);
     out[sel]= e ? {h:Math.round(e.getBoundingClientRect().height), anim:getComputedStyle(e).animationName, bg:getComputedStyle(e).backgroundColor} : null; }
   return {out, skeletons:document.querySelectorAll('.wc-block-components-skeleton__element').length,
           sample:(document.querySelector('.wc-block-components-skeleton__element')||{}).outerHTML||null};
 });
 console.log(JSON.stringify(seen,null,1).slice(0,1800));
 await p.evaluate(()=>{for(const l of document.querySelectorAll('link[rel=stylesheet]')){if(/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href))l.disabled=true;}});
 await p.addStyleTag({content:CSS});
 await p.waitForTimeout(400);
 await p.screenshot({path:'b6-cart-loading.png',clip:{x:0,y:0,width:1240,height:800}});
 console.log('shot b6-cart-loading.png');
 await b.close();})();