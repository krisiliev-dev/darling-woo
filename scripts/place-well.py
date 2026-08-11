"""--placeholder-product becomes D2: a photographic sweep.

Owner chose D2 from the rendered comparison, 2026-08-08.

WHY THE LIGHT IS AT THE TOP AND NOT THE MIDDLE. The first spotlight put its
highlight where the product sits, which is the wrong place: a white plate's base
then met the brightest part of the ground and dissolved. Sampled at the pixel
where the product's lower edge meets the well, a near-white product measured

    centred highlight ....... 1.220
    light moved up (D2) ..... 1.470   <- shipped
    deeper still (D3) ....... 1.706

D3 wins on contrast and loses on everything else: at that saturation the well
reads as a brand colour rather than a surface, and a genuinely white plate
photographs slightly cream on it.

WHAT THIS CANNOT DO. No ground separates every product. A white candle on a
white plate needs a contact shadow in the PHOTOGRAPH; the well can stop a
silhouette dissolving, it cannot do the photography's job.

The mix is against the tokens, so retuning the amber ramp moves every product
backdrop with it. That is intended - it is also a thing to remember before
touching --gh/--gs/--gl.
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _place import guard   # refuses to clobber a component that has moved on

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
CP = os.path.join(ROOT, 'theme', 'darling', 'src', 'tokens', 'colour.css')

D2 = ('''--placeholder-product:
		radial-gradient(64% 54% at 50% 12%,
			color-mix(in oklab, var(--g-vanilla) 34%, #FFF) 0%, transparent 68%),
		linear-gradient(180deg,
			color-mix(in oklab, var(--g-light) 20%, var(--c-grey-050)) 0%,
			color-mix(in oklab, var(--g-core) 30%, var(--c-grey-300)) 100%);''')

c = io.open(CP, encoding='utf-8').read()
m = re.search(r'^\s*--placeholder-product\s*:[^;]*;', c, re.M)
assert m, 'no --placeholder-product to replace'
old = m.group(0).strip()
if 'radial-gradient' in old:
    print('colour.css: --placeholder-product already the sweep')
else:
    c = c[:m.start()] + '\n\t' + D2 + c[m.end():]
    guard(CP, c)
    io.open(CP, 'w', encoding='utf-8', newline='\n').write(c)
    print('colour.css: --placeholder-product\n  was  ' + old + '\n  now  the D2 sweep')
