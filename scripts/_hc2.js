const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:1400}});
await p.goto('https://darlinghome.bg/kontakti/',{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{
 let s='CONTACT FORM FIELDS\n';
 for(const l of document.querySelectorAll('.darling-contact-form label')){
  const f=l.htmlFor?document.getElementById(l.htmlFor):l.querySelector('input,textarea,select');
  const r=l.getBoundingClientRect();
  s+='  label "'+l.textContent.trim().slice(0,22)+'" '+Math.round(r.width)+'x'+Math.round(r.height)
    +'  -> '+(f?f.tagName+' ph="'+(f.placeholder||'')+'" tabindex='+(f.getAttribute('tabindex')||'-'):'no field')+'\n';}
 s+='\nWRAPPERS: '+[...document.querySelectorAll('.darling-contact-form > *')].map(x=>x.tagName+'.'+(x.className||'-')).join(', ').slice(0,240);
 s+='\n\nHELP PAGE GROUPS: check separately';
 return s;}));
await p.goto('https://darlinghome.bg/pomosht/',{waitUntil:'load'});await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>{
 const main=document.querySelector('main');
 let s='HELP PAGE, main children:\n';
 for(const c of main.querySelectorAll('*')){
   const cl=(c.className||'').toString();
   if(/group|details|panel|accordion|faq/i.test(cl)||c.tagName==='DETAILS'){
     const r=c.getBoundingClientRect();const st=getComputedStyle(c);
     s+='  '+c.tagName.toLowerCase()+'.'+cl.slice(0,46).padEnd(48)+Math.round(r.width)+'x'+Math.round(r.height)
       +' bg='+st.backgroundColor+' radius='+st.borderTopLeftRadius+'\n';}}
 return s;}));
await b.close();})();