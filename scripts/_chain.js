const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
 const h=[...document.querySelectorAll('h2')].find(x=>/Ð¿Ñ€Ð°Ð·Ð½Ð°/.test(x.textContent));
 if(!h)return 'no empty heading';
 let s='ANCESTOR CHAIN of the empty heading\n';
 let e=h;
 while(e&&e.tagName!=='HTML'){const r=e.getBoundingClientRect();const c=getComputedStyle(e);
  s+='  '+e.tagName.toLowerCase()+'.'+(e.className||'-').toString().slice(0,50).padEnd(52)
    +Math.round(r.left)+'..'+Math.round(r.right)+' ('+Math.round(r.width)+')'
    +'  display='+c.display+' w='+c.width+' gtc='+c.gridTemplateColumns.slice(0,34)+' ji='+c.justifyItems+'\n';
  e=e.parentElement;}
 return s;}));
await b.close();})();