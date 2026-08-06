/**
 * Design audit capture: screenshots + hard layout-defect data across the live
 * site at real viewports. The JSON is the valuable part — it turns "looks off"
 * into "this element overflows its parent by 34px at 390w".
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/designpass';
const LIVE = 'https://darlinghome.bg';

const PAGES = [
  ['home', '/'],
  ['shop', '/shop/'],
  ['category', '/product-category/za-kuhnyata/'],
  ['product', '/product/%d1%82%d0%b5%d1%81%d1%82%d0%be%d0%b2%d0%b0-%d1%82%d0%b0%d0%b1%d1%83%d1%80%d0%b5%d1%82%d0%ba%d0%b0/'],
  ['account', '/my-account/'],
  ['page', '/pomosht/'],
];
const VIEWPORTS = [
  ['mobile', 390, 844],
  ['phablet', 430, 932],
  ['tablet', 768, 1024],
  ['laptop', 1280, 800],
  ['desktop', 1440, 900],
  ['wide', 1920, 1080],
];

const scan = () => {
  const docW = document.documentElement.clientWidth;
  const defects = [];
  const excluded = { scroller: 0, thirdParty: 0, offscreen: 0 };
  // Three families of legitimate "overflow" that are not defects. Counting them
  // as failures makes the gate cry wolf, which is worse than not gating at all.
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (/(auto|scroll)/.test(o.overflowX + o.overflow)) return true;
    }
    return false;
  };
  const isThirdParty = (el) =>
    !!el.closest('iframe, [class*="__PrivateStripe"], [id*="stripe"], [class*="nsl-"], .wc-block-components-express-payment');
  const isOffscreen = (el) => {
    const r = el.getBoundingClientRect();
    // deliberate hiding: honeypots, screen-reader-only text
    return r.right < -500 || r.left > docW + 2000 || getComputedStyle(el).clip === 'rect(0px, 0px, 0px, 0px)';
  };
  const push = (type, el, detail) => {
    const cls = (el.className && String(el.className).slice(0, 60)) || '';
    defects.push({ type, tag: el.tagName.toLowerCase(), cls, detail });
  };
  // 1. horizontal overflow of the document
  if (document.documentElement.scrollWidth > docW + 1) {
    defects.push({ type: 'doc-overflow', detail: `scrollWidth ${document.documentElement.scrollWidth} > ${docW}` });
  }
  const all = Array.from(document.querySelectorAll('body *'));
  all.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') return;
    // 2. element sticking out of the viewport
    if (r.right > docW + 1 || r.left < -1) {
      if (isOffscreen(el)) { excluded.offscreen++; }
      else if (isThirdParty(el)) { excluded.thirdParty++; }
      else if (inScroller(el)) { excluded.scroller++; }
      else { push('viewport-overflow', el, `left ${Math.round(r.left)} right ${Math.round(r.right)} vs ${docW}`); }
    }
    // 3. child wider than parent (broken containment)
    const p = el.parentElement;
    if (p && p !== document.body) {
      const pr = p.getBoundingClientRect();
      const pcs = getComputedStyle(p);
      if (pcs.overflow === 'visible' && pr.width > 0 && r.width > pr.width + 2) {
        if (isThirdParty(el)) { excluded.thirdParty++; }
        else { push('escapes-parent', el, `${Math.round(r.width)} > parent ${Math.round(pr.width)} (${p.tagName.toLowerCase()}.${String(p.className).slice(0, 30)})`); }
      }
    }
    // 4. text overflowing its box
    if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'hidden' && cs.textOverflow !== 'ellipsis') {
      push('text-overflow', el, `scrollW ${el.scrollWidth} > clientW ${el.clientWidth}`);
    }
    // 5. touch targets too small (mobile only, checked by caller)
    if (/^(a|button)$/i.test(el.tagName) && (r.height < 32 || r.width < 32) && el.textContent.trim()) {
      push('small-target', el, `${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });
  // The ambient sparkle layer is a GENERATOR of random 8-22px text nodes with
  // random inline offsets. Counting it made the type and spacing censuses
  // unfalsifiable: they could never fall, no matter what the stylesheet did.
  // It is decoration, aria-hidden, and not part of the reading surface.
  const census = all.filter(el => !el.closest('.darling-ambient'));

  // 6. spacing vocabulary: how many distinct margins/paddings are in play?
  const spacings = new Set();
  census.slice(0, 900).forEach(el => {
    const cs = getComputedStyle(el);
    ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'gap'].forEach(p => {
      const v = cs[p];
      if (v && v !== '0px' && v !== 'normal') spacings.add(v);
    });
  });
  // 7. type scale sprawl
  const sizes = new Set();
  census.forEach(el => { if (el.children.length === 0 && el.textContent.trim()) sizes.add(getComputedStyle(el).fontSize); });
  // 8. ambient sparkle layer
  const amb = document.querySelector('.darling-ambient');
  const ambInfo = amb ? {
    children: amb.children.length,
    zIndex: getComputedStyle(amb).zIndex,
    position: getComputedStyle(amb).position,
    over_content: parseInt(getComputedStyle(amb).zIndex || '0', 10) > 0,
  } : null;
  return {
    excluded,
    defects: defects.slice(0, 60),
    defect_count: defects.length,
    by_type: defects.reduce((a, d) => { a[d.type] = (a[d.type] || 0) + 1; return a; }, {}),
    distinct_spacings: Array.from(spacings).sort((a, b) => parseFloat(a) - parseFloat(b)),
    distinct_font_sizes: Array.from(sizes).sort((a, b) => parseFloat(a) - parseFloat(b)),
    ambient_excluded_from_census: all.length - census.length,
    ambient: ambInfo,
  };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ headless: true });
  const report = {};
  for (const [vname, w, h] of VIEWPORTS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'bg-BG', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    // consent banner would cover things — pre-accept
    await page.goto(LIVE + '/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate(() => { document.cookie = 'darling_consent=all;path=/;max-age=99999'; }).catch(() => {});
    for (const [pname, url] of PAGES) {
      const key = `${pname}@${vname}`;
      try {
        await page.goto(LIVE + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        report[key] = await page.evaluate(scan);
        await page.screenshot({ path: path.join(OUT, `${pname}-${vname}.png`), fullPage: true });
      } catch (e) {
        report[key] = { error: String(e.message).slice(0, 120) };
      }
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(report, null, 1));
  // compact console summary
  const summary = Object.entries(report).map(([k, v]) => `${k}: ${v.error ? 'ERR ' + v.error : v.defect_count + ' defects ' + JSON.stringify(v.by_type) + '  [excluded ' + JSON.stringify(v.excluded) + ']'}`);
  console.log(summary.join('\n'));
  await b.close();
})();
