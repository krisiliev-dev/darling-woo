/* =============================================================================
   darling-ui.js  -  the only script the design system has, and it is small on
   purpose.

   THREE JOBS, and every one of them exists because CSS provably cannot do it.
   Nothing here styles anything; it publishes numbers that the stylesheet reads.

   1. SLIDER FILL AND WAKE.  CSS cannot read an input's value. Chrome 141 - the
      version we target - does NOT support appearance:base on input[type=range]
      or ::slider-fill (probed, not assumed), so the filled part of the track
      has to be painted from a custom property. Firefox does not need this: it
      has ::-moz-range-progress. Without this script the slider still works
      completely; the fill reads empty and the wake never appears.

   2. SCROLLBAR LENGTH.  A thumb should be viewport/content long. CSS cannot see
      scrollHeight. Without this the thumb is a default length and still tracks
      the position exactly, because the POSITION comes from a scroll timeline
      and needs no script at all.

   3. THE CLOCK.  A scroll timeline is a position, not a clock: it knows exactly
      where you are and has no memory of where you were. Velocity - and so a
      trail - needs a clock. Publishing --sc-pos gives the stylesheet something
      to transition, and --sc-lag falls out of that.

   Plus dragging, which is not a CSS gap but an OS one: a native scrollbar thumb
   is draggable because the operating system draws it. Ours is a div.

   No dependencies, no build step, idempotent, safe to run twice.
   ========================================================================== */
(function () {
	'use strict';

	function slider(input) {
		var wrap = input.closest('.d-slider') || input.parentNode;
		function publish() {
			var a = parseFloat(input.min) || 0;
			var b = parseFloat(input.max);
			if (isNaN(b)) b = 100;
			var t = b === a ? 0 : (parseFloat(input.value) - a) / (b - a);
			wrap.style.setProperty('--val', t);
		}
		publish();
		input.addEventListener('input', publish);
		/* A form reset does not fire input. */
		if (input.form) input.form.addEventListener('reset', function () { setTimeout(publish, 0); });
	}

	function scroller(frame) {
		var sc = frame.querySelector(':scope > .d-scroll');
		var rail = frame.querySelector('.d-scrollframe__rail');
		var thumb = frame.querySelector('.d-scrollframe__thumb');
		if (!sc) return;

		function publish() {
			var max = sc.scrollHeight - sc.clientHeight;
			frame.style.setProperty('--sc-pos', max > 0 ? sc.scrollTop / max : 0);
			/* Floored, because a thumb shorter than its own width is not a
			   grabbable target on a phone. */
			frame.style.setProperty('--sc-ratio',
				Math.max(0.12, Math.min(1, sc.clientHeight / sc.scrollHeight)));
			frame.toggleAttribute('data-noscroll', max <= 0);
		}
		publish();
		sc.addEventListener('scroll', publish, { passive: true });
		if (window.ResizeObserver) {
			/* Content can change height without anyone scrolling - a panel opens,
			   an image loads. Without this the thumb is the right length only
			   until the first thing changes. */
			var ro = new ResizeObserver(publish);
			ro.observe(sc);
			if (sc.firstElementChild) ro.observe(sc.firstElementChild);
		}

		if (!thumb || !rail) return;
		/* Dragging. The thumb is never moved directly - we set scrollTop and let
		   the scroll timeline put the thumb where it belongs, so there is exactly
		   one source of truth for the position and nothing to desynchronise. */
		var startY = 0, startTop = 0;
		function down(e) {
			startY = e.clientY;
			startTop = sc.scrollTop;
			frame.setAttribute('data-dragging', '');
			thumb.setPointerCapture(e.pointerId);
			e.preventDefault();
		}
		function move(e) {
			if (!frame.hasAttribute('data-dragging')) return;
			var travel = rail.clientHeight - thumb.offsetHeight;
			if (travel <= 0) return;
			var max = sc.scrollHeight - sc.clientHeight;
			sc.scrollTop = startTop + (e.clientY - startY) * (max / travel);
		}
		function up(e) {
			frame.removeAttribute('data-dragging');
			if (thumb.hasPointerCapture && thumb.hasPointerCapture(e.pointerId))
				thumb.releasePointerCapture(e.pointerId);
		}
		thumb.addEventListener('pointerdown', down);
		thumb.addEventListener('pointermove', move);
		thumb.addEventListener('pointerup', up);
		thumb.addEventListener('pointercancel', up);
		/* Clicking the rail pages towards the click, the way a real one does. */
		rail.addEventListener('pointerdown', function (e) {
			if (e.target === thumb) return;
			var r = rail.getBoundingClientRect();
			sc.scrollBy({ top: (e.clientY < thumb.getBoundingClientRect().top
				? -1 : 1) * sc.clientHeight * 0.9, behavior: 'smooth' });
			void r;
		});
	}

	function init(root) {
		(root || document).querySelectorAll('.d-slider__input').forEach(function (el) {
			if (!el.dataset.dInit) { el.dataset.dInit = '1'; slider(el); }
		});
		(root || document).querySelectorAll('.d-scrollframe').forEach(function (el) {
			if (!el.dataset.dInit) { el.dataset.dInit = '1'; scroller(el); }
		});
	}

	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', function () { init(); });
	else init();

	/* WooCommerce blocks mount late and re-render; anything we styled can appear
	   after we ran. Cheap to re-scan, and init is idempotent. */
	document.addEventListener('wc-blocks_render_blocks_frontend', function () { init(); });
	window.dInitDarlingUI = init;
})();