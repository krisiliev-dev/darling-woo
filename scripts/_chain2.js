const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(3500);
console.log(await p.evaluate(()=>{
 const h=[...document.querySelectorAll('h1,h2,h3')].map(x=>x.tagName+' "'+x.textContent.trim().slice(0,24)+'" w='+Math.round(x.getBoundingClientRect().width)).join('\n  ');
 let s='HEADINGS:\n  '+h+'\n\n';
 const t=[...document.querySelectorAll('h1,h2,h3')].find(x=>x.getBoundingClientRect().width<40 && x.getBoundingClientRect().height>40);
 if(!t){s+='no collapsed heading found';return s}
 s+='CHAIN of the collapsed one:\n'; let e=t;
 while(e&&e.tagName!=='HTML'){const r=e.getBoundingClientRect();const c=getComputedStyle(e);
  s+='  '+e.tagName.toLowerCase()+'.'+(e.className||'-').toString().slice(0,48).padEnd(50)
    +Math.round(r.left)+'..'+Math.round(r.right)+' ('+Math.round(r.width)+')'
    +' d='+c.display+' w='+c.width+' gtc='+c.gridTemplateColumns.slice(0,30)+'\n'; e=e.parentElement;}
 return s;}));
await b.close();})();