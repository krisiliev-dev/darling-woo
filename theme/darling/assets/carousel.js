/**
 * Category carousel controls.
 *
 * The row is a native overflow-x scroller. This adds prev/next buttons and hides the
 * native scrollbar (CSS side lives in style.css).
 *
 * MEASURED CONSTRAINT, do not "improve" this into breaking:
 * scrollBy({behavior:'smooth'}) could NOT be verified against this row, because the row
 * carries `scroll-snap-type: x mandatory` and every harness available here runs the page in
 * a BACKGROUND tab, where no frame is ever produced and smooth scrolling therefore never
 * advances. behavior:'auto' is synchronous, is measured to work, and lands cleanly because
 * the snap points do the easing for us. If smooth is ever wanted, it must be gated in a
 * VISIBLE browser first.
 */
( function () {
	'use strict';

	var ARROW =
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
		'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
		'<path d="M15 5l-7 7 7 7"/></svg>';

	function build( section ) {
		var row = section.querySelector( '.darling-catsv2__row' );
		if ( ! row || row.children.length < 2 ) {
			return;
		}

		// Pitch is measured from the DOM rather than assumed from the CSS clamp().
		var pitch = row.children[ 1 ].offsetLeft - row.children[ 0 ].offsetLeft;
		if ( ! pitch || pitch < 1 ) {
			return;
		}

		function makeButton( direction, label, flip ) {
			var b = document.createElement( 'button' );
			b.type = 'button';
			b.className = 'darling-carousel-btn darling-carousel-btn--' + direction;
			b.setAttribute( 'aria-label', label );
			b.innerHTML = ARROW;
			if ( flip ) {
				b.firstChild.style.transform = 'rotate(180deg)';
			}
			b.addEventListener( 'click', function () {
				var steps = Math.max( 1, Math.floor( ( row.clientWidth * 0.8 ) / pitch ) );
				row.scrollBy( {
					left: ( 'prev' === direction ? -1 : 1 ) * steps * pitch,
					behavior: 'auto'
				} );
				sync();
			} );
			return b;
		}

		var prev = makeButton( 'prev', 'Предишни категории', false );
		var next = makeButton( 'next', 'Следващи категории', true );

		function sync() {
			var max = row.scrollWidth - row.clientWidth;
			var overflows = max > 4;
			prev.hidden = ! overflows;
			next.hidden = ! overflows;
			prev.disabled = row.scrollLeft <= 1;
			next.disabled = row.scrollLeft >= max - 1;
		}

		section.appendChild( prev );
		section.appendChild( next );

		// scroll fires on real user scrolling; sync() is also called straight after a click
		// so the buttons are correct even where scroll events are not being dispatched.
		row.addEventListener( 'scroll', sync, { passive: true } );
		window.addEventListener( 'resize', sync, { passive: true } );
		sync();
	}

	function init() {
		var sections = document.querySelectorAll( '.darling-catsv2' );
		for ( var i = 0; i < sections.length; i++ ) {
			build( sections[ i ] );
		}
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
