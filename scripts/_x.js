const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{
 const ec=document.querySelector('.entry-content'), main=ec.parentElement;
 const w=()=>Math.round(ec.getBoundingClientRect().width);
 const c=getComputedStyle(ec), mc=getComputedStyle(main);
 let s='entry-content: width='+c.width+' maxWidth='+c.maxWidth+' justifySelf='+c.justifySelf
   +' display='+c.display+'  used='+w()+'\n';
 s+='main: display='+mc.display+' gtc='+mc.gridTemplateColumns+' justifyItems='+mc.justifyItems
   +' gridAutoFlow='+mc.gridAutoFlow+' width='+mc.width+'\n';
 ec.style.justifySelf='stretch'; s+='justify-self:stretch -> '+w()+'\n'; ec.style.justifySelf='';
 ec.style.maxWidth='none';       s+='max-width:none      -> '+w()+'\n'; ec.style.maxWidth='';
 ec.style.width='auto';          s+='width:auto          -> '+w()+'\n'; ec.style.width='';
 ec.style.minWidth='100%';       s+='min-width:100%      -> '+w()+'\n'; ec.style.minWidth='';
 return s;}));
await b.close();})();