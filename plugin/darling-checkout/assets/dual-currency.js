/**
 * EUR/BGN dual display inside the BLOCK cart and checkout.
 *
 * Why this exists at all: the server-side `wc_price` filter covers shop, product
 * and classic pages, but the block cart/checkout render prices CLIENT-side from
 * Store API minor-unit values and never pass through that filter. The result was
 * dual pricing everywhere except the two pages where it arguably matters most.
 *
 * This is a legal display requirement during Bulgaria's euro transition, not a
 * nicety — so the rate and the on/off switch are supplied by the server
 * (DarlingDual), which owns the transition end date. The browser only formats.
 */
( function () {
	'use strict';

	if ( typeof window.DarlingDual === 'undefined' || ! window.DarlingDual.active ) {
		return;
	}
	var RATE = parseFloat( window.DarlingDual.rate );
	if ( ! ( RATE > 0 ) ) {
		return;
	}
	var MARK = 'darlingDual'; // dataset flag, so we never double-append

	var SELECTORS = [
		'.wc-block-components-formatted-money-amount',
		'.wc-block-components-totals-item__value',
		'.wc-block-components-product-price__value',
		'.wc-block-components-order-summary-item__total-price',
	].join( ',' );

	/**
	 * Parse a rendered money string into a number.
	 *
	 * Deliberately defensive: Bulgarian formatting is "13,50 €" but WooCommerce can
	 * be configured either way, and a wrong parse would print a wrong legal price.
	 * When the decimal separator is genuinely ambiguous we return null and skip the
	 * element rather than guess — showing nothing is safer than showing a wrong sum.
	 */
	function parseAmount( text ) {
		var t = String( text ).replace( / /g, ' ' );
		t = t.replace( /[^\d.,-]/g, '' ).trim();
		if ( ! t ) { return null; }

		var lastComma = t.lastIndexOf( ',' );
		var lastDot   = t.lastIndexOf( '.' );
		var dec;

		if ( lastComma > -1 && lastDot > -1 ) {
			dec = lastComma > lastDot ? ',' : '.';        // whichever comes last is the decimal
		} else if ( lastComma > -1 ) {
			// "1,50" -> decimal; "1,500" -> thousands. Two trailing digits means decimal.
			dec = /,\d{2}$/.test( t ) ? ',' : '';
		} else if ( lastDot > -1 ) {
			dec = /\.\d{2}$/.test( t ) ? '.' : '';
		} else {
			dec = '';
		}

		var normalised;
		if ( ',' === dec ) {
			normalised = t.replace( /\./g, '' ).replace( ',', '.' );
		} else if ( '.' === dec ) {
			normalised = t.replace( /,/g, '' );
		} else {
			normalised = t.replace( /[.,]/g, '' );        // no decimals at all
		}

		var n = parseFloat( normalised );
		return isFinite( n ) ? n : null;
	}

	function formatBGN( eur ) {
		var bgn = Math.round( eur * RATE * 100 ) / 100;
		return bgn.toFixed( 2 ).replace( '.', ',' );
	}

	function decorate( el ) {
		if ( el.dataset[ MARK ] ) { return; }
		// Never touch something that already shows лв. - the server-side filter may
		// have rendered it, and two conversions would compound.
		if ( /лв\./.test( el.textContent ) ) {
			el.dataset[ MARK ] = 'skip';
			return;
		}
		var eur = parseAmount( el.textContent );
		if ( null === eur ) {
			el.dataset[ MARK ] = 'unparsed';
			return;
		}
		if ( 0 === eur ) {                                // "Free" / 0.00 - nothing useful to add
			el.dataset[ MARK ] = 'zero';
			return;
		}
		var span = document.createElement( 'span' );
		span.className = 'darling-bgn';
		span.textContent = ' / ' + formatBGN( eur ) + ' лв.';
		el.appendChild( span );
		el.dataset[ MARK ] = '1';
	}

	function run() {
		var nodes = document.querySelectorAll( SELECTORS );
		for ( var i = 0; i < nodes.length; i++ ) {
			try { decorate( nodes[ i ] ); } catch ( e ) {}
		}
	}

	var t;
	function schedule() {
		clearTimeout( t );
		t = setTimeout( run, 220 );
	}

	// The block cart/checkout re-render on every quantity, address and shipping
	// change, replacing these nodes - so observe rather than decorate once.
	try {
		new MutationObserver( schedule ).observe( document.body, { childList: true, subtree: true } );
	} catch ( e ) {}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', schedule );
	} else {
		schedule();
	}
} )();
