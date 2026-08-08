"""Build the component gallery: src/ -> theme/darling/gallery.html

*** THIS IS THE PICTURE OF THE DESIGN SYSTEM, AND IT IS GENERATED. ***
One page, one section per pattern, every state and variant side by side, built
from the SAME darling.build.css the site ships and inlining the SAME
assets/darling-ui.js. Not a mock-up of the system - the system, rendered.

It lives in the repo and runs from build-css.js for one reason: a gallery that
somebody has to remember to regenerate is a gallery that is quietly wrong within
a week, and a wrong gallery is worse than none because people trust it. Change a
token, run the build, and the picture is already correct.

Anyone opening theme/darling/src/ and wanting to know what any of it looks like
opens theme/darling/gallery.html. No server, no build step of its own, no
network - everything is inlined, including the plywood tile as a data: URL.

  node scripts/build-css.js          builds the CSS and this
  python scripts/gen-gallery.py      just this

DARLING_ROOT overrides the repo root, which is how it is tested outside a
checkout.
"""
import base64, html, os, re, sys

ROOT = os.environ.get('DARLING_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THEME = os.path.join(ROOT, 'theme', 'darling')
CSS_FILE = os.path.join(THEME, 'darling.build.css')
UI_FILE = os.path.join(THEME, 'assets', 'darling-ui.js')
PLY_FILE = os.path.join(THEME, 'assets', 'ply-grain.webp')
OUT_FILE = os.path.join(THEME, 'gallery.html')

for p in (CSS_FILE, PLY_FILE):
    if not os.path.exists(p):
        sys.stderr.write('gen-gallery: missing %s - run the CSS build first\n' % p)
        raise SystemExit(1)

CSS = open(CSS_FILE, encoding='utf-8').read()
CSS = CSS.replace('url("../assets/ply-grain.webp")',
                  'url("data:image/webp;base64,%s")'
                  % base64.b64encode(open(PLY_FILE, 'rb').read()).decode())

# The stylesheet is written ASCII-only (see FINISH_AND_LAYER_DECISIONS), so this
# is belt and braces - it repairs UTF-8 that has been round-tripped through the
# Windows ANSI codepage, which is how the first preview arrived full of mojibake.
HIGH = ''.join(c for c in (bytes([b]).decode('cp1252', errors='ignore')
                           for b in range(0x80, 0x100)) if c)
RUN = re.compile('[' + re.escape(HIGH) + '\ufffd]+')


def unmangle(m):
    try:
        return m.group(0).encode('cp1252').decode('utf-8')
    except Exception:
        return m.group(0)


CSS = RUN.sub(unmangle, CSS)

# A cut-out stand-in. The glow traces the alpha channel, so a rectangle would
# prove nothing - this is an SVG bowl silhouette with transparency around it.
CUTOUT = ('data:image/svg+xml;utf8,'
  + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E"
  + "%3Cpath d='M40 62 h120 a8 8 0 0 1 8 8 c0 30 -26 52 -68 52 s-68 -22 -68 -52 a8 8 0 0 1 8 -8 z'"
  + " fill='%23c9b9a6'/%3E"
  + "%3Cellipse cx='100' cy='62' rx='60' ry='11' fill='%23e0d3c2'/%3E"
  + "%3C/svg%3E")

P = []
A = P.append

A('<!doctype html><html lang="bg"><head><meta charset="utf-8">')
A('<meta name="viewport" content="width=device-width,initial-scale=1">')
A('<title>Darling components</title><style>\n' + CSS + '''
/* gallery chrome only - not part of the system */
body{margin:0;background:var(--surface-page);color:var(--ink);font:var(--type-body)}
.wrap{max-width:1180px;margin:0 auto;padding:40px 24px 120px}
/* *** THE SECTION CONSTRAINS ITSELF, RATHER THAN TRUSTING A WRAPPER. ***
   The full-bleed band and hero have to break out of .wrap, so the generator
   closes it and reopens it around them - and one unbalanced </div> anywhere in
   1100 lines silently drops every following section out of the wrapper and to
   the edge of the page. That happened twice. A section that carries its own
   max-width and gutter cannot be orphaned by a div count, so the wrapper is now
   belt and the section is braces. */
.sec{max-width:1180px;margin:0 auto 72px;padding-inline:24px;scroll-margin-top:20px;box-sizing:border-box}
.wrap > .sec{padding-inline:0}
.sec > h2{font:var(--fw-bold) 13px/1.2 var(--font-ui);letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-quiet);margin:0 0 4px}
.sec > h3{font:var(--type-section);margin:0 0 10px}
.note{max-width:64ch;font-size:var(--fs-meta);line-height:1.65;color:var(--ink-quiet);
  margin:0 0 20px}
.note code{font-size:.92em;background:var(--surface-quiet);padding:.1em .35em;
  border-radius:var(--radius-xs)}
.lbl{font:var(--fw-medium) 12px/1.3 var(--font-ui);color:var(--ink-quiet);margin:10px 0 0}
.fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(224px,1fr));gap:18px}
.row{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
.on-dark{background:var(--c-cocoa);border-radius:var(--radius-l);padding:26px}
.on-dark .lbl{color:var(--ink-on-dark);opacity:.72}
/* SCOPED. These were `nav` and `nav a`, and gallery chrome is UNLAYERED - so
   two bare element selectors were beating every layered pattern in the system,
   whatever its specificity. .d-nav a[aria-current] rendered cocoa instead of
   cherry and looked like a bug in the pattern. It was a bug in the gallery. */
.gnav{position:sticky;top:0;background:var(--surface-page);padding:14px 0;z-index:9;
  border-bottom:1px solid var(--hairline);margin-bottom:34px}
.gnav a{font:var(--fw-medium) 13px/1 var(--font-ui);color:var(--ink);margin-right:18px}
.todo{font-size:var(--fs-fine);color:var(--ink-quiet);border-left:3px solid var(--hairline);
  padding-left:12px;margin-top:14px}
</style></head><body><div class="wrap">
<nav class="gnav"><a href="#card">Card</a><a href="#button">Button</a><a href="#band">Band</a>
<a href="#notice">Notice</a><a href="#rating">Rating</a><a href="#field">Field</a><a href="#table">Table</a><a href="#small">Quantity, badge, panel</a><a href="#last">Pagination, skeleton</a><a href="#icon">Icons</a><a href="#chrome">Header, drawer</a><a href="#hero">Hero</a><a href="#catalogue">Catalogue</a><a href="#product">Product page</a><a href="#cart">Cart furniture</a><a href="#next">Still to come</a></nav>
''')

# --------------------------------------------------------------------- card ---
PRODUCTS = [
    ('Керамична купа', '26,40', None, None),
    ('Дървена дъска за рязане с дръжка', '31,90', None, 'Ново'),
    ('Ленена кърпа', '22,00', '18,50', 'Намаление'),
    ('Стъклена кана', '42,00', None, None),
]

A('<section class="sec" id="card"><h2>Pattern</h2><h3>Card</h3>')
A('''<p class="note"><b>Hover a card.</b> The whole card is the target, not the
title &mdash; the shadow lifts, the image zooms 6%, and the product itself glows.
That last one works because <code>filter: drop-shadow</code> reads the alpha
channel and traces the actual silhouette rather than the box, so a cut-out PNG
glows around the <em>product</em>. It only works on a cut-out: an image with an
opaque background gets a rectangular glow and looks broken, which makes the
transparent-PNG column in the licence register a rendering requirement now.
The title no longer underlines. Price sits to the right of the title; on a
discount the old price stays on the right and the new one drops below it.</p>''')
A('<div class="grid">')
for name, price, now, chip in PRODUCTS:
    A('<article class="d-card">')
    A('<div class="d-card__media">')
    if chip:
        A('<span class="d-card__chip d-finish">%s</span>' % html.escape(chip))
    A('<img src="%s" alt="">' % CUTOUT)
    A('</div>')
    A('<div class="d-card__accent d-finish"></div>')
    A('<h3 class="d-card__title"><a href="#">%s</a></h3>' % html.escape(name))
    if now:
        A('<p class="d-card__price"><del>%s лв.</del><ins>%s лв.</ins></p>' % (price, now))
    else:
        A('<p class="d-card__price">%s лв.</p>' % price)
    A('<button class="d-card__cta">В количката</button>')
    A('</article>')
A('</div>')

A('<p class="lbl">Variants &mdash; raised (default), flat, quiet</p><div class="row">')
for mod, lbl in [('', 'default'), (' d-card--flat', 'flat'), (' d-card--quiet', 'quiet')]:
    A('<article class="d-card%s" style="width:224px">'
      '<div class="d-card__media"><img src="%s" alt=""></div>'
      '<div class="d-card__accent d-finish"></div>'
      '<h3 class="d-card__title"><a href="#">Керамична купа</a></h3>'
      '<p class="d-card__price">26,40 лв.</p>'
      '<button class="d-card__cta">%s</button></article>' % (mod, CUTOUT, lbl))
A('</div>')

A('''<div class="todo"><b>Changed since your review.</b>
The badge is now the plywood chip. The accent rule stays. The title no longer
underlines and the whole card is the hover target. The image zooms and the product
glows. Price moved right, discount stacks below it, and the cherry basket button
sits under both.<br><br>
<b>Still open.</b> Cards are white (<code>--surface-raised</code>) on the grey page
&mdash; the one place white survives after we retired cream, so worth a deliberate
yes. And <code>flat</code> and <code>quiet</code> were invisible against the page:
flat now states its edge, quiet drops two greys instead of one. Tell me if that is
still not enough separation.</div>''')
A('</section>')

# ------------------------------------------------------------------- button ---
A('<section class="sec" id="button"><h2>Pattern</h2><h3>Button</h3>')
A('''<p class="note">Three and no more. The amber one carries
<code>.d-finish</code> for the plywood surface, but <code>.d-btn</code> alone still
renders a solid amber button &mdash; a pattern that goes transparent when someone
forgets a second class will eventually ship transparent. Two amber buttons side by
side means neither is the answer, so the second choice is outlined.</p>''')
A('<div class="on-dark"><div class="row" style="gap:26px;align-items:center">')
A('<a class="d-btn d-finish" href="#">Разгледай всичко</a>')
A('<a class="d-btn d-btn--lg d-finish" href="#">Купи сега</a>')
A('<a class="d-btn d-btn--sm d-finish" href="#">Добави</a>')
A('</div><p class="lbl">amber &mdash; small / default / large</p></div>')
A('<div class="row" style="margin-top:18px;align-items:center">')
A('<a class="d-btn d-finish" href="#">Купи сега</a>')
A('<a class="d-btn d-btn--quiet" href="#">Още детайли</a>')
A('<a class="d-btn d-btn--text" href="#">Откажи</a>')
A('</div><p class="lbl">primary / quiet / text</p>')
A('</section>')

# --------------------------------------------------------------------- band ---
A('<section class="sec" id="band"><h2>Pattern</h2><h3>Band</h3>')
A('''<p class="note">Full bleed is the default, not a modifier &mdash; the colour runs
edge to edge and the <em>content</em> takes the gutter. Built on a grid rather than
negative margins, because a negative margin has to cancel whatever padding its
wrapper happens to have, and when it over-cancels you get a horizontal scrollbar at
exactly one viewport width that nobody tests for.</p>''')
A('</section></div>')

A('''<section class="d-band">
<h2 class="d-band__title">Подаръци, които се помнят</h2>
<p class="d-band__body">Всяко нещо в Дарлинг е избрано на ръка. Ако не бихме го
подарили на близък човек, не го предлагаме и на вас.</p>
</section>
<section class="d-band d-band--quiet">
<h2 class="d-band__title">Тих вариант</h2>
<div class="d-band__rule d-finish"></div>
<p class="d-band__body">Същият band, но на тих фон, с плywood разделител.</p>
</section>''')
# *** REOPEN THE WRAP. *** It was closed for the full-bleed band and never
# opened again, so every section from Notice onward rendered with no max-width
# and no gutter. Not on purpose - the owner spotted it.
A('<div class="wrap">')


# ------------------------------------------------------------------- notice ---
A('''<section class="sec" id="notice"><h2>Pattern</h2><h3>Notice</h3>
<p class="note">A notice is a <b>tinted surface with a solid edge</b>, never a solid
block &mdash; a full-bleed red panel across a checkout reads as a crash rather than
as a correction, and the checkout is where a customer is most likely to abandon.
Every state carries an icon as well as a tint: roughly one man in twelve cannot
separate the red one from the green one, and a tint this light does almost nothing
on a bad screen in daylight. The icon is a pseudo-element, because WooCommerce emits
these and we cannot add an <code>&lt;svg&gt;</code> to its markup.</p>''')
for mod, title, body in [
        ('d-notice d-notice--error', 'Нещо не е наред',
         'Моля, попълнете имейл адрес, за да продължим.'),
        ('d-notice d-notice--warning', 'Само 2 броя в наличност',
         'Поръчайте скоро, ако ги искате и двата.'),
        ('d-notice d-notice--success', 'Поръчката е приета',
         'Изпратихме потвърждение на имейла ви.'),
        ('d-notice d-notice--info', 'Безплатна доставка над 80 лв.',
         'Остават ви 12,40 лв. до безплатна доставка.')]:
    A('<div class="%s" style="margin-bottom:12px">'
      '<span class="d-notice__stars"></span>'
      '<span class="d-notice__stars"></span>'
      '<span class="d-notice__stars"></span>'
      '<div class="d-notice__body"><span class="d-notice__title">%s</span>%s</div>'
      '<button class="d-notice__dismiss" aria-label="Затвори">&times;</button></div>'
      % (mod, html.escape(title), html.escape(body)))
A('''<div class="todo"><b>The stars are drawn with <code>clip-path</code>, not typed.</b>
U+2726 is missing from plenty of system fonts and falls back to a tofu box, and an
error message is the worst place to find that out.<br><br>
<b>Every animation here is off on the money path.</b> motion.css kills animation on
cart, checkout and order-received, and under reduced motion &mdash; and notices
appear on those pages more than anywhere else. So the <em>resting frame</em> is the
real design and the motion is a bonus. Each state is composed to read at frame zero
with its stars already in position, rather than starting stacked in the middle.<br><br>
<b>The stars own the whole element now.</b> Error rains them from above across
the full width; warning walks one around the text on an ellipse; success has five
darting about; info points from above and from the far side. They sit
<em>behind</em> the text at z-index 0 &mdash; a star crossing a word is a legibility
bug dressed up as whimsy &mdash; and <code>overflow:hidden</code> keeps them inside
the box.<br><br>
<b>Eleven stars, no JavaScript.</b> The notice's two pseudo-elements plus three
empty spans of three each. That is what &ldquo;continuously&rdquo; costs without a
script.<br><br>
<b>Erratic is a timing problem, not a path problem.</b> The excited ones run on
<em>linear</em> timing with keyframe stops at uneven intervals &mdash; 13, 24, 41,
55, 69, 88. An ease makes every leg accelerate and settle the same way, which reads
as a route being followed however wild the path is; uneven stops read as a mind
being changed.<br><br>
<b>The orbit and the pokes aim at the text now</b>, anchored in <code>em</code> over
the left third rather than centred on the box.<br><br>
<b>The close is a plain X now.</b> It was a star, then a spinning star, and that
was the loudest gesture on the page attached to the least important thing anyone
will do on it. Cocoa to claret, nothing else.</div>''')
A('</section>')


# ------------------------------------------------------------------- rating ---
A('''<section class="sec" id="rating"><h2>Pattern</h2><h3>Rating</h3>
<p class="note"><b>One star shape, masked and repeated &mdash; not five elements.</b>
A rating is 4.3 as often as it is 4, so the fill has to be able to stop part way
through a star. Five separate elements can&rsquo;t do that without a sixth overlay
each. Instead the whole strip is a two-stop gradient &mdash; gold up to the value,
ash after it &mdash; and a mask punches five stars out of it. A half star costs
nothing, and it is the same eight-point star as the notices use.</p>
<div class="row" style="gap:26px">''')
for n, lbl in [(0, '0'), (1.5, '1.5'), (3.2, '3.2'), (4.3, '4.3'), (5, '5')]:
    A('<div><span class="d-rating" style="--rating:%s%%"></span>'
      '<div class="lbl">%s</div></div>' % (n / 5 * 100, lbl))
A('</div>')
A('<p class="lbl" style="margin-top:20px">In a row, with the count</p>'
  '<span class="d-rating-row"><span class="d-rating" style="--rating:86%"></span>'
  '<span class="d-rating-row__count">4,3 &middot; 27 отзива</span></span>')
A('''<p class="note" style="margin-top:26px"><b>The interactive one. Hover it, and
tab into it.</b> Underneath is a real radio group &mdash; a rating is an
<em>input</em>, so it has to be reachable by keyboard and announced properly. The
stars are the visible layer and the radios sit on top at zero opacity, so a click or
a tap lands on the control rather than on a decoration. The fill follows
<code>:has()</code>, so there is no script. <b>Hover the fourth star</b> &mdash; the
first four lift and shine together. That is <code>:has()</code> reading forwards,
which used to need reversed DOM order and a <code>~</code> combinator.</p>
<p class="note"><b>This one is five real elements; the read-only one above is not.</b>
A mask over a single gradient can stop part way through a star, which the read-only
version needs and an input never does &mdash; you cannot leave 3.4 stars. But one
element cannot transform part of itself, so the lift forced the interactive version
onto discrete elements. Same shape, two constructions, on purpose.</p>
<div class="d-rating-input">''')
for i in range(1, 6):
    A('<label><input type="radio" name="stars" value="%d" aria-label="%d от 5">'
      '<span class="d-rating-input__star"></span></label>' % (i, i))
A('</div>')
A('''<div class="todo"><b>WooCommerce&rsquo;s rating is a font glyph, and it has to
be silenced.</b> <code>.star-rating</code> renders black stars as
<code>::before</code> text content in a font we don&rsquo;t load; left alone they
show through our mask as black stars behind gold ones. <code>font-size:0</code>
stops it &mdash; <code>display:none</code> would collapse the width Woo uses to
express the value, which is the same width we then paint gold to get a partial
fill for free.<br><br>
<b>Open:</b> empty stars are <code>--c-ash-300</code>, the warm grey. Against the
new grey-050 card they may want to be cooler. Say if they look muddy to you.</div>''')
A('</section>')


# -------------------------------------------------------------------- field ---
A('''<section class="sec" id="field"><h2>Pattern</h2><h3>Field</h3>
<p class="note">Every control, and every state. Three rules run through all of
them. <b>The message always has room</b> &mdash; the error is not inserted on
failure, its space is reserved from the start, because a checkout that grows by
18px per invalid field pushes the button out from under a thumb that was already
moving toward it. <b>The state is never colour alone</b> &mdash; an invalid field
gets a thicker edge, a star and a sentence. And <b>focus is a ring plus a colour</b>,
never the browser outline removed with nothing put back.</p>
<div class="fgrid">''')

FIELDS = [
    ('Име', 'text', 'Мария', '', ''),
    ('Имейл адрес', 'email', '', 'Ще получите потвърждение тук.', ''),
    ('Имейл адрес', 'email', 'mariya@', '', 'Това не изглежда като валиден имейл.'),
    ('Телефон', 'tel', '', '', ''),
]
for label, typ, val, hint, err in FIELDS:
    cls = 'd-field d-field--invalid' if err else 'd-field'
    A('<div class="%s"><label class="d-field__label">%s</label>'
      '<input class="d-field__control" type="%s" value="%s" placeholder=" ">'
      % (cls, html.escape(label), typ, html.escape(val)))
    if hint:
        A('<p class="d-field__hint">%s</p>' % html.escape(hint))
    A('<p class="d-field__error">%s</p></div>' % html.escape(err))

A('''<div class="d-field"><label class="d-field__label">Област</label>
<select class="d-field__control"><option>Изберете област</option><option>София</option>
<option>Пловдив</option></select><p class="d-field__error"></p></div>
<div class="d-field"><label class="d-field__label">Бележка към поръчката</label>
<textarea class="d-field__control" placeholder="По избор"></textarea>
<p class="d-field__error"></p></div>
<div class="d-field d-field--disabled"><label class="d-field__label">ЕИК</label>
<input class="d-field__control" type="text" value="206094211" disabled>
<p class="d-field__error"></p></div>
</div>
<p class="lbl" style="margin-top:18px">Checkbox and radio &mdash; drawn, not native,
because a native control cannot be coloured on every platform and the one on the
checkout is the most-clicked control in the flow</p>
<div class="row" style="gap:26px">
<label class="d-check"><input type="checkbox" checked><span>Използвай същия адрес и за фактуриране</span></label>
<label class="d-check"><input type="checkbox"><span>Искам фактура</span></label>
<label class="d-check"><input type="radio" name="dm" checked><span>Спиди офис</span></label>
<label class="d-check"><input type="radio" name="dm"><span>До адрес</span></label>
</div>
<p class="note" style="margin-top:30px"><b>And the same styling landing on
WooCommerce&rsquo;s own markup</b>, reproduced here exactly as captured from the
seeded checkout &mdash; note the label comes <em>after</em> the input and floats
over it. Click into one.</p>
<div class="wc-block-components-form" style="max-width:520px">
<div class="wc-block-components-text-input wc-block-components-address-form__email">
<input type="email" placeholder=" " aria-invalid="false" id="demo-email"><label for="demo-email">Имейл адрес</label></div>
<div class="wc-block-components-text-input wc-block-components-address-form__first_name">
<input type="text" placeholder=" " value="Мария" aria-invalid="false" id="demo-fn"><label for="demo-fn">Име</label></div>
<div class="wc-block-components-text-input wc-block-components-address-form__postcode">
<input type="text" placeholder=" " value="12" aria-invalid="true" id="demo-pc"><label for="demo-pc">Пощенски код</label>
<div class="wc-block-components-validation-error"><p>Моля, въведете валиден пощенски код.</p></div></div>
</div>
<p class="lbl" style="margin-top:26px">Is it actually cocoa? Cocoa is very dark
&mdash; #3A1D20 &mdash; so it reads as near-black until you put pure black beside it</p>
<div class="row" style="gap:0;align-items:stretch;max-width:560px">
<div style="flex:1;padding:14px 16px;background:var(--surface-raised);
  border:1px solid var(--edge-field);border-radius:var(--radius-s) 0 0 var(--radius-s);
  color:var(--c-cocoa)"><b>Cocoa #3A1D20</b><br>Имейл адрес<br>mariya@darlinghome.bg</div>
<div style="flex:1;padding:14px 16px;background:var(--surface-raised);
  border:1px solid var(--edge-field);border-left:0;border-radius:0 var(--radius-s) var(--radius-s) 0;
  color:#000"><b>Pure black #000</b><br>Имейл адрес<br>mariya@darlinghome.bg</div>
</div>
<div class="todo"><b>Verified on the live checkout, not just here.</b> With our
stylesheet injected into a real seeded cart: radius 10px, background #F1F1F6,
min-height 51.2px, payment option radius 14px, option border #C2C2CD &mdash; all
five our tokens. It took two goes: layered we lost every one of them, and even
unlayered we still lost until the selectors matched WooCommerce&rsquo;s own
ancestor. Its rule is (0,3,1); ours was (0,2,1).</div>
</section>''')


# -------------------------------------------------------------------- table ---
A('''<section class="sec" id="table"><h2>Pattern</h2><h3>Table</h3>
<p class="note"><b>The row is carried by tone, the column by a rule.</b> This reverses what I
built first &mdash; I had horizontal hairlines and no vertical rules, which left the
table doing nothing to help the eye stay on a row and wasted the one separator that
survives the collapse to a phone. Now: alternating row tone does the row, a vertical
rule does the column, and there are no horizontal rules at all except above a total.
<b>Numbers are tabular and right-aligned</b>,
because a column of prices whose decimal points do not line up is unreadable at a
glance, and the glance is the entire point of a totals column.</p>
<table class="d-table d-table--stack" style="max-width:640px">
<caption>Количка</caption>
<thead><tr><th>Продукт</th><th>Количество</th><th class="d-table__num">Сума</th></tr></thead>
<tbody>''')
for name, qty, total in [('Керамична купа', '2', '52,80'),
                         ('Дървена дъска за рязане', '1', '31,90'),
                         ('Ленена кърпа', '3', '55,50')]:
    A('<tr><td data-title="Продукт">%s</td>'
      '<td data-title="Количество">%s</td>'
      '<td class="d-table__num" data-title="Сума">%s лв.</td></tr>'
      % (html.escape(name), qty, total))
A('''</tbody>
<tfoot><tr class="d-table__total"><td colspan="2">Общо</td>
<td class="d-table__num">140,20 лв.</td></tr></tfoot>
</table>
<p class="note" style="margin-top:24px"><b>Four presets, and four knobs behind
them.</b> The table exposes <code>--table-row</code>, <code>--table-row-alt</code>,
<code>--table-rule</code> and <code>--table-rule-row</code>; every preset below only
sets those. A page that wants something none of them covers sets the properties
directly rather than waiting for a new modifier to be invented.</p>
<div class="row" style="gap:22px;align-items:flex-start">''' + ''.join(
'''<div style="flex:1 1 260px"><table class="d-table%s">
<thead><tr><th>Продукт</th><th class="d-table__num">Сума</th></tr></thead>
<tbody>
<tr><td>Керамична купа</td><td class="d-table__num">52,80</td></tr>
<tr><td>Дървена дъска</td><td class="d-table__num">31,90</td></tr>
<tr><td>Ленена кърпа</td><td class="d-table__num">55,50</td></tr>
<tr><td>Стъклена кана</td><td class="d-table__num">42,00</td></tr>
</tbody></table><p class="lbl">%s</p></div>''' % (m, l) for m, l in [
  ('', 'default &mdash; two greys, column rule'),
  (' d-table--flat', 'flat &mdash; no tone, rule kept'),
  (' d-table--ruled', 'ruled &mdash; row rules back on'),
  (' d-table--warm', 'warm &mdash; mixed against the amber ramp'),
]) + '''</div>
<p class="lbl" style="margin-top:22px">Product attributes &mdash; the same table
doing a very different job, flat because striping a two-column list is noise</p>
<table class="d-table d-table--flat" style="max-width:520px">
<tbody>
<tr><th style="width:34%">Материал</th><td>Керамика</td></tr>
<tr><th>Размери</th><td>18 &times; 18 &times; 9 см</td></tr>
<tr><th>Съдомиялна</th><td>Да</td></tr>
<tr><th>Произход</th><td>България</td></tr>
</tbody></table>
<div class="todo"><b>Two collapse mechanisms, and the markup forced both.</b>
Below 600px a table stops being a table &mdash; horizontal scrolling inside a cart
is how an order gets abandoned. The classic WooCommerce tables carry
<code>data-title</code> on every cell, so each value can label itself with
<code>content:attr(data-title)</code>; the first table uses that, narrow your window
to see it &mdash; and note that <b>the stripe is what keeps one stacked record
distinct from the next</b>, since at that width a horizontal hairline between rows
would be indistinguishable from one between cells. <b>The block cart carries no such attribute</b> &mdash; captured and
checked &mdash; so its three columns re-lay with grid instead: image on the left
spanning two lines, product and total stacked beside it. Writing one mechanism and
hoping it covered both is how a cart ends up unreadable at 390px.</div>
</section>''')


# ------------------------------------------------- quantity / badge / panel ---
A('''<section class="sec" id="small"><h2>Patterns</h2><h3>Quantity, badge</h3>
<p class="note"><b>Quantity.</b> The input stays a real number field &mdash; somebody
typing 12 must not press + eleven times &mdash; and the buttons are a convenience
either side of it. They are 2.6em, about 44px: these are the smallest things anyone
taps in the whole purchase, Woo&rsquo;s own are around 28px, and a miss here changes
a quantity you did not mean to change.</p>
<div class="row" style="gap:24px;align-items:center">
<div class="d-qty"><button class="d-qty__button" aria-label="По-малко">&minus;</button>
<input class="d-qty__input" type="number" value="1" aria-label="Количество">
<button class="d-qty__button" aria-label="Повече">+</button></div>
<div class="d-qty"><button class="d-qty__button" disabled aria-label="По-малко">&minus;</button>
<input class="d-qty__input" type="number" value="12" aria-label="Количество">
<button class="d-qty__button" aria-label="Повече">+</button></div>
</div>

<p class="note" style="margin-top:30px"><b>Badge.</b> Never clickable and never
looks it &mdash; no shadow, no lift, no pointer. Over a photograph it takes the
scrim, the one non-text use of cocoa in the system, because a tint alone disappears
on a light image.</p>
<div class="row" style="align-items:center">
<span class="d-badge">Ново</span>
<span class="d-badge d-badge--sale">-30%</span>
<span class="d-badge d-badge--quiet">Само 2 броя</span>
<span class="d-badge d-finish">Изборът на Lady D</span>
<span style="position:relative;display:inline-block;width:150px;height:96px;
  background:var(--placeholder-product);border-radius:var(--radius-s)">
<span class="d-badge d-badge--on-image" style="position:absolute;top:8px;left:8px">Намаление</span></span>
</div>

<div class="todo"><b>Captured, not assumed:</b> in Woo&rsquo;s quantity selector the
buttons come <em>after</em> the input in source order, so the minus is not the first
child. The adopted rules use grid areas rather than flex order, which keeps the tab
sequence matching the visual one &mdash; reordering with <code>order</code> would
have left a keyboard user tabbing minus, plus, then the field.</div>
</section>''')


# -------------------------------------------------------------------- panel ---
PANELS = [
    ('', 'grey — default', 'Имате код за отстъпка?',
     'Въведете го тук и сумата ще се преизчисли веднага. '
     'Кодът важи само за артикули без друга намаление.'),
    (' d-panel--cherry', 'cherry — golden trail',
     'Доставка и връщане',
     'Безплатна доставка над 77 лв. Връщане до 14 дни, без въпроси, '
     'стига опаковката да е здрава.'),
    (' d-panel--gold', 'gold — cherry trail',
     'Грижа за изделието',
     'Мийте на ръка с топла вода. Не е подходящо за съдомиялна машина '
     'или микровълнова фурна.'),
    (' d-panel--quiet', 'quiet grey',
     'Размери',
     'Височина 12 см, диаметър 18 см, тегло 640 г.'),
]
A('''<section class="sec" id="panel"><h2>Pattern</h2><h3>Panel</h3>
<p class="note">A heading you can press. Where we own the markup it is
<code>&lt;details&gt;</code>/<code>&lt;summary&gt;</code> &mdash; a real disclosure
widget with no script &mdash; because the clearest case is the coupon panel on the
checkout, and somebody arriving with a discount code who cannot reach the field by
keyboard simply does not complete the order. <b>Measured on the live site with a
seeded cart:</b> /cart/ renders one <code>.wc-block-components-panel</code> and
/checkout/ renders one, and both are the coupon.</p>
<p class="note"><b>The swimmer.</b> Open one. The arrow rides the opening edge down
the panel, reaches the bottom and turns a full half-circle &mdash; a tumble turn,
not a mirror flip &mdash; and leaves a streak that is brightest halfway across and
gone at both ends. Close it and the whole thing runs backwards.</p>
<p class="note">It is <em>not</em> an animation. An animation keyed to
<code>[open]</code> plays once and cannot play backwards when the attribute is
removed, so a closing panel would snap. Everything here is arithmetic on one
registered custom property, <code>--swim</code>, transitioned 0&nbsp;&rarr;&nbsp;1:
the arrow&rsquo;s <code>top</code> is
<code>head + swim &times; (100% &minus; 2&times;head)</code> where the 100% is the
panel&rsquo;s own animating height, and the trail&rsquo;s opacity is
<code>1 &minus; 2&times;abs(swim &minus; .5)</code>, which peaks mid-stroke and is
zero at rest. Backwards comes free.</p>
<div style="max-width:560px">''')
for mod, lbl, head, body in PANELS:
    A('<p class="lbl">%s</p>' % lbl)
    A('<details class="d-panel%s"><summary class="d-panel__summary">%s</summary>'
      '<div class="d-panel__content">%s</div></details>' % (mod, head, body))
A('''</div>
<div class="todo"><b>Two honest limits.</b>
1. <code>abs()</code> is Chrome&nbsp;133+. Every declaration that uses it is written
twice, safe value first, so an older browser drops the trail and keeps the swim and
the turn. Decoration must fail to nothing.
2. On <em>Woo&rsquo;s own</em> panel the &ldquo;rides the opening edge&rdquo; part
cannot work: it is a div plus a button whose content React mounts and unmounts, so
there is no height to interpolate and no <code>::details-content</code> to hook. The
content appears at once and the arrow swims down through it. The turn and the trail
still work.</div>
</section>''')


# ------------------------------------------------------ pagination / skeleton ---
PAGES_N, WINDOW = 12, 5
pgcss = []
for grp in ('a', 'b', 'c'):
    for i in range(1, PAGES_N + 1):
        pgcss.append('.d-pagination:has(#pg%s-%d:checked){ --page:%d }' % (grp, i, i))
A('<style>/* gallery chrome: the demo is clickable with no script, so each radio '
  'sets --page. On the real shop these are links and the strip is server-rendered. */\n'
  + '\n'.join(pgcss) + '</style>')

A('''<section class="sec" id="last"><h2>Patterns</h2><h3>Pagination, skeleton</h3>
<p class="note"><b>Pagination.</b> Click through the numbers and watch what moves.
In the middle of the run the <em>numbers</em> shift and the circle stays put; at
either end the numbers cannot shift any further, so the <em>circle</em> moves
instead. That is not two rules with an <code>if</code> between them &mdash; it is
one <code>clamp()</code>:</p>
<p class="note"><code>offset = clamp(0, page &minus; 1 &minus; half, pages &minus;
window)</code>, and the marker sits at <code>(page &minus; 1 &minus; offset)
&times; cell</code>. In the middle <code>offset</code> tracks <code>page</code>
one-for-one so the marker is constant; at the ends the clamp pins
<code>offset</code> so the marker does the moving. One line, both behaviours, and
they cannot disagree with each other.</p>
<p class="note"><b>The wake is two clocks.</b> A trail has to know where the thing
came from, and CSS has no memory of a previous value. So the position is
transitioned twice at different speeds &mdash; <code>--pg-a</code> at 360ms is the
marker, <code>--pg-b</code> at 620ms is a ghost of it. The wake spans between them:
zero width at rest, widest mid-move, and it points backwards on its own, because
the ghost is simply late.</p>
<p class="note">Every target is 2.75em, about 44px. These sit at the bottom of a
long scroll, are used most on a phone, and are the last thing between somebody and
the rest of the catalogue.</p>
''')
for grp, mod, lbl in (('a', '', 'grey — default'),
                      ('b', ' d-pagination--cherry', 'cherry — golden wake'),
                      ('c', ' d-pagination--gold', 'gold — cherry wake')):
    A('<p class="lbl">%s</p>' % lbl)
    A('<nav class="d-pagination%s" aria-label="Страници" '
      'style="--pages:%d;--window:%d;margin:6px 0 22px">' % (mod, PAGES_N, WINDOW))
    A('<span class="d-pagination__step d-pagination__step--prev" aria-hidden="true"></span>')
    A('<div class="d-pagination__track"><ol class="d-pagination__strip">')
    for i in range(1, PAGES_N + 1):
        A('<li><input class="d-pagination__radio" type="radio" name="pg%s" id="pg%s-%d"%s>'
          '<label class="d-pagination__item" for="pg%s-%d">%d</label></li>'
          % (grp, grp, i, ' checked' if i == 1 else '', grp, i, i))
    A('</ol><span class="d-pagination__wake"></span>'
      '<span class="d-pagination__marker"></span>')
    # the ink layer: the same numbers again, clipped to the marker
    A('<ol class="d-pagination__strip d-pagination__strip--ink" aria-hidden="true">')
    for i in range(1, PAGES_N + 1):
        A('<li><span class="d-pagination__item">%d</span></li>' % i)
    A('</ol></div>')
    A('<span class="d-pagination__step d-pagination__step--next" aria-hidden="true"></span>')
    A('</nav>')
A('''<div class="todo"><b>The limit, and it is the important one.</b> WooCommerce
pagination is a set of <em>links</em>. Clicking one is a document navigation, and a
CSS transition cannot cross a page load &mdash; the old document is gone before the
new one paints. Making this animate on the real shop needs cross-document view
transitions (<code>@view-transition{ navigation: auto }</code>, Chrome&nbsp;126+),
which changes the feel of <em>every</em> navigation on the site and not just the
paginator. That is your call, so it is written down and not switched on. Everything
above works today inside one document, which is what you are clicking.</div>
''')

A('''<p class="note" style="margin-top:30px"><b>Skeleton.</b> The shape of content that
has not arrived &mdash; and it has to read <em>with the animation switched off</em>.
motion.css kills every animation on cart, checkout and order-received and under
reduced motion, which are precisely the pages that show skeletons; a skeleton built
as nothing but a moving highlight is invisible on the one page it exists for. So the
resting tone is the design and the shimmer is a bonus. The shimmer is a transform on
a pseudo-element rather than an animated background position, because a grid of
twenty skeletons is the worst possible place to repaint every frame &mdash; the page
is already busy fetching the thing they stand in for.</p>
<div class="grid">''')
for i in range(3):
    A('<article class="d-card">'
      '<div class="d-card__media" style="background:none"><div class="d-skeleton d-skeleton--media" style="height:100%"></div></div>'
      '<div class="d-card__accent d-finish"></div>'
      '<div style="grid-area:title"><div class="d-skeleton d-skeleton--title"></div>'
      '<div class="d-skeleton d-skeleton--text"></div></div>'
      '<div class="d-skeleton" style="grid-area:price;height:1em;width:4em"></div>'
      '<div class="d-skeleton d-skeleton--pill" style="grid-area:cta"></div></article>')
A('''</div>
<p class="lbl" style="margin-top:18px">The same three with the shimmer killed, as they
appear on the checkout &mdash; still legible as placeholders</p>
<div class="grid nomotion">''')
for i in range(3):
    A('<article class="d-card">'
      '<div class="d-card__media" style="background:none"><div class="d-skeleton d-skeleton--media" style="height:100%"></div></div>'
      '<div class="d-card__accent d-finish"></div>'
      '<div style="grid-area:title"><div class="d-skeleton d-skeleton--title"></div>'
      '<div class="d-skeleton d-skeleton--text"></div></div>'
      '<div class="d-skeleton" style="grid-area:price;height:1em;width:4em"></div>'
      '<div class="d-skeleton d-skeleton--pill" style="grid-area:cta"></div></article>')
A('</div></section>')

# ------------------------------------------------------------ slider / scroll ---
A('''<section class="sec" id="slider"><h2>Patterns</h2><h3>Slider, scrollbar</h3>
<p class="note"><b>I probed the browser before writing either of these</b>, in the
same Chrome you are running (141). The customisable range spec &mdash;
<code>appearance:base</code> on <code>input[type=range]</code>,
<code>::slider-fill</code>, <code>::slider-track</code> &mdash; is <b>not shipped
yet</b>. Firefox paints the filled part itself via
<code>::-moz-range-progress</code>; Chrome has no way to, because CSS cannot read
an input&rsquo;s value.</p>
<p class="note">So the slider works completely with no script &mdash; track, thumb,
keyboard, focus ring, all three colours &mdash; and <b>one small script file
&mdash; <code>assets/darling-ui.js</code> &mdash; adds the fill and the wake</b> by
mirroring the value into <code>--val</code>. Without it <code>--val</code> stays 0:
the fill reads empty and the wake never appears. Degraded, never broken. That file
is the only script the whole design system has, and everything in it is something
CSS provably cannot do. I am not going to claim a pure-CSS fill in Chrome, because
there is not one.</p>
<p class="note"><b>The wake used to be in the wrong place, and the reason is worth
knowing.</b> It was positioned with <code>transform: translate(...)</code>, and the
expression contained a percentage &mdash; but in a <em>transform</em>, percentages
resolve against the element&rsquo;s <em>own</em> box, not the container. The
wake&rsquo;s own width is the length of the gap, so where the streak sat depended on
how far the thumb had just moved: near the left on a slow drag, creeping right on a
fast one. Percentages in <code>left</code> resolve against the containing block, so
that is what places it now.</p>
<p class="note"><b>The wake is better here than on the paginator.</b>
<code>--val</code> is set raw on every input event so the thumb never lags your
pointer; <code>--sl-a</code> is a transitioned copy that chases it. Drag fast and
the streak is long; nudge it with an arrow key and it is short. That is a real
velocity, not a faked one &mdash; try both.</p>
<div style="max-width:460px">''')
for mod, lbl, val in ((' ', 'grey — default', 30), (' d-slider--cherry ', 'cherry — golden wake', 55),
                      (' d-slider--gold ', 'gold — cherry wake', 78)):
    A('<p class="lbl">%s</p>' % lbl)
    A('<span class="d-slider%s"><span class="d-slider__wake"></span>'
      '<input class="d-slider__input" type="range" min="0" max="100" value="%d" '
      'aria-label="%s"></span>' % (mod, val, lbl))
A('''</div>
<p class="note" style="margin-top:30px"><b>Scrollbars, and the honest part.</b> First,
a measurement: on the live site with a seeded cart, <b>nothing on /cart/ or
/checkout/ actually scrolls</b> &mdash; I counted every element whose computed
overflow is auto or scroll <em>and</em> whose content overflows, and it is zero on
both. So a scroll region is not a money-path surface today.</p>
<p class="note"><b>A native scrollbar cannot carry a trail.</b>
<code>scrollbar-color</code> takes two colours and nothing else;
<code>::-webkit-scrollbar-thumb</code> is a real box but has no way to know it is
moving and cannot own a pseudo-element behind it. There is no arrangement of CSS
that puts a wake behind a native thumb. A trailing scrollbar means replacing the
scrollbar &mdash; which is the second row below.</p>
<p class="lbl">Native, branded — two colours, no markup, works everywhere</p>
<div class="row">''')
LOREM = ('Керамика, стъкло и дърво, подбрани на ръка. ' * 14)
for mod, lbl in ((' ', 'grey'), (' d-scroll--cherry', 'cherry'), (' d-scroll--gold', 'gold')):
    A('<div class="d-scroll%s" style="width:210px;height:120px;padding:10px;'
      'border:1px solid var(--edge-field);border-radius:var(--radius-m);'
      'font-size:var(--fs-fine)">%s</div>' % (mod, LOREM))
A('''</div>
<p class="lbl" style="margin-top:22px">Ours — position driven by
<code>animation-timeline: scroll()</code>, no script</p>
<div class="row">''')
for mod, lbl in ((' ', 'grey'), (' d-scrollframe--cherry', 'cherry'), (' d-scrollframe--gold', 'gold')):
    A('<div class="d-scrollframe%s" style="width:210px">'
      '<div class="d-scroll" style="height:120px;padding:10px;'
      'font-size:var(--fs-fine)">%s</div>'
      '<span class="d-scrollframe__rail">'
      '<span class="d-scrollframe__wake"></span>'
      '<span class="d-scrollframe__thumb"></span></span></div>' % (mod, LOREM))
A('''</div>
<div class="todo"><b>What our own scrollbar actually costs.</b> It knows exactly
where you are &mdash; a scroll timeline is continuous and exact, and the thumb
tracks the position to the pixel with <em>no script at all</em>. Nothing about
&ldquo;where we are&rdquo; is missing. What it does not get free is what the
operating system gives a native bar:
<b>dragging</b> (a native thumb is draggable because the OS draws it; ours is a
div &mdash; nine lines of script),
<b>its own length</b> (the thumb should be viewport&divide;content long, and CSS
cannot see <code>scrollHeight</code>),
<b>a clock</b> (a scroll timeline is a <em>position</em>: it says &ldquo;you are
42% down&rdquo; perfectly, but it has no memory, so there is no
&ldquo;where was I 200ms ago&rdquo; and therefore no velocity and therefore no
trail), and
<b>OS integration</b> (assistive tech, high-contrast, the &ldquo;always show
scrollbars&rdquo; setting, re-measuring when content changes).
All four are covered by <code>assets/darling-ui.js</code> &mdash; so these three
<em>are</em> draggable, and they <em>do</em> trail. The trade is that we now own
that behaviour instead of the OS.</div>
<div class="todo"><b>One thing the probe turned up that changes an answer I gave
you.</b> <code>::scroll-button()</code>, <code>::scroll-marker</code> and
scroll-driven animations are <em>all</em> live in your Chrome. That means a carousel
with real prev/next buttons and dot indicators is now possible <b>with no
JavaScript at all</b> &mdash; which is a much better answer to your carousel
question than &ldquo;WooCommerce doesn&rsquo;t ship one&rdquo;. Say the word and
that is the next component.</div>
</section>''')

# *** THE REAL FILE, INLINED - NOT A GALLERY-ONLY COPY. ***
# A demo that works because the demo has its own script is not evidence about
# the theme. This is theme/darling/assets/darling-ui.js, byte for byte.
A('<script>\n' + (open(UI_FILE, encoding='utf-8').read()
                   if os.path.exists(UI_FILE) else '') + '\n</script>')

# --------------------------------------------------------------------- icon ---
ICONS = ['check', 'close', 'error', 'info', 'warning', 'chevron-down',
         'chevron-right', 'download', 'mail', 'phone', 'spinner', 'star',
         'star-4', 'search', 'cart', 'user', 'heart', 'menu', 'plus', 'minus',
         'truck', 'return', 'shield']
A('''<section class="sec" id="icon"><h2>Pattern</h2><h3>Icons</h3>
<p class="note"><b>This one is not decoration &mdash; it is what stage 4 of the
dequeue is blocked on.</b> <code>woocommerce.css</code> declares two
<code>@font-face</code> families and paints <b>12 distinct private-use glyphs</b>
from them across 19 rules. The font loads on every page type and 5 glyphs render
on the product page. Take that stylesheet away before we own the marks and the
product page shows empty boxes.</p>
<p class="note"><b>Masks, not a font, and not inline SVG.</b> A font makes every
icon a <em>character</em>: it inherits letter-spacing, it can be selected and
copied into an order note, it falls back to a box when the font fails. Inline SVG
puts the mark in the markup, so one mark used in forty places is forty copies.
A mask over <code>background: currentColor</code> is neither &mdash; the mark
<em>is</em> the ink, so it takes the colour of whatever it sits in, on hover,
inside a cherry button, in Windows High Contrast, with no extra rules.</p>
<div class="fgrid">''')
for name in ICONS:
    A('<span style="display:flex;align-items:center;gap:10px;font-size:var(--fs-meta)">'
      '<span class="d-icon d-icon--%s d-icon--lg"></span>'
      '<code style="font-size:.85em;color:var(--ink-quiet)">%s</code></span>' % (name, name))
A('''</div>
<p class="lbl" style="margin-top:22px">It takes the ink of whatever it is in</p>
<div class="row" style="align-items:center">
<span style="color:var(--c-cherry-deep);font-size:24px"><span class="d-icon d-icon--heart"></span></span>
<span style="color:var(--g-shadow);font-size:24px"><span class="d-icon d-icon--star"></span></span>
<span style="color:var(--ink-quiet);font-size:24px"><span class="d-icon d-icon--truck"></span></span>
<a class="d-btn d-finish" href="#"><span class="d-icon d-icon--cart"></span>&nbsp; В количката</a>
<button class="d-icon-btn"><span class="d-icon d-icon--search"></span></button>
<button class="d-icon-btn"><span class="d-icon d-icon--cart"></span>
  <span class="d-icon-btn__count">3</span></button>
<button class="d-icon-btn"><span class="d-icon d-icon--user"></span></button>
<span style="font-size:24px;color:var(--c-cocoa)"><span class="d-icon d-icon--spinner d-icon--spin"></span></span>
</div>
<div class="todo"><b>The glyph table</b>, so the next person can check the work
rather than trust it: <code>\\e00a</code> downloads &rarr; download,
<code>\\e013</code> remove-a-filter &rarr; close, <code>\\e015</code> message
&rarr; check, <code>\\e016</code> error &rarr; error, <code>\\e017</code>
added-to-cart &rarr; check, <code>\\e019</code> shipping-calculator &rarr;
chevron, <code>\\e01c</code> loading &rarr; spinner, <code>\\e028</code> info
&rarr; info, <code>\\e02d</code> email &rarr; mail, <code>\\e037</code> phone
&rarr; phone. The two star glyphs are deliberately absent: the rating pattern
already draws stars with <code>clip-path</code>, font-independently, and
pointing them at a mask would be a second implementation of a solved thing.<br><br>
<b>Windows High Contrast strips background images</b>, and this mark <em>is</em> a
background &mdash; so without a <code>forced-colors</code> rule every icon would
vanish silently, still 1em, still taking space, painting nothing. There is one.</div>
</section>''')

# -------------------------------------------------------------- header/drawer ---
A('''<section class="sec" id="chrome"><h2>Patterns</h2><h3>Header, nav, mega menu, search</h3>
<p class="note">Ported from <code>style.css</code>, and the port is not a copy.
<code>--d-honey-light</code> became <code>--tint-gold</code>, so a hovered nav link
and a hovered panel row are now the same colour <em>by token</em> rather than by
coincidence. The search pill was the last hard <code>#fff</code> left on the page.
Three hand-typed radii for the same job became <code>--radius-s</code>. The inline
SVGs became <code>.d-icon</code>.</p>
<p class="note"><b>Two behaviour changes, both deliberate.</b> The mega menu opened
on <code>:hover</code> and <code>:focus-within</code> only &mdash; unreachable on a
touch screen that does not emulate hover. Both are kept, and a real
<code>&lt;button aria-expanded&gt;</code> is added alongside. And the current page is
now <em>underlined</em> as well as coloured, because colour alone is the one cue a
colour-blind visitor does not get.</p>
<div style="border:1px solid var(--hairline);border-radius:var(--radius-l)">
<header class="d-header" style="position:relative">
  <div class="d-header__inner">
    <a class="d-header__logo" href="#">Дарлинг</a>
    <nav class="d-nav"><ul>
      <li><a href="#" aria-current="page">Начало</a></li>
      <li class="d-nav__mega"><button class="d-nav__trigger" aria-expanded="false">Категории</button>
        <div class="d-mega"><ul class="d-mega__list">
          <li><a class="d-mega__link" href="#">За кухнята</a></li>
          <li><a class="d-mega__link" href="#">За банята</a></li>
          <li><a class="d-mega__link" href="#">За децата</a></li>
          <li><a class="d-mega__link" href="#">За градината</a></li>
          <li><a class="d-mega__link" href="#">Декорация за дома</a></li>
          <li><a class="d-mega__link" href="#">Подаръци</a></li>
        </ul></div></li>
      <li><a href="#">Промоции</a></li>
      <li><a href="#">За нас</a></li>
    </ul></nav>
    <div class="d-search d-wipe">
      <span class="d-icon d-icon--search"></span>
      <input class="d-wipe__input" type="text" value="керамична купа"
             placeholder="Какво търсиш, darling?" aria-label="Търсене">
      <button class="d-wipe__clear" type="button" aria-label="Изчисти">
        <span class="d-icon d-icon--close"></span></button>
    </div>
    <div class="d-header__actions">
      <button class="d-icon-btn" aria-label="Профил"><span class="d-icon d-icon--user"></span></button>
      <input type="checkbox" class="d-heart" aria-label="Добави в любими">
      <button class="d-icon-btn" aria-label="Количка" data-cart-button><span class="d-icon d-icon--cart"></span>
        <span class="d-icon-btn__count">2</span></button>
      <button class="d-icon-btn d-header__search-sm" aria-label="Търсене"><span class="d-icon d-icon--search"></span></button>
      <button class="d-icon-btn d-header__burger" aria-label="Меню"><span class="d-icon d-icon--menu"></span></button>
    </div>
  </div>
</header>
<div style="padding:26px;background:var(--surface-page);color:var(--ink-quiet);
  font-size:var(--fs-meta)">Hover <b>Категории</b> to open the mega menu &mdash; the
  two stars on each link are masks, not the <code>&#x2726;</code> and
  <code>&#x2727;</code> dingbats the old rule used. Those are missing from Inter and
  fall back to whatever the system has, which on Windows is a different weight and
  on Android is often nothing.</div>
</div>

<h3 style="margin-top:46px">Drawers</h3>
<p class="note">Both are real <code>&lt;dialog&gt;</code> elements, which the old
markup already got right and is worth keeping for reasons easy to lose in a
rewrite: a dialog traps focus, returns it to whatever opened it, closes on Escape,
makes the page behind it inert, and gets <code>::backdrop</code> free. A
<code>&lt;div class="drawer"&gt;</code> gets none of that.</p>
<p class="note"><b>The open animation changed from a keyframe to
<code>@starting-style</code>.</b> The old rule was
<code>animation: darling-drawer-in .22s</code> on <code>[open]</code> &mdash; which
plays once on open and cannot play backwards, so the drawer slid in and then simply
vanished. Same lesson as the panel's swim: transitions reverse, animations do not.</p>
<div class="row">
<button class="d-btn d-btn--quiet" onclick="document.getElementById('dnav').showModal()">Отвори менюто</button>
<button class="d-btn d-btn--quiet" onclick="document.getElementById('dcart').showModal()">Отвори количката</button>
</div>
<dialog class="d-drawer" id="dnav">
  <div class="d-drawer__head">Меню
    <button class="d-drawer__close" aria-label="Затвори" onclick="this.closest('dialog').close()">
      <span class="d-icon d-icon--close"></span></button></div>
  <div class="d-drawer__body d-drawer__nav"><ul>
    <li><a href="#" aria-current="page">Начало</a></li>
    <li><a href="#">За кухнята</a></li>
    <li><a href="#">За банята</a></li>
    <li><a href="#">За децата</a></li>
    <li><a href="#">Подаръци</a></li>
    <li><hr></li>
    <li class="d-drawer__secondary"><a href="#">Доставка и плащане</a></li>
    <li class="d-drawer__secondary"><a href="#">Контакти</a></li>
  </ul></div>
</dialog>
<dialog class="d-drawer d-drawer--end" id="dcart">
  <div class="d-drawer__head">Количка
    <button class="d-drawer__close" aria-label="Затвори" onclick="this.closest('dialog').close()">
      <span class="d-icon d-icon--close"></span></button></div>
  <div class="d-drawer__body"><ul class="d-drawer__list">
    <li class="d-drawer__line">
      <img class="d-drawer__line__thumb" src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e3d9cc'/%3E%3Ccircle cx='50' cy='56' r='26' fill='%23c9b9a6'/%3E%3Cellipse cx='50' cy='36' rx='26' ry='7' fill='%23efe6d9'/%3E%3C/svg%3E" alt="">
      <div class="d-drawer__line__body">
        <span class="d-drawer__line__name">Керамична купа</span>
        <span class="d-drawer__line__meta">Пясъчна</span>
        <div class="d-drawer__line__foot">
          <div class="d-qty d-qty--compact">
            <button class="d-qty__button" aria-label="По-малко">&minus;</button>
            <input class="d-qty__input" type="number" value="1" min="1" aria-label="Количество">
            <button class="d-qty__button" aria-label="Повече">+</button>
          </div>
          <span class="d-drawer__line__price">26,40 лв.</span>
        </div>
      </div>
      <button class="d-drawer__line__rm" aria-label="Премахни"><span class="d-icon d-icon--close"></span></button></li>
    <li class="d-drawer__line">
      <img class="d-drawer__line__thumb" src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e3d9cc'/%3E%3Ccircle cx='50' cy='56' r='26' fill='%23c9b9a6'/%3E%3Cellipse cx='50' cy='36' rx='26' ry='7' fill='%23efe6d9'/%3E%3C/svg%3E" alt="">
      <div class="d-drawer__line__body">
        <span class="d-drawer__line__name">Ленена кърпа</span>
        <span class="d-drawer__line__meta">Натурална</span>
        <div class="d-drawer__line__foot">
          <div class="d-qty d-qty--compact">
            <button class="d-qty__button" aria-label="По-малко">&minus;</button>
            <input class="d-qty__input" type="number" value="2" min="1" aria-label="Количество">
            <button class="d-qty__button" aria-label="Повече">+</button>
          </div>
          <span class="d-drawer__line__price">37,00 лв.</span>
        </div>
      </div>
      <button class="d-drawer__line__rm" aria-label="Премахни"><span class="d-icon d-icon--close"></span></button></li>
    <li class="d-drawer__line">
      <img class="d-drawer__line__thumb" src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e3d9cc'/%3E%3Ccircle cx='50' cy='56' r='26' fill='%23c9b9a6'/%3E%3Cellipse cx='50' cy='36' rx='26' ry='7' fill='%23efe6d9'/%3E%3C/svg%3E" alt="">
      <div class="d-drawer__line__body">
        <span class="d-drawer__line__name">Дървена дъска за рязане</span>
        <span class="d-drawer__line__meta">Дъб</span>
        <div class="d-drawer__line__foot">
          <div class="d-qty d-qty--compact">
            <button class="d-qty__button" aria-label="По-малко">&minus;</button>
            <input class="d-qty__input" type="number" value="1" min="1" aria-label="Количество">
            <button class="d-qty__button" aria-label="Повече">+</button>
          </div>
          <span class="d-drawer__line__price">31,90 лв.</span>
        </div>
      </div>
      <button class="d-drawer__line__rm" aria-label="Премахни"><span class="d-icon d-icon--close"></span></button></li>
  </ul></div>
  <div class="d-drawer__foot">
    <div class="d-progress" data-goal="77" data-value="64.3" style="--pr:.835">
      <p class="d-progress__label"><span class="d-icon d-icon--truck"></span>
      Само още <b>12,70 лв.</b> до безплатна доставка, darling</p>
      <div class="d-progress__track"><div class="d-progress__bar"></div></div>
    </div>
    <div class="d-drawer__total"><span>Общо</span><b>95,30 лв.</b></div>
    <a class="d-btn d-finish" href="#">Към плащане</a>
  </div>
</dialog>
<h3 style="margin-top:46px">Icon motion, and the progress bar</h3>
<p class="note"><b>Your rule, and it is the right one: a mark moves only when
something happens.</b> Nothing idles. An interface where six small things are all
moving is not lively, it is noisy &mdash; and the one mark that <em>is</em>
reporting something gets lost in the other five.</p>
<p class="note">A mask is <em>one silhouette</em>, so it cannot have a spinning
wheel in it. The marks that move are split: the still part is the element's own
mask, and each moving part is a pseudo-element with its own mask and its own
transform-origin. Two pseudo-elements is the budget &mdash; which is exactly two
wheels, or one bow &mdash; and that limit is why the trail on an added-to-cart
lives on the <em>button</em> rather than on the icon.</p>
<div class="row" style="align-items:center;gap:26px">
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <span style="font-size:26px;color:var(--c-cocoa)"><span class="d-icon d-icon--spinner"></span></span>always</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <button class="d-icon-btn" data-cart-button onclick="this.setAttribute('data-added','');setTimeout(()=>this.removeAttribute('data-added'),900)">
  <span class="d-icon d-icon--cart"></span></button>press me</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <button class="d-icon-btn"><span class="d-icon d-icon--user"></span></button>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <button class="d-icon-btn"><span class="d-icon d-icon--search"></span></button>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <input type="checkbox" class="d-heart" aria-label="Любими">tick me</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <button class="d-icon-btn"><span class="d-icon d-icon--close"></span></button>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <a class="d-icon-btn" href="#"><span class="d-icon d-icon--download"></span></a>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <a class="d-icon-btn" href="#"><span class="d-icon d-icon--return"></span></a>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <a class="d-icon-btn" href="#"><span class="d-icon d-icon--chevron-right"></span></a>hover</span>
</div>
<div class="todo"><b>Deliberately still:</b> mail, phone, info, warning, error,
the stars inside a rating, plus and minus. The notices those sit on already
animate &mdash; falling stars, an orbiting star, the excited ones &mdash; and two
animations on one object compete. The heart is a real
<code>&lt;input type="checkbox"&gt;</code>, so <code>:checked</code> does the work:
no script, keyboard-reachable, and a screen reader says &ldquo;checked&rdquo;
without an aria attribute anyone has to remember.</div>

<p class="lbl" style="margin-top:30px">Progress &mdash; three variants, and the
sheen is clipped to the filled part</p>
<div style="max-width:460px;display:grid;gap:22px">
<div class="d-progress" style="--pr:.32">
  <p class="d-progress__label"><span class="d-icon d-icon--truck"></span>
  Само още <b>52,40 лв.</b> до безплатна доставка, darling</p>
  <div class="d-progress__track"><div class="d-progress__bar"></div></div></div>
<div class="d-progress d-progress--cherry" style="--pr:.68">
  <p class="d-progress__label"><span class="d-icon d-icon--truck"></span>
  Само още <b>24,60 лв.</b> до безплатна доставка, darling</p>
  <div class="d-progress__track"><div class="d-progress__bar"></div></div></div>
<div class="d-progress d-progress--gold" data-reached style="--pr:1">
  <p class="d-progress__label"><span class="d-icon d-icon--truck"></span>
  Доставката е безплатна, darling</p>
  <div class="d-progress__track"><div class="d-progress__bar"></div></div></div>
</div>
<p class="lbl" style="margin-top:22px">Press it and watch the completion &mdash;
the fill runs up, the truck drives in, and the gold sheen crosses three times
and stops</p>
<div style="max-width:460px">
<div class="d-progress" id="prdemo" style="--pr:.18">
  <p class="d-progress__label"><span class="d-icon d-icon--truck"></span>
  Само още <b id="prleft">63,10 лв.</b> до безплатна доставка, darling</p>
  <div class="d-progress__track"><div class="d-progress__bar"></div></div>
</div>
<p style="margin-top:12px"><button class="d-btn d-btn--quiet" onclick="prRun()">Пусни отново</button></p>
</div>
<script>
function prRun(){
  var el=document.getElementById('prdemo'), lab=document.getElementById('prleft');
  el.removeAttribute('data-reached');
  el.style.setProperty('--pr','.18'); lab.textContent='63,10 лв.';
  setTimeout(function(){
    el.style.setProperty('--pr','1');
    lab.textContent='0,00 лв.';
    setTimeout(function(){
      el.setAttribute('data-reached','');
      el.querySelector('.d-progress__label').innerHTML =
        '<span class="d-icon d-icon--truck"></span> Доставката е безплатна, darling';
    }, 520);
  }, 240);
}
</script>
<div class="todo"><b>A shine that travels over the empty part says the empty part
is doing something</b>, which is the opposite of what the bar is for &mdash; so the
sheen lives <em>inside</em> the fill and is clipped to it by construction. When the
bar completes it turns gold and runs three times, then stops: a bar that keeps
celebrating at somebody trying to pay is a distraction, not a reward.<br><br>
<b>One real limitation.</b> The native <code>&lt;progress&gt;</code> is the
accessible default and it is styled to match &mdash; but it cannot have the sheen,
because <code>::-webkit-progress-value</code> cannot own a pseudo-element. That is
why the div version exists at all, and it carries
<code>role="progressbar"</code> with the numbers on it.</div>

<p class="lbl" style="margin-top:30px">The clear button sweeps the field and
takes the text with it &mdash; type in the header search and press the x</p>
<div class="todo"><b>One clock drives both.</b> <code>--wipe</code> goes 1&rarr;0;
the x sits at <code>calc(--wipe &times; travel)</code> and the input is masked
with a hard-edged gradient whose stop is at the same place, so the text cannot
survive the sweep or vanish ahead of it. The streak is the two-clock trail again
&mdash; <code>--wipe-b</code> lags, and the wake spans between them.<br><br>
<b>Being straight about &ldquo;letter by letter&rdquo;:</b> the mask edge moves
continuously. It crosses one glyph at a time so letters <em>do</em> go out one
after another, but a letter is clipped mid-stroke as the edge passes rather than
disappearing whole. Snapping per character means wrapping every character in its
own element and rebuilding that on each keystroke. Say the word if you want it;
I do not think it is worth the cost.</div>

<div class="todo"><b>Next batch, in this order:</b> hero + band, category banner +
grid + archive + view toggle, carousel and slideshow controls, product page + PDP
trust, cart drawer contents + shipbar + empty state, footer + footer flair +
newsletter, then blog, 404, consent, a11y toolbar, GPSR, comment form and the
delivery-intake and courier-picker field groups.</div>
</section>''')

# --------------------------------------------------------------------- hero ---
BOW = ('<svg class="d-hero__bow" viewBox="0 0 24 12" fill="currentColor" aria-hidden="true">'
       '<path d="M12 6 L3.2 1.4 C1.8.7 1.8 11.3 3.2 10.6 Z M12 6 l8.8-4.6 c1.4-.7 1.4 9.9 0 9.2 Z"/>'
       '<circle cx="12" cy="6" r="2.4"/></svg>')
A('''<section class="sec" id="hero"><h2>Patterns</h2><h3>Hero, season, empty, collection</h3>
<p class="note"><b>Forty lines deleted rather than ported.</b> The old hero CTA
carried a <em>full copy</em> of the metal treatment &mdash; drift, grain, glow,
breathe, all of it &mdash; living inside the hero rules. That is the finish, and
the finish is a leaf we already own. It is now <code>.d-btn.d-finish</code> and
nothing else.</p>
<p class="note"><b>The full bleed is a grid, not a negative margin.</b> The old
rule reached out of its wrapper with <code>margin-inline: calc(50% &minus; 50vw)</code>,
which works until the page has a scrollbar &mdash; at that point 100vw is wider
than the document and the band pushes a horizontal scrollbar at exactly one
viewport width that nobody tests for.</p>
<p class="lbl">On the grey page</p>''')
A('<div class="d-hero" style="max-width:none">'
  '<div class="d-hero__copy"><p class="d-hero__eyebrow">Ново тази седмица</p>'
  '<h2 class="d-hero__title">Подаръци, които <em>се помнят</em></h2>'
  '<p class="d-hero__sub">Всяко нещо в Дарлинг е избрано на ръка. Ако не бихме го '
  'подарили на близък човек, не го предлагаме и на вас.</p>'
  '<p class="d-hero__actions"><a class="d-btn d-finish" href="#">Разгледай всичко</a>'
  '<a class="d-btn d-btn--quiet" href="#">За нас</a></p></div>'
  '<div class="d-hero__visual"><span class="d-hero__glow"></span>' + BOW +
  '<span class="d-hero__star"></span><span class="d-hero__star"></span>'
  '<span class="d-hero__star"></span><span class="d-hero__star"></span></div>'
  '</div>')
A('<p class="lbl" style="margin-top:26px">The claret band &mdash; full bleed, gold title</p>')
A('</section></div>')
A('<div class="d-hero-band"><div class="d-hero d-hero--red">'
  '<div class="d-hero__copy"><p class="d-hero__eyebrow">Сезонна селекция</p>'
  '<h2 class="d-hero__title">Дом, който <em>ти прилича</em></h2>'
  '<p class="d-hero__sub">Керамика, стъкло и дърво, подбрани на ръка. '
  'Безплатна доставка над 77 лв.</p>'
  '<p class="d-hero__actions"><a class="d-btn d-finish" href="#">Към селекцията</a></p></div>'
  '<div class="d-hero__visual"><span class="d-hero__glow"></span>' + BOW +
  '<span class="d-hero__star"></span><span class="d-hero__star"></span>'
  '<span class="d-hero__star"></span><span class="d-hero__star"></span></div>'
  '</div></div>')
A('''<div class="wrap"><section class="sec">
<p class="lbl" style="margin-top:34px">Season &mdash; a drifting claret gradient,
gold heading, one cream pill</p>
<a class="d-season" href="#" style="text-decoration:none">
  <div><p class="d-season__eyebrow">Лято 2026</p>
  <h3 class="d-season__title">Масата навън</h3>
  <p>Съдове, които издържат на слънце, дъжд и деца.</p></div>
  <span class="d-season__cta">Виж колекцията<span class="d-burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></span>
</a>

<p class="lbl" style="margin-top:34px">Empty &mdash; and it always offers somewhere
to go, because an empty state that only says &ldquo;empty&rdquo; is a dead end on
the one screen where somebody has already failed to find something</p>
<div class="d-empty" style="background:var(--surface-raised);border-radius:var(--radius-l)">
''' + BOW.replace('d-hero__bow', 'd-empty__bow') + '''
  <h3 class="d-empty__title">Количката е празна</h3>
  <p class="d-empty__sub">Още нищо не сте избрали &mdash; но има какво.</p>
  <p class="d-empty__actions"><a class="d-btn d-finish" href="#">Разгледай магазина</a>
  <a class="d-btn d-btn--text" href="#">Последно гледани</a></p>
</div>

<p class="lbl" style="margin-top:34px">Collection &mdash; a category tile. Not the
product card: no price, no basket, and the whole surface is one link.</p>
<div class="grid">''')
for name, count in (('За кухнята', '48 продукта'), ('За банята', '31 продукта'),
                    ('За децата', '22 продукта'), ('Подаръци', '64 продукта')):
    A('<a class="d-collection" href="#"><span class="d-collection__label">%s'
      '<span class="d-collection__count">%s</span></span></a>' % (name, count))
A('</div></section>')

# ---------------------------------------------------------------- catalogue ---
A('''<section class="sec" id="catalogue"><h2>Patterns</h2><h3>Category banner, grid, archive, carousel</h3>
<p class="note"><b>Twenty-eight rules of content were living in the stylesheet.</b>
<code>style.css</code> carried one <code>image-set</code> rule per category, then
again inside a 700px query, hard-coding ten term slugs and thirty file paths.
Adding a category meant editing CSS; renaming a term silently lost its banner;
and nobody could tell by reading the file which images actually exist on disk.
Two of those are invisible until a customer lands on the page.</p>
<p class="note">The folder is the source of truth now &mdash;
<code>scripts/gen-category-banners.js</code> reads
<code>assets/img/banners/</code> and writes
<code>src/generated/category-banners.css</code>. <b>11 banners found, 11 rules, 9
narrow overrides</b>; the hand-written version had 28, half of them a 700px query
that repeated the 1x source as the 2x source. A term with no image is now
reported at build time instead of rendering an empty claret box.</p>
<div class="d-catbanner">
  <div class="d-catbanner__img" style="background-image:linear-gradient(120deg,#8d6f52,#c9a97a)"></div>
  <div class="d-catbanner__text">
    <h2 class="d-catbanner__title">За кухнята</h2>
    <p class="d-catbanner__desc">Керамика, дърво и стъкло за всекидневната маса
    &mdash; подбрани така, че да издържат на употреба, не само на снимка.</p>
    <p class="d-catbanner__coming">Скоро: серия &bdquo;Пясък&ldquo;</p>
  </div>
</div>

<p class="lbl" style="margin-top:26px">Toolbar and view toggle</p>
<div class="d-toolbar">
  <p class="d-toolbar__count">Показани 1&ndash;12 от 48</p>
  <span class="d-toolbar__spacer"></span>
  <label class="d-field" style="margin:0"><select class="d-field__select">
    <option>Подредба по подразбиране</option><option>Най-нови</option>
    <option>Цена: ниска към висока</option></select></label>
  <div class="d-view">
    <button aria-pressed="true" aria-label="Мрежа"><span class="d-icon d-icon--menu"></span></button>
    <button aria-pressed="false" aria-label="Списък"><span class="d-icon d-icon--menu"></span></button>
  </div>
</div>

<p class="lbl" style="margin-top:26px">Carousel &mdash; a real scroller, with the
buttons your <code>carousel.js</code> already drives</p>
<div class="d-carousel"><div class="d-carousel__row" id="carauto">''')
for n in ('За кухнята','За банята','За децата','За градината','Подаръци','Промоции','Парти','Почистване'):
    A('<a class="d-carousel__tile" href="#"><span>%s</span></a>' % n)
# The buttons are absolutely positioned against .d-carousel, so they have to be
# INSIDE it. An extra </div> after the row put them outside, where they anchored
# to whatever was positioned further up and vanished - and that same stray close
# is what was orphaning every later section from .wrap.
A('''</div>
<button class="d-carousel__btn d-carousel__btn--prev" aria-label="Назад"
  onclick="document.getElementById('carauto').scrollBy({left:-420,behavior:'smooth'})"><span class="d-icon d-icon--chevron-left"></span></button>
<button class="d-carousel__btn d-carousel__btn--next" aria-label="Напред"
  onclick="document.getElementById('carauto').scrollBy({left:420,behavior:'smooth'})"><span class="d-icon d-icon--chevron-right"></span></button>
</div>
<div class="todo"><b>The row is a scroller, not a transform</b> &mdash; it already
was, and that was the right call: a real overflow container can be swiped,
flicked, trackpad-dragged, tabbed through and navigated by a screen reader. A
translated strip does none of those and has to reimplement every one in script.
Only the two arrows need <code>carousel.js</code>.<br><br>
<b>The scriptless version is parked, and I would rather say why than leave a
tempting comment.</b> <code>::scroll-button()</code> and
<code>::scroll-marker</code> would give this row prev/next controls and dot
indicators with no JavaScript at all, and both report as supported in your
Chrome. But <code>::scroll-marker</code> <em>crashes the renderer</em> with this
stylesheet &mdash; &ldquo;Target crashed&rdquo; before first paint, bisected on
the real page, and five hand-written minimal reproductions did <em>not</em>
reproduce it, so I know what to remove and not yet why. And
<code>::scroll-button()</code> rendered but would not place:
<code>anchor(top) + 50%</code> is not the anchor&rsquo;s middle, and
<code>anchor(center)</code>, which is, computed to <code>top: auto</code> and
dropped the button in the bottom-left corner. Two failures and a browser crash
on one feature is where to stop.</div>
</section>''')


# ------------------------------------------------------------------ product ---
# *** THE FIXTURE USES WOO'S CLASS NAMES, NOT OURS, AND THAT IS THE POINT. ***
# The gallery, the tabs and the review list are WooCommerce's markup. The rules
# that style them are in src/adopted/, unlayered, and their whole job is to beat
# woocommerce.css. A fixture written with .d-gallery would render beautifully
# and prove nothing. This one is shaped like the real page - .woocommerce >
# div.product > div.images - so what it shows is whether we won.
THUMB = ("data:image/svg+xml;utf8,"
  "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E"
  "%3Crect width='100' height='100' fill='%23e3d9cc'/%3E"
  "%3Ccircle cx='50' cy='54' r='28' fill='%23c9b9a6'/%3E"
  "%3Cellipse cx='50' cy='34' rx='28' ry='7' fill='%23efe6d9'/%3E%3C/svg%3E")

A('''<section class="sec" id="product"><h2>Patterns</h2>
<h3>Product page &mdash; gallery, buy column, trust, tabs, reviews</h3>
<p class="note"><b>This is the most contested page on the site.</b>
<code>collide.js</code> counts 209 element/property pairs here where our CSS and
WooCommerce&rsquo;s both have an opinion &mdash; more than home, shop and checkout
put together. Everything below is wrapped in
<code>.woocommerce &gt; div.product</code> and uses <em>Woo&rsquo;s</em> class
names, because a fixture written with our own classes would render perfectly and
prove nothing about who wins.</p>
<p class="note"><b>Two defects that are live on darlinghome.bg right now,
measured this morning.</b> WooCommerce builds each tab&rsquo;s shape out of two
5&times;5px pseudo-elements per tab &mdash; quarter-round corners with a lilac
border and a lilac <code>box-shadow</code>. <code>style.css</code> zeroes the
tab&rsquo;s own background and border but never touched its pseudos, so all four
nubs are still painting: <em>2 of 2 tabs, border rgb(207,200,216), shadow
rgb(233,230,237)</em>. And <code>style.css</code> tries to kill Woo&rsquo;s
full-width underline with <code>content:none</code> at specificity (0,3,1)
against Woo&rsquo;s (0,3,2) &mdash; it loses, so Woo&rsquo;s lilac rule and ours
are both drawn, one over the other. The same arithmetic ate the strip&rsquo;s
padding: ours says 0, Woo says 1em, computed is 17px.</p>
<p class="note"><b>What is measured here and what is not.</b> The tab rules were
verified against the live product page. The gallery and the review list were
<em>not</em>: the shop has exactly one product, it has no images and no reviews,
so there is no live DOM for either. They are written against WooCommerce&rsquo;s
own stylesheet and its <code>review.php</code> markup and rendered against this
fixture. Re-check them the day a photographed product with a review exists.</p>

<div class="woocommerce"><div class="product">
<div class="d-product__top">

  <div class="woocommerce-product-gallery woocommerce-product-gallery--with-images woocommerce-product-gallery--columns-4 images">
    <a href="#" class="woocommerce-product-gallery__trigger" aria-label="Уголеми">zoom<span aria-hidden="true"></span></a>
    <div class="flex-viewport">
      <div class="woocommerce-product-gallery__wrapper">
        <div class="woocommerce-product-gallery__image"><a href="#"><img src="''' + CUTOUT + '''" alt=""></a></div>
      </div>
    </div>
    <ol class="flex-control-nav flex-control-thumbs">''')
for i in range(4):
    A('<li><img src="%s" class="%s" alt=""></li>' % (THUMB, 'flex-active' if i == 0 else ''))
A('''</ol>
  </div>

  <div class="summary entry-summary d-product__buy">
    <h1 class="d-product__title">Керамична купа &bdquo;Пясък&ldquo;</h1>
    <p class="d-product__price"><del>32,10</del>&nbsp;26,40&nbsp;&euro;
      <span class="d-bgn">/ 51,64 лв.</span></p>
    <p class="d-product__excerpt">Ръчно глазирана, 22 см. Всяка е малко различна
    &mdash; това е глазурата, не дефект.</p>
    <p class="d-product__stock d-product__stock--low">
      <span class="d-icon d-icon--warning"></span> Остават само 3</p>
    <div class="d-product__atc">
      <div class="d-qty">
        <button class="d-qty__button" aria-label="По-малко"><span class="d-icon d-icon--minus"></span></button>
        <input class="d-qty__input" type="number" value="1" min="1" aria-label="Количество">
        <button class="d-qty__button" aria-label="Повече"><span class="d-icon d-icon--plus"></span></button>
      </div>
      <button class="d-btn d-btn--primary">Добавяне в количката</button>
    </div>
    <div class="d-product__express">
      <div style="display:grid;gap:8px">
        <div style="height:44px;border-radius:var(--radius-pill);background:var(--c-cocoa)"></div>
        <div style="height:44px;border-radius:var(--radius-pill);background:var(--c-grey-300)"></div>
      </div>
    </div>

    <div class="d-trust">
      <p class="d-trust__cod"><span class="d-icon d-icon--shield"></span>
        <strong>Наложен платеж</strong> &mdash; плащаш при получаване</p>
      <p class="d-trust__ship">Еконт и Спиди &middot; до адрес или до офис &middot;
        безплатна доставка над 77&nbsp;&euro;</p>
      <details class="d-panel"><summary class="d-panel__summary">Доставка</summary>
        <div class="d-panel__body"><p>Изпращаме с Еконт или Спиди &mdash; ти избираш
        при поръчката. Обикновено тръгва в рамките на един работен ден.</p></div></details>
      <details class="d-panel"><summary class="d-panel__summary">Връщане и замяна</summary>
        <div class="d-panel__body"><p>14 дни за връщане без причина, стига опаковката
        да е запазена.</p></div></details>
    </div>
  </div>
</div>

<p class="lbl" style="margin-top:30px">Tabs &mdash; the underline travels, and the
trail lags behind it</p>
<div class="woocommerce-tabs wc-tabs-wrapper">
  <ul class="tabs wc-tabs">
    <li class="description_tab active" id="tab-title-description"><a href="#tab-description">Описание</a></li>
    <li class="reviews_tab" id="tab-title-reviews"><a href="#tab-reviews">Отзиви (2)</a></li>
    <li class="darling_gpsr_tab" id="tab-title-gpsr"><a href="#tab-gpsr">Безопасност и производител</a></li>
  </ul>
  <div class="woocommerce-Tabs-panel panel entry-content wc-tab" id="tab-description">
    <h2>Описание</h2>
    <p>Купата е хвърлена на колело и глазирана на ръка, затова две съседни купи
    никога не са напълно еднакви. Издържа на съдомиялна и микровълнова.</p>
  </div>
  <div class="woocommerce-Tabs-panel panel entry-content wc-tab" id="tab-reviews" style="display:none">
    <div id="reviews" class="woocommerce-Reviews">
      <div id="comments">
        <h2 class="woocommerce-Reviews-title">Отзиви <small>(2)</small></h2>
        <ol class="commentlist">
          <li class="review byuser">
            <div class="comment_container">
              <img class="avatar" src="''' + THUMB + '''" alt="">
              <div class="comment-text">
                <div class="star-rating" role="img" aria-label="5 от 5"><span style="width:100%">5</span></div>
                <p class="meta">
                  <strong class="woocommerce-review__author">Мария</strong>
                  <em class="woocommerce-review__verified verified">потвърдена покупка</em>
                  <span class="woocommerce-review__dash">&ndash;</span>
                  <time class="woocommerce-review__published-date">12 юли 2026</time>
                </p>
                <div class="description"><p>По-голяма е, отколкото изглежда на снимката,
                и точно затова я използвам всеки ден. Глазурата е равна.</p></div>
              </div>
            </div>
            <ul class="children"><li class="comment">
              <div class="comment_container">
                <img class="avatar" src="''' + THUMB + '''" alt="">
                <div class="comment-text">
                  <p class="meta"><strong class="woocommerce-review__author">Дарлинг</strong>
                  <span class="woocommerce-review__dash">&ndash;</span>
                  <time>13 юли 2026</time></p>
                  <div class="description"><p>Благодарим, Мария! Радваме се, че е намерила място на масата.</p></div>
                </div>
              </div>
            </li></ul>
          </li>
          <li class="review">
            <div class="comment_container">
              <img class="avatar" src="''' + THUMB + '''" alt="">
              <div class="comment-text">
                <div class="star-rating" role="img" aria-label="4 от 5"><span style="width:80%">4</span></div>
                <p class="meta"><strong class="woocommerce-review__author">Иван</strong>
                <span class="woocommerce-review__dash">&ndash;</span>
                <time>2 август 2026</time></p>
                <div class="description"><p>Хубава е. Свалям една звезда само защото
                чакахме доставката четири дни.</p></div>
              </div>
            </div>
          </li>
        </ol>
      </div>
      <div id="review_form_wrapper"><div id="review_form"><div id="respond" class="comment-respond">
        <span id="reply-title" class="comment-reply-title">Напиши отзив</span>
        <form class="comment-form">
          <p class="comment-form-rating"><label>Твоята оценка</label>
            <span class="stars"><a href="#">1</a><a href="#">2</a><a href="#">3</a><a href="#">4</a><a href="#">5</a></span></p>
          <p class="comment-form-comment"><label class="d-field__label" for="comment">Отзив</label>
            <textarea id="comment" class="d-field__input" rows="4"></textarea></p>
          <p class="comment-form-author"><label class="d-field__label" for="author">Име</label>
            <input id="author" class="d-field__input" type="text"></p>
          <p class="comment-form-cookies-consent">
            <input id="wp-comment-cookies-consent" type="checkbox">
            <label for="wp-comment-cookies-consent">Запомни името ми за следващия път</label></p>
          <p class="form-submit"><input type="submit" id="submit" class="submit" value="Изпрати"></p>
        </form>
      </div></div></div>
    </div>
  </div>
  <div class="woocommerce-Tabs-panel panel entry-content wc-tab" id="tab-gpsr" style="display:none">
    <h2>Безопасност и производител</h2>
    <p><strong>Производител:</strong> Дарлинг 7 ООД, София</p>
    <p><strong>Предупреждения:</strong> не е играчка; ръбовете могат да се нащърбят при удар.</p>
  </div>
</div>

<p class="lbl" style="margin-top:26px">No reviews yet</p>
<div class="woocommerce"><p class="woocommerce-noreviews">Все още няма отзиви.</p></div>

</div></div>
<div class="todo"><b>The travelling underline is not a background on the active
tab.</b> A background cannot move between two elements, and moving is the whole
point. It is two bars on one pair of values &mdash; <code>--tab-x</code> and
<code>--tab-w</code> &mdash; transitioned on two different clocks: the cherry
mark on the UI curve arrives first, the gold ghost on the wake curve is still
catching up, and the lit gap between them <em>is</em> the trail. It points
backwards without anything computing a direction, because the ghost is simply
late. Same trick as the panel&rsquo;s swimmer and the paginator&rsquo;s wake.<br><br>
<b>They are Woo&rsquo;s own pseudo-elements, taken over rather than added.</b>
<code>ul.tabs::before</code> is Woo&rsquo;s lilac rule and <code>::after</code>
is a clearfix; both are redefined, which kills the lilac and costs no extra
markup. Hanging them on the first <code>li</code> instead does not work &mdash;
a pseudo-element is positioned against its own element, so it would measure
<code>--tab-x</code> from that tab&rsquo;s left edge rather than the
strip&rsquo;s.<br><br>
<b>With no script there is no bar at all.</b> Tab widths depend on their text, so
something has to measure; <code>darling-ui.js</code> adds
<code>.d-tabs-live</code> once it has, and until then the selected tab carries a
plain static underline. The two are never both drawn.<br><br>
<b>The thumbnails are a grid and none of them are dimmed.</b> Woo floats them at
25% and then needs <code>clear:left</code> on every 4n+1 child, once per column
count; and it fades every inactive thumb to <code>opacity:.5</code>, which on a
warm-grey page reads as &ldquo;still loading&rdquo;. Ours are all at full
strength with a gold ring on the active one &mdash; a mark that says
&ldquo;this one&rdquo; rather than dimming everything that is not.</div>
<script>
/* Gallery chrome only. On the real page WooCommerce's own tabs script does this;
   here there is nothing to toggle .active, and without a toggle the underline
   has nowhere to travel to. */
(function(){
  var w=document.querySelector('#product .woocommerce-tabs'); if(!w) return;
  w.querySelector('ul.tabs').addEventListener('click',function(e){
    var a=e.target.closest('a'); if(!a) return; e.preventDefault();
    w.querySelectorAll('ul.tabs > li').forEach(function(li){li.classList.remove('active')});
    a.parentNode.classList.add('active');
    w.querySelectorAll('.wc-tab').forEach(function(p){p.style.display='none'});
    var t=w.querySelector(a.getAttribute('href')); if(t) t.style.display='';
  });
})();
</script>
</section>''')


# ------------------------------------------------------------------- cart ---
A('''<section class="sec" id="cart"><h2>Patterns</h2>
<h3>Cart furniture &mdash; the shipping bar&rsquo;s frame, the note, the trust band</h3>
<p class="note"><b>The bar itself is not new.</b> <code>.d-progress</code> already
does the label, the track, the fill, the sheen, the reached state and the
accessible <code>&lt;progress&gt;</code> variant. What was missing was the
<em>frame</em> &mdash; the tinted card the drawer needs around it &mdash; and
that is twelve lines. The old <code>.darling-shipbar</code> was the whole thing
in one lump: its own track, its own gradient, its own shimmer keyframe, usable
nowhere else.</p>
<div style="max-width:420px;background:var(--surface-raised);border-radius:var(--radius-l);padding:var(--space-2xs) 0 var(--space-xs)">
  <div class="d-shipbar">
    <div class="d-progress" style="--pr:.835">
      <p class="d-progress__label"><span class="d-icon d-icon--truck"></span>
      Само още <b>12,70 лв.</b> до безплатна доставка, darling</p>
      <div class="d-progress__track"><div class="d-progress__bar"></div></div>
    </div>
  </div>
  <p class="d-cart-note"><span class="d-icon d-icon--shield"></span>
  Плащаш при получаване &middot; 14 дни за връщане</p>
</div>

<p class="lbl" style="margin-top:26px">The trust band &mdash; hover a column</p>
<ul class="d-trustbar">
  <li><b>Наложен платеж</b><span>Плащаш при получаване, без предплата.</span></li>
  <li><b>Еконт и Спиди</b><span>До адрес или до офис, ти избираш.</span></li>
  <li><b>14 дни за връщане</b><span>Без причина, стига опаковката да е запазена.</span></li>
  <li><b>Пишете ни</b><span>Отговаряме в същия работен ден.</span></li>
</ul>
<div class="todo"><b>The stars are still, and one twinkles when you hover its
column.</b> The legacy band ran the twinkle on all four bullets on an infinite
loop, staggered .8s apart, on the cart and the checkout &mdash; four things
pulsing in the corner of the eye of somebody trying to pay. Your rule for the
icon set was &ldquo;only when something happens&rdquo;, and the money path is
where it matters most.<br><br>
<b>On the cart and checkout it will not twinkle at all</b>, because
<code>motion.css</code> already kills animation outright on those three
templates. That is correct, and it is not a reason to delete the rule &mdash;
the band also appears on the delivery page, where movement is harmless.<br><br>
<b>Two things in the old CSS were both called &ldquo;trust&rdquo;.</b>
<code>.darling-trust</code> is this band; <code>.darling-pdp-trust</code> is the
small panel in the buy column. They are unrelated components with almost the
same name, which is how one gets restyled by accident. Here they are
<code>.d-trustbar</code> and <code>.d-trust</code>, and the mapping is written
down at the top of <code>patterns/cart.css</code> so nobody has to guess
twice.</div>
</section>''')

A('''<section class="sec" id="next"><h2>Status</h2>
<h3>All twelve patterns are written</h3>
<p class="note">card, button, band, notice, rating, field, table, quantity, badge,
panel, pagination and skeleton. Every one is written against markup captured from
the live site rather than against class names, and every one that has to overrule
WooCommerce lives in <code>src/adopted/</code>, outside the cascade layers, because
that is the only place it can win.</p>
<p class="note"><b>What is left is not more patterns.</b> It is the cutover: point
<code>functions.php</code> at the built stylesheet, add <code>add_editor_style()</code>
so the block editor gets the same file, delete <code>style.css</code> and
<code>assets/darling.css</code>, then start taking WooCommerce's own stylesheets off
one handle at a time in the order set out in the surface inventory.</p>
</section></div></body></html>''')

out = ''.join(P)
# A stray cp1252 run in the OUTPUT means something was mangled on the way in and
# the gallery would ship with broken Cyrillic. Fail rather than publish it.
strays = sorted({m.group(0) for m in RUN.finditer(out) if unmangle(m) != m.group(0)})
assert not strays, strays
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(out)
print('gen-gallery: %d sections, %.1f KB -> %s'
      % (out.count('<section class="sec"'), len(out.encode()) / 1024,
         os.path.relpath(OUT_FILE, ROOT)))
