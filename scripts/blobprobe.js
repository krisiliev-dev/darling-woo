// The cherry blob beside "ÐŸÑ€Ð¾Ð´ÑŠÐ»Ð¶Ð¸ ÐºÑŠÐ¼ Ð¿Ð¾Ñ€ÑŠÑ‡ÐºÐ°Ñ‚Ð°" during the cart's load.
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
 await p.waitForTimeout(600);
 const hits = await p.evaluate(()=>{
   const out=[];
   for(const el of document.querySelectorAll('*')){
     const r=el.getBoundingClientRect();
     if(r.width<20||r.height<20) continue;
     const cs=getComputedStyle(el);
     const bg=cs.backgroundColor;
     if(!/212, 42, 60|176, 31, 48|158, 27, 50/.test(bg)) continue;   // cherry family
     out.push({tag:el.tagName.toLowerCase(), cls:(el.getAttribute('class')||'').slice(0,70),
       w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.left),y:Math.round(r.top),
       bg, radius:cs.borderRadius, disp:cs.display, pos:cs.position, txt:(el.textContent||'').trim().slice(0,30)});
     if(out.length>8) break;
   }
   return out;
 });
 console.log(JSON.stringify(hits,null,1).slice(0,1600));
 await b.close();})();