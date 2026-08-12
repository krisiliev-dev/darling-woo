/* the live Контакти page, after the deploy */
const pw=require('playwright');
(async()=>{
 const b=await pw.chromium.launch();
 const p=await b.newPage({viewport:{width:1280,height:1100},deviceScaleFactor:2});
 await p.goto('https://darlinghome.bg/kontakti/',{waitUntil:'load'});
 await p.waitForTimeout(1200);
 const m=await p.evaluate(()=>{
   const out={labels:[],fields:[]};
   for(const l of document.querySelectorAll('.darling-contact-form label')){
     const r=l.getBoundingClientRect(); out.labels.push(Math.round(r.width)+'x'+Math.round(r.height));
   }
   for(const i of document.querySelectorAll('.darling-contact-form input:not([type=hidden]), .darling-contact-form textarea')){
     const c=getComputedStyle(i), r=i.getBoundingClientRect();
     out.fields.push({box:Math.round(r.width)+'x'+Math.round(r.height), x:Math.round(r.x), bg:c.backgroundColor, radius:c.borderTopLeftRadius});
   }
   const f=document.querySelector('.darling-contact-form');
   out.formGap=f?getComputedStyle(f).gap:null;
   return out;
 });
 console.log('labels (all should be 1x1 or 0x0):', m.labels.join(', '));
 console.log('form gap:', m.formGap);
 for(const f of m.fields) console.log('  field', f.box.padEnd(10), 'x'+String(f.x).padEnd(5), f.bg, 'r'+f.radius);
 await p.locator('.darling-contact-form').screenshot({path:'kontakti-live.png'});
 await b.close();
})();
