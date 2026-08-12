const pw=require('playwright');
const { readAcct } = require('./_acct');
const S='https://darlinghome.bg';
(async()=>{
 const {user,pass}=readAcct();
 const b=await pw.chromium.launch();
 const p=await b.newPage({viewport:{width:1280,height:1000}});
 const say=(ok,w,d)=>console.log((ok?'  ok   ':'  FAIL ')+w.padEnd(34)+d);

 // FOOTER + INSTAGRAM, on the home page
 await p.goto(S+'/',{waitUntil:'load'}); await p.waitForTimeout(1500);
 let m=await p.evaluate(()=>{
   const f=document.querySelector('.d-footer'), c=getComputedStyle(f), r=f.getBoundingClientRect();
   const inner=r.width-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight);
   const help=document.querySelector('.d-footer__help');
   const links=document.querySelector('.d-footer__links'), pol=document.querySelector('.d-footer__policies');
   const ig=document.querySelector('.d-footflair__social svg[fill="none"]');
   const rr=(e)=>e?e.getBoundingClientRect():null;
   return {pct:Math.round(inner/r.width*1000)/10, twoCol: links&&pol? Math.abs(rr(links).y-rr(pol).y)<8 : false,
           polInHelp: !!(help&&help.contains(pol)), igFill: ig?getComputedStyle(ig).fill:'no svg',
           sbColor: getComputedStyle(document.documentElement).scrollbarColor};
 });
 say(m.pct>=94&&m.pct<=96,'footer on the 95% rail', m.pct+'%');
 say(m.twoCol&&m.polInHelp,'policies are a 2nd link column', 'sameRow='+m.twoCol+' insideHelp='+m.polInHelp);
 say(m.igFill==='none','instagram is an outline', 'fill='+m.igFill);
 say(/rgb/.test(m.sbColor),'branded scrollbar on :root', m.sbColor);

 // HELP PAGE PANELS
 await p.goto(S+'/pomosht/',{waitUntil:'load'}); await p.waitForTimeout(800);
 m=await p.evaluate(()=>{
   document.querySelectorAll('details').forEach(d=>d.open=true);
   const s=document.querySelector('details > summary'), bdy=document.querySelector('details > :not(summary)');
   return {sum:getComputedStyle(s).paddingLeft, body:getComputedStyle(bdy).paddingLeft, n:document.querySelectorAll('details').length};
 });
 say(parseFloat(m.body)>0,'panel bodies have padding', m.n+' panels, summary '+m.sum+' body '+m.body);

 // PRODUCT: gold on first paint, burst injected after JS
 await p.goto(S+'/shop/',{waitUntil:'load'});
 const href=await p.evaluate(()=>{const a=document.querySelector('a[href*="/product/"]');return a?a.href:null;});
 await p.goto(href,{waitUntil:'domcontentloaded'});
 const early=await p.evaluate(()=>{const e=document.querySelector('.single_add_to_cart_button');
   return e?{bg:getComputedStyle(e).backgroundColor, hasFinish:e.classList.contains('d-finish')}:null;});
 await p.waitForTimeout(2500);
 const late=await p.evaluate(()=>{const e=document.querySelector('.single_add_to_cart_button');
   return e?{bg:getComputedStyle(e).backgroundColor, burst:!!e.querySelector('.d-burst'), host:e.classList.contains('d-burst-host'), stars:e.querySelectorAll('.d-burst i').length}:null;});
 say(early&&early.bg===late.bg,'add-to-cart does NOT flash', 'early '+(early&&early.bg)+' -> late '+(late&&late.bg));
 say(late&&late.burst&&late.stars===9,'burst injected', 'host='+(late&&late.host)+' stars='+(late&&late.stars));

 // CART with an item: the stepper and the remove button
 await p.goto(S+'/my-account/',{waitUntil:'load'});
 await p.fill('#username',user); await p.fill('#password',pass);
 await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}), p.click('button[name="login"], .woocommerce-form-login__submit')]);
 await p.goto(href,{waitUntil:'load'});
 const add=await p.$('button.single_add_to_cart_button:not(.disabled)');
 if(add){ await add.click(); await p.waitForTimeout(2500); }
 await p.goto(S+'/cart/',{waitUntil:'load'}); await p.waitForTimeout(4000);
 m=await p.evaluate(()=>{
   const q=document.querySelector('.wc-block-cart-item__quantity .wc-block-components-quantity-selector');
   const rm=document.querySelector('.wc-block-cart-item__remove-link');
   const g=(e)=>e?getComputedStyle(e):null; const r=(e)=>e?e.getBoundingClientRect():null;
   return {qty: q?{box:Math.round(r(q).width)+'x'+Math.round(r(q).height), cols:g(q).gridTemplateColumns, radius:g(q).borderTopLeftRadius}:null,
           rm: rm?{box:Math.round(r(rm).width)+'x'+Math.round(r(rm).height), circle:Math.abs(r(rm).width-r(rm).height)<1, minW:g(rm).minWidth}:null};
 });
 say(m.qty&&m.qty.radius==='10px','cart stepper is the compact component', JSON.stringify(m.qty));
 say(m.rm&&m.rm.circle,'cart remove is a circle', JSON.stringify(m.rm));
 // leave the cart as we found it
 for(let i=0;i<8;i++){ const n=await p.evaluate(()=>document.querySelectorAll('.wc-block-cart-item__remove-link, a.remove').length);
   if(!n) break; await p.click('.wc-block-cart-item__remove-link, a.remove',{timeout:8000}).catch(()=>{}); await p.waitForTimeout(2000); }
 console.log('  cart emptied again');
 await b.close();
})();