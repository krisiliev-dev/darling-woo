/* Does the LIVE checkout still render its block, with an item in the cart?
 * The one page that has broken before. Adds one unit, looks, removes it. */
const pw=require('playwright');
const { readAcct } = require('./_acct');
const SITE='https://darlinghome.bg';
(async()=>{
 const {user,pass}=readAcct();
 const b=await pw.chromium.launch();
 const p=await b.newPage({viewport:{width:1280,height:1200}});
 await p.goto(SITE+'/my-account/',{waitUntil:'load'});
 await p.fill('#username',user); await p.fill('#password',pass);
 await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}),
   p.click('button[name="login"], .woocommerce-form-login__submit')]);
 await p.goto(SITE+'/shop/',{waitUntil:'load'});
 const href=await p.evaluate(()=>{const a=document.querySelector('a[href*="/product/"]');return a?a.href:null;});
 await p.goto(href,{waitUntil:'load'});
 const add=await p.$('button.single_add_to_cart_button:not(.disabled)');
 if(add){ await add.click(); await p.waitForTimeout(2500); }
 await p.goto(SITE+'/checkout/',{waitUntil:'load'});
 await p.waitForTimeout(6000);
 const m=await p.evaluate(()=>{
   const q=(s)=>document.querySelector(s);
   const fields=document.querySelectorAll('.wc-block-components-text-input input').length;
   const place=q('.wc-block-components-checkout-place-order-button');
   const hdr=q('header.d-header');
   const logo=q('.d-header__logo'), cart=q('[data-cart-button]');
   const rect=(e)=>e?e.getBoundingClientRect():null;
   return {
     chars: document.body.innerText.trim().length,
     block: !!q('.wp-block-woocommerce-checkout, .wc-block-checkout'),
     fields, place: !!place,
     header: !!hdr,
     headerOneLine: (logo&&cart)? Math.abs(rect(logo).y-rect(cart).y)<30 : null,
     sheets: [...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href.split('/').pop().split('?')[0]),
   };
 });
 console.log(JSON.stringify(m,null,1));
 await p.screenshot({path:'checkout-live.png',fullPage:false});
 // put the cart back as it was
 await p.goto(SITE+'/cart/',{waitUntil:'load'}); await p.waitForTimeout(2500);
 for(let i=0;i<8;i++){
   const n=await p.evaluate(()=>document.querySelectorAll('.wc-block-cart-item__remove-link, a.remove').length);
   if(!n) break;
   await p.click('.wc-block-cart-item__remove-link, a.remove',{timeout:8000}).catch(()=>{});
   await p.waitForTimeout(2000);
 }
 const left=await p.evaluate(()=>document.querySelectorAll('.wc-block-cart-items__row').length);
 console.log('cart emptied again, lines left: '+left);
 const ok = m.block && m.fields>3 && m.place && m.header && m.headerOneLine!==false;
 console.log(ok?'CHECKOUT IS FINE':'CHECKOUT LOOKS WRONG');
 await b.close(); process.exit(ok?0:1);
})();
