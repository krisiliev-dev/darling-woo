/* PIXEL PROOF FOR THE PLUMBING MERGE.
 *
 * The mask census says the only computed change on 422 masked elements is
 * mask-position 0% 0% -> center, plus two boxes deliberately halved. That is an
 * argument, not a result: "contain fills a square box exactly, so position has
 * nothing to move" is true and it is still reasoning about the code.
 *
 * So: shoot every specimen that holds one of those marks, before and after, and
 * count the pixels that differ.
 *
 *   node scripts/_maskshot.js .shots/before
 *   node scripts/_maskshot.js .shots/after --against .shots/before
 */
const http=require('http'),fs=require('fs'),path=require('path');
const { chromium }=require('playwright');
const { PNG }=require('pngjs');
const _pm=require('pixelmatch');const pixelmatch=_pm.default||_pm;
const THEME=path.join(path.dirname(__dirname),'theme','darling');
const OUT=process.argv[2];
const SPECARG=process.argv.indexOf('--specimens');
const AG=process.argv.indexOf('--against')>-1?process.argv[process.argv.indexOf('--against')+1]:null;
const SPECIMENS=SPECARG>-1?process.argv[SPECARG+1].split(',').map(x=>x.trim()).filter(Boolean):['.d-header__inner','.d-mega','.d-drawer__nav','.d-drawer__list','.d-trustbar',
 '.d-mappick','.d-news','.d-footflair','.fgrid','.wc-block-product-filters__overlay-content',
 '.d-icon--spinner','.d-icon-btn','.d-scrollframe--page'];

function serve(){const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);
 if(p==='/')p='/gallery.html';const f=path.join(THEME,p);
 if(!f.startsWith(THEME)||!fs.existsSync(f)){r.writeHead(404);return r.end();}
 const t={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'}[path.extname(f)]||'application/octet-stream';
 r.writeHead(200,{'content-type':t});fs.createReadStream(f).pipe(r);});
 return new Promise(res=>srv.listen(0,'127.0.0.1',()=>res({srv,port:srv.address().port})));}

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const {srv,port}=await serve();
 const b=await chromium.launch();
 const pg=await b.newPage({viewport:{width:1300,height:900},reducedMotion:'reduce',deviceScaleFactor:2});
 await pg.goto('http://127.0.0.1:'+port+'/gallery.html',{waitUntil:'load'});
 /* Freeze everything that moves, and remove the two layers that are random by
    design - the ambient sky and the injected page bar - so the diff is about
    marks and not about where a star happened to spawn. */
 await pg.addStyleTag({content:'*,*::before,*::after{animation:none !important;transition:none !important}'+
  '.d-ambient,.d-news__flow{visibility:hidden !important}'});
 /* The star flights and both bows rest at opacity 0 and only show on hover, so
    force every one of them visible - otherwise this proves nothing about the
    marks whose position actually moved. */
 await pg.addStyleTag({content:
  '.d-mega__link::before,.d-mega__link::after,.d-drawer__nav li::before,.d-drawer__nav li::after,'+
  '.d-drawer__nav a::before,.d-drawer__nav a::after,.d-icon--user::after,.d-icon--search::after'+
  '{opacity:1 !important;scale:1 !important;offset-distance:35% !important}'});
 await pg.waitForTimeout(1500);
 let n=0;
 for(const sel of SPECIMENS){
  const els=await pg.$$(sel);
  for(let i=0;i<Math.min(els.length,6);i++){
   const name=sel.replace(/[^a-z0-9]+/gi,'_')+'_'+i+'.png';
   try{ await els[i].screenshot({path:path.join(OUT,name)}); n++; }catch(e){ }
  }
 }
 await b.close();srv.close();
 console.log('shot '+n+' specimens -> '+OUT);
 if(AG){
  let tot=0,bad=0,miss=0;
  for(const f of fs.readdirSync(OUT)){
   const p1=path.join(AG,f);
   if(!fs.existsSync(p1)){miss++;console.log('  NO BASELINE  '+f);continue;}
   const a=PNG.sync.read(fs.readFileSync(p1)), c=PNG.sync.read(fs.readFileSync(path.join(OUT,f)));
   if(a.width!==c.width||a.height!==c.height){bad++;console.log('  SIZE   '+f+'  '+a.width+'x'+a.height+' -> '+c.width+'x'+c.height);continue;}
   const d=pixelmatch(a.data,c.data,null,a.width,a.height,{threshold:0.1});
   tot+=d; if(d){bad++;console.log('  DIFF   '+f+'  '+d+' px of '+(a.width*a.height));}
  }
  console.log('\n'+fs.readdirSync(OUT).length+' specimens compared: '+bad+' differ, '+tot+' pixels total, '+miss+' without a baseline');
 }
})();