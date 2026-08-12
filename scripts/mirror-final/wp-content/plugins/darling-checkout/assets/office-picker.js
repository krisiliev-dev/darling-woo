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
		'^darling_(' + ( CFG.carriers || [ 'econt', 'speedy' ] ).join( '|' ) +
			'):(' + ( CFG.modes || [ 'office', 'door' ] ).join( '|' ) + ')$'
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
		// Not just 'office'. BoxNow's mode is 'loker', and hardcoding the noun here
		// meant the picker never appeared for it - the customer would have been asked
		// to type a locker id into a bare text box, or more likely typed nothing.
		var pickup = CFG.pickup || [ 'office' ];
		return !! r && pickup.indexOf( r.mode ) !== -1;
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
	 * *** THE NOUN FOLLOWS THE ROW, NOT THE COURIER. ***
	 * The registry carries one noun per carrier. For BOX NOW that is right - every
	 * point it has is an автомат. For Speedy it is wrong on most rows: the panel
	 * serves 833 автомата and 460 staffed offices from ONE list, and the nearest
	 * Speedy point to Свищов is СВИЩОВ - БИЛЛА (АВТОМАТ), 220 m away. Calling
	 * that «офис» sends someone hunting for a counter at a machine - the exact
	 * support call the registry comment says the noun exists to prevent.
	 * Every row now carries its own `kind`, so every row gets its own word.
	 */
	function kindNoun( o ) {
		return ( CFG.kinds && o && o.kind && CFG.kinds[ o.kind ] ) || '';
	}

	/** Fallback for a row whose kind the panel could not tell us. */
	function carrierNoun( carrier ) {
		var l = ( CFG.labels && CFG.labels[ carrier ] ) || 'до офис';
		return l.replace( /^до\s+/, '' );
	}

	function noun( o, carrier ) {
		return kindNoun( o ) || carrierNoun( carrier );
	}

	function distanceText( o ) {
		if ( ! o || typeof o.distance_km !== 'number' ) { return ''; }
		// Under a kilometre, metres. "0.2 км" reads as a rounding artefact; "200 м"
		// reads as walkable, which is the whole point of showing a distance.
		return o.distance_km < 1
			? ' · ' + Math.round( o.distance_km * 1000 ) + ' м'
			: ' · ' + o.distance_km.toFixed( 1 ) + ' ' + ( CFG.i18n.km || 'км' );
	}

	function fill( sel, offices, current, carrier ) {
		sel.innerHTML = '';
		var o0 = document.createElement( 'option' );
		o0.value = '';
		o0.textContent = offices.length
			? ( CFG.i18n.choose || '' ) + ' (' + offices.length + ')'
			: CFG.i18n.none;
		sel.appendChild( o0 );
		offices.forEach( function ( o ) {
			var opt = document.createElement( 'option' );
			opt.value = o.id;
			opt.textContent = '[' + noun( o, carrier ) + '] ' + o.name +
				( o.address ? ' — ' + o.address : '' ) + distanceText( o );
			if ( o.id === current ) { opt.selected = true; }
			sel.appendChild( opt );
		} );
	}

	/* ── Nearest to me ──────────────────────────────────────────────────
	   A settlement name cannot answer "which автомат is nearest me": the closest
	   locker to someone in Свищов can sit in the next village, and filtering by
	   their typed city hides it. The panel ranks by lat/lon and returns distance_km,
	   so the browser only has to offer a position.
	   Progressive enhancement like the rest of this file: if geolocation is missing,
	   refused or times out, the city list is still there and a typed id still works. */
	var GEO_RADIUS_KM = 25;
	var geo = null;   // { lat, lon, carrier, city } while a nearest-first list is shown
	var geoBusy = false;

	function geoNote( text ) {
		var n = document.getElementById( 'darling-office-geo-note' );
		if ( n ) { n.textContent = text || ''; }
	}

	function ensureGeoRow( sel ) {
		var row = document.getElementById( 'darling-office-geo' );
		if ( row ) { return row; }
		row = document.createElement( 'div' );
		row.id = 'darling-office-geo';
		row.style.cssText = 'display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.35rem';

		var btn = document.createElement( 'button' );
		// *** type="button" IS NOT OPTIONAL HERE. *** A <button> inside the checkout
		// form defaults to type="submit"; without this, "find the nearest one" would
		// try to PLACE THE ORDER. This control sits on the money path.
		btn.type = 'button';
		btn.id = 'darling-office-geo-btn';
		btn.textContent = CFG.i18n.near || '';
		btn.style.cssText = 'cursor:pointer;border:1.5px solid #EFDCC3;background:#fff;border-radius:999px;padding:.4rem .9rem;font:inherit;font-size:.9em;color:inherit';
		// Re-resolve the nodes on click rather than closing over them: block checkout
		// replaces this subtree often, and a captured input would go stale.
		btn.addEventListener( 'click', function () {
			var i = findOfficeInput();
			var s2 = document.getElementById( 'darling-office-select' );
			if ( ! i || ! s2 ) { return; }
			if ( geo ) { geo = null; lastKey = ''; geoNote( '' ); refresh(); }
			else { locate( i, s2 ); }
		} );

		var note = document.createElement( 'span' );
		note.id = 'darling-office-geo-note';
		note.style.cssText = 'font-size:.85em;opacity:.75';

		row.appendChild( btn );
		row.appendChild( note );
		sel.parentNode.insertBefore( row, sel.nextSibling );
		return row;
	}

	function locate( input, sel ) {
		if ( geoBusy ) { return; }
		if ( ! navigator.geolocation ) { geoNote( CFG.i18n.denied ); return; }
		geoBusy = true;
		geoNote( CFG.i18n.locating );
		navigator.geolocation.getCurrentPosition( function ( pos ) {
			geoBusy = false;
			var carrier = findCarrier();
			if ( ! carrier ) { geoNote( '' ); return; }
			geo = { lat: pos.coords.latitude, lon: pos.coords.longitude, carrier: carrier, city: findCity() };
			load( input, sel, carrier, geo );
		}, function () {
			// Refused, unavailable or timed out - all the same to the customer, and all
			// recoverable, because the city list is still sitting there.
			geoBusy = false;
			geo = null;
			geoNote( CFG.i18n.denied );
		}, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 } );
	}

	/** One fetch path for both lists, so they cannot drift apart. */
	function load( input, sel, carrier, position ) {
		var url = CFG.endpoint + '?carrier=' + encodeURIComponent( carrier );
		var key;
		if ( position ) {
			// Rounded in the browser as well as on the server: a device reports a slightly
			// different position every reading, and an unrounded one would miss the cache
			// on every single request.
			var la = position.lat.toFixed( 3 ), lo = position.lon.toFixed( 3 );
			url += '&lat=' + la + '&lon=' + lo + '&radius_km=' + GEO_RADIUS_KM;
			key = carrier + '|@' + la + ',' + lo;
		} else {
			url += '&city=' + encodeURIComponent( findCity() );
			key = carrier + '|' + findCity();
		}
		lastKey = key;
		if ( cache[ key ] ) {
			fill( sel, cache[ key ], input.value.trim(), carrier );
			afterFill( position, cache[ key ] );
			return;
		}
		sel.innerHTML = '<option value="">' + CFG.i18n.loading + '</option>';
		fetch( url )
			.then( function ( r ) { return r.json(); } )
			.then( function ( d ) {
				var offices = ( d && d.offices ) || [];
				cache[ key ] = offices;
				fill( sel, offices, input.value.trim(), carrier );
				afterFill( position, offices );
			} )
			.catch( function () {
				// Fail visibly, and leave the typed input usable.
				sel.innerHTML = '<option value="">' + CFG.i18n.error + '</option>';
				lastKey = '';
				geo = null;
				afterFill( null, [] );
			} );
	}

	function afterFill( position, offices ) {
		var btn = document.getElementById( 'darling-office-geo-btn' );
		if ( btn ) {
			btn.textContent = position ? ( CFG.i18n.backCity || '' ) : ( CFG.i18n.near || '' );
		}
		geoNote( position && ! offices.length ? CFG.i18n.none : '' );
	}

	function refresh() {
		var input = findOfficeInput();
		if ( ! input ) { return; }

		if ( ! officeModeChosen() ) {
			var stale = document.getElementById( 'darling-office-select' );
			if ( stale ) { stale.remove(); }
			var staleGeo = document.getElementById( 'darling-office-geo' );
			if ( staleGeo ) { staleGeo.remove(); }
			geo = null;
			return;
		}

		var city = findCity();
		var carrier = findCarrier();
		if ( ! carrier ) { return; }

		var sel = ensureSelect( input );
		ensureGeoRow( sel );

		// A nearest-first list SURVIVES the re-renders block checkout does constantly.
		// Only a change of carrier or of typed settlement drops back to the city list -
		// otherwise the customer's search would be wiped by an unrelated DOM update.
		if ( geo ) {
			if ( geo.carrier === carrier && geo.city === city ) { return; }
			geo = null;
		}

		if ( ! city ) {
			// No settlement typed yet: offer the position search rather than an empty
			// list that reads as "there is nothing near you".
			if ( ! sel.options.length ) {
				sel.innerHTML = '<option value="">' + ( CFG.i18n.choose || '' ) + '</option>';
			}
			return;
		}

		var key = carrier + '|' + city;
		if ( key === lastKey && sel.options.length > 1 ) { return; }
		load( input, sel, carrier, null );
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
