"""Add --c-grey-050 and move card surfaces onto it.

Owner, 2026-08-08: "Lets have the new grey F1F1F6. It looks good on the
background, especially if we give cards a soft shadow behind them."

So this does three things: adds the primitive, repoints --surface-raised at it,
and softens the card shadow - the old one was a 20px blur at .06 alpha plus a
1px hairline line, which reads as a hard edge with a smudge under it rather than
as an object sitting slightly off the page. Two stacked shadows do it better: a
short tight one for contact and a long soft one for the lift.

This also removes the LAST white surface in the system, which is the real point.
"no white" is now a rule with no exception, and a rule with one exception is how
cream came back three times.
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _place import guard   # refuses to clobber a component that has moved on

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

GREY = '''	/* Added 2026-08-08. Nothing sat between grey-100 and white, so a raised
	   surface had to be white, and white was the one exception left to "the
	   page is grey". Measured against the grey-100 page it is a 1.104:1 step
	   where white was 1.243 - close enough that the SHADOW, not the tone, is
	   what makes a card read as lifted. */
	--c-grey-050: #F1F1F6;
'''

SHADOW = '''
	/* -- lift ----------------------------------------------------------------
	   Two shadows, not one. A single 20px blur reads as a smudge; a short tight
	   shadow gives the contact edge and a long soft one gives the height, which
	   is how a real object sits on a surface. Both are pure black at low alpha
	   rather than a tinted shadow - a coloured shadow on a grey page turns the
	   page that colour wherever cards are dense. */
	--shadow-card: 0 1px 2px rgb(0 0 0 / .05), 0 10px 24px -8px rgb(0 0 0 / .13);
	--shadow-card-hover: 0 2px 4px rgb(0 0 0 / .06), 0 18px 38px -10px rgb(0 0 0 / .20);
'''


def main():
    cp = os.path.join(SRC, 'tokens', 'colour.css')
    c = io.open(cp, encoding='utf-8').read()

    if '--c-grey-050' not in c:
        anchor = re.search(r'^\s*--c-grey-100\s*:.*$', c, re.M)
        assert anchor, 'no --c-grey-100 to anchor against'
        c = c[:anchor.start()] + GREY + c[anchor.start():]
        print('colour.css: added --c-grey-050')

    if '--shadow-card' not in c:
        i = c.rindex('}')
        c = c[:i] + SHADOW + c[i:]
        print('colour.css: added --shadow-card, --shadow-card-hover')

    # repoint the raised surface
    new_c, n = re.subn(r'(--surface-raised\s*:\s*)var\(--c-white\)',
                       r'\1var(--c-grey-050)', c)
    if n:
        c = new_c
        print('colour.css: --surface-raised now grey-050 (was white)')
    elif 'var(--c-grey-050);' in c:
        print('colour.css: --surface-raised already grey-050')
    else:
        m = re.search(r'^\s*--surface-raised\s*:.*$', c, re.M)
        print('colour.css: CHECK --surface-raised by hand: ' + (m.group(0).strip() if m else 'not found'))

    guard(cp, c)
    io.open(cp, 'w', encoding='utf-8', newline='\n').write(c)

    # card.css: use the shadow tokens
    kp = os.path.join(SRC, 'patterns', 'card.css')
    k = io.open(kp, encoding='utf-8').read()
    before = k
    k = k.replace('box-shadow:0 1px 0 var(--hairline), 0 8px 20px rgb(0 0 0 / .06);',
                  'box-shadow:var(--shadow-card);')
    k = k.replace('box-shadow:0 1px 0 var(--hairline), 0 14px 30px rgb(0 0 0 / .12)',
                  'box-shadow:var(--shadow-card-hover)')
    k = k.replace('box-shadow:inset 0 0 0 1px var(--edge-field), 0 8px 20px rgb(0 0 0 / .08)',
                  'box-shadow:inset 0 0 0 1px var(--edge-field), var(--shadow-card)')
    k = k.replace('box-shadow:inset 0 0 0 1px var(--hairline), 0 10px 24px rgb(0 0 0 / .10)',
                  'box-shadow:inset 0 0 0 1px var(--hairline), var(--shadow-card)')
    if k != before:
        guard(kp, k)
        io.open(kp, 'w', encoding='ascii', newline='\n').write(k)
        print('card.css: now uses --shadow-card / --shadow-card-hover')
    else:
        print('card.css: already on the shadow tokens')

    declared = set()
    for dp, _, names in os.walk(SRC):
        for n2 in names:
            if n2.endswith('.css'):
                t = io.open(os.path.join(dp, n2), encoding='utf-8').read()
                declared |= set(re.findall(r'^\s*(--[a-z0-9-]+)\s*:', t, re.M))
    for need in ['--c-grey-050', '--shadow-card', '--shadow-card-hover']:
        assert need in declared, need
    print('token check: ok')


main()
