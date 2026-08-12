/**
 * Dual currency on the blocks cart page.
 *
 * PHP price filters cover every server-rendered price, but the cart block is
 * React rendering Store API JSON — the лв. companion never reaches it. This
 * watches the cart block and appends the fixed-rate BGN next to each rendered
 * EUR amount, re-applying after every re-render (qty change, remove, coupon).
 *
 * Display only: the charged amount is and stays the EUR the server computed.
 */
( function () {
	'use strict';

	var RATE = 1.95583;
	var root = document.querySelector( '.wp-block-woocommerce-cart' );
	if ( ! root ) { return; }

	var bg = function ( n ) {
		return n.toFixed( 2 ).replace( '.', ',' );
	};

	var parseEur = function ( text ) {
		// "€13.50", "13,50 €", "€ 1 234,56" — find the number, decide the
		// decimal separator by whichever of . / , comes last.
		var m = text.replace( /\s/g, '' ).match( /([\d.,]+)/ );
		if ( ! m ) { return null; }
		var raw = m[1];
		var lastDot = raw.lastIndexOf( '.' ), lastComma = raw.lastIndexOf( ',' );
		var num = lastComma > lastDot
			? raw.replace( /\./g, '' ).replace( ',', '.' )
			: raw.replace( /,/g, '' );
		var v = parseFloat( num );
		return isNaN( v ) ? null : v;
	};

	var apply = function () {
		root.querySelectorAll( '.wc-block-formatted-money-amount' ).forEach( function ( el ) {
			if ( el.querySelector( '.darling-bgn' ) ) { return; }
			var eur = parseEur( el.textContent );
			if ( eur === null || eur === 0 ) { return; }
			var span = document.createElement( 'span' );
			span.className = 'darling-bgn';
			span.textContent = ' / ' + bg( eur * RATE ) + ' лв.';
			el.appendChild( span );
		} );
	};

	// React swaps nodes wholesale on re-render; a broad observer with a rAF
	// debounce keeps up without looping on our own appends (guarded above).
	var scheduled = false;
	new MutationObserver( function () {
		if ( scheduled ) { return; }
		scheduled = true;
		requestAnimationFrame( function () {
			scheduled = false;
			apply();
		} );
	} ).observe( root, { childList: true, subtree: true, characterData: true } );

	apply();
} )();
