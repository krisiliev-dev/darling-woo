const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const dir='C:/Users/lora_/darling/darling-woo/scripts/mirror';
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/cart.html';
 const f=path.join(dir,p);if(!f.startsWith(dir)||!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'}[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1000}});
await p.goto('http://127.0.0.1:'+srv.address().port+'/cart.html',{waitUntil:'load'});await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(()=>{
 const el=document.querySelector('.wc-block-store-notices');
 if(!el) return 'no store-notices node in the gallery specimens';
 const hits=[];
 for(const sh of document.styleSheets){let rs;try{rs=sh.cssRules}catch(e){continue}
  const walk=l=>{for(const r of l){ if(r.selectorText){ for(const br of r.selectorText.split(',')){
    try{ if(el.matches(br.trim())) hits.push({sel:br.trim().slice(0,90), css:r.cssText.slice(r.cssText.indexOf('{'),200)}) }catch(e){} } }
    if(r.cssRules && r.constructor.name!=='CSSStyleRule') walk(r.cssRules); }};
  walk(rs);}
 const c=getComputedStyle(el);
 return {cls:el.className, kids:el.children.length, inner:el.innerHTML.slice(0,120),
   bg:c.backgroundColor, radius:c.borderRadius, h:el.getBoundingClientRect().height, hits};
},),null,1));
await b.close();srv.close();})();
