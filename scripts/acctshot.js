// A review capture the owner can actually read.
//
// The last one was a full-page screenshot of /my-account/ and he could not see
// the password meter at all: the live page still serves the LEGACY header
// markup, our build styles parts/header.html, and the theme is not deployed -
// so in every capture the header has NO stylesheet and its unstyled height
// pushes the form off the bottom. That is an artefact of photographing an
// undeployed theme against a live page, and it will keep happening until the
// cutover.
//
// So this clips to the thing under review instead of shooting the whole page.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const CSS = fs.readFileSync(path.join(ROOT, 'theme/darling/darling.build.css'), 'utf8');
const BASE = 'https://darlinghome.bg';

(async () => {
  const browser = await chromium.launch();
  for (const [tag, w] of [['desk', 1240], ['phone', 430]]) {
    const p = await browser.newPage({ viewport: { width: w, height: 1200 } });
    await p.goto(BASE + '/my-account/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.waitForTimeout(2500);
    await p.evaluate(() => {
      for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
        if (/\/themes\/darling\/style\.css|assets\/darling\.css/.test(l.href) ||
            /woocommerce|wc-blocks|packages-style|select2/.test(l.href)) l.disabled = true;
      }
      // the unstyled legacy header is not under review and only gets in the way
      const h = document.querySelector('.darling-header, header, .site-header');
      if (h) h.style.display = 'none';
    });
    await p.addStyleTag({ content: CSS });
    await p.waitForTimeout(600);

    const pw = await p.$('#reg_password');
    if (pw) { await pw.click(); await pw.type('Darling-2026', { delay: 20 }); await p.waitForTimeout(900); }

    const box = await p.evaluate(() => {
      const e = document.querySelector('#customer_login') || document.querySelector('.woocommerce');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: Math.max(0, r.x - 24), y: Math.max(0, r.y + window.scrollY - 24), width: r.width + 48, height: r.height + 48 };
    });
    if (!box) { console.log(tag + ': no #customer_login on the page'); await p.close(); continue; }
    await p.screenshot({ path: 'acct-' + tag + '.png', clip: box });
    console.log(tag + ': acct-' + tag + '.png  ' + Math.round(box.width) + 'x' + Math.round(box.height));
    await p.close();
  }
  await browser.close();
})();
