/* THE NAME GATE: does every control in the gallery announce itself?
 *
 * The owner asked "is there rules or guidelines for what kind of text we should
 * have on each component?" There are, and they are testable. This runs axe-core's
 * NAMING rules over gallery.html - every component the system has, on one page -
 * and fails if any control, link, image or field has no accessible name.
 *
 * *** THE GALLERY, NOT THE LIVE PAGES, IS THE RIGHT TARGET. *** The same audit
 * over the nine mirrored pages came back CLEAN, and that was misleading: the
 * mirror cannot reach the cart with items, the checkout address form, the orders
 * table or .d-choice. The gallery holds all of them. It also found the gallery
 * itself was teaching the broken shape - 22 violations, including nine icon-only
 * buttons with no aria-label that the TEMPLATES name correctly, and a .d-field
 * <label> with neither `for` nor a wrapped control, which names nothing at all.
 *
 *   node scripts/namegate.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
/* Repo-relative, with an override. The first version hardcoded an absolute path
   from the machine it was written on - which meant the counterfactual run
   silently audited the REAL gallery instead of the deliberately broken copy and
   reported a pass. A gate pointed at the wrong file is the same failure as a
   gate that cannot fail. */
const GALLERY = process.env.DARLING_GALLERY ||
  ('file://' + path.join(ROOT, 'theme', 'darling', 'gallery.html'));
/* axe-core is a DEPENDENCY of this gate and was missing from package.json, so
 * `npm i` pruned it and namegate died on ENOENT before it audited a thing. Same
 * class of failure as the day playwright vanished and took eleven gates with it,
 * which is why that file carries a paragraph about it. It is listed now. */
const AXE_PATH = path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
if (!fs.existsSync(AXE_PATH)) {
  console.error('namegate: no axe-core at ' + AXE_PATH + '\n' +
    'It is in package.json; run `npm i`. This is NOT a pass.');
  process.exit(2);
}
const AXE = fs.readFileSync(AXE_PATH, 'utf8');
const ALLOW_FILE = path.join(__dirname, 'namegate.allow.json');
const RULES = ['button-name', 'link-name', 'image-alt', 'input-image-alt', 'label',
  'form-field-multiple-labels', 'aria-command-name', 'aria-toggle-field-name',
  'select-name', 'empty-heading', 'aria-input-field-name', 'aria-required-attr',
  'aria-valid-attr-value', 'duplicate-id-aria'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1000 } });
  await p.goto(GALLERY, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.addScriptTag({ content: AXE });
  const raw = await p.evaluate((rules) => window.axe.run(document, { runOnly: { type: 'rule', values: rules } })
    .then((res) => res.violations.map((v) => ({ id: v.id, impact: v.impact,
      nodes: v.nodes.map((n) => ({ html: n.html.slice(0, 160),
        sec: (() => { try { return (document.querySelector(n.target[0]).closest('section') || {}).id || '?'; } catch (e) { return '?'; } })() })) }))), RULES);

  /* *** THE ALLOWLIST, AND THE ONLY ARGUMENT IT ACCEPTS. ***
   * The gallery carries CAPTURED third-party markup now - WooCommerce's checkout
   * and cart blocks, the six account pages - because a specimen of my guess about
   * their DOM is worth nothing. Some of that markup has real accessibility bugs
   * in it that no stylesheet can reach: select2 draws a role="textbox" with no
   * name inside its own combobox, on the live address form.
   *
   * A permanently red gate is worse than no gate - it teaches you to skip it, and
   * this repo has already learned that lesson from a non-deterministic one. So
   * those are allowed BY NAME, with a written reason, and printed on every run so
   * they cannot quietly become furniture.
   *
   * *** AN ENTRY THAT MATCHES NOTHING IS A FAILURE. *** A stale allowlist that
   * silently covers nothing is exactly how srgate passed on nothing for three
   * commits. If the bug is fixed, the entry goes; the gate says so rather than
   * letting the file rot. */
  const ALLOW = fs.existsSync(ALLOW_FILE) ? (JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')).allow || {}) : {};
  const used = new Set();
  const excused = [];
  const r = [];
  for (const v of raw) {
    const keep = [];
    for (const n of v.nodes) {
      const key = Object.keys(ALLOW).find((k) => {
        const [rule, frag] = k.split('::');
        return rule === v.id && (!frag || n.html.includes(frag));
      });
      if (key) { used.add(key); excused.push({ key, id: v.id, sec: n.sec }); } else keep.push(n);
    }
    if (keep.length) r.push({ id: v.id, impact: v.impact, n: keep.length,
      eg: keep.slice(0, 3).map((n) => n.html.slice(0, 100)),
      sec: [...new Set(keep.map((n) => n.sec))].slice(0, 5) });
  }
  if (excused.length) {
    console.log('  allowed, and still real:');
    for (const k of new Set(excused.map((e) => e.key))) {
      const hits = excused.filter((e) => e.key === k);
      console.log('    ' + String(hits.length).padStart(3) + '  ' + k +
        '   sections: ' + [...new Set(hits.map((h) => h.sec))].join(', '));
      console.log('         ' + ALLOW[k].split('. ')[0] + '.');
    }
  }
  const stale = Object.keys(ALLOW).filter((k) => !used.has(k));
  if (stale.length) {
    await b.close();
    console.log('\nname gate FAILED: ' + stale.length + ' allowlist entr(ies) matched NOTHING:');
    stale.forEach((k) => console.log('    ' + k));
    console.log('Either the violation is fixed - delete the entry - or the key no longer\n' +
      'matches the markup and the gate has been excusing nothing. Both need a hand.');
    process.exit(1);
  }
  /* *** A NAME CAN EXIST AND STILL BE BROKEN, AND axe CANNOT SEE IT. ***
   * Nextend Social Login ships aria-label="Продължи с <b>Facebook</b>" - the
   * markup is inside the attribute, so a screen reader announces the tags. axe
   * passes it because a name is present. Presence is not quality. */
  const junk = await p.evaluate(() => [...document.querySelectorAll('[aria-label]')]
    .map((e) => e.getAttribute('aria-label'))
    .filter((v) => /[<>]|&[a-z]+;/i.test(v)));
  if (junk.length) {
    console.log('  ' + junk.length + '  aria-label contains markup  [critical]');
    junk.slice(0, 4).forEach((v) => console.log('        ' + JSON.stringify(v)));
  }
  if (!r.length && !junk.length) { console.log('name gate: every control in the gallery announces itself.'); await b.close(); return; }
  if (!r.length) { await b.close(); console.log('\nname gate FAILED: ' + junk.length + ' name(s) containing markup.'); process.exit(1); }
  for (const v of r.sort((a, b) => b.n - a.n)) {
    console.log('  ' + String(v.n).padStart(3) + '  ' + v.id.padEnd(22) + '[' + v.impact + ']  sections: ' + v.sec.join(', '));
    v.eg.forEach((e) => console.log('        ' + e));
  }
  await b.close();
  console.log('\nname gate FAILED: ' + r.reduce((a, v) => a + v.n, 0) + ' control(s) with no accessible name.');
  process.exit(1);
})();
