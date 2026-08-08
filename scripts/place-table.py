"""patterns/table.css - cart, orders, addresses, attributes.

Written against markup captured from the seeded cart on 2026-08-08:

  table.wc-block-cart-items
    caption.screen-reader-text > h2        <- a real caption, visually hidden
    thead > tr.wc-block-cart-items__header
      th.…__header-image / __header-product / __header-total
    tbody > tr.wc-block-cart-items__row
      td.wc-block-cart-item__image / __product / __total

*** THE BLOCK CART HAS NO data-title, THE CLASSIC TABLES DO. ***
That single difference decides how each one collapses on a phone. Classic Woo
puts data-title on every cell, so a stacked layout can label each value with
content:attr(data-title). The block cart does not, so its three columns have to
be re-laid with grid instead. Two mechanisms, because the markup gives us no
choice - and writing one and hoping it covers both is how a cart ends up
unreadable at 390px.

*** A TABLE IS ROWS, NOT A GRID OF BOXES. ***
Horizontal hairlines only. Vertical rules turn a price list into a spreadsheet,
and the eye already tracks a row without help.
"""
import io, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

TABLE = '''/* =============================================================================
   PATTERN / TABLE
   Cart, orders, addresses, product attributes.

   *** A TABLE IS ROWS, NOT A GRID OF BOXES. ***
   Horizontal hairlines only, no vertical rules. Vertical rules turn a price
   list into a spreadsheet, and the eye tracks a row perfectly well without
   them.

   *** NUMBERS ARE TABULAR AND RIGHT-ALIGNED, ALWAYS. ***
   A column of prices where the decimal points do not line up is unreadable at a
   glance, and the glance is the entire purpose of a totals column.

   *** ON A PHONE A TABLE STOPS BEING A TABLE. ***
   Horizontal scrolling inside a cart is how an order gets abandoned. Below the
   breakpoint every table collapses to stacked rows - see the two mechanisms in
   the adopted section, which are forced on us by the markup rather than chosen.
   ========================================================================== */

.d-table{
	width:100%;
	border-collapse:collapse;
	font-size:var(--fs-meta);
	color:var(--ink);
}
.d-table caption{
	text-align:left;
	font:var(--fw-medium) var(--fs-meta)/var(--lh-title) var(--font-ui);
	color:var(--ink-quiet);
	padding-bottom:var(--space-2xs);
}
.d-table th{
	text-align:left;
	font:var(--fw-medium) var(--fs-fine)/var(--lh-title) var(--font-ui);
	color:var(--ink-quiet);
	letter-spacing:.04em;
	padding:0 var(--space-2xs) var(--space-3xs);
	border-bottom:1px solid var(--hairline);
	white-space:nowrap;
}
.d-table td{
	padding:var(--space-2xs);
	border-bottom:1px solid var(--hairline);
	vertical-align:top;
}
.d-table tbody tr:last-child td{ border-bottom:0 }
.d-table th:first-child,
.d-table td:first-child{ padding-left:0 }
.d-table th:last-child,
.d-table td:last-child{ padding-right:0 }

/* Numbers. The class goes on the cell, not the column, because a table has no
   column element to hang it on. */
.d-table__num,
.d-table td.d-table__num{
	text-align:right;
	font-variant-numeric:tabular-nums;
	white-space:nowrap;
}
.d-table__total td{
	font-weight:var(--fw-bold);
	border-top:2px solid var(--hairline);
	border-bottom:0;
}
.d-table__muted{ color:var(--ink-quiet) }

/* Only where a row is a link or a control. A hover tint on a static price list
   promises an interaction that is not there. */
.d-table--rows tbody tr:hover{ background:var(--surface-quiet) }

/* -- stacked, for our own markup -------------------------------------------
   Each cell carries data-title and becomes a labelled line. */
@media (max-width: 600px){
	.d-table--stack thead{
		position:absolute;
		width:1px; height:1px;
		overflow:hidden;
		clip-path:inset(50%);
	}
	.d-table--stack tr{
		display:block;
		padding:var(--space-2xs) 0;
		border-bottom:1px solid var(--hairline);
	}
	.d-table--stack td{
		display:grid;
		grid-template-columns:1fr auto;
		gap:var(--inline);
		padding:.2em 0;
		border:0;
	}
	.d-table--stack td::before{
		content:attr(data-title);
		font-size:var(--fs-fine);
		color:var(--ink-quiet);
		/* The cell is right-aligned so the VALUE sits under the value above it.
		   The label must opt out of that or it drifts into the middle of the
		   row and stops reading as a label at all. */
		text-align:left;
	}
	.d-table--stack td.d-table__num{ text-align:right }
	/* The total is one line, not two: it is a single fact and splitting it
	   across rows makes the most important number on the page look like an
	   orphan. */
	.d-table--stack tfoot tr{ display:grid; grid-template-columns:1fr auto }
	.d-table--stack tfoot td{ display:block; padding:0 }
	.d-table--stack tfoot td::before{ content:none }
}

/* =============================================================================
   ADOPTED: WooCommerce's tables
   ========================================================================== */

/* -- the block cart --------------------------------------------------------
   Three columns: image, product, total. The caption is real and screen-reader
   only, which is correct and stays. Selectors are doubled because Woo styles
   these completely and the field pattern already proved that unlayered alone
   does not win - its rules carry an extra ancestor. */
.wc-block-cart-items.wc-block-cart-items{
	width:100%;
	border-collapse:collapse;
	font-size:var(--fs-meta);
	color:var(--ink);
}
.wc-block-cart-items.wc-block-cart-items th{
	text-align:left;
	font:var(--fw-medium) var(--fs-fine)/var(--lh-title) var(--font-ui);
	color:var(--ink-quiet);
	padding:0 var(--space-2xs) var(--space-3xs);
	border-bottom:1px solid var(--hairline);
}
.wc-block-cart-items.wc-block-cart-items td{
	padding:var(--space-xs) var(--space-2xs);
	border-top:0;
	border-bottom:1px solid var(--hairline);
	vertical-align:top;
}
.wc-block-cart-items.wc-block-cart-items tbody tr:last-child td{ border-bottom:0 }
.wc-block-cart-item__image.wc-block-cart-item__image{
	width:5.5em;
	padding-left:0;
}
.wc-block-cart-item__image img{
	width:100%;
	border-radius:var(--radius-s);
	background:var(--placeholder-product);
}
.wc-block-cart-items__header-total,
.wc-block-cart-item__total.wc-block-cart-item__total{
	text-align:right;
	padding-right:0;
	font-variant-numeric:tabular-nums;
	white-space:nowrap;
}
.wc-block-components-product-name{
	font:var(--fw-medium) var(--fs-ui)/var(--lh-title) var(--font-ui);
	color:var(--ink);
	text-decoration:none;
}
.wc-block-cart-item__product .wc-block-components-product-metadata{
	font-size:var(--fs-fine);
	color:var(--ink-quiet);
}

/* *** THE BLOCK CART HAS NO data-title, SO IT COLLAPSES WITH GRID. ***
   Captured and checked: its cells carry no attribute we could label a stacked
   row with. So the row becomes a two-column grid - image on the left spanning
   both lines, product and total stacked on the right - which needs no help from
   the markup at all. */
@media (max-width: 600px){
	.wc-block-cart-items.wc-block-cart-items thead{
		position:absolute;
		width:1px; height:1px;
		overflow:hidden;
		clip-path:inset(50%);
	}
	.wc-block-cart-items.wc-block-cart-items tr{
		display:grid;
		grid-template-columns:4.5em 1fr;
		grid-template-areas:"img prod" "img total";
		gap:.2em var(--space-2xs);
		padding:var(--space-2xs) 0;
		border-bottom:1px solid var(--hairline);
	}
	.wc-block-cart-items.wc-block-cart-items td{
		padding:0;
		border:0;
	}
	.wc-block-cart-item__image.wc-block-cart-item__image{ grid-area:img; width:auto }
	.wc-block-cart-item__product.wc-block-cart-item__product{ grid-area:prod }
	.wc-block-cart-item__total.wc-block-cart-item__total{ grid-area:total; text-align:left }
}

/* -- the classic tables: cart, orders, order details, addresses -------------
   These DO carry data-title on every cell, which is what makes a labelled
   stacked layout possible. */
.woocommerce table.shop_table,
.woocommerce-orders-table,
.woocommerce-table--order-details,
.woocommerce-table--customer-details{
	width:100%;
	border:0;
	border-collapse:collapse;
	border-radius:0;
	font-size:var(--fs-meta);
	color:var(--ink);
}
.woocommerce table.shop_table th,
.woocommerce-orders-table th,
.woocommerce-table--order-details th{
	text-align:left;
	font:var(--fw-medium) var(--fs-fine)/var(--lh-title) var(--font-ui);
	color:var(--ink-quiet);
	padding:0 var(--space-2xs) var(--space-3xs);
	border:0;
	border-bottom:1px solid var(--hairline);
}
.woocommerce table.shop_table td,
.woocommerce-orders-table td,
.woocommerce-table--order-details td{
	padding:var(--space-2xs);
	border:0;
	border-bottom:1px solid var(--hairline);
	vertical-align:top;
}
.woocommerce table.shop_table tfoot td,
.woocommerce table.shop_table tfoot th{
	font-weight:var(--fw-bold);
	border-bottom:0;
	border-top:2px solid var(--hairline);
}
.woocommerce table.shop_table .amount,
.woocommerce-orders-table .amount,
.woocommerce-table--order-details .amount{
	font-variant-numeric:tabular-nums;
	white-space:nowrap;
}
.woocommerce td.product-remove a.remove{
	display:grid;
	place-items:center;
	width:1.6em;
	height:1.6em;
	border-radius:var(--radius-circle);
	color:var(--c-cocoa);
	font-size:1.1em;
	text-decoration:none;
	transition:color var(--dur-ui) var(--ease-float),
	           background var(--dur-ui) var(--ease-float);
}
.woocommerce td.product-remove a.remove:hover{
	color:var(--c-claret);
	background:color-mix(in oklab, var(--c-claret) 10%, transparent);
}

/* -- product attributes: a description list wearing a table ---------------- */
.woocommerce table.shop_attributes{
	width:100%;
	border:0;
	border-collapse:collapse;
	font-size:var(--fs-meta);
}
.woocommerce table.shop_attributes th{
	width:34%;
	text-align:left;
	font:var(--fw-medium) var(--fs-meta)/var(--lh-body) var(--font-ui);
	color:var(--ink-quiet);
	padding:var(--space-2xs) var(--space-2xs) var(--space-2xs) 0;
	border:0;
	border-bottom:1px solid var(--hairline);
}
.woocommerce table.shop_attributes td{
	padding:var(--space-2xs) 0;
	border:0;
	border-bottom:1px solid var(--hairline);
	font-style:normal;   /* Woo italicises these, which reads as an aside */
	color:var(--ink);
}
.woocommerce table.shop_attributes tr:last-child th,
.woocommerce table.shop_attributes tr:last-child td{ border-bottom:0 }

@media (max-width: 600px){
	.woocommerce table.shop_table_responsive thead,
	.woocommerce-orders-table thead{
		position:absolute;
		width:1px; height:1px;
		overflow:hidden;
		clip-path:inset(50%);
	}
	.woocommerce table.shop_table_responsive tr,
	.woocommerce-orders-table tr{
		display:block;
		padding:var(--space-2xs) 0;
		border-bottom:1px solid var(--hairline);
	}
	.woocommerce table.shop_table_responsive td,
	.woocommerce-orders-table td{
		display:grid;
		grid-template-columns:1fr auto;
		gap:var(--inline);
		padding:.2em 0;
		border:0;
		text-align:right;
	}
	/* The label each cell already knows about itself. */
	.woocommerce table.shop_table_responsive td::before,
	.woocommerce-orders-table td::before{
		content:attr(data-title);
		font-size:var(--fs-fine);
		font-weight:var(--fw-regular);
		color:var(--ink-quiet);
		text-align:left;
	}
	.woocommerce table.shop_attributes th{ width:auto }
}
'''


def main():
    p = os.path.join(SRC, 'patterns', 'table.css')
    assert all(ord(ch) < 128 for ch in TABLE)
    assert TABLE.count('/*') == TABLE.count('*/'), (TABLE.count('/*'), TABLE.count('*/'))
    io.open(p, 'w', encoding='ascii', newline='\n').write(TABLE)
    print('wrote  patterns/table.css %5d bytes' % len(TABLE))

    ip = os.path.join(SRC, 'index.css')
    index = io.open(ip, encoding='utf-8').read()
    if 'patterns/table.css' not in index:
        anchor = next(l for l in index.splitlines()
                      if 'patterns/field.css' in l and '@import' in l)
        index = index.replace(anchor,
                              anchor + '\n@import url("patterns/table.css")   layer(patterns);', 1)
        io.open(ip, 'w', encoding='utf-8', newline='\n').write(index)
        print('index.css: registered patterns/table.css')

    declared = set()
    for dp, _, names in os.walk(SRC):
        for n in names:
            if n.endswith('.css'):
                t = io.open(os.path.join(dp, n), encoding='utf-8').read()
                declared |= set(re.findall(r'^\s*(--[a-z0-9-]+)\s*:', t, re.M))
    body = re.sub(r'/\*[\s\S]*?\*/', '', TABLE)
    missing = sorted({m for m in re.findall(r'var\(\s*(--[a-z0-9-]+)\s*\)', body)
                      if m not in declared})
    if missing:
        print('MISSING TOKENS: ' + ', '.join(missing))
        raise SystemExit(1)
    print('token check: ok')


main()
