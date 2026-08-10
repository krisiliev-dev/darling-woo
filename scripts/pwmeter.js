// Task #53 - the three classic families that no phase list covered.
//
// B7's reachability walk said `.wc-block-components-password-strength` is off,
// and it is: signup-at-checkout is "no". But the CLASSIC twin is live on
// /my-account/ for any customer creating an account, and it lives in
// woocommerce-general, which the stage-6 parse never read because that parse
// only opened blocks/checkout.css.
//
// This measures what the dequeue would take away, which is the only thing worth
// knowing before writing a replacement:
//
//   BEFORE  Woo's own sheets on, at each of the four strength levels, because
//           the meter is a colour that changes and one capture would show one
//           quarter of it
//   AFTER   the cutover state - Woo's sheets and our old style.css disabled,
//           darling.build.css injected - so what goes bare is visible rather
//           than inferred
//
// A screenshot each, because a colour ramp is not something to review as JSON.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const T = path.join(ROOT, 'theme', 'darling');
const CSS = fs.readFileSync(path.join(T, 'darling.build.css'), 'utf8');
const BASE = process.env.BASE || 'https://darlinghome.bg';

// four passwords chosen to land on Woo's four buckets, weakest first
const LEVELS = [
  ['short', 'abc'],
  ['bad', 'password'],
  ['good', 'Darling2026'],
  ['strong', 'Correct-Horse-9-Battery'],
];

const FAMILY = [
  '.woocommerce-password-strength',
  '.woocommerce-password-hint',
  '.password-input',
  '.show-password-input',
  '#reg_password',
];

const PROBE = `(sel) => {
  const e = document.querySelector(sel);
  if (!e) return 'MISS';
  const b = e.getBoundingClientRect();
  const c = getComputedStyle(e);
  return {
    cls: (typeof e.className === 'string' ? e.className : ''),
    rect: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
    display: c.display, pad: c.padding, margin: c.margin,
    bg: c.backgroundColor, color: c.color,
    border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
    radius: c.borderRadius, size: c.fontSize, weight: c.fontWeight,
    txt: (e.textContent || '').trim().slice(0, 40),
  };
}`;

const out = [];
const say = (s) => { console.log(s); out.push(s); };

async function sweep(page, label) {
  say('');
  say('======== ' + label);
  for (const [name, pw] of LEVELS) {
    await page.fill('#reg_password', '');
    await page.type('#reg_password', pw, { delay: 25 });
    await page.waitForTimeout(700);
    say('-- ' + name + '  (' + pw.length + ' chars)');
    for (const sel of FAMILY) {
      const r = await page.evaluate('(' + PROBE + ')(' + JSON.stringify(sel) + ')');
      if (r === 'MISS') { say('   ' + sel.padEnd(34) + 'MISS'); continue; }
      say('   ' + sel.padEnd(34) + JSON.stringify(r));
    }
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 1000 } });
  await page.goto(BASE + '/my-account/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);

  if (!(await page.$('#reg_password'))) {
    console.log('no #reg_password - registration form is not on this page');
    process.exit(1);
  }

  await sweep(page, 'BEFORE - WooCommerce sheets on (what a customer sees today)');
  await page.screenshot({ path: 'pw-before.png', fullPage: false });

  // the cutover state, the same act checkoutshot.js performs one page at a time
  const off = await page.evaluate(() => {
    const killed = [];
    for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
      if (/\/themes\/darling\/style\.css|assets\/darling\.css/.test(l.href) ||
          /woocommerce|wc-blocks|packages-style|select2|password-strength/.test(l.href)) {
        l.disabled = true; killed.push(l.href.split('/').pop());
      }
    }
    return killed;
  });
  say('');
  say('sheets disabled: ' + JSON.stringify(off));
  await page.addStyleTag({ content: CSS });
  await page.waitForTimeout(600);

  await sweep(page, 'AFTER - dequeued, only darling.build.css (what we must replace)');
  await page.screenshot({ path: 'pw-after.png', fullPage: false });

  fs.writeFileSync(path.join(ROOT, 'pw-meter.txt'), out.join('\n') + '\n');
  console.log('\n-> pw-meter.txt, pw-before.png, pw-after.png');
  await browser.close();
})();
