"""Move every ADOPTED block out of the layered patterns and into unlayered files.

*** THIS IS THE ARCHITECTURAL PIECE, AND THE MEASUREMENT THAT FORCED IT. ***
field.css was written against the real checkout markup and it still lost. On the
live seeded checkout, with our build injected and the old sheets disabled:

    property        we asked for      we got
    border-radius   10px  (radius-s)  4px
    background      #F1F1F6 (grey-050) #FFFFFF
    option border   --edge-field      cherry

Every one of those is WooCommerce winning, and it wins for one reason: our
patterns are inside @layer and Woo's stylesheets are not, so Woo outranks us no
matter how specific our selector is. Cards mostly escaped this because Woo says
little about `li.product`; a checkout input is a control Woo styles completely.

So the split is not cosmetic. Rules that describe OUR components stay layered,
because layering is what gives them a predictable internal order. Rules that
exist to overrule a third party have to sit outside the layers, because that is
the only place they can win. Two directories, and the difference is legible:

    src/patterns/*.css   .d-* - our components, layered
    src/adopted/*.css    Woo and Stripe class names, UNLAYERED

Nothing is duplicated: the ADOPTED section is MOVED, not copied. And the
unlayered file is not a licence to put anything there - collide.js measures what
Woo actually contests, and anything in adopted/ that is not in that set is a
rule fighting nobody.
"""
import io, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')
MARKER = re.compile(r'^/\* [-=]*\s*ADOPTED', re.M)

HEADER = '''/* =============================================================================
   ADOPTED / %(name)s
   *** THIS FILE IS DELIBERATELY NOT IN A CASCADE LAYER. ***

   It styles markup WooCommerce and Stripe emit, which we cannot add classes to.
   Their stylesheets are unlayered, and unlayered CSS beats layered CSS however
   specific the layered selector is - so a rule that has to overrule them cannot
   live in @layer patterns. Measured on the live checkout: identical rules moved
   here went from losing on border-radius, background and border colour to
   winning all three.

   The trade is real and worth stating. Nothing in this file participates in the
   layer order, so it also outranks OUR patterns - which means anything here that
   is not actually contested by a third party is a rule quietly beating our own
   system for no reason. collide.js measures the contested set; keep this file
   inside it.

   Moved out of patterns/%(src)s, not copied. There is one definition.
   ========================================================================== */

'''


def main():
    os.makedirs(os.path.join(SRC, 'adopted'), exist_ok=True)
    ip = os.path.join(SRC, 'index.css')
    index = io.open(ip, encoding='utf-8').read()
    moved = []

    for name in sorted(os.listdir(os.path.join(SRC, 'patterns'))):
        if not name.endswith('.css'):
            continue
        path = os.path.join(SRC, 'patterns', name)
        text = io.open(path, encoding='utf-8').read()
        m = MARKER.search(text)
        if not m:
            continue
        head, tail = text[:m.start()], text[m.start():]
        io.open(path, 'w', encoding='ascii', newline='\n').write(head.rstrip() + '\n')
        out = HEADER % {'name': name[:-4], 'src': name} + tail
        io.open(os.path.join(SRC, 'adopted', name), 'w',
                encoding='ascii', newline='\n').write(out)
        moved.append((name, len(tail)))
        print('moved  %-12s %5d bytes -> adopted/%s' % (name, len(tail), name))

    if not moved:
        print('nothing to move')

    # register the unlayered imports LAST, after every layered import, so source
    # order matches intent even though layering already decides the outcome
    lines = index.rstrip().split('\n')
    for name, _ in moved:
        imp = '@import url("adopted/%s");' % name
        if imp in index:
            continue
        lines.append(imp)
        print('index.css: + ' + imp)
    marker = ('\n/* -- ADOPTED, UNLAYERED --------------------------------------------------\n'
              '   These have to outrank WooCommerce, and only unlayered CSS can. Last on\n'
              '   purpose, and no layer() on purpose. */')
    text = '\n'.join(lines) + '\n'
    if 'ADOPTED, UNLAYERED' not in text and moved:
        first = text.index('@import url("adopted/')
        text = text[:first] + marker.lstrip('\n') + '\n' + text[first:]
    io.open(ip, 'w', encoding='utf-8', newline='\n').write(text)
    print()
    print(text[text.index('@layer'):])


main()
