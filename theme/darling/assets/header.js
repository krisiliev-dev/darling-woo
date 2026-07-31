/**
 * Header behaviour: the mobile drawer, and the cart count.
 *
 * Both exist because of decisions made elsewhere in the stack:
 *
 *  - The drawer is a native <dialog>. `showModal()` gives focus trapping,
 *    Escape-to-close and inertness of the page behind, all of which are easy to
 *    get subtly wrong by hand and invisible to whoever isn't using a keyboard or
 *    a screen reader.
 *
 *  - The cart count is fetched, never rendered server-side. Pages are served from
 *    a 60-second nginx micro-cache, so a number baked into the HTML would be one
 *    visitor's basket shown to the next. The markup ships `hidden` with 0 and is
 *    filled in per-visitor from the Store API.
 */
( function () {
	'use strict';

	// ---- drawer -------------------------------------------------------------
	var drawer = document.getElementById( 'darling-menu-drawer' );
	var burger = document.querySelector( '.darling-header__burger' );

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

		var closeBtn = drawer.querySelector( '.darling-drawer__close' );
		if ( closeBtn ) { closeBtn.addEventListener( 'click', close ); }

		// Click outside the panel closes it. <dialog> reports clicks on its own
		// backdrop as clicks on the dialog element, so compare against its box.
		drawer.addEventListener( 'click', function ( e ) {
			var r = drawer.getBoundingClientRect();
			var inside = e.clientX >= r.left && e.clientX <= r.right &&
			             e.clientY >= r.top  && e.clientY <= r.bottom;
			if ( ! inside ) { close(); }
		} );

		// Following a link should not leave the drawer open behind the new page
		// in browsers that restore it from bfcache.
		drawer.addEventListener( 'pagehide', close );
	}

	// ---- cart count ---------------------------------------------------------
	var badge = document.querySelector( '[data-darling-cart-count]' );
	if ( ! badge || typeof window.fetch !== 'function' ) { return; }

	function paint( n ) {
		if ( n > 0 ) {
			badge.textContent = n > 99 ? '99+' : String( n );
			badge.removeAttribute( 'hidden' );
		} else {
			badge.setAttribute( 'hidden', '' );
		}
	}

	function refresh() {
		fetch( '/wp-json/wc/store/v1/cart', {
			headers: { Accept: 'application/json' },
			credentials: 'same-origin'
		} )
			.then( function ( r ) { return r.ok ? r.json() : null; } )
			.then( function ( c ) { if ( c ) { paint( c.items_count || 0 ); } } )
			// Silent on failure: an empty badge is correct-looking and harmless,
			// whereas an error state in the header would alarm a shopper about
			// something that does not affect their ability to buy.
			.catch( function () {} );
	}

	refresh();

	// ---- cart drawer --------------------------------------------------------
	var cartDlg  = document.getElementById( 'darling-cart-drawer' );
	var cartBody = document.querySelector( '[data-darling-cart-body]' );
	var cartFoot = document.querySelector( '[data-darling-cart-foot]' );
	var cartTot  = document.querySelector( '[data-darling-cart-total]' );

	if ( cartDlg && cartBody ) {
		var money = function ( minor, cur ) {
			return ( minor / 100 ).toFixed( 2 ) + ' ' + ( cur || '€' );
		};

		var render = function ( c ) {
			var items = ( c && c.items ) || [];
			if ( ! items.length ) {
				cartBody.innerHTML = '<p class="darling-cart__empty">Количката ви е празна.</p>' +
					'<a class="d-btn d-btn--ghost" href="/shop/">Разгледай продуктите</a>';
				cartFoot.setAttribute( 'hidden', '' );
				return;
			}
			var sym = ( c.totals && c.totals.currency_symbol ) || '€';
			var html = '<ul class="darling-cart__items">';
			items.forEach( function ( it ) {
				var img = ( it.images && it.images[0] ) ? it.images[0].thumbnail : '';
				html += '<li class="darling-cart__item">' +
					( img ? '<img src="' + img + '" alt="" loading="lazy">' : '<span class="darling-cart__noimg"></span>' ) +
					'<div class="darling-cart__meta">' +
						'<a href="' + it.permalink + '">' + it.name + '</a>' +
						'<span class="darling-cart__qty">' + it.quantity + ' × ' +
							money( it.prices.price, sym ) + '</span>' +
					'</div>' +
					'<button type="button" class="darling-cart__rm" data-key="' + it.key +
						'" aria-label="Премахни">✕</button>' +
				'</li>';
			} );
			cartBody.innerHTML = html + '</ul>';
			cartTot.textContent = money( c.totals.total_items, sym );
			cartFoot.removeAttribute( 'hidden' );
		};

		var load = function () {
			cartBody.innerHTML = '<p class="darling-cart__loading">Зареждане…</p>';
			fetch( '/wp-json/wc/store/v1/cart', {
				headers: { Accept: 'application/json' }, credentials: 'same-origin'
			} )
				.then( function ( r ) { return r.ok ? r.json() : null; } )
				.then( function ( c ) {
					if ( c ) { render( c ); paint( c.items_count || 0 ); }
					else { cartBody.innerHTML = '<p class="darling-cart__empty">Количката не може да бъде заредена.</p>'; }
				} )
				.catch( function () {
					// Fail to a working link rather than a dead panel: /cart/ always
					// works, so a fetch problem must not trap the customer.
					cartBody.innerHTML = '<p class="darling-cart__empty">' +
						'Количката не може да бъде заредена. <a href="/cart/">Отвори страницата</a></p>';
				} );
		};

		document.addEventListener( 'click', function ( e ) {
			var trigger = e.target.closest( '[data-darling-cart-open]' );
			if ( trigger ) {
				// Only hijack a plain left click. Modifier clicks and middle clicks
				// must keep opening /cart/ in a tab, as any link would.
				if ( e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 ) { return; }
				e.preventDefault();
				if ( typeof cartDlg.showModal === 'function' ) { cartDlg.showModal(); } else { return; }
				load();
			}
			if ( e.target.closest( '[data-darling-cart-close]' ) ) { cartDlg.close(); }

			var rm = e.target.closest( '.darling-cart__rm' );
			if ( rm ) {
				rm.disabled = true;
				fetch( '/wp-json/wc/store/v1/cart', { headers: { Accept: 'application/json' } } )
					.then( function ( r ) {
						return fetch( '/wp-json/wc/store/v1/cart/remove-item', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json', Nonce: r.headers.get( 'nonce' ) || '' },
							credentials: 'same-origin',
							body: JSON.stringify( { key: rm.getAttribute( 'data-key' ) } )
						} );
					} )
					.then( function ( r ) { return r.ok ? r.json() : null; } )
					.then( function ( c ) { if ( c ) { render( c ); paint( c.items_count || 0 ); } else { load(); } } )
					.catch( function () { load(); } );
			}
		} );

		cartDlg.addEventListener( 'click', function ( e ) {
			var r = cartDlg.getBoundingClientRect();
			var inside = e.clientX >= r.left && e.clientX <= r.right &&
			             e.clientY >= r.top  && e.clientY <= r.bottom;
			if ( ! inside ) { cartDlg.close(); }
		} );

		document.body.addEventListener( 'wc-blocks_added_to_cart', function () {
			if ( cartDlg.open ) { load(); }
		} );
	}

	// The block cart and checkout emit this when the basket changes.
	document.body.addEventListener( 'wc-blocks_added_to_cart', refresh );
	document.body.addEventListener( 'wc-blocks_removed_from_cart', refresh );
	// Coming back via the back button can show a cached page with a stale badge.
	window.addEventListener( 'pageshow', function ( e ) { if ( e.persisted ) { refresh(); } } );
} )();
