const path=require('path');const {chromium}=require('playwright');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror-f3'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('http://127.0.0.1:'+port+'/home.html',{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
 const f=document.querySelector('.d-footer');
 const col=[...f.children].reduce((a,c)=>c.getBoundingClientRect().height>a.getBoundingClientRect().height?c:a);
 let s='TALLEST COLUMN '+(col.className||'-')+'  '+Math.round(col.getBoundingClientRect().height)+'px\n';
 const walk=(e,d)=>{for(const c of e.children){const r=c.getBoundingClientRect();const st=getComputedStyle(c);
   s+='  '.repeat(d+1)+c.tagName.toLowerCase()+'.'+(c.className||'-').toString().slice(0,34).padEnd(36)
     +Math.round(r.height)+'px  lh='+st.lineHeight+' mb='+st.marginBottom+' gap='+st.rowGap+'\n';
   if(d<1)walk(c,d+1);}};
 walk(col,0);
 return s;}));
await b.close();server.close();})();