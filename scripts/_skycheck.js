const http=require('http'),fs=require('fs'),path=require('path');
const { chromium }=require('playwright');
const THEME=path.join(path.dirname(__dirname),'theme','darling');
function serve(){const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);
 if(p==='/')p='/gallery.html';const f=path.join(THEME,p);
 if(!f.startsWith(THEME)||!fs.existsSync(f)){r.writeHead(404);return r.end();}
 const t={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'}[path.extname(f)]||'application/octet-stream';
 r.writeHead(200,{'content-type':t});fs.createReadStream(f).pipe(r);});
 return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res({srv,port:srv.address().port})));}
(async()=>{
 const {srv,port}=await serve();const b=await chromium.launch();
 for(const [w,h] of [[1440,900],[390,844]]){
  const pg=await b.newPage({viewport:{width:w,height:h}});
  await pg.goto('http://127.0.0.1:'+port+'/gallery.html',{waitUntil:'load'});
  await pg.waitForTimeout(14000);   /* let the sky fill: spawn is on a ~1.1s cadence */
  const r=await pg.evaluate(()=>{
   const L=document.querySelector('.d-ambient');
   if(!L) return {err:'no .d-ambient'};
   const kids=[...L.children];
   const cols={};kids.forEach(e=>{const c=getComputedStyle(e).color;cols[c]=(cols[c]||0)+1;});
   const cs=getComputedStyle(L);
   return {n:kids.length, slots:cs.getPropertyValue('--star-inks').trim(),
     zIndex:cs.zIndex, cols};});
  console.log('\n== '+w+'x'+h+'   stars '+r.n+'   slots '+r.slots+'   z '+r.zIndex);
  Object.entries(r.cols||{}).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>console.log('     '+String(n).padStart(3)+'  '+c));
  await pg.close();}
 /* the bow and the surfaces */
 const pg=await b.newPage({viewport:{width:1300,height:900},reducedMotion:'reduce'});
 await pg.goto('http://127.0.0.1:'+port+'/gallery.html',{waitUntil:'load'});
 await pg.waitForTimeout(1200);
 const t=await pg.evaluate(()=>{
  const o=[];
  const root=getComputedStyle(document.documentElement);
  o.push('--float-travel  '+root.getPropertyValue('--float-travel').trim());
  for(const s of ['.d-prose--card','.d-post','.d-consent','.d-review','.d-reviews__form','.d-intake','.d-courier']){
   const e=document.querySelector(s);
   o.push(s.padEnd(18)+(e?'  shadow='+getComputedStyle(e).boxShadow.slice(0,58):'  ABSENT'));}
  return o;});
 console.log('\n== the bow and the eight surfaces');t.forEach(x=>console.log('   '+x));
 await b.close();srv.close();
})();