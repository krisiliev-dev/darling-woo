// What does WooCommerce say about .wc-block-components-spinner? Read their
// sheet - if the size comes from a percentage of a parent they also size, then
// dequeuing leaves a percentage of nothing, which is how a spinner becomes a
// circle the width of the page.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 await p.goto('https://darlinghome.bg/cart/',{waitUntil:'domcontentloaded'});
 const css = await p.evaluate(async ()=>{
   const links=[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href)
     .filter(h=>/wc-blocks|packages-style|cart\.css|checkout\.css/.test(h));
   const out=[];
   for(const h of links){ const t=await (await fetch(h)).text();
     const re=/([^{}]*spinner[^{}]*)\{([^{}]*)\}/g; let m;
     while((m=re.exec(t))) out.push({sheet:h.split('/').pop().split('?')[0], rule:(m[1].trim()+' { '+m[2].trim()+' }').replace(/\s+/g,' ').slice(0,240)});
     if(out.length>18) break; }
   return out;
 });
 css.forEach(x=>console.log(x.sheet+'  '+x.rule));
 await b.close();})();