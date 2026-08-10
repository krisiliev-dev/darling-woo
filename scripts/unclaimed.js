/* THE OTHER HALF OF THE LEDGER: PROPERTIES ONLY THEY SET.
 *
 * seams.js measures CONTESTED properties - both sides declare, one wins. Layer
 * order decides those. But the owner asked the sharper question:
 *
 *   "if we miss declaring something, their rule applies to that missed thing"
 *
 * and that is exactly right, and layers do nothing about it. A cascade layer is
 * a TIE-BREAKER, not a filter. It ranks declarations of the same property; it
 * has no opinion at all about a property only one side declares. Put every
 * WooCommerce sheet in layer(wc) below us and the page is still wearing every
 * declaration of theirs we never thought to name - unopposed, because we never
 * turned up.
 *
 * So this counts the opposite of a seam: for every visible element on a
 * reachable page, the properties where a FOREIGN rule wins and WE DECLARE
 * NOTHING. That number is what a "demote instead of remove" plan actually
 * leaves on the page, and it is the number the decision should be made on.
 *
 * Same instrument corrections as seams.js: served over http so the CSSOM is
 * readable, per-branch specificity, shorthands flattened through their
 * longhands. Different question.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const serve = require('./dtest/serve');

const PAGES = ['home', 'shop', 'product', 'cart', 'checkout', 'account', 'page', 'blog', 'notfound'];

const WALK = () => {
  const specOf = (sel) => {
    let a = 0, b = 0, c = 0, s = sel;
    for (let g = 0; g < 12; g++) {
      const m = s.match(/:(where|is|not|has|matches|-webkit-any)\(([^()]*)\)/);
      if (!m) break;
      if (m[1] !== 'where') {
        let best = 0;
        for (const arg of m[2].split(',')) best = Math.max(best, specOf(arg.trim()));
        a += Math.floor(best / 1e6); b += Math.floor(best / 1e3) % 1e3; c += best % 1e3;
      }
      s = s.slice(0, m.index) + s.slice(m.index + m[0].length);
    }
    a += (s.match(/#[\w-]+/g) || []).length;
    b += (s.match(/\.[\w-]+/g) || []).length + (s.match(/\[[^\]]*\]/g) || []).length +
         (s.match(/(?<!:):(?!:)[a-z-]+/gi) || []).length;
    c += (s.match(/::[a-z-]+/gi) || []).length + (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
    return a * 1e6 + b * 1e3 + c;
  };
  const splitList = (sel) => {
    const out = []; let d = 0, q = '', st = 0;
    for (let i = 0; i < sel.length; i++) {
      const ch = sel[i];
      if (q) { if (ch === q && sel[i - 1] !== '\\') q = ''; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === '(' || ch === '[') d++;
      else if (ch === ')' || ch === ']') d--;
      else if (ch === ',' && d === 0) { out.push(sel.slice(st, i).trim()); st = i + 1; }
    }
    out.push(sel.slice(st).trim());
    return out.filter(Boolean);
  };
  const EXPAND = new Map();
  const scratch = document.createElement('div');
  const expandOf = (n) => {
    if (EXPAND.has(n)) return EXPAND.get(n);
    scratch.style.cssText = '';
    try { scratch.style.setProperty(n, 'var(--probe)'); } catch (e) {}
    const p = [...scratch.style].filter(x => x !== n);
    EXPAND.set(n, p); return p;
  };
  const namesIn = (t) => {
    const out = []; let d = 0, q = '', st = 0, col = -1;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === q && t[i - 1] !== '\\') q = ''; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === '(') d++; else if (ch === ')') d--;
      else if (ch === ':' && d === 0 && col < 0) col = i;
      else if (ch === ';' && d === 0) { if (col > st) out.push(t.slice(st, col).trim()); st = i + 1; col = -1; }
    }
    if (col > st) out.push(t.slice(st, col).trim());
    return out;
  };
  const flatten = (s) => {
    const m = Object.create(null);
    for (const p of s) { const v = s.getPropertyValue(p); if (v !== '') m[p] = { val: v, imp: s.getPropertyPriority(p) === 'important' }; }
    for (const n of namesIn(s.cssText)) {
      if (m[n] !== undefined) continue;
      const L = expandOf(n); if (!L.length) continue;
      const v = s.getPropertyValue(n); if (v === '') continue;
      const imp = s.getPropertyPriority(n) === 'important';
      for (const x of L) if (m[x] === undefined) m[x] = { val: v, imp, via: n };
    }
    return m;
  };

  const rules = [];
  for (const sh of document.styleSheets) {
    let top; try { top = sh.cssRules; } catch (e) { continue; }
    const href = sh.href || '';
    const name = href ? href.split('/').pop().split('?')[0] : 'inline:' + ((sh.ownerNode && sh.ownerNode.id) || 'style');
    const ours = /darling\.build\.css/.test(href);
    const walk = (list, layer, media) => {
      for (const r of list) {
        if (r.type === 4 || (r.media && r.cssRules)) { walk(r.cssRules, layer, r.conditionText); continue; }
        if (r.cssRules && r.selectorText === undefined) { walk(r.cssRules, r.name !== undefined ? (r.name || '(anon)') : layer, media); continue; }
        if (!r.selectorText) continue;
        if (media) { try { if (!window.matchMedia(media).matches) continue; } catch (e) {} }
        rules.push({ name, ours, layer: layer === undefined ? null : layer,
                     branches: splitList(r.selectorText).map(b => ({ b, s: specOf(b) })), decl: flatten(r.style) });
      }
    };
    walk(top, undefined, '');
  }
  if (!rules.some(r => r.ours)) return { blind: true };

  /* Properties the browser applies to everything and nobody designs with, plus
   * the ones an author sets for behaviour rather than appearance. Excluded so
   * the count is about DESIGN rather than about how many properties exist. */
  const noise = new Set(['cursor', 'box-sizing', 'pointer-events', 'user-select', 'touch-action',
    'appearance', 'outline-offset', 'speak', 'unicode-bidi', 'direction', 'isolation',
    'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay',
    'will-change', 'backface-visibility', 'transform-style', 'contain-intrinsic-size', 'content-visibility']);
  const skip = (p) => p.startsWith('-webkit-') || p.startsWith('-moz-') || p.startsWith('--');

  const pathOf = (el) => {
    const b = [];
    for (let e = el; e && e.nodeType === 1 && b.length < 3; e = e.parentElement) {
      const c = String(e.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      b.unshift(e.tagName.toLowerCase() + (c ? '.' + c : ''));
    }
    return b.join(' > ');
  };

  const out = [];
  let visible = 0, claimed = 0, untouched = 0;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    visible++;

    const matched = [];
    for (let i = 0; i < rules.length; i++) {
      const R = rules[i];
      let best = -1, hit = '';
      for (const { b, s } of R.branches) {
        let m = false; try { m = el.matches(b); } catch (e) { continue; }
        if (m && s > best) { best = s; hit = b; }
      }
      if (best >= 0) matched.push({ ...R, i, spec: best, hitSel: hit });
    }
    const mine = matched.filter(m => m.ours);
    if (mine.length) claimed++; else if (matched.length) untouched++;

    // what WE declare on this element, at all
    const ourProps = new Set();
    for (const m of mine) for (const p in m.decl) ourProps.add(p);

    // every property a foreign rule declares here that we never mention
    const perProp = new Map();
    for (const m of matched) {
      if (m.ours) continue;
      for (const p in m.decl) {
        if (skip(p) || noise.has(p) || ourProps.has(p)) continue;
        const d = m.decl[p];
        const rank = (d.imp ? 1e15 : 0) + (m.layer === null ? 1e12 : 0) + m.spec * 1e3 + m.i / 1e6;
        const cur = perProp.get(p);
        if (!cur || rank >= cur.rank) perProp.set(p, { rank, name: m.name, sel: m.hitSel, val: d.val });
      }
    }
    for (const [p, w] of perProp) {
      out.push({ prop: p, owner: w.name, sel: w.sel.slice(0, 70), val: String(w.val).slice(0, 34),
                 el: pathOf(el), weClaim: mine.length > 0 });
    }
  }
  return { out, visible, claimed, untouched };
};

(async () => {
  const { server, port } = await serve.start(path.join(__dirname, 'mirror'));
  const b = await chromium.launch();
  const all = [];
  let V = 0, C = 0, U = 0;
  for (const vw of [390, 1240]) {
    const p = await b.newPage({ viewport: { width: vw, height: 900 } });
    for (const name of PAGES) {
      try {
        await p.goto('http://127.0.0.1:' + port + '/' + name + '.html', { waitUntil: 'load', timeout: 40000 });
        await p.waitForTimeout(1000);
        const r = await p.evaluate(WALK);
        if (r.blind) { console.log('  !! ' + name + '@' + vw + ' cannot see our sheet'); continue; }
        if (vw === 1240) { V += r.visible; C += r.claimed; U += r.untouched; }
        console.log('  ' + name.padEnd(9) + '@' + vw + '  ' + String(r.visible).padStart(4) + ' visible, ' +
          String(r.claimed).padStart(4) + ' we touch, ' + String(r.untouched).padStart(4) +
          ' dressed ONLY by them, ' + String(r.out.length).padStart(5) + ' unclaimed declarations');
        for (const x of r.out) all.push({ ...x, page: name, vw });
      } catch (e) { console.log('  skip ' + name + '@' + vw + ' ' + String(e.message).slice(0, 50)); }
    }
    await p.close();
  }
  await b.close(); server.close();
  fs.writeFileSync(path.join(__dirname, 'unclaimed.json'), JSON.stringify(all));

  const key = s => s.owner + '|' + s.sel + '|' + s.prop;
  const u = new Map();
  for (const s of all) { if (!u.has(key(s))) u.set(key(s), { ...s, n: 0 }); u.get(key(s)).n++; }
  const list = [...u.values()];
  console.log('\nAt 1240 across nine pages: ' + V + ' visible elements, ' + C + ' carry at least one rule of ours, ' +
    U + ' are dressed ONLY by somebody else.');
  console.log(all.length + ' unclaimed declarations, ' + list.length + ' distinct (owner + selector + property).\n');

  const tally = (label, fn, arr, n) => {
    const m = {};
    for (const s of arr) m[fn(s)] = (m[fn(s)] || 0) + 1;
    console.log(label);
    for (const [k, v] of Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n || 99))
      console.log('  ' + String(v).padStart(5) + '  ' + k);
    console.log('');
  };
  tally('WHO DRESSES WHAT WE NEVER NAMED (distinct)', s => s.owner, list, 16);
  tally('WHAT THEY SET THAT WE NEVER MENTION (distinct)', s => s.prop, list, 25);
  tally('ON ELEMENTS WE DO TOUCH vs DO NOT', s => (s.weClaim ? 'we style this element, but not this property'
                                                            : 'we have no rule on this element at all'), list);
})();
