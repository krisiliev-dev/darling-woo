const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const ROOT=path.dirname(__dirname);
const CSS=fs.readFileSync(path.join(ROOT,'theme/darling/darling.build.css'),'utf8');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:430,height:1200}});
await p.goto('https://darlinghome.bg/shop/',{waitUntil:'domcontentloaded'});
const prod=await p.locator('a[href*="/product/"]').first().getAttribute('href');
await p.goto(prod,{waitUntil:'domcontentloaded'});
const f=p.locator('form.cart').first(); if(await f.count()){await f.locator('button[type=submit],input[type=submit]').first().click();await p.waitForLoadState('domcontentloaded');}
await p.goto('https://darlinghome.bg/checkout/',{waitUntil:'domcontentloaded',timeout:60000});
await p.locator('.wc-block-components-text-input').first().waitFor({timeout:25000});
await p.waitForTimeout(3000);
await p.evaluate(()=>{for(const l of document.querySelectorAll('link[rel=stylesheet]')){if(/\/themes\/darling\/style\.css|assets\/darling\.css|wc-blocks|packages-style|woocommerce|all-products|cart\.css|store-notices|express-checkout|upe-|stripe/.test(l.href))l.disabled=true;}});
await p.addStyleTag({content:CSS});
await p.waitForTimeout(900);
const r=await p.evaluate(()=>{
  const lay=document.querySelector('.wc-block-components-sidebar-layout');
  const items=[];
  const walk=(el)=>{ for(const c of el.children){ const cs=getComputedStyle(c);
    if(cs.display==='contents'){ walk(c); continue; }
    items.push({cls:(c.getAttribute('class')||'').split(/\s+/)[0]||c.tagName,
      order:cs.order, y:Math.round(c.getBoundingClientRect().top+window.scrollY)}); } };
  walk(lay);
  return {layDisplay:getComputedStyle(lay).display, items};
});
console.log(JSON.stringify(r,null,1).slice(0,2600));
await b.close();})();