const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const out = {};
  const grab = (sel, label) => p.evaluate(([sel, label]) => {
    const els = [...document.querySelectorAll(sel)].slice(0, 6);
    return els.map(e => ({
      tag: e.tagName.toLowerCase(),
      cls: e.className && e.className.toString().slice(0, 160),
      txt: (e.textContent || '').trim().slice(0, 40),
      rect: (r => ({ w: Math.round(r.width), h: Math.round(r.height) }))(e.getBoundingClientRect()),
    }));
  }, [sel, label]);

  await p.goto('https://darlinghome.bg/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  out.hero_buttons = await grab('.darling-hero a, .darling-hero button, [class*="hero"] a.wp-element-button, [class*="hero"] .wp-block-button__link', 'hero');
  out.hero_wrapper = await grab('[class*="darling-hero"]', 'herowrap');
  out.news_buttons = await grab('.darling-news button, .darling-news a, [class*="news"] button', 'news');
  out.news_wrapper = await grab('[class*="darling-news"]', 'newswrap');
  out.trust = await grab('.darling-trust > *, [class*="trust"] > *', 'trust');
  out.wordmark = await grab('.darling-header__logo, [class*="logo"], .dhl-word', 'wordmark');
  out.footflair = await grab('.darling-foot-flair, .darling-foot-flair *, [class*="dff-"]', 'flair');
  out.section_titles = await grab('.darling-section-title', 'titles');

  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  out.card_badge = await grab('[class*="badge"], .darling-badge, .onsale, [class*="stock"]', 'badge');
  out.card_button = await grab('.wp-block-woocommerce-product-button button, .wp-block-woocommerce-product-button a', 'cardbtn');

  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
