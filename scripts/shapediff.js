const { chromium } = require('playwright');
const path = require('path');
const GAL = 'file:///' + path.join(__dirname, '..', 'theme', 'darling', 'gallery.html').replace(/\\/g, '/');

// The DOM SHAPE of a component, not its styles: tag + d- classes, depth-first,
// capped. Two shapes that differ mean the gallery specimen and the shipped
// markup are not the same control, however well the CSS is written.
const SHAPE = `(sel) => {
  const root = document.querySelector(sel);
  if (!root) return 'ABSENT';
  const out = [];
  const walk = (e, d) => {
    if (d > 3) return;
    if (out.length > 400) { out.push('  ...TRUNCATED - raise the cap'); return; }
    const cls = String(e.className || '').split(/\\s+/).filter(c => /^d-/.test(c)).join('.');
    out.push('  '.repeat(d) + e.tagName.toLowerCase() + (cls ? '.' + cls : ''));
    for (const k of e.children) walk(k, d + 1);
  };
  walk(root, 0);
  // collapse runs of identical siblings: eight identical tiles say nothing that
  // "a.d-carousel__tile x8" does not, and burying the buttons under them is how
  // the first version of this probe lied.
  const rolled = [];
  for (let i = 0; i < out.length; i++) {
    let n = 1;
    while (out[i + n] === out[i]) n++;
    rolled.push(out[i] + (n > 1 ? '   x' + n : ''));
    i += n - 1;
  }
  return rolled.join('\\n');
}`;

(async () => {
  const b = await chromium.launch();
  const g = await b.newPage({ viewport: { width: 1240, height: 1200 } });
  await g.goto(GAL, { waitUntil: 'load', timeout: 60000 });
  await g.waitForTimeout(2000);
  const l = await b.newPage({ viewport: { width: 1240, height: 1200 } });
  await l.goto('https://darlinghome.bg/', { waitUntil: 'load', timeout: 60000 });
  await l.waitForTimeout(2500);

  for (const sel of ['.d-carousel', '.d-search', '.d-header']) {
    console.log('\n======== ' + sel);
    const a = await g.evaluate('(' + SHAPE + ')(' + JSON.stringify(sel) + ')');
    const c = await l.evaluate('(' + SHAPE + ')(' + JSON.stringify(sel) + ')');
    console.log('-- GALLERY\n' + a);
    console.log('-- LIVE\n' + c);
    console.log('-- SAME SHAPE: ' + (a === c));
  }

  console.log('\n======== THE RAIL, both sides');
  for (const [name, page] of [['gallery', g], ['live', l]]) {
    console.log('  ' + name + '  ' + JSON.stringify(await page.evaluate(() => {
      const r = getComputedStyle(document.documentElement);
      const shell = document.querySelector('.d-shell') || document.querySelector('.wrap') || document.querySelector('.sec');
      const t = document.querySelector('h2');
      return {
        gutter: r.getPropertyValue('--gutter').trim(),
        pageMax: r.getPropertyValue('--page-max').trim(),
        firstShell: shell ? String(shell.className).slice(0, 26) + ' x=' + Math.round(shell.getBoundingClientRect().x) +
          ' w=' + Math.round(shell.getBoundingClientRect().width) + ' pad=' + getComputedStyle(shell).paddingLeft : null,
        h2TextStartsAt: t ? Math.round(t.getBoundingClientRect().x + parseFloat(getComputedStyle(t).paddingLeft)) : null,
        rootPadLeft: r.getPropertyValue('--wp--style--root--padding-left').trim() || '(none)',
      };
    })));
  }
  await b.close();
})();