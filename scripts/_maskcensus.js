/* MASK CENSUS - every masked element in the gallery, its mark and its box.
 *
 * The plumbing merge moves mask declarations from twenty-odd component rules
 * onto one shared rule. That is supposed to change NOTHING except the two bows,
 * whose boxes are deliberately halved. cascadediff.js does not look at mask
 * properties, so this is the half of the proof it cannot give.
 *
 *   node scripts/_maskcensus.js before.json
 *   ...rebuild...
 *   node scripts/_maskcensus.js after.json --against before.json
 */
const http=require('http'),fs=require('fs'),path=require('path');
const { chromium }=require('playwright');
const THEME=path.join(path.dirname(__dirname),'theme','darling');
const OUT=process.argv[2];
const AG=process.argv.indexOf('--against')>-1?process.argv[process.argv.indexOf('--against')+1]:null;

function serve(){const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);
 if(p==='/')p='/gallery.html';const f=path.join(THEME,p);
 if(!f.startsWith(THEME)||!fs.existsSync(f)){r.writeHead(404);return r.end();}
 const t={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'}[path.extname(f)]||'application/octet-stream';
 r.writeHead(200,{'content-type':t});fs.createReadStream(f).pipe(r);});
 return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res({srv,port:srv.address().port})));}

(async()=>{
 const {srv,port}=await serve();
 const b=await chromium.launch();
 const pg=await b.newPage({viewport:{width:1300,height:900},reducedMotion:'reduce'});
 await pg.goto('http://127.0.0.1:'+port+'/gallery.html',{waitUntil:'load'});
 await pg.addStyleTag({content:'*,*::before,*::after{animation:none !important;transition:none !important}'});
 await pg.waitForTimeout(1200);
 const rows=await pg.evaluate(()=>{
  const out=[];const all=document.querySelectorAll('body *');
  const path_=(e)=>{const p=[];let n=e;let d=0;
   while(n&&n.tagName!=='BODY'&&d<4){const c=String(n.className||'').split(/\s+/).filter(Boolean).slice(0,2).join('.');
    p.unshift(n.tagName.toLowerCase()+(c?'.'+c:''));n=n.parentElement;d++;}return p.join('>');};
  for(let i=0;i<all.length;i++){const e=all[i];
   if(e.tagName==='SCRIPT'||e.tagName==='STYLE')continue;
   for(const pseudo of [null,'::before','::after']){
    const c=getComputedStyle(e,pseudo);
    const mi=c.maskImage||c.webkitMaskImage;
    if(!mi||mi==='none')continue;
    const r=e.getBoundingClientRect();
    out.push({k:i+'|'+path_(e)+(pseudo||''),
      img:mi.replace(/\s+/g,'').slice(0,90),
      size:c.maskSize||c.webkitMaskSize, rep:c.maskRepeat||c.webkitMaskRepeat,
      pos:c.maskPosition||c.webkitMaskPosition,
      w:pseudo?c.width:Math.round(r.width*100)/100, h:pseudo?c.height:Math.round(r.height*100)/100});
   }}
  return out;});
 await b.close();srv.close();
 fs.writeFileSync(OUT,JSON.stringify(rows,null,1));
 console.log('masked elements: '+rows.length+'  -> '+OUT);
 if(AG){
  const old=JSON.parse(fs.readFileSync(AG,'utf8'));
  const m=new Map(old.map(r=>[r.k,r]));
  let diff=0,gone=0,added=0;
  for(const r of rows){const o=m.get(r.k);
   if(!o){added++;console.log('  NEW    '+r.k+'  '+r.img.slice(0,50));continue;}
   m.delete(r.k);
   const ch=['img','size','rep','pos','w','h'].filter(p=>String(o[p])!==String(r[p]));
   if(ch.length){diff++;console.log('  CHANGED '+r.k);
    ch.forEach(p=>console.log('           '+p+': '+o[p]+'   ->   '+r[p]));}}
  for(const k of m.keys()){gone++;console.log('  GONE   '+k);}
  console.log('\ncompared '+rows.length+' vs '+old.length+':  changed '+diff+'  new '+added+'  gone '+gone);
 }
})();