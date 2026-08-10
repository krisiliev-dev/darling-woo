/* THE SEAM INVENTORY.
 *
 * A seam is any place where one of OUR rules matches an element and a rule from
 * somebody else - WordPress, WooCommerce, a plugin - wins the property anyway.
 *
 * There is one structural reason it happens and it is worth stating plainly:
 * every rule we author lives inside a cascade LAYER, and every rule anybody else
 * puts on the page is UNLAYERED. Unlayered author CSS outranks every layer,
 * whatever the specificity. So at a seam we do not lose a fight, we forfeit one.
 *
 * *** IT MUST BE SERVED, NOT OPENED. *** On file:// every linked stylesheet is
 * cross-origin, sheet.cssRules throws, and this walk sees only inline <style> -
 * which is exactly how the first run reported 0 seams on pages that visibly
 * have them. dtest/serve.js makes the mirror same-origin.
 *
 * Three things this version does that the first one did not, each because the
 * first one under-reported:
 *
 *   1. NO `d-` FILTER. The criterion for "we claim this element" is that one of
 *      our rules matches it, not that it wears one of our class names. Half our
 *      system dresses somebody else's markup by their class name.
 *   2. LONGHANDS, NOT A PROPERTY LIST. `rule.style` enumerates the longhands a
 *      shorthand expands to (verified: `margin:0` enumerates as four
 *      margin-* entries), so iterating it catches `margin` vs `margin-top` and
 *      `gap` vs `row-gap` collisions that a fixed list of names cannot see.
 *   3. ACTIVE vs LATENT, MEASURED. A defeat where their value happens to equal
 *      ours changes nothing on screen today. It is still a seam - they own the
 *      property and can move it out from under us - but it is not a bug, and
 *      mixing the two makes the count useless. Each defeat is settled by
 *      putting OUR value on the element inline-important and seeing whether the
 *      computed value moves.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const serve = require('./dtest/serve');

const PAGES = ['home', 'shop', 'product', 'cart', 'checkout', 'account', 'page', 'blog', 'notfound'];

const WALK = () => {
  /* Specificity, with the three functional pseudo-classes that change it:
   *   :where(...)  contributes ZERO, whatever is inside it
   *   :is/:not/:has contribute the HIGHEST specificity of their arguments
   * The first version stripped all of them and counted the insides, which
   * inflated `:root :where(.is-layout-flex)` from (0,0,1) to (0,1,1) and would
   * have mislabelled why we lost. */
  const specOf = (sel) => {
    let a = 0, b = 0, c = 0;
    let s = sel;
    // resolve functional pseudo-classes innermost-first
    for (let guard = 0; guard < 12; guard++) {
      const m = s.match(/:(where|is|not|has|matches|-webkit-any)\(([^()]*)\)/);
      if (!m) break;
      let rep = '';
      if (m[1] !== 'where') {
        let best = [0, 0, 0];
        for (const arg of m[2].split(',')) {
          const t = specOf(arg.trim());
          const v = [Math.floor(t / 1e6), Math.floor(t / 1e3) % 1e3, t % 1e3];
          if (v[0] * 1e6 + v[1] * 1e3 + v[2] > best[0] * 1e6 + best[1] * 1e3 + best[2]) best = v;
        }
        a += best[0]; b += best[1]; c += best[2];
      }
      s = s.slice(0, m.index) + rep + s.slice(m.index + m[0].length);
    }
    a += (s.match(/#[\w-]+/g) || []).length;
    b += (s.match(/\.[\w-]+/g) || []).length;
    b += (s.match(/\[[^\]]*\]/g) || []).length;
    b += (s.match(/(?<!:):(?!:)[a-z-]+/gi) || []).length;
    c += (s.match(/::[a-z-]+/gi) || []).length;
    c += (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
    return a * 1e6 + b * 1e3 + c;
  };

  /* *** A SHORTHAND WRITTEN WITH A var() IS INVISIBLE TO getPropertyValue. ***
   * `border-radius: var(--radius-m)` cannot be expanded at parse time, so CSSOM
   * stores it "pending substitution": `[...rule.style]` still ENUMERATES the four
   * border-*-radius longhands, but each one reads back as the empty string, and
   * only the shorthand name reads back at all. Since practically every
   * declaration we write is a token, that blind spot fell on OUR side of the
   * ledger and nowhere else - the run before this one silently dropped 8 to 25
   * declarations per page, all ours.
   *
   * So each rule is flattened ONCE into a longhand map, recovering the pending
   * shorthands from cssText. The shorthand -> longhand table is not hardcoded; it
   * is asked of the browser, by setting the shorthand to a var() on a scratch
   * element and reading back what it enumerates. */
  const EXPAND = new Map();
  const scratch = document.createElement('div');
  const expandOf = (name) => {
    if (EXPAND.has(name)) return EXPAND.get(name);
    scratch.style.cssText = '';
    try { scratch.style.setProperty(name, 'var(--seam-probe)'); } catch (e) { /* not a property */ }
    const parts = [...scratch.style].filter(x => x !== name);
    EXPAND.set(name, parts);
    return parts;
  };
  // the property names a rule declares, read off its own serialisation
  const namesIn = (cssText) => {
    const out = [];
    let depth = 0, quote = '', start = 0, colon = -1;
    for (let i = 0; i < cssText.length; i++) {
      const ch = cssText[i];
      if (quote) { if (ch === quote && cssText[i - 1] !== '\\') quote = ''; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ':' && depth === 0 && colon < 0) colon = i;
      else if (ch === ';' && depth === 0) {
        if (colon > start) out.push(cssText.slice(start, colon).trim());
        start = i + 1; colon = -1;
      }
    }
    if (colon > start) out.push(cssText.slice(start, colon).trim());
    return out;
  };
  /* *** SPECIFICITY IS PER BRANCH, NOT PER RULE. *** `.a .b .c, .d` has two
   * selectors and the one that matched is the only one that counts. Measuring
   * `specOf(rule.selectorText)` sums every branch in the list, which inflated
   * WooCommerce's long comma lists enormously and would have mislabelled a large
   * share of these defeats as "higher specificity" when they are nothing of the
   * kind. Split the list, keep the branches, and score only what matched. */
  const splitList = (sel) => {
    const out = []; let depth = 0, quote = '', start = 0;
    for (let i = 0; i < sel.length; i++) {
      const ch = sel[i];
      if (quote) { if (ch === quote && sel[i - 1] !== '\\') quote = ''; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      else if (ch === ',' && depth === 0) { out.push(sel.slice(start, i).trim()); start = i + 1; }
    }
    out.push(sel.slice(start).trim());
    return out.filter(Boolean);
  };

  const flatten = (st) => {
    const m = Object.create(null);
    for (const p of st) {
      const v = st.getPropertyValue(p);
      if (v !== '') m[p] = { val: v, imp: st.getPropertyPriority(p) === 'important', via: null };
    }
    for (const n of namesIn(st.cssText)) {
      if (m[n] !== undefined) continue;
      const longs = expandOf(n);
      if (!longs.length) continue;                 // not a shorthand
      const v = st.getPropertyValue(n);
      if (v === '') continue;
      const imp = st.getPropertyPriority(n) === 'important';
      for (const L of longs) if (m[L] === undefined || m[L].val === '') m[L] = { val: v, imp, via: n };
    }
    return m;
  };

  /* Collect every readable rule, tagged with its owner and its layer.
   * `layer === null` means UNLAYERED, which is the whole story. */
  const rules = [];
  const blocked = [];
  for (const sh of document.styleSheets) {
    let top; try { top = sh.cssRules; } catch (e) { blocked.push((sh.href || 'inline').split('/').pop()); continue; }
    const href = sh.href || '';
    const name = href ? href.split('/').pop().split('?')[0]
                      : 'inline:' + ((sh.ownerNode && sh.ownerNode.id) || 'style');
    const ours = /darling\.build\.css/.test(href);
    const walk = (list, layer, media) => {
      for (const r of list) {
        if (r.type === 4 || (r.media && r.cssRules)) { walk(r.cssRules, layer, r.conditionText); continue; }
        if (r.cssRules && r.selectorText === undefined) {
          // CSSLayerBlockRule has .name; @supports/@container do not
          walk(r.cssRules, r.name !== undefined ? (r.name || '(anon)') : layer, media);
          continue;
        }
        if (!r.selectorText) continue;
        if (media) { try { if (!window.matchMedia(media).matches) continue; } catch (e) { /* keep */ } }
        const branches = splitList(r.selectorText).map(b => ({ b, s: specOf(b) }));
        rules.push({ name, ours, layer: layer === undefined ? null : layer,
                     sel: r.selectorText, branches, decl: flatten(r.style) });
      }
    };
    walk(top, undefined, '');
  }

  const oursSeen = rules.filter(r => r.ours).length;

  // properties nobody should arbitrate on: vendor noise and WP's own variables
  const skip = (p) => p.startsWith('-webkit-') || p.startsWith('-moz-') || p.startsWith('--wp--');

  const pathOf = (el) => {
    const bits = [];
    for (let e = el; e && e.nodeType === 1 && bits.length < 4; e = e.parentElement) {
      const cls = String(e.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      bits.unshift(e.tagName.toLowerCase() + (cls ? '.' + cls : ''));
    }
    return bits.join(' > ');
  };

  const seams = [];
  const odd = [];
  const els = [...document.querySelectorAll('body *')];
  let claimed = 0;

  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;

    const matched = [];
    for (let i = 0; i < rules.length; i++) {
      const R = rules[i];
      let best = -1, bestSel = '';
      for (const { b, s: sp } of R.branches) {
        let m = false; try { m = el.matches(b); } catch (e) { continue; }
        if (m && sp > best) { best = sp; bestSel = b; }
      }
      if (best >= 0) matched.push({ ...R, i, spec: best, hitSel: bestSel });
    }
    if (!matched.some(s => s.ours)) continue;   // we do not claim this element
    claimed++;

    // every longhand OUR rules declare on this element, shorthands expanded
    const props = new Set();
    for (const s of matched) if (s.ours) for (const p in s.decl) if (!skip(p)) props.add(p);

    for (const p of props) {
      const decls = [];
      for (const s of matched) {
        const d = s.decl[p];
        if (d === undefined) continue;
        decls.push({ ...s, val: d.val, imp: d.imp, via: d.via });
      }
      if (decls.length < 2) continue;
      const foreign = decls.filter(d => !d.ours);
      if (!foreign.length) continue;

      // the cascade, in order: !important inverts, then unlayered beats layered,
      // then specificity, then document order
      const rank = (d) => (d.imp ? 1e15 : 0) + (d.layer === null ? 1e12 : 0) + d.spec * 1e3 + d.i / 1e6;
      const win = decls.reduce((a, d) => (rank(d) >= rank(a) ? d : a));
      if (win.ours) continue;
      const ourDecls = decls.filter(d => d.ours);
      /* This cannot be empty - `p` came out of one of OUR rules on this element.
       * The first time it was, the cause was pending-substitution shorthands
       * (see EXPAND above); it is kept as a tripwire, because a measurement that
       * quietly drops the cases it cannot read is worse than no measurement. */
      if (!ourDecls.length) { odd.push(p + ' @ ' + pathOf(el)); continue; }
      const mine = ourDecls.reduce((a, d) => (rank(d) >= rank(a) ? d : a));

      /* Does it actually change anything on screen? Put OUR value on the element
       * inline-important, which beats every rule on the page, and see whether
       * the computed value moves. This also resolves our var() in the element's
       * own custom-property context, which no string comparison could. */
      const was = getComputedStyle(el).getPropertyValue(p);
      const hadInline = el.style.getPropertyValue(p);
      const hadPrio = el.style.getPropertyPriority(p);
      el.style.setProperty(p, mine.val, 'important');
      const now = getComputedStyle(el).getPropertyValue(p);
      if (hadInline) el.style.setProperty(p, hadInline, hadPrio); else el.style.removeProperty(p);

      seams.push({
        prop: p, active: was !== now, computed: was.slice(0, 40), wouldBe: now.slice(0, 40),
        el: pathOf(el),
        winner: win.name, winnerLayer: win.layer, winnerSel: (win.hitSel || win.sel).slice(0, 90), winnerList: win.branches.length,
        winnerVal: win.val.slice(0, 40), winnerImportant: win.imp, winnerSpec: win.spec,
        mineLayer: mine.layer, mineSel: (mine.hitSel || mine.sel).slice(0, 70), mineVal: mine.val.slice(0, 40), mineVia: mine.via,
        mineSpec: mine.spec, mineImportant: mine.imp,
        reason: win.imp && !mine.imp ? '!important'
              : win.layer === null && mine.layer !== null ? 'unlayered beats our layer'
              : win.spec > mine.spec ? 'higher specificity'
              : 'later in source',
      });
    }
  }
  return { seams, odd: odd.slice(0, 12), oddN: odd.length, rulesRead: rules.length, oursSeen, blocked, elements: els.length, claimed };
};

(async () => {
  const { server, port } = await serve.start(path.join(__dirname, 'mirror'));
  const BASE = 'http://127.0.0.1:' + port + '/';
  const b = await chromium.launch();
  const all = [];
  let broke = false;
  for (const vw of [390, 1240]) {
    const p = await b.newPage({ viewport: { width: vw, height: 900 } });
    for (const name of PAGES) {
      try {
        await p.goto(BASE + name + '.html', { waitUntil: 'load', timeout: 40000 });
        await p.waitForTimeout(1100);
        const r = await p.evaluate(WALK);
        if (!r.oursSeen) {
          broke = true;
          console.log('  !! ' + name + '@' + vw + ' CANNOT SEE darling.build.css - ' +
            r.rulesRead + ' rules read, blocked: ' + JSON.stringify(r.blocked));
          continue;
        }
        console.log('  ' + name.padEnd(9) + '@' + vw + '  ' + String(r.rulesRead).padStart(5) + ' rules, ' +
          String(r.claimed).padStart(4) + '/' + r.elements + ' elements ours, ' +
          String(r.seams.length).padStart(4) + ' defeats');
        if (r.oddN) console.log('      ODD ' + r.oddN + ' properties enumerated but unreadable: ' + JSON.stringify(r.odd));
        for (const x of r.seams) all.push({ ...x, page: name, vw });
      } catch (e) { console.log('  skip ' + name + '@' + vw + ' ' + String(e.message).slice(0, 60)); }
    }
    await p.close();
  }
  await b.close();
  server.close();
  fs.writeFileSync(path.join(__dirname, 'seams.json'), JSON.stringify(all));
  if (broke) { console.log('\nINSTRUMENT BLIND ON AT LEAST ONE PAGE - do not read the totals below as a result.'); }

  const key = (s) => s.winner + '|' + s.winnerSel + '|' + s.prop + '|' + s.mineSel;
  const uniq = new Map();
  for (const s of all) { if (!uniq.has(key(s))) uniq.set(key(s), { ...s, n: 0, pages: new Set() }); const u = uniq.get(key(s)); u.n++; u.pages.add(s.page); }
  const list = [...uniq.values()];
  const act = list.filter(s => s.active);
  /* *** AN ACTIVE DEFEAT AGAINST THE `fallback` LAYER IS NOT A DEFECT. ***
   * fallback/ exists to strip an unstyled WooCommerce control back to a plain
   * floor so a pattern can dress it. It is declared FIRST, i.e. weakest, on
   * purpose - it is meant to be beaten. Counting those alongside real defeats
   * inflated the first honest run from 24 to 100 and pointed the work at the
   * wrong place: "if our rule won, the add-to-cart button would be a grey box
   * with a 3px border" is the system working, not a seam.
   * A seam that matters is one where an INTENT of ours lost. */
  const intent = act.filter(s => s.mineLayer !== 'fallback');
  console.log('\n' + all.length + ' defeats, ' + list.length + ' distinct - ' +
    act.length + ' ACTIVE (change the page today), ' + (list.length - act.length) + ' latent');
  console.log('  of the active, ' + intent.length + ' are an INTENT of ours losing; ' +
    (act.length - intent.length) + ' are the fallback floor being beaten, which is its job.\n');

  const tally = (label, fn, arr, n) => {
    const m = {};
    for (const s of arr) { const k = fn(s); m[k] = (m[k] || 0) + 1; }
    console.log(label);
    for (const [k, v] of Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n || 99))
      console.log('  ' + String(v).padStart(4) + '  ' + k);
    console.log('');
  };
  tally('WHY WE LOSE (distinct)', s => s.reason, list);
  tally('WHO WINS (distinct)', s => s.winner, list, 14);
  tally('WHO WINS (active only)', s => s.winner, act, 14);
  tally('WHAT THEY TAKE (active only)', s => s.prop, act, 16);
  tally('WHICH OF OUR LAYERS LOST (active)', s => (s.mineLayer === null ? 'UNLAYERED (adopted)' : s.mineLayer), act);

  console.log('EVERY ACTIVE DEFEAT OF AN INTENT');
  for (const s of intent.sort((a, b) => b.n - a.n)) {
    console.log('  [' + [...s.pages].join(',') + '] ' + s.el);
    console.log('      ' + s.prop + ': ' + s.computed + '   we want ' + s.wouldBe);
    console.log('      won by ' + s.winner + '  ' + s.winnerSel + ' {' + s.prop + ':' + s.winnerVal +
      (s.winnerImportant ? ' !important' : '') + '}  [' + (s.winnerLayer === null ? 'UNLAYERED' : 'layer ' + s.winnerLayer) + ']');
    console.log('      ours   ' + s.mineSel + ' {' + (s.mineVia || s.prop) + ':' + s.mineVal + '}  [' +
      (s.mineLayer === null ? 'UNLAYERED' : 'layer ' + s.mineLayer) + ']   -> ' + s.reason);
  }
})();
