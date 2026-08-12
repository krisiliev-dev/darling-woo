/* WHITE-SPACE:NOWRAP ARRIVED ON EIGHT MORE BUTTONS. WHAT CAN THAT BREAK?
 *
 * Exactly one thing: a label that used to wrap inside its box now runs out of
 * it. Nothing else about nowrap is visible.
 *
 * *** scrollWidth IS THE WRONG INSTRUMENT AND THE FIRST VERSION USED IT. ***
 * scrollWidth excludes the right padding on an inline-flex box, so every single
 * .d-btn reported "scroll 193 > client 169" - a 24px difference that is just
 * 1.5em of padding, on buttons that were nowrap before this change and are not
 * overflowing anything. Measure the TEXT instead: a Range over the contents
 * against the content box.
 *
 *   node scripts/_btnoverflow.js            (prints one line per width)
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
const SEL=['.d-btn','.single_add_to_cart_button','.wc-block-cart__submit-button','.d-card__cta',
 'li.product .wc-block-components-product-button__button','li.product .wp-block-button__link',
 'li.wc-block-grid__product .wc-block-components-product-button__button',
 'li.wc-block-grid__product .wp-block-button__link','.wc-block-product-filters__apply',
 '.wc-block-product-filters__open-overlay',
 '.wc-block-components-button.wc-block-components-checkout-place-order-button'];
(async()=>{
 const {srv,port}=await serve();const b=await chromium.launch();
 for(const w of [1300,768,390,320]){
  const pg=await b.newPage({viewport:{width:w,height:900},reducedMotion:'reduce'});
  await pg.goto('http://127.0.0.1:'+port+'/gallery.html',{waitUntil:'load'});
  await pg.addStyleTag({content:'*,*::before,*::after{animation:none !important;transition:none !important}'});
  await pg.waitForTimeout(900);
  const r=await pg.evaluate((SEL)=>{
   let n=0;const bad=[];const seen=new Set();
   for(const s of SEL) for(const e of document.querySelectorAll(s)){
    if(seen.has(e))continue; seen.add(e); n++;
    const cs=getComputedStyle(e);
    const cw=e.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0);
    const rg=document.createRange();rg.selectNodeContents(e);
    const tw=rg.getBoundingClientRect().width;
    const lbl=e.textContent.trim().slice(0,26);
    if(tw-cw>1) bad.push('TEXT OUT OF BOX   '+Math.round(tw)+' in '+Math.round(cw)+'   "'+lbl+'"');
    const p=e.parentElement;
    if(p){const d=e.getBoundingClientRect().right-p.getBoundingClientRect().right;
      if(d>1) bad.push('OUT OF PARENT by '+Math.round(d)+'px   "'+lbl+'"');}
   }
   return {n,bad};},SEL);
  console.log('  '+String(w).padStart(5)+'px   '+r.n+' buttons   '+(r.bad.length?r.bad.length+' PROBLEM(S)':'clean'));
  r.bad.forEach(x=>console.log('           '+x));
  await pg.close();
 }
 await b.close();srv.close();
})();