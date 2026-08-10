/* THE DEQUEUE TRIAGE WORKLIST.
 *
 * unclaimed.js counted 566 declarations that only THEY set - properties we
 * never mention, on elements we do style. Layer order cannot touch those: a
 * layer ranks declarations of the same property and has no opinion about a
 * property one side never declares. So demoting their sheets into layer(wc)
 * would leave all 566 in force. The decision is removal, and the question this
 * script answers is the only one that matters for removal:
 *
 *   WHICH OF THE 566 IS LOAD-BEARING?
 *
 * Not by taste. By ablation. Each page is rendered twice in one load - once as
 * it is, once in the TARGET STATE - and every visible element is compared
 * property by property. A declaration whose removal moves nothing is one we can
 * let go; a declaration whose removal moves something is one we must write
 * before the sheet leaves.
 *
 * THE TARGET STATE, precisely:
 *   - darling.build.css                     stays (it is ours)
 *   - the four keepers                      stay, as machinery we adopt
 *       skip link, interactivity router, Stripe x4, PhotoSwipe x2, select2,
 *       img-auto-sizes
 *   - global-styles                         KEPT BUT STRIPPED to the two things
 *       only it can do: the --wp--preset--* custom properties that core block
 *       markup references, and the @font-face registrations. Every rule of
 *       opinion in it goes, including the block-flow spacing that is currently
 *       setting the vertical rhythm of every page.
 *   - everything else                       off
 *
 * *** THE STRIP IS NOT A GUESS AND IT IS NOT A REGEX OVER TEXT. *** It walks
 * global-styles' own CSSOM, keeps @font-face whole, and from every other rule
 * keeps only the declarations whose property name begins with `--`. If it kept
 * a rule it should not have, the AFTER state would understate the damage, so it
 * reports what it kept and what it dropped.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const serve = require('./dtest/serve');

const PAGES = ['home', 'shop', 'product', 'cart', 'checkout', 'account', 'page', 'blog', 'notfound'];

/* Machinery we keep, by stylesheet id. Each is here because removing it breaks
 * a mechanism rather than a decoration - the stylesheet IS the widget. */
const KEEP = [
  'wp-block-template-skip-link-inline-css',   // the accessibility skip link
  'wp-interactivity-router-animations-inline-css',
  'wp-img-auto-sizes-contain-inline-css',
  'wc-stripe-blocks-checkout-style-css', 'wc-stripe-upe-classic-css',
  'wc_stripe_express_checkout_style-css', 'stripelink_styles-css',
  'photoswipe-css', 'photoswipe-default-skin-css',
  'select2-css',
];

const RUN = (KEEP) => {
  // ---- 1. read the cascade -------------------------------------------------
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
      if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--;
      else if (ch === ',' && d === 0) { out.push(sel.slice(st, i).trim()); st = i + 1; }
    }
    out.push(sel.slice(st).trim());
    return out.filter(Boolean);
  };
  const EXPAND = new Map(); const scratch = document.createElement('div');
  const expandOf = (n) => {
    if (EXPAND.has(n)) return EXPAND.get(n);
    scratch.style.cssText = '';
    try { scratch.style.setProperty(n, 'var(--probe)'); } catch (e) {}
    const p = [...scratch.style].filter(x => x !== n); EXPAND.set(n, p); return p;
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
    for (const p of s) { const v = s.getPropertyValue(p); if (v !== '') m[p] = v; }
    for (const n of namesIn(s.cssText)) {
      if (m[n] !== undefined) continue;
      const L = expandOf(n); if (!L.length) continue;
      const v = s.getPropertyValue(n); if (v === '') continue;
      for (const x of L) if (m[x] === undefined) m[x] = v;
    }
    return m;
  };

  /* Some plugins print an inline <style> with no id at all (Nextend's social
   * login is one). Collapsing those to "inline" made four different owners look
   * like one, so an anonymous block is named by its first selector. */
  const sheetId = (sh) => {
    if (sh.ownerNode && sh.ownerNode.id) return sh.ownerNode.id;
    if (sh.href) return sh.href.split('/').pop().split('?')[0];
    let first = '?', faces = 0, n = 0;
    try { for (const r of sh.cssRules) { n++;
      if (r.constructor && r.constructor.name === 'CSSFontFaceRule') { faces++; continue; }
      if (r.selectorText && first === '?') first = r.selectorText.split(',')[0].trim(); } } catch (e) {}
    /* *** A SHEET THAT IS NOTHING BUT @font-face IS REGISTRATION, NOT OPINION. ***
     * WordPress prints the font library's seven @font-face blocks in their own
     * inline <style> with NO id - separate from global-styles. The first run of
     * this script switched it off along with everything else anonymous, so the
     * AFTER state was measured with the site's fonts missing and every metric
     * that depends on them was wrong. Named so it can be recognised, and kept
     * by FONTS_ARE_MACHINERY below. */
    if (faces && faces === n) return 'inline<@font-face x' + faces + '>';
    return 'inline<' + first.slice(0, 34) + '>';
  };

  const rules = [];
  for (const sh of document.styleSheets) {
    let top; try { top = sh.cssRules; } catch (e) { continue; }
    const id = sheetId(sh);
    const ours = /darling\.build\.css/.test(sh.href || '');
    const walk = (list, layer, media) => {
      for (const r of list) {
        if (r.type === 4 || (r.media && r.cssRules)) { walk(r.cssRules, layer, r.conditionText); continue; }
        if (r.cssRules && r.selectorText === undefined) { walk(r.cssRules, r.name !== undefined ? (r.name || '(anon)') : layer, media); continue; }
        if (!r.selectorText) continue;
        if (media) { try { if (!window.matchMedia(media).matches) continue; } catch (e) {} }
        rules.push({ id, ours, layer: layer === undefined ? null : layer,
                     branches: splitList(r.selectorText).map(b => ({ b, s: specOf(b) })), decl: flatten(r.style) });
      }
    };
    walk(top, undefined, '');
  }
  if (!rules.some(r => r.ours)) return { blind: true };

  const noise = new Set(['cursor', 'box-sizing', 'pointer-events', 'user-select', 'touch-action',
    'appearance', 'speak', 'unicode-bidi', 'direction', 'isolation', 'will-change',
    'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay',
    'backface-visibility', 'transform-style']);
  const skipProp = (p) => p.startsWith('-webkit-') || p.startsWith('-moz-') || p.startsWith('--') || noise.has(p);

  // ---- 2. per element, the properties only THEY set ------------------------
  const els = [...document.querySelectorAll('body *')];
  const owners = [];              // owners[i] = { prop -> {id, sel, val} }
  const watch = new Set();        // every property we will have to compare
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) { owners.push(null); continue; }
    const matched = [];
    for (let k = 0; k < rules.length; k++) {
      const R = rules[k]; let best = -1, hit = '';
      for (const { b, s } of R.branches) {
        let m = false; try { m = el.matches(b); } catch (e) { continue; }
        if (m && s > best) { best = s; hit = b; }
      }
      if (best >= 0) matched.push({ ...R, k, spec: best, hitSel: hit });
    }
    const ourProps = new Set();
    for (const m of matched) if (m.ours) for (const p in m.decl) ourProps.add(p);
    const map = Object.create(null);
    for (const m of matched) {
      if (m.ours) continue;
      for (const p in m.decl) {
        if (skipProp(p) || ourProps.has(p)) continue;
        const rank = (m.layer === null ? 1e12 : 0) + m.spec * 1e3 + m.k / 1e6;
        if (!map[p] || rank >= map[p].rank)
          map[p] = { rank, id: m.id, sel: m.hitSel.slice(0, 70), val: String(m.decl[p]).slice(0, 40) };
      }
    }
    for (const p in map) watch.add(p);
    owners.push(map);
  }

  const snap = () => {
    const props = [...watch];
    const rows = [];
    for (let i = 0; i < els.length; i++) {
      if (!owners[i]) { rows.push(null); continue; }
      const c = getComputedStyle(els[i]); const r = els[i].getBoundingClientRect();
      const o = { _r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
      for (const p of props) o[p] = c.getPropertyValue(p);
      rows.push(o);
    }
    return rows;
  };
  const before = snap();

  // ---- 3. the cutover ------------------------------------------------------
  const keep = new Set(KEEP);
  const off = [], kept = [], gsKeptRules = [];
  let gsDropped = 0;
  /* *** document.styleSheets IS LIVE. *** The first run appended the stripped
   * sheet inside this loop, the loop then reached it and disabled it, and the
   * AFTER state lost the preset variables entirely. Snapshot first. */
  for (const sh of [...document.styleSheets]) {
    const id = sheetId(sh);
    if (/darling\.build\.css/.test(sh.href || '')) { kept.push(id); continue; }
    if (keep.has(id)) { kept.push(id); continue; }
    if (/^inline<@font-face/.test(id)) { kept.push(id + ' [FONTS_ARE_MACHINERY]'); continue; }
    if (id === 'global-styles-inline-css') {
      // keep ONLY @font-face whole, and the custom properties from every other rule
      let list; try { list = sh.cssRules; } catch (e) { list = []; }
      const out = []; let ff = 0;
      const walk = (l) => {
        for (const r of l) {
          if (r.constructor && r.constructor.name === 'CSSFontFaceRule') { out.push(r.cssText); ff++; continue; }
          /* *** A CSSStyleRule HAS .cssRules IN CHROME. *** Nesting support gives
           * every style rule an empty CSSRuleList, so `if (r.cssRules) recurse`
           * walked into all of them and read none. The first run of this script
           * reported "kept 0 var rules, dropped 0" - a strip that stripped
           * everything - and the AFTER state therefore had no --wp--preset--*
           * at all, i.e. it measured a harsher cutover than the one we plan.
           * Guard on selectorText being ABSENT, the way the main walk does. */
          if (r.cssRules && r.selectorText === undefined) { walk(r.cssRules); continue; }
          if (!r.selectorText) continue;
          const vars = [];
          for (const p of r.style) if (p.startsWith('--')) vars.push(p + ':' + r.style.getPropertyValue(p));
          if (vars.length) { out.push(r.selectorText + '{' + vars.join(';') + '}'); gsKeptRules.push(r.selectorText); }
          else gsDropped++;
        }
      };
      walk(list);
      sh.disabled = true;
      const s = document.createElement('style');
      s.id = 'global-styles-stripped';
      s.textContent = out.join('\n');
      document.head.appendChild(s);
      off.push(id + ' (STRIPPED: kept ' + gsKeptRules.length + ' custom-property rules and ' + ff + ' @font-face, dropped ' + gsDropped + ' rules of opinion)');
      continue;
    }
    try { sh.disabled = true; off.push(id); } catch (e) {}
  }

  const after = snap();

  // ---- 4. attribute every movement to the declaration that owned it --------
  const moved = [], still = [];
  for (let i = 0; i < els.length; i++) {
    if (!owners[i]) continue;
    const b = before[i], a = after[i];
    const geo = b._r.join(',') !== a._r.join(',');
    for (const p in owners[i]) {
      const w = owners[i][p];
      const rec = { prop: p, id: w.id, sel: w.sel, val: w.val, was: String(b[p]).slice(0, 34), now: String(a[p]).slice(0, 34), geo };
      if (b[p] !== a[p]) moved.push(rec); else still.push(rec);
    }
  }
  const shifted = before.filter((b, i) => b && after[i] && b._r.join(',') !== after[i]._r.join(',')).length;
  return { moved, still, off, kept, shifted, elements: before.filter(Boolean).length };
};

(async () => {
  const { server, port } = await serve.start(path.join(__dirname, 'mirror'));
  const b = await chromium.launch();
  const M = [], S = [];
  let offSeen = null, keptSeen = null;
  for (const vw of [390, 1240]) {
    const p = await b.newPage({ viewport: { width: vw, height: 900 } });
    for (const name of PAGES) {
      try {
        await p.goto('http://127.0.0.1:' + port + '/' + name + '.html', { waitUntil: 'load', timeout: 40000 });
        await p.waitForTimeout(1000);
        const r = await p.evaluate(RUN, KEEP);
        if (r.blind) { console.log('  !! ' + name + '@' + vw + ' cannot see our sheet'); continue; }
        offSeen = offSeen || r.off; keptSeen = keptSeen || r.kept;
        console.log('  ' + name.padEnd(9) + '@' + vw + '  ' + String(r.elements).padStart(4) + ' elements, ' +
          String(r.shifted).padStart(4) + ' MOVE, ' + String(r.moved.length).padStart(4) + ' properties change, ' +
          String(r.still.length).padStart(4) + ' unaffected');
        for (const x of r.moved) M.push({ ...x, page: name, vw });
        for (const x of r.still) S.push({ ...x, page: name, vw });
      } catch (e) { console.log('  skip ' + name + '@' + vw + ' ' + String(e.message).slice(0, 60)); }
    }
    await p.close();
  }
  await b.close(); server.close();

  console.log('\nKEPT ON THE PAGE: ' + (keptSeen || []).join(', '));
  console.log('SWITCHED OFF:     ' + (offSeen || []).join(', ') + '\n');

  const key = s => s.id + '|' + s.sel + '|' + s.prop;
  const roll = (arr) => {
    const m = new Map();
    for (const s of arr) {
      if (!m.has(key(s))) m.set(key(s), { ...s, n: 0, pages: new Set(), geo: false });
      const x = m.get(key(s)); x.n++; x.pages.add(s.page); x.geo = x.geo || s.geo;
    }
    return [...m.values()];
  };
  const claim = roll(M), letgo = roll(S);
  // a property that moves anywhere must be claimed, even if it is inert elsewhere
  const claimKeys = new Set(claim.map(key));
  const safe = letgo.filter(s => !claimKeys.has(key(s)));

  fs.writeFileSync(path.join(__dirname, 'triage.json'), JSON.stringify({ claim, safe }));
  console.log('CLAIM (must be written before the sheet goes): ' + claim.length + ' distinct');
  console.log('LET GO (removal changes nothing measurable):   ' + safe.length + ' distinct\n');

  const byOwner = {};
  for (const s of claim) byOwner[s.id] = (byOwner[s.id] || 0) + 1;
  console.log('CLAIM, BY OWNER');
  for (const [k, v] of Object.entries(byOwner).sort((a, b) => b[1] - a[1]))
    console.log('  ' + String(v).padStart(4) + '  ' + k);

  console.log('\nCLAIM, BY REACH (top 30)');
  for (const s of claim.sort((a, b) => b.n - a.n).slice(0, 30))
    console.log('  ' + String(s.n).padStart(4) + 'x ' + (s.geo ? 'MOVES ' : '      ') + s.prop.padEnd(20) +
      s.was.padEnd(22) + '-> ' + s.now.padEnd(20) + '  ' + s.id.slice(0, 30).padEnd(30) + ' ' + s.sel.slice(0, 40));
})();
