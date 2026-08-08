// Every var() in the built stylesheet must resolve to a token that is declared
// somewhere in the same stylesheet.
//
// *** THIS EXISTS BECAUSE THE SAME BUG HAS NOW SHIPPED THREE TIMES. ***
//   --ink-2      consumed, never declared  -> the placeholder caption went red
//   --d-page     declared, never consumed  -> a rename that did nothing
//   --surface-finish  declared, then deleted in a rewrite while .d-finish still
//                     referenced it -> background-image went
//                     invalid-at-computed-value-time and resolved to `none`,
//                     so every button silently lost its ramp, its speculars and
//                     its inner glow, and fell back to a flat fill.
//
// None of the three throws. An undefined custom property is not a parse error:
// the declaration that references it is dropped at computed-value time and the
// property falls back to inherit or initial. There is nothing in the console
// and nothing in a screenshot diff unless a human happens to look at the right
// element. So it has to be checked here, at build time, or not at all.
//
// A var() with a fallback - var(--x, 16%) - is allowed to be undeclared: the
// fallback is the author saying "this one is optional".
const fs = require('fs');
const path = require('path');

const file = process.argv[2] ||
  path.join(__dirname, '..', 'theme', 'darling', 'darling.build.css');
// Comments are stripped FIRST. A var() inside a comment is documentation, not a
// reference, and failing the build on one teaches people to distrust the gate -
// which is worse than not having it. Caught by rating.css explaining its own
// --rating with a worked example.
const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const declared = new Set();
for (const m of css.matchAll(/(?:^|[{;\s])(--[a-z0-9-]+)\s*:/gi)) declared.add(m[1]);
for (const m of css.matchAll(/@property\s+(--[a-z0-9-]+)/gi)) declared.add(m[1]);

const missing = new Map();   // token -> how many times it is referenced
const optional = new Set();  // referenced only with a fallback
for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,|\))/gi)) {
  const [, name, next] = m;
  if (declared.has(name)) continue;
  if (next === ',') { optional.add(name); continue; }
  missing.set(name, (missing.get(name) || 0) + 1);
}

// The other half of the same failure: a token nobody reads. Not fatal - a token
// can legitimately be there for a consumer to opt into - but it is reported,
// because --d-page was exactly this and nobody noticed for a sprint.
const unused = [...declared].filter(t =>
  !new RegExp('var\\(\\s*' + t + '\\s*[,)]').test(css) &&
  !/^--(gh|gs|gl|money-path|ff-|sd-|speck-|flair-|grain-x|grain-y)/.test(t));

console.log('token check: %d declared, %d referenced-with-fallback, %d unused',
  declared.size, optional.size, unused.length);
if (unused.length) console.log('  unused (not fatal): ' + unused.join(', '));

if (missing.size) {
  console.error('\nTOKEN CHECK FAILED - referenced with no declaration and no fallback:');
  for (const [name, n] of [...missing].sort((a, b) => b[1] - a[1]))
    console.error('  %s   x%d', name, n);
  console.error('\nA declaration that references an undefined custom property is');
  console.error('dropped silently at computed-value time. Fix the token or give');
  console.error('the var() a fallback.');
  process.exit(1);
}
