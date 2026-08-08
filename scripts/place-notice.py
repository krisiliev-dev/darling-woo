"""notice.css rev4 - eleven stars, aimed at the text, and a close that reads.

Owner, 2026-08-08:
  - the text takes the full width; the stars roam the element, constrained to it
  - error: stars spawn continuously from above, along the whole width
  - warning: the star circles the TEXT
  - success: the stars zoom around the whole element
  - info: the star points from above, below or the other side
  - the close button is a star, and a SINGLE SPIN - no growing, nothing flashy

Owner again, after rev3:
  - the orbit and the pokes aim at the MIDDLE of the element, but the text is
    left aligned - aim at the text
  - the close star must be turned 45 degrees or it is a plus sign
  - more expressive: more stars, and the excited ones faster and erratic
    rather than easing in and out

*** ELEVEN STARS, AND WHY NOT MORE. ***
No JavaScript, so every star is an element or a pseudo-element. The notice gives
two; each <span class="d-notice__stars"> gives three, and we emit three of them.
Eleven is what "continuously" costs without a script. WooCommerce's own notices
get none of it - its markup has no span for us to use.

*** ERRATIC IS A TIMING PROBLEM, NOT A PATH PROBLEM. ***
The excited stars use LINEAR timing and keyframe stops at uneven intervals -
13, 24, 41, 55, 69, 88. An ease makes every leg accelerate and settle the same
way, which reads as a route being followed however wild the path is; uneven
stops on linear timing read as a mind being changed.

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

   ELEVEN STAR BODIES, NO SCRIPT - the notice's two pseudo-elements plus three
   spans of three. They sit at z-index 0, behind the body at z-index 1, because
   a star crossing a word is a legibility bug dressed up as whimsy, and
   overflow:hidden keeps them inside the box.

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

/* -- the star bodies --------------------------------------------------------
   ELEVEN of them, and every one is an element or a pseudo-element because there
   is no script here. The notice gives two; each <span class="d-notice__stars">
   gives three (itself plus its two), and we emit three spans. Eleven staggered
   bodies is what "continuously" costs without JavaScript.

   They sit at z-index 0, behind the body at z-index 1: a star crossing a word is
   a legibility bug dressed up as whimsy. overflow:hidden keeps them in the box.

   *** THE ORBITS AND THE POKES AIM AT THE TEXT, NOT THE BOX. ***
   The text is left aligned, so anything centred on the element circles empty
   space to the right of the message. Everything below is anchored near the left
   third, in em, which tracks the type rather than the container width. */
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

/* -- error: it rains, it tumbles, it flickers out ---------------------------
   Eleven columns across the width. Each star tumbles as it falls, FLICKERS
   twice on the way down - the stutter is what makes it read as dying rather
   than as merely leaving - darkens to cocoa and is gone before it lands. */
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
.d-notice--error::before { left:5%;  animation-duration:4.2s; animation-delay:0s }
.d-notice--error::after  { left:14%; animation-duration:5.6s; animation-delay:1.4s }
.d-notice--error .d-notice__stars:nth-of-type(1)         { left:24%; animation-duration:3.7s; animation-delay:2.6s }
.d-notice--error .d-notice__stars:nth-of-type(1)::before { left:33%; animation-duration:6.1s; animation-delay:.7s }
.d-notice--error .d-notice__stars:nth-of-type(1)::after  { left:42%; animation-duration:4.9s; animation-delay:3.3s }
.d-notice--error .d-notice__stars:nth-of-type(2)         { left:52%; animation-duration:5.1s; animation-delay:1.9s }
.d-notice--error .d-notice__stars:nth-of-type(2)::before { left:61%; animation-duration:3.9s; animation-delay:4.1s }
.d-notice--error .d-notice__stars:nth-of-type(2)::after  { left:70%; animation-duration:6.4s; animation-delay:.3s }
.d-notice--error .d-notice__stars:nth-of-type(3)         { left:79%; animation-duration:4.6s; animation-delay:2.2s }
.d-notice--error .d-notice__stars:nth-of-type(3)::before { left:88%; animation-duration:5.3s; animation-delay:3.8s }
.d-notice--error .d-notice__stars:nth-of-type(3)::after  { left:95%; animation-duration:4.0s; animation-delay:1.1s }
@keyframes d-star-rain{
	0%   { transform:translateY(-1.4em) scale(.95) rotate(0deg);
	       background:var(--notice-error-edge); opacity:0 }
	10%  { opacity:.9 }
	38%  { opacity:.25 }                       /* the first guttering */
	46%  { opacity:.8 }
	62%  { background:var(--c-cocoa); opacity:.18 }   /* the second */
	70%  { opacity:.5 }
	100% { transform:translateY(4.8em) scale(.3) rotate(320deg);
	       background:var(--c-cocoa); opacity:0 }
}

/* -- warning: two stars circle THE TEXT, and brighten as they pass -----------
   An ellipse walked in eight steps, anchored over the left third where the
   message actually is. A rotation would give a circle, and a circle around a
   wide box either clips at the top or barely moves at the sides. */
.d-notice--warning{
	background:color-mix(in oklab, var(--notice-warning-edge) 11%, var(--surface-raised));
	box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--notice-warning-edge) 24%, transparent);
}
.d-notice--warning::before,
.d-notice--warning::after,
.d-notice--warning .d-notice__stars:nth-of-type(1){
	background:var(--notice-warning-edge);
	left:8.5em; top:50%;
	margin:-.4em 0 0 -.4em;
	animation:d-star-circle 7.5s linear infinite;
}
.d-notice--warning::after{ animation-delay:-2.5s; width:.6em; height:.6em }
.d-notice--warning .d-notice__stars:nth-of-type(1){ animation-delay:-5s; width:.5em; height:.5em }
.d-notice--warning .d-notice__stars:nth-of-type(2),
.d-notice--warning .d-notice__stars:nth-of-type(3),
.d-notice--warning .d-notice__stars::before,
.d-notice--warning .d-notice__stars::after{ display:none }
@keyframes d-star-circle{
	0%   { transform:translate(-8.4em, -.6em) scale(.7);  opacity:.4 }
	12.5%{ transform:translate(-5.9em, -1.5em) scale(.85); opacity:.6 }
	25%  { transform:translate(0em, -1.85em) scale(1.1);  opacity:1 }
	37.5%{ transform:translate(5.9em, -1.5em) scale(.85); opacity:.6 }
	50%  { transform:translate(8.4em, -.6em) scale(.7);   opacity:.4 }
	62.5%{ transform:translate(5.9em, .4em) scale(.85);   opacity:.6 }
	75%  { transform:translate(0em, .75em) scale(1.1);    opacity:1 }
	87.5%{ transform:translate(-5.9em, .4em) scale(.85);  opacity:.6 }
	100% { transform:translate(-8.4em, -.6em) scale(.7);  opacity:.4 }
}

/* -- success: eleven stars, and none of them can sit still -------------------
   The owner: "more and more excited and flying faster erratically rather than
   easing in and out". So: short cycles, LINEAR timing rather than an ease, and
   keyframe stops at uneven intervals - 13, 24, 41, 55, 69, 88 - because evenly
   spaced stops read as a route being followed and uneven ones read as a mind
   being changed. Each star also spins a different number of turns. */
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
	animation:d-star-dart 2.9s linear infinite;
}
.d-notice--success::before { left:7%;  top:22%; animation-duration:2.4s; animation-delay:0s }
.d-notice--success::after  { left:19%; top:64%; animation-duration:3.3s; animation-delay:-.7s }
.d-notice--success .d-notice__stars:nth-of-type(1)         { left:31%; top:14%; animation-duration:2.7s; animation-delay:-1.4s }
.d-notice--success .d-notice__stars:nth-of-type(1)::before { left:44%; top:70%; animation-duration:3.6s; animation-delay:-2.1s; width:.62em; height:.62em }
.d-notice--success .d-notice__stars:nth-of-type(1)::after  { left:56%; top:30%; animation-duration:2.2s; animation-delay:-.4s; width:.55em; height:.55em }
.d-notice--success .d-notice__stars:nth-of-type(2)         { left:66%; top:58%; animation-duration:3.1s; animation-delay:-1.8s }
.d-notice--success .d-notice__stars:nth-of-type(2)::before { left:76%; top:20%; animation-duration:2.6s; animation-delay:-2.4s; width:.6em; height:.6em }
.d-notice--success .d-notice__stars:nth-of-type(2)::after  { left:85%; top:72%; animation-duration:3.4s; animation-delay:-.9s; width:.5em; height:.5em }
.d-notice--success .d-notice__stars:nth-of-type(3)         { left:92%; top:36%; animation-duration:2.5s; animation-delay:-1.1s; width:.58em; height:.58em }
.d-notice--success .d-notice__stars:nth-of-type(3)::before { left:12%; top:44%; animation-duration:3.0s; animation-delay:-2.7s; width:.52em; height:.52em }
.d-notice--success .d-notice__stars:nth-of-type(3)::after  { left:49%; top:52%; animation-duration:2.8s; animation-delay:-1.6s; width:.66em; height:.66em }
@keyframes d-star-dart{
	0%   { transform:translate(0,0) scale(.5) rotate(0deg);            opacity:.35 }
	13%  { transform:translate(1.9em,-.9em) scale(1.2) rotate(140deg); opacity:1 }
	24%  { transform:translate(.4em,-1.5em) scale(.7) rotate(190deg);  opacity:.6 }
	41%  { transform:translate(2.7em,.6em) scale(1.1) rotate(430deg);  opacity:.95 }
	55%  { transform:translate(-1.1em,1.2em) scale(.6) rotate(520deg); opacity:.5 }
	69%  { transform:translate(1.4em,-.4em) scale(1.25) rotate(700deg);opacity:1 }
	88%  { transform:translate(-.6em,-1.1em) scale(.75) rotate(810deg);opacity:.55 }
	100% { transform:translate(0,0) scale(.5) rotate(900deg);          opacity:.35 }
}

/* -- info: the stars point AT THE TEXT ---------------------------------------
   One above the message and one to its left, both anchored in em over the left
   third rather than centred on the box. The overshoot is the boing: past the
   target, back through it, settle. They alternate, so the message is addressed
   from two sides rather than nudged twice from one. */
.d-notice--info::before{
	left:2.2em; top:-.1em;
	animation:d-star-poke-down 3.8s var(--ease-float) infinite;
}
.d-notice--info::after{
	left:.5em; top:48%;
	width:.62em; height:.62em; opacity:.75;
	animation:d-star-poke-side 3.8s var(--ease-float) infinite;
	animation-delay:1.9s;
}
.d-notice--info .d-notice__stars,
.d-notice--info .d-notice__stars::before,
.d-notice--info .d-notice__stars::after{ display:none }
@keyframes d-star-poke-down{
	0%, 40%, 100% { transform:translateY(0) }
	54%           { transform:translateY(1em) scale(1.15) rotate(22deg) }
	64%           { transform:translateY(-.3em) }
	74%           { transform:translateY(.42em) }
	84%           { transform:translateY(-.12em) }
	92%           { transform:translateY(.05em) }
}
@keyframes d-star-poke-side{
	0%, 40%, 100% { transform:translateX(0) }
	54%           { transform:translateX(1.1em) scale(1.15) rotate(-24deg) }
	64%           { transform:translateX(-.3em) }
	74%           { transform:translateX(.44em) }
	84%           { transform:translateX(-.12em) }
	92%           { transform:translateX(.05em) }
}

/* -- the dismiss ------------------------------------------------------------
   A plain X. It was a star, and then a spinning star, and the owner is right
   that it was too much: closing a notice is the least important thing anyone
   will do on the page, and it was carrying the loudest gesture on it. Cocoa to
   claret and nothing else. Cocoa rather than the state colour, because a red X
   sitting on an error message reads as a second error. */
.d-notice__dismiss{
	grid-column:2;
	position:relative;
	z-index:2;
	appearance:none;
	border:0;
	background:none;
	width:1.6em;
	height:1.6em;
	padding:0;
	color:var(--c-cocoa);
	font:400 1.2em/1 var(--font-ui);
	cursor:pointer;
	border-radius:var(--radius-xs);
	transition:color var(--dur-ui) var(--ease-float);
}
.d-notice__dismiss:hover,
.d-notice__dismiss:focus-visible{ color:var(--c-claret) }

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
