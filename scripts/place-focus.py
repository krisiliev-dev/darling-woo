"""The focus ring is cherry, everywhere, and nobody chose that.

MEASURED: --action resolves to #D42A3C. That is cherry, not amber. So every
focus ring in the system - base/elements.css draws `:focus-visible{ outline:2px
solid var(--action) }` - has been red, which is why clicking into the quantity
field looked like an error. The field pattern was moved to cocoa earlier for
exactly this reason; the rest of the system never was.

So: a real token. --focus-ring, cocoa, used by everything that draws focus. Red
belongs to the invalid state and nowhere else.

TWO THINGS FOR THE OWNER, NOT FIXED HERE BECAUSE THEY ARE PALETTE DECISIONS:

  --action      is #D42A3C, cherry. The flat .d-btn therefore renders cherry,
                and .d-btn + .d-finish renders plywood over it. If amber is
                meant to be "the action colour", this token is wrong and the
                checkbox, radio and every :checked state have been cherry by
                accident rather than by choice.
  --action-ink  is #FFF6E9. That is CREAM, which was retired. It is the ink on
                every filled control in the system.
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _place import guard   # refuses to clobber a component that has moved on

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

TOKEN = '''
	/* -- focus ----------------------------------------------------------------
	   *** ITS OWN TOKEN, AND DELIBERATELY NOT --action. ***
	   Focus used to be drawn with --action, and --action measures #D42A3C -
	   cherry. So every ring in the system was red, and clicking into a quantity
	   field looked like a validation error before anything had been typed. Red
	   is the invalid state and nothing else. Cocoa is the calmest thing in the
	   palette that is still unmistakably not the resting edge. */
	--focus-ring: var(--c-cocoa);
	--focus-halo: color-mix(in oklab, var(--c-cocoa) 22%, transparent);
'''


def main():
    cp = os.path.join(SRC, 'tokens', 'colour.css')
    c = io.open(cp, encoding='utf-8').read()
    if '--focus-ring' not in c:
        i = c.rindex('}')
        c = c[:i] + TOKEN + c[i:]
        guard(cp, c)
        io.open(cp, 'w', encoding='utf-8', newline='\n').write(c)
        print('colour.css: added --focus-ring, --focus-halo')

    changed = 0
    for dp, _, names in os.walk(SRC):
        for n in names:
            if not n.endswith('.css') or n == 'colour.css':
                continue
            p = os.path.join(dp, n)
            t = io.open(p, encoding='utf-8').read()
            before = t
            t = t.replace('outline:2px solid var(--action)', 'outline:2px solid var(--focus-ring)')
            t = t.replace('outline:2px solid var(--c-cocoa)', 'outline:2px solid var(--focus-ring)')
            t = t.replace('border-color:var(--c-cocoa);\n\tbox-shadow:0 0 0 3px color-mix(in oklab, var(--c-cocoa) 22%, transparent);',
                          'border-color:var(--focus-ring);\n\tbox-shadow:0 0 0 3px var(--focus-halo);')
            t = t.replace('box-shadow:0 0 0 3px color-mix(in oklab, var(--c-cocoa) 22%, transparent)',
                          'box-shadow:0 0 0 3px var(--focus-halo)')
            t = t.replace('border-color:var(--c-cocoa);', 'border-color:var(--focus-ring);')
            if t != before:
                guard(p, t)
                io.open(p, 'w', encoding='ascii', newline='\n').write(t)
                changed += 1
                print('  focus ring -> token in %s' % os.path.join(os.path.basename(dp), n))
    print('%d files updated' % changed)

    # the quantity input must not draw its own ring: the wrapper already shows
    # focus, and two rings on one control reads as two controls
    qp = os.path.join(SRC, 'patterns', 'quantity.css')
    q = io.open(qp, encoding='utf-8').read()
    if 'the wrapper draws the ring' not in q:
        q = q.replace(""".d-qty__input::-webkit-outer-spin-button,""",
"""/* *** THE WRAPPER DRAWS THE RING, NOT THE INPUT. ***
   The pill shows :focus-within, so a second outline on the input inside it puts
   a ring inside a ring and reads as two controls. This is also where the red was
   coming from: the input was falling through to the global :focus-visible rule,
   which used to be cherry. */
.d-qty__input:focus,
.d-qty__input:focus-visible,
.wc-block-components-quantity-selector__input:focus,
.wc-block-components-quantity-selector__input:focus-visible{ outline:none }

.d-qty__input::-webkit-outer-spin-button,""")
        guard(qp, q)
        io.open(qp, 'w', encoding='ascii', newline='\n').write(q)
        print('quantity.css: input no longer draws its own ring')


main()
