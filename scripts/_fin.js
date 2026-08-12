const path=require('path');const {chromium}=require('playwright');const fs=require('fs');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
const OUT='C:/Users/lora_/darling/_scratch_woo/sync/final'; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror-final'));
const b=await chromium.launch();
for(const pg of ['checkout','cart','home']){
 const p=await b.newPage({viewport:{width:1240,height:1100}});
 await p.goto('http://127.0.0.1:'+port+'/'+pg+'.html',{waitUntil:'load'});await p.waitForTimeout(1400);
 await p.screenshot({path:OUT+'/'+pg+'.png',fullPage:true});
 const n=await p.evaluate(()=>{const h=document.querySelector('.d-header');
   const lg=document.querySelector('.d-header__logo'), ct=document.querySelector('[data-cart-button]');
   const r=e=>e?Math.round(e.getBoundingClientRect().left)+','+Math.round(e.getBoundingClientRect().top):'none';
   return {dheader:!!h, logo:r(lg), cart:r(ct), sameRow: lg&&ct? Math.abs(lg.getBoundingClientRect().top-ct.getBoundingClientRect().top)<30 : null};});
 console.log(pg.padEnd(9)+' .d-header='+n.dheader+' logo@'+n.logo+' cart@'+n.cart+' one row='+n.sameRow);
 await p.close();}
await b.close();server.close();})();