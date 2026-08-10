/* Turn triage.json into the document the dequeue runs off.
 *
 * A SELECTOR is the unit of a decision, not a property: you replace
 * `.screen-reader-text` once, not eleven times. So the 261 CLAIM declarations
 * are grouped by owner + selector, ordered by reach, and each group carries the
 * properties that move and whether the element's box moves with them. */
const fs = require('fs');
const path = require('path');
const { claim, safe } = JSON.parse(fs.readFileSync(path.join(__dirname, 'triage.json'), 'utf8'));

const SEP = String.fromCharCode(0);   // cannot occur in a selector or a handle

const group = (arr) => {
  const m = new Map();
  for (const s of arr) {
    // SEP is BUILT rather than typed. A raw 0x00 byte in this source made git
    // classify the file as binary and hide every future diff of it.
    const k = s.id + SEP + s.sel;
    if (!m.has(k)) m.set(k, { id: s.id, sel: s.sel, props: [], reach: 0, moves: false, pages: new Set() });
    const g = m.get(k);
    g.props.push(s); g.reach += s.n; g.moves = g.moves || s.geo;
    // triage.json stringifies a Set as {}, so this is empty unless it is an array
    if (Array.isArray(s.pages)) for (const p of s.pages) g.pages.add(p);
  }
  return [...m.values()].sort((a, b) => b.reach - a.reach);
};

const C = group(claim), S = group(safe);

/* The tranches. Membership is by owner + selector, decided by what the thing IS
 * rather than by which file it happens to live in - `.screen-reader-text` is
 * shipped by two different sheets and is one job. */
const tranche = (g) => {
  if (/is-layout-flow|wp-site-blocks|is-layout-constrained/.test(g.sel)) return '1. PAGE RHYTHM';
  if (/screen-reader-text|\.skip-link/.test(g.sel)) return '2. ACCESSIBILITY';
  if (/nsl-/.test(g.id + g.sel)) return '3. SOCIAL LOGIN (plugin)';
  if (/all-products|product-image|product-button|product-price|post-template|wc-block-grid/.test(g.id + g.sel)) return '4. PRODUCT GRID';
  if (/add-to-cart-form|quantity|\bstars\b|p\.stars/.test(g.id + g.sel)) return '5. PRODUCT PAGE';
  if (/form-row|woocommerce-form|col2-set|u-column|password/.test(g.sel)) return '6. ACCOUNT + FORMS';
  if (/cart|checkout|coupon/.test(g.id + g.sel)) return '7. CART + CHECKOUT';
  if (/^wp-block-|^core-block-supports/.test(g.id)) return '8. CORE BLOCK SUPPORTS';
  return '9. THE TAIL';
};

const T = new Map();
for (const g of C) { const t = tranche(g); if (!T.has(t)) T.set(t, []); T.get(t).push(g); }

const L = [];
L.push('| tranche | selectors | declarations | reach | moves the box |');
L.push('|---|---:|---:|---:|:-:|');
for (const t of [...T.keys()].sort()) {
  const v = T.get(t);
  L.push('| **' + t + '** | ' + v.length + ' | ' + v.reduce((a, g) => a + g.props.length, 0) +
    ' | ' + v.reduce((a, g) => a + g.reach, 0) + ' | ' + v.filter(g => g.moves).length + ' |');
}
L.push('');

for (const t of [...T.keys()].sort()) {
  L.push('### ' + t);
  L.push('');
  L.push('| reach | owner | selector | what goes bare |');
  L.push('|---:|---|---|---|');
  for (const g of T.get(t)) {
    const props = g.props.sort((a, b) => b.n - a.n);
    const shown = props.slice(0, 5).map(p => p.prop + ' `' + p.was + '`→`' + p.now + '`').join('<br>');
    const more = props.length > 5 ? '<br>…and ' + (props.length - 5) + ' more' : '';
    L.push('| ' + g.reach + (g.moves ? ' **↕**' : '') + ' | `' + g.id.slice(0, 32) + '` | `' +
      g.sel.slice(0, 54).replace(/\|/g, '\\|') + '` | ' + shown.replace(/\|/g, '\\|') + more + ' |');
  }
  L.push('');
}

const so = {};
for (const g of S) so[g.id] = (so[g.id] || 0) + g.props.length;
L.push('### LET GO — removal changes nothing measurable');
L.push('');
L.push('| declarations | owner |');
L.push('|---:|---|');
for (const [k, v] of Object.entries(so).sort((a, b) => b[1] - a[1])) L.push('| ' + v + ' | `' + k + '` |');

fs.writeFileSync(path.join(__dirname, 'WORKLIST.md'), L.join('\n') + '\n');
console.log('CLAIM: ' + C.length + ' selector groups, ' + claim.length + ' declarations');
console.log('LET GO: ' + S.length + ' selector groups, ' + safe.length + ' declarations');
for (const t of [...T.keys()].sort())
  console.log('  ' + t.padEnd(26) + String(T.get(t).length).padStart(3) + ' selectors, ' +
    String(T.get(t).reduce((a, g) => a + g.props.length, 0)).padStart(3) + ' declarations, reach ' +
    T.get(t).reduce((a, g) => a + g.reach, 0));
