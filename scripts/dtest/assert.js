#!/usr/bin/env node
/* The assertions. Everything here reads capture.json and the source; nothing
 * here opens a browser, so it is fast and it cannot flake.
 *
 * ALLOW LISTS, NOT THRESHOLDS. Where a check has known exceptions they are
 * named individually in dtest/allow.json with a reason, the same way
 * frozen-paint.allow.json and matrix.allow.json work. A count-based threshold
 * ("fewer than 10 contrast failures") lets a new failure hide behind a fixed
 * one; a named list makes every exception a decision somebody wrote down.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const P = require('./paths');
const cap = JSON.parse(fs.readFileSync(P.CAPTURE, 'utf8'));
const allow = fs.existsSync(P.ALLOW) ? JSON.parse(fs.readFileSync(P.ALLOW, 'utf8')) : {};
const A = (k) => new Set((allow[k] || []).map((e) => (typeof e === 'string' ? e : e.id)));

let failures = 0, checks = 0;
const fail = (group, msg) => { failures++; console.log('  FAIL  [' + group + '] ' + msg); };
const ok = (group, msg) => { console.log('  ok    [' + group + '] ' + msg); };
const head = (s) => console.log('\n== ' + s);

const renders = Object.entries(cap).filter(([, v]) => !v.error);
const errored = Object.entries(cap).filter(([, v]) => v.error);

// ---------------------------------------------------------------- 1. renders
head('the capture itself');
checks++;
if (errored.length > (allow.allowedFailedRenders || 0)) {
  fail('capture', errored.length + ' renders failed: ' + errored.map(([k]) => k).join(', '));
} else ok('capture', renders.length + ' renders, ' + errored.length + ' failed (allowed ' + (allow.allowedFailedRenders || 0) + ')');

// ------------------------------------------------------------- 2. overflow
// The one invariant with no legitimate exception: a page must not scroll
// sideways. The capture already excludes children of real scroll containers.
head('horizontal overflow');
for (const [key, d] of renders) {
  checks++;
  if (d.scrollW > d.clientW + 1) fail('overflow', key + ' scrolls sideways: ' + d.scrollW + ' > ' + d.clientW);
}
const offenders = renders.flatMap(([k, d]) => (d.overflow || []).map((o) => ({ k, o })))
  .filter(({ o }) => !A('overflow').has(o.c.split(' ')[0]));
if (offenders.length) {
  const byCls = {};
  for (const { k, o } of offenders) (byCls[o.c.split(' ')[0] || o.t] = byCls[o.c.split(' ')[0] || o.t] || []).push(k);
  for (const [cls, keys] of Object.entries(byCls))
    fail('overflow', cls + ' sticks out on ' + keys.length + ' renders (' + keys[0] + ' ...)');
} else ok('overflow', 'no element outside the viewport on any of ' + renders.length + ' renders');

// -------------------------------------------------------- 3. engine parity
// The properties that must agree between engines. Geometry is excluded: font
// metrics differ legitimately, and a 1px box difference is not a defect.
head('engine parity');
const PARITY = ['fw', 'ff', 'color', 'bg', 'radius', 'display'];
// Two engines resolving the same oklab() disagree in the fifth decimal - the
// .d-trust surface came back as 0.908732 in chromium and 0.908806 in webkit.
// That is float noise, not a defect, and a check that reports it is a check
// people learn to ignore. Compare numbers numerically, everything else exactly.
const NUM = /-?\d+(\.\d+)?/g;
function sameEnough(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const shapeA = String(a).replace(NUM, '#'), shapeB = String(b).replace(NUM, '#');
  if (shapeA !== shapeB) return false;
  const na = String(a).match(NUM) || [], nb = String(b).match(NUM) || [];
  if (na.length !== nb.length) return false;
  return na.every((v, i) => Math.abs(parseFloat(v) - parseFloat(nb[i])) <= 0.002);
}
const byVpPage = {};
for (const [key, d] of renders) {
  const [eng, vp, pg] = key.split('|');
  ((byVpPage[vp + '|' + pg] = byVpPage[vp + '|' + pg] || {})[eng]) = d.components;
}
let parityIssues = 0;
for (const [vpPage, engines] of Object.entries(byVpPage)) {
  const names = Object.keys(engines);
  if (names.length < 2) continue;
  const base = names[0];
  for (const cls of Object.keys(engines[base])) {
    if (A('parity').has(cls)) continue;
    for (const other of names.slice(1)) {
      if (!engines[other][cls]) continue;
      for (const p of PARITY) {
        checks++;
        const a = engines[base][cls][p], b = engines[other][cls][p];
        if (sameEnough(a, b)) continue;
        parityIssues++;
        fail('parity', vpPage + ' .' + cls + ' ' + p + ': ' + base + '=' + a + ' ' + other + '=' + b);
      }
    }
  }
}
if (!parityIssues) ok('parity', 'every component agrees across chromium, firefox and webkit');

// ------------------------------------------------------------- 4. contrast
head('contrast (WCAG 2.2 AA)');
const cSeen = new Map();
for (const [key, d] of renders) for (const c of d.contrast || []) {
  const id = c.fg + ' on ' + c.bg;
  if (!cSeen.has(id)) cSeen.set(id, { ...c, keys: [] });
  cSeen.get(id).keys.push(key);
}
let cFails = 0;
for (const [id, c] of cSeen) {
  checks++;
  if (A('contrast').has(id)) continue;
  cFails++;
  fail('contrast', c.ratio + ':1 needs ' + c.need + ' - ' + id + ' (' + c.size + ', .' + c.cls + ', ' + c.keys.length + ' renders)');
}
if (!cFails) ok('contrast', cSeen.size + ' distinct pairs, all passing or allow-listed');

// -------------------------------------------------------- 5. target size
head('target size (WCAG 2.2 AA, 24x24)');
const tSeen = new Map();
for (const [key, d] of renders) for (const t of d.smallTargets || []) {
  const id = t.t + '.' + t.c.split(' ')[0] + ' ' + t.w + 'x' + t.h;
  if (!tSeen.has(id)) tSeen.set(id, { ...t, keys: [] });
  tSeen.get(id).keys.push(key);
}
let tFails = 0;
for (const [id, t] of tSeen) {
  checks++;
  if (A('targets').has(id) || A('targets').has(t.t + '.' + t.c.split(' ')[0])) continue;
  tFails++;
  fail('targets', id + ' "' + t.label + '" on ' + t.keys.length + ' renders');
}
if (!tFails) ok('targets', tSeen.size + ' distinct small targets, all allow-listed');

// ---------------------------------------------------- 6. tokens, statically
head('tokens');
const SRC = P.SRC;
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : (e.name.endsWith('.css') ? [path.join(dir, e.name)] : []));
const declared = new Set(), referenced = new Map();
for (const f of walk(SRC)) {
  const css = strip(fs.readFileSync(f, 'utf8'));
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/g)) declared.add(m[1]);
  // a var() WITH a fallback cannot void its declaration, so it is not a risk
  for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/g))
    if (m[2] === ')') referenced.set(m[1], path.relative(SRC, f));
}
let dangling = 0;
for (const [tok, file] of referenced) {
  checks++;
  if (declared.has(tok) || /^--wp--/.test(tok) || A('runtimeVars').has(tok)) continue;
  dangling++;
  fail('tokens', tok + ' used with NO fallback in ' + file + ' and declared nowhere - the whole declaration is void');
}
if (!dangling) ok('tokens', declared.size + ' declared, ' + referenced.size + ' referenced without a fallback, none dangling');

// --------------------------------------------------------- 7. layer order
head('layer order');
const build = fs.readFileSync(P.BUILD, 'utf8');
const stmt = (build.match(/@layer\s+([^;]+);/) || [])[1];
const declaredLayers = stmt ? stmt.split(',').map((s) => s.trim()) : [];
const usedLayers = [...new Set([...build.matchAll(/@layer\s+([a-z-]+)\s*\{/g)].map((m) => m[1]))];
checks++;
const late = usedLayers.filter((l) => !declaredLayers.includes(l));
if (late.length) fail('layers', 'declared only by first use, so LAST and strongest: ' + late.join(', '));
else ok('layers', declaredLayers.length + ' layers, all named up front, in order: ' + declaredLayers.join(' < '));
checks++;
if (declaredLayers[0] !== 'fallback') fail('layers', 'fallback must be the FIRST and weakest layer, but the order starts with ' + declaredLayers[0]);
else ok('layers', 'fallback is the weakest layer, as its own header promises');

// ------------------------------------------------------------ 8. the budget
head('budget');
const gz = zlib.gzipSync(build).length, br = zlib.brotliCompressSync(build).length;
const B = allow.budget || {};
const budgets = [
  ['css raw KB', build.length / 1024, B.cssRawKB],
  ['css gzip KB', gz / 1024, B.cssGzipKB],
  ['css brotli KB', br / 1024, B.cssBrotliKB],
  ['rule blocks', (strip(build).match(/\{/g) || []).length, B.ruleBlocks],
  ['!important', (strip(build).match(/!important/g) || []).length, B.important],
];
for (const [name, actual, limit] of budgets) {
  checks++;
  const v = Math.round(actual * 10) / 10;
  if (limit == null) { ok('budget', name + ' = ' + v + ' (no budget set)'); continue; }
  if (v > limit) fail('budget', name + ' = ' + v + ', budget ' + limit);
  else ok('budget', name + ' = ' + v + ' <= ' + limit);
}

// -------------------------------------------- 9. contrast the probe cannot judge
head('contrast that needs a human');
const art = new Map();
for (const [key, d] of renders) for (const a of d.contrastOverArt || []) {
  const id = '.' + a.cls + ' ' + a.fg + ' ' + a.over;
  if (!art.has(id)) art.set(id, { ...a, n: 0 });
  art.get(id).n++;
}
if (art.size) {
  console.log('  ' + art.size + ' text/background pairs sit over a gradient, an image or a');
  console.log('  semi-transparent surface. No number is computed for these ON PURPOSE - an');
  console.log('  invented one is worse than none - so they are listed for a person to look at:');
  for (const [id, a] of [...art].slice(0, 12)) console.log('     ' + id + '   "' + a.txt + '" ' + a.size);
} else ok('contrast-art', 'no text over an unmeasurable background');

// ------------------------------------------------------------------ verdict
console.log('\n' + checks + ' checks, ' + failures + ' failed');
if (failures) { console.log('DTEST FAIL'); process.exit(1); }
console.log('dtest: the design system measures as designed.');
