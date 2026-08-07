'use strict';
/**
 * O-5 — the failed-image state.
 *
 * WHY THIS IS JAVASCRIPT AND NOT CSS. CSS cannot see a broken <img>. There is no
 * :broken selector, generated content on a replaced element is unreliable across
 * engines, and the one thing CSS *can* target — `img.woocommerce-placeholder` —
 * is only half the problem: it catches a product Woo knows has no image, and
 * misses the product whose image 404s, which is the failure that actually
 * happens once 10 800 products are importing from Barsy.
 *
 * WHY BOTH CASES GET THE SAME TREATMENT. The panel now refuses to flag a product
 * sellable online without an image (claude/SELLABLE_ONLINE_IMAGE_RULE_20260806.md).
 * So a placeholder reaching the storefront is not "no photo yet" — that state is
 * unreachable by policy. It means the data is wrong. Same for a 404. One state,
 * honestly named: «Изображението не се зареди».
 *
 * SCOPE IS DELIBERATELY NARROW. Only product media containers. A broken category
 * banner or a broken logo is a different fault and must not be labelled with a
 * product caption — it would be a confident, wrong sentence, which is worse than
 * a gap.
 */
(function () {
	var CAPTION = 'Изображението не се зареди';

	/* Same path data as .de-bow in the empty-state — one motif, not two. */
	var BOW = '<svg class="dmf-bow" viewBox="0 0 24 12" fill="currentColor" aria-hidden="true" focusable="false">'
		+ '<path d="M12 6 L3.2 1.4 C1.8.7 1.8 11.3 3.2 10.6 Z M12 6 l8.8-4.6 c1.4-.7 1.4 9.9 0 9.2 Z"/>'
		+ '<circle cx="12" cy="6" r="2.4"/></svg>';

	var MEDIA_SEL = [
		'.darling-grid li',
		'.wc-block-components-product-image',
		'.wp-block-woocommerce-product-image',
		'.wp-block-post-featured-image',
		'.woocommerce-product-gallery',
		'.wc-block-cart-item__image',
		'.wc-block-components-order-summary-item__image',
		'.woocommerce-order-details',
	].join(',');

	function inScope(img) {
		return !!(img && img.tagName === 'IMG' && img.closest && img.closest(MEDIA_SEL));
	}

	function isPlaceholder(img) {
		var cls = typeof img.className === 'string' ? img.className : '';
		if (/(^|\s)woocommerce-placeholder(\s|$)/.test(cls)) return true;
		return /woocommerce-placeholder/.test(img.currentSrc || img.getAttribute('src') || '');
	}

	/* `complete && naturalWidth === 0` is the only reliable "this one failed" test,
	   and it is what catches the images that already errored before this deferred
	   script ran — the error event for those is long gone. */
	function isBroken(img) {
		return !!img.getAttribute('src') && img.complete && img.naturalWidth === 0;
	}

	function slab(img) {
		var el = document.createElement('div');
		el.className = 'd-media-fail';
		el.setAttribute('role', 'img');
		el.setAttribute('aria-label', CAPTION);
		el.innerHTML = BOW + '<p class="dmf-cap" aria-hidden="true">' + CAPTION + '</p>';

		/* The RATIO comes from the width/height ATTRIBUTES, not from the rendered
		   box. A broken image has no rendered box worth reading — it collapses
		   wherever CSS does not size it — whereas WordPress emits the intrinsic
		   dimensions on every product image. Attributes also stay responsive:
		   aspect-ratio reflows, a measured pixel height would freeze. */
		var w = parseFloat(img.getAttribute('width'));
		var h = parseFloat(img.getAttribute('height'));
		if (w > 0 && h > 0) el.style.aspectRatio = w + ' / ' + h;

		/* Inherit the corner the image would have had, so the slab sits in the card
		   exactly where the photo did instead of announcing itself as a new shape. */
		var r = getComputedStyle(img).borderRadius;
		if (r && r !== '0px') el.style.borderRadius = r;

		return el;
	}

	function mark(img) {
		if (!img || img.tagName !== 'IMG') return;
		if (img.getAttribute('data-d-media-fail')) return;
		if (!inScope(img)) return;
		if (!isBroken(img) && !isPlaceholder(img)) return;

		img.setAttribute('data-d-media-fail', isPlaceholder(img) ? 'missing' : 'broken');
		if (img.parentNode) img.parentNode.insertBefore(slab(img), img.nextSibling);
	}

	function sweep(root) {
		var imgs = (root || document).querySelectorAll('img:not([data-d-media-fail])');
		for (var i = 0; i < imgs.length; i++) mark(imgs[i]);
	}

	/* Capture phase, on window: resource `error` events do not bubble, but they do
	   capture — so one listener covers every image on the page including the ones
	   Woo injects into the cart and checkout later. */
	window.addEventListener('error', function (e) {
		var t = e && e.target;
		if (t && t.tagName === 'IMG') mark(t);
	}, true);

	var pending = 0;
	function schedule() {
		if (pending) return;
		pending = setTimeout(function () { pending = 0; sweep(document); }, 120);
	}

	function start() {
		sweep(document);
		/* Placeholders load successfully, so nothing fires an event for them when a
		   block re-renders. The observer is what makes this survive the cart and
		   checkout redrawing themselves. */
		if (window.MutationObserver) {
			new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
		}
		/* Late loaders: an image can still be in flight when this runs. */
		window.addEventListener('load', schedule);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
	else start();
})();
