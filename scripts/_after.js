const path=require('path');const {chromium}=require('playwright');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
const OUT='C:/Users/lora_/darling/_scratch_woo/sync/after';
require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror-after'));
const b=await chromium.launch();
for(const pg of ['home','shop','product','cart','checkout','account']){
 const p=await b.newPage({viewport:{width:1240,height:1100}});
 await p.goto('http://127.0.0.1:'+port+'/'+pg+'.html',{waitUntil:'load'});await p.waitForTimeout(1200);
 await p.screenshot({path:OUT+'/'+pg+'.png',fullPage:true});
 const n=await p.evaluate(()=>({sheets:document.styleSheets.length,
   h:document.documentElement.scrollHeight,
   raw:[...document.querySelectorAll('button,input,select')].filter(e=>{const c=getComputedStyle(e);
     return c.borderTopStyle==='outset'||c.appearance==='auto'&&c.backgroundColor==='rgb(240, 240, 240)'}).length}));
 console.log(pg.padEnd(9)+' sheets='+n.sheets+' height='+n.h+' raw-chrome='+n.raw);
 await p.close();}
await b.close();server.close();console.log('-> '+OUT);})();