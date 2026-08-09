// Which object does the blocks checkout read its Stripe settings from, and can
// the theme reach it before the payment element mounts?
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 900 } });
  await p.goto('https://darlinghome.bg/shop/', { waitUntil: 'domcontentloaded' });
  const prod = await p.locator('a[href*="/product/"]').first().getAttribute('href');
  await p.goto(prod, { waitUntil: 'domcontentloaded' });
  const f = p.locator('form.cart').first();
  if (await f.count()) { await f.locator('button[type=submit], input[type=submit]').first().click(); await p.waitForLoadState('domcontentloaded'); }
  await p.goto('https://darlinghome.bg/checkout/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => {
    const g = typeof wc_stripe_upe_params !== 'undefined' ? wc_stripe_upe_params : null;
    const s = (window.wcSettings && window.wcSettings.stripe_data) || null;
    const keys = (o) => o ? Object.keys(o).slice(0, 40) : null;
    return {
      globalExists: !!g, globalKeys: keys(g),
      globalHasBlocksAppearance: !!(g && g.blocksAppearance),
      wcSettingsExists: !!window.wcSettings,
      stripeDataExists: !!s, stripeDataKeys: keys(s),
      stripeDataHasBlocksAppearance: !!(s && s.blocksAppearance),
      appearanceSample: (g && g.blocksAppearance) || (s && s.blocksAppearance) || null,
      scriptIds: [...document.querySelectorAll('script[id]')].map((x) => x.id).filter((x) => /stripe/i.test(x)),
    };
  });
  console.log(JSON.stringify(r, null, 1).slice(0, 3000));
  await b.close();
})();