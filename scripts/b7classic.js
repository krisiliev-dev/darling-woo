// B7 / the two families whose absence had no cause yet.
//
// The reachability walk found neither `.wc-block-components-password-strength`
// nor `.select2-container`. Absence is not a decision - it only becomes one
// when you know WHY. Both of these have a classic-WooCommerce twin that the
// blocks walk would never see, and if the twin is reachable then B7's answer
// for that family is "wrong list", not "unreachable".
//
// So: type into the registration password field and see which meter appears,
// and ask every customer surface whether select2 is even enqueued.
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://darlinghome.bg';
const out = [];
const say = (s) => { console.log(s); out.push(s); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // --- 1. the password meter -------------------------------------------------
  const page = await ctx.newPage();
  await page.goto(BASE + '/my-account/', { waitUntil: 'networkidle', timeout: 60000 });

  const field = await page.$('#reg_password');
  say('=== REGISTRATION PASSWORD FIELD');
  if (!field) {
    say('  no #reg_password on /my-account/ - registration form not rendered');
  } else {
    await field.click();
    await field.type('Correct-Horse-9', { delay: 40 });
    await page.waitForTimeout(1500);
    const meters = await page.evaluate(() => {
      const hit = [];
      document.querySelectorAll('*').forEach((el) => {
        const c = typeof el.className === 'string' ? el.className : '';
        if (/password-strength|password-input|show-password/i.test(c)) {
          const r = el.getBoundingClientRect();
          hit.push({ cls: c, w: Math.round(r.width), h: Math.round(r.height), txt: (el.textContent || '').trim().slice(0, 40) });
        }
      });
      return hit;
    });
    if (!meters.length) say('  typed a password and NOTHING with a password-strength class appeared');
    for (const m of meters) say('  ' + m.cls + '   ' + m.w + 'x' + m.h + '   "' + m.txt + '"');
  }

  // --- 2. is select2 enqueued anywhere a customer goes -----------------------
  say('');
  say('=== SELECT2 / SELECTWOO ENQUEUED?');
  const SURFACES = ['/', '/shop/', '/cart/', '/checkout/', '/my-account/'];
  for (const s of SURFACES) {
    const p = await ctx.newPage();
    const assets = [];
    p.on('request', (r) => {
      const u = r.url();
      if (/select2|selectWoo/i.test(u)) assets.push(u.split('/').pop().split('?')[0]);
    });
    try {
      await p.goto(BASE + s, { waitUntil: 'networkidle', timeout: 60000 });
      await p.waitForTimeout(1000);
      const inDom = await p.evaluate(() => document.querySelectorAll('.select2-container, .select2, select.wc-enhanced-select').length);
      say('  ' + s.padEnd(14) + 'assets: ' + (assets.length ? [...new Set(assets)].join(' ') : 'none') + '   in DOM: ' + inDom);
    } catch (e) {
      say('  ' + s.padEnd(14) + 'FAILED: ' + e.message.split('\n')[0]);
    }
    await p.close();
  }

  await browser.close();
  fs.writeFileSync('b7-classic.txt', out.join('\n') + '\n');
  console.log('\n-> b7-classic.txt');
})();
