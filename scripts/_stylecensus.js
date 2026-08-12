/* WHAT DID THESE SELECTORS COMPUTE TO, BEFORE AND AFTER?
 *
 * The mask census answered that question for one property family. This is the
 * same idea with the selector list and the property list passed in, for the
 * merges where the risk is the CASCADE rather than one declaration: a rule that
 * moves from a stronger layer to a weaker one keeps its declarations and can
 * still lose them.
 *
 *   node scripts/_stylecensus.js out.json "sel,sel,sel"
 *   node scripts/_stylecensus.js after.json "sel,sel" --against before.json
 */
const http=require('http'),fs=require('fs'),path=require('path');
const { chromium }=require('playwright');
const THEME=path.join(path.dirname(__dirname),'theme','darling');
const OUT=process.argv[2];
const SEL=(process.argv[3]||'').split(',').map(s=>s.trim()).filter(Boolean);
const AG=process.argv.indexOf('--against')>-1?process.argv[process.argv.indexOf('--against')+1]:null;
const PROPS=['display','position','width','height','padding','margin','border','borderRadius',
 'backgroundColor','backgroundImage','color','font','fontWeight','lineHeight','gap','alignItems',
 'justifyContent','textAlign','textDecorationLine','whiteSpace','boxShadow','cursor','opacity',
 'transitionProperty','transitionDuration','overflow','flexDirection','gridArea','zIndex'];

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
 const rows=await pg.evaluate(([SEL,PROPS])=>{
  const out=[];const seen=new Map();
  for(const sel of SEL){
   const els=document.querySelectorAll(sel);
   for(let i=0;i<els.length;i++){
    const e=els[i];const c=getComputedStyle(e);const r=e.getBoundingClientRect();
    const n=(seen.get(sel)||0)+1;seen.set(sel,n);
    out.push({k:sel+'#'+n, box:Math.round(r.width*100)/100+'x'+Math.round(r.height*100)/100,
      v:PROPS.map(p=>p+'='+c[p]).join(' | ')});
   }}
  return out;},[SEL,PROPS]);
 await b.close();srv.close();
 fs.writeFileSync(OUT,JSON.stringify(rows,null,1));
 console.log('matched '+rows.length+' element(s) across '+SEL.length+' selector(s) -> '+OUT);
 if(AG){
  const old=JSON.parse(fs.readFileSync(AG,'utf8'));
  const m=new Map(old.map(r=>[r.k,r]));let ch=0,nw=0,gn=0;
  for(const r of rows){const o=m.get(r.k);
   if(!o){nw++;console.log('NEW   '+r.k);continue;}
   m.delete(r.k);
   const a=o.v.split(' | '),c=r.v.split(' | ');
   const d=a.map((x,i)=>[x,c[i]]).filter(p=>p[0]!==p[1]);
   const boxd=o.box!==r.box;
   if(d.length||boxd){ch++;console.log('CHANGED '+r.k);
    if(boxd)console.log('        box:  '+o.box+'   ->   '+r.box);
    d.forEach(p=>console.log('        '+p[0]+'   ->   '+p[1].split('=')[1]));}}
  for(const k of m.keys()){gn++;console.log('GONE  '+k);}
  console.log('\n'+rows.length+' vs '+old.length+':  changed '+ch+'   new '+nw+'   gone '+gn);
 }
})();