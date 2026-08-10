// What is the 800px circle on the loading cart? Find it by measurement: any
// element that is round and enormous, plus what its ::before/::after do.
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
 await p.goto('https://darlinghome.bg/cart/',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(1000);
 await p.evaluate(()=>{for(const l of document.querySelectorAll('link[rel=stylesheet]')){if(/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href))l.disabled=true;}});
 await p.addStyleTag({content:CSS});
 await p.waitForTimeout(600);
 const hits = await p.evaluate(()=>{
   const out=[];
   const round=(cs)=> /50%|9999|999px|circle/.test(cs.borderRadius) || parseFloat(cs.borderRadius)>=200;
   for(const el of document.querySelectorAll('*')){
     const r=el.getBoundingClientRect();
     if(r.width<200||r.height<200) continue;
     for(const [tag,cs] of [['self',getComputedStyle(el)],['::after',getComputedStyle(el,'::after')],['::before',getComputedStyle(el,'::before')]]){
       if(!round(cs)) continue;
       if(tag!=='self' && (cs.content==='none'||!cs.content)) continue;
       out.push({tag, cls:(el.getAttribute('class')||el.tagName).slice(0,70),
         w:Math.round(r.width), h:Math.round(r.height), radius:cs.borderRadius,
         border:cs.borderTopWidth+' '+cs.borderTopColor, anim:cs.animationName});
     }
     if(out.length>10) break;
   }
   return out;
 });
 console.log(JSON.stringify(hits,null,1).slice(0,2000));
 await b.close();})();