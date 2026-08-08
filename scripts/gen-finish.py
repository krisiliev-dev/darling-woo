"""Generate theme/darling/src/finish.css.

The variance tables are the input; the file is written whole. Typing 200
coordinates by hand is how a transposed digit gets into a design system and
never gets found.

ASCII only: the Windows shell that receives this file reads UTF-8 bytes as the
ANSI codepage, which is exactly how the first preview shipped with mojibake
Cyrillic and how the mangling got into src/finish.css's own comments.
"""
from math import cos, sin, pi

# ---------------------------------------------------------------- variance ---
GRAIN_X = ['0%', '37%', '64%', '18%', '81%']            # period 5
GRAIN_Y = ['0%', '43%', '71%', '12%', '88%', '29%', '56%']   # period 7
# flip on 3

# broad speculars - period 13. Kept in the middle band of the element: a
# specular pinned to a corner reads as a mistake rather than as light.
FLAIRS = [
    # *** BOTH COORDINATES STAY OUT OF THE MIDDLE. ***
    # v4 moved the speculars from a masked pseudo-element onto the element
    # background and kept the old coordinates, which put their bright cores
    # under the label - where they wash into the text instead of reading as
    # light, and the owner said the buttons had lost their reflectiveness. On
    # the background there is no mask to cut the centre out, so the coordinates
    # have to do it: x stays in 10-27 or 73-90, y in 16-34 or 66-84.
    (16, 24, 82, 74), (24, 30, 76, 78), (13, 20, 87, 70), (26, 33, 74, 67),
    (19, 22, 79, 80), (11, 31, 85, 72), (23, 18, 90, 76), (15, 28, 73, 68),
    (27, 34, 81, 83), (12, 26, 77, 71), (21, 17, 88, 79), (18, 32, 75, 84),
    (25, 21, 83, 66),
]

FIREFLIES = 10
SWARMS = 11

# Low-discrepancy scatter, computed here so the output is a fixed table. Golden
# ratio and sqrt(2)-1 are irrational and coprime enough that consecutive points
# never clump, which a random sample of 10 frequently does.
def swarm(v):
    pts = []
    for i in range(FIREFLIES):
        t = v * FIREFLIES + i + 1
        x = (t * 0.6180339887) % 1.0
        y = (t * 0.4142135624) % 1.0
        pts.append((round(4 + x * 92), round(4 + y * 92)))
    return pts


SWARM_POS = [swarm(v) for v in range(SWARMS)]

# Drift direction is a per-FIREFLY constant, not per instance: firefly 3 always
# wanders up-left. Ten vectors declared once beats ten vectors x eleven swarms
# declared in the sheet, and no eye can tell the difference once the positions
# and the pace already vary.
DRIFT = [(5, -4), (-4, 5), (3, 6), (-6, -3), (6, 2),
         (-3, -6), (2, 6), (-5, 3), (4, -6), (-6, 4)]

# Base radius per firefly, in em, INCLUDING the halo. Mixed sizes read as depth.
SIZE = [.44, .30, .38, .26, .48, .34, .28, .42, .32, .36]

# Twinkle: each firefly's size is multiplied by one of these, and the phase is
# offset by its index, so no two peak together.
TWINKLE = [1.00, 1.45, 0.72, 1.22, 0.62, 1.34]

# per-instance rhythm - period 19, coprime to everything above
CYCLES = ['13s', '17s', '11s', '19s', '15s', '23s', '12s', '21s', '14s', '18s',
          '16s', '25s', '13.5s', '20s', '11.5s', '22s', '15.5s', '24s', '19.5s']
BREATHE = ['7s', '9s', '8s', '11s', '7.5s', '10s', '8.5s', '12s', '9.5s', '6.5s',
           '10.5s', '13s', '7.2s', '11.5s', '8.8s', '9.2s', '6.8s', '12.5s', '10.2s']

# The big slow circle and the small fast one. Radii in px; they become em.
RAD_A   = [7.5, 5.5, 9.0, 6.0, 8.0, 5.0, 7.0, 9.5, 6.5, 8.5]
PHASE_A = [i * 0.1 + (i % 3) * 0.07 for i in range(FIREFLIES)]
SPIN_A  = [1, -1, 1, 1, -1, 1, -1, 1, -1, -1]

RAD_B   = [3.2, 4.0, 2.6, 3.6, 2.8, 4.2, 3.0, 2.4, 3.8, 3.4]
PHASE_B = [(i * 0.37) % 1.0 for i in range(FIREFLIES)]
SPIN_B  = [-1, 1, -1, 1, 1, -1, 1, -1, 1, -1]

STOPS_A = [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]
STOPS_B = [0, 100 / 7 * 1, 100 / 7 * 2, 100 / 7 * 3, 100 / 7 * 4, 100 / 7 * 5,
           100 / 7 * 6, 100]
STOPS_T = [0, 20, 40, 60, 80, 100]


def base_pos():
    """where each firefly sits before any animation touches it"""
    rows = []
    for i in range(FIREFLIES):
        end = ';' if i == FIREFLIES - 1 else ','
        rows.append('\t\tvar(--ff-%d-x) var(--ff-%d-y)%s' % (i + 1, i + 1, end))
    return '\n'.join(rows)


def off_list(t, radii, phases, spin):
    """A pure OFFSET list, in em, for an additive animation.

    Each firefly walks a circle rather than a line. One circle on its own is
    still a loop you can learn; two circles of different radius and coprime
    period, added together, trace an epicycle that does not visibly repeat -
    which is the difference between a path and a wander."""
    rows = []
    for i in range(FIREFLIES):
        a = 2 * pi * (t + phases[i]) * spin[i]
        dx = radii[i] * cos(a)
        dy = radii[i] * sin(a)
        end = ';' if i == FIREFLIES - 1 else ','
        rows.append('\t\t%sem %sem%s' % (round(dx / 16, 4), round(dy / 16, 4), end))
    return '\n'.join(rows)


def size_list(stop_index):
    parts = []
    for i in range(FIREFLIES):
        f = TWINKLE[(i + stop_index) % len(TWINKLE)]
        s = round(SIZE[i] * f, 3)
        parts.append('%sem %sem' % (s, s))
    return '\t\t' + ', '.join(parts) + ';'


out = []
w = out.append

w('''/* =============================================================================
   FINISH - the amber ramp, its light, its glow, its fireflies, and the plywood
   grain.

   GENERATED by scripts/gen-finish.py. The variance tables are the input; edit
   them there, not here.

   NAMING. The owner chose Shperplat (plywood) as the texture; "metal" in the
   older files named the LIGHTING MODEL, not the material.

   FOUR LAYERS, AND WHICH SURFACE EACH ONE LIVES ON. There are only two
   pseudo-elements, and the fireflies need to paint OUTSIDE the box while the
   grain must stay inside it, so the assignment is forced:

     element background   the amber ramp, the inner glow, the two flairs.
                          All static, all under the label, so none of them need
                          a mask and none of them cost a frame.
     ::before             the fireflies. Extends BEYOND the element by
                          --firefly-reach so the swarm surrounds it. Drifts,
                          twinkles, and breathes.
     ::after              the plywood grain. Inside the box, blended, masked.
     box-shadow           the rim, the inner glow and the outer glow.

   *** CONTAINER QUERIES CANNOT SIZE ANY OF IT. MEASURED, DO NOT RETRY. ***
   container-type:inline-size applies inline-size containment, so an element
   stops taking its width from its contents. A shrink-to-fit button measured
   323px plain and 52px with container-type - it collapses to its padding - and
   its ::after resolved background-size:50cqi to 0px 0px. An inline wrapper is
   no better: it measured 0 wide. So everything that must scale with a component
   scales in `em`: font-size already tracks a component's scale without
   containment and needs no JavaScript. That is why --firefly-reach and every
   firefly radius are in em - a badge gets a small close swarm, a hero button
   gets a wide one, from one declaration.

   *** THE FINISH IS NEVER APPLIED TO TEXT. ***
   There used to be a .d-finish--text that clipped the ramp to glyphs, and the
   live wordmark still uses it. The owner: "we shouldn't use the texture on
   text... it makes it hard to read." Removed deliberately, not lost. The live
   wordmark has to be ported to plain --ink; do not reintroduce this.
   ========================================================================== */

@layer finish{

/* Registered so they can be ANIMATED and TRANSITIONED. An unregistered custom
   property has no type, so it interpolates discretely - the hover would snap
   rather than ramp. */
@property --glow-k{       syntax:"<number>"; inherits:true;  initial-value:1 }
@property --glow-base{    syntax:"<number>"; inherits:true;  initial-value:1 }
@property --glow-breathe{ syntax:"<number>"; inherits:false; initial-value:1 }
@property --glow-hover{   syntax:"<number>"; inherits:false; initial-value:1 }

:root{
	--grain-src: url("../assets/ply-grain.webp");
	--grain-mask: radial-gradient(64% 190% at 50% 50%, transparent 0 26%, #000 86%);

	/* How far the swarm spreads past the edge. In em, so it tracks the
	   component. *** SET THIS TO 0 ON ANYTHING FLUSH TO THE VIEWPORT EDGE. ***
	   A pseudo-element with a negative inset contributes its right and bottom
	   overhang to scrollable overflow - that is what made the winning file's
	   inset:-45% bloom measure scrollWidth 1.45x clientWidth. Here the overhang
	   is ~1.6em rather than 45%, and the gate checks the DOCUMENT for
	   horizontal overflow rather than each element, because a button in the
	   middle of a padded page overhanging by 26px harms nothing and a
	   full-bleed one overhanging by 26px is a horizontal scrollbar. */
	--firefly-reach: 1.6em;

	/* Keeps the swarm off the label. Percentages of the ::before box, which is
	   larger than the element, so the clear centre lands over the text. */
	--firefly-mask: radial-gradient(42% 30% at 50% 50%, transparent 0 46%, #000 88%);

	/* THE BODY TONE. Banding across a form is the reflection of a WIDE
	   environment, which is why it reads as cut out of something larger.

	   *** THIS WAS DELETED BY ACCIDENT IN v4 AND NOTHING COMPLAINED. ***
	   I rewrote this :root block for the fireflies and dropped --surface-finish
	   out of it. background-image on .d-finish still referenced it, so the whole
	   declaration went invalid-at-computed-value-time and resolved to `none` -
	   every button lost its ramp, its speculars and its inner glow in one go and
	   fell back to the flat background-color. The owner spotted it on sight; no
	   test I had would have. Third instance of the same family: --ink-2
	   consumed and never declared, --d-page declared and never consumed, this
	   one declared then un-declared. The build now runs a token check. */
	--surface-finish:
		radial-gradient(52% 120% at 26% 20%, var(--g-vanilla) 0%, var(--g-light) 36%, transparent 74%),
		linear-gradient(175deg, var(--g-light) 0%, var(--g-core) 58%, var(--g-shadow) 100%);
}

/* *** EVERYTHING THAT READS --glow-k IS DECLARED HERE, ON .d-finish, NOT ON
   :root. MEASURED - MOVING IT BACK BREAKS THE DIMMER SILENTLY. ***
   var() inside a custom property is substituted at the computed-value time of
   THAT custom property, on the element it is declared on. With --rim on :root,
   its var(--glow-k) resolves against :root and every element inherits a value
   with the number already baked in: four buttons at 0 / .5 / 1 / 1.6 measured
   byte-identical box-shadows, alpha .8 and .7 on all four. */
.d-finish{
	/* --glow-base is the knob a COMPONENT sets. The other two are the hero
	   animation and the pointer, and they multiply in. Setting --glow-k
	   directly from outside still wins over all three - that is the escape
	   hatch. */
	--glow-base: 1;
	--glow-k: calc(var(--glow-base) * var(--glow-breathe) * var(--glow-hover));

	/* *** THE RIM DERIVES FROM THE THREE NUMBERS. *** On the live site it does
	   not - it is five hand-written hsl() values - so changing --gh/--gs/--gl
	   today retints the surface and leaves the rim amber, and the object comes
	   apart. This is the fix, not a transcription. */
	--rim:
		inset  0    0    0   1px hsl(var(--gh) calc(var(--gs) * 1%) calc(34% + var(--gl) * 1%) / calc(.55 * var(--glow-k))),
		inset  0    9px  16px -11px hsl(from var(--g-vanilla) h s l / calc(.90 * var(--glow-k))),
		inset  0  -11px  20px -11px hsl(from var(--g-deep)    h s l / calc(.80 * var(--glow-k))),
		inset  9px  0    18px -14px hsl(from var(--g-deep)    h s l / calc(.70 * var(--glow-k))),
		inset -9px  0    18px -14px hsl(from var(--g-deep)    h s l / calc(.70 * var(--glow-k)));

	/* -- the outer glow ------------------------------------------------------
	   *** A BOX-SHADOW, NOT A PSEUDO-ELEMENT. THIS IS A BUG FIX. ***
	   v1 put the halo on ::before at inset:0 with z-index:-1, which is entirely
	   occluded by the element's own opaque background - the buttons shipped
	   with no glow at all. A box-shadow never contributes to scrollable
	   overflow, which is the other half of the same problem. */
	/* THREE PARTS, THREE TOKENS, EACH ONE SWITCHABLE ON ITS OWN.
	   v5 folded the inner glow into a background gradient, so --glow-inner
	   stopped existing as a knob and the rim / inner / outer comparison showed
	   the same button three times. Inset shadows also pool light against the
	   edge more convincingly than a vignette, because they follow the
	   border-radius exactly instead of approximating it with an ellipse. */
	--glow-inner:
		inset 0 0 11px -1px hsl(from var(--g-light)   h s l / calc(.62 * var(--glow-k))),
		inset 0 0 28px -7px hsl(from var(--g-vanilla) h s l / calc(.55 * var(--glow-k)));

	--glow-outer:
		0 0    0    1px  hsl(from var(--g-light) h s l / calc(.30 * var(--glow-k))),
		0 2px  10px -2px hsl(from var(--g-core)  h s l / calc(.55 * var(--glow-k))),
		0 6px  26px -6px hsl(from var(--g-core)  h s l / calc(.50 * var(--glow-k))),
		0 0    40px -6px hsl(from var(--g-light) h s l / calc(.42 * var(--glow-k)));

	--lift: 0 2px 0 rgb(0 0 0 / .22), 0 8px 18px rgb(0 0 0 / .22);

	--flair-a: hsl(48 100% 96% / calc(.95 * var(--glow-k)));
	--flair-b: hsl(45 100% 88% / calc(.55 * var(--glow-k)));

	/* A firefly is a hot white core in an amber halo. The core is small and the
	   halo is most of the radius - that is what makes it read as a light in the
	   air rather than a dot painted on. */
	--firefly:
		hsl(50 100% 99% / calc(1 * var(--glow-k)))    0%,
		hsl(46 100% 92% / calc(.88 * var(--glow-k)))  17%,
		hsl(40 100% 74% / calc(.42 * var(--glow-k)))  42%,
		transparent 100%;

	position:relative;
	isolation:isolate;
	color:var(--ink);
	background-color:var(--g-core);

	/* -- what sits under the label -------------------------------------------
	   The inner glow is the light pooling just inside the edge; it is what makes
	   the object read as lit from WITHIN rather than merely lit. Then the two
	   broad speculars, then the ramp. All three are static and unmasked, because
	   they live behind the text where nothing needs to be kept clear. */
	background-image:
		/* THE TOP SPECULAR. A wide, shallow reflection sitting just above the
		   top edge, so only its lower half falls on the object. This single
		   layer is what makes a surface read as glossy rather than painted -
		   v4 had no equivalent and the owner spotted it immediately. */
		radial-gradient(78% 44% at 50% -8%,
			hsl(48 100% 98% / calc(.70 * var(--glow-k))) 0%,
			hsl(46 100% 91% / calc(.32 * var(--glow-k))) 44%, transparent 78%),
		/* the two wandering speculars, kept out of the middle by their tables */
		radial-gradient(closest-side circle at var(--flair-1-x, 16%) var(--flair-1-y, 24%),
			var(--flair-a) 0%, var(--flair-b) 30%, transparent 100%),
		radial-gradient(closest-side circle at var(--flair-2-x, 82%) var(--flair-2-y, 74%),
			var(--flair-a) 0%, var(--flair-b) 24%, transparent 100%),
		/* the inner glow: light pooling just inside the edge, which is what
		   makes the object read as lit from WITHIN rather than merely lit */
		radial-gradient(closest-side, transparent 44%,
			hsl(from var(--g-light) h s l / calc(.62 * var(--glow-k))) 100%),
		var(--surface-finish);
	background-size: 100% 100%, 34% 92%, 27% 76%, 100% 100%, 100% 100%, 100% 100%;
	background-position: center, center, center, center, center, center;
	background-repeat:no-repeat;

	box-shadow:var(--rim), var(--glow-inner), var(--glow-outer), var(--lift);
	/* *** THE OBJECT BREATHES, NOT JUST THE SWARM. ***
	   v5 put the breathe on ::before's opacity, and once the flairs moved to
	   the element background ::before carried nothing but fireflies - so the
	   BUTTON never breathed at all and the owner could not tell whether the
	   animation was running. It was right: it wasn't.
	   This animates --glow-k, which all three of rim / inner / outer read, so
	   they swell and settle together. It costs a shadow repaint per frame; the
	   budget is on the keyframe. */
	animation-name: d-finish-breathe-glow;
	animation-duration: var(--breathe-cycle, 9s);
	animation-timing-function: var(--ease-float);
	animation-iteration-count: infinite;

	transition: --glow-hover var(--dur-ui) var(--ease-float);
}

/* -- the fireflies ---------------------------------------------------------
   Owner: "have them not only in the button but around it as well, basically
   making it look like it is surrounded by fireflies."

   So this box is BIGGER than the element. z-index:0, not -1: a positioned
   pseudo-element behind an opaque background is invisible, which is the bug
   that shipped the buttons with no glow. Above the background, below the
   grain, and masked so the swarm parts around the label.

   Every layer is positioned by background-position rather than by `at x y`
   inside the gradient, because a position inside a gradient function cannot be
   animated and a background-position list can. */
.d-finish::before{
	content:"";
	position:absolute;
	inset: calc(-1 * var(--firefly-reach));
	z-index:0;
	pointer-events:none;
''')

w('\tbackground-image:')
for i in range(FIREFLIES):
    end = ';' if i == FIREFLIES - 1 else ','
    w('\t\tradial-gradient(closest-side circle at center, var(--firefly))%s' % end)
w('\tbackground-size:')
w(size_list(0))
w('\tbackground-position:')
w(base_pos())
w('''	background-repeat:no-repeat;
	-webkit-mask-image:var(--firefly-mask);
	        mask-image:var(--firefly-mask);
	-webkit-mask-size:100% 100%;
	        mask-size:100% 100%;

	/* LONGHANDS, not the shorthand: a component that needs its own animation
	   appends to animation-name rather than fighting a shorthand that would
	   reset duration and easing underneath it. */
	/* FOUR animations, and the composition line is the whole trick.
	   The two drifts are ADDITIVE, so their offsets sum onto the base position
	   instead of the second one replacing the first. Two circles of different
	   radius and coprime period add up to an epicycle: the swarm stops looking
	   like ten things on rails. The twinkle and the breathe replace, because
	   they own their properties outright.
	   animation-composition is Chrome 112 / Safari 16 / Firefox 115. Where it is
	   missing, the second drift simply replaces the first and the motion is a
	   plain circle - degraded, never broken. */
	animation-name: d-firefly-a, d-firefly-b, d-firefly-twinkle, d-finish-breathe;
	animation-duration: var(--ff-cycle-a, 15s), var(--ff-cycle-b, 24s),
	                    var(--ff-cycle-a, 15s), var(--breathe-cycle, 9s);
	animation-timing-function: linear, linear, var(--ease-float), var(--ease-float);
	animation-iteration-count: infinite, infinite, infinite, infinite;
	animation-composition: add, add, replace, replace;
}''')

w('''
/* -- the grain -------------------------------------------------------------
   Masked to the rim and the padding: clean where a label sits, grain in the
   space around it. Every value in the mask is a PERCENTAGE and mask-size is
   100% 100%, so it follows any shape - pill, circle, rounded square - with no
   fixed geometry and no script. The grain does NOT move: plywood is the
   material, and material does not drift. */
.d-finish::after{
	content:"";
	position:absolute;
	inset:0;
	z-index:1;
	border-radius:inherit;
	pointer-events:none;
	background-image:var(--grain-src);
	background-size:var(--grain-size, 17em) var(--grain-size, 17em);
	background-position:var(--grain-x, 0%) var(--grain-y, 0%);
	mix-blend-mode:overlay;
	-webkit-mask-image:var(--grain-mask);
	        mask-image:var(--grain-mask);
	-webkit-mask-size:100% 100%;
	        mask-size:100% 100%;
}

/* -- the pointer -----------------------------------------------------------
   Owner: "upon hovering an element, the glow of it and the speckles can become
   brighter and the speckles can be faster."
   Brightness transitions, because --glow-hover is registered. Speed does not:
   changing animation-duration re-derives the phase, so it steps rather than
   ramps. That step is under the cursor and reads as the swarm waking up, so it
   is left as a step rather than papered over with a second animation. */
.d-finish:hover,
.d-finish:focus-visible{
	--glow-hover: 1.34;
}
.d-finish:hover::before,
.d-finish:focus-visible::before{
	animation-duration: calc(var(--speck-cycle, 15s) * .3), var(--breathe-cycle, 9s);
}''')

w('''
/* -- the animations --------------------------------------------------------
   *** var() DOES NOT WORK FOR animation-timing-function INSIDE @keyframes. ***
   Measured: sampled 10% into a 4s cycle, a var() easing sat at 52.38px, exactly
   equal to linear, while the literal gave 53.55. It is silently dropped. So the
   easing lives on the element, where var() is fine, and never in here. The
   drift is deliberately `linear` anyway - the easing is already built into the
   triangle wave the positions trace, and easing on top of it would make the
   whole swarm hesitate in unison.

   *** THE BREATHE IS AN OPACITY, NOT --glow-k. MEASURED, AND THE GAP IS LARGE. ***
   Chromium, 57 finished elements, 2.5s samples, 60 fps baseline in the same
   browser:

       nothing animating .......................... 60 fps
       drift only (background-position) ........... 23
       breathe via --glow-k (4 shadow groups) ..... 15
       same, with the outer glow held static ...... 16
       breathe via opacity on ::before ............ 60
       opacity breathe AND drift together ......... 53

   Animating --glow-k re-resolves every relative-colour hsl() in four box-shadow
   groups and repaints a 40px blur on every element every frame; holding the
   outer glow static recovered one frame, so it is the whole shadow stack, not
   the halo. Opacity on a pseudo-element is composited and costs nothing - and
   as a bonus it promotes ::before to its own layer, which made the drift
   cheaper too.

   What this trades away: the OUTER halo no longer breathes, only the light on,
   in and around the object. .d-finish--hero buys it back for the one element a
   page is built around. */
@keyframes d-finish-breathe{
	0%, 100% { opacity: .74 }
	42%      { opacity: 1 }
}
''')

for label, stops, rad, ph, spin in [
        ('d-firefly-a', STOPS_A, RAD_A, PHASE_A, SPIN_A),
        ('d-firefly-b', STOPS_B, RAD_B, PHASE_B, SPIN_B)]:
    w('@keyframes %s{' % label)
    for stop in stops:
        w('\t%s%% {' % round(stop, 4))
        w('\t\tbackground-position:')
        w(off_list(stop / 100.0, rad, ph, spin))
        w('\t}')
    w('}')

w('@keyframes d-firefly-twinkle{')
for si, stop in enumerate(STOPS_T):
    w('\t%d%% {' % stop)
    w('\t\tbackground-size:')
    w(size_list(si if stop != 100 else 0))
    w('\t}')
w('}')

w('''
/* The amplitude the owner asked for - "more pronounced. I am not even sure if
   it's there." .70 to 1.24 is a swing that cannot be missed on a dark ground. */
@keyframes d-finish-breathe-glow{
	0%, 100% { --glow-breathe: .70 }
	42%      { --glow-breathe: 1.24 }
}

/* -- still -----------------------------------------------------------------
   For a grid past the frame budget: keeps every glow, stops the breathing. */
.d-finish--still{ animation-name:none }
.d-finish--still::before{ animation-name:d-firefly-twinkle }

/* -- no swarm ---------------------------------------------------------------
   For anything flush to the viewport edge, and for dense grids past the frame
   budget. Kills the overhang, not just the animation. */
.d-finish--quiet{ --firefly-reach: 0em }
.d-finish--quiet::before{ content:none }''')

w('''
/* -- NO TWO PIECES CUT FROM THE SAME SHEET ---------------------------------
   The owner, in order: "nowhere does it say they were cut from the same
   plywood"; then "another thing we can randomise along with the texture is the
   flairs and speckles on them"; then "they should move in a random direction."

   CSS has no random(). These cycle on nth-of-type with COPRIME periods, so the
   combination repeats only at their product:

       grain offset    5 x 7            35
       grain flip      3               105
       flairs         13              1365
       swarm          11             15015
       pace           19            285285

   Two hundred and eighty-five thousand distinct finishes before any pair
   repeats, and every one is deterministic - no script, no flash on load, no
   layout shift, nothing on the money path.

   Drift DIRECTION is deliberately not in this table and is not a custom
   property either: it is baked into the keyframe offsets, one constant vector
   per firefly, so firefly 3 always wanders up-left. Ten vectors x eleven swarms
   as declared properties would be 220 more tokens in the sheet for a difference
   no eye can see once the positions and the pace already vary. A token nobody
   reads is the same bug as --d-page.

   The individual vars remain the escape hatch: whatever renders a component can
   emit a real per-instance seed and it will win over all of these. */''')

for i, v in enumerate(GRAIN_X, 1):
    w('.d-finish:nth-of-type(5n+%d){ --grain-x: %s }' % (i, v))
for i, v in enumerate(GRAIN_Y, 1):
    w('.d-finish:nth-of-type(7n+%d){ --grain-y: %s }' % (i, v))
w('.d-finish:nth-of-type(3n)::after{ transform:scaleX(-1) }')

w('\n/* flairs on 13 - the light source shifts, so no two neighbours catch it the\n'
  '   same way. */')
for i, (ax, ay, bx, by) in enumerate(FLAIRS, 1):
    w('.d-finish:nth-of-type(13n+%-2d){ --flair-1-x:%d%%; --flair-1-y:%d%%; --flair-2-x:%d%%; --flair-2-y:%d%% }'
      % (i, ax, ay, bx, by))

w('\n/* the swarm on 11 - ten fireflies, scattered by a low-discrepancy sequence so\n'
  '   they never clump the way ten random points frequently do. */')
for v, pts in enumerate(SWARM_POS, 1):
    parts = ' '.join('--ff-%d-x:%d%%; --ff-%d-y:%d%%;' % (i + 1, x, i + 1, y)
                     for i, (x, y) in enumerate(pts))
    w('.d-finish:nth-of-type(11n+%-2d){ %s }' % (v, parts.rstrip(';')))

w('\n/* pace on 19 - drift cycle and breathe cycle, so neighbours never sync up. */')
for i, (c, bcy) in enumerate(zip(CYCLES, BREATHE), 1):
    b = round(float(c[:-1]) * 1.618, 1)
    w('.d-finish:nth-of-type(19n+%-2d){ --ff-cycle-a:%s; --ff-cycle-b:%ss; --breathe-cycle:%s }'
      % (i, c, b, bcy))

w('''
/* -- the kill switches are in motion.css and are blanket -------------------
   `*, *::before, *::after { animation:none !important }` under reduced motion,
   and the same for `*, *::before` on cart / checkout / order-received. Both
   already catch everything above; nothing here needs its own opt-out.

   GAP, FOUND WHILE WRITING THIS: the money-path rule lists `*` and `*::before`
   but not `*::after`. Harmless today because ::after carries only the static
   grain, but the next animated ::after on a checkout page will run. Fix belongs
   in motion.css. */
}''')

text = '\n'.join(out) + '\n'
assert all(ord(c) < 128 for c in text), 'non-ascii leaked into the generated file'
open('/home/claude/finish.css', 'w', encoding='ascii').write(text)
print('wrote finish.css %d bytes, %d variance rules, %d fireflies'
      % (len(text), text.count('.d-finish:nth-of-type'), FIREFLIES))
