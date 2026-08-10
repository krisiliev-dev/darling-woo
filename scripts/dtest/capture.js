/* One capture, shared by every reviewer.
 *
 * Nine mirrored pages x three viewports x three engines = 81 renders. Doing it
 * once and writing JSON beats nine reviewers each driving their own browser:
 * it is faster, and more importantly every finding is then made against the
 * SAME observation, so two reviewers cannot disagree about what the page did.
 */
const pw = require('playwright');
const fs = require('fs');
const path = require('path');

const { MIRROR, CAPTURE } = require('./paths');
const PAGES = ['home', 'shop', 'product', 'cart', 'checkout', 'account', 'page', 'blog', 'notfound'];
const VIEWPORTS = [[390, 844, 'phone'], [768, 1024, 'tablet'], [1240, 900, 'desktop']];
const ENGINES = ['chromium', 'firefox', 'webkit'];

const COLLECT = () => {
  const de = document.documentElement;
  const px = (v) => Math.round(parseFloat(v) || 0);

  // --- horizontal overflow, and who causes it
  const over = [];
  for (const e of document.querySelectorAll('body *')) {
    const b = e.getBoundingClientRect();
    if (b.width < 1) continue;
    if (b.right > de.clientWidth + 2 || b.left < -2) {
      // THREE THINGS LEGITIMATELY SIT OUTSIDE THE VIEWPORT and reporting them
      // is how a check gets ignored:
      //   1. a child of a real scroll container - a carousel row
      //   2. a child of a fixed, clipped layer - .d-ambient is inset:0 with
      //      contain:strict, so a star at 94% left measures past clientWidth and
      //      cannot affect the document
      //   3. the visually-hidden patterns - a skip link, a honeypot field,
      //      an off-canvas drawer parked off-screen until it opens
      let sc = e, exempt = false;
      while (sc && sc !== document.documentElement) {
        const s2 = getComputedStyle(sc);
        // `clip` is the one that caught this probe out. .d-band uses overflow-x:
        // clip so the newsletter's sparks can fly past its edge and be cut off
        // WITHOUT creating a scroll container - which is exactly why the document
        // never grows and the element still measures outside the viewport. A
        // check that knows auto/scroll/hidden and not clip reports 42 renders of
        // a deliberate effect as a layout bug.
        if (/^(auto|scroll|hidden|clip)$/.test(s2.overflowX)) { exempt = true; break; }
        if (s2.contain && /strict|paint|content/.test(s2.contain)) { exempt = true; break; }
        if (s2.position === 'fixed' && s2.inset !== 'auto') { exempt = true; break; }
        if (s2.clipPath && s2.clipPath !== 'none') { exempt = true; break; }
        if (parseFloat(s2.opacity) === 0 || s2.visibility === 'hidden') { exempt = true; break; }
        sc = sc.parentElement;
      }
      if (exempt) continue;
      over.push({ t: e.tagName.toLowerCase(), c: String(e.className || '').slice(0, 44),
        l: Math.round(b.left), r: Math.round(b.right) });
      if (over.length > 8) break;
    }
  }

  // --- every d- component, its box and its appearance
  const comps = {};
  for (const e of document.querySelectorAll('[class*="d-"]')) {
    const cls = String(e.className || '').split(/\s+/).filter((c) => /^d-[a-z0-9-]+$/.test(c));
    if (!cls.length) continue;
    const b = e.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    const c = getComputedStyle(e);
    for (const k of cls) {
      if (comps[k]) continue;
      comps[k] = {
        box: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
        fs: c.fontSize, fw: c.fontWeight, ff: c.fontFamily.split(',')[0].replace(/"/g, ''),
        lh: c.lineHeight, color: c.color, bg: c.backgroundColor,
        radius: c.borderRadius, shadow: c.boxShadow === 'none' ? '' : c.boxShadow.slice(0, 40),
        anim: c.animationName === 'none' ? '' : c.animationName,
        pad: c.padding, display: c.display, pos: c.position,
      };
    }
  }

  // --- text contrast: the effective pair for every visible text node holder
  //
  // *** COLOURS ARE RESOLVED BY THE BROWSER, NOT PARSED IN NODE. *** The first
  // version of this probe matched /[\d.]+/g against getComputedStyle().color and
  // treated the first three numbers as 0-255. That is right for rgb() and
  // nonsense for everything else: an oklab() surface came back as
  // "rgb(0.908732, 0.0164476, 0.0310694)" and the contrast against it computed
  // as 1.37:1 - a failure that did not exist. Painting the colour onto a 1x1
  // canvas and reading the pixel makes the ENGINE do the conversion, so oklab,
  // oklch, color-mix and color(srgb ...) all resolve correctly and, importantly,
  // resolve the way that engine will actually paint them.
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const cx = cvs.getContext('2d', { willReadFrequently: true });
  const toRGB = (css) => {
    if (!css || css === 'transparent') return null;
    try {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      if (cx.fillStyle === '#000' && !/^(#000|black|rgb\(0, ?0, ?0\))/i.test(css)) return null;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch (e) { return null; }
  };
  const lum = (c) => { const a = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  // Walk up for the first OPAQUE background. If we meet a gradient or an image
  // on the way, stop and say so rather than guessing - text over a picture needs
  // a human, and a number invented here would be worse than no number.
  const effBg = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return { unknown: 'over ' + s.backgroundImage.slice(0, 22) };
      const c = toRGB(s.backgroundColor);
      if (c && c[3] >= 0.95) return { rgb: c };
      if (c && c[3] > 0.05) return { unknown: 'semi-transparent ' + s.backgroundColor.slice(0, 24) };
      n = n.parentElement;
    }
    const c = toRGB(getComputedStyle(document.documentElement).backgroundColor);
    return c && c[3] >= 0.95 ? { rgb: c } : { rgb: [255, 255, 255, 1] };
  };
  const contrast = [];
  const overArt = [];
  const seenPair = new Set();
  for (const e of document.querySelectorAll('body *')) {
    if (!e.childNodes.length) continue;
    let txt = '';
    for (const n of e.childNodes) if (n.nodeType === 3) txt += n.textContent.trim();
    if (txt.length < 2) continue;
    const b = e.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    const c = getComputedStyle(e);
    if (c.visibility === 'hidden' || c.opacity === '0' || c.display === 'none') continue;
    const fg = toRGB(c.color);
    if (!fg) continue;
    const bg = effBg(e);
    const size = parseFloat(c.fontSize), bold = parseInt(c.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const cls = String(e.className || '').split(/\s+/)[0] || e.tagName.toLowerCase();
    if (bg.unknown) {
      const k = cls + '|' + bg.unknown;
      if (!seenPair.has(k)) { seenPair.add(k); overArt.push({ cls, txt: txt.slice(0, 24), fg: c.color, over: bg.unknown, size: c.fontSize }); }
      continue;
    }
    const L1 = lum(fg), L2 = lum(bg.rgb);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const key = c.color + '|' + bg.rgb.slice(0, 3).join(',') + '|' + (large ? 'L' : 'S');
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    if (ratio < need) contrast.push({ cls, txt: txt.slice(0, 26), fg: c.color,
      bg: 'rgb(' + bg.rgb.slice(0, 3).join(',') + ')', ratio: Math.round(ratio * 100) / 100,
      need, size: c.fontSize });
    if (contrast.length > 24) break;
  }

  // --- interactive targets under the WCAG 2.2 minimum
  const small = [];
  for (const e of document.querySelectorAll('a,button,input,select,textarea,[role="button"],[tabindex]')) {
    const b = e.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    const c = getComputedStyle(e);
    // WCAG 2.2 exempts targets in a sentence or block of text. An <a> that is\n    // inline OR inline-block sitting inside running text is that case.\n    if (e.tagName === 'A' && /^inline/.test(c.display)) continue;
    if (b.width < 24 || b.height < 24) small.push({ t: e.tagName.toLowerCase(),
      c: String(e.className || '').slice(0, 34), w: Math.round(b.width), h: Math.round(b.height),
      label: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 20) });
    if (small.length > 12) break;
  }

  // --- images with no intrinsic size declared (CLS)
  const cls = [];
  for (const img of document.querySelectorAll('img')) {
    if (!img.getAttribute('width') || !img.getAttribute('height')) {
      const s = getComputedStyle(img);
      if (s.aspectRatio && s.aspectRatio !== 'auto') continue;
      cls.push({ src: (img.currentSrc || img.src || '').split('/').pop().slice(0, 34),
        c: String(img.className || '').slice(0, 30) });
    }
    if (cls.length > 8) break;
  }

  // --- animations actually running, and on which properties
  const anims = [];
  if (document.getAnimations) {
    for (const a of document.getAnimations()) {
      const n = a.animationName || (a.effect && a.effect.getKeyframes && 'css');
      const target = a.effect && a.effect.target;
      anims.push({ name: String(a.animationName || 'unknown'),
        state: a.playState,
        on: target ? (target.tagName || '').toLowerCase() + '.' + String(target.className || '').split(' ')[0].slice(0, 26) : '?' });
      if (anims.length > 24) break;
    }
  }

  return {
    scrollW: de.scrollWidth, clientW: de.clientWidth,
    overflow: over, components: comps, contrast, contrastOverArt: overArt, smallTargets: small,
    imagesNoDims: cls, animations: anims,
    sheets: [...document.styleSheets].map((s) => (s.href || 'inline').split('/').pop().split('?')[0]),
    scripts: [...document.querySelectorAll('script[src]')].map((s) => s.src.split('/').pop().split('?')[0]),
    fonts: document.fonts ? [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.status) : [],
    supports: {
      colorMix: CSS.supports('color', 'color-mix(in oklab, red 50%, blue)'),
      oklch: CSS.supports('color', 'oklch(50% 0.1 200)'),
      has: CSS.supports('selector(:has(a))'),
      scrollTimeline: CSS.supports('animation-timeline', 'scroll(root)'),
      atProperty: typeof CSS.registerProperty === 'function',
      containerQuery: CSS.supports('container-type', 'inline-size'),
      subgrid: CSS.supports('grid-template-columns', 'subgrid'),
      textWrapBalance: CSS.supports('text-wrap', 'balance'),
      relativeColor: CSS.supports('color', 'rgb(from red r g b)'),
      nesting: CSS.supports('selector(&)'),
    },
  };
};

(async () => {
  const out = {};
  for (const engine of ENGINES) {
    // *** A MISSING ENGINE IS A SKIP, NOT A CRASH. ***
    // Only chromium is installed by default in most environments; firefox and
    // webkit come from `npx playwright install firefox webkit` (~200 MB). A suite
    // that dies on a machine with one browser is a suite nobody runs, so the
    // engine is skipped loudly and the rest of the matrix still reports.
    let browser;
    try { browser = await pw[engine].launch(); }
    catch (e) {
      console.log('SKIP ' + engine + ' - not installed. `npx playwright install ' + engine + '` to include it.');
      continue;
    }
    for (const [w, h, vname] of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      for (const name of PAGES) {
        const key = engine + '|' + vname + '|' + name;
        const errs = [];
        page.removeAllListeners('console'); page.removeAllListeners('pageerror');
        page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 110)); });
        page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e.message).slice(0, 110)));
        try {
          await page.goto('file://' + path.join(MIRROR, name + '.html'), { waitUntil: 'load', timeout: 45000 });
          await page.waitForTimeout(1400);
          const data = await page.evaluate(COLLECT);
          data.consoleErrors = errs;
          out[key] = data;
        } catch (e) { out[key] = { error: String(e.message).slice(0, 140) }; }
      }
      await ctx.close();
    }
    await browser.close();
    console.log('done ' + engine);
  }
  fs.writeFileSync(CAPTURE, JSON.stringify(out));
  console.log('-> ' + CAPTURE + '  ' + (fs.statSync(CAPTURE).size / 1024).toFixed(0) + ' KB, ' + Object.keys(out).length + ' renders');
})();
