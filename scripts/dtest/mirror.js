/* Build a self-contained, offline mirror of the live storefront.
 *
 * WHY: this container's browsers have no egress at all (curl does, through a
 * proxy; Chromium/Firefox/WebKit get ERR_CONNECTION_RESET on every host). Real
 * cross-browser review therefore cannot hit darlinghome.bg directly. Mirroring
 * the delivered HTML plus every asset it references, rewritten to relative
 * paths and served from localhost, gives three engines the real DOM and the
 * real stylesheet - which is what a CSS review needs. What it does NOT give is
 * anything that calls the network at runtime (cart fragments, the newsletter
 * relay); those are out of scope here and stay on the live-site harness.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = 'https://darlinghome.bg';
const { MIRROR: OUT } = require('./paths');
const PAGES = [
  ['home', '/'], ['shop', '/shop/'], ['product', '/?p=11'], ['cart', '/cart/'],
  ['checkout', '/checkout/'], ['account', '/my-account/'], ['page', '/za-nas/'],
  ['blog', '/blog/'], ['notfound', '/definitely-not-a-page/'],
];

const curl = (url, bin) => {
  const args = ['-sSL', '--max-time', '45', '-A', 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/141 Mobile', url];
  return execFileSync('curl', args, { maxBuffer: 1 << 28, encoding: bin ? 'buffer' : 'utf8' });
};

const seen = new Map();          // absolute url -> local relative path
const queue = [];

function localFor(url) {
  if (seen.has(url)) return seen.get(url);
  let p;
  try { p = new URL(url).pathname; } catch (e) { return null; }
  const rel = 'assets' + p.replace(/[^a-zA-Z0-9._/-]/g, '_');
  seen.set(url, rel);
  queue.push([url, rel]);
  return rel;
}

// every darlinghome.bg URL in a blob of text, however quoted
function rewrite(text, depth) {
  const up = '../'.repeat(depth);
  return text.replace(/https:\/\/darlinghome\.bg(\/[^"'\s)\\>]*)/g, (m) => {
    const rel = localFor(m);
    return rel ? up + rel : m;
  });
}

fs.mkdirSync(OUT, { recursive: true });
const report = [];

for (const [name, url] of PAGES) {
  let html;
  try { html = curl(BASE + url); } catch (e) { report.push(name + '  FETCH FAILED'); continue; }
  html = rewrite(html, 0);
  fs.writeFileSync(path.join(OUT, name + '.html'), html);
  report.push(name.padEnd(10) + (html.length / 1024).toFixed(0) + ' KB');
}

// drain the asset queue, following CSS for its own url() references
let n = 0, failed = 0;
while (queue.length) {
  const [url, rel] = queue.shift();
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    if (/\.css(\?|$)/.test(url)) {
      const depth = rel.split('/').length - 1;
      fs.writeFileSync(dest, rewrite(curl(url), depth));
    } else {
      fs.writeFileSync(dest, curl(url, true));
    }
    n++;
  } catch (e) { failed++; }
}

console.log(report.join('\n'));
console.log('\nassets mirrored: ' + n + (failed ? '  (' + failed + ' failed)' : ''));
