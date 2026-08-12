const path=require('path');const {chromium}=require('playwright');const fs=require('fs');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
const OUT='C:/Users/lora_/darling/_scratch_woo/sync/deq'; fs.mkdirSync(OUT,{recursive:true});
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror-deq'));
const b=await chromium.launch();
for(const pg of ['home','shop','product','cart','checkout','account']){
 const p=await b.newPage({viewport:{width:1240,height:1100}});
 await p.goto('http://127.0.0.1:'+port+'/'+pg+'.html',{waitUntil:'load'});await p.waitForTimeout(1400);
 await p.screenshot({path:OUT+'/'+pg+'.png',fullPage:true});
 const n=await p.evaluate(()=>{
  const raw=[...document.querySelectorAll('button,input,select,textarea')].filter(e=>{const c=getComputedStyle(e);
    return /outset|inset/.test(c.borderTopStyle)||(c.backgroundColor==='rgb(239, 239, 239)')||(c.backgroundColor==='rgb(240, 240, 240)')});
  return {h:document.documentElement.scrollHeight, raw:raw.length,
    rawnames:raw.slice(0,3).map(e=>e.tagName+'.'+(e.className||'-').toString().slice(0,30)),
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};});
 console.log(pg.padEnd(9)+' h='+String(n.h).padEnd(6)+' raw-chrome='+n.raw+' h-overflow='+n.overflow+(n.raw?'  '+n.rawnames.join(', '):''));
 await p.close();}
await b.close();server.close();console.log('-> '+OUT);})();