const { chromium } = require('playwright');
const BASE='https://staging.darlinghome.bg';
(async()=>{
  const b=await chromium.launch({headless:true});
  const p=await (await b.newContext({locale:'bg-BG',viewport:{width:1280,height:1600},
    httpCredentials:{username:'darling',password:process.env.STAGING_PASS}})).newPage();
  await p.goto(`${BASE}/?add-to-cart=11`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000);
  await p.goto(`${BASE}/checkout/`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(7000);
  for(const [s,v] of [['input[id*="city" i]','Свищов'],['input[id*="postcode" i]','5250'],
                      ['input[id*="address_1" i], input[id*="address-1" i]','ул. Цар Освободител 1']]){
    const el=p.locator(s).first(); if(await el.count()) await el.fill(v).catch(()=>{});
  }
  await p.waitForTimeout(8000);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const radios=[...document.querySelectorAll('input[type="radio"]')];
    return {
      radioCount: radios.length,
      checked: radios.filter(r=>r.checked).map(r=>({v:r.value,id:r.id})),
      sample: radios.slice(0,6).map(r=>({v:r.value,id:r.id,checked:r.checked})),
      cityByMySelector: (()=>{const e=document.querySelector('#shipping-city, input[name="shipping-city"], #billing-city, input[name="billing-city"]');return e?{id:e.id,val:e.value}:null;})(),
      allCityInputs: [...document.querySelectorAll('input')].filter(i=>/city/i.test(i.id+i.name)).map(i=>({id:i.id,name:i.name,val:i.value})),
      officeInputId: (document.querySelector('[data-darling-office="1"]')||{}).id||null,
      dualOnPage: /лв\./.test(document.body.innerText),
      firstTotal: (document.querySelector('.wc-block-components-totals-item__value')||{}).textContent||null,
    };
  }),null,2));
  await b.close();
})();
