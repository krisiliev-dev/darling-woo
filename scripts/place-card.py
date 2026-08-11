"""Card, revision 2 - the owner's review of 2026-08-08.

  keep    the plywood accent rule where it is
  change  the badge becomes the amber .d-finish chip, not a cocoa scrim
  change  no underline on the title; the WHOLE CARD is the hover target
  add     on hover the image zooms slightly and the product itself glows
  change  price moves to the right of the title; on a discount the old price
          stays on the right and the new one sits below it
  add     a cherry button in the price row
  fix     flat and quiet were invisible against the grey page

Also adds the two semantic colour tokens the cherry button needs. Components
consume semantics, never primitives, so `background: var(--c-cherry)` in a
pattern would be the rule this system exists to enforce being broken in the
first component that wanted a second accent.
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _place import guard   # refuses to clobber a component that has moved on

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

COLOUR_TOKENS = '''
	/* -- the second action ---------------------------------------------------
	   Amber is "look at this"; cherry is "put it in the basket". Two accents is
	   the most a page can carry, and they must never appear on the same control.
	   MEASURED: cherry #D42A3C against white is 4.99:1, which clears AA for the
	   15px semibold label. cherry-deep is the fallback if the label ever gets
	   smaller or lighter - do not switch the ink to cocoa, that measures 3.1:1. */
	--action-cart: var(--c-cherry);
	--action-cart-ink: var(--c-white);
'''

CARD = '''/* =============================================================================
   PATTERN / CARD
   A product card, and the generic card it is a special case of.

   *** THIS PATTERN ADOPTS WOOCOMMERCE'S CLASS NAMES ON PURPOSE. ***
   The product grid is a block rendered by WooCommerce. There is no template to
   edit and no filter that reaches the class attribute, so we cannot put .d-card
   on it. A pattern meant to REPLACE Woo's stylesheet therefore has to answer to
   Woo's selectors as well as its own, and the only honest way to write those is
   against the real DOM. Read off the live shop page, 2026-08-08:

     li.wp-block-post.product
       div.wc-block-components-product-image.wp-block-woocommerce-product-image
         a > img
       h2.wp-block-post-title > a
       div.wp-block-woocommerce-product-price
         div.wc-block-components-product-price
       div.wp-block-button.wc-block-components-product-button
         button.wp-block-button__link.wc-block-components-product-button__button

   Note what is NOT there: no wrapper around title+price+button, no rating, no
   excerpt. Anything the card needs that the block does not emit has to come from
   a block template change, not from CSS.
   ========================================================================== */

.d-card{
	position:relative;
	display:grid;
	grid-template-columns:1fr auto;
	grid-template-areas:
		"media  media"
		"accent accent"
		"title  price"
		"cta    cta";
	align-items:start;
	column-gap:var(--inline);
	row-gap:var(--stack-tight);
	padding:var(--space-2xs);
	background:var(--surface-raised);
	border-radius:var(--radius-l);
	box-shadow:0 1px 0 var(--hairline), 0 8px 20px rgb(0 0 0 / .06);
	color:var(--ink);
	transition:box-shadow var(--dur-ui) var(--ease-float),
	           transform var(--dur-ui) var(--ease-float);
}

/* -- the whole card is the hover target ------------------------------------
   The owner: "The hover should be for the whole card." So the title link
   stretches an invisible ::after over the entire card, which makes the whole
   surface clickable AND keeps exactly one link in the accessibility tree -
   wrapping the card in an <a> would put the image, the price and the button
   inside the link text, and a screen reader would read all of it as the link
   name. position:relative on .d-card is what anchors it. */
.d-card__title a::after{
	content:"";
	position:absolute;
	inset:0;
	z-index:2;
	border-radius:inherit;
}
.d-card:hover{ box-shadow:0 1px 0 var(--hairline), 0 14px 30px rgb(0 0 0 / .12) }

.d-card__media{
	grid-area:media;
	position:relative;
	aspect-ratio:4 / 3;
	border-radius:var(--radius-s);
	background:var(--placeholder-product);
	overflow:hidden;
}
.d-card__media img{
	width:100%;
	height:100%;
	object-fit:contain;
	transition:transform 420ms var(--ease-float), filter 420ms var(--ease-float);
}

/* *** THE GLOW FOLLOWS THE PRODUCT, NOT THE BOX. ***
   The owner asked whether a transparent product image can glow. It can, and
   drop-shadow is the reason: unlike box-shadow, which draws the element's
   rectangle, filter:drop-shadow reads the ALPHA CHANNEL and traces the actual
   silhouette. Two of them stack into a near halo - a tight bright one for the
   edge and a wide soft one for the spill.
   This only works on a cut-out. An image with an opaque background gets a
   rectangular glow and looks broken, so the licence register's "transparent
   PNG" column is now a rendering requirement, not a nicety.
   object-fit:contain, not cover, for the same reason: a cut-out must not be
   cropped. */
.d-card:hover .d-card__media img{
	transform:scale(1.06);
	filter:
		drop-shadow(0 0 6px hsl(from var(--g-light) h s l / .75))
		drop-shadow(0 0 22px hsl(from var(--g-core)  h s l / .55));
}

/* The plywood accent, kept where it is - owner reviewed and approved.
   --still because a grid of 24 cards is past the frame budget for the breathing
   glow, and --firefly-reach:0 because a 3px rule has no room for a swarm. */
.d-card__accent{
	grid-area:accent;
	height:var(--radius-rule);
	border-radius:var(--radius-rule);
	--grain-size:60px;
	--firefly-reach:0em;
}

.d-card__title{
	grid-area:title;
	font:var(--fw-medium) var(--fs-ui)/var(--lh-title) var(--font-ui);
	margin:0;
	color:var(--ink);
	/* Two lines then ellipsis: a three-line title beside a one-line one makes a
	   row look broken, and truncating is kinder than letting the row grow. */
	display:-webkit-box;
	-webkit-line-clamp:2;
	-webkit-box-orient:vertical;
	overflow:hidden;
}
/* No underline. The owner: "The text when hovered gets an underline, but I
   don't want it to." The card's shadow and the image are the hover feedback. */
.d-card__title a{ text-decoration:none; color:inherit }

/* -- price, to the right of the title --------------------------------------
   On a discount the old price stays on the right and the new one sits below it,
   so the right-hand column always starts at the same baseline as the title
   whether or not there is a discount. */
.d-card__price{
	grid-area:price;
	display:grid;
	justify-items:end;
	text-align:right;
	margin:0;
	font-family:var(--font-ui);
	font-weight:var(--fw-bold);
	font-variant-numeric:tabular-nums;
	color:var(--price);
	white-space:nowrap;
}
.d-card__price del{
	font-size:.74em;
	font-weight:var(--fw-regular);
	color:var(--ink-quiet);
}
.d-card__price ins{ text-decoration:none }

.d-card__meta{ grid-area:cta; font-size:var(--fs-fine); color:var(--ink-quiet) }

/* The basket button. Cherry, not amber: amber is "look at this", cherry is
   "put it in the basket", and a card should never show both. z-index clears the
   title link's ::after so the button stays clickable. */
.d-card__cta{
	grid-area:cta;
	position:relative;
	z-index:3;
	display:inline-flex;
	align-items:center;
	justify-content:center;
	width:100%;
	font:var(--type-ui);
	font-weight:var(--fw-medium);
	padding:.62em 1.2em;
	border:0;
	border-radius:var(--radius-pill);
	background:var(--action-cart);
	color:var(--action-cart-ink);
	cursor:pointer;
	transition:background var(--dur-ui) var(--ease-ui);
}
.d-card__cta:hover{ background:var(--c-cherry-deep) }

/* A chip over the media. THE PLYWOOD ONE - owner picked it over the cocoa
   scrim it used to be. It carries .d-finish, so it gets the ramp, the rim and
   its own piece of grain like every other finished object. */
.d-card__chip{
	position:absolute;
	top:var(--space-2xs);
	left:var(--space-2xs);
	z-index:3;
	font:var(--fw-bold) var(--fs-badge)/var(--lh-flush) var(--font-ui);
	padding:.4em .8em;
	border-radius:var(--radius-pill);
	--firefly-reach:.7em;
}

/* -- surfaces ---------------------------------------------------------------
   *** flat AND quiet WERE INVISIBLE AND THAT WAS NOT INTENDED. ***
   flat used --surface-page, which IS the page, so the card had no edge at all
   beyond a hairline too faint to see; quiet used --surface-quiet, one step of
   grey away from the page. A variant has to be legible as a variant. flat now
   states its edge properly, and quiet drops two steps instead of one. */
.d-card--flat{
	background:transparent;
	box-shadow:inset 0 0 0 1px var(--edge-field);
}
.d-card--flat:hover{ box-shadow:inset 0 0 0 1px var(--edge-field), 0 8px 20px rgb(0 0 0 / .08) }
.d-card--quiet{
	background:var(--c-grey-300);
	box-shadow:inset 0 0 0 1px var(--hairline);
}
.d-card--quiet:hover{ box-shadow:inset 0 0 0 1px var(--hairline), 0 10px 24px rgb(0 0 0 / .10) }

/* -- ADOPTED: WooCommerce's product grid ------------------------------------
   Everything below styles markup we do not emit. Keep it to this block so that
   when a Woo update renames a class there is one place to look. */
li.wp-block-post.product,
li.product{
	position:relative;
	display:grid;
	grid-template-columns:1fr auto;
	gap:var(--stack-tight) var(--inline);
	padding:var(--space-2xs);
	margin:0;
	list-style:none;
	background:var(--surface-raised);
	border-radius:var(--radius-l);
	box-shadow:0 1px 0 var(--hairline), 0 8px 20px rgb(0 0 0 / .06);
	overflow:hidden;
	transition:box-shadow var(--dur-ui) var(--ease-float);
}
li.product:hover{ box-shadow:0 1px 0 var(--hairline), 0 14px 30px rgb(0 0 0 / .12) }
li.product .wc-block-components-product-image{
	grid-column:1 / -1;
	aspect-ratio:4 / 3;
	border-radius:var(--radius-s);
	background:var(--placeholder-product);
	overflow:hidden;
	margin:0;
}
li.product .wc-block-components-product-image img{
	width:100%; height:100%; object-fit:contain;
	transition:transform 420ms var(--ease-float), filter 420ms var(--ease-float);
}
li.product:hover .wc-block-components-product-image img{
	transform:scale(1.06);
	filter:
		drop-shadow(0 0 6px hsl(from var(--g-light) h s l / .75))
		drop-shadow(0 0 22px hsl(from var(--g-core)  h s l / .55));
}
li.product .wp-block-post-title{
	grid-column:1;
	font:var(--fw-medium) var(--fs-ui)/var(--lh-title) var(--font-ui);
	margin:0;
	color:var(--ink);
	display:-webkit-box;
	-webkit-line-clamp:2;
	-webkit-box-orient:vertical;
	overflow:hidden;
}
li.product .wp-block-post-title a{ text-decoration:none; color:inherit }
li.product .wp-block-woocommerce-product-price{ grid-column:2; margin:0 }
li.product .wc-block-components-product-price{
	display:grid;
	justify-items:end;
	text-align:right;
	font-family:var(--font-ui);
	font-weight:var(--fw-bold);
	font-variant-numeric:tabular-nums;
	color:var(--price);
	white-space:nowrap;
}
li.product .wc-block-components-product-price del{
	font-size:.74em; font-weight:var(--fw-regular); color:var(--ink-quiet);
}
li.product .wp-block-button.wc-block-components-product-button{ grid-column:1 / -1; margin:0 }
/* *** ONE OF THE TWO SELECTORS THAT BEAT US IN THE LAYER TEST. ***
   Woo sets display, padding, width, line-height, font-size, font-weight,
   background and colour on this from an unlayered sheet, so these are the
   properties the unlayered override block re-asserts until
   wc-blocks-style-all-products is dequeued. Everything else here wins from
   inside the layer - verified on the live grid. */
li.product .wc-block-components-product-button__button,
li.product .wp-block-button__link{
	display:inline-flex;
	align-items:center;
	justify-content:center;
	width:100%;
	font:var(--type-ui);
	font-weight:var(--fw-medium);
	line-height:var(--lh-flush);
	padding:.62em 1.2em;
	border:0;
	border-radius:var(--radius-pill);
	background:var(--action-cart);
	color:var(--action-cart-ink);
	cursor:pointer;
}
'''


def main():
    cp = os.path.join(SRC, 'tokens', 'colour.css')
    colour = io.open(cp, encoding='utf-8').read()
    if '--action-cart' not in colour:
        i = colour.rindex('}')
        # put it back inside the last block that still has semantics in it
        colour = colour[:i] + COLOUR_TOKENS + colour[i:]
        guard(cp, colour)
        io.open(cp, 'w', encoding='utf-8', newline='\n').write(colour)
        print('colour.css: added --action-cart, --action-cart-ink')
    else:
        print('colour.css: --action-cart already present')

    path = os.path.join(SRC, 'patterns', 'card.css')
    assert all(ord(c) < 128 for c in CARD)
    guard(path, CARD)
    io.open(path, 'w', encoding='ascii', newline='\n').write(CARD)
    print('wrote  patterns/card.css %5d bytes' % len(CARD))

    declared = set()
    for dp, _, names in os.walk(SRC):
        for n in names:
            if n.endswith('.css'):
                t = io.open(os.path.join(dp, n), encoding='utf-8').read()
                declared |= set(re.findall(r'^\s*(--[a-z0-9-]+)\s*:', t, re.M))
                declared |= set(re.findall(r'@property\s+(--[a-z0-9-]+)', t))
    missing = sorted({m for m in re.findall(r'var\(\s*(--[a-z0-9-]+)\s*\)', CARD)
                      if m not in declared})
    if missing:
        print('MISSING TOKENS: ' + ', '.join(missing))
        raise SystemExit(1)
    print('token check: card.css references only declared tokens')


main()
