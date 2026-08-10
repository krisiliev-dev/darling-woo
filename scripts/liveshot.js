// What does the LIVE site look like now that darling.build.css is enqueued?
//
// Every capture before today disabled Woo's sheets in the page and injected our
// CSS by hand, because the theme reached the box but the stylesheet was enqueued
// nowhere. That is over: ca6e560 is live. So this shoots the real pages, as a
// customer gets them, with nothing injected and nothing disabled.
//
// It also records, per page: console errors, and whether any element overflows
// the viewport horizontally - the two failures a screenshot of the top of a page
// will not show you.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'https://darlinghome.bg';
const OUT = path.join(path.dirname(__dirname), 'liveshot');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
	['home', '/'],
	['shop', '/shop/'],
	['product', '/?p=11'],
	['cart', '/cart/'],
	['checkout', '/checkout/'],
	['account', '/my-account/'],
];
const WIDTHS = [[1240, 'desk'], [390, 'phone']];

(async () => {
	const browser = await chromium.launch();
	const report = [];
	for (const [w, wname] of WIDTHS) {
		const page = await browser.newPage({ viewport: { width: w, height: 1000 } });
		const errs = [];
		page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
		page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e.message).slice(0, 160)));
		for (const [name, url] of PAGES) {
			errs.length = 0;
			let code = 0;
			try {
				const r = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 });
				code = r ? r.status() : 0;
			} catch (e) { code = -1; }
			await page.waitForTimeout(1200);
			const probe = await page.evaluate(() => {
				const de = document.documentElement;
				const over = [];
				for (const e of document.querySelectorAll('body *')) {
					const b = e.getBoundingClientRect();
					if (b.width > 0 && (b.right > de.clientWidth + 2 || b.left < -2)) {
						over.push((e.tagName.toLowerCase()) + '.' + String(e.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.') +
							' [' + Math.round(b.left) + '..' + Math.round(b.right) + ']');
					}
				}
				const sheets = [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href.split('/wp-content/')[1] || l.href);
				return {
					scrollW: de.scrollWidth, clientW: de.clientWidth,
					over: over.slice(0, 6), overCount: over.length,
					build: sheets.some((s) => /darling\.build\.css/.test(s)),
					woo: sheets.filter((s) => /woocommerce|wc-blocks/.test(s)).length,
					font: getComputedStyle(document.body).fontFamily.split(',')[0],
					bg: getComputedStyle(document.body).backgroundColor,
				};
			});
			const file = path.join(OUT, name + '-' + wname + '.png');
			await page.screenshot({ path: file, fullPage: true });
			const line = [name, wname, 'http=' + code, 'build=' + probe.build, 'woo-sheets=' + probe.woo,
				'scroll=' + probe.scrollW + '/' + probe.clientW, 'overflow=' + probe.overCount,
				'font=' + probe.font, 'bg=' + probe.bg, 'errs=' + errs.length].join('  ');
			console.log(line);
			if (probe.overCount) console.log('        ' + probe.over.join('\n        '));
			for (const e of errs.slice(0, 3)) console.log('        ERR ' + e);
			report.push(line + (probe.overCount ? '\n        ' + probe.over.join('\n        ') : '') +
				(errs.length ? '\n        ERR ' + errs.slice(0, 3).join('\n        ERR ') : ''));
		}
		await page.close();
	}
	fs.writeFileSync(path.join(OUT, 'report.txt'), report.join('\n') + '\n');
	console.log('\n-> liveshot/');
	await browser.close();
})();