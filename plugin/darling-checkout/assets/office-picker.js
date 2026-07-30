/**
 * Progressive enhancement for the courier office field.
 *
 * WooCommerce's Additional Checkout Fields API cannot express a dependent
 * dropdown (offices depend on the chosen settlement), and we deliberately avoid
 * a React/webpack build for one control. So: the field stays a real text input
 * that accepts a typed office id, and this script upgrades it to a searchable
 * list when JS is available.
 *
 * Consequences of that choice, on purpose:
 *  - no build step, no bundle to keep in sync with WooCommerce's blocks;
 *  - if this script fails, checkout still works (a typed id is accepted, and the
 *    server validates it against the destination settlement anyway);
 *  - block checkout re-renders often, so we observe rather than bind once.
 */
( function () {
	'use strict';

	if ( typeof window.DarlingOffice === 'undefined' ) {
		return;
	}
	var CFG = window.DarlingOffice;
	var cache = {};
	var lastKey = '';

	/**
	 * Built from the server's carrier list, not hard-coded. A hard-coded
	 * `(econt|speedy)` would mean every new courier contract needs a JS change that
	 * is easy to forget - and forgetting it looks like "the office picker is broken
	 * for BOX NOW" rather than "someone missed a regex".
	 */
	var RATE_RE = new RegExp(
		'^darling_(' + ( CFG.carriers || [ 'econt', 'speedy' ] ).join( '|' ) + '):(office|door)$'
	);

	function findOfficeInput() {
		return document.querySelector( '[data-darling-office="1"]' ) ||
			document.querySelector( 'input[id*="office" i][id*="darling" i]' ) ||
			document.querySelector( 'input[name*="office" i][name*="darling" i]' );
	}

	function findCity() {
		var el = document.querySelector( '#shipping-city, input[name="shipping_city"], input[name="shipping-city"], #billing-city, input[name="billing_city"], input[name="billing-city"]' );
		return el ? el.value.trim() : '';
	}

	/**
	 * Find the chosen shipping rate.
	 *
	 * Keyed on the rate VALUE, not the input name: WooCommerce's block checkout
	 * names its radios `radio-control-N`, so an earlier `[name*="shipping"]`
	 * selector matched nothing and the picker silently never appeared. The value
	 * is ours (`darling_econt:office`) and therefore stable.
	 */
	function chosenRate() {
		var radios = document.querySelectorAll( 'input[type="radio"]' );
		for ( var i = 0; i < radios.length; i++ ) {
			var v = radios[ i ].value || '';
			if ( radios[ i ].checked && RATE_RE.test( v ) ) {
				var m = v.split( ':' );
				return { carrier: m[ 0 ].replace( 'darling_', '' ), mode: m[ 1 ] };
			}
		}
		return null;
	}

	function findCarrier() {
		var r = chosenRate();
		return r ? r.carrier : '';
	}

	/** Only offer the picker when an office rate is selected. */
	function officeModeChosen() {
		var r = chosenRate();
		return !! r && 'office' === r.mode;
	}

	function ensureSelect( input ) {
		var sel = document.getElementById( 'darling-office-select' );
		if ( sel ) { return sel; }
		sel = document.createElement( 'select' );
		sel.id = 'darling-office-select';
		sel.style.cssText = 'width:100%;margin-top:.35rem;padding:.55rem .6rem;border:1.5px solid #EFDCC3;border-radius:10px;background:#fff';
		sel.addEventListener( 'change', function () {
			input.value = sel.value;
			// Notify whatever framework owns the input, or the value never persists.
			input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		} );
		input.parentNode.insertBefore( sel, input.nextSibling );
		// The typed id remains the source of truth and the accessible control;
		// the select is an aid, so keep the input reachable rather than hiding it.
		input.setAttribute( 'aria-describedby', 'darling-office-select' );
		return sel;
	}

	/**
	 * "офис" is wrong for BOX NOW and Sameday - those are unstaffed parcel lockers.
	 * Sending someone to look for an office that does not exist is a real support
	 * call, so the noun follows the carrier.
	 */
	function noun( carrier ) {
		var l = ( CFG.labels && CFG.labels[ carrier ] ) || 'до офис';
		return l.replace( /^до\s+/, '' );
	}

	function fill( sel, offices, current, carrier ) {
		sel.innerHTML = '';
		var o0 = document.createElement( 'option' );
		o0.value = '';
		o0.textContent = offices.length
			? '— избери ' + noun( carrier ) + ' — (' + offices.length + ')'
			: CFG.i18n.none;
		sel.appendChild( o0 );
		offices.forEach( function ( o ) {
			var opt = document.createElement( 'option' );
			opt.value = o.id;
			opt.textContent = o.name + ( o.address ? ' — ' + o.address : '' );
			if ( o.id === current ) { opt.selected = true; }
			sel.appendChild( opt );
		} );
	}

	function refresh() {
		var input = findOfficeInput();
		if ( ! input ) { return; }

		if ( ! officeModeChosen() ) {
			var stale = document.getElementById( 'darling-office-select' );
			if ( stale ) { stale.remove(); }
			return;
		}

		var city = findCity();
		var carrier = findCarrier();
		if ( ! city || ! carrier ) { return; }

		var key = carrier + '|' + city;
		if ( key === lastKey && document.getElementById( 'darling-office-select' ) ) { return; }
		lastKey = key;

		var sel = ensureSelect( input );

		if ( cache[ key ] ) {
			fill( sel, cache[ key ], input.value.trim(), carrier );
			return;
		}

		sel.innerHTML = '<option value="">' + CFG.i18n.loading + '</option>';
		fetch( CFG.endpoint + '?carrier=' + encodeURIComponent( carrier ) + '&city=' + encodeURIComponent( city ) )
			.then( function ( r ) { return r.json(); } )
			.then( function ( d ) {
				var offices = ( d && d.offices ) || [];
				cache[ key ] = offices;
				fill( sel, offices, input.value.trim(), carrier );
			} )
			.catch( function () {
				// Fail visibly, and leave the typed input usable.
				sel.innerHTML = '<option value="">' + CFG.i18n.error + '</option>';
				lastKey = '';
			} );
	}

	var t;
	function schedule() {
		clearTimeout( t );
		t = setTimeout( refresh, 350 );
	}

	document.addEventListener( 'change', schedule, true );
	document.addEventListener( 'input', schedule, true );
	// Block checkout re-renders on every cart/address update, so watch the tree
	// rather than binding once to elements that will be replaced.
	try {
		new MutationObserver( schedule ).observe( document.body, { childList: true, subtree: true } );
	} catch ( e ) {}
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', schedule );
	} else {
		schedule();
	}
} )();
