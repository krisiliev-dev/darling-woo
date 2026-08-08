"""patterns/rating.css - the star rating, read-only and interactive.

The obvious next pattern: it is stars, which the brand already owns, and it
appears on the catalogue, the product page and the review form - three of the
surfaces the WooCommerce dequeue is waiting on.

*** ONE STAR SHAPE, MASKED AND REPEATED - NOT FIVE ELEMENTS. ***
A rating is 4.3 stars as often as it is 4, so the fill has to be able to stop
part way through a star. Five separate elements cannot do that without a sixth
overlay per star. Instead the whole strip is a two-stop gradient - gold up to
the percentage, ash after it - and a mask of the star shape repeated five times
punches the stars out of it. The percentage is one custom property, the shape is
one SVG, and a half star costs nothing extra.

The SVG path is the same eight-point polygon as the clip-path used everywhere
else, so the rating star and the notice star are the same star.

*** WOO'S OWN RATING IS A FONT GLYPH AND MUST BE SILENCED. ***
.star-rating renders black stars via ::before content, sized in em against a
font we do not load. Left alone it shows THROUGH our mask as a row of black
stars behind gold ones. font-size:0 on the content is what stops it.
"""
import io, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

STAR_SVG = ("url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
            "viewBox='0 0 100 100'%3E%3Cpath d='M50 0 L60 40 L100 50 L60 60 L50 100 "
            "L40 60 L0 50 L40 40 Z' fill='%23000'/%3E%3C/svg%3E\")")

RATING = '''/* =============================================================================
   PATTERN / RATING
   Five stars, read-only and interactive.

   *** ONE SHAPE, MASKED AND REPEATED - NOT FIVE ELEMENTS. ***
   A rating is 4.3 as often as it is 4, so the fill must be able to stop part way
   through a star. Five elements cannot do that without a sixth overlay each.
   Instead the strip is a two-stop gradient - gold up to --rating, ash after it -
   and a mask punches five stars out of it. A half star costs nothing.

   The mask is the same eight-point star as the clip-path used in notice.css and
   on the dismiss, so every star on the site is the same star.

   *** WOO'S RATING IS A FONT GLYPH AND HAS TO BE SILENCED. ***
   .star-rating renders black stars as ::before text content, in a font we do not
   load. Left alone they show through our mask as black stars behind gold ones.
   font-size:0 is what stops it - display:none would collapse the width Woo uses
   to express the value.
   ========================================================================== */

.d-rating{
	--rating: 0%;         /* the component sets this, as a percentage of five */
	display:inline-block;
	vertical-align:-.12em;
	width:5.6em;
	height:1.12em;
	font-size:var(--fs-fine);
	background:linear-gradient(90deg,
		var(--g-core) 0 var(--rating),
		var(--c-ash-300) var(--rating) 100%);
	-webkit-mask-image:%(star)s;
	        mask-image:%(star)s;
	/* 20% rather than 1.12em: a length has to divide the width EXACTLY or
	   subpixel rounding paints a sixth, clipped star. The box is 5.6 x 1.12em,
	   so 20% by 100% is both square and exactly five. */
	-webkit-mask-size:20% 100%;
	        mask-size:20% 100%;
	-webkit-mask-repeat:repeat-x;
	        mask-repeat:repeat-x;
}

/* The count beside it. Not inside .d-rating - the mask would eat it. */
.d-rating-row{ display:inline-flex; align-items:center; gap:var(--inline) }
.d-rating-row__count{ font-size:var(--fs-fine); color:var(--ink-quiet) }

/* -- interactive: the review form -------------------------------------------
   *** THIS ONE IS FIVE REAL ELEMENTS, AND THE READ-ONLY ONE IS NOT. ***
   The read-only rating is a mask over a single gradient because it has to stop
   part way through a star. An input never does - you cannot leave 3.4 stars -
   and the owner wants each star to LIFT AND SHINE on hover, which a mask cannot
   do: one element cannot transform part of itself. So the two versions are
   built differently on purpose, and the shape is the one thing they share.

   A real radio group, because a rating is an input: reachable by keyboard,
   announced by a screen reader, and submitted by the form. The label wraps the
   radio, so the whole star is the hit area without any positioning trickery.

   Hovering the fourth star lifts the first four. That is :has() reading
   forwards - "if the fourth is hovered, style every star up to the fourth" -
   which is the thing that used to need reversed DOM order and a ~ combinator. */
.d-rating-input{
	display:inline-flex;
	gap:.14em;
	font-size:var(--fs-lede);
}
.d-rating-input label{
	display:grid;
	place-items:center;
	cursor:pointer;
	line-height:0;
}
.d-rating-input input{
	appearance:none;
	position:absolute;
	width:1px; height:1px;
	margin:0;
	opacity:0;
}
.d-rating-input__star{
	display:block;
	width:1.25em;
	height:1.25em;
	background:var(--c-ash-300);
	clip-path:polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
	position:relative;
	transition:background 140ms var(--ease-float),
	           transform 180ms var(--ease-float),
	           filter 180ms var(--ease-float);
}

/* *** THE SHINE HAS TO BE ON THE STAR, NOT AROUND IT. ***
   v1 used a drop-shadow halo and the owner could not see it, which is the same
   physics as the fireflies: an amber glow needs a dark ground to read against,
   and this sits on grey-100. So the shine is a specular sweep ACROSS the star
   instead - a light band that travels corner to corner. The parent's clip-path
   clips its descendants, so the band is star-shaped for free. */
.d-rating-input__star::after{
	content:"";
	position:absolute;
	inset:0;
	/* A WIDE band, and a slow one. The first version was 620ms with the light
	   confined to 46-54% of the gradient, so the bright moment lasted about
	   90ms out of the pass - present in a paused frame at 200ms and gone by
	   280ms. The owner could not tell whether it was subtle or broken, which
	   means it was broken. Wider band, longer travel, 1.1s. */
	background:linear-gradient(114deg,
		transparent 8%,
		hsl(50 100% 99% / .98) 34%,
		hsl(48 100% 97% / .95) 50%,
		hsl(46 100% 92% / .75) 66%,
		transparent 92%);
	transform:translateX(-115%);
	opacity:0;

	/* *** THE WAVE RUNS FROM PAGE LOAD, NOT FROM HOVER. ***
	   A CSS animation starts when it is APPLIED. Starting the sweep on hover
	   meant each star began its own timer the moment it became hovered, so
	   hovering the first and then the second half a second later put them on
	   unrelated clocks and the light never travelled - the owner spotted it
	   immediately. There is no way to phase-lock animations that start at
	   different times without script.
	   So all five run continuously from load, permanently 300ms apart, and
	   HOVER ONLY REVEALS THEM. The band is transparent at rest and its travel
	   is clipped to the star anyway, so an invisible wave costs one composited
	   transform per star and nothing else. Five animations on a page - the
	   read-only ratings on cards have no sweep at all. */
	animation-name: d-star-sweep;
	animation-duration: 2.2s;
	animation-timing-function: linear;
	animation-iteration-count: infinite;
	transition: opacity 120ms var(--ease-float);
}

/* checked fills up to N */
.d-rating-input:has(label:nth-child(1) input:checked) label:nth-child(-n+1) .d-rating-input__star,
.d-rating-input:has(label:nth-child(2) input:checked) label:nth-child(-n+2) .d-rating-input__star,
.d-rating-input:has(label:nth-child(3) input:checked) label:nth-child(-n+3) .d-rating-input__star,
.d-rating-input:has(label:nth-child(4) input:checked) label:nth-child(-n+4) .d-rating-input__star,
.d-rating-input:has(label:nth-child(5) input:checked) label:nth-child(-n+5) .d-rating-input__star{
	background:var(--g-core);
}

/* hover fills up to N, and LIFTS AND SHINES them. Declared after the checked
   rules so hovering a lower star previews down from a higher checked one, which
   is what a person expects. The shine is a drop-shadow rather than a box-shadow
   because the star is clipped: a box-shadow would draw the square. */
.d-rating-input:has(label:nth-child(1):hover) label:nth-child(-n+1) .d-rating-input__star,
.d-rating-input:has(label:nth-child(2):hover) label:nth-child(-n+2) .d-rating-input__star,
.d-rating-input:has(label:nth-child(3):hover) label:nth-child(-n+3) .d-rating-input__star,
.d-rating-input:has(label:nth-child(4):hover) label:nth-child(-n+4) .d-rating-input__star,
.d-rating-input:has(label:nth-child(5):hover) label:nth-child(-n+5) .d-rating-input__star{
	background:var(--g-light);
	transform:translateY(-.16em) scale(1.08);
	filter:drop-shadow(0 .12em .22em hsl(from var(--g-deep) h s l / .45));
}
/* *** THE SWEEP LOOPS WHILE HOVERED, AND TRAVELS. ***
   *** THE STAGGER MUST BE AS LONG AS THE CROSSING, OR IT IS NOT A WAVE. ***
   v1 had the band take 1.1s to cross a star while the next star started only
   130ms in, so all five were lit at once and it read as one simultaneous flash
   that repeated. The crossing is now 300ms - 14% of the 2.2s cycle - and the
   stagger is also 300ms, so star one finishes exactly as star two begins. Five
   crossings take 1.5s and the remaining 700ms is rest before the wave runs
   again. Without that rest it is a strobe, and a strobe on a control somebody
   is aiming at is worse than no shine at all.

   LINEAR, not --ease-float: the easing would apply across the whole 2.2s
   including the rest, which squashes the 300ms crossing into an unreadable
   blur at one end. The keyframe does the shaping instead. */
.d-rating-input:has(label:nth-child(1):hover) label:nth-child(-n+1) .d-rating-input__star::after,
.d-rating-input:has(label:nth-child(2):hover) label:nth-child(-n+2) .d-rating-input__star::after,
.d-rating-input:has(label:nth-child(3):hover) label:nth-child(-n+3) .d-rating-input__star::after,
.d-rating-input:has(label:nth-child(4):hover) label:nth-child(-n+4) .d-rating-input__star::after,
.d-rating-input:has(label:nth-child(5):hover) label:nth-child(-n+5) .d-rating-input__star::after{
	/* Reveal only. Note this must NOT use the `animation` shorthand: it would
	   reset animation-delay to 0 and, being more specific than the per-star
	   delay rules, silently wipe the stagger. The same trap is documented in
	   finish.css; it caught me here anyway. */
	opacity:1;
}
/* Hover leaves mid-pass and the animation simply stops, which would freeze a
   bright band on the star - the resting ::after above is opacity:0, so it
   snaps back rather than sticking. */
.d-rating-input label:nth-child(2) .d-rating-input__star::after{ animation-delay:300ms }
.d-rating-input label:nth-child(3) .d-rating-input__star::after{ animation-delay:600ms }
.d-rating-input label:nth-child(4) .d-rating-input__star::after{ animation-delay:900ms }
.d-rating-input label:nth-child(5) .d-rating-input__star::after{ animation-delay:1200ms }
/* Transform only - opacity is the hover switch, not part of the loop. The band
   crosses in the first 14% (300ms of 2.2s) and waits out the rest off-frame,
   where the star's clip-path hides it. */
@keyframes d-star-sweep{
	0%    { transform:translateX(-115%) }
	14%   { transform:translateX(115%) }
	100%  { transform:translateX(115%) }
}
/* Anything past the hovered star drops back to empty, so moving left from a
   checked five reads as taking stars away rather than as nothing happening. */
.d-rating-input:has(label:nth-child(1):hover) label:nth-child(n+2) .d-rating-input__star,
.d-rating-input:has(label:nth-child(2):hover) label:nth-child(n+3) .d-rating-input__star,
.d-rating-input:has(label:nth-child(3):hover) label:nth-child(n+4) .d-rating-input__star,
.d-rating-input:has(label:nth-child(4):hover) label:nth-child(n+5) .d-rating-input__star{
	background:var(--c-ash-300);
	transform:none;
	filter:none;
}
/* Keyboard gets the same lift, one star at a time, plus a visible ring. */
.d-rating-input input:focus-visible + .d-rating-input__star{
	outline:2px solid var(--action);
	outline-offset:3px;
	transform:translateY(-.16em) scale(1.08);
}

/* -- ADOPTED: WooCommerce's ratings -----------------------------------------
   Two of them. The block one exposes the value as a CSS variable, which is a
   gift; the classic one expresses it as the width of an inner span, which is
   why the outer element cannot simply be masked and be done with. */
.wc-block-components-product-rating-stars,
.wc-block-components-product-rating__stars,
.star-rating{
	position:relative;
	display:inline-block;
	width:5.6em;
	height:1.12em;
	font-size:var(--fs-fine);
	overflow:hidden;
	background:var(--c-ash-300);
	-webkit-mask-image:%(star)s;
	        mask-image:%(star)s;
	/* 20% rather than 1.12em: a length has to divide the width EXACTLY or
	   subpixel rounding paints a sixth, clipped star. The box is 5.6 x 1.12em,
	   so 20% by 100% is both square and exactly five. */
	-webkit-mask-size:20% 100%;
	        mask-size:20% 100%;
	-webkit-mask-repeat:repeat-x;
	        mask-repeat:repeat-x;
}
/* Silence the glyphs. font-size:0 rather than display:none, because Woo uses the
   span's WIDTH to express the value and display:none collapses it. */
.star-rating::before,
.star-rating span::before,
.wc-block-components-product-rating-stars::before{
	font-size:0;
	content:"";
}
/* The classic markup: an inner span whose width IS the rating. Painting it gold
   inside the masked parent turns that width into a partial fill for free. */
.star-rating span{
	position:absolute;
	inset:0 auto 0 0;
	display:block;
	height:100%;
	background:var(--g-core);
	overflow:hidden;
	text-indent:-999em;
}

/* The review form's star picker. Woo emits five nested <a> elements; they get
   the shape, and the fill follows hover left to right. */
.woocommerce p.stars{ display:inline-flex; gap:.1em; margin:0 }
.woocommerce p.stars a{
	display:block;
	width:1.3em;
	height:1.3em;
	text-indent:-999em;
	background:var(--c-ash-300);
	-webkit-mask-image:%(star)s;
	        mask-image:%(star)s;
	-webkit-mask-size:100% 100%;
	        mask-size:100% 100%;
	transition:background 120ms var(--ease-float);
}
.woocommerce p.stars:hover a,
.woocommerce p.stars a.active,
.woocommerce p.stars a.active ~ a{ background:var(--g-core) }
.woocommerce p.stars a:hover ~ a{ background:var(--c-ash-300) }
'''.replace('%(star)s', STAR_SVG)


def main():
    p = os.path.join(SRC, 'patterns', 'rating.css')
    assert all(ord(ch) < 128 for ch in RATING)
    io.open(p, 'w', encoding='ascii', newline='\n').write(RATING)
    print('wrote  patterns/rating.css %5d bytes' % len(RATING))

    ip = os.path.join(SRC, 'index.css')
    index = io.open(ip, encoding='utf-8').read()
    if 'patterns/rating.css' not in index:
        anchor = next(l for l in index.splitlines()
                      if 'patterns/notice.css' in l and '@import' in l)
        index = index.replace(anchor,
                              anchor + '\n@import url("patterns/rating.css")  layer(patterns);', 1)
        io.open(ip, 'w', encoding='utf-8', newline='\n').write(index)
        print('index.css: registered patterns/rating.css')

    declared = set()
    for dp, _, names in os.walk(SRC):
        for n in names:
            if n.endswith('.css'):
                t = io.open(os.path.join(dp, n), encoding='utf-8').read()
                declared |= set(re.findall(r'^\s*(--[a-z0-9-]+)\s*:', t, re.M))
    missing = sorted({m for m in re.findall(r'var\(\s*(--[a-z0-9-]+)\s*\)', RATING)
                      if m not in declared})
    if missing:
        print('MISSING TOKENS: ' + ', '.join(missing))
        raise SystemExit(1)
    print('token check: ok')


main()
