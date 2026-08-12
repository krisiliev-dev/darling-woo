const path=require('path');const {chromium}=require('playwright');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror-f3'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('http://127.0.0.1:'+port+'/home.html',{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
 const c=document.querySelector('.d-wipe__clear');
 if(!c)return 'no .d-wipe__clear on the live home page';
 const r=c.getBoundingClientRect(),s=getComputedStyle(c);
 let out='clear box '+r.width.toFixed(1)+' x '+r.height.toFixed(1)+'  radius='+s.borderRadius
  +' padding='+s.padding+' width='+s.width+' height='+s.height+' minW='+s.minWidth+' minH='+s.minHeight+'\n';
 // every rule that sets width/height/padding/border-radius on it
 for(const sh of document.styleSheets){let rs;try{rs=sh.cssRules}catch(e){continue}
  const walk=l=>{for(const rr of l){ if(rr.selectorText&&rr.style){
    const props=['width','height','padding','border-radius','min-width','min-height','aspect-ratio'].filter(pp=>rr.style.getPropertyValue(pp));
    if(props.length){for(const br of rr.selectorText.split(',')){try{if(c.matches(br.trim()))
      out+='   '+((sh.ownerNode&&sh.ownerNode.id)||'inline')+'  '+br.trim().slice(0,44)+'  {'+props.map(pp=>pp+':'+rr.style.getPropertyValue(pp)).join('; ')+'}\n'}catch(e){}}}}
    if(rr.cssRules&&rr.constructor.name!=='CSSStyleRule')walk(rr.cssRules)}};
  walk(rs)}
 return out;}));
await b.close();server.close();})();