/**
 * Ambient background stars.
 *
 * The ported stylesheet defines the look — `.darling-ambient i` animates
 * `darling-amb` with `forwards`, driven by two custom properties the element must
 * carry:
 *
 *   --dur   how long one star's fade-in/rotate/fade-out takes
 *   --peak  its maximum opacity at the midpoint
 *
 * `forwards` means each star animates ONCE and then stops, so something has to
 * keep creating them. That is this file. The CSS is the contract; this only
 * supplies elements that satisfy it.
 *
 * Deliberately capped and self-cleaning: an ambient effect that slowly
 * accumulates DOM nodes turns into a memory leak on a long browsing session, and
 * the symptom (a tab getting slower over ten minutes) is very hard to trace back
 * to decoration.
 */
( function () {
	'use strict';

	var GLYPHS = [ '✦', '✧' ];
	var MAX    = 72;          // concurrent stars - matched to the live site (~70 at steady state)
	var layer;

	// Honour the OS-level motion preference. Decoration is exactly the thing that
	// should disappear for someone who asked for less movement.
	function motionOK() {
		try {
			return ! window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
		} catch ( e ) {
			return true;
		}
	}

	function spawn() {
		if ( ! layer || layer.childElementCount >= MAX ) { return; }

		var i   = document.createElement( 'i' );
		var dur = ( 6 + Math.random() * 7 ).toFixed( 2 ) + 's';

		i.textContent = GLYPHS[ ( Math.random() * GLYPHS.length ) | 0 ];
		i.style.setProperty( '--dur', dur );
		i.style.setProperty( '--peak', ( 0.25 + Math.random() * 0.45 ).toFixed( 2 ) );
		i.style.left     = ( Math.random() * 100 ).toFixed( 2 ) + '%';
		i.style.top      = ( Math.random() * 100 ).toFixed( 2 ) + '%';
		i.style.fontSize = ( 8 + Math.random() * 14 ).toFixed( 1 ) + 'px';

		// Remove on the animation's own end event rather than a matching setTimeout,
		// so a backgrounded tab (where animations pause but timers do not) cannot
		// delete a star that is still mid-fade.
		i.addEventListener( 'animationend', function () {
			if ( i.parentNode ) { i.parentNode.removeChild( i ); }
		} );

		layer.appendChild( i );
	}

	function start() {
		if ( ! motionOK() ) { return; }

		layer = document.createElement( 'div' );
		layer.className = 'darling-ambient';
		layer.setAttribute( 'aria-hidden', 'true' );
		document.body.appendChild( layer );

		for ( var n = 0; n < 24; n++ ) { spawn(); }

		setInterval( function () {
			// Pause while the tab is hidden: animating an invisible page is pure
			// battery cost on a phone.
			if ( document.hidden ) { return; }
			spawn();
		}, 160 );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', start );
	} else {
		start();
	}
} )();
