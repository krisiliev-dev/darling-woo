// The cart's loading row: what is in the first column, and what is not.
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
 await ctx.route('**/wp-json/wc/store/**', async (r)=>{ await new Promise(res=>setTimeout(res,9000)); r.continue(); });
 await p.addInitScript({content:`
   window.__c=${JSON.stringify(CSS)};
   document.addEventListener('DOMContentLoaded',function(){
     for(const l of document.querySelectorAll('link[rel=stylesheet]')){
       if(/\\/themes\\/darling\\/style\\.css|assets\\/darling\\.css|wc-blocks|packages-style|woocommerce|all-products|cart\\.css|store-notices|express-checkout|upe-|stripe/.test(l.href)) l.disabled=true; }
     var s=document.createElement('style'); s.textContent=window.__c; document.head.appendChild(s);
   });`});
 await p.goto('https://darlinghome.bg/cart/',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(700);
 const r = await p.evaluate(()=>{
   const clean=(el)=>{const c=el.cloneNode(true);
     for(const n of [c,...c.querySelectorAll('*')]){for(const a of [...n.attributes]) if(!/^(class|style)$/.test(a.name)) n.removeAttribute(a.name);}
     return c.outerHTML.replace(/></g,'>\n<');};
   const row = document.querySelector('.wc-block-cart-items__row, tr:has(.wc-block-components-skeleton__element)');
   const sk = document.querySelectorAll('.wc-block-components-skeleton__element');
   const first = row ? row.children[0] : null;
   return { rowHtml: row ? clean(row).slice(0,1400) : 'no row',
     skeletons: sk.length,
     firstCell: first ? {cls:first.getAttribute('class')||'', w:Math.round(first.getBoundingClientRect().width), h:Math.round(first.getBoundingClientRect().height), kids:first.children.length, html:clean(first).slice(0,300)} : null };
 });
 console.log(JSON.stringify(r,null,1).slice(0,2400));
 await b.close();})();