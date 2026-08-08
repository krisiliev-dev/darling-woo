"""notice.css rev3 - the stars leave the icon column and take the whole element.

Owner, 2026-08-08:
  - the text takes the full width; the stars roam the element, constrained to it
  - error: stars spawn continuously from above, along the whole width
  - warning: the star circles the TEXT
  - success: the stars zoom around the whole element
  - info: the star points from above, below or the other side
  - the close button is a star, and a SINGLE SPIN - no growing, nothing flashy

*** WHY THERE ARE EXACTLY FIVE STARS AND NOT MORE. ***
No JavaScript on this, so every star is an element or a pseudo-element. The
notice gives two (::before, ::after) and a single decorative <span> gives three
more (itself plus its two). Five bodies, staggered on different delays and
durations, is enough to read as "continuously" without a script, and it costs
one empty span in markup we already control. WooCommerce's own notices get none
of it - see the adopted block.

*** THE STARS SIT BEHIND THE TEXT. ***
A star crossing a word is a legibility bug dressed as whimsy. The stars layer at
z-index 0 and the body sits at 1, so they pass behind the message.

*** overflow:hidden IS BACK, deliberately. ***
"constrained to the element" - a star that leaves the box is a star sliced in
half by the next element's background. The rain enters from above and the orbit
stays inside because both are composed against the box, not against the icon.
"""
import io, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

NOTICE = '''/* =============================================================================
   PATTERN / NOTICE
   Error, warning, success, info - plus the dismiss and the store-wide bar.

   A NOTICE IS A TINTED SURFACE, never a solid block: a full-bleed red panel
   across a checkout reads as a crash rather than as a correction, and checkout
   is where a customer is most likely to abandon. No left rim - it read as an
   admin panel. The tint plus the stars carry the state, with a soft ring in the
   state colour so the shape still holds on a busy page.

   *** THE STARS ARE THE ICON, AND THEY OWN THE WHOLE ELEMENT. ***
   Not a glyph in a column. The star is the brand's one recurring mark, so the
   state is a star BEHAVING differently across the notice: rain on error, an
   orbit around the text on warning, darting on success, a poke on info.

   FIVE STAR BODIES, NO SCRIPT. The notice gives two pseudo-elements and one
   decorative <span class="d-notice__stars"> gives three more. Staggered delays
   and durations make five read as continuous. They sit at z-index 0, behind the
   body at z-index 1, because a star crossing a word is a legibility bug dressed
   up as whimsy. overflow:hidden keeps them inside the box.

   *** EVERY ANIMATION HERE IS OFF ON THE MONEY PATH. ***
   motion.css kills animation on cart, checkout and order-received and under
   prefers-reduced-motion - and notices appear on those pages more than anywhere
   else. So the resting frame is the real design: each state is composed so that
   at frame zero its stars are already spread across the box rather than stacked
   at one point.

   *** SUCCESS IS GOLD, AND IT CARRIES THE FINISH. ***
   No green. Success is the amber ramp, and its stars are the vanilla end of it.
   Note that .d-finish OWNS both pseudo-elements - fireflies and grain - so
   nothing here can be a finished object and carry star pseudos at the same
   time. The finish is a leaf, not a mixin.
   ========================================================================== */

.d-notice{
	position:relative;
	display:grid;
	grid-template-columns:1fr auto;
	align-items:start;
	gap:var(--space-2xs);
	padding:var(--space-2xs) var(--space-xs);
	border-radius:var(--radius-m);
	background:color-mix(in oklab, var(--notice-info-edge) 9%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--notice-info-edge) 22%, transparent);
	color:var(--ink);
	font-size:var(--fs-meta);
	line-height:var(--lh-body);
	overflow:hidden;
	isolation:isolate;
}
.d-notice__body{ position:relative; z-index:1 }
.d-notice__title{ display:block; font-weight:var(--fw-medium) }
.d-notice a{ color:inherit }

/* -- the five star bodies ---------------------------------------------------
   One shape. Position, timing and behaviour are all a state's business. */
.d-notice::before,
.d-notice::after,
.d-notice__stars,
.d-notice__stars::before,
.d-notice__stars::after{
	content:"";
	position:absolute;
	z-index:0;
	width:.8em;
	height:.8em;
	pointer-events:none;
	background:var(--notice-info-edge);
	clip-path:polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
}
/* The span is a star AND the container for two more, so its children position
   against the notice rather than against it - hence inset:0 and its own
   absolute children placed in element percentages. */
.d-notice__stars{ left:22%; top:34% }

/* -- error: it rains stars, and they go out ---------------------------------
   Five columns across the width, five different speeds. Each falls from above
   the box, darkens to cocoa on the way down and is gone before it lands - the
   dying feel the owner asked for. */
.d-notice--error{
	background:color-mix(in oklab, var(--notice-error-edge) 9%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--notice-error-edge) 22%, transparent);
}
.d-notice--error::before,
.d-notice--error::after,
.d-notice--error .d-notice__stars,
.d-notice--error .d-notice__stars::before,
.d-notice--error .d-notice__stars::after{
	background:var(--notice-error-edge);
	top:0;
	animation:d-star-rain 4.2s linear infinite;
}
.d-notice--error::before                    { left:9%;  animation-duration:4.2s; animation-delay:0s }
.d-notice--error::after                     { left:31%; animation-duration:5.6s; animation-delay:1.4s }
.d-notice--error .d-notice__stars           { left:52%; animation-duration:3.7s; animation-delay:2.6s }
.d-notice--error .d-notice__stars::before   { left:71%; animation-duration:6.1s; animation-delay:.7s }
.d-notice--error .d-notice__stars::after    { left:88%; animation-duration:4.9s; animation-delay:3.3s }
@keyframes d-star-rain{
	0%   { transform:translateY(-1.4em) scale(.9) rotate(0deg);
	       background:var(--notice-error-edge); opacity:0 }
	14%  { opacity:.85 }
	64%  { background:var(--c-cocoa); opacity:.6 }
	100% { transform:translateY(4.6em) scale(.35) rotate(150deg);
	       background:var(--c-cocoa); opacity:0 }
}

/* -- warning: one star circles the text -------------------------------------
   An ellipse, walked in eight steps rather than rotated about an origin: a
   rotation gives a circle, and a circle around a wide box either clips at the
   top or barely moves at the sides. The eight stops trace the box's own
   proportions. */
.d-notice--warning{
	background:color-mix(in oklab, var(--notice-warning-edge) 11%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--notice-warning-edge) 24%, transparent);
}
.d-notice--warning::before,
.d-notice--warning::after{
	background:var(--notice-warning-edge);
	left:50%; top:50%;
	margin:-.4em 0 0 -.4em;
	animation:d-star-circle 9s linear infinite;
}
.d-notice--warning::after{ animation-delay:-4.5s; opacity:.45; width:.55em; height:.55em }
.d-notice--warning .d-notice__stars,
.d-notice--warning .d-notice__stars::before,
.d-notice--warning .d-notice__stars::after{ display:none }
@keyframes d-star-circle{
	0%   { transform:translate(-15em, -1.05em) }
	12.5%{ transform:translate(-10.6em, -1.55em) }
	25%  { transform:translate(0em, -1.75em) }
	37.5%{ transform:translate(10.6em, -1.55em) }
	50%  { transform:translate(15em, 0) }
	62.5%{ transform:translate(10.6em, 1.55em) }
	75%  { transform:translate(0em, 1.75em) }
	87.5%{ transform:translate(-10.6em, 1.55em) }
	100% { transform:translate(-15em, -1.05em) }
}

/* -- success: the stars are pleased and will not settle ---------------------- */
.d-notice--success{
	background:color-mix(in oklab, var(--g-core) 13%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--g-core) 30%, transparent);
}
.d-notice--success::before,
.d-notice--success::after,
.d-notice--success .d-notice__stars,
.d-notice--success .d-notice__stars::before,
.d-notice--success .d-notice__stars::after{
	background:var(--g-core);
	animation:d-star-zoom 6.5s var(--ease-float) infinite;
}
.d-notice--success::before                  { left:6%;  top:20%; animation-delay:0s }
.d-notice--success::after                   { left:37%; top:66%; animation-delay:1.3s }
.d-notice--success .d-notice__stars         { left:62%; top:16%; animation-delay:2.6s }
.d-notice--success .d-notice__stars::before { left:81%; top:58%; animation-delay:3.9s; width:.6em; height:.6em }
.d-notice--success .d-notice__stars::after  { left:21%; top:72%; animation-delay:5.2s; width:.55em; height:.55em }
@keyframes d-star-zoom{
	0%   { transform:translate(0,0) scale(.55) rotate(0deg);          opacity:.35 }
	18%  { transform:translate(1.6em,-.7em) scale(1.05) rotate(70deg); opacity:.95 }
	38%  { transform:translate(3.4em,.5em) scale(.75) rotate(150deg);  opacity:.7 }
	58%  { transform:translate(1.2em,1.1em) scale(1) rotate(240deg);   opacity:.9 }
	80%  { transform:translate(-.9em,.2em) scale(.65) rotate(310deg);  opacity:.5 }
	100% { transform:translate(0,0) scale(.55) rotate(360deg);         opacity:.35 }
}

/* -- info: the star points, from above and from the far side ----------------
   The overshoot is the boing: it goes past the text, comes back through, and
   settles. Two stars point from opposite sides so the message is addressed
   rather than approached. */
.d-notice--info::before{
	left:14%; top:-.1em;
	animation:d-star-poke-down 4.2s var(--ease-float) infinite;
}
.d-notice--info::after{
	right:16%; left:auto; top:52%;
	width:.62em; height:.62em; opacity:.6;
	animation:d-star-poke-side 5.1s var(--ease-float) infinite;
	animation-delay:1.6s;
}
.d-notice--info .d-notice__stars,
.d-notice--info .d-notice__stars::before,
.d-notice--info .d-notice__stars::after{ display:none }
@keyframes d-star-poke-down{
	0%, 46%, 100% { transform:translateY(0) }
	58%           { transform:translateY(.8em) rotate(18deg) }
	68%           { transform:translateY(-.22em) }
	78%           { transform:translateY(.3em) }
	88%           { transform:translateY(-.08em) }
}
@keyframes d-star-poke-side{
	0%, 50%, 100% { transform:translateX(0) }
	60%           { transform:translateX(-.9em) rotate(-20deg) }
	70%           { transform:translateX(.25em) }
	80%           { transform:translateX(-.32em) }
	90%           { transform:translateX(.09em) }
}

/* -- the dismiss: a star, and one quiet turn --------------------------------
   The owner: "a single spin will do, no making it bigger." So there is no
   scale, no flare and no colour flash - one 180 degree turn and a shift from
   cocoa to claret. Closing a notice is not an action anyone should be drawn to,
   and a red X sitting on an error message reads as a second error. The button
   carries no glyph: the star IS the control, which is why the accessible name
   has to come from aria-label in the markup. */
.d-notice__dismiss{
	grid-column:2;
	position:relative;
	z-index:2;
	appearance:none;
	border:0;
	background:var(--c-cocoa);
	width:.95em;
	height:.95em;
	margin:.35em .1em 0 0;
	padding:0;
	font-size:inherit;
	cursor:pointer;
	clip-path:polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
	transition:background 240ms var(--ease-float), transform 420ms var(--ease-float);
}
.d-notice__dismiss:hover,
.d-notice__dismiss:focus-visible{
	background:var(--c-claret);
	transform:rotate(180deg);
}

/* -- the store-wide bar -----------------------------------------------------
   The only notice that IS a solid block, because it is not reporting on an
   action - it is the shop talking. No stars: it is present on every page, and
   motion that is always there stops being a flourish and becomes a tic. */
.d-notice--bar{
	display:block;
	border-radius:0;
	box-shadow:none;
	padding:var(--space-2xs) var(--gutter);
	text-align:center;
	background:var(--surface-band);
	color:var(--ink-on-dark);
	font-size:var(--fs-fine);
}
.d-notice--bar::before,
.d-notice--bar::after{ content:none }

/* -- ADOPTED: WooCommerce's notices -----------------------------------------
   *** THESE GET THE TINT AND THE SHAPE, NOT THE STARS. ***
   Woo emits its own SVG inside the block banners and we cannot remove it, so
   our stars would be a second icon in the same box; and its markup has no span
   for us to hang the other three on. The classic notices get one static star.
   When these handles are dequeued and we own the markup, they move to .d-notice
   and inherit the whole treatment. */
.wc-block-components-notice-banner,
.woocommerce-message,
.woocommerce-error,
.woocommerce-info{
	display:grid;
	grid-template-columns:auto 1fr auto;
	align-items:start;
	gap:var(--space-2xs);
	padding:var(--space-2xs) var(--space-xs);
	margin:0 0 var(--stack);
	border:0;
	border-radius:var(--radius-m);
	background:color-mix(in oklab, var(--notice-info-edge) 9%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--notice-info-edge) 22%, transparent);
	color:var(--ink);
	font-size:var(--fs-meta);
	list-style:none;
}
.wc-block-components-notice-banner.is-error,
.woocommerce-error{
	background:color-mix(in oklab, var(--notice-error-edge) 9%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--notice-error-edge) 22%, transparent);
}
.wc-block-components-notice-banner.is-warning{
	background:color-mix(in oklab, var(--notice-warning-edge) 11%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--notice-warning-edge) 24%, transparent);
}
.wc-block-components-notice-banner.is-success,
.woocommerce-message{
	background:color-mix(in oklab, var(--g-core) 13%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--g-core) 30%, transparent);
}
.woocommerce-message::before,
.woocommerce-error::before,
.woocommerce-info::before{
	content:"";
	display:block;
	position:static;
	width:.8em;
	height:.8em;
	margin:.5em .2em 0 0;
	background:var(--notice-info-edge);
	clip-path:polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
}
.woocommerce-error::before{ background:var(--notice-error-edge) }
.woocommerce-message::before{ background:var(--g-core) }

.woocommerce-store-notice,
.demo_store{
	display:block;
	padding:var(--space-2xs) var(--gutter);
	margin:0;
	text-align:center;
	background:var(--surface-band);
	color:var(--ink-on-dark);
	font-size:var(--fs-fine);
	border-radius:0;
}
'''


def main():
    p = os.path.join(SRC, 'patterns', 'notice.css')
    assert all(ord(ch) < 128 for ch in NOTICE)
    io.open(p, 'w', encoding='ascii', newline='\n').write(NOTICE)
    print('wrote  patterns/notice.css %5d bytes' % len(NOTICE))

    declared = set()
    for dp, _, names in os.walk(SRC):
        for n in names:
            if n.endswith('.css'):
                t = io.open(os.path.join(dp, n), encoding='utf-8').read()
                declared |= set(re.findall(r'^\s*(--[a-z0-9-]+)\s*:', t, re.M))
    missing = sorted({m for m in re.findall(r'var\(\s*(--[a-z0-9-]+)\s*\)', NOTICE)
                      if m not in declared})
    if missing:
        print('MISSING TOKENS: ' + ', '.join(missing))
        raise SystemExit(1)
    print('token check: ok')


main()
