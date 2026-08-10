// The cart's loading spinner, measured. It rendered ~800px across in a capture.
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
 await p.waitForTimeout(1200);
 const woo = await p.evaluate(()=>{
   const e=document.querySelector('.wc-block-components-spinner');
   if(!e) return {present:false};
   const cs=getComputedStyle(e), af=getComputedStyle(e,'::after'), bf=getComputedStyle(e,'::before');
   const r=e.getBoundingClientRect();
   return {present:true, rect:[Math.round(r.width),Math.round(r.height)], pos:cs.position,
     w:cs.width,h:cs.height,font:cs.fontSize, parent:e.parentElement.className.slice(0,80),
     after:{content:af.content,w:af.width,h:af.height,border:af.borderTopWidth+' '+af.borderTopColor,radius:af.borderRadius,anim:af.animationName},
     before:{content:bf.content,w:bf.width,h:bf.height},
     html:e.outerHTML.slice(0,200)};
 });
 console.log('WITH WOO CSS: '+JSON.stringify(woo,null,1).slice(0,1200));
 await p.evaluate(()=>{for(const l of document.querySelectorAll('link[rel=stylesheet]')){if(/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href))l.disabled=true;}});
 await p.addStyleTag({content:CSS});
 await p.waitForTimeout(500);
 const ours = await p.evaluate(()=>{
   const e=document.querySelector('.wc-block-components-spinner');
   if(!e) return {present:false};
   const cs=getComputedStyle(e), af=getComputedStyle(e,'::after');
   const r=e.getBoundingClientRect();
   return {rect:[Math.round(r.width),Math.round(r.height)], pos:cs.position, w:cs.width, h:cs.height,
     after:{content:af.content,w:af.width,h:af.height,border:af.borderTopWidth+' '+af.borderTopColor,anim:af.animationName}};
 });
 console.log('DEQUEUED:     '+JSON.stringify(ours,null,1).slice(0,900));
 await b.close();})();