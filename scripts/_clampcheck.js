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
 const p=await b.newPage({viewport:{width:1300,height:900}});
 await p.goto('http://127.0.0.1:'+port+'/gallery.html',{waitUntil:'load'});
 await p.waitForTimeout(1000);
 const r=await p.evaluate(()=>{
  const o=[];
  const t=[...document.querySelectorAll('.d-card__title')];
  o.push('.d-card__title  n='+t.length);
  t.slice(0,3).forEach((e,i)=>{const c=getComputedStyle(e);
   o.push('  #'+(i+1)+'  display='+c.display+'  clamp='+c.webkitLineClamp+'  overflow='+c.overflow+
     '  parentDisplay='+getComputedStyle(e.parentElement).display+'  h='+Math.round(e.getBoundingClientRect().height));});
  /* the proof: force a very long title and see whether it clamps */
  if(t[0]){ const e=t[0]; const keep=e.textContent;
   e.textContent='ÐœÐ½Ð¾Ð³Ð¾ Ð´ÑŠÐ»Ð³Ð¾ Ð·Ð°Ð³Ð»Ð°Ð²Ð¸Ðµ Ð½Ð° Ð¿Ñ€Ð¾Ð´ÑƒÐºÑ‚ ÐºÐ¾ÐµÑ‚Ð¾ Ñ‚Ñ€Ñ�Ð±Ð²Ð° Ð´Ð° Ñ�Ðµ Ð¾Ñ‚Ñ€ÐµÐ¶Ðµ Ñ�Ð»ÐµÐ´ Ð´Ð²Ð° Ñ€ÐµÐ´Ð° Ð·Ð°Ñ‰Ð¾Ñ‚Ð¾ Ð¸Ð½Ð°Ñ‡Ðµ Ñ€ÐµÐ´ÑŠÑ‚ Ð¸Ð·Ð³Ð»ÐµÐ¶Ð´Ð° Ñ�Ñ‡ÑƒÐ¿ÐµÐ½ Ð¸ Ñ‚Ð¾Ð²Ð° Ðµ Ñ‚Ð¾Ñ‡Ð½Ð¾ ÐºÐ°ÐºÐ²Ð¾Ñ‚Ð¾ ÐºÐ¾Ð¼ÐµÐ½Ñ‚Ð°Ñ€ÑŠÑ‚ ÐºÐ°Ð·Ð²Ð°';
   const h=Math.round(e.getBoundingClientRect().height);
   const lh=parseFloat(getComputedStyle(e).lineHeight);
   o.push('  forced long title: height '+h+'px, line-height '+lh.toFixed(1)+'px  => '+Math.round(h/lh)+' lines  (clamp says 2)');
   e.textContent=keep; }
  return o;});
 r.forEach(x=>console.log('   '+x));
 await b.close();srv.close();
})();