/* Where things are, resolved rather than assumed.
 *
 * These four files have to work from the repo root, from inside scripts/, and
 * from a scratch copy - so the root is FOUND by walking up for the one
 * directory that can only be the theme, and every artefact lives beside the
 * scripts in .work/ so nothing is written where a person might mistake it for
 * source. */
const fs = require('fs');
const path = require('path');

function findRoot(start) {
  let d = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'theme', 'darling', 'src'))) return d;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  throw new Error('dtest: could not find the repo root (no theme/darling/src above ' + start + ')');
}

const ROOT = findRoot(__dirname);
const WORK = path.join(__dirname, '.work');
fs.mkdirSync(WORK, { recursive: true });

module.exports = {
  ROOT, WORK,
  MIRROR: path.join(WORK, 'mirror'),
  CAPTURE: path.join(WORK, 'capture.json'),
  SHOTS: path.join(WORK, 'shots'),
  BASELINE: path.join(__dirname, 'baseline'),
  THEME: path.join(ROOT, 'theme', 'darling'),
  SRC: path.join(ROOT, 'theme', 'darling', 'src'),
  BUILD: path.join(ROOT, 'theme', 'darling', 'darling.build.css'),
  ALLOW: path.join(__dirname, 'allow.json'),
};
