/**
 * Header behaviour: the mobile drawer, the cart count, and the cart drawer.
 *
 *  - The drawers are native <dialog>s. `showModal()` gives focus trapping,
 *    Escape-to-close and inertness of the page behind, all of which are easy to
 *    get subtly wrong by hand and invisible to whoever isn't using a keyboard or
 *    a screen reader.
 *
 *  - The cart is fetched, never rendered server-side. Pages are served from a
 *    60-second nginx micro-cache, so anything baked into the HTML would be one
 *    visitor's basket shown to the next.
 *
 *  - Money is shown DUAL (EUR / BGN at the fixed 1.95583) with Bulgarian comma
 *    decimals, matching the live site's drawer. The shipbar threshold mirrors
 *    the shipping design: free over €77 (same number the checkout charges by —
 *    served by the panel; the bar is display, the rates are the truth).
 */
( function () {
	'use strict';

	var BGN_RATE  = 1.95583;
	var FREE_OVER = 77; // EUR — keep in step with the panel's free_over_eur

	/* The rendered line needs a few strings and one mark. They are here
	   rather than inline because the template below builds them into a
	   concatenation, and a Bulgarian label buried in a chain of quotes is
	   where a translation goes to be forgotten. BOW is the same path the
	   slab uses in img-fallback.js and the same one in --icon-bow: it is
	   the brand mark, and a plausible bow is worse than no bow. */
	var NO_IMG = 'Снимката не може да бъде заредена';
	var LESS   = 'По-малко';
	var MORE   = 'Повече';
	var QTY    = 'Количество';
	var REMOVE = 'Премахни';
	/* *** COPIED, CHARACTER FOR CHARACTER, FROM assets/img-fallback.js. ***
	   Not retyped: this patch read it out of that file. It is the torn bow,
	   and a second drawing of it would be a second mark. scripts/bowgate.js
	   compares the path data in all three places that carry it and fails if
	   they drift, because a comment cannot enforce this and I have already
	   drawn a wrong bow twice. */
	var BOW = '<svg class="d-media-fail__bow" viewBox="0 0 24 12" fill="currentColor" aria-hidden="true"><defs><clipPath id="d-bow-tear-l"><path d="M0 0 H12.6 L11.5 2.2 L12.9 4.1 L11.2 6.0 L12.8 7.9 L11.4 10.0 L12.5 12 H0 Z"/></clipPath><clipPath id="d-bow-tear-r"><path d="M24 0 H12.6 L11.5 2.2 L12.9 4.1 L11.2 6.0 L12.8 7.9 L11.4 10.0 L12.5 12 H24 Z"/></clipPath></defs><g clip-path="url(#d-bow-tear-l)"><path d="M12 6 L3.2 1.4 C1.8.7 1.8 11.3 3.2 10.6 Z M12 6 l8.8-4.6 c1.4-.7 1.4 9.9 0 9.2 Z"/><circle cx="12" cy="6" r="2.4"/></g><g clip-path="url(#d-bow-tear-r)" transform="translate(.9 .45) rotate(6 18 6)"><path d="M12 6 L3.2 1.4 C1.8.7 1.8 11.3 3.2 10.6 Z M12 6 l8.8-4.6 c1.4-.7 1.4 9.9 0 9.2 Z"/><circle cx="12" cy="6" r="2.4"/></g></svg>';

	// ---- menu drawer --------------------------------------------------------
	var drawer = document.getElementById( 'darling-menu-drawer' );
	var burger = document.querySelector( '.d-header__burger' );

	if ( drawer && burger ) {
		var open = function () {
			if ( typeof drawer.showModal === 'function' ) {
				drawer.showModal();
			} else {
				drawer.setAttribute( 'open', '' ); // very old browsers: still usable
			}
			burger.setAttribute( 'aria-expanded', 'true' );
		};
		var close = function () {
			if ( typeof drawer.close === 'function' ) { drawer.close(); }
			else { drawer.removeAttribute( 'open' ); }
			burger.setAttribute( 'aria-expanded', 'false' );
		};

		burger.addEventListener( 'click', open );
		drawer.addEventListener( 'close', function () {
			burger.setAttribute( 'aria-expanded', 'false' );
		} );

		var closeBtn = drawer.querySelector( '.d-drawer__close' );
		if ( closeBtn ) { closeBtn.addEventListener( 'click', close ); }

		drawer.addEventListener( 'click', function ( e ) {
			var r = drawer.getBoundingClientRect();
			var inside = e.clientX >= r.left && e.clientX <= r.right &&
			             e.clientY >= r.top  && e.clientY <= r.bottom;
			if ( ! inside ) { close(); }
		} );

		drawer.addEventListener( 'pagehide', close );
	}

	// ---- cart count ---------------------------------------------------------
	var badge = document.querySelector( '[data-darling-cart-count]' );
	if ( ! badge || typeof window.fetch !== 'function' ) { return; }

	/* *** THE BADGE HIDES ITSELF. ***
	   icon.css hides .d-icon-btn__count when it is :empty or when
	   data-count is "0", so visibility follows the VALUE. The old version
	   toggled a `hidden` attribute from here, which meant two places had to
	   agree about what zero looks like. */
	function paint( n ) {
		badge.textContent = n > 99 ? '99+' : String( n );
		badge.setAttribute( 'data-count', String( n ) );
	}

	function refresh() {
		fetch( '/wp-json/wc/store/v1/cart', {
			headers: { Accept: 'application/json' },
			credentials: 'same-origin'
		} )
			.then( function ( r ) { return r.ok ? r.json() : null; } )
			.then( function ( c ) { if ( c ) { paint( c.items_count || 0 ); } } )
			// Silent on failure: an empty badge is correct-looking and harmless.
			.catch( function () {} );
	}

	refresh();

	// ---- cart drawer --------------------------------------------------------
	var cartDlg  = document.getElementById( 'darling-cart-drawer' );
	var cartBody = document.querySelector( '[data-darling-cart-body]' );
	var cartFoot = document.querySelector( '[data-darling-cart-foot]' );
	var cartTot  = document.querySelector( '[data-darling-cart-total]' );
	var shipBar  = document.querySelector( '[data-darling-shipbar]' );
	var shipMsg  = document.querySelector( '[data-darling-shipbar-msg]' );
	var shipBarEl = document.querySelector( '[data-darling-shipbar-bar]' );

	if ( cartDlg && cartBody ) {

		// Bulgarian money: comma decimals, dual currency at the fixed rate.
		var bg = function ( n ) {
			return n.toFixed( 2 ).replace( '.', ',' );
		};
		var dual = function ( minor ) {
			var eur = minor / 100;
			return '€' + bg( eur ) + ' / ' + bg( eur * BGN_RATE ) + ' лв.';
		};

		var paintShipbar = function ( c ) {
			if ( ! shipBar || ! shipMsg || ! shipBarEl ) { return; }
			var items = ( c && c.items ) || [];
			if ( ! items.length ) {
				shipBar.setAttribute( 'hidden', '' );
				return;
			}
			var eur = ( ( c.totals && parseInt( c.totals.total_items, 10 ) ) || 0 ) / 100;
			var left = FREE_OVER - eur;
			if ( left > 0 ) {
				shipMsg.innerHTML = '<span class="d-icon d-icon--truck" aria-hidden="true"></span> Още <strong>€' + bg( left ) + ' / ' + bg( left * BGN_RATE ) +
					' лв.</strong> до безплатна доставка, darling';
				shipBarEl.style.setProperty( '--pr', Math.max( .04, Math.min( 1, eur / FREE_OVER ) ) );
			} else {
				shipMsg.innerHTML = '<span class="d-icon d-icon--truck" aria-hidden="true"></span> <strong>Доставката е безплатна</strong>, darling ✦';
				shipBarEl.style.setProperty( '--pr', 1 );
			}
			shipBar.removeAttribute( 'hidden' );
		};

		var render = function ( c ) {
			var items = ( c && c.items ) || [];
			paintShipbar( c );
			if ( ! items.length ) {
				cartBody.innerHTML = '<p class="d-drawer__empty">Количката ви е празна.</p>' +
					'<a class="d-btn d-btn--quiet" href="/shop/">Разгледай продуктите</a>';
				cartFoot.setAttribute( 'hidden', '' );
				return;
			}
			var html = '<p class="d-drawer__trust">✦ Наложен платеж при доставка · Връщане до 14 дни</p>' +
				'<ul class="d-drawer__list">';
			items.forEach( function ( it ) {
				var img = ( it.images && it.images[0] ) ? it.images[0].thumbnail : '';
				html += '<li class="d-drawer__line" data-key="' + it.key + '">' +
					/* *** NO PICTURE IS AN ERROR STATE, NOT AN EMPTY BOX. ***
					   The old fallback was a blank 64px span. This is the same
					   .d-media-fail slab the product cards use, and its container
					   query drops the sentence below 120px - so at this size it is
					   the bow alone and the accessible name carries the meaning. */
					( img
						? '<img class="d-drawer__line__thumb" src="' + img + '" alt="" loading="lazy">'
						: '<div class="d-drawer__line__thumb"><div class="d-media-fail" role="img" aria-label="'
						  + NO_IMG + '">' + BOW + '</div></div>' ) +
					'<div class="d-drawer__line__body">' +
						'<a class="d-drawer__line__name" href="' + it.permalink + '">' + it.name + '</a>' +
						'<span class="d-drawer__line__meta">' + dual( it.prices.price ) + '</span>' +
						'<div class="d-drawer__line__foot">' +
							/* *** A NUMBER INPUT, NOT A <b>. ***
							   Going from 1 to 9 used to be eight presses of +. The
							   system's stepper has had a real input all along; this is
							   it at --compact, and typing a number commits it. */
							'<div class="d-qty d-qty--compact">' +
								'<button type="button" class="d-qty__button" data-darling-qty="-1" aria-label="' + LESS + '">' +
									'<span class="d-icon d-icon--minus" aria-hidden="true"></span></button>' +
								'<input class="d-qty__input" type="number" min="1" inputmode="numeric" ' +
									'value="' + it.quantity + '" aria-label="' + QTY + '">' +
								'<button type="button" class="d-qty__button" data-darling-qty="1" aria-label="' + MORE + '">' +
									'<span class="d-icon d-icon--plus" aria-hidden="true"></span></button>' +
							'</div>' +
							'<span class="d-drawer__line__price">' + dual( it.prices.price * it.quantity ) + '</span>' +
						'</div>' +
					'</div>' +
					'<button type="button" class="d-drawer__line__rm" data-key="' + it.key +
						'" aria-label="' + REMOVE + '">' +
						'<span class="d-icon d-icon--close" aria-hidden="true"></span></button>' +
				'</li>';
			} );
			cartBody.innerHTML = html + '</ul>';
			cartTot.textContent = dual( parseInt( c.totals.total_items, 10 ) );
			cartFoot.removeAttribute( 'hidden' );
		};

		var load = function () {
			cartBody.innerHTML = '<p class="d-drawer__empty">Зареждане…</p>';
			fetch( '/wp-json/wc/store/v1/cart', {
				headers: { Accept: 'application/json' }, credentials: 'same-origin'
			} )
				.then( function ( r ) { return r.ok ? r.json() : null; } )
				.then( function ( c ) {
					if ( c ) { render( c ); paint( c.items_count || 0 ); }
					else { cartBody.innerHTML = '<p class="d-drawer__empty">Количката не може да бъде заредена.</p>'; }
				} )
				.catch( function () {
					// Fail to a working link rather than a dead panel: /cart/ always
					// works, so a fetch problem must not trap the customer.
					cartBody.innerHTML = '<p class="d-drawer__empty">' +
						'Количката не може да бъде заредена. <a href="/cart/">Отвори страницата</a></p>';
				} );
		};

		var openDrawer = function () {
			if ( cartDlg.open ) { return; }
			if ( typeof cartDlg.showModal === 'function' ) { cartDlg.showModal(); }
		};

		// One nonce-carrying POST helper for item mutations.
		var mutate = function ( path, payload, btn ) {
			if ( btn ) { btn.disabled = true; }
			fetch( '/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } } )
				.then( function ( r ) {
					return fetch( '/wp-json/wc/store/v1/cart/' + path, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', Nonce: r.headers.get( 'nonce' ) || '' },
						credentials: 'same-origin',
						body: JSON.stringify( payload )
					} );
				} )
				.then( function ( r ) { return r.ok ? r.json() : null; } )
				.then( function ( c ) { if ( c ) { render( c ); paint( c.items_count || 0 ); } else { load(); } } )
				.catch( function () { load(); } );
		};

		document.addEventListener( 'click', function ( e ) {
			var trigger = e.target.closest( '[data-darling-cart-open]' );
			if ( trigger ) {
				// Only hijack a plain left click. Modifier clicks and middle clicks
				// must keep opening /cart/ in a tab, as any link would.
				if ( e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 ) { return; }
				e.preventDefault();
				openDrawer();
				load();
			}
			if ( e.target.closest( '[data-darling-cart-close]' ) ) { cartDlg.close(); }

			var qb = e.target.closest( '.d-qty__button[data-darling-qty]' );
			if ( qb ) {
				var li  = qb.closest( '.d-drawer__line' );
				var cur = parseInt( ( li.querySelector( '.d-qty__input' ) || {} ).value || '1', 10 );
				var next = cur + parseInt( qb.getAttribute( 'data-darling-qty' ), 10 );
				if ( next < 1 ) {
					mutate( 'remove-item', { key: li.getAttribute( 'data-key' ) }, qb );
				} else {
					mutate( 'update-item', { key: li.getAttribute( 'data-key' ), quantity: next }, qb );
				}
			}

			/* The stepper's input is editable, so a typed number has to reach
			   the cart the same way a button press does - otherwise the field
			   accepts 7, shows 7, and the basket still holds 1. Delegated on
			   'change' below; this handler is clicks only. */
			var rm = e.target.closest( '.d-drawer__line__rm' );
			if ( rm ) {
				mutate( 'remove-item', { key: rm.getAttribute( 'data-key' ) }, rm );
			}
		} );

		document.addEventListener( 'change', function ( e ) {
			var inp = e.target.closest && e.target.closest( '.d-qty__input' );
			if ( ! inp ) { return; }
			var li = inp.closest( '.d-drawer__line' );
			if ( ! li ) { return; }
			var n = parseInt( inp.value, 10 );
			if ( ! ( n >= 1 ) ) { n = 1; }
			mutate( 'update-item', { key: li.getAttribute( 'data-key' ), quantity: n }, inp );
		} );

		cartDlg.addEventListener( 'click', function ( e ) {
			var r = cartDlg.getBoundingClientRect();
			var inside = e.clientX >= r.left && e.clientX <= r.right &&
			             e.clientY >= r.top  && e.clientY <= r.bottom;
			if ( ! inside ) { cartDlg.close(); }
		} );

		// The live site opens the drawer the moment something lands in the cart —
		// both the Blocks event and the classic jQuery event, whichever fires.
		var onAdded = function () { openDrawer(); load(); };
		document.body.addEventListener( 'wc-blocks_added_to_cart', onAdded );
		if ( window.jQuery ) {
			window.jQuery( document.body ).on( 'added_to_cart', onAdded );
		}

		// The product page's add-to-cart is a classic POST + full reload, so no
		// event survives it. Remember the intent in sessionStorage on submit and
		// open the drawer on the page that comes back.
		document.addEventListener( 'submit', function ( e ) {
			var f = e.target;
			if ( f && f.classList && f.classList.contains( 'cart' ) ) {
				try { sessionStorage.setItem( 'darling-cart-open-next', '1' ); } catch ( err ) {}
			}
		}, true );
		try {
			if ( sessionStorage.getItem( 'darling-cart-open-next' ) === '1' ) {
				sessionStorage.removeItem( 'darling-cart-open-next' );
				onAdded();
			}
		} catch ( err ) {}
	}

	// The block cart and checkout emit this when the basket changes.
	document.body.addEventListener( 'wc-blocks_added_to_cart', refresh );
	document.body.addEventListener( 'wc-blocks_removed_from_cart', refresh );
	// Coming back via the back button can show a cached page with a stale badge.
	window.addEventListener( 'pageshow', function ( e ) { if ( e.persisted ) { refresh(); } } );
} )();
