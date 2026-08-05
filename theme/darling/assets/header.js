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

	// ---- menu drawer --------------------------------------------------------
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
	var shipFill = document.querySelector( '[data-darling-shipbar-fill]' );

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
			if ( ! shipBar || ! shipMsg || ! shipFill ) { return; }
			var items = ( c && c.items ) || [];
			if ( ! items.length ) {
				shipBar.setAttribute( 'hidden', '' );
				return;
			}
			var eur = ( ( c.totals && parseInt( c.totals.total_items, 10 ) ) || 0 ) / 100;
			var left = FREE_OVER - eur;
			if ( left > 0 ) {
				shipMsg.innerHTML = 'Още <strong>€' + bg( left ) + ' / ' + bg( left * BGN_RATE ) +
					' лв.</strong> до безплатна доставка, darling';
				shipFill.style.width = Math.max( 4, Math.min( 100, ( eur / FREE_OVER ) * 100 ) ) + '%';
			} else {
				shipMsg.innerHTML = '<strong>Доставката е безплатна</strong>, darling ✦';
				shipFill.style.width = '100%';
			}
			shipBar.removeAttribute( 'hidden' );
		};

		var render = function ( c ) {
			var items = ( c && c.items ) || [];
			paintShipbar( c );
			if ( ! items.length ) {
				cartBody.innerHTML = '<p class="darling-cart__empty">Количката ви е празна.</p>' +
					'<a class="d-btn d-btn--ghost" href="/shop/">Разгледай продуктите</a>';
				cartFoot.setAttribute( 'hidden', '' );
				return;
			}
			var html = '<p class="darling-cart-trust">✦ Наложен платеж при доставка · Връщане до 14 дни</p>' +
				'<ul class="darling-cart__items">';
			items.forEach( function ( it ) {
				var img = ( it.images && it.images[0] ) ? it.images[0].thumbnail : '';
				html += '<li class="darling-cart__item" data-key="' + it.key + '">' +
					( img ? '<img src="' + img + '" alt="" loading="lazy">' : '<span class="darling-cart__noimg"></span>' ) +
					'<div class="darling-cart__meta">' +
						'<a href="' + it.permalink + '">' + it.name + '</a>' +
						'<span class="darling-cart__qty">' + dual( it.prices.price ) + '</span>' +
						'<span class="darling-cart__stepper">' +
							'<button type="button" class="darling-cart__qbtn" data-darling-qty="-1" aria-label="По-малко">−</button>' +
							'<b>' + it.quantity + '</b>' +
							'<button type="button" class="darling-cart__qbtn" data-darling-qty="1" aria-label="Повече">+</button>' +
						'</span>' +
					'</div>' +
					'<span class="darling-cart__line">' + dual( it.prices.price * it.quantity ) + '</span>' +
					'<button type="button" class="darling-cart__rm" data-key="' + it.key +
						'" aria-label="Премахни">✕</button>' +
				'</li>';
			} );
			cartBody.innerHTML = html + '</ul>';
			cartTot.textContent = dual( parseInt( c.totals.total_items, 10 ) );
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

			var qb = e.target.closest( '.darling-cart__qbtn' );
			if ( qb ) {
				var li  = qb.closest( '.darling-cart__item' );
				var cur = parseInt( ( li.querySelector( '.darling-cart__stepper b' ) || {} ).textContent || '1', 10 );
				var next = cur + parseInt( qb.getAttribute( 'data-darling-qty' ), 10 );
				if ( next < 1 ) {
					mutate( 'remove-item', { key: li.getAttribute( 'data-key' ) }, qb );
				} else {
					mutate( 'update-item', { key: li.getAttribute( 'data-key' ), quantity: next }, qb );
				}
			}

			var rm = e.target.closest( '.darling-cart__rm' );
			if ( rm ) {
				mutate( 'remove-item', { key: rm.getAttribute( 'data-key' ) }, rm );
			}
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
