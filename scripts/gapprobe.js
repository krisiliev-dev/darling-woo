// Where is the gap? Measure the vertical run of the phone checkout: every
// top-level item, its box, and theç©º space between it and the next one.
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const ROOT=path.dirname(__dirname);
const CSS=fs.readFileSync(path.join(ROOT,'theme/darling/darling.build.css'),'utf8');
const UI=fs.readFileSync(path.join(ROOT,'theme/darling/assets/darling-ui.js'),'utf8');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:430,height:1200}});
await p.goto('https://darlinghome.bg/shop/',{waitUntil:'domcontentloaded'});
const prod=await p.locator('a[href*="/product/"]').first().getAttribute('href');
await p.goto(prod,{waitUntil:'domcontentloaded'});
const f=p.locator('form.cart').first(); if(await f.count()){await f.locator('button[type=submit],input[type=submit]').first().click();await p.waitForLoadState('domcontentloaded');}
await p.goto('https://darlinghome.bg/checkout/',{waitUntil:'domcontentloaded',timeout:60000});
await p.locator('.wc-block-components-text-input').first().waitFor({timeout:25000});
await p.waitForTimeout(3000);
await p.evaluate(()=>{for(const l of document.querySelectorAll('link[rel=stylesheet]')){if(/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href))l.disabled=true;}});
await p.addStyleTag({content:CSS}); await p.addScriptTag({content:UI});
await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{
  const lay=document.querySelector('.wc-block-components-sidebar-layout');
  const rows=[]; const walk=(el)=>{ for(const c of el.children){ const cs=getComputedStyle(c);
    if(cs.display==='contents'){ walk(c); continue; }
    const b2=c.getBoundingClientRect();
    rows.push({cls:((c.getAttribute('class')||'').split(/\s+/)[0]||c.tagName).slice(0,46),
      top:Math.round(b2.top+scrollY), bottom:Math.round(b2.bottom+scrollY), h:Math.round(b2.height),
      mt:cs.marginTop, mb:cs.marginBottom, pt:cs.paddingTop, pb:cs.paddingBottom, order:cs.order, disp:cs.display}); } };
  walk(lay);
  rows.sort((a,b3)=>a.top-b3.top);
  const gaps=[]; for(let i=1;i<rows.length;i++){ const g=rows[i].top-rows[i-1].bottom;
    if(g>8) gaps.push({after:rows[i-1].cls, before:rows[i].cls, gap:g, mb:rows[i-1].mb, mt:rows[i].mt}); }
  return {rowGap:getComputedStyle(lay).rowGap, rows:rows.slice(0,14), gaps};
});
console.log(JSON.stringify(r,null,1).slice(0,3200));
await b.close();})();