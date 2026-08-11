/* DID THAT CASCADE CHANGE ACTUALLY CHANGE ANYTHING?
 *
 * Some edits are supposed to move nothing: moving a file into a layer, folding
 * two selector lists into one, reordering imports. The claim "this is a pure
 * refactor" is exactly the kind that is easy to make and expensive to be wrong
 * about, because the failure is silent and spread over a whole site.
 *
 *   node scripts/cascadediff.js --save before
 *   ...make the change, rebuild...
 *   node scripts/cascadediff.js --against before
 *
 * It fingerprints every element in gallery.html - 21 computed properties and the
 * box - and compares.
 *
 * *** THE NOISE FLOOR IS THE WHOLE TRICK. ***
 * The gallery animates: sparkles, shimmer, a bow that breathes. Two snapshots of
 * an UNCHANGED page differ on about 96 elements, purely because they were taken
 * at different points in an animation. A naive diff therefore reports ~96
 * changes for every refactor and is useless - worse than useless, because the
 * real change hides in the noise.
 *
 * So --against takes a CONTROL first: it snapshots the current page twice, in
 * the same run, and treats every element that differs between those two as
 * noise. Only differences outside that set are reported. When this was used on
 * the adopted/ layering - 504 rules changing origin - it reported 90 raw
 * differences and ONE outside the control, which was itself a sparkle the
 * control had happened to catch mid-cycle.
 *
 * A tool that cannot tell a real change from a running animation would have
 * called that refactor "90 regressions" and nobody would have shipped it.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const THEME = path.join(path.dirname(__dirname), 'theme', 'darling');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const SAVE = arg('--save', null);
const AGAINST = arg('--against', null);
const DIR = path.join(__dirname, '.cascade');

const PROPS = ['display', 'position', 'width', 'height', 'margin', 'padding', 'border',
  'borderRadius', 'backgroundColor', 'color', 'font', 'flexDirection', 'alignItems',
  'justifyContent', 'gap', 'gridTemplateColumns', 'textAlign', 'opacity', 'boxShadow',
  'overflow', 'textDecorationLine'];

function serve() {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    if (p === '/') p = '/gallery.html';
    const f = path.join(THEME, p);
    if (!f.startsWith(THEME) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    const t = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
      '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp',
      '.jpg': 'image/jpeg' }[path.extname(f)] || 'application/octet-stream';
    r.writeHead(200, { 'content-type': t });
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port })));
}

const shoot = (page, port) => page.goto('http://127.0.0.1:' + port + '/gallery.html', { waitUntil: 'load' })
  .then(() => page.waitForTimeout(1800))
  .then(() => page.evaluate((PROPS) => {
    const rows = [];
    const all = document.querySelectorAll('body *');
    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      if (e.tagName === 'SCRIPT' || e.tagName === 'STYLE') continue;
      const c = getComputedStyle(e); const r = e.getBoundingClientRect();
      rows.push(i + '|' + e.tagName + '|' + Math.round(r.width) + 'x' + Math.round(r.height) +
        '|' + PROPS.map((k) => c[k]).join('~'));
    }
    return rows;
  }, PROPS));

(async () => {
  if (!SAVE && !AGAINST) {
    console.error('usage: --save <name>  |  --against <name>');
    process.exit(2);
  }
  fs.mkdirSync(DIR, { recursive: true });
  const { srv, port } = await serve();
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1200 } });

  if (SAVE) {
    const rows = await shoot(p, port);
    fs.writeFileSync(path.join(DIR, SAVE + '.txt'), rows.join('\n'));
    console.log('saved ' + rows.length + ' elements as "' + SAVE + '"');
    await b.close(); srv.close(); return;
  }

  /* the control: two snapshots of the page as it is NOW, so animation is
   * measured rather than mistaken for a regression */
  const c1 = await shoot(p, port);
  const c2 = await shoot(p, port);
  const noise = new Set();
  for (let i = 0; i < Math.min(c1.length, c2.length); i++) if (c1[i] !== c2[i]) noise.add(i);
  console.log('control: ' + noise.size + ' of ' + c1.length + ' elements differ between two runs of the SAME page (animation)');

  const before = fs.readFileSync(path.join(DIR, AGAINST + '.txt'), 'utf8').split('\n');
  await b.close(); srv.close();

  if (before.length !== c2.length) {
    console.log('\nELEMENT COUNT CHANGED: ' + before.length + ' -> ' + c2.length +
      '\nThe DOM is different, so this is not a pure cascade change. Compare by hand.');
    process.exit(1);
  }

  const real = [];
  for (let i = 0; i < before.length; i++) if (before[i] !== c2[i] && !noise.has(i)) real.push(i);
  const raw = before.filter((x, i) => x !== c2[i]).length;
  console.log('raw differences: ' + raw + '\nOUTSIDE THE NOISE: ' + real.length);

  for (const i of real.slice(0, 20)) {
    const x = before[i].split('|'); const y = c2[i].split('|');
    console.log('  el ' + i + '  ' + x[1] + '  ' + x[2] + ' -> ' + y[2]);
    const xp = x[3].split('~'); const yp = y[3].split('~');
    for (let k = 0; k < PROPS.length; k++) {
      if (xp[k] !== yp[k]) console.log('      ' + PROPS[k].padEnd(20) + String(xp[k]).slice(0, 46) + '  ->  ' + String(yp[k]).slice(0, 46));
    }
  }
  if (real.length) {
    console.log('\nNot a pure refactor. Each of those is a computed value that moved.');
    process.exit(1);
  }
  console.log('\nnothing moved.');
})();
