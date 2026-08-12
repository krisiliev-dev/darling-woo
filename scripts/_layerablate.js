/* IS THE ADOPTED LAYER STILL BUYING ANYTHING?
 *
 * adopted exists for one reason, written at the top of half a dozen files:
 * WooCommerce shipped its CSS UNLAYERED, and an unlayered declaration beats a
 * layered one whatever its specificity - so rules that had to win against Woo
 * were put in the strongest layer we have. Those sheets are dequeued now.
 *
 * If the layer is no longer doing work, then the 51 remaining cross-origin
 * pairs are not waiting on anything: they are just copies. The way to ask is
 * not to read the files. It is to MOVE THE LAYER and see whether the page
 * notices.
 *
 *   node scripts/_layerablate.js
 *
 * It rewrites the @layer statement so adopted sits BEFORE patterns - the
 * weakest position it could take among our own layers - rebuilds, and compares
 * every element in the gallery, keyed by DOM path rather than by index so a
 * random number of ambient stars cannot shift the whole file. Then it puts
 * everything back.
 */
const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process');
const { chromium }=require('playwright');
const ROOT=path.dirname(__dirname);
const THEME=path.join(ROOT,'theme','darling');
const IDX=path.join(THEME,'src','index.css');
const BEFORE='@layer fallback, wc, tokens, base, motion, patterns, finish, utilities, adopted;';
const AFTER ='@layer fallback, wc, tokens, base, motion, adopted, patterns, finish, utilities;';
const PROPS=['display','position','width','height','padding','margin','border','borderRadius',
 'backgroundColor','backgroundImage','color','font','lineHeight','gap','alignItems',
 'justifyContent','gridTemplateColumns','textAlign','textDecorationLine','whiteSpace','boxShadow',
 'cursor','opacity','overflow','flexDirection','maskImage','letterSpacing','listStyleType'];

function serve(){const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);
 if(p==='/')p='/gallery.html';const f=path.join(THEME,p);
 if(!f.startsWith(THEME)||!fs.existsSync(f)){r.writeHead(404);return r.end();}
 const t={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'}[path.extname(f)]||'application/octet-stream';
 r.writeHead(200,{'content-type':t});fs.createReadStream(f).pipe(r);});
 return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res({srv,port:srv.address().port})));}

const shoot=async(port,label)=>{
 const b=await chromium.launch();
 const pg=await b.newPage({viewport:{width:1300,height:900},reducedMotion:'reduce'});
 await pg.goto('http://127.0.0.1:'+port+'/gallery.html',{waitUntil:'load'});
 await pg.addStyleTag({content:'*,*::before,*::after{animation:none !important;transition:none !important}'});
 await pg.waitForTimeout(1500);
 const rows=await pg.evaluate((PROPS)=>{
  const seen=new Map();const out=[];
  const pathOf=(e)=>{const p=[];let n=e,d=0;
   while(n&&n.tagName!=='HTML'&&d<6){const c=String(n.className||'').split(/\s+/).filter(Boolean).slice(0,2).join('.');
    p.unshift(n.tagName.toLowerCase()+(c?'.'+c:''));n=n.parentElement;d++;}return p.join('>');};
  for(const e of document.querySelectorAll('body *')){
   if(e.tagName==='SCRIPT'||e.tagName==='STYLE')continue;
   const k0=pathOf(e); const n=(seen.get(k0)||0)+1; seen.set(k0,n);
   const c=getComputedStyle(e);
   out.push({k:k0+'#'+n, v:PROPS.map(p=>c[p]).join('~')});}
  return out;},PROPS);
 await b.close();
 console.log('  '+label+': '+rows.length+' elements');
 return rows;};

(async()=>{
 const orig=fs.readFileSync(IDX,'utf8');
 if(orig.split(BEFORE).length-1!==1){console.log('ABORT: layer statement not where expected');process.exit(1);}
 const {srv,port}=await serve();
 try{
  cp.execSync('node scripts/build-css.js',{cwd:ROOT,stdio:'ignore'});
  const a=await shoot(port,'adopted LAST  (as shipped)');
  fs.writeFileSync(IDX, orig.replace(BEFORE,AFTER));
  cp.execSync('node scripts/build-css.js',{cwd:ROOT,stdio:'ignore'});
  const b=await shoot(port,'adopted FIRST (ablated)   ');
  const m=new Map(a.map(r=>[r.k,r.v]));
  let diff=0,miss=0;const hits=[];
  for(const r of b){ const o=m.get(r.k); if(o===undefined){miss++;continue;}
   if(o!==r.v){diff++; if(hits.length<25){
    const A=o.split('~'),B=r.v.split('~');
    hits.push(r.k.slice(-70)+'\n        '+A.map((x,i)=>x!==B[i]?PROPS[i]+': '+x+' -> '+B[i]:null).filter(Boolean).join('\n        '));}}}
  console.log('\n=== elements whose computed style depends on the adopted layer being LAST');
  hits.forEach(h=>console.log('   '+h));
  console.log('\n   '+diff+' of '+b.length+' elements change when adopted is moved below patterns   ('+miss+' unmatched)');
 } finally {
  fs.writeFileSync(IDX,orig);
  cp.execSync('node scripts/build-css.js',{cwd:ROOT,stdio:'ignore'});
  srv.close();
  console.log('\n   index.css and the build are back as they were');
 }
})();