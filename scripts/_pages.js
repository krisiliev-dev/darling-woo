const {chromium}=require('playwright');const fs=require('fs');
const OUT='C:/Users/lora_/darling/_scratch_woo/sync/pages'; fs.mkdirSync(OUT,{recursive:true});
const PAGES=[['contact','/kontakti/'],['help','/pomosht/'],['about','/za-nas/'],['account','/my-account/']];
(async()=>{const b=await chromium.launch();
const pass=fs.readFileSync('C:/Users/lora_/darling/_scratch_woo/parity4/.acct','utf8').trim();
const p=await b.newPage({viewport:{width:1240,height:1200}});
await p.goto('https://darlinghome.bg/my-account/',{waitUntil:'load'});
await p.fill('#username','parity-customer');await p.fill('#password',pass);
await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}),p.click('button[name="login"]')]);
for(const [name,url] of PAGES){
 const r=await p.goto('https://darlinghome.bg'+url,{waitUntil:'load'}).catch(()=>null);
 if(!r||r.status()>=400){console.log(name.padEnd(9)+' '+(r?r.status():'ERR')+'  '+url);continue}
 await p.waitForTimeout(1800);
 await p.screenshot({path:OUT+'/'+name+'.png',fullPage:true});
 const s=await p.evaluate(()=>{
  const t=document.querySelector('h1, .wp-block-post-title');
  const ta=t?getComputedStyle(t).textAlign:'-';
  const lists=[...document.querySelectorAll('main ul')].filter(u=>!u.closest('nav,.d-header,.d-footer'));
  const panels=[...document.querySelectorAll('main .wp-block-group, main .wp-block-details, main details')].length;
  const dup=[...document.querySelectorAll('main label')].filter(l=>{
    const f=l.htmlFor&&document.getElementById(l.htmlFor); return f&&f.placeholder&&f.placeholder.trim();}).length;
  const notices=[...document.querySelectorAll('.woocommerce-notices-wrapper,.wc-block-store-notices,.woocommerce-message,.woocommerce-info')]
    .map(e=>({cls:(e.className||'').toString().slice(0,40),top:Math.round(e.getBoundingClientRect().top),h:Math.round(e.getBoundingClientRect().height)}));
  return {title:t?t.textContent.trim().slice(0,30):'none', align:ta,
    lists:lists.length, listItems:lists.reduce((a,u)=>a+u.children.length,0),
    panels, dupLabels:dup, notices, dPanel:document.querySelectorAll('main .d-panel').length};});
 console.log(name.padEnd(9)+' title="'+s.title+'" align='+s.align+'  ul='+s.lists+'/'+s.listItems
   +' groups='+s.panels+' .d-panel='+s.dPanel+' dupLabels='+s.dupLabels
   +' notices='+JSON.stringify(s.notices));
}
await b.close();console.log('-> '+OUT);})();