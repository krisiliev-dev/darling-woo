"""Write patterns/card.css into src/ and register it in index.css.

Same shape as place_patterns.py: idempotent, ASCII only, and it re-runs the
token check so a card that references a token nobody declared fails here rather
than shipping as a silent inherit.
"""
import io, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

CARD = '''/* =============================================================================
   PATTERN / CARD
   A product card, and the generic card it is a special case of.

   *** THIS PATTERN ADOPTS WOOCOMMERCE'S CLASS NAMES ON PURPOSE. ***
   The product grid is a block, rendered by WooCommerce. There is no template to
   edit and no filter that reaches the class attribute, so we cannot put .d-card
   on it. A pattern that intends to REPLACE Woo's stylesheet therefore has to
   answer to Woo's selectors as well as its own, and the only honest way to write
   those selectors is against the real DOM. Read off the live shop page,
   2026-08-08:

     li.wp-block-post.product
       div.wc-block-components-product-image.wp-block-woocommerce-product-image
         a > img
       h2.wp-block-post-title > a
       div.wp-block-woocommerce-product-price
         div.wc-block-components-product-price
       div.wp-block-button.wc-block-components-product-button
         button.wp-block-button__link.wc-block-components-product-button__button

   Note what is NOT there: no wrapper around title+price+button, no rating, no
   excerpt. Anything this pattern needs that the block does not emit has to come
   from a block template change, not from CSS. That is why the body is a grid on
   the card itself rather than a .d-card__body element - there is nothing to put
   the class on.

   The adopted selectors are listed in one block at the bottom so that when a
   Woo update renames one, there is a single place to look, and so that
   collide.js has something specific to check.
   ========================================================================== */

.d-card{
	position:relative;
	display:grid;
	grid-template-rows:auto auto 1fr auto;
	gap:var(--stack-tight);
	padding:var(--space-2xs);
	background:var(--surface-raised);
	border-radius:var(--radius-l);
	box-shadow:0 1px 0 var(--hairline), 0 8px 20px rgb(0 0 0 / .06);
	color:var(--ink);
	overflow:hidden;
}

/* The media well. aspect-ratio rather than a padding hack, so a missing image
   still reserves its space and the grid does not reflow when it loads - which
   is the whole of our CLS budget on the shop page. */
.d-card__media{
	position:relative;
	aspect-ratio:4 / 3;
	border-radius:var(--radius-s);
	background:var(--placeholder-product);
	overflow:hidden;
}
.d-card__media img{
	width:100%;
	height:100%;
	object-fit:cover;
}

.d-card__title{
	font:var(--fw-medium) var(--fs-ui)/var(--lh-title) var(--font-ui);
	margin:0;
	color:var(--ink);
	/* Two lines, then ellipsis: a three-line title on one card and a one-line
	   title on its neighbour makes a grid of cards look broken, and truncating
	   is kinder than letting the row grow. */
	display:-webkit-box;
	-webkit-line-clamp:2;
	-webkit-box-orient:vertical;
	overflow:hidden;
}
.d-card__title a{ text-decoration:none; color:inherit }
.d-card__title a:hover{ text-decoration:underline }

.d-card__price{
	font-family:var(--font-ui);
	font-weight:var(--fw-bold);
	font-variant-numeric:tabular-nums;
	color:var(--price);
}
.d-card__price del{ font-size:.72em; font-weight:var(--fw-regular); color:var(--ink-quiet) }
.d-card__price ins{ text-decoration:none }

.d-card__meta{ font-size:var(--fs-fine); color:var(--ink-quiet) }

/* The plywood accent. The owner: "having each product card have its unique
   plywood accent seems like a detail that I want to have." --still because a
   grid of 24 cards is past the frame budget for the breathing glow, and
   --firefly-reach:0 because a 3px rule has no room for a swarm. */
.d-card__accent{
	height:var(--radius-rule);
	border-radius:var(--radius-rule);
	--grain-size:60px;
	--firefly-reach:0em;
}

/* A badge sits over the media, so it needs the scrim behind it on a light
   photo. This is the one non-text use of cocoa in the system. */
.d-card__badge{
	position:absolute;
	top:var(--space-2xs);
	left:var(--space-2xs);
	z-index:3;
	font:var(--fw-bold) var(--fs-badge)/var(--lh-flush) var(--font-ui);
	padding:.34em .7em;
	border-radius:var(--radius-pill);
	background:var(--scrim);
	color:var(--ink-on-dark);
}

.d-card--flat{ box-shadow:inset 0 0 0 1px var(--hairline); background:var(--surface-page) }
.d-card--quiet{ background:var(--surface-quiet) }

/* -- ADOPTED: WooCommerce's product grid ------------------------------------
   Everything below styles markup we do not emit. Keep it to this block. */
li.wp-block-post.product,
li.product{
	position:relative;
	display:grid;
	grid-template-rows:auto auto 1fr auto;
	gap:var(--stack-tight);
	padding:var(--space-2xs);
	margin:0;
	list-style:none;
	background:var(--surface-raised);
	border-radius:var(--radius-l);
	box-shadow:0 1px 0 var(--hairline), 0 8px 20px rgb(0 0 0 / .06);
	overflow:hidden;
}
li.product .wc-block-components-product-image{
	aspect-ratio:4 / 3;
	border-radius:var(--radius-s);
	background:var(--placeholder-product);
	overflow:hidden;
	margin:0;
}
li.product .wc-block-components-product-image img{
	width:100%; height:100%; object-fit:cover;
}
li.product .wp-block-post-title{
	font:var(--fw-medium) var(--fs-ui)/var(--lh-title) var(--font-ui);
	margin:0;
	color:var(--ink);
	display:-webkit-box;
	-webkit-line-clamp:2;
	-webkit-box-orient:vertical;
	overflow:hidden;
}
li.product .wp-block-post-title a{ text-decoration:none; color:inherit }
li.product .wc-block-components-product-price{
	font-family:var(--font-ui);
	font-weight:var(--fw-bold);
	font-variant-numeric:tabular-nums;
	color:var(--price);
}
/* The add-to-cart button. *** ONE OF THE TWO SELECTORS THAT BEAT US IN THE
   LAYER TEST. *** Woo sets display, padding, width, line-height, font-size,
   font-weight, background and colour on it from an unlayered sheet, so these
   nine properties are the ones the unlayered override block has to re-assert
   until wc-blocks-style-all-products is dequeued. Everything else here wins
   from inside the layer. */
li.product .wc-block-components-product-button__button,
li.product .wp-block-button__link{
	display:inline-flex;
	align-items:center;
	justify-content:center;
	width:100%;
	font:var(--type-ui);
	font-weight:var(--fw-medium);
	line-height:var(--lh-flush);
	padding:.72em 1.5em;
	border:0;
	border-radius:var(--radius-pill);
	background:var(--action);
	color:var(--action-ink);
	cursor:pointer;
}
'''

IMPORT = ('patterns/card.css', '@import url("patterns/card.css")    layer(patterns);')


def main():
    path = os.path.join(SRC, 'patterns', 'card.css')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    assert all(ord(c) < 128 for c in CARD)
    io.open(path, 'w', encoding='ascii', newline='\n').write(CARD)
    print('wrote  patterns/card.css %5d bytes' % len(CARD))

    ip = os.path.join(SRC, 'index.css')
    index = io.open(ip, encoding='utf-8').read()
    if IMPORT[0] not in index:
        anchor = next(l for l in index.splitlines()
                      if 'patterns/button.css' in l and '@import' in l)
        index = index.replace(anchor, anchor + '\n' + IMPORT[1], 1)
        io.open(ip, 'w', encoding='utf-8', newline='\n').write(index)
        print('index.css: registered patterns/card.css')
    else:
        print('index.css: already registered')

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
