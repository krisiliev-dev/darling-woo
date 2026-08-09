// The brand bow is drawn in six files now, and tokens/icon.css records in
// capitals what happens when I draw a plausible one instead of the real one:
//
//     *** THE BRAND BOW, NOT A BOW. *** ... the one I drew before was a
//     plausible bow and the wrong one, which is worse than no bow: the mark
//     people recognise is this shape.
//
// I did it again on 2026-08-09, in the gallery, and it rendered as a pair of
// spectacles.
//
// *** THIS SCANS EVERY SOURCE FILE, NOT A LIST. *** The first version carried
// four filenames, and the very next patch added two more copies - the empty
// state's inline <svg> in two templates - which the gate would have walked
// straight past. A hand-written list of places to check is a list somebody has
// to remember to extend, and remembering is the thing that failed here twice.
const fs = require('fs');
const path = require('path');
let fails = 0;
const ok = (c, label, detail) => { if (!c) fails++;
  console.log('  %s  %s%s', c ? 'PASS' : '*FAIL*', label, detail ? '   ' + detail : ''); };

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.(css|js|html|php|py)$/.test(e.name)) out.push(p);
  }
  return out;
};

// Generated artefacts hold copies of their own sources; checking them reports
// the same shape twice and calls the second one a finding.
const GENERATED = ['theme/darling/darling.build.css', 'theme/darling/gallery.html'];
// The two sheets the cutover deletes are allowed to keep whatever they have.
const DOOMED = ['theme/darling/style.css', 'theme/darling/assets/darling.css'];

// The bow's own first move. Anchored on it because the first version of this
// gate took "the first <path> in the file" and reported a difference between a
// bow and the torn version's CLIP path, which is a jagged line and not a bow.
const START = 'M12 6 L3.2 1.4';
const CANON = fs.readFileSync('theme/darling/src/tokens/icon.css', 'utf8')
  .match(/--icon-bow:[\s\S]*?d='(M12 6[^']+)'/);

console.log('THE BRAND BOW, WHEREVER IT IS DRAWN');
ok(!!CANON, 'the canonical path is in tokens/icon.css as --icon-bow');
if (!CANON) { process.exit(1); }
const canon = CANON[1].replace(/\s+/g, ' ').trim();
console.log('     canonical   ' + canon);

const files = [...walk('theme/darling'), ...walk('scripts')]
  .map((f) => f.replace(/\\/g, '/'))
  .filter((f) => !GENERATED.includes(f) && !DOOMED.includes(f));

const copies = [];
const wrong = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (s.indexOf(START) === -1) {
    // *** AN <svg> WEARING A BOW CLASS AND DRAWING SOMETHING ELSE. ***
    // That is the exact failure this gate exists for, so it is worth catching
    // even though the path does not match. But only an <svg>: the first version
    // asked "does this file mention a bow class and contain any <path>?", and
    // parts/footer.html says yes to both - its bow is a masked <span> and its
    // <path>s are the Facebook and Instagram marks. It flagged a file that was
    // right, which is the fastest way to get a gate switched off.
    if (/<svg[^>]*class="[^"]*__bow/.test(s)) {
      wrong.push(f + '  (an <svg> bow drawing an unfamiliar path)');
    }
    continue;
  }
  for (const m of s.matchAll(/d="(M12 6[^"]*)"/g)) {
    const d = m[1].replace(/\s+/g, ' ').trim();
    copies.push([f, d]);
    if (d !== canon) wrong.push(f + '  ' + d.slice(0, 50));
  }
  for (const m of s.matchAll(/d='(M12 6[^']*)'/g)) {
    const d = m[1].replace(/\s+/g, ' ').trim();
    if (f.endsWith('tokens/icon.css')) continue;   // the canonical one itself
    copies.push([f, d]);
    if (d !== canon) wrong.push(f + '  ' + d.slice(0, 50));
  }
}

const byFile = {};
for (const [f] of copies) byFile[f] = (byFile[f] || 0) + 1;
for (const f of Object.keys(byFile).sort()) console.log('     %dx  %s', byFile[f], f);

ok(copies.length > 0, 'the mark is drawn somewhere', copies.length + ' copies');
ok(wrong.length === 0, '*** EVERY COPY IS THE SAME PATH ***',
  wrong.length ? wrong.join(' | ') : copies.length + ' copies, one shape');

// The torn version has to be the same path too - that is the whole claim of
// drawing it twice under a clip rather than redrawing it with a notch.
const torn = fs.readFileSync('scripts/gen-gallery.py', 'utf8')
  .match(/MEDIA_FAIL_BOW = \(([\s\S]*?)\)\n/);
if (torn) {
  const halves = [...torn[1].matchAll(/<path d="(M12 6[^"]+)"/g)]
    .map((m) => m[1].replace(/\s+/g, ' ').trim());
  ok(halves.length === 2 && halves[0] === halves[1] && halves[0] === canon,
    'the torn bow is two copies of that same path, not a redrawn one',
    halves.length + ' halves' + (halves.length === 2 && halves[0] === canon
      ? ', matching' : ', NOT matching'));
} else {
  ok(false, 'the torn bow constant was not found in gen-gallery.py');
}

console.log('\n%s   %d failed', fails ? 'RESULT: FAILURES' : 'RESULT: one bow', fails);
process.exit(fails ? 1 : 0);
