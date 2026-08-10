// B1's last question: how many places declare the page frame?
//
// layout.css answered it for CSS - one .d-shell, plus six patterns still taking
// the frame by name. That was never the whole answer, because a WordPress block
// template can declare a frame WITHOUT ANY CSS AT ALL:
//
//   <!-- wp:group {"className":"d-archive","layout":{"type":"constrained"}} -->
//
// `constrained` makes WordPress emit, at render time, a rule capping that
// group's children at theme.json's contentSize. No stylesheet in src/ contains
// that number and no gate in the repo has ever seen it.
//
// *** SO THIS HARNESS EMULATES WHAT WORDPRESS EMITS. ***
// It reads each template's own block JSON, tags the element the comment belongs
// to, and writes the same rule WordPress would write. Without that step the
// harness reports one tidy rail and misses the entire problem - which is the
// shape of every bad harness on this project so far.
//
// Not a substitute for WordPress: it does not run PHP, resolve patterns or
// render query loops. What it does prove is where the RAILS are in the markup
// we ship, which is the thing B1 is about.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const T = path.join(ROOT, 'theme', 'darling');
const CSS = fs.readFileSync(path.join(T, 'darling.build.css'), 'utf8');
const THEME = JSON.parse(fs.readFileSync(path.join(T, 'theme.json'), 'utf8'));
const CONTENT = (THEME.settings && THEME.settings.layout && THEME.settings.layout.contentSize) || '660px';
const WIDE = (THEME.settings && THEME.settings.layout && THEME.settings.layout.wideSize) || '1120px';

// the classes that take the page frame - .d-shell and the six that predate it
const FRAME = ['d-shell', 'd-grid', 'd-archive', 'd-product', 'd-hero', 'd-404', 'd-section-title'];

// <!-- wp:name {json} --> immediately followed by an opening tag.
//
// *** THE JSON IS NOT MATCHED WITH A REGEX, AND THE FIRST VERSION WAS. ***
// It used `(\{[\s\S]*?\})` - non-greedy, so it stopped at the FIRST closing
// brace. Every block that matters here has a nested object, so the capture
// ended one brace short at `"layout":{"type":"constrained"}`, JSON.parse threw,
// and the catch returned the block unchanged. Nothing was tagged, no emulated
// rule was written, and the harness reported the rails of a page where
// constrained layouts do not exist - green, silent, and wrong, which is the
// exact failure this file's header warns about.
//
// So braces are counted, strings and escapes respected, and a comment that will
// not parse is REPORTED rather than skipped.
const OPEN_TAG = /^\s*(<[a-z][a-z0-9-]*)/i;
const skipped = [];

function tag(src, rel) {
  let out = '';
  let i = 0;
  for (;;) {
    const at = src.indexOf('<!-- wp:', i);
    if (at < 0) { out += src.slice(i); break; }

    let j = at + 8;
    while (j < src.length && /[a-z0-9/-]/i.test(src[j])) j++;
    while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;

    if (src[j] !== '{') {                 // a block with no attributes
      out += src.slice(i, at + 8); i = at + 8; continue;
    }

    let depth = 0, k = j, inStr = false, esc = false;
    for (; k < src.length; k++) {
      const c = src[k];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (!depth) { k++; break; } }
    }
    const json = src.slice(j, k);
    const close = src.indexOf('-->', k);
    if (depth !== 0 || close < 0) {
      skipped.push(rel + ': unbalanced block comment at offset ' + at);
      out += src.slice(i, at + 8); i = at + 8; continue;
    }

    let a = null;
    try { a = JSON.parse(json); }
    catch (e) { skipped.push(rel + ': JSON did not parse -> ' + json.slice(0, 70)); }

    const L = a && a.layout;
    const m = src.slice(close + 3).match(OPEN_TAG);
    if (m && L && L.type === 'constrained') {
      const size = L.contentSize || CONTENT;
      // m[0] includes the leading whitespace the pattern skips; m.index is 0
      // because the pattern is anchored, so using it put the attribute FIVE
      // characters after the comment - inside the tag name. <mai data-wpc=.
      // The harness then measured a corrupted document and reported new rails
      // that were entirely its own doing.
      const cut = close + 3 + m[0].length;
      out += src.slice(i, cut) + ' data-wpc="' + size + '"';
      i = cut;
    } else {
      out += src.slice(i, close + 3);
      i = close + 3;
    }
  }
  return out;
}

(async () => {
  const dirs = ['templates', 'parts'];
  const files = [];
  for (const d of dirs) {
    const p = path.join(T, d);
    if (!fs.existsSync(p)) continue;
    for (const f of fs.readdirSync(p)) if (f.endsWith('.html')) files.push([d + '/' + f, path.join(p, f)]);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const lines = [];
  const say = (s) => { console.log(s); lines.push(s); };

  say('theme.json contentSize=' + CONTENT + '  wideSize=' + WIDE + '   viewport 1440');
  say('');

  const allRails = {};
  const shellPoints = [];

  for (const [rel, abs] of files) {
    const body = tag(fs.readFileSync(abs, 'utf8'), rel);
    // every distinct constrained size needs its own emulated rule
    const sizes = [...new Set([...body.matchAll(/data-wpc="([^"]+)"/g)].map((m) => m[1]))];
    const wpCss = sizes.map((s) =>
      `[data-wpc="${s}"] > *:not(.alignwide):not(.alignfull){max-width:${s};margin-inline:auto}\n` +
      `[data-wpc="${s}"] > .alignwide{max-width:${WIDE}}`).join('\n');

    const doc = '<!doctype html><meta charset="utf-8"><style>' + CSS +
      '\nhtml,body{margin:0;background:var(--surface-page)}\n' +
      '/* --- emulating what WordPress emits for constrained layouts --- */\n' + wpCss +
      '</style>\n' + body;

    await page.setContent(doc, { waitUntil: 'load' });
    await page.waitForTimeout(120);

    const found = await page.evaluate((FRAME) => {
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean);
        const hit = cls.filter((c) => FRAME.indexOf(c) >= 0);
        if (!hit.length) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        out.push({
          cls: hit.join('+'),
          shell: cls.indexOf('d-shell') >= 0,
          wpc: el.getAttribute('data-wpc') || (el.closest('[data-wpc]') ? 'child of ' + el.closest('[data-wpc]').getAttribute('data-wpc') : ''),
          left: Math.round(r.left),
          width: Math.round(r.width),
          maxw: cs.maxWidth,
          padL: cs.paddingLeft,
          contentLeft: Math.round(r.left + parseFloat(cs.paddingLeft || 0)),
          contentRight: Math.round(r.right - parseFloat(cs.paddingRight || 0)),
        });
      }
      return out;
    }, FRAME);

    if (process.env.SHOT) {
      await page.screenshot({ path: 'b1-' + rel.split('/')[1].replace('.html','') + (process.env.TAG || '') + '.png', fullPage: true });
    }
    if (!found.length) continue;
    say('--- ' + rel + (sizes.length ? '   constrained: ' + sizes.join(', ') : ''));
    for (const f of found) {
      say('    ' + f.cls.padEnd(24) + (f.shell ? 'shell ' : '      ') +
          'content ' + String(f.contentLeft).padStart(4) + '..' + String(f.contentRight).padEnd(5) +
          ' w=' + String(f.width).padStart(4) + ' max=' + f.maxw.padEnd(8) + ' pad=' + f.padL.padEnd(7) +
          (f.wpc ? '  [wp ' + f.wpc + ']' : ''));
      (allRails[f.contentLeft] = allRails[f.contentLeft] || []).push(rel.split('/')[1] + ':' + f.cls);
      // width 0 means the thing is not on the page: the mega-menu list until it
      // opens, the related-products group behind its :has() guard. A hidden box
      // has no rail, and asserting one is asserting about nothing.
      if (f.shell && f.width > 0) shellPoints.push({ at: f.contentLeft, who: rel.split('/')[1] + ':' + f.cls });
    }
    say('');
  }

  if (skipped.length) {
    say('*** BLOCK COMMENTS THE PARSER COULD NOT READ - the rails below are incomplete ***');
    for (const s2 of skipped) say('    ' + s2);
    say('');
  }
  // ---------------------------------------------------------------- the gate
  //
  // Three invariants, because a measurement taken once is a screenshot and an
  // invariant re-run is a guarantee.
  const problems = [];

  // 1. EVERY CLASS IS WRITTEN TWICE and the two must agree. WordPress compares
  //    the block comment's className against the saved HTML; when they differ
  //    the block is marked invalid and stops being editable in the site editor.
  //    Nothing in a build catches that - it is only visible to a human opening
  //    the template in wp-admin, which is the worst possible time to find out.
  for (const [rel, abs] of files) {
    const src = fs.readFileSync(abs, 'utf8');
    let i = 0;
    for (;;) {
      const at = src.indexOf('<!-- wp:', i);
      if (at < 0) break;
      let j = at + 8;
      while (j < src.length && /[a-z0-9/-]/i.test(src[j])) j++;
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
      if (src[j] !== '{') { i = at + 8; continue; }
      let depth = 0, k = j, inStr = false, esc = false;
      for (; k < src.length; k++) {
        const c = src[k];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (!depth) { k++; break; } }
      }
      const close = src.indexOf('-->', k);
      if (close < 0) { i = at + 8; continue; }
      let a = null;
      try { a = JSON.parse(src.slice(j, k)); } catch (e) { a = null; }
      const selfClosing = src.slice(k, close).indexOf('/') >= 0;
      i = close + 3;
      if (!a || !a.className) continue;
      // *** A SELF-CLOSING BLOCK HAS NO ELEMENT IN THE TEMPLATE. ***
      // `<!-- wp:post-title {"className":"d-product__title"} /-->` is rendered
      // by PHP, so WordPress applies the className itself and there is nothing
      // here to disagree with. The first version of this check did not know
      // that, matched the NEXT element in the file, and accused four innocent
      // blocks of a desync - which would have taught everyone to ignore it.
      if (selfClosing) continue;
      // *** AND A DYNAMIC CONTAINER SAVES NO WRAPPER EITHER. ***
      // <!-- wp:query-pagination {className:d-pagination} --> is followed
      // by more block comments, not by an element: its save() returns null and
      // PHP writes the wrapper, className and all. So if the next thing after
      // the comment is another comment, there is nothing here to compare, and
      // the first version blamed the innermost element it could find instead.
      const nextBit = src.slice(close + 3).replace(/^\s+/, '');
      if (nextBit.slice(0, 4) === '<!--') continue;
      const after = src.slice(close + 3, close + 400);
      const openTag = after.match(/<[a-z][a-z0-9-]*[^>]*>/i);
      if (!openTag) { problems.push(rel + ': className ' + a.className + ' has no element after it'); continue; }
      const attr = openTag[0].match(/class="([^"]*)"/);
      const have = attr ? attr[1].split(/\s+/) : [];
      for (const c of a.className.split(/\s+/)) {
        if (c && have.indexOf(c) < 0) {
          problems.push(rel + ': block comment says "' + c + '" and the element does not: ' + openTag[0].slice(0, 80));
        }
      }
    }
  }

  // 2. NO TEMPLATE MAY WRITE A FRAME WIDTH. A per-block `contentSize` is a
  //    second place the page width lives, in a file no stylesheet reader opens.
  //    archive-product.html carried "90rem" - 1440px, wider than --page-max and
  //    therefore both magic and wrong; it only ever escaped notice because it
  //    was too big to bite.
  for (const [rel, abs] of files) {
    const src = fs.readFileSync(abs, 'utf8');
    if (src.indexOf('"contentSize"') >= 0) {
      problems.push(rel + ': declares its own contentSize - the frame belongs to .d-shell');
    }
  }

  // 3. ONE PAGE RAIL. Everything that carries .d-shell and is visible must
  //    start its content at the same x, with the one named exception: a bar
  //    (.d-shell--bar) sits further out, which the owner asked for and which is
  //    the only reason a second rail is allowed to exist at all.
  const shellRails = {};
  for (const p3 of shellPoints) (shellRails[p3.at] = shellRails[p3.at] || []).push(p3.who);
  const railKeys = Object.keys(shellRails).map(Number).sort((a, b) => a - b);
  const ALLOWED = [200, 220];   // bar rail, page rail
  const stray = railKeys.filter((k) => ALLOWED.indexOf(k) < 0);
  if (stray.length) {
    for (const k of stray) problems.push('a shell starts at x=' + k + ', which is neither rail: ' + shellRails[k].join(', '));
  }

  say('');
  if (problems.length) {
    say('B1GATE FAIL');
    for (const p2 of problems) say('  ' + p2);
  } else {
    say('b1gate: markup and block JSON agree, no template writes a frame width, every shell is on a named rail.');
  }

  say('=== CONTENT-LEFT RAILS ACROSS EVERY TEMPLATE, at 1440');
  const keys = Object.keys(allRails).map(Number).sort((a, b) => a - b);
  for (const k of keys) say('  x=' + String(k).padStart(4) + '  ' + allRails[k].join(', '));
  say(keys.length === 1 ? '  -> ONE RAIL' : '  -> ' + keys.length + ' DIFFERENT RAILS');

  fs.writeFileSync(path.join(ROOT, process.env.OUT || 'b1-shell.txt'), lines.join('\n') + '\n');
  console.log('\n-> ' + (process.env.OUT || 'b1-shell.txt'));
  await browser.close();
  if (problems.length) process.exit(1);
})();
