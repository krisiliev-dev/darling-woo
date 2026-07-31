/**
 * The cart drawer must show THIS visitor's cart and no one else's.
 * Pages come from a 60s micro-cache, so the drawer is fetched per visitor —
 * this proves that holds by driving two independent sessions.
 */
const { chromium } = require('playwright');
const BASE='https://staging.darlinghome.bg';
const CREDS={username:'darling', password:process.env.STAGING_PASS||''};
(async () => {
  const b = await chromium.launch({headless:true});
  const out = {};
  // Session A: add an item, open the drawer.
  const A = await b.newContext({locale:'bg-BG', viewport:{width:1400,height:1000}, httpCredentials:CREDS});
  const pa = await A.newPage();
  await pa.goto(`${BASE}/?add-to-cart=11`, {waitUntil:'domcontentloaded'});
  await pa.waitForTimeout(2000);
  await pa.goto(`${BASE}/`, {waitUntil:'networkidle'});
  await pa.waitForTimeout(2500);
  await pa.click('[data-darling-cart-open]').catch(()=>{});
  await pa.waitForTimeout(3000);
  out.A = await pa.evaluate(()=>({
    open: document.getElementById('darling-cart-drawer').open,
    items: document.querySelectorAll('.darling-cart__item').length,
    total: (document.querySelector('[data-darling-cart-total]')||{}).textContent,
    badge: (document.querySelector('[data-darling-cart-count]')||{}).textContent,
  }));
  await pa.screenshot({path:'tests/woo-cart-drawer.png'});

  // Session B: completely separate context, must see an empty cart.
  const B = await b.newContext({locale:'bg-BG', viewport:{width:1400,height:1000}, httpCredentials:CREDS});
  const pb = await B.newPage();
  await pb.goto(`${BASE}/`, {waitUntil:'networkidle'});
  await pb.waitForTimeout(2500);
  await pb.click('[data-darling-cart-open]').catch(()=>{});
  await pb.waitForTimeout(3000);
  out.B = await pb.evaluate(()=>({
    open: document.getElementById('darling-cart-drawer').open,
    items: document.querySelectorAll('.darling-cart__item').length,
    empty: !!document.querySelector('.darling-cart__empty'),
  }));
  out.verdict = (out.A.items>0 && out.B.items===0)
    ? `PASS — A sees ${out.A.items} item(s), B sees none`
    : `FAIL — A:${out.A.items} B:${out.B.items} (cart leaked or drawer broken)`;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})();
