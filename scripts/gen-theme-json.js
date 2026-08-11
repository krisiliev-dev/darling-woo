// theme.json is GENERATED from src/tokens. Run by scripts/build-css.js.
//
// WHY THIS EXISTS. theme.json is not decoration: WordPress reads it and emits
// ~17.6 KB of global-styles-inline-css on every page of this site, plus the
// seven @font-face blocks, plus every --wp--preset--color--* variable that
// every core block references. So it is a SECOND stylesheet with a SECOND
// palette, and until now it held the third palette we ever had - cherry, honey,
// cocoa, cream, vanilla, sand. No claret. No greys. Blocks were pulling those
// colours no matter what our stylesheet said.
//
// Deleting it is not an option and it is worth being precise about why: without
// theme.json WordPress falls back to core defaults, which ADDS a default palette
// rather than removing one, and the font registration goes with it - we would be
// hand-writing @font-face and taking the fonts away from the block editor, which
// is the exact second-source-of-truth this refactor exists to kill.
//
// So it is generated instead. Change a colour in tokens/colour.css and the
// stylesheet and the editor's swatches move together, because there is only one
// place the number lives.
//
// WHAT IS PRESERVED, NOT GENERATED: the fontFace arrays. Those are file paths
// and unicode-ranges, not design decisions, and they have no representation in
// the token files. They are read out of the existing theme.json and written
// back untouched.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'theme', 'darling', 'src');
const OUT = path.join(ROOT, 'theme', 'darling', 'theme.json');

const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

function tokens(css) {
  const map = new Map();
  for (const m of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim))
    map.set(m[1], m[2].trim().replace(/\s+/g, ' '));
  return map;
}

const colour = tokens(read('tokens/colour.css'));
const type = tokens(read('tokens/type.css'));
const space = tokens(read('tokens/space.css'));
const radius = tokens(read('tokens/radius.css'));

/* contentSize and wideSize are read straight from the tokens now. They used to
 * be px and --measure-page was computed here from the two ends; the owner moved
 * all three to percentages after seeing them at full width, so there is nothing
 * left to compute and a px-only parser would have thrown. Any CSS length works
 * in theme.json, percentages included - what matters is that the number lives in
 * the token file and not in two places. */
const lengthOf = (name, map, fallback) => {
  const v = (map.get(name) || '').trim();
  if (!v) { console.log('   gen-theme-json: ' + name + ' missing, using ' + fallback); return fallback; }
  if (/^(calc|var)\(/.test(v)) throw new Error('gen-theme-json: theme.json cannot hold a calc()/var(): ' + name + ' = ' + v);
  return v;
};
const MEASURE_PAGE = lengthOf('--measure-page', type, '90%');

// ---- palette ---------------------------------------------------------------
// The --c-* primitives and nothing else. Primitives name the VALUE, semantics
// name the ROLE, and an editor swatch called "surface-page" would be a role
// offered to someone choosing a colour by eye - which is how a role ends up
// used for something it was not for.
const NAMES = {
  claret: 'Claret', cherry: 'Cherry', 'cherry-deep': 'Cherry deep',
  cocoa: 'Cocoa', cream: 'Cream', white: 'White',
  mauve: 'Mauve', 'mauve-light': 'Mauve light',
  'grey-100': 'Grey 100', 'grey-200': 'Grey 200',
  'grey-300': 'Grey 300', 'grey-400': 'Grey 400',
  'ash-100': 'Ash 100', 'ash-200': 'Ash 200',
  'ash-300': 'Ash 300', 'ash-400': 'Ash 400'
};

// Slugs that existed in the hand-written theme.json and do not exist in the
// tokens. Saved block content referencing these loses its colour, so the build
// says so out loud rather than letting it happen quietly.
const RETIRED = ['honey', 'honey-dark', 'vanilla', 'sand'];

const palette = [];
const notLiteral = [];
for (const [tok, val] of colour) {
  if (!tok.startsWith('--c-')) continue;
  // The slug drops the `c-`: WordPress turns it into --wp--preset--color--<slug>
  // and emits `has-<slug>-color` classes into saved block content, so the slug
  // is a PUBLIC name that existing posts already reference. `cherry` and `cocoa`
  // keep working; only the retired colours change, which is the point.
  const slug = tok.slice(4);
  if (!/^(#[0-9a-f]{3,8}|rgb|hsl|oklch)/i.test(val)) { notLiteral.push(tok); continue; }
  palette.push({ slug, color: val, name: NAMES[slug] || slug });
}
const slugs = new Set(palette.map(p => p.slug));
const dropped = RETIRED.filter(r => !slugs.has(r));
if (dropped.length)
  console.warn('  theme.json: RETIRED palette slugs %s - any saved block content ' +
               'using has-<slug>-color or --wp--preset--color--<slug> loses its ' +
               'colour. Check before the cutover.', dropped.join(', '));
if (notLiteral.length)
  console.warn('  theme.json: skipped non-literal primitives: ' + notLiteral.join(', '));

// ---- type ------------------------------------------------------------------
const FONT_NAMES = { 'font-display': 'Playfair Display', 'font-ui': 'Inter' };
const families = [];
for (const key of ['font-ui', 'font-display']) {
  const val = type.get('--' + key);
  if (!val) continue;
  const first = val.split(',')[0].replace(/["']/g, '').trim();
  families.push({
    slug: first.toLowerCase().replace(/\s+/g, '-'),
    name: FONT_NAMES[key] || first,
    fontFamily: val
  });
}

const SIZE_NAMES = {
  'fs-badge': 'Badge', 'fs-fine': 'Fine', 'fs-meta': 'Meta', 'fs-ui': 'UI',
  'fs-body': 'Body', 'fs-lede': 'Lede', 'fs-section': 'Section',
  'fs-wordmark': 'Wordmark', 'fs-band': 'Band', 'fs-hero': 'Hero'
};
const fontSizes = Object.keys(SIZE_NAMES)
  .filter(k => type.has('--' + k))
  .map(k => ({ slug: k.replace('fs-', ''), name: SIZE_NAMES[k], size: type.get('--' + k) }));

// ---- space -----------------------------------------------------------------
const STEPS = ['3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
const spacingSizes = STEPS
  .filter(s => space.has('--space-' + s))
  .map((s, i) => ({ slug: String(20 + i * 10), name: s.toUpperCase(),
                    size: space.get('--space-' + s) }));

// ---- assemble --------------------------------------------------------------
let existing = {};
try { existing = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}

// carry the font FILES across; they are not design decisions and are not in src/
const oldFaces = new Map(
  ((existing.settings || {}).typography || {}).fontFamilies
    ? existing.settings.typography.fontFamilies.map(f => [f.slug, f.fontFace])
    : []);
let facesKept = 0;
for (const f of families) {
  const face = oldFaces.get(f.slug);
  if (face) { f.fontFace = face; facesKept += face.length; }
}
if (!facesKept)
  console.warn('  theme.json: NO @font-face blocks carried over - the fonts will ' +
               'stop loading. Check the family slugs against the old file.');

const theme = {
  $schema: 'https://schemas.wp.org/trunk/theme.json',
  version: 3,
  settings: {
    appearanceTools: true,
    useRootPaddingAwareAlignments: true,
    color: {
      // Every default off. WordPress ships a palette, a set of gradients and a
      // duotone list, all of which appear as swatches next to ours and all of
      // which are off-brand. There is one palette.
      defaultPalette: false,
      defaultGradients: false,
      defaultDuotone: false,
      custom: false,        // no arbitrary colour picker in the editor
      customGradient: false,
      palette
    },
    typography: {
      fluid: false,         // the scale is fixed on purpose; only the hero clamps
      defaultFontSizes: false,
      customFontSize: false,
      fontSizes,
      fontFamilies: families
    },
    layout: {
      // contentSize follows --measure-page, the constrained default in
      // patterns/flow.css, so the block editor and the front end cannot disagree
      // about how wide a page column is. It is a calc() in the token file; the
      // resolved value is written here because theme.json cannot hold one.
      contentSize: MEASURE_PAGE,
      wideSize: lengthOf('--page-max', space, '95%')
    },
    spacing: {
      units: ['px', 'em', 'rem', '%'],
      defaultSpacingSizes: false,
      customSpacingSize: false,
      spacingSizes
    }
  },
  // ---- styles ---------------------------------------------------------------
  // NOT preserved. The hand-written block was a parallel type system: it set h1,
  // h2 and h3 colour, size, weight, line-height and family, pointing at
  // --wp--preset--color--honey-dark and --wp--preset--font-size--x-large, none
  // of which survive the token palette. Preserving it would have shipped four
  // dangling var() references, and a dangling var() in theme.json fails the same
  // silent way it does anywhere else.
  //
  // It is also the exact duplication this refactor exists to remove:
  // base/elements.css already says what an h1 is. So theme.json now declares
  // only what ONLY it can declare - the editor canvas root - and the elements
  // come from the stylesheet, which the editor gets via add_editor_style() in
  // the enqueue commit. One definition of a heading, in one file.
  styles: {
    color: {
      background: 'var(--wp--preset--color--grey-100)',
      text: 'var(--wp--preset--color--cocoa)'
    },
    typography: {
      fontFamily: 'var(--wp--preset--font-family--inter)',
      fontSize: 'var(--wp--preset--font-size--body)',
      lineHeight: '1.6',
      // *** WHATEVER THIS BLOCK OMITS, THE PARENT THEME FILLS IN. ***
      // The note above says theme.json should declare "only what ONLY it can
      // declare" and leave the rest to the stylesheet. That reasoning is about
      // DUPLICATION and it is right; what it misses is INHERITANCE. This is a
      // child of Twenty Twenty-Five, WordPress MERGES the two theme.json files,
      // and the parent's styles.typography reads:
      //
      //     "fontWeight": "300",  "letterSpacing": "-0.1px"
      //
      // Omitting them here does not leave them to base/elements.css. It leaves
      // them to Manrope's designer. And global styles print UNLAYERED, so they
      // beat every layer in the build regardless of specificity.
      //
      // Measured on the live home page against the gallery, which loads only
      // darling.build.css: EVERY component differed, both the same two ways -
      // font-weight 400 in the gallery and 300 on the site, letter-spacing
      // normal in the gallery and -0.1px on the site. That is what the owner
      // saw and reported as "the font isn't right", and no grep of src/ could
      // ever have found it: the losing rule is in the parent theme's JSON.
      //
      // --fw-regular, from tokens/type.css, the same token --type-body uses.
      fontWeight: type.get('--fw-regular') || '400',
      // src/ declares no letter-spacing token at any size, so the system's
      // answer is `normal`. Stated rather than omitted, for the reason above.
      letterSpacing: 'normal'
    },
    // *** AND WHEN THE PARENT LEFT, WORDPRESS CORE TOOK THE BUTTON. ***
    // Dropping Twenty Twenty-Five closed four leaks and opened one: core's own
    // theme.json also declares .wp-element-button, and with nobody overriding it
    // the account form's submit buttons went from gold to #32373c on white -
    // measured rgb(50,55,60) on /my-account/ minutes after the switch.
    //
    // Same lesson as the typography block directly above, one origin further
    // out: what this file omits is not left to base/elements.css, it is left to
    // whoever declares it next. There is no longer a parent theme; there is
    // still core.
    //
    // These are OUR tokens through our own presets, so the editor's button and
    // the stylesheet's .d-btn cannot drift: --action is var(--c-cherry) and
    // --action-ink is var(--c-cream) in tokens/colour.css.
    elements: {
      button: {
        color: {
          background: 'var(--wp--preset--color--cherry)',
          text: 'var(--wp--preset--color--cream)'
        },
        border: { radius: radius.get('--radius-pill') || '999px' },
        typography: { fontWeight: type.get('--fw-medium') || '600' },
        ':hover': {
          color: {
            background: 'var(--wp--preset--color--claret)',
            text: 'var(--wp--preset--color--cream)'
          }
        }
      }
    }
  }
};

// ---- the check that stops a dangling preset -------------------------------
// Same failure as an undefined custom property, one file over.
{
  const have = new Set([
    ...palette.map(p => 'color--' + p.slug),
    ...fontSizes.map(f => 'font-size--' + f.slug),
    ...families.map(f => 'font-family--' + f.slug)
  ]);
  const bad = [];
  for (const m of JSON.stringify(theme).matchAll(/--wp--preset--([a-z-]+--[a-z0-9-]+)/g))
    if (!have.has(m[1])) bad.push(m[1]);
  if (bad.length) {
    console.error('THEME.JSON CHECK FAILED - references a preset it does not define:');
    for (const b of [...new Set(bad)]) console.error('  --wp--preset--' + b);
    process.exit(1);
  }
}

fs.writeFileSync(OUT, JSON.stringify(theme, null, '\t') + '\n');
console.log('theme.json: %d colours, %d sizes, %d families (%d font files kept), ' +
            '%d spacing steps, content %s / wide %s',
  palette.length, fontSizes.length, families.length, facesKept,
  spacingSizes.length, theme.settings.layout.contentSize, theme.settings.layout.wideSize);
