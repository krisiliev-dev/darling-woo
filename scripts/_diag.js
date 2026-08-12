const path=require('path');const {chromium}=require('playwright');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror-f2'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('http://127.0.0.1:'+port+'/home.html',{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
 let s='';
 // A. what makes the footer tall
 const f=document.querySelector('.d-footer'); const fb=f.getBoundingClientRect();
 const c=getComputedStyle(f);
 s+='FOOTER h='+Math.round(fb.height)+'  padding '+c.paddingTop+' / '+c.paddingBottom+'\n';
 for(const col of f.children){const r=col.getBoundingClientRect();
   s+='  col '+(col.className||'-').toString().slice(0,26).padEnd(28)+Math.round(r.height)+'px\n';}
 const links=[...f.querySelectorAll('.d-footer__links a')];
 if(links.length){const a=links[0],ac=getComputedStyle(a);
  s+='  '+links.length+' links, each '+Math.round(a.getBoundingClientRect().height)+'px'
   +'  (min-height '+ac.minHeight+', line-height '+ac.lineHeight+')\n';
  const ul=a.closest('.d-footer__links');
  s+='  link list '+Math.round(ul.getBoundingClientRect().height)+'px, gap '+getComputedStyle(ul).rowGap+'\n';}
 // B. layers, in order, and how much is in each
 s+='\nLAYERS IN OUR SHEET\n';
 const ours=[...document.styleSheets].find(x=>(x.href||'').includes('darling.build'));
 const count={};
 const walk=(l,layer)=>{for(const r of l){
   const n=r.constructor.name;
   if(n==='CSSLayerBlockRule'){walk(r.cssRules,r.name||'(anon)');continue}
   if(n==='CSSLayerStatementRule')continue;
   if(n==='CSSMediaRule'||n==='CSSSupportsRule'||n==='CSSContainerRule'){walk(r.cssRules,layer);continue}
   if(r.selectorText){const k=layer||'UNLAYERED';count[k]=(count[k]||0)+1}}};
 walk(ours.cssRules,null);
 for(const k of Object.keys(count)) s+='  '+k.padEnd(14)+count[k]+' rules\n';
 // C. any Woo sheet left on the page
 s+='\nNON-OURS SHEETS STILL ON THE PAGE\n';
 for(const sh of document.styleSheets){
   const id=(sh.ownerNode&&sh.ownerNode.id)||'(inline)';
   if(/darling/.test(id))continue;
   let n=0;try{n=sh.cssRules.length}catch(e){n=-1}
   s+='  '+id.padEnd(38)+n+' rules\n';}
 return s;}));
await b.close();server.close();})();