const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(3500);
console.log(await p.evaluate(()=>{
 const ec=document.querySelector('.entry-content');
 const cart=document.querySelector('.wp-block-woocommerce-cart');
 const w=()=>Math.round(ec.getBoundingClientRect().width);
 let s='before                : '+w()+'\n';
 const ccs=getComputedStyle(cart);
 s+='cart container-type   : '+ccs.containerType+'  contain='+ccs.contain+'\n';
 cart.style.containerType='normal';
 s+='container-type normal : '+w()+'\n';
 cart.style.containerType='';
 ec.style.width='100%';
 s+='entry-content w:100%  : '+w()+'\n';
 ec.style.width='';
 // is it a grid item that stretches?
 const par=ec.parentElement;
 s+='parent gtc            : '+getComputedStyle(par).gridTemplateColumns+'  children='+par.children.length+'\n';
 s+='entry-content justifySelf: '+getComputedStyle(ec).justifySelf+'  gridColumn='+getComputedStyle(ec).gridColumnStart+'\n';
 [...par.children].forEach(c=>{const r=c.getBoundingClientRect();
   s+='   child '+c.tagName+'.'+(c.className||'-').toString().slice(0,34)+' '+Math.round(r.left)+'..'+Math.round(r.right)+'\n';});
 return s;}));
await b.close();})();