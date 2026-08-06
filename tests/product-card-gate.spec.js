/**
 * SLICE 7 GATE — the product card under content it does not control.
 *
 * The catalogue is one product today and will be 10 800 from Barsy, with
 * wildly varying Bulgarian name lengths and image aspect ratios. Tuning a card
 * against a one-card grid proves nothing, so the gate CLONES the real card and
 * feeds it the content it will actually meet: a 4-character name, a 78-character
 * name, a portrait photo, a landscape photo and no photo at all.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const LIVE = 'https://darlinghome.bg';
const OUT = 'C:/Users/lora_/darling/_scratch_woo/sprint27';

const NAMES = [
  'Кана',
  'Тестова табуретка',
  'Комплект прибори за хранене от неръждаема стомана, 24 части, подаръчна кутия',
  'Кошница за пране',
  'Ароматна свещ „Ванилия и канела" в стъклена чаша с капак',
  'Тенджера',
];
// data-URI images: 1:1, 3:4 portrait, 16:9 landscape — decode instantly, no network
const IMG = (w, h, c) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${c}"/></svg>`);
const SHAPES = [IMG(600, 600, '%23c9a'), IMG(600, 800, '%239bc'), IMG(800, 450, '%23bc9'), null, IMG(600, 600, '%23cb9'), IMG(400, 900, '%23ac9')];

const stress = ([names, shapes]) => {
  const tpl = document.querySelector('.darling-grid .wp-block-post-template');
  if (!tpl) return { error: 'no template' };
  const proto = tpl.querySelector(':scope > li');
  if (!proto) return { error: 'no card' };
  while (tpl.children.length > 1) tpl.removeChild(tpl.lastElementChild);
  for (let i = 0; i < names.length; i++) {
    const li = i === 0 ? proto : proto.cloneNode(true);
    if (i > 0) tpl.appendChild(li);
    const t = li.querySelector('.wp-block-post-title');
    if (t) { const a = t.querySelector('a'); (a || t).textContent = names[i]; }
    const img = li.querySelector('img');
    if (img) {
      if (shapes[i] === null) { img.removeAttribute('srcset'); img.src = ''; img.style.visibility = 'hidden'; }
      else { img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = shapes[i]; img.classList.remove('woocommerce-placeholder'); }
    }
  }
  return { built: tpl.children.length };
};

const measure = () => {
  const tpl = document.querySelector('.darling-grid .wp-block-post-template');
  const cards = [...tpl.querySelectorAll(':scope > li')];
  const rowsOf = (fn) => {
    const m = {};
    cards.forEach((li, i) => {
      const el = fn(li); if (!el) return;
      const r = li.getBoundingClientRect();
      const key = Math.round(r.top / 10) * 10;      // group cards by row
      (m[key] = m[key] || []).push({ i, y: Math.round(el.getBoundingClientRect().top) });
    });
    return m;
  };
  const spread = (m) => Object.values(m).map(v => Math.max(...v.map(x => x.y)) - Math.min(...v.map(x => x.y)));

  const per = cards.map((li, i) => {
    const t = li.querySelector('.wp-block-post-title');
    const btn = li.querySelector('.wp-block-button__link, .wc-block-components-product-button__button');
    const img = li.querySelector('img');
    const lh = (el) => parseFloat(getComputedStyle(el).lineHeight) || 1;
    const label = btn ? btn.querySelector('span') || btn : null;
    return {
      i,
      cardW: Math.round(li.getBoundingClientRect().width),
      containerType: getComputedStyle(li).containerType,
      titleLines: t ? Math.round(t.getBoundingClientRect().height / lh(t)) : null,
      titleClamp: t ? getComputedStyle(t).webkitLineClamp : null,
      imgBox: img ? Math.round(img.getBoundingClientRect().width) + 'x' + Math.round(img.getBoundingClientRect().height) : null,
      imgAR: img ? getComputedStyle(img).aspectRatio : null,
      ctaBox: btn ? Math.round(btn.getBoundingClientRect().width) + 'x' + Math.round(btn.getBoundingClientRect().height) : null,
      ctaLabelLines: label ? Math.round(label.getBoundingClientRect().height / lh(btn)) : null,
      ctaOneLine: label ? label.getBoundingClientRect().height <= lh(btn) * 1.4 : null,
      ctaTall: btn ? btn.getBoundingClientRect().height >= 44 : null,
    };
  });

  return {
    gridWidth: Math.round(tpl.getBoundingClientRect().width),
    cols: getComputedStyle(tpl).gridTemplateColumns,
    justify: getComputedStyle(tpl).justifyContent,
    letterSpacing: getComputedStyle(document.body).letterSpacing,
    priceRowSpread: spread(rowsOf(li => li.querySelector('.wp-block-woocommerce-product-price'))),
    ctaRowSpread: spread(rowsOf(li => li.querySelector('.wp-block-button, .wc-block-components-product-button'))),
    cardWidths: [...new Set(per.map(p => p.cardW))],
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cards: per,
  };
};

(async () => {
  const b = await chromium.launch({ headless: true });
  const res = {};
  for (const [vname, w] of [['mobile', 390], ['phablet', 430], ['tablet', 768], ['laptop', 1280], ['desktop', 1440], ['wide', 1920]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, locale: 'bg-BG' });
    const p = await ctx.newPage();
    await p.goto(LIVE + '/', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => { document.cookie = 'darling_consent=all;path=/;max-age=99999'; });
    await p.goto(LIVE + '/shop/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    res['real@' + vname] = await p.evaluate(measure);
    await p.evaluate(stress, [NAMES, SHAPES]);
    await p.waitForTimeout(600);
    res['stress@' + vname] = await p.evaluate(measure);
    await p.screenshot({ path: OUT + '/s7-stress-' + vname + '.png', fullPage: true });
    await ctx.close();
  }
  // home: the single-card "Изборът на Lady D" band must not maroon
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'bg-BG' });
  const p = await ctx.newPage();
  await p.goto(LIVE + '/', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { document.cookie = 'darling_consent=all;path=/;max-age=99999'; });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  res['home@desktop'] = await p.evaluate(measure);
  await p.screenshot({ path: OUT + '/s7-home-desktop.png', fullPage: true });
  await ctx.close();

  fs.writeFileSync(OUT + '/gate7.json', JSON.stringify(res, null, 1));
  // verdict
  const bad = [];
  Object.entries(res).forEach(([k, v]) => {
    if (!v.cards) return;
    if (v.docOverflow > 1) bad.push(k + ': doc overflow ' + v.docOverflow);
    v.cards.forEach(c => {
      if (c.ctaOneLine === false) bad.push(k + ' card' + c.i + ': CTA wraps (' + c.ctaBox + ')');
      if (c.ctaTall === false) bad.push(k + ' card' + c.i + ': CTA under 44px (' + c.ctaBox + ')');
      if (c.titleLines > 2) bad.push(k + ' card' + c.i + ': title ' + c.titleLines + ' lines');
    });
    (v.priceRowSpread || []).forEach((s, i) => { if (s > 2) bad.push(k + ' row' + i + ': prices misaligned by ' + s + 'px'); });
    (v.ctaRowSpread || []).forEach((s, i) => { if (s > 2) bad.push(k + ' row' + i + ': CTAs misaligned by ' + s + 'px'); });
  });
  console.log(JSON.stringify({ verdict: bad.length ? 'FAIL' : 'PASS', problems: bad.slice(0, 30) }, null, 1));
  console.log('--- key numbers ---');
  Object.entries(res).forEach(([k, v]) => {
    if (!v.cards) return;
    console.log(k, 'grid', v.gridWidth, '| widths', JSON.stringify(v.cardWidths), '| ls', v.letterSpacing,
      '| cta', v.cards.map(c => c.ctaBox).join(' '), '| titleLines', v.cards.map(c => c.titleLines).join(''));
  });
  await b.close();
})();
