const path=require('path');const {chromium}=require('playwright');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1000}});
for(const pg of ['cart','checkout']){
  await p.goto('http://127.0.0.1:'+port+'/'+pg+'.html',{waitUntil:'load'});await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>{
    // a wide, short, empty-looking box near the top
    const out=[];
    for(const e of document.querySelectorAll('body *')){
      const b=e.getBoundingClientRect();
      if(b.width>800 && b.height>0 && b.height<70 && b.top<400){
        const txt=(e.textContent||'').trim();
        if(txt.length<3){
          const c=getComputedStyle(e);
          out.push({tag:e.tagName,cls:(e.className||'').toString().slice(0,90),
            w:Math.round(b.width),h:Math.round(b.height),top:Math.round(b.top),
            bg:c.backgroundColor,radius:c.borderRadius,children:e.children.length});
        }
      }
    }
    return out.slice(0,8);
  });
  console.log('== '+pg+' ==');r.forEach(x=>console.log('  '+JSON.stringify(x)));
}
await b.close();server.close();})();
