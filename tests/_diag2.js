const { chromium } = require('playwright');
const BASE='https://staging.darlinghome.bg';
(async()=>{
  const b=await chromium.launch({headless:true});
  const p=await (await b.newContext({locale:'bg-BG',viewport:{width:1280,height:1600},
    httpCredentials:{username:'darling',password:process.env.STAGING_PASS}})).newPage();
  const logs=[]; p.on('console',m=>logs.push(m.type()+':'+m.text().slice(0,100)));
  await p.goto(`${BASE}/?add-to-cart=11`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000);
  await p.goto(`${BASE}/checkout/`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(8000);
  for(const [s,v] of [['input[id*="city" i]','Свищов'],['input[id*="postcode" i]','5250']]){
    const el=p.locator(s).first(); if(await el.count()) await el.fill(v).catch(()=>{});
  }
  await p.waitForTimeout(9000);
  const r = await p.evaluate(async ()=>{
    // is the NEW script served?
    const src=(document.querySelector('script[src*="office-picker.js"]')||{}).src||'';
    let js=''; try{ js=await (await fetch(src)).text(); }catch(e){}
    const input=document.querySelector('[data-darling-office="1"]');
    // re-implement detection to see what the real page yields
    const radios=[...document.querySelectorAll('input[type="radio"]')];
    let rate=null;
    for(const rd of radios){ if(rd.checked && /^darling_(econt|speedy):(office|door)$/.test(rd.value||'')){ rate=rd.value; break; } }
    const cityEl=document.querySelector('#shipping-city, input[name="shipping_city"]');
    return {
      scriptSrc: src.split('?')[0].slice(-30),
      servedHasNewCode: js.includes('chosenRate'),
      inputFound: !!input,
      inputParent: input? input.parentNode.className.slice(0,60) : null,
      chosenRateValue: rate,
      city: cityEl? cityEl.value : null,
      selectExists: !!document.getElementById('darling-office-select'),
      cfg: typeof window.DarlingOffice !== 'undefined',
    };
  });
  console.log(JSON.stringify(r,null,2));
  console.log('  console:', JSON.stringify(logs.filter(l=>/error|darling/i.test(l)).slice(0,4)));
  await b.close();
})();
