/* THE CART, WITH SOMETHING IN IT.
 *
 * Two open questions need a NON-EMPTY cart and nothing else:
 *   1. batch 4 moved the cart table's base into a weaker layer, which let
 *      .wc-block-cart-items__header-total{text-align:right} finally win. Did the
 *      "Total" header actually move over its column on the live site?
 *   2. batch 2 kept a.wc-block-components-button - the anchor net - on the
 *      grounds that it was measured at zero matches on an EMPTY cart, and an
 *      empty cart renders no submit button. Does it fire when there is one?
 *
 * COD only, no card, no order placed - this adds a line to the cart and reads
 * the page.
 */
const { chromium }=require('playwright');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1240,height:1000}});
 const p=await ctx.newPage();
 await p.goto('https://darlinghome.bg/shop/',{waitUntil:'domcontentloaded'});
 const prod=await p.locator('a[href*="/product/"]').first().getAttribute('href');
 await p.goto(prod,{waitUntil:'domcontentloaded'});
 const f=p.locator('form.cart').first();
 if(await f.count()){ await f.locator('button[type=submit],input[type=submit]').first().click();
   await p.waitForLoadState('domcontentloaded'); }
 else { const bl=p.locator('.wc-block-components-product-button__button, .add_to_cart_button').first();
   if(await bl.count()){ await bl.click(); await p.waitForTimeout(2500); } }
 await p.goto('https://darlinghome.bg/cart/',{waitUntil:'networkidle',timeout:60000});
 await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{
  const out=[];
  const rows=document.querySelectorAll('.wc-block-cart-items th');
  out.push('cart table header cells: '+rows.length);
  rows.forEach((e,i)=>{const c=getComputedStyle(e);
   out.push('   th#'+(i+1)+'  "'+e.textContent.trim().slice(0,18)+'"  align='+c.textAlign+
     '  pad='+c.padding+'  color='+c.color+'  border-bottom='+c.borderBottom+
     '  class='+String(e.className).slice(0,40));});
  const t=document.querySelector('.wc-block-cart-items');
  out.push('table: '+(t?getComputedStyle(t).width+'  collapse='+getComputedStyle(t).borderCollapse+
    '  fs='+getComputedStyle(t).fontSize:'ABSENT'));
  const cell=document.querySelector('.wc-block-cart-item__total');
  out.push('a total CELL aligns: '+(cell?getComputedStyle(cell).textAlign:'ABSENT'));
  const nets=[...document.querySelectorAll('a.wc-block-components-button')];
  out.push('a.wc-block-components-button (the net): '+nets.length+
    (nets.length?'  -> '+nets.map(e=>'"'+e.textContent.trim().slice(0,22)+'" display='+getComputedStyle(e).display+
      ' radius='+getComputedStyle(e).borderRadius+' bg='+getComputedStyle(e).backgroundColor).join(' | '):''));
  const sub=document.querySelector('.wc-block-cart__submit-button');
  out.push('submit button: '+(sub?sub.tagName+'  '+getComputedStyle(sub).display+'  radius='+
    getComputedStyle(sub).borderRadius+'  bg='+getComputedStyle(sub).backgroundColor+
    '  pad='+getComputedStyle(sub).padding:'ABSENT'));
  const tb=document.querySelector('.d-trustbar b');
  out.push('trustbar bullet: '+(tb?(getComputedStyle(tb,'::before').maskImage==='none'?'NO MASK':'mask set')+
    '  pos='+getComputedStyle(tb,'::before').maskPosition:'ABSENT'));
  return out;});
 console.log(r.join('\n'));
 await p.screenshot({path:'.cart-live.png',fullPage:false});
 await b.close();
})();