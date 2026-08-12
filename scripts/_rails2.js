const path=require('path');const {chromium}=require('playwright');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
(async()=>{const {server,port}=await serve.start(path.join(R,'mirror-rail'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1100}});
await p.goto('http://127.0.0.1:'+port+'/home.html',{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
 const out=[];
 const main=document.querySelector('.wp-site-blocks > main')||document.querySelector('main');
 for(const s of main.children){
  const b=s.getBoundingClientRect();const c=getComputedStyle(s);
  // where does the first text/child actually start?
  const kid=s.querySelector('h1,h2,h3,p,.d-card,.d-shell,article');
  const kb=kid?kid.getBoundingClientRect():null;
  out.push('  '+(s.className||s.tagName).toString().slice(0,42).padEnd(44)
    +'box '+Math.round(b.left)+'..'+Math.round(b.right)
    +'  content@'+(kb?Math.round(kb.left):'-')
    +'  pad='+c.paddingLeft+'  mb='+c.marginBottom);}
 const f=document.querySelector('.d-footer');const fb=f&&f.getBoundingClientRect();
 const last=main.lastElementChild.getBoundingClientRect();
 return 'MAIN '+Math.round(main.getBoundingClientRect().left)+'..'+Math.round(main.getBoundingClientRect().right)
  +'  gap='+getComputedStyle(main).rowGap+'  pad='+getComputedStyle(main).paddingTop+'\n'+out.join('\n')
  +'\nlast section ends '+Math.round(last.bottom)+'  footer starts '+(fb?Math.round(fb.top):'-')+'  GAP '+(fb?Math.round(fb.top-last.bottom):'-');
}));
await b.close();server.close();})();