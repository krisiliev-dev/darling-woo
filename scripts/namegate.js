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
const AXE = fs.readFileSync(path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
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
  const r = await p.evaluate((rules) => window.axe.run(document, { runOnly: { type: 'rule', values: rules } })
    .then((res) => res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length,
      eg: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 100)),
      sec: [...new Set(v.nodes.map((n) => { try { return (document.querySelector(n.target[0]).closest('section') || {}).id || '?'; } catch (e) { return '?'; } }))].slice(0, 5) }))), RULES);
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
