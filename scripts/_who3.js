const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('https://darlinghome.bg/cart/',{waitUntil:'load'});await p.waitForTimeout(3500);
console.log(await p.evaluate(()=>{
 const e=document.querySelector('.entry-content');
 let s='.entry-content used width='+Math.round(e.getBoundingClientRect().width)+'\n';
 s+='  inline style: '+(e.getAttribute('style')||'none')+'\n';
 s+='  classes: '+e.className+'\n\nRULES SETTING width/max-width/flex/grid on it:\n';
 for(const sh of document.styleSheets){let rs;try{rs=sh.cssRules}catch(err){continue}
  const walk=l=>{for(const r of l){
    if(r.selectorText&&r.style){
      const props=['width','max-width','min-width','flex','flex-basis','grid-template-columns','justify-self','container-type','contain']
        .filter(pp=>r.style.getPropertyValue(pp));
      if(props.length)for(const br of r.selectorText.split(',')){
        try{if(e.matches(br.trim()))
          s+='   '+((sh.ownerNode&&sh.ownerNode.id)||'inline').padEnd(22)+br.trim().slice(0,40).padEnd(42)
            +props.map(pp=>pp+':'+r.style.getPropertyValue(pp)).join('; ')+'\n'}catch(x){}}}
    if(r.cssRules&&r.constructor.name!=='CSSStyleRule')walk(r.cssRules)}};
  walk(rs)}
 const par=e.parentElement, pc=getComputedStyle(par);
 s+='\nPARENT '+par.tagName+'.'+par.className.slice(0,40)+'  display='+pc.display+' gtc='+pc.gridTemplateColumns+' justifyItems='+pc.justifyItems;
 return s;}));
await b.close();})();