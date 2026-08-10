/**
 * Bulgarian for the blocks-checkout strings the upstream bg_BG pack misses.
 *
 * These are client-side React strings (wp.i18n), so PHP gettext never sees
 * them — this registers on the JS i18n.gettext hook instead, before hydration
 * (enqueued in the header with wp-hooks/wp-i18n as dependencies). Keyed by
 * SOURCE string: where upstream later adds a real translation, ours simply
 * stops mattering if removed, and until then stays deterministic.
 */
( function () {
	'use strict';
	if ( ! window.wp || ! wp.hooks || ! wp.i18n ) { return; }

	var map = {
		// Measured on the LIVE cart page, all three visible and none screen-reader-only:
		//   span.wc-block-components-totals-item__label  293x24  'Estimated total'
		//   p.wc-block-components-totals-footer-item-shipping  427x20
		//   div.wc-block-components-button__text  173x28  the primary cart CTA
		// The cart block renders these client-side, so only the JS hook reaches them.
		// *** NOT "приблизително". *** Owner: there is already a line under this
		// saying the delivery is worked out at checkout, so the number above it
		// is not an estimate of anything - it is the total of the products, and
		// hedging a price the customer can add up themselves reads as evasive.
		'Estimated total': 'Общо',
		'Shipping will be calculated at checkout': 'Доставката се изчислява при поръчката',
		'Proceed to Checkout': 'Продължи към поръчката',
		'Place Order': 'Поръчай',
		'Contact information': 'Данни за контакт',
		'Payment options': 'Начин на плащане',
		'Express Checkout': 'Бързо плащане',
		// *** "Or continue below" IS ONLY TRUE WHILE THE WALLET IS AT THE TOP. ***
		// The owner moved express payment down to just above the order button, where
		// there is nothing below it to continue to. A divider between the wallet and
		// the button says everything it needs to with one word.
		'Or continue below': 'Или',
		'You are currently checking out as a guest.': 'Поръчваш като гост.',
		'Use same address for billing': 'Използвай същия адрес и за фактуриране',
		'Phone (optional)': 'Телефон (по избор)',
		'State/County (optional)': 'Област (по избор)',
		'State/County': 'Област',
		'State/Region (optional)': 'Област (по избор)',
		'State/Region': 'Област',
		'apartment, suite, etc.': 'апартамент, вход, етаж и т.н.',
		'Add coupons': 'Код за отстъпка',
		'Add a coupon': 'Добави код за отстъпка',
	};

	map['Phone'] = 'Телефон';

	var swap = function ( translation, text ) {
		return Object.prototype.hasOwnProperty.call( map, text ) ? map[ text ] : translation;
	};
	wp.hooks.addFilter( 'i18n.gettext', 'darling/checkout-bg', swap );
	// Strings registered with a translation context arrive on a different
	// hook — same table serves both.
	wp.hooks.addFilter( 'i18n.gettext_with_context', 'darling/checkout-bg-ctx', function ( translation, text ) {
		return swap( translation, text );
	} );

	// „Express Checkout" is baked into the blocks bundle in a way that skips
	// both i18n hooks (verified: JS hooks, PHP gettext any-domain, and the
	// saved page content all miss it). Last resort: rename the rendered node,
	// re-applied on every React re-render.
	var fixDom = function () {
		document.querySelectorAll( '.wc-block-components-express-payment__title, .wc-block-components-title' )
			.forEach( function ( el ) {
				if ( el.childElementCount === 0 && el.textContent.trim() === 'Express Checkout' ) {
					el.textContent = 'Бързо плащане';
				}
			} );
	};
	if ( document.readyState !== 'loading' ) { fixDom(); }
	document.addEventListener( 'DOMContentLoaded', fixDom );
	new MutationObserver( fixDom ).observe( document.documentElement, { childList: true, subtree: true } );
} )();
