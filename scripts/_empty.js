const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
 let s='EMPTY CART PAGE\n';
 const e=document.querySelector('.wc-block-cart__empty-cart__title,.cart-empty,.is-empty');
 const blk=document.querySelector('.wp-block-woocommerce-empty-cart-block,.wc-block-cart');
 const host=blk||document.querySelector('main');
 for(const c of host.querySelectorAll('*')){
  const r=c.getBoundingClientRect(); if(r.height<1) continue;
  const st=getComputedStyle(c);
  if(/title|button|empty|image|paragraph|heading/i.test((c.className||'').toString())||/^(H1|H2|H3|A|BUTTON|IMG)$/.test(c.tagName)){
   s+='  '+c.tagName.toLowerCase()+'.'+(c.className||'-').toString().slice(0,44).padEnd(46)
     +Math.round(r.left)+'..'+Math.round(r.right)+'  ta='+st.textAlign+' mi='+st.marginInlineStart+'/'+st.marginInlineEnd+'\n';}}
 return s;}));
await p.screenshot({path:'C:/Users/lora_/darling/_scratch_woo/sync/empty-cart.png',fullPage:true});
// the drawer
await p.goto('https://darlinghome.bg/',{waitUntil:'load'});await p.waitForTimeout(2000);
const t=await p.$('[data-darling-cart-open],[data-cart-button]');
if(t){await t.click();await p.waitForTimeout(1500);
 console.log(await p.evaluate(()=>{
  const d=document.querySelector('.d-drawer[open],dialog[open]');
  if(!d)return 'DRAWER did not open';
  let s='DRAWER (empty)\n';
  const db=d.getBoundingClientRect();
  for(const c of d.querySelectorAll('a,button,p,h2,h3')){const r=c.getBoundingClientRect();
   if(r.height<1)continue; const st=getComputedStyle(c);
   s+='  '+c.tagName.toLowerCase()+'.'+(c.className||'-').toString().slice(0,40).padEnd(42)
    +Math.round(r.left-db.left)+'..'+Math.round(r.right-db.left)+' of '+Math.round(db.width)
    +'  ta='+st.textAlign+' mi='+st.marginInlineStart+'/'+st.marginInlineEnd+'\n';}
  return s;}));
 await p.screenshot({path:'C:/Users/lora_/darling/_scratch_woo/sync/empty-drawer.png'});}
await b.close();})();