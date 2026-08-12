const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1240,height:1200}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
const pass=fs.readFileSync('C:/Users/lora_/darling/_scratch_woo/parity4/.acct','utf8').trim();
await p.goto('https://darlinghome.bg/my-account/',{waitUntil:'load'});
await p.fill('#username','parity-customer');await p.fill('#password',pass);
await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}),p.click('button[name="login"]')]);
await p.goto('https://darlinghome.bg/shop/',{waitUntil:'load'});
const href=await p.evaluate(()=>{const a=document.querySelector('li.product a[href*="/product/"],a.woocommerce-LoopProduct-link');return a&&a.href});
await p.goto(href,{waitUntil:'load'});
const btn=await p.$('button.single_add_to_cart_button:not(.disabled)');
await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}),btn.click()]);
await p.goto('https://darlinghome.bg/checkout/',{waitUntil:'load'});
await p.waitForTimeout(6000);
const s=await p.evaluate(()=>({
 blocks:document.querySelectorAll('.wp-block-woocommerce-checkout').length,
 fields:document.querySelectorAll('.wp-block-woocommerce-checkout input,.wp-block-woocommerce-checkout select').length,
 place:!!document.querySelector('.wc-block-components-checkout-place-order-button'),
 h:document.documentElement.scrollHeight, sheets:document.styleSheets.length}));
console.log('CHECKOUT '+JSON.stringify(s));
console.log('errors '+errs.length); errs.slice(0,4).forEach(e=>console.log('  '+e.slice(0,150)));
await p.screenshot({path:'C:/Users/lora_/darling/_scratch_woo/sync/live-checkout.png',fullPage:true});
// tidy up: empty the cart again
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(2500);
const rm=await p.$('button.wc-block-cart-item__remove-link,a.remove[href*="remove_item"]');
if(rm){await rm.click();await p.waitForTimeout(3000);}
const e2=await p.evaluate(()=>!!document.querySelector('.cart-empty,.wc-block-cart__empty-cart__title,.is-empty'));
console.log('cart emptied: '+e2);
await b.close();})();