/**
 * Category carousel controls.
 *
 * *** THIS SCRIPT SPOKE A VOCABULARY THE MARKUP NO LONGER USES. *** Until
 * 2026-08-10 it looked for `.darling-catsv2` and `.darling-catsv2__row` and
 * built `.darling-carousel-btn` - all three legacy names. The template emits
 * `.d-carousel` / `.d-carousel__row`, so init() found nothing, built nothing,
 * and the owner reported "the carousel is missing its buttons". Nothing errored:
 * a querySelectorAll that matches nothing is a successful call.
 *
 * The CSS was ported to the d- names and the JavaScript was not. Same shape as
 * ambient.js, which was still writing class="darling-ambient" the day its
 * stylesheet was archived.
 *
 * The row is a native overflow-x scroller. This adds prev/next buttons and hides the
 * native scrollbar (CSS side lives in src/patterns/catalogue.css).
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


	function build( section ) {
		var row = section.querySelector( '.d-carousel__row' );
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
			b.className = 'd-carousel__btn d-carousel__btn--' + direction;
			b.setAttribute( 'aria-label', label );
			// The icon set has both chevrons, so the 'next' one is not the 'prev' one
			// rotated. A rotated glyph and a drawn one are not the same shape at 1px.
			b.innerHTML = '<span class="d-icon d-icon--chevron-' +
				( 'prev' === direction ? 'left' : 'right' ) + '" aria-hidden="true"></span>';
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
		var sections = document.querySelectorAll( '.d-carousel' );
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
