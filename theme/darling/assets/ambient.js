/**
 * Ambient background stars.
 *
 * src/patterns/ambient.css defines the look - `.d-ambient i` animates `d-star`
 * with `forwards`, driven by two custom properties the element must carry:
 *
 * It used to say `.darling-ambient i` and `darling-amb`, and those lived in the
 * ported stylesheet. That sheet was archived on 2026-08-10 and this file went on
 * emitting the legacy class, so eight sparkle CHARACTERS appeared in a static
 * band above the header. The keyframe, the --peak contract and the a11y opt-out
 * were all already in src/ under the d- name, waiting.
 *
 *   --dur   how long one star's fade-in/rotate/fade-out takes
 *   --peak  its maximum opacity at the midpoint
 *
 * `forwards` means each star animates ONCE and then stops, so something has to
 * keep creating them. That is this file. The CSS is the contract; this only
 * supplies elements that satisfy it.
 *
 * DENSITY, NOT A COUNT (slice D1, 2026-08-06)
 * -------------------------------------------
 * The previous fixed cap of 72 was set from the Shopify site's steady state and
 * applied identically to a 390px phone and a 1920px monitor — which is why it
 * read as screen dirt on small screens and as nothing much on large ones. The
 * budget is now derived from the visible AREA, so the *density* is constant and
 * the count follows the screen:
 *
 *   390×844   →  3      768×1024 →  6      1440×900  → 10
 *   430×932   →  3     1280×800  →  8      1920×1080 → 14
 *
 * It halves on devices that report four cores or under 4GB of memory, and it is
 * zero — not reduced, zero — when the OS asks for less motion. The spawn
 * interval stretches as the count falls, so a sparse sky does not pulse in
 * unison. Recomputed on resize and orientation change, debounced.
 */
( function () {
	'use strict';

	var GLYPHS   = [ '✦', '✧' ];
	var AREA_PER = 130000;  // px² of viewport per star — the density constant
	var FLOOR    = 3;
	var CEIL     = 14;

	var layer, timer, resizeTimer;
	var budget = { max: 0, interval: 1200 };

	function motionOK() {
		try {
			return ! window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
		} catch ( e ) {
			return true;
		}
	}

	// THE MONEY PATH IS STILL. Measured on the live checkout: the sparkle layer was
	// animating there too (`darling-amb 9.54s`, one animation per star, forever). A
	// customer entering an address and choosing a courier does not need decoration
	// moving in their peripheral vision, and a page whose job is a transaction should
	// not spend frames on atmosphere. Cart and checkout opt out entirely.
	function transactional() {
		var c = document.body ? document.body.className : '';
		return /woocommerce-checkout|woocommerce-cart|woocommerce-order-received/.test( c );
	}

	// Coarse, deliberately pessimistic: both properties are absent on Safari and
	// Firefox, and the fallbacks assume a capable device rather than punishing
	// browsers that decline to fingerprint themselves.
	function leanDevice() {
		var cores = navigator.hardwareConcurrency || 8;
		var mem   = navigator.deviceMemory || 8;
		return cores <= 4 || mem < 4;
	}

	function measure() {
		if ( ! motionOK() || transactional() ) {
			return { max: 0, interval: 0 };
		}
		var area = ( window.innerWidth || 1280 ) * ( window.innerHeight || 800 );
		var n    = Math.round( area / AREA_PER );

		n = Math.max( FLOOR, Math.min( CEIL, n ) );
		if ( leanDevice() ) { n = Math.max( 2, Math.round( n / 2 ) ); }

		// Fewer stars need a slower cadence, or the whole sky blinks together.
		return { max: n, interval: Math.round( 1100 + ( CEIL - n ) * 90 ) };
	}

	// THE RANGE IS A TOKEN, NOT A NUMBER IN THIS FILE. tokens/motion.css declares
	//   --star-life-min: 1.6s;  --star-life-max: 11s;
	// with the note "A RANGE, not a value. Most linger; the occasional one is a
	// quick twinkle... Weighted long: roughly three in four should sit above 6s."
	// This used to be a hardcoded 6 + rand*7, which is the wrong RANGE and a flat
	// distribution - no quick twinkles at all, and the sky read as uniform. Read
	// the tokens off the layer so the stylesheet stays the source of truth; fall
	// back only if the stylesheet is not there at all.
	function secs( name, fallback ) {
		if ( ! layer ) { return fallback; }
		var v = parseFloat( getComputedStyle( layer ).getPropertyValue( name ) );
		return isNaN( v ) || v <= 0 ? fallback : v;
	}
	function starLife() {
		var lo = secs( '--star-life-min', 1.6 );
		var hi = secs( '--star-life-max', 11 );
		// pow < 1 biases toward the top of the range: with 0.35, about three in
		// four land above the 6s mark, which is the weighting the token asks for.
		var t = Math.pow( Math.random(), 0.35 );
		return ( lo + t * ( hi - lo ) ).toFixed( 2 ) + 's';
	}

	function spawn() {
		if ( ! layer || ! budget.max || layer.childElementCount >= budget.max ) { return; }

		var i   = document.createElement( 'i' );
		var dur = starLife();

		i.textContent = GLYPHS[ ( Math.random() * GLYPHS.length ) | 0 ];
		i.style.setProperty( '--dur', dur );
		i.style.setProperty( '--peak', ( 0.25 + Math.random() * 0.45 ).toFixed( 2 ) );
		// Inset from the edges: a star at 99% left overflowed the viewport and was
		// counted as a real layout defect by the audit harness.
		i.style.left     = ( 2 + Math.random() * 94 ).toFixed( 2 ) + '%';
		i.style.top      = ( 2 + Math.random() * 94 ).toFixed( 2 ) + '%';
		i.style.fontSize = ( 8 + Math.random() * 14 ).toFixed( 1 ) + 'px';

		// Remove on the animation's own end event rather than a matching setTimeout,
		// so a backgrounded tab (where animations pause but timers do not) cannot
		// delete a star that is still mid-fade.
		i.addEventListener( 'animationend', function () {
			if ( i.parentNode ) { i.parentNode.removeChild( i ); }
		} );

		layer.appendChild( i );
	}

	function tick() {
		if ( ! document.hidden ) { spawn(); }
		timer = window.setTimeout( tick, budget.interval + ( Math.random() * 700 - 350 ) );
	}

	function trim() {
		while ( layer && layer.childElementCount > budget.max ) {
			layer.removeChild( layer.lastElementChild );
		}
	}

	function recalc() {
		budget = measure();
		if ( ! layer ) { return; }
		trim();
		if ( ! budget.max ) {
			layer.innerHTML = '';
			if ( timer ) { window.clearTimeout( timer ); timer = null; }
		} else if ( ! timer ) {
			tick();
		}
	}

	function start() {
		budget = measure();
		if ( ! budget.max ) { return; }

		layer = document.createElement( 'div' );
		layer.className = 'd-ambient';
		layer.setAttribute( 'aria-hidden', 'true' );
		// FIRST child, not last: DOM order should agree with paint order, so the
		// layer reads as a background rather than something laid over the page.
		document.body.insertBefore( layer, document.body.firstChild );

		// Seed roughly half the budget so the sky is never empty on arrival but
		// still fills in rather than appearing all at once.
		for ( var n = 0; n < Math.ceil( budget.max / 2 ); n++ ) { spawn(); }
		tick();

		window.addEventListener( 'resize', function () {
			window.clearTimeout( resizeTimer );
			resizeTimer = window.setTimeout( recalc, 200 );
		} );
		window.addEventListener( 'orientationchange', function () {
			window.setTimeout( recalc, 300 );
		} );
		try {
			window.matchMedia( '(prefers-reduced-motion: reduce)' )
				.addEventListener( 'change', recalc );
		} catch ( e ) {}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', start );
	} else {
		start();
	}
} )();
