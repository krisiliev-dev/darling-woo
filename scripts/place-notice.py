"""patterns/notice.css - the four states, the dismiss, and the store bar.

*** ONE THING HERE NEEDS THE OWNER, AND IT IS NOT A DETAIL. ***
The brand has no green. Error can be claret, warning can be the deep end of the
amber ramp, info can be mauve - all three already exist. Success has nothing to
sit on, and "your order is placed" is the single most important message the site
ever shows. So the token --notice-success-edge is defined here with a proposed
sage, and the gallery renders it next to the alternatives for a decision. It is
one line to change once that decision is made.

Everything else is structural and reversible.
"""
import io, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

TOKENS = '''
	/* -- notices -------------------------------------------------------------
	   Four states. Three of them are brand colours we already had; SUCCESS IS
	   NEW and is a proposal, not a decision - see patterns/notice.css. A notice
	   is a tinted surface with a solid edge, never a solid block: a full-bleed
	   red panel on a checkout reads as a crash rather than as a correction. */
	--c-sage: #4F6B55;                    /* PROPOSED - awaiting the owner */
	--notice-error-edge:   var(--c-claret);
	--notice-warning-edge: var(--g-shadow);
	--notice-success-edge: var(--c-sage);
	--notice-info-edge:    var(--c-mauve);
'''

NOTICE = '''/* =============================================================================
   PATTERN / NOTICE
   Error, warning, success, info - plus the dismiss and the store-wide bar.

   A NOTICE IS A TINTED SURFACE WITH A SOLID EDGE, NEVER A SOLID BLOCK. A
   full-bleed red panel across a checkout reads as a crash rather than as a
   correction, and the one place notices matter most is the place a customer is
   most likely to abandon.

   *** THE COLOUR IS NOT THE MESSAGE. *** Every state carries an icon as well as
   a tint, because roughly one man in twelve cannot separate the red one from the
   green one, and because a tint this light is doing almost no work on a bad
   screen in daylight. The icon is a pseudo-element so the markup does not have
   to carry it - WooCommerce emits these notices and we cannot add an <svg>.

   *** SUCCESS HAS NO BRAND COLOUR YET. *** claret, the amber ramp and mauve
   cover error, warning and info. Nothing in the palette says "this went right".
   --c-sage is a proposal awaiting the owner; changing it is one line in
   tokens/colour.css and nothing here needs to move.
   ========================================================================== */

.d-notice{
	display:grid;
	grid-template-columns:auto 1fr auto;
	align-items:start;
	gap:var(--inline);
	padding:var(--space-2xs) var(--space-xs);
	border-radius:var(--radius-m);
	border-left:3px solid var(--notice-info-edge);
	background:color-mix(in oklab, var(--notice-info-edge) 9%, var(--surface-raised));
	color:var(--ink);
	font-size:var(--fs-meta);
	line-height:var(--lh-body);
}
.d-notice::before{
	content:"i";
	display:grid;
	place-items:center;
	width:1.45em;
	height:1.45em;
	border-radius:var(--radius-circle);
	background:var(--notice-info-edge);
	color:var(--c-white);
	font:var(--fw-bold) .82em/1 var(--font-ui);
	font-style:normal;
}
.d-notice__title{ display:block; font-weight:var(--fw-medium) }
.d-notice a{ color:inherit }

.d-notice--error{
	border-left-color:var(--notice-error-edge);
	background:color-mix(in oklab, var(--notice-error-edge) 9%, var(--surface-raised));
}
.d-notice--error::before{ content:"!"; background:var(--notice-error-edge) }

.d-notice--warning{
	border-left-color:var(--notice-warning-edge);
	background:color-mix(in oklab, var(--notice-warning-edge) 11%, var(--surface-raised));
}
.d-notice--warning::before{ content:"!"; background:var(--notice-warning-edge) }

.d-notice--success{
	border-left-color:var(--notice-success-edge);
	background:color-mix(in oklab, var(--notice-success-edge) 10%, var(--surface-raised));
}
/* A tick, drawn rather than typed: the check glyph is missing from plenty of
   fonts and falls back to a box. */
.d-notice--success::before{
	content:"";
	background:var(--notice-success-edge);
	background-image:
		linear-gradient(45deg, transparent 44%, var(--c-white) 44% 56%, transparent 56%),
		linear-gradient(-45deg, transparent 52%, var(--c-white) 52% 64%, transparent 64%);
	background-size:.55em .55em, .8em .8em;
	background-position:32% 62%, 58% 44%;
	background-repeat:no-repeat;
}

.d-notice__dismiss{
	grid-column:3;
	appearance:none;
	border:0;
	background:none;
	color:var(--ink-quiet);
	font-size:1.15em;
	line-height:1;
	padding:.15em .3em;
	cursor:pointer;
	border-radius:var(--radius-xs);
}
.d-notice__dismiss:hover{ color:var(--ink); background:var(--surface-quiet) }

/* -- the store-wide bar -----------------------------------------------------
   Full bleed, claret, above everything. It is the only notice that is a solid
   block, because it is not reporting on an action - it is the shop talking. */
.d-notice--bar{
	display:block;
	border-radius:0;
	border:0;
	padding:var(--space-2xs) var(--gutter);
	text-align:center;
	background:var(--surface-band);
	color:var(--ink-on-dark);
	font-size:var(--fs-fine);
}
.d-notice--bar::before{ content:none }

/* -- ADOPTED: WooCommerce's notices -----------------------------------------
   Both generations of them. The block notices come from
   wc-blocks-style-store-notices and wc-blocks-packages-style; the woocommerce-*
   ones come from woocommerce-general and appear on the classic templates.
   Listed here so that dequeuing either handle has one place to check. */
.wc-block-components-notice-banner,
.woocommerce-message,
.woocommerce-error,
.woocommerce-info{
	display:grid;
	grid-template-columns:auto 1fr auto;
	align-items:start;
	gap:var(--inline);
	padding:var(--space-2xs) var(--space-xs);
	margin:0 0 var(--stack);
	border:0;
	border-left:3px solid var(--notice-info-edge);
	border-radius:var(--radius-m);
	background:color-mix(in oklab, var(--notice-info-edge) 9%, var(--surface-raised));
	color:var(--ink);
	font-size:var(--fs-meta);
	list-style:none;
}
.wc-block-components-notice-banner.is-error,
.woocommerce-error{
	border-left-color:var(--notice-error-edge);
	background:color-mix(in oklab, var(--notice-error-edge) 9%, var(--surface-raised));
}
.wc-block-components-notice-banner.is-warning{
	border-left-color:var(--notice-warning-edge);
	background:color-mix(in oklab, var(--notice-warning-edge) 11%, var(--surface-raised));
}
.wc-block-components-notice-banner.is-success,
.woocommerce-message{
	border-left-color:var(--notice-success-edge);
	background:color-mix(in oklab, var(--notice-success-edge) 10%, var(--surface-raised));
}
/* Woo ships its own SVG in the banner, so we do NOT add a pseudo icon here -
   two icons is worse than one. The classic notices have none, and get ours. */
.woocommerce-message::before,
.woocommerce-error::before,
.woocommerce-info::before{
	content:"i";
	display:grid;
	place-items:center;
	position:static;
	width:1.45em;
	height:1.45em;
	margin:0;
	border-radius:var(--radius-circle);
	background:var(--notice-info-edge);
	color:var(--c-white);
	font:var(--fw-bold) .82em/1 var(--font-ui);
}
.woocommerce-error::before{ content:"!"; background:var(--notice-error-edge) }
.woocommerce-message::before{ content:"+"; background:var(--notice-success-edge) }

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
    cp = os.path.join(SRC, 'tokens', 'colour.css')
    c = io.open(cp, encoding='utf-8').read()
    if '--notice-error-edge' not in c:
        i = c.rindex('}')
        c = c[:i] + TOKENS + c[i:]
        io.open(cp, 'w', encoding='utf-8', newline='\n').write(c)
        print('colour.css: added the notice tokens and --c-sage (proposed)')
    else:
        print('colour.css: notice tokens already present')

    p = os.path.join(SRC, 'patterns', 'notice.css')
    assert all(ord(ch) < 128 for ch in NOTICE)
    io.open(p, 'w', encoding='ascii', newline='\n').write(NOTICE)
    print('wrote  patterns/notice.css %5d bytes' % len(NOTICE))

    ip = os.path.join(SRC, 'index.css')
    index = io.open(ip, encoding='utf-8').read()
    if 'patterns/notice.css' not in index:
        anchor = next(l for l in index.splitlines()
                      if 'patterns/card.css' in l and '@import' in l)
        index = index.replace(anchor,
                              anchor + '\n@import url("patterns/notice.css")  layer(patterns);', 1)
        io.open(ip, 'w', encoding='utf-8', newline='\n').write(index)
        print('index.css: registered patterns/notice.css')

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
    print('token check: notice.css references only declared tokens')


main()
