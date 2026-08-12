/* WHAT THE GATE CANNOT SEE.
 *
 * dupes.js needs a rule with 3+ declarations, 4+ of them shared, at 60%+
 * overlap. Duplication that is spread THIN - the same three lines in fourteen
 * small rules - never trips it. .d-cluster was found that way by hand and the
 * triage refused to merge two of its fourteen because "it fixes 2 of 14 and
 * names no object". This asks the question the gate does not: which small
 * groups of declarations are written out over and over?
 */
const fs=require('fs'),p=require('path');
const R='theme/darling/src';
const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.isDirectory())w(f);else if(e.name.endsWith('.css'))files.push(f);}})(R);
const rules=[];
for(const f of files){ const s=fs.readFileSync(f,'utf8');
 const re=/([^{}]*)\{([^{}]*)\}/g;let m;
 while((m=re.exec(s))){
  const sel=m[1].split('\n').filter(x=>x.trim()&&!x.trim().startsWith('/*')&&!x.trim().startsWith('*')).join(' ').trim();
  if(!sel||sel.startsWith('@')||/^\d/.test(sel))continue;
  const decls=m[2].replace(/\/\*[\s\S]*?\*\//g,'').split(';').map(x=>x.trim().replace(/\s+/g,' ')).filter(x=>x&&x.includes(':')&&!x.startsWith('--'));
  if(decls.length>=2) rules.push({file:f.replace(/\\/g,'/').replace('theme/darling/src/',''),sel,decls:[...new Set(decls)]});}}
console.log(rules.length+' rules with 2+ non-custom declarations');
const combo={};
const k=(a)=>a.join(' ; ');
for(const r of rules){ const d=[...r.decls].sort();
 for(let i=0;i<d.length;i++)for(let j=i+1;j<d.length;j++)for(let l=j+1;l<d.length;l++){
  const key=k([d[i],d[j],d[l]]);
  (combo[key]=combo[key]||[]).push(r);}}
const rows=Object.entries(combo).filter(([,v])=>v.length>=5)
 .map(([key,v])=>({key,n:v.length,files:new Set(v.map(x=>x.file)).size,v}))
 .filter(x=>x.files>=2)
 .sort((a,b)=>b.n-a.n||b.files-a.files);
/* drop triples that are subsets of a bigger, equally-common triple family */
const seen=new Set();const keep=[];
for(const r of rows){ const sig=r.v.map(x=>x.file+'|'+x.sel).sort().join('\n');
 if(seen.has(sig))continue; seen.add(sig); keep.push(r); }
console.log('\n=== the same three declarations, in five or more rules, in two or more files');
keep.slice(0,14).forEach(r=>{
 console.log('\n  '+r.n+' rules in '+r.files+' files:   '+r.key);
 r.v.slice(0,8).forEach(x=>console.log('        '+x.file+'  '+x.sel.slice(0,74)));
 if(r.v.length>8) console.log('        ...and '+(r.v.length-8)+' more');});