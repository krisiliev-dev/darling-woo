const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
for(const url of ['https://darlinghome.bg/cart/','https://darlinghome.bg/za-nas/']){
 await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(2500);
 console.log(await p.evaluate((u)=>{
  const rs=getComputedStyle(document.documentElement);
  const e=document.querySelector('.entry-content');
  const es=e?getComputedStyle(e):null;
  const t=['--w-bleed','--w-wide','--w-body','--w-prose','--edge-min','--measure-page','--measure-lede','--page-max'];
  return u+'\n  tokens: '+t.map(k=>k+'='+(rs.getPropertyValue(k).trim()||'(EMPTY)')).join('  ')
   +'\n  .entry-content max-width='+(es?es.maxWidth:'-')+'  used width='+(e?Math.round(e.getBoundingClientRect().width):'-');
 },url));
}
await b.close();})();