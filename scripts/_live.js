const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1240,height:1100}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text().slice(0,160))});
// log in first - checkout needs a cart
const pass=fs.readFileSync('C:/Users/lora_/darling/_scratch_woo/parity4/.acct','utf8').trim();
await p.goto('https://darlinghome.bg/my-account/',{waitUntil:'load'});
await p.fill('#username','parity-customer');await p.fill('#password',pass);
await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}),p.click('button[name="login"]')]);
await p.goto('https://darlinghome.bg/checkout/',{waitUntil:'load'});
await p.waitForTimeout(4000);
const s=await p.evaluate(()=>({
  bodyText:(document.body.innerText||'').trim().slice(0,200),
  blocks:document.querySelectorAll('.wp-block-woocommerce-checkout').length,
  fields:document.querySelectorAll('input,select').length,
  h:document.documentElement.scrollHeight,
  sheets:document.styleSheets.length,
  empty:!!document.querySelector('.wc-block-components-notice-banner, .cart-empty, .wc-block-cart__empty-cart__title')}));
console.log(JSON.stringify(s,null,1));
console.log('ERRORS '+errs.length);errs.slice(0,6).forEach(e=>console.log('  '+e.slice(0,180)));
await p.screenshot({path:'C:/Users/lora_/darling/_scratch_woo/sync/live-checkout.png',fullPage:true});
await b.close();})();