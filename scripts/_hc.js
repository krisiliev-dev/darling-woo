const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1200}});
await p.goto('https://darlinghome.bg/pomosht/',{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
 const g=document.querySelector('main .wp-block-group');
 let s='FIRST GROUP:\n'+(g?g.outerHTML.slice(0,420):'none')+'\n\nCLASSES OF ALL 8:\n';
 [...document.querySelectorAll('main .wp-block-group')].forEach((x,i)=>{
   const r=x.getBoundingClientRect();const c=getComputedStyle(x);
   s+='  '+i+' '+(x.className||'-').toString().slice(0,54).padEnd(56)+Math.round(r.width)+'x'+Math.round(r.height)
     +' bg='+c.backgroundColor+' radius='+c.borderTopLeftRadius+' pad='+c.paddingTop+'\n';});
 return s;}));
await p.goto('https://darlinghome.bg/kontakti/',{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
 const l=document.querySelector('main label');
 const f=l&&l.htmlFor?document.getElementById(l.htmlFor):null;
 return 'CONTACT LABEL: '+(l?l.outerHTML.slice(0,160):'none')
  +'\n  field: '+(f?f.outerHTML.slice(0,160):'none')
  +'\n  form classes: '+[...document.querySelectorAll('main form')].map(x=>x.className).join(' | ').slice(0,120);}));
await b.close();})();