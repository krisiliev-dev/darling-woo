"""Three small patterns at once: quantity, badge, panel.

All three were captured on the seeded cart and checkout, so none of them is
written against a guessed class name:

  quantity  div.wc-block-components-quantity-selector
              input.…__input
              button.…__button--minus  "-"
              button.…__button--plus   "+"
            The BUTTONS COME AFTER THE INPUT in source order, which is why the
            minus cannot simply be the first flex child.
  panel     div.wc-block-components-totals-coupon.wc-block-components-panel
              div.wc-block-components-panel__button
                svg.wc-block-components-panel__button-icon
  badge     the sale badge on a product card, plus our own chip

They are grouped in one pass because each is under a hundred lines and all three
appear on the same two pages; splitting them would mean three builds and three
verifications of the same surface.
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _place import guard   # refuses to clobber a component that has moved on

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

FILES = {}

FILES['quantity'] = '''/* =============================================================================
   PATTERN / QUANTITY
   The stepper in a cart row and on a product page.

   *** THE INPUT IS THE CONTROL; THE BUTTONS ARE A CONVENIENCE. ***
   Somebody typing 12 must not have to press + eleven times, and somebody on a
   phone must not have to hit a 20px arrow. So the field stays a real number
   input and the buttons sit either side of it at a full touch target.

   *** 44px MINIMUM, AND THAT IS NOT A STYLE CHOICE. ***
   These two buttons are the smallest things anyone taps in the whole purchase.
   Woo's own are around 28px; below about 44 the miss rate climbs steeply and a
   miss here means changing a quantity you did not mean to change.
   ========================================================================== */

.d-qty{
	display:inline-grid;
	grid-template-columns:auto 3.2em auto;
	align-items:stretch;
	border:1px solid var(--edge-field);
	border-radius:var(--radius-pill);
	background:var(--surface-raised);
	overflow:hidden;
	transition:border-color var(--dur-ui) var(--ease-float),
	           box-shadow var(--dur-ui) var(--ease-float);
}
.d-qty:focus-within{
	border-color:var(--c-cocoa);
	box-shadow:0 0 0 3px color-mix(in oklab, var(--c-cocoa) 22%, transparent);
}
.d-qty__button{
	appearance:none;
	border:0;
	background:none;
	min-width:2.6em;
	min-height:2.6em;
	padding:0;
	font:var(--fw-medium) var(--fs-lede)/1 var(--font-ui);
	color:var(--c-cocoa);
	cursor:pointer;
	transition:background var(--dur-ui) var(--ease-float);
}
.d-qty__button:hover{ background:var(--surface-quiet) }
.d-qty__button:disabled{ color:var(--ink-placeholder); cursor:not-allowed; background:none }
.d-qty__input{
	appearance:none;
	border:0;
	background:none;
	text-align:center;
	font:var(--type-body);
	color:var(--c-cocoa);
	font-variant-numeric:tabular-nums;
	padding:0;
	min-width:0;
}
/* The spinners are removed because we drew the buttons; leaving both gives two
   different ways to change the same number, one of them 12px tall. */
.d-qty__input::-webkit-outer-spin-button,
.d-qty__input::-webkit-inner-spin-button{ appearance:none; margin:0 }
.d-qty__input[type="number"]{ -moz-appearance:textfield }

/* -- ADOPTED: WooCommerce -------------------------------------------------- */
.wc-block-components-quantity-selector.wc-block-components-quantity-selector{
	display:inline-grid;
	grid-template-columns:auto 3.2em auto;
	grid-template-areas:"minus input plus";
	align-items:stretch;
	width:auto;
	min-width:0;
	border:1px solid var(--edge-field);
	border-radius:var(--radius-pill);
	background:var(--surface-raised);
	overflow:hidden;
}
.wc-block-components-quantity-selector.wc-block-components-quantity-selector::after{
	content:none;   /* Woo draws a divider here; the pill needs no seam */
}
.wc-block-components-quantity-selector:focus-within{
	border-color:var(--c-cocoa);
	box-shadow:0 0 0 3px color-mix(in oklab, var(--c-cocoa) 22%, transparent);
}
/* *** THE BUTTONS COME AFTER THE INPUT IN THE SOURCE. ***
   Captured, not assumed - the minus is not the first child, so grid areas do
   the ordering rather than flex order, which keeps the tab sequence matching
   the visual one. */
.wc-block-components-quantity-selector__input.wc-block-components-quantity-selector__input{
	grid-area:input;
	border:0;
	background:none;
	text-align:center;
	font:var(--type-body);
	color:var(--c-cocoa);
	font-variant-numeric:tabular-nums;
	padding:0;
	min-width:0;
}
.wc-block-components-quantity-selector__button.wc-block-components-quantity-selector__button{
	border:0;
	background:none;
	min-width:2.6em;
	min-height:2.6em;
	padding:0;
	font:var(--fw-medium) var(--fs-lede)/1 var(--font-ui);
	color:var(--c-cocoa);
	opacity:1;
	cursor:pointer;
}
.wc-block-components-quantity-selector__button--minus{ grid-area:minus }
.wc-block-components-quantity-selector__button--plus{ grid-area:plus }
.wc-block-components-quantity-selector__button:hover{ background:var(--surface-quiet) }
.wc-block-components-quantity-selector__button:disabled{
	color:var(--ink-placeholder);
	cursor:not-allowed;
	background:none;
}

/* the classic quantity box, on the product page */
.woocommerce .quantity input.qty{
	width:4.4em;
	min-height:2.9em;
	padding:.5em;
	text-align:center;
	font:var(--type-body);
	color:var(--c-cocoa);
	font-variant-numeric:tabular-nums;
	background:var(--surface-raised);
	border:1px solid var(--edge-field);
	border-radius:var(--radius-pill);
}
'''

FILES['badge'] = '''/* =============================================================================
   PATTERN / BADGE
   A short, loud label attached to something else.

   *** A BADGE IS NOT A BUTTON. ***
   It is never clickable and it never looks it: no shadow, no lift, no pointer.
   The one on a product card sits over a photograph, so it carries the scrim -
   the single non-text use of cocoa in the system - because a tint alone
   disappears on a light image.

   Three, and no more: neutral, sale, and the plywood chip. Anything that needs
   a fourth is asking for a notice.
   ========================================================================== */

.d-badge{
	display:inline-flex;
	align-items:center;
	gap:.35em;
	padding:.34em .7em;
	border-radius:var(--radius-pill);
	font:var(--fw-bold) var(--fs-badge)/var(--lh-flush) var(--font-ui);
	letter-spacing:.02em;
	white-space:nowrap;
	background:var(--surface-quiet);
	color:var(--ink);
}
.d-badge--sale{ background:var(--c-cherry); color:var(--c-white) }
.d-badge--quiet{ background:transparent; color:var(--ink-quiet);
	box-shadow:inset 0 0 0 1px var(--edge-field) }
/* Over a photograph. The scrim is the one non-text use of cocoa. */
.d-badge--on-image{ background:var(--scrim); color:var(--ink-on-dark) }
/* And the plywood one, which is .d-badge plus .d-finish - no extra colour
   rules, because the finish owns its own surface. */
.d-badge.d-finish{ --firefly-reach:.7em; color:var(--ink) }

/* -- ADOPTED ---------------------------------------------------------------- */
.wc-block-components-product-sale-badge.wc-block-components-product-sale-badge,
.wc-block-grid__product-onsale,
.woocommerce span.onsale{
	position:absolute;
	top:var(--space-2xs);
	left:var(--space-2xs);
	right:auto;
	min-width:0;
	min-height:0;
	margin:0;
	padding:.34em .7em;
	border-radius:var(--radius-pill);
	font:var(--fw-bold) var(--fs-badge)/var(--lh-flush) var(--font-ui);
	background:var(--c-cherry);
	color:var(--c-white);
	line-height:var(--lh-flush);
}
'''

FILES['panel'] = '''/* =============================================================================
   PATTERN / PANEL
   A heading you can press, and content that opens under it.

   *** IT IS A BUTTON, NOT A DIV WITH A CLICK HANDLER. ***
   The coupon panel on the checkout is the clearest case: someone arriving with
   a discount code and unable to reach the field by keyboard simply does not
   complete the order. Where we own the markup this is <details>/<summary>,
   which is a real disclosure widget with no script at all.

   The marker rotates rather than swapping glyph, so the state change is
   continuous and the same element stays under the cursor.
   ========================================================================== */

.d-panel{
	border:1px solid var(--edge-field);
	border-radius:var(--radius-m);
	background:var(--surface-raised);
	overflow:hidden;
}
.d-panel + .d-panel{ margin-top:var(--space-2xs) }

.d-panel__summary{
	display:grid;
	grid-template-columns:1fr auto;
	align-items:center;
	gap:var(--inline);
	padding:var(--space-2xs) var(--space-xs);
	cursor:pointer;
	font:var(--fw-medium) var(--fs-meta)/var(--lh-title) var(--font-ui);
	color:var(--c-cocoa);
	list-style:none;
	transition:background var(--dur-ui) var(--ease-float);
}
.d-panel__summary::-webkit-details-marker{ display:none }
.d-panel__summary:hover{ background:var(--surface-quiet) }
.d-panel__summary:focus-visible{
	outline:2px solid var(--c-cocoa);
	outline-offset:-2px;
}
/* The marker: a chevron drawn from two borders, so it needs no font and no SVG
   and rotates cleanly about its own centre. */
.d-panel__summary::after{
	content:"";
	width:.5em;
	height:.5em;
	margin-top:-.18em;
	border-right:2px solid var(--ink-quiet);
	border-bottom:2px solid var(--ink-quiet);
	transform:rotate(45deg);
	transition:transform 220ms var(--ease-float);
}
.d-panel[open] > .d-panel__summary::after{
	transform:rotate(-135deg);
	margin-top:.1em;
}
.d-panel__content{
	padding:0 var(--space-xs) var(--space-2xs);
	font-size:var(--fs-meta);
	color:var(--ink);
}

/* -- ADOPTED: the coupon panel and the order summary ------------------------ */
.wc-block-components-panel.wc-block-components-panel{
	border:1px solid var(--edge-field);
	border-radius:var(--radius-m);
	background:var(--surface-raised);
	padding:0;
	overflow:hidden;
}
.wc-block-components-panel__button.wc-block-components-panel__button{
	display:grid;
	grid-template-columns:1fr auto;
	align-items:center;
	gap:var(--inline);
	width:100%;
	padding:var(--space-2xs) var(--space-xs);
	margin:0;
	border:0;
	background:none;
	font:var(--fw-medium) var(--fs-meta)/var(--lh-title) var(--font-ui);
	color:var(--c-cocoa);
	text-align:left;
	cursor:pointer;
}
.wc-block-components-panel__button:hover{ background:var(--surface-quiet) }
.wc-block-components-panel__button-icon{
	fill:var(--ink-quiet);
	transition:transform 220ms var(--ease-float);
}
.wc-block-components-panel__content{
	padding:0 var(--space-xs) var(--space-2xs);
	font-size:var(--fs-meta);
}
.wc-block-components-totals-wrapper{
	padding:var(--space-2xs) 0;
	border-top:1px solid var(--hairline);
}
.wc-block-components-totals-wrapper:first-child{ border-top:0 }
.wc-block-components-totals-item.wc-block-components-totals-item{
	display:grid;
	grid-template-columns:1fr auto;
	align-items:baseline;
	gap:var(--inline);
	padding:.18em 0;
	font-size:var(--fs-meta);
}
.wc-block-components-totals-item__label{ color:var(--ink-quiet) }
.wc-block-components-totals-item__value{
	font-variant-numeric:tabular-nums;
	white-space:nowrap;
	color:var(--ink);
}
.wc-block-components-totals-footer-item .wc-block-components-totals-item__label,
.wc-block-components-totals-footer-item .wc-block-components-totals-item__value{
	font-weight:var(--fw-bold);
	font-size:var(--fs-lede);
	color:var(--ink);
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
        print('wrote  patterns/%-12s %5d bytes' % (name + '.css', len(css)))
        needle = 'patterns/%s.css' % name
        if needle not in index:
            anchor = next(l for l in index.splitlines()
                          if 'patterns/table.css' in l and '@import' in l)
            index = index.replace(
                anchor, anchor + '\n@import url("patterns/%s.css")%s layer(patterns);'
                % (name, ' ' * max(1, 10 - len(name))), 1)
            print('index.css: + ' + needle)
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
