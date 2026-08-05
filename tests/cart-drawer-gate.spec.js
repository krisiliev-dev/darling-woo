/**
 * Slice 10 gate: cart drawer v2.
 *  - auto-open after add-to-cart
 *  - shipbar math (remaining → free at €77), dual currency comma decimals
 *  - trust line, steppers mutating the server cart, line totals
 *  - foot: „Обща сума" + tax note + „Преминаване към плащане"
 *  - remove → empty state, shipbar hides
 * Run:  STAGING_PASS=… node gate12.js   (stock on product 11 must be ≥ 6)
 */
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/lora_/darling/_scratch_woo/slice10';
const STAG = 'https://staging.darlinghome.bg';

(async () => {
  const b = await chromium.launch({ headless: true });
  const out = { checks: {}, verdict: null };
  try {
    const ctx = await b.newContext({
      locale: 'bg-BG', viewport: { width: 1440, height: 900 },
      httpCredentials: { username: 'darling', password: process.env.STAGING_PASS || '' }
    });
    const page = await ctx.newPage();

    const drawerState = () => page.evaluate(() => {
      const dlg  = document.getElementById('darling-cart-drawer');
      const bar  = document.querySelector('[data-darling-shipbar]');
      const msg  = document.querySelector('[data-darling-shipbar-msg]');
      const fill = document.querySelector('[data-darling-shipbar-fill]');
      const foot = document.querySelector('[data-darling-cart-foot]');
      const tot  = document.querySelector('[data-darling-cart-total]');
      const items = Array.from(document.querySelectorAll('.darling-cart__item')).map(li => ({
        qty:  (li.querySelector('.darling-cart__stepper b') || {}).textContent || null,
        unit: (li.querySelector('.darling-cart__qty') || {}).textContent || null,
        line: (li.querySelector('.darling-cart__line') || {}).textContent || null,
      }));
      return {
        open: !!(dlg && dlg.open),
        bar_hidden: bar ? bar.hasAttribute('hidden') : null,
        bar_msg: msg ? msg.innerHTML : null,
        fill_w: fill ? fill.style.width : null,
        trust: !!document.querySelector('.darling-cart-trust'),
        foot_hidden: foot ? foot.hasAttribute('hidden') : null,
        total: tot ? tot.textContent : null,
        foot_label: foot ? /Обща сума/.test(foot.innerText) : null,
        note_ok: foot ? /С включено ДДС\. Доставката се изчислява при плащане\./.test(foot.innerText) : null,
        cta: (document.querySelector('.darling-cart__cta') || {}).textContent || null,
        items,
        empty_msg: /Количката ви е празна/.test((document.querySelector('[data-darling-cart-body]') || {}).innerText || ''),
      };
    });

    // Wait until the drawer body has finished a render (no "Зареждане…")
    const settled = async () => {
      await page.waitForFunction(() => {
        const b = document.querySelector('[data-darling-cart-body]');
        return b && !/Зареждане/.test(b.innerText);
      }, null, { timeout: 10000 });
      await page.waitForTimeout(400);
    };

    // 0) clean slate — empty the cart via Store API in-page
    await page.goto(STAG + '/?g12=1', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const r = await fetch('/wp-json/wc/store/v1/cart', { credentials: 'same-origin' });
      const nonce = r.headers.get('nonce');
      const c = await r.json();
      for (const it of c.items) {
        await fetch('/wp-json/wc/store/v1/cart/remove-item', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Nonce: nonce },
          body: JSON.stringify({ key: it.key })
        });
      }
    });

    // 1) empty drawer: open from header icon
    await page.click('[data-darling-cart-open]');
    await settled();
    const empty = await drawerState();
    out.checks.empty = {
      open: empty.open, empty_msg: empty.empty_msg,
      bar_hidden: empty.bar_hidden, foot_hidden: empty.foot_hidden
    };
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 2) auto-open on add-to-cart from the product page
    await page.goto(STAG + '/?post_type=product&p=11&g12=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    // Classic POST + reload: click, wait out the navigation, then the drawer
    // must open itself on the page that comes back (sessionStorage intent).
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
      page.click('form.cart .single_add_to_cart_button'),
    ]);
    await page.waitForFunction(() => {
      const d = document.getElementById('darling-cart-drawer');
      return d && d.open;
    }, null, { timeout: 12000 });
    await settled();
    const one = await drawerState();
    out.checks.added = {
      auto_opened: one.open,
      trust: one.trust,
      unit: one.items[0] && one.items[0].unit,          // €13,50 / 26,40 лв.
      line: one.items[0] && one.items[0].line,
      qty: one.items[0] && one.items[0].qty,
      total: one.total,
      bar_msg: one.bar_msg,                             // Още €63,50 / 124,20 лв. …
      fill_w: one.fill_w,
      foot_label: one.foot_label, note_ok: one.note_ok, cta: one.cta,
    };
    await page.screenshot({ path: path.join(OUT, 'drawer-1.png') });

    // 3) stepper + → qty 2, line total & shipbar update
    await page.click('.darling-cart__qbtn[data-darling-qty="1"]');
    await settled();
    await page.waitForFunction(() =>
      (document.querySelector('.darling-cart__stepper b') || {}).textContent === '2',
      null, { timeout: 10000 });
    const two = await drawerState();
    out.checks.qty2 = {
      qty: two.items[0].qty, line: two.items[0].line, total: two.total, bar_msg: two.bar_msg,
    };
    // server agrees?
    out.checks.server_qty2 = await page.evaluate(async () => {
      const c = await (await fetch('/wp-json/wc/store/v1/cart', { credentials: 'same-origin' })).json();
      return { qty: c.items[0] ? c.items[0].quantity : 0, total_items: c.totals.total_items };
    });

    // 4) cross €77: set qty 6 (6 × 13.50 = 81.00) via the same stepper × 4
    for (let i = 0; i < 4; i++) {
      await page.click('.darling-cart__qbtn[data-darling-qty="1"]');
      await page.waitForTimeout(900);
    }
    await page.waitForFunction(() =>
      (document.querySelector('.darling-cart__stepper b') || {}).textContent === '6',
      null, { timeout: 15000 });
    await page.waitForTimeout(500);
    const six = await drawerState();
    out.checks.free = {
      qty: six.items[0].qty, total: six.total,
      bar_msg: six.bar_msg, fill_w: six.fill_w,
    };
    await page.screenshot({ path: path.join(OUT, 'drawer-free.png') });

    // 5) stepper − back to 5 → below threshold again
    await page.click('.darling-cart__qbtn[data-darling-qty="-1"]');
    await settled();
    await page.waitForFunction(() =>
      (document.querySelector('.darling-cart__stepper b') || {}).textContent === '5',
      null, { timeout: 10000 });
    const five = await drawerState();
    out.checks.back_under = { qty: five.items[0].qty, bar_msg: five.bar_msg };

    // 6) remove via ✕ → empty state, shipbar hides, badge clears
    await page.click('.darling-cart__rm');
    await settled();
    await page.waitForFunction(() =>
      /Количката ви е празна/.test((document.querySelector('[data-darling-cart-body]') || {}).innerText || ''),
      null, { timeout: 10000 });
    const gone = await drawerState();
    out.checks.removed = {
      empty_msg: gone.empty_msg, bar_hidden: gone.bar_hidden, foot_hidden: gone.foot_hidden,
      badge_hidden: await page.evaluate(() =>
        document.querySelector('[data-darling-cart-count]').hasAttribute('hidden')),
      server_count: await page.evaluate(async () =>
        (await (await fetch('/wp-json/wc/store/v1/cart', { credentials: 'same-origin' })).json()).items_count),
    };
    await page.screenshot({ path: path.join(OUT, 'drawer-empty.png') });

    // 7) checkout smoke: empty cart → /checkout/ bounces to cart
    await page.goto(STAG + '/checkout/', { waitUntil: 'domcontentloaded' });
    out.checks.checkout_redirect = page.url().includes('/cart');

    const A = out.checks.added, Q = out.checks.qty2, F = out.checks.free;
    const pass =
      out.checks.empty.open && out.checks.empty.empty_msg &&
      out.checks.empty.bar_hidden === true && out.checks.empty.foot_hidden === true &&
      A.auto_opened && A.trust &&
      A.unit === '€13,50 / 26,40 лв.' && A.line === '€13,50 / 26,40 лв.' && A.qty === '1' &&
      A.total === '€13,50 / 26,40 лв.' &&
      /Още <strong>€63,50 \/ 124,20 лв\.<\/strong> до безплатна доставка, darling/.test(A.bar_msg || '') &&
      A.foot_label === true && A.note_ok === true && A.cta === 'Преминаване към плащане' &&
      Q.qty === '2' && Q.line === '€27,00 / 52,81 лв.' && Q.total === '€27,00 / 52,81 лв.' &&
      /Още <strong>€50,00 \/ 97,79 лв\./.test(Q.bar_msg || '') &&
      out.checks.server_qty2.qty === 2 && out.checks.server_qty2.total_items === '2700' &&
      F.qty === '6' && F.total === '€81,00 / 158,42 лв.' &&
      /<strong>Доставката е безплатна<\/strong>, darling ✦/.test(F.bar_msg || '') &&
      F.fill_w === '100%' &&
      /Още <strong>€/.test(out.checks.back_under.bar_msg || '') &&
      out.checks.removed.empty_msg && out.checks.removed.bar_hidden === true &&
      out.checks.removed.foot_hidden === true && out.checks.removed.badge_hidden === true &&
      out.checks.removed.server_count === 0 &&
      out.checks.checkout_redirect;
    out.verdict = pass ? 'GATE: PASS' : 'GATE: FAIL';
  } catch (e) {
    out.error = String(e.message || e).slice(0, 400);
    out.verdict = 'GATE: ERROR';
  } finally {
    console.log(JSON.stringify(out, null, 1));
    await b.close();
  }
})();
