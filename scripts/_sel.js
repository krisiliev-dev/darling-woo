/* Full selector text for the CLAIM set. triage slices hitSel to 70 chars, which
 * is right for a report and useless for writing CSS against. */
const path=require('path'), fs=require('fs');
const {chromium}=require('playwright');
const R='C:/Users/lora_/darling/darling-woo/scripts';
const serve=require(path.join(R,'dtest','serve'));
const claim=JSON.parse(fs.readFileSync(path.join(R,'triage2.json'),'utf8')).claim;
const want=new Set(claim.map(x=>x.sel));
(async()=>{
  const {server,port}=await serve.start(path.join(R,'mirror'));
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1240,height:1000}});
  const out={};
  for(const pg of ['checkout','cart','product','shop','account','home']){
    await p.goto('http://127.0.0.1:'+port+'/'+pg+'.html',{waitUntil:'load'});
    await p.waitForTimeout(900);
    const found=await p.evaluate((prefixes)=>{
      const res={};
      for(const sh of [...document.styleSheets]){
        let rules; try{rules=sh.cssRules;}catch(e){continue;}
        const walk=(l)=>{for(const r of l){
          if(r.selectorText){
            for(const br of r.selectorText.split(',')){
              const t=br.trim();
              for(const pre of prefixes) if(t.startsWith(pre)&&t.length>pre.length-1){ (res[pre]=res[pre]||new Set()); res[pre].add(t); }
            }
          }
          if(r.cssRules&&r.constructor.name!=='CSSStyleRule') walk(r.cssRules);
        }};
        walk(rules);
      }
      const o={}; for(const k in res) o[k]=[...res[k]].slice(0,4); return o;
    },[...want]);
    for(const k in found){ out[k]=out[k]||new Set(); found[k].forEach(v=>out[k].add(v)); }
  }
  const o={}; for(const k in out) o[k]=[...out[k]];
  fs.writeFileSync('C:/Users/lora_/darling/_scratch_woo/sync/fullsel.json', JSON.stringify(o,null,1));
  console.log('wrote fullsel.json for '+Object.keys(o).length+' of '+want.size+' truncated selectors');
  await b.close(); server.close();
})();
