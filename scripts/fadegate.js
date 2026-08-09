// How many more of these are there?
//
// The cart streak ends its keyframes at opacity:0, and its host rule declares no
// opacity at all. So the moment the 820ms is up the element falls back to its
// base - opacity 1 - and the trail comes BACK and stays. Same shape as the
// frozen-animation family: the animation is not what makes it invisible, and
// when the animation stops being in charge, whatever the base says takes over.
//
// This walks every @keyframes whose LAST stop sets opacity:0, finds every rule
// that runs it, and flags the ones with no opacity of their own and no
// fill-mode holding the end state.
//
// *** `infinite` IS EXCLUDED, AND THAT IS THE WHOLE DIFFERENCE. *** An animation
// that never ends never hands the element back, so the four notice star fields -
// which run for as long as the notice exists - are not this bug and a gate that
// shouts about them is a gate people learn to ignore. On its first run the cart
// streak was the only real hit.
const fs = require('fs');
const path = require('path');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'theme/darling/darling.build.css'), 'utf8');

// which keyframes end invisible
const endsHidden = new Set();
const kfRe = /@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g;
let m;
while ((m = kfRe.exec(CSS))) {
  let i = kfRe.lastIndex, depth = 1;
  while (i < CSS.length && depth > 0) {
    if (CSS[i] === '{') depth++;
    else if (CSS[i] === '}') depth--;
    i++;
  }
  const body = CSS.slice(kfRe.lastIndex, i - 1);
  // the last stop in source order that mentions opacity
  const stops = [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const last = stops[stops.length - 1];
  if (!last) continue;
  const sel = last[1].trim();
  if (!/(^|,)\s*(100%|to)\s*$/.test(sel) && !/100%|to/.test(sel)) continue;
  if (/opacity\s*:\s*0\b/.test(last[2])) endsHidden.add(m[1]);
}

// every rule that runs one of them
const flagged = [];
const ruleRe = /([^{}@][^{}]*)\{([^{}]*)\}/g;
while ((m = ruleRe.exec(CSS))) {
  const sel = m[1].trim().replace(/\s+/g, ' ');
  const body = m[2];
  const anim = /animation\s*:\s*([^;]+)/.exec(body) || /animation-name\s*:\s*([^;]+)/.exec(body);
  if (!anim) continue;
  const names = [...endsHidden].filter((n) => new RegExp('\\b' + n + '\\b').test(anim[1]));
  if (!names.length) continue;
  if (/\binfinite\b/.test(anim[1])) continue;   // it never ends, so it never hands back
  // *** STRIP COMMENTS FIRST. *** A declaration that follows a /* ... */ is not
  // preceded by a semicolon, so the first version of this gate read the fix for
  // the cart streak as the bug it was written to catch. A gate that fails on the
  // remedy is worse than no gate.
  const bare = body.replace(/\/\*[\s\S]*?\*\//g, '');
  const hasOpacity = /(^|;)\s*opacity\s*:/.test(bare);
  const hasFill = /(forwards|both)/.test(anim[1]) || /animation-fill-mode\s*:\s*(forwards|both)/.test(body);
  if (!hasOpacity && !hasFill) flagged.push([sel, names.join(','), anim[1].trim().slice(0, 40)]);
}

console.log('keyframes ending at opacity:0  ->  %s', [...endsHidden].join(', ') || 'none');
console.log('');
if (!flagged.length) {
  console.log('RESULT: nothing fades out and comes back   0 failed');
  process.exit(0);
}
for (const [sel, names, a] of flagged) {
  console.log('  %s\n      runs %s   (%s)   and declares no opacity', sel.slice(0, 110), names, a);
}
console.log('\nRESULT: *** %d rule(s) will show the element again when the animation ends ***',
            flagged.length);
process.exit(1);
