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
	/* *** A STYLESHEET CANNOT PREVENT DOM. ***
	   The burst is nine <i> elements this script creates. Accessibility mode and
	   reduced motion both say `animation:none !important`, which does not stop
	   them being made - it makes them appear, hold still around the button for
	   1.5s and vanish. The owner saw exactly that and read it as the animation
	   surviving the switch. The guard has to be here, because here is the only
	   place that knows the elements are about to exist.
	   Read at fire time, not at init: the switch can be flipped mid-session. */
	function plainMode() {
		return document.documentElement.classList.contains('d-a11y')
			|| (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	}

	function burstHost(el) {
		var burst = el.querySelector('.d-burst');
		if (!burst) return;
		/* 1700, not 900: the pop is 1.5s plus up to 110ms of stagger, and bump
		   takes the attribute off after its timeout - so 900 cut the animation
		   in half, mid-flight, with the stars still visible. The timeout has to
		   outlast the longest star. */
		el.addEventListener('click', function (e) {
			/* Where the finger landed, in the host's own coordinates.
			   *** A KEYBOARD ACTIVATION HAS NO COORDINATES. *** Enter on a
			   focused button fires a click with clientX/clientY of 0 and
			   detail 0. Taking those at face value would throw every keyboard
			   user's stars from the top-left corner of the viewport, so when
			   there is no pointer the origin stays at the centre. */
			if (e.detail > 0) {
				var r = el.getBoundingClientRect();
				burst.style.setProperty('--burst-x', (e.clientX - r.left) + 'px');
				burst.style.setProperty('--burst-y', (e.clientY - r.top) + 'px');
			} else {
				burst.style.removeProperty('--burst-x');
				burst.style.removeProperty('--burst-y');
			}
			if (plainMode()) { return; }
			bump(burst, 'data-pop', 1700);
		});
	}

	/* 5. LIGHT DISMISS FOR WooCommerce'S FILTER OVERLAY.
	      Our drawers close when you click beside them; this one did not, and the
	      owner asked for the two to behave the same. It is not a <dialog>, so
	      there is no ::backdrop and no light-dismiss to switch on - the scrim is
	      the overlay element itself and the panel is a child of it.

	      *** IT CLICKS THEIR OWN CLOSE BUTTON RATHER THAN TOUCHING THEIR STATE. ***
	      The open flag belongs to WooCommerce's Interactivity runtime. Setting or
	      removing `.is-overlay-opened` ourselves would make us a second source of
	      truth for whether a dialog is open, and the first thing that breaks is
	      focus: their close handler restores it to the trigger and ours would
	      not. Activating their control means everything they do on close - now
	      and after the next plugin update - still happens. */
	function filterDismiss(block) {
		var overlay = block.querySelector('.wc-block-product-filters__overlay');
		var dialog = block.querySelector('.wc-block-product-filters__overlay-dialog');
		var close = block.querySelector('.wc-block-product-filters__close-overlay');
		if (!overlay || !dialog || !close) { return; }
		overlay.addEventListener('click', function (e) {
			if (!block.classList.contains('is-overlay-opened')) { return; }
			/* *** BOTH HALVES, AND THE FIRST ONE IS THE ONE THAT MATTERS. ***
			   A click fires on the nearest common ancestor of press and release,
			   so pressing a price handle INSIDE the panel and releasing on the
			   scrim arrives here with e.target === the overlay - outside the
			   dialog by every test this handler can make on the event alone. The
			   pointerdown below is what remembers where the gesture began.
			   Without it you drag a slider, overshoot, and the panel you were
			   adjusting shuts. */
			if (dialog.contains(e.target)) { return; }
			if (overlay.dataset.dOutside !== '1') { return; }
			close.click();
		});
		overlay.addEventListener('pointerdown', function (e) {
			overlay.dataset.dOutside = dialog.contains(e.target) ? '' : '1';
		});
	}

	/* 6. THE COUPON IS A FIELD, NOT A DISCLOSURE.
	      One input behind a chevron, in a sidebar with room for it. The owner is
	      right that it should just be there - but CSS alone cannot do it, because
	      the closed markup is a heading and an icon and NOTHING ELSE. WooCommerce
	      builds the input when the panel opens, so there is no field to reveal.

	      *** SO WE PRESS THEIR BUTTON, ONCE, AND THEN HIDE IT. *** Same rule as
	      the filter overlay: their control, their runtime, their state. If this
	      script never runs, the coupon is still a working disclosure - which is
	      the right way for it to fail.

	      Focus goes back where it was. Their handler focuses the input it has
	      just created, and nobody asked to be typing a discount code the moment
	      the page loaded. */
	function couponOpen(panel) {
		var btn = panel.querySelector('.wc-block-components-panel__button');
		if (!btn) { return; }
		/* *** THE GUARD IS ON THE ELEMENT, NOT ON THIS MODULE. *** A one-shot
		   flag opened it once and then let WooCommerce's next re-render put the
		   chevron back - measured: open at 1240px, closed again after a resize
		   re-rendered the sidebar. A replaced node arrives without the
		   attribute and gets opened again, and an already-open one only has the
		   attribute re-set, so there is no loop. */
		/* *** GIVING FOCUS BACK ON THE SAME TICK GAVE IT BACK TOO EARLY. ***
		   Woo focuses the coupon input from a React effect, which runs after
		   this function has already returned - so the synchronous restore below
		   was undone a frame later and every screenshot of the checkout showed
		   the discount field wearing its focus ring, reading as an error.
		   Measured: `document.activeElement === the coupon input`, and the label
		   painted in --action, on a page nobody had touched.

		   So the restore is repeated across the frames their effect can land in,
		   and it only fires while focus is still inside this panel: the moment
		   the customer clicks the field themselves, focus is theirs and we stop
		   taking it. */
		if (btn.getAttribute('aria-expanded') !== 'true') {
			var was = document.activeElement;
			var give = function () {
				var a = document.activeElement;
				if (!a || !panel.contains(a)) { return; }
				if (was && was.focus && was !== document.body && !panel.contains(was)) { was.focus(); }
				else if (a.blur) { a.blur(); }
			};
			btn.click();
			give();
			requestAnimationFrame(function () { give(); requestAnimationFrame(give); });
			setTimeout(give, 60);
			setTimeout(give, 240);
		}
		/* The attribute is what the stylesheet waits for, so the button only
		   disappears once it has actually been pressed. */
		panel.setAttribute('data-d-coupon-open', '');
	}

	/* 7. A WAY OUT OF GUEST CHECKOUT.
	      "Поръчваш като гост." states a fact and offers nothing. The owner asked
	      for the alternative beside it, and there is no markup to hang it on - Woo
	      renders that sentence as a bare <p>. So we add one anchor.

	      *** THE BETTER FIX IS A WooCommerce SETTING, NOT THIS. *** Woo can render
	      a "create an account?" tick inside the checkout, which keeps the customer
	      in the flow instead of sending them to /my-account/ mid-order. This is
	      the version we can ship from the theme; the setting is the version that
	      should replace it. */
	function guestAccount(p) {
		if (p.querySelector('.d-guest-account')) { return; }
		var a = document.createElement('a');
		a.className = 'd-guest-account';
		a.href = '/my-account/';
		a.textContent = 'Направи си профил';
		p.appendChild(a);
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
		(root || document).querySelectorAll('.wc-block-product-filters').forEach(function (el) {
			if (!el.dataset.dInit) { el.dataset.dInit = '1'; filterDismiss(el); }
		});
		(root || document).querySelectorAll('.wc-block-components-totals-coupon').forEach(couponOpen);
		/* NOT guarded by a dataset flag - see expressState, which guards on the
		   row it is actually watching rather than on the region it was found in. */
		(root || document).querySelectorAll('.wc-block-components-express-payment').forEach(expressState);
		(root || document).querySelectorAll('.wc-block-checkout__guest-checkout-notice').forEach(guestAccount);
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


	/* 8. THE EXPRESS SLAB THAT IS SOMETIMES A TITLE AND NOTHING ELSE.
	      The owner sees "Бързо плащане" over empty space. A stylesheet cannot
	      answer it, and I wrote a stylesheet rule for it twice before measuring.

	      *** MEASURED ON THE LIVE PAGE: buttons 0, iframes 1, iframe height 56.
	      *** There is never a <button>. Stripe's express element is an iframe,
	      always, and when no wallet is available it KEEPS the iframe and
	      animates its height to zero. So the difference between "a wallet is
	      offered" and "nothing is offered" is a height, and a selector cannot
	      read a height.

	      Stripe also decides late, and then animates over 350ms, so one reading
	      at load time is a reading of the wrong moment. This watches instead:
	      a ResizeObserver for the settle, and a short poll for the browsers
	      that do not have one.

	      Writes data-d-express; the stylesheet hides what it marks. Absent
	      means the script never ran, and the CSS treats that as "live" - an
	      empty heading is a smaller failure than a wallet button nobody can
	      reach. */
	function expressState(region) {
		var row = region.querySelector('.wc-block-components-express-payment__event-buttons');
		/* *** NO BUTTON ROW AT ALL IS NOT "UNKNOWN", IT IS EMPTY. ***
		   This used to clear the attribute and fall back to the visible
		   default, and that is exactly what kept the empty slab on screen
		   through three captures after the row itself was being measured
		   correctly. The region is rendered, its content container is not
		   there, and there is nothing that could appear in it. "Absent
		   attribute means live" is for one case only: this script never ran. */
		if (!row) { region.setAttribute('data-d-express', 'empty'); return; }
		/* *** MEASURE THE THING THAT IS OR IS NOT THERE, NOT A BOX AROUND IT. ***
		   Three goes at this, each measuring one box further out and each
		   producing a byte-identical screenshot of the same empty slab:

		     the region        - always there, so useless
		     the button row    - Stripe leaves a placeholder at min-height:40px
		                         whether or not a wallet mounts, so a row of 40
		                         reads as "live" over an empty gap. THIS is the
		                         one that fooled me twice.
		     the iframe        - the actual wallet. Collapsed to 0 when there is
		                         nothing to offer, absent when nothing mounted.

		   So: a wallet is on offer when something that can be pressed has a
		   height. Buttons are included because a non-Stripe express method may
		   render a real one; today there are none, which is why the earlier
		   :has(button) rule never fired. */
		var settle = function () {
			var live = false;
			var kids = region.querySelectorAll('iframe, button');
			for (var i = 0; i < kids.length; i++) {
				if (kids[i].getBoundingClientRect().height > 24) { live = true; break; }
			}
			region.setAttribute('data-d-express', live ? 'live' : 'empty');
		};
		settle();
		if (region.dExpressRow === row) { return; }   /* already watching this row */
		region.dExpressRow = row;
		if (window.ResizeObserver) {
			new window.ResizeObserver(settle).observe(row);
		}
		var n = 0;
		var t = setInterval(function () {
			settle();
			if (++n > 24) { clearInterval(t); }
		}, 250);
	}

	cartEvents();

	if (document.readyState === 'loading')
		document.addEventListener('DOMContentLoaded', function () { init(); });
	else init();

	/* *** init() ONCE IS NOT ENOUGH ON A REACT PAGE, AND B4 PROVED IT. ***
	   With an address typed into the checkout, WooCommerce re-renders the form -
	   and the express-payment region that came back was a NEW node. Our
	   data-d-express attribute was on the old one, the ResizeObserver was
	   watching a detached element, and the empty slab the owner reported was
	   back in the very next screenshot. Every module here is guarded by a
	   dataset flag on the element, so re-running init on a fresh node is safe
	   and re-running it on an old one does nothing.

	   Debounced with rAF: a React commit fires many mutations and there is no
	   sense answering each one. Scoped to added element nodes, so typing in a
	   field - which mutates attributes and text - does not schedule anything. */
	if (window.MutationObserver) {
		var pending = false;
		var rerun = function () {
			pending = false;
			init();
		};
		new MutationObserver(function (records) {
			if (pending) { return; }
			for (var i = 0; i < records.length; i++) {
				for (var j = 0; j < records[i].addedNodes.length; j++) {
					if (records[i].addedNodes[j].nodeType === 1) {
						pending = true;
						requestAnimationFrame(rerun);
						return;
					}
				}
			}
		}).observe(document.body, { childList: true, subtree: true });
	}

	/* WooCommerce blocks mount late and re-render; anything we styled can appear
	   after we ran. Cheap to re-scan, and init is idempotent. */
	document.addEventListener('wc-blocks_render_blocks_frontend', function () { init(); });
	window.dInitDarlingUI = init;
})();