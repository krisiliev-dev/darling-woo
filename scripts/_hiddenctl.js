/* DOES THE HIDDEN CONTROL STILL WORK?
 *
 * Two real inputs are hidden so their own labels can paint them: the rating
 * picker's radios and the paginator's. Batch 5 moves them from the opacity
 * recipe to the clip-path one that .d-vh and .d-choice input already use, and
 * clip-path is NOT the same as opacity for hit-testing - a clipped box has no
 * area to hit, where a transparent one still does. Everything here is supposed
 * to be driven by a LABEL, which is unaffected either way. This asks the page
 * instead of assuming it.
 *
 *   node scripts/_hiddenctl.js
 */
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
 const pg=await b.newPage({viewport:{width:1300,height:900},reducedMotion:'reduce'});
 await pg.goto('http://127.0.0.1:'+port+'/gallery.html',{waitUntil:'load'});
 await pg.waitForTimeout(1200);
 const r=await pg.evaluate(()=>{
  const out=[];
  const run=(sel,label)=>{
   const els=[...document.querySelectorAll(sel)];
   if(!els.length){out.push(label+': NONE FOUND');return;}
   let labelled=0, worked=0, focusable=0;
   for(const e of els){
    const lab = e.closest('label') || (e.id?document.querySelector('label[for="'+CSS.escape(e.id)+'"]'):null);
    if(lab) labelled++;
    e.checked=false;
    if(lab){ lab.click(); if(e.checked) worked++; }
    e.focus(); if(document.activeElement===e) focusable++;
   }
   const c=getComputedStyle(els[0]);
   out.push(label+': '+els.length+' control(s), '+labelled+' with a label, '+worked+' check on label click, '+
     focusable+' focusable   [recipe: opacity='+c.opacity+' clip-path='+c.clipPath+' w='+c.width+']');
  };
  run('.d-rating-input input','rating picker  ');
  run('.d-pagination__radio','paginator radio');
  run('.d-choice input','choice control ');
  return out;});
 console.log(r.join('\n'));
 await b.close();srv.close();
})();