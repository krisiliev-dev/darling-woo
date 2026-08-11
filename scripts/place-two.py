"""The last two of the ten: pagination and skeleton.

pagination  .woocommerce nav.woocommerce-pagination ul.page-numbers
              li > a.page-numbers / span.page-numbers.current / .next / .prev / .dots
            plus the block grid's .wc-block-pagination.
skeleton    .is-loading and .wc-block-components-skeleton, which WooCommerce puts
            on the cart, the checkout and the product grid while they hydrate.

*** THE SKELETON HAS TO WORK WITH ITS ANIMATION SWITCHED OFF. ***
motion.css kills every animation on cart, checkout and order-received and under
prefers-reduced-motion - and those are exactly the pages that show skeletons.
So the shimmer is a bonus and the resting tone is the actual design. A skeleton
that is only a moving highlight over the page colour is invisible on the one
page it exists for.
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _place import guard   # refuses to clobber a component that has moved on

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

FILES = {}

FILES['pagination'] = '''/* =============================================================================
   PATTERN / PAGINATION

   *** THE CURRENT PAGE IS A STATE, NOT AN ACTION. ***
   So it is cocoa, not amber. Amber means "do this"; filling the page you are
   already on with the same colour as the buy button teaches people that amber
   sometimes means nothing.

   *** EVERY TARGET IS 44px. ***
   These sit at the bottom of a long scroll, are used most on a phone, and are
   the last thing between someone and the rest of the catalogue.

   The ellipsis is not a link and never looks like one. It has no border, no
   hover and no cursor, because a target that does nothing when pressed is worse
   than no target.
   ========================================================================== */

.d-pagination{
	display:flex;
	flex-wrap:wrap;
	align-items:center;
	gap:var(--space-3xs);
	margin:var(--section-y) 0;
	font-size:var(--fs-meta);
}
.d-pagination__item{
	display:grid;
	place-items:center;
	min-width:2.75em;
	min-height:2.75em;
	padding:0 .55em;
	border-radius:var(--radius-pill);
	color:var(--c-cocoa);
	text-decoration:none;
	font-variant-numeric:tabular-nums;
	transition:background var(--dur-ui) var(--ease-float),
	           color var(--dur-ui) var(--ease-float);
}
.d-pagination__item:hover{ background:var(--surface-quiet) }
.d-pagination__item:focus-visible{
	outline:2px solid var(--c-cocoa);
	outline-offset:2px;
}
.d-pagination__item--current{
	background:var(--c-cocoa);
	color:var(--ink-on-dark);
	font-weight:var(--fw-medium);
	cursor:default;
}
.d-pagination__item--current:hover{ background:var(--c-cocoa) }
/* Not a link. No border, no hover, no cursor. */
.d-pagination__dots{
	display:grid;
	place-items:center;
	min-width:1.6em;
	min-height:2.75em;
	color:var(--ink-quiet);
	user-select:none;
}
/* Prev and next carry a drawn chevron rather than a glyph, for the same reason
   the stars are drawn: an arrow character is missing from more fonts than
   people expect and falls back to a box. */
.d-pagination__item--prev::before,
.d-pagination__item--next::before{
	content:"";
	width:.46em;
	height:.46em;
	border-right:2px solid currentColor;
	border-bottom:2px solid currentColor;
}
.d-pagination__item--prev::before{ transform:rotate(135deg); margin-left:.2em }
.d-pagination__item--next::before{ transform:rotate(-45deg); margin-right:.2em }
.d-pagination__item[aria-disabled="true"]{
	color:var(--ink-placeholder);
	pointer-events:none;
}

/* -- ADOPTED: WooCommerce ---------------------------------------------------- */
.woocommerce nav.woocommerce-pagination ul,
.woocommerce nav.woocommerce-pagination ul li{
	border:0;
	margin:0;
	padding:0;
}
.woocommerce nav.woocommerce-pagination ul{
	display:flex;
	flex-wrap:wrap;
	align-items:center;
	gap:var(--space-3xs);
	justify-content:center;
}
.woocommerce nav.woocommerce-pagination ul li a.page-numbers,
.woocommerce nav.woocommerce-pagination ul li span.page-numbers,
.wc-block-pagination-page{
	display:grid;
	place-items:center;
	min-width:2.75em;
	min-height:2.75em;
	padding:0 .55em;
	border:0;
	border-radius:var(--radius-pill);
	background:none;
	color:var(--c-cocoa);
	font-size:var(--fs-meta);
	font-variant-numeric:tabular-nums;
	text-decoration:none;
}
.woocommerce nav.woocommerce-pagination ul li a.page-numbers:hover,
.wc-block-pagination-page:hover{
	background:var(--surface-quiet);
	color:var(--c-cocoa);
}
.woocommerce nav.woocommerce-pagination ul li span.page-numbers.current,
.wc-block-pagination-page--active{
	background:var(--c-cocoa);
	color:var(--ink-on-dark);
	font-weight:var(--fw-medium);
}
.woocommerce nav.woocommerce-pagination ul li span.page-numbers.dots{
	background:none;
	color:var(--ink-quiet);
	min-width:1.6em;
}
'''

FILES['skeleton'] = '''/* =============================================================================
   PATTERN / SKELETON
   The shape of content that has not arrived.

   *** IT MUST READ WITH THE ANIMATION SWITCHED OFF. ***
   motion.css kills every animation on cart, checkout and order-received, and
   under prefers-reduced-motion - and those are precisely the pages that show
   skeletons. So the resting tone IS the design and the shimmer is a bonus. A
   skeleton built as nothing but a moving highlight is invisible on the one page
   it exists for.

   *** IT IS THE SHAPE OF THE THING, NOT A GREY BOX. ***
   A skeleton whose proportions do not match what replaces it causes a jump on
   arrival, which is worse than a blank space: the eye had already settled.

   *** AND IT IS ANNOUNCED. *** aria-hidden on the shape, aria-busy on the
   region. A screen reader should hear "loading", not a list of empty
   paragraphs.
   ========================================================================== */

.d-skeleton{
	position:relative;
	display:block;
	overflow:hidden;
	border-radius:var(--radius-s);
	/* The resting tone. Two steps darker than the surface it sits on, so it is
	   visible without the shimmer. */
	background:var(--c-grey-300);
}
.d-skeleton--text{
	height:.85em;
	margin:.34em 0;
	border-radius:var(--radius-pill);
}
.d-skeleton--text:last-child{ width:62% }   /* a paragraph never ends flush */
.d-skeleton--title{ height:1.3em; width:52%; border-radius:var(--radius-pill) }
.d-skeleton--media{ aspect-ratio:4 / 3; border-radius:var(--radius-s) }
.d-skeleton--pill{ height:2.6em; border-radius:var(--radius-pill) }
.d-skeleton--circle{ aspect-ratio:1; border-radius:var(--radius-circle) }

/* The shimmer. A TRANSFORM on a pseudo-element, not an animated background
   position: transform is composited, and a skeleton grid is the worst possible
   place to repaint twenty elements every frame - the page is already busy
   fetching the thing the skeleton stands in for. */
.d-skeleton::after{
	content:"";
	position:absolute;
	inset:0;
	transform:translateX(-100%);
	background:linear-gradient(90deg,
		transparent 0%,
		color-mix(in oklab, var(--c-white) 55%, transparent) 50%,
		transparent 100%);
	animation:d-skeleton-sweep 1.6s var(--ease-float) infinite;
}
@keyframes d-skeleton-sweep{
	0%   { transform:translateX(-100%) }
	60%  { transform:translateX(100%) }
	100% { transform:translateX(100%) }
}

/* -- ADOPTED: WooCommerce's loading states ---------------------------------- */
.wc-block-components-skeleton__element,
.wc-block-components-skeleton .wc-block-components-skeleton__element{
	position:relative;
	overflow:hidden;
	border-radius:var(--radius-s);
	background:var(--c-grey-300);
}
/* Woo dims a whole region while it refreshes. Dim it, do not hide it: the
   numbers underneath are still the last true ones and hiding them makes a cart
   feel like it lost the order. */
.wc-block-components-loading-mask{
	position:relative;
	opacity:.55;
	pointer-events:none;
	transition:opacity var(--dur-ui) var(--ease-float);
}
.wc-block-components-loading-mask .wc-block-components-spinner{
	color:var(--c-cocoa);
}
.is-loading .wc-block-components-product-title,
.is-loading .wc-block-components-product-price{
	color:transparent;
	background:var(--c-grey-300);
	border-radius:var(--radius-pill);
}
'''


def main():
    ip = os.path.join(SRC, 'index.css')
    index = io.open(ip, encoding='utf-8').read()
    for name, css in FILES.items():
        p = os.path.join(SRC, 'patterns', name + '.css')
        assert all(ord(c) < 128 for c in css), name
        assert css.count('/*') == css.count('*/'), (name, css.count('/*'), css.count('*/'))
        guard(p, css)
        io.open(p, 'w', encoding='ascii', newline='\n').write(css)
        print('wrote  patterns/%-14s %5d bytes' % (name + '.css', len(css)))
        if ('patterns/%s.css' % name) not in index:
            anchor = next(l for l in index.splitlines()
                          if 'patterns/table.css' in l and '@import' in l)
            index = index.replace(
                anchor, anchor + '\n@import url("patterns/%s.css") layer(patterns);' % name, 1)
            print('index.css: + patterns/%s.css' % name)
    guard(ip, index)
    io.open(ip, 'w', encoding='utf-8', newline='\n').write(index)

    declared = set()
    for dp, _, names in os.walk(SRC):
        for n in names:
            if n.endswith('.css'):
                t = io.open(os.path.join(dp, n), encoding='utf-8').read()
                declared |= set(re.findall(r'^\s*(--[a-z0-9-]+)\s*:', t, re.M))
    missing = set()
    for css in FILES.values():
        body = re.sub(r'/\*[\s\S]*?\*/', '', css)
        missing |= {m for m in re.findall(r'var\(\s*(--[a-z0-9-]+)\s*\)', body)
                    if m not in declared}
    if missing:
        print('MISSING TOKENS: ' + ', '.join(sorted(missing)))
        raise SystemExit(1)
    print('token check: ok')


main()
