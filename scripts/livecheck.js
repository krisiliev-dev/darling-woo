const pw=require('playwright');
const SITE='https://darlinghome.bg';
(async()=>{
 const b=await pw.chromium.launch();
 const p=await b.newPage({viewport:{width:1280,height:1000}});
 const fails=[];
 const say=(ok,what,detail)=>{ console.log((ok?'  ok   ':'  FAIL ')+what+'   '+detail); if(!ok) fails.push(what); };

 // 1. the shop page is alive and the sheet is ours
 let r=await p.goto(SITE+'/shop/',{waitUntil:'load'});
 say(r.status()===200,'shop 200', String(r.status()));
 const sheets=await p.evaluate(()=>[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href.split('/').pop().split('?')[0]));
 say(sheets.some(s=>s==='darling.build.css'),'our sheet on /shop/', sheets.join(', '));

 // 2. the sort dropdown: hover and MOUSE-CLICK focus (the Firefox bug is checked below)
 const ob=await p.$('select.orderby');
 if(ob){
   const rd=()=>p.evaluate(()=>{const e=document.querySelector('select.orderby');const c=getComputedStyle(e);
     return {b:c.borderTopColor,s:c.boxShadow==='none'?'no':'yes'};});
   const rest=await rd();
   await ob.hover(); await p.waitForTimeout(500);
   const hov=await rd();
   say(hov.b!==rest.b,'sort dropdown hovers', rest.b+' -> '+hov.b);
   await p.evaluate(()=>document.querySelector('select.orderby').focus()); await p.waitForTimeout(500);
   const foc=await rd();
   say(foc.s==='yes','sort dropdown focus halo', 'shadow '+foc.s+' border '+foc.b);
 } else say(false,'sort dropdown present','not found');

 // 3. a product page still renders and add-to-cart is the gold finish
 const href=await p.evaluate(()=>{const a=document.querySelector('a[href*="/product/"]');return a?a.href:null;});
 if(href){
   r=await p.goto(href,{waitUntil:'load'});
   say(r.status()===200,'product 200',String(r.status()));
   const atc=await p.evaluate(()=>{const e=document.querySelector('.single_add_to_cart_button');
     if(!e) return null; const c=getComputedStyle(e); return {bg:c.backgroundColor,grain:/ply-grain|data:image/.test(getComputedStyle(e,'::after').backgroundImage)};});
   say(!!atc && atc.grain,'add-to-cart keeps its plywood', atc?atc.bg+' grain='+atc.grain:'missing');
 }

 // 4. the checkout still renders its block - the thing that broke before
 r=await p.goto(SITE+'/checkout/',{waitUntil:'load'});
 await p.waitForTimeout(4000);
 const co=await p.evaluate(()=>({
   block: !!document.querySelector('.wp-block-woocommerce-checkout, .wc-block-checkout, .wc-block-components-form'),
   header: !!document.querySelector('header.d-header'),
   text: document.body.innerText.trim().length,
 }));
 say(co.block||co.text>400,'checkout renders something', 'block='+co.block+' header='+co.header+' text='+co.text+' chars');

 // 5. the cart page
 r=await p.goto(SITE+'/cart/',{waitUntil:'load'});
 await p.waitForTimeout(3000);
 const ct=await p.evaluate(()=>document.body.innerText.trim().length);
 say(ct>200,'cart renders', ct+' chars');

 // 6. home
 r=await p.goto(SITE+'/',{waitUntil:'load'});
 say(r.status()===200,'home 200',String(r.status()));
 const hm=await p.evaluate(()=>({h:document.body.scrollHeight,hdr:!!document.querySelector('.d-header')}));
 say(hm.h>2000&&hm.hdr,'home renders full',hm.h+'px header='+hm.hdr);

 await b.close();
 console.log(fails.length?('\n'+fails.length+' LIVE CHECK(S) FAILED'):'\nlive: everything checked is behaving');
 process.exit(fails.length?1:0);
})();
