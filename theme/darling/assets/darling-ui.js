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

   4. TAB UNDERLINE GEOMETRY.  Tab widths depend on their text, so unlike the
      paginator there is no cell size to multiply an index by. CSS cannot
      measure a box. Without this the strip is still a correct tab strip, with a
      static underline on the selected tab and no travel.

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

	/* 4. THE EVENT MARKS. The icons only move when something happens, so
	      something has to tell them. WooCommerce already announces both of
	      these; we translate the announcement into an attribute the stylesheet
	      can see, and take it away again so the animation can re-fire.

	      This is the whole reason .d-icon--cart's wheels are event-driven
	      rather than idle: an interface where six small things move at once is
	      not lively, it is noisy. */
	function bump(el, attr, ms) {
		if (!el) return;
		el.removeAttribute(attr);
		void el.offsetWidth;          /* forces a reflow so the animation restarts */
		el.setAttribute(attr, '');
		setTimeout(function () { el.removeAttribute(attr); }, ms);
	}

	function cartEvents() {
		var fire = function () {
			document.querySelectorAll('.d-icon-btn:has(.d-icon--cart), [data-cart-button]')
				.forEach(function (b) { bump(b, 'data-added', 900); });
		};
		/* classic AJAX add-to-cart */
		document.body.addEventListener('added_to_cart', fire);
		/* the block store */
		document.body.addEventListener('wc-blocks_added_to_cart', fire);
		/* and our own, for anything that is neither */
		document.body.addEventListener('darling:added', fire);
		if (window.jQuery) window.jQuery(document.body).on('added_to_cart', fire);
	}

	/* 5. THE FREE-SHIPPING BAR. --pr is a number 0..1 and data-reached is the
	      threshold being crossed - which is also what starts the truck. Reads
	      the numbers off data attributes so the same component works in the
	      drawer, on the cart page and in a banner. */
	function progress(el) {
		var goal = parseFloat(el.dataset.goal);
		var now = parseFloat(el.dataset.value);
		if (isNaN(goal) || isNaN(now) || goal <= 0) return;
		var t = Math.max(0, Math.min(1, now / goal));
		el.style.setProperty('--pr', t);
		var was = el.hasAttribute('data-reached');
		if (t >= 1) {
			if (!was) bump(el, 'data-reached', 4000);
			el.setAttribute('data-reached', '');
		} else {
			el.removeAttribute('data-reached');
		}
	}

	/* 6. LIGHT DISMISS. A <dialog> does not close when you click outside it -
	      the backdrop is a pseudo-element and takes no events of its own. The
	      HTML `closedby="any"` attribute does exactly this natively and is
	      Chrome 134+; where it is supported we set it and do nothing else, and
	      where it is not we fall back to hit-testing the click against the
	      dialog's own box. Comparing e.target to the dialog is NOT enough on
	      its own: a click on the dialog's padding also targets the dialog. */
	function lightDismiss(dlg) {
		if ('closedBy' in HTMLDialogElement.prototype) { dlg.setAttribute('closedby', 'any'); return; }
		dlg.addEventListener('click', function (e) {
			if (e.target !== dlg) return;
			var r = dlg.getBoundingClientRect();
			var inside = e.clientX >= r.left && e.clientX <= r.right &&
			             e.clientY >= r.top && e.clientY <= r.bottom;
			if (!inside) dlg.close();
		});
	}

	/* 7. THE WIPE. The x sweeps the field and takes the text with it. CSS drives
	      the whole animation off --wipe; the only things it cannot do are
	      measure how far the button has to travel and empty the input at the
	      end, so that is all this does. */
	function wipe(wrap) {
		var input = wrap.querySelector('.d-wipe__input');
		var clear = wrap.querySelector('.d-wipe__clear');
		if (!input || !clear) return;
		clear.addEventListener('click', function () {
			if (!input.value) return;
			var travel = wrap.clientWidth - clear.offsetWidth - 12;
			wrap.style.setProperty('--wipe-travel', travel + 'px');
			wrap.setAttribute('data-wiping', '');

			/* The sweep is now an ANIMATION that goes out and back, so there
			   are two moments, not one: the text is emptied at the far end of
			   the stroke (42% of 1.9s) and the attribute comes off when the
			   button is home. Clearing at the end would have the field still
			   showing text on the return leg; clearing at the start would have
			   the x wiping nothing. */
			setTimeout(function () {
				input.value = '';
				input.dispatchEvent(new Event('input', { bubbles: true }));
			}, 830);
			var end = function () {
				wrap.removeAttribute('data-wiping');
				wrap.style.removeProperty('--wipe-travel');
			};
			var fired = false;
			wrap.addEventListener('animationend', function h(e) {
				if (e.animationName !== 'd-wipe-sweep' || fired) return;
				fired = true; wrap.removeEventListener('animationend', h); end();
			});
			setTimeout(function () { if (!fired) { fired = true; end(); } }, 2200);
		});
	}

	/* 8. THE TABS. The underline travels; CSS does the travelling. All this
	      does is measure, because CSS cannot: tab widths depend on their text,
	      so there is no cell size to multiply an index by the way the paginator
	      does. Two custom properties - --tab-x and --tab-w - and the two bars
	      transition them on two different clocks.

	      It also adds .d-tabs-live. Until that class is on, the CSS draws NO
	      travelling bar at all and the active tab carries a plain static
	      underline instead, so a page whose script failed to load still has a
	      correct tab strip - just a still one. The class is what says "something
	      is driving this now".

	      Woo's own tabs script toggles .active on the LI and does not fire an
	      event, so the click is watched directly. requestAnimationFrame, not an
	      immediate read: on the click that switches tabs, .active has not moved
	      yet at the moment the handler runs, and measuring then measures the tab
	      we are leaving. */
	function tabs(wrap) {
		var list = wrap.querySelector('ul.tabs, .d-tabs__list');
		if (!list) return;

		function measure() {
			var on = list.querySelector('li.active > a, [aria-selected="true"]');
			if (!on) { wrap.classList.remove('d-tabs-live'); return; }
			var li = on.closest('li') || on;
			/* offsetLeft is relative to the nearest positioned ancestor, and the
			   list is position:relative, so this is already in the list's own
			   coordinates - which is the space the bars are positioned in. */
			wrap.style.setProperty('--tab-x', li.offsetLeft + 'px');
			wrap.style.setProperty('--tab-w', li.offsetWidth + 'px');
			wrap.classList.add('d-tabs-live');
		}

		/* First measurement with no transition, or the underline slides in from
		   the left edge on every page load, which reads as a page still
		   settling rather than a tab being chosen. */
		list.style.transition = 'none';
		measure();
		requestAnimationFrame(function () { list.style.removeProperty('transition'); });

		list.addEventListener('click', function (e) {
			if (!e.target.closest('a')) return;
			requestAnimationFrame(function () { requestAnimationFrame(measure); });
		});
		list.addEventListener('keyup', function (e) {
			if (e.key === 'Enter' || e.key === ' ') requestAnimationFrame(measure);
		});

		/* A tab strip wraps to two rows on a narrow viewport, and a wrapped tab
		   is somewhere else entirely. ResizeObserver rather than a window resize
		   listener, because the strip also changes width when a sidebar opens
		   and the window does not. */
		if (window.ResizeObserver) new ResizeObserver(measure).observe(list);

		/* Fonts land after first paint and every tab changes width when they do.
		   One late re-measure is cheaper than living with a bar that is a few
		   pixels wrong until the next click. */
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
	}

	/* 9. THE CLICK BURST. Hover is a transition and has a there and a back; a
	      click has no back - the thing happened. So the pop is an ANIMATION, and
	      an animation has to be re-triggered, which is the one thing CSS cannot
	      do on its own. bump() removes the attribute, forces a reflow and puts
	      it back, so a second click restarts it instead of being ignored.

	      Opt-in by class: a burst that fired on every click of anything
	      containing stars would fire on the season banner's link too, where the
	      stars are a hover effect and popping them is wrong. */
	function burstHost(el) {
		var burst = el.querySelector('.d-burst');
		if (!burst) return;
		/* 1700, not 900: the pop is 1.5s plus up to 110ms of stagger, and bump
		   takes the attribute off after its timeout - so 900 cut the animation
		   in half, mid-flight, with the stars still visible. The timeout has to
		   outlast the longest star. */
		el.addEventListener('click', function () { bump(burst, 'data-pop', 1700); });
	}

	function init(root) {
		(root || document).querySelectorAll('.d-slider__input').forEach(function (el) {
			if (!el.dataset.dInit) { el.dataset.dInit = '1'; slider(el); }
		});
		(root || document).querySelectorAll('.d-scrollframe').forEach(function (el) {
			if (!el.dataset.dInit) { el.dataset.dInit = '1'; scroller(el); }
		});
		(root || document).querySelectorAll('.d-progress[data-goal]').forEach(progress);
		(root || document).querySelectorAll('dialog.d-drawer').forEach(function (el) {
			if (!el.dataset.dDismiss) { el.dataset.dDismiss = '1'; lightDismiss(el); }
		});
		(root || document).querySelectorAll('.d-wipe').forEach(function (el) {
			if (!el.dataset.dWipe) { el.dataset.dWipe = '1'; wipe(el); }
		});
		(root || document).querySelectorAll('.woocommerce-tabs, .d-tabs').forEach(function (el) {
			if (!el.dataset.dTabs) { el.dataset.dTabs = '1'; tabs(el); }
		});
		(root || document).querySelectorAll('.d-burst-host').forEach(function (el) {
			if (!el.dataset.dBurst) { el.dataset.dBurst = '1'; burstHost(el); }
		});
	}

	cartEvents();

	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', function () { init(); });
	else init();

	/* WooCommerce blocks mount late and re-render; anything we styled can appear
	   after we ran. Cheap to re-scan, and init is idempotent. */
	document.addEventListener('wc-blocks_render_blocks_frontend', function () { init(); });
	window.dInitDarlingUI = init;
})();