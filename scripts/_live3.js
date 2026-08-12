const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1240,height:1200}});
const pass=fs.readFileSync('C:/Users/lora_/darling/_scratch_woo/parity4/.acct','utf8').trim();
await p.goto('https://darlinghome.bg/my-account/',{waitUntil:'load'});
await p.fill('#username','parity-customer');await p.fill('#password',pass);
await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}),p.click('button[name="login"]')]);
await p.goto('https://darlinghome.bg/shop/',{waitUntil:'load'});
const href=await p.evaluate(()=>{const a=document.querySelector('li.product a[href*="/product/"],a.woocommerce-LoopProduct-link');return a&&a.href});
await p.goto(href,{waitUntil:'load'});
const btn=await p.$('button.single_add_to_cart_button:not(.disabled)');
await btn.click(); await p.waitForTimeout(6000);
// prove the cart actually has something BEFORE judging the checkout
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'}); await p.waitForTimeout(4000);
const cart=await p.evaluate(()=>({lines:document.querySelectorAll('.wc-block-cart-items__row,tr.cart_item').length,
  empty:!!document.querySelector('.cart-empty,.wc-block-cart__empty-cart__title,.is-empty')}));
console.log('CART '+JSON.stringify(cart));
if(cart.lines>0){
  await p.goto('https://darlinghome.bg/checkout/',{waitUntil:'load'}); await p.waitForTimeout(7000);
  const s=await p.evaluate(()=>({url:location.pathname,
   blocks:document.querySelectorAll('.wp-block-woocommerce-checkout').length,
   fields:document.querySelectorAll('.wp-block-woocommerce-checkout input,.wp-block-woocommerce-checkout select').length,
   place:!!document.querySelector('.wc-block-components-checkout-place-order-button'),
   sheets:document.styleSheets.length,h:document.documentElement.scrollHeight}));
  console.log('CHECKOUT '+JSON.stringify(s));
  await p.screenshot({path:'C:/Users/lora_/darling/_scratch_woo/sync/live-checkout.png',fullPage:true});
}
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(2500);
for(let i=0;i<4;i++){const rm=await p.$('button.wc-block-cart-item__remove-link,a.remove[href*="remove_item"]');
 if(!rm)break; await rm.click(); await p.waitForTimeout(3000);}
console.log('cart emptied: '+await p.evaluate(()=>!!document.querySelector('.cart-empty,.wc-block-cart__empty-cart__title,.is-empty')));
await b.close();})();