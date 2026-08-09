// The brand bow lives in four files now, and tokens/icon.css records in capitals
// what happens when I draw a plausible one instead of the real one:
//
//     *** THE BRAND BOW, NOT A BOW. *** ... the one I drew before was a
//     plausible bow and the wrong one, which is worse than no bow: the mark
//     people recognise is this shape.
//
// I did it again on 2026-08-09, in the gallery, and it rendered as a pair of
// spectacles. So this compares the PATH DATA in every file that carries it, and
// fails when they disagree. A comment asking the next person to keep four copies
// in step is not a mechanism.
const fs = require('fs');
let fails = 0;
const ok = (c, label, detail) => { if (!c) fails++;
  console.log('  %s  %s%s', c ? 'PASS' : '*FAIL*', label, detail ? '   ' + detail : ''); };

// The knot circle and the two loops. Whitespace is normalised because the same
// path is written across three lines in one file and on one line in another,
// but nothing else is: a different number is a different bow.
const norm = (s) => s.replace(/\s+/g, ' ').trim();

// *** ANCHORED ON `M12 6`, WHICH IS THE BOW'S OWN FIRST MOVE. ***
// The first version of this gate took the first <path> in each file and
// reported that two of them differed. They did - it had picked up the torn
// version's CLIP path, which is a jagged line and not a bow at all. A gate that
// matches "a path" rather than "this path" reports a difference between two
// things that were never the same kind of thing.
const SOURCES = [
  ['theme/darling/src/tokens/icon.css', /--icon-bow:[\s\S]*?d='(M12 6[^']+)'/],
  ['theme/darling/assets/img-fallback.js', /var BOW = '[\s\S]*?<path d="(M12 6[^"]+)"/],
  ['theme/darling/assets/header.js', /var BOW = '[\s\S]*?<path d="(M12 6[^"]+)"/],
  ['scripts/gen-gallery.py', /BOW = \('<svg class="d-hero__bow"[\s\S]*?<path d="(M12 6[^"]+)"/],
];

console.log('THE BRAND BOW, IN EVERY FILE THAT DRAWS IT');
const found = [];
for (const [file, re] of SOURCES) {
  if (!fs.existsSync(file)) { ok(false, file, 'file missing'); continue; }
  const m = fs.readFileSync(file, 'utf8').match(re);
  if (!m) { ok(false, file, 'no bow path found - has the constant been renamed?'); continue; }
  found.push([file, norm(m[1])]);
  console.log('     ' + (file + '                                          ').slice(0, 42)
    + ' ' + norm(m[1]).slice(0, 46) + '…');
}

ok(found.length === SOURCES.length, 'every source still carries one',
  found.length + '/' + SOURCES.length);

if (found.length > 1) {
  const first = found[0][1];
  const odd = found.filter(([, d]) => d !== first).map(([f]) => f);
  ok(odd.length === 0, '*** AND THEY ARE THE SAME PATH ***',
    odd.length ? 'differs: ' + odd.join(', ') : found.length + ' copies, one shape');
}

// The torn version has to be the same path too - that is the whole claim of
// drawing it twice under a clip rather than redrawing it with a notch.
const torn = fs.readFileSync('scripts/gen-gallery.py', 'utf8')
  .match(/MEDIA_FAIL_BOW = \(([\s\S]*?)\)\n/);
if (torn) {
  const halves = [...torn[1].matchAll(/<path d="(M12 6[^"]+)"/g)].map((m) => norm(m[1]));
  ok(halves.length === 2 && halves[0] === halves[1] && halves[0] === found[0][1],
    'the torn bow is two copies of that same path, not a redrawn one',
    halves.length + ' halves' + (halves.length === 2 && halves[0] === found[0][1]
      ? ', matching' : ', NOT matching'));
} else {
  ok(false, 'the torn bow constant was not found in gen-gallery.py');
}

console.log('\n%s   %d failed', fails ? 'RESULT: FAILURES' : 'RESULT: one bow', fails);
process.exit(fails ? 1 : 0);
