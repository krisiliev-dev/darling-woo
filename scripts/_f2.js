const path=require('path');const {chromium}=require('playwright');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
const P=['fontSize','lineHeight','minHeight','paddingTop','paddingBottom','marginTop','marginBottom','gap','rowGap','display','gridTemplateColumns'];
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror-f2'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('http://127.0.0.1:'+port+'/home.html',{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(await p.evaluate((P)=>{
 let s='';
 // 1 WHICH stylesheets does the page load, in order
 s+='SHEETS ON THE PAGE\n';
 for(const sh of document.styleSheets){
   const id=(sh.ownerNode&&sh.ownerNode.id)||'(inline)';
   const href=(sh.href||'').split('/').slice(-1)[0];
   let n=0; try{n=sh.cssRules.length}catch(e){n=-1}
   s+='  '+id.padEnd(34)+href.slice(0,46).padEnd(48)+n+' rules\n';
 }
 // 2 the footer, measured
 const f=document.querySelector('.d-footer');
 if(!f){s+='\nNO .d-footer\n';return s}
 const g=(e,l)=>{if(!e)return l+': missing\n';const c=getComputedStyle(e);
   return l.padEnd(22)+P.map(k=>k+'='+c[k]).join(' ')+'\n';};
 s+='\nFOOTER, COMPUTED\n';
 s+='  '+g(f,'.d-footer');
 s+='  '+g(f.querySelector('.d-footer__links a'),'links a');
 s+='  '+g(f.querySelector('.d-footer__links'),'.d-footer__links');
 s+='  '+g(f.querySelector('.d-footflair'),'.d-footflair');
 s+='  footer box h='+Math.round(f.getBoundingClientRect().height)+'\n';
 // 3 who wins line-height on a footer link
 const a=f.querySelector('.d-footer__links a');
 if(a){const hits=[];
  for(const sh of document.styleSheets){let rs;try{rs=sh.cssRules}catch(e){continue}
   const walk=l=>{for(const r of l){ if(r.selectorText&&r.style&&r.style.getPropertyValue('line-height')){
     for(const br of r.selectorText.split(',')){try{if(a.matches(br.trim()))hits.push(((sh.ownerNode&&sh.ownerNode.id)||sh.href||'?').split('/').pop()+'  '+br.trim().slice(0,46)+' = '+r.style.getPropertyValue('line-height'))}catch(e){}}}
     if(r.cssRules&&r.constructor.name!=='CSSStyleRule')walk(r.cssRules)}};
   walk(rs)}
  s+='\nline-height on a footer link, every match:\n'+hits.map(h=>'  '+h).join('\n')+'\n';}
 return s;},P));
await b.close();server.close();})();