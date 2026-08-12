const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
 const ec=document.querySelector('.entry-content');
 const c=getComputedStyle(ec);
 const sheet=[...document.styleSheets].find(x=>(x.href||'').includes('darling.build'));
 let has=false; try{for(const r of sheet.cssRules){} }catch(e){}
 return 'entry-content width='+Math.round(ec.getBoundingClientRect().width)
  +'  marginInline='+c.marginInlineStart+'/'+c.marginInlineEnd
  +'\nCSS url: '+(sheet?sheet.href.split('/').pop():'?');}));
await p.goto('https://darlinghome.bg/',{waitUntil:'load'});await p.waitForTimeout(2000);
const t=await p.$('[data-darling-cart-open],[data-cart-button]');
await t.click(); await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
 const d=document.querySelector('.d-drawer[open],dialog[open]');
 const btn=[...d.querySelectorAll('a.d-btn')].find(x=>x.getBoundingClientRect().left-d.getBoundingClientRect().left<5);
 if(!btn)return 'no offset button now';
 let s='THE MISALIGNED BUTTON, ancestors:\n'; let e=btn;
 while(e&&e!==d.parentElement){const r=e.getBoundingClientRect();const c=getComputedStyle(e);
  s+='  '+e.tagName.toLowerCase()+'.'+(e.className||'-').toString().slice(0,40).padEnd(42)
   +Math.round(r.width)+'w  d='+c.display+' pad='+c.paddingLeft+' ji='+c.justifyItems+' ta='+c.textAlign+'\n'; e=e.parentElement;}
 return s;}));
await b.close();})();