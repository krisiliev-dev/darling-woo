/* THE PARITY CUSTOMER'S CREDENTIALS — read here and nowhere else.
 *
 * Two scripts log into the live shop as the parity customer: capture-mirror.js
 * for the nine-page mirror, acctpages.js for the account sub-pages. The second
 * one was written with its own copy of the parser and it FAILED ON THE FIRST
 * RUN — the copy handled json, key=value and two bare lines, and the real file
 * is none of those. It is one line, the secret alone, with no username in it at
 * all, because the username has never varied and prose is the right place for a
 * thing that is not a secret.
 *
 * So the shapes are not obvious and a second implementation of them is a second
 * chance to get them wrong. One definition, both callers:
 *
 *   const { readAcct } = require('./_acct');
 *   const { user, pass } = readAcct();          // throws, loudly, if it cannot
 *
 * *** WHAT IS PRINTED, AND WHAT IS NOT. *** The shape that parsed, the first two
 * characters of the username and the LENGTH of the secret. That is enough to
 * diagnose a wrong file without the contents ever reaching a terminal, a log or
 * a transcript. The secret itself is passed straight to page.fill() and touches
 * nothing else.
 */
const fs = require('fs');
const path = require('path');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };

/* ../_scratch_woo/parity4/.acct relative to the repo root, which is the parent
 * of this scripts/ directory. Deliberately OUTSIDE the repo. */
const DEFAULT_ACCT = path.join(path.dirname(__dirname), '..', '_scratch_woo', 'parity4', '.acct');

function readAcct(acctPath) {
  const ACCT = path.resolve(acctPath || arg('--acct', DEFAULT_ACCT));
  if (!fs.existsSync(ACCT)) throw new Error('no .acct at ' + ACCT);
  const raw = fs.readFileSync(ACCT, 'utf8');
  let user = '', pass = '', shape = '';

  try {                                   // json { user, pass } / { username, password }
    const j = JSON.parse(raw);
    user = j.user || j.username || j.email || '';
    pass = j.pass || j.password || '';
    if (user && pass) shape = 'json';
  } catch (e) { /* not json */ }

  if (!shape) {                           // KEY=VALUE or KEY: VALUE lines
    const kv = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)$/.exec(line);
      if (m) kv[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    user = kv.user || kv.username || kv.email || kv.login || '';
    pass = kv.pass || kv.password || '';
    if (user && pass) shape = 'key=value';
  }

  if (!shape) {
    const l = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (l.length >= 2) { user = l[0]; pass = l[1]; shape = 'two lines'; }
    else if (l.length === 1 && l[0].includes(':')) {
      /* user:secret, split on the FIRST colon only - a secret may contain one
       * and a WordPress username may not. */
      const i = l[0].indexOf(':');
      user = l[0].slice(0, i); pass = l[0].slice(i + 1); shape = 'user:secret';
    } else if (l.length === 1) {
      /* *** THE FILE IS THE SECRET AND NOTHING ELSE. *** Which is what it is:
       * one line, no separator. HANDOFF records the username as
       * `parity-customer` in prose, which is fine for a username and is exactly
       * why the secret is not in prose beside it. --user overrides. */
      user = arg('--user', 'parity-customer'); pass = l[0]; shape = 'secret only, user from --user';
    }
  }

  if (!user || !pass) {
    throw new Error('.acct parsed to nothing usable (tried json, key=value, user:secret, two lines, secret-only)');
  }
  console.log('   .acct: ' + shape + ', user starts "' + user.slice(0, 2) +
    '…", secret ' + pass.length + ' chars (never printed)');
  return { user, pass };
}

module.exports = { readAcct, DEFAULT_ACCT };
