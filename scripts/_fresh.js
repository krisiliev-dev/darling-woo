/* IS THE GALLERY THE CURRENT STYLESHEET, OR LAST NIGHT'S?
 *
 * *** gallery.html INLINES darling.build.css. IT DOES NOT LINK IT. ***
 * That one fact is the whole reason this file exists, and it is easy to work
 * beside for weeks without noticing, because everything still LOOKS right.
 *
 * The consequence: editing src/ and running build-css.js changes nothing the
 * gallery shows. Every gate that reads gallery.html - aligngate, namegate,
 * matrixgate, frozengate, fadegate, cascadediff - is measuring whatever was
 * inlined the last time gen-gallery.py ran. Miss that step and they all pass, on
 * the previous build, and say so in the same words they use when they mean it.
 *
 * MEASURED, 2026-08-11. A 3px padding change on .d-card, edited in src/ and
 * built, with the gallery not regenerated:
 *
 *     cascadediff --against premerge   ->  "nothing moved."       exit 0
 *     ...then gen-gallery.py, again    ->  "OUTSIDE THE NOISE: 78" exit 1
 *
 * A clean all-clear on a change that moves 78 elements. That instrument was
 * about to gate a few dozen serial merges - it would have blessed every one of
 * them without having looked at any of them, which is worse than not checking,
 * because the check is what I would have pointed at afterwards.
 *
 * So gen-gallery.py stamps the built sheet's md5 into the page, and this refuses
 * to measure a page whose stamp is not the build on disk:
 *
 *     require('./_fresh').assertGalleryFresh();
 *
 * It is deliberately a HARD exit rather than a warning. A warning printed above
 * a hundred lines of green is a warning nobody reads.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.dirname(__dirname);
const THEME = path.join(ROOT, 'theme', 'darling');

function assertGalleryFresh(opts) {
  const o = opts || {};
  const cssFile = o.css || path.join(THEME, 'darling.build.css');
  const galleryFile = o.gallery || path.join(THEME, 'gallery.html');

  if (!fs.existsSync(cssFile)) {
    console.error('no ' + cssFile + ' - run `node scripts/build-css.js`. NOT a pass.');
    process.exit(2);
  }
  if (!fs.existsSync(galleryFile)) {
    console.error('no ' + galleryFile + ' - run `python3 scripts/gen-gallery.py`. NOT a pass.');
    process.exit(2);
  }

  const built = crypto.createHash('md5')
    .update(fs.readFileSync(cssFile, 'utf8'), 'utf8').digest('hex');
  const html = fs.readFileSync(galleryFile, 'utf8');
  const m = html.match(/name="darling-css-stamp"\s+content="([a-f0-9]+)"/);

  if (!m) {
    console.error(
      '\nTHE GALLERY CARRIES NO BUILD STAMP.\n' +
      'gen-gallery.py writes <meta name="darling-css-stamp"> so the gates can tell\n' +
      'a current page from a stale one. This gallery predates that, which means it\n' +
      'also predates knowing the difference. Rebuild:\n' +
      '    node scripts/build-css.js && python3 scripts/gen-gallery.py\n');
    process.exit(2);
  }
  if (m[1] !== built) {
    console.error(
      '\nTHE GALLERY IS STALE, SO THIS MEASURES THE PREVIOUS BUILD.\n' +
      '  darling.build.css on disk : ' + built + '\n' +
      '  inlined in gallery.html   : ' + m[1] + '\n' +
      '\n' +
      'gallery.html INLINES the stylesheet - it does not link it - so a build\n' +
      'without a regenerate changes nothing the gates can see, and they pass on\n' +
      'the old page in the same words they use when they mean it.\n' +
      '    node scripts/build-css.js && python3 scripts/gen-gallery.py\n');
    process.exit(2);
  }
  return built;
}

module.exports = { assertGalleryFresh };
