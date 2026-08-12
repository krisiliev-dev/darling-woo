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
import base64, hashlib, html, os, re, sys

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
# *** THE STAMP, AND WHY IT IS NOT DECORATION. ***
# gallery.html INLINES this stylesheet - it does not <link> it. So editing src/
# and running build-css.js changes NOTHING the gallery shows until this script
# runs again, and every gate that reads gallery.html is measuring whatever was
# inlined last time.
#
# Measured 2026-08-11, and it is the reason this exists: a 3px padding change on
# .d-card, built but with the gallery not regenerated, made cascadediff report
# "nothing moved" - a clean all-clear on a change that in fact moves 78
# elements. That is the instrument I was about to gate a few dozen serial merges
# with. It would have blessed every one of them without looking at any of them.
#
# So the built sheet's hash goes into the page, and scripts/_fresh.js refuses to
# measure a gallery whose stamp does not match the build on disk.
CSS_STAMP = hashlib.md5(CSS.encode('utf-8')).hexdigest()
# *** THE GRAIN IS INLINED, AND THIS USED TO SILENTLY NOT DO IT. ***
# The gallery is a standalone file that gets handed around, so every asset it
# needs has to be IN it. The plywood texture is the only binary one.
#
# This matched the literal string `url("../assets/ply-grain.webp")`. finish.css
# now declares the token as `url("/wp-content/themes/darling/assets/ply-grain.webp")`
# - an absolute, site-root path, which is correct for the live site - so the
# replacement stopped matching and did NOTHING. No error: the guard above checks
# the webp file EXISTS, never that the substitution happened. The gallery then
# asked for /wp-content/... , which resolves to nothing outside WordPress, and
# every .d-finish surface in it lost its grain. The owner spotted it by eye.
# Live was never affected - only the page we review on, which is worse in its own
# way: we were reviewing a finish the site does not have.
#
# So: match ANY url() that ends in the filename, and ASSERT it fired. Third time
# tonight that a step which could quietly do nothing did quietly do nothing.
_ply = 'url("data:image/webp;base64,%s")' % base64.b64encode(open(PLY_FILE, 'rb').read()).decode()
CSS, _n = re.subn(r'url\(\s*["\']?[^)"\']*ply-grain\.webp["\']?\s*\)', lambda m: _ply, CSS)
if not _n:
	sys.stderr.write('gen-gallery: the plywood grain was NOT inlined - no url(...ply-grain.webp) in '
	                 'darling.build.css. The gallery would ship without the finish texture.\n')
	raise SystemExit(1)

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

# The real footer, hoisted for the same reason as HEADER_SPECIMEN: the flow
# specimen has to show the footer we ship, not a bulleted list that resembles
# one. The first attempt hand-wrote it with .d-footer__inner, a class that does
# not exist in src/ - which is exactly the failure the owner called out.
FOOTER_SPECIMEN = '''<footer class="d-footer">
  <div>
    <h2 class="d-footer__head">Дарлинг</h2>
    <nav class="d-footer__links">
      <a href="#">За нас</a><a href="#">Контакти</a><a href="#">Доставка</a>
      <a href="#">Връщане и замяна</a><a href="#">Често задавани въпроси</a>
    </nav>
  </div>

  <div class="d-footflair">
    <span class="d-finish d-footflair__rule" aria-hidden="true"></span>
    <span class="d-footflair__mark">
      <span class="d-footflair__bow" aria-hidden="true"></span>
      <i class="d-footflair__s" aria-hidden="true"></i>
      <i class="d-footflair__s" aria-hidden="true"></i>
      <i class="d-footflair__s" aria-hidden="true"></i>
    </span>
    <p class="d-footflair__word">Дарлинг</p>
    <p class="d-footflair__tag">Неща за дома, подбрани с внимание</p>
    <ul class="d-footflair__social">
      <li><a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6A21 21 0 0 0 14.3 3.5c-2.4 0-4 1.46-4 4.14V9.9H7.6V13h2.7v8z"/></svg></a></li>
      <li><a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 7.2A4.8 4.8 0 1 0 16.8 12 4.81 4.81 0 0 0 12 7.2m0 7.92A3.12 3.12 0 1 1 15.12 12 3.12 3.12 0 0 1 12 15.12M18.1 7a1.12 1.12 0 1 1-1.12-1.12A1.12 1.12 0 0 1 18.1 7M16.2 3H7.8A4.8 4.8 0 0 0 3 7.8v8.4A4.8 4.8 0 0 0 7.8 21h8.4a4.8 4.8 0 0 0 4.8-4.8V7.8A4.8 4.8 0 0 0 16.2 3m3 13.2a3 3 0 0 1-3 3H7.8a3 3 0 0 1-3-3V7.8a3 3 0 0 1 3-3h8.4a3 3 0 0 1 3 3Z"/></svg></a></li>
      <li><a href="#" aria-label="Имейл"><span class="d-icon d-icon--mail"></span></a></li>
    </ul>
  </div>

  <div>
    <h2 class="d-footer__head">Дарлинг 7 ООД</h2>
    <div class="d-footer__policies">
      <a href="#">Общи условия</a><a href="#">Поверителност</a><a href="#">Бисквитки</a>
    </div>
    <p class="d-footer__map"><a href="#">ул. Пример 12, София 1000</a></p>
  </div>
</footer>'''

# hoisted beside CUTOUT: the flow specimen needs it too, and it was defined
# a thousand lines below its first use once the flow section moved to the top.
BOW = ('<svg class="d-hero__bow" viewBox="0 0 24 12" fill="currentColor" aria-hidden="true">'
       '<path d="M12 6 L3.2 1.4 C1.8.7 1.8 11.3 3.2 10.6 Z M12 6 l8.8-4.6 c1.4-.7 1.4 9.9 0 9.2 Z"/>'
       '<circle cx="12" cy="6" r="2.4"/></svg>')

P = []
A = P.append

A('<!doctype html><html lang="bg"><head><meta charset="utf-8">')
A('<meta name="viewport" content="width=device-width,initial-scale=1">')
A('<title>Darling components</title>'
  '<meta name="darling-css-stamp" content="' + CSS_STAMP + '">'
  '<style>\n' + CSS + '''
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
/* -- the alignment section's guides. GALLERY CHROME, NOT THE SYSTEM. ---------
   Every guide below is positioned with the SAME token the component reads, so
   the line is not an opinion about where the rail is - it is the rail. A
   component that misses it is missing its own token. */
.algn{position:relative;margin:0 0 26px}
.algn-page{position:relative;max-width:var(--page-max);margin-inline:auto;
  outline:1px solid var(--hairline);border-radius:var(--radius-m)}
.gl{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed var(--g-shadow);
  pointer-events:none;z-index:60;transition:opacity 140ms ease}
.gl--was{border-left-style:dotted;border-left-color:var(--c-cherry)}
.gl > b{position:absolute;top:5px;left:5px;font:var(--fw-medium) 10px/1.4 var(--font-ui);
  letter-spacing:.05em;text-transform:uppercase;color:var(--g-deep);white-space:nowrap;
  background:var(--surface-page);padding:1px 5px;border-radius:3px}
.gl--was > b{color:var(--c-cherry);top:auto;bottom:5px}
.gl--low > b{top:auto;bottom:5px}
.gl--right > b{left:auto;right:5px}
.gl--bar{border-left-color:var(--c-mauve)}
.gl--bar > b{color:var(--c-mauve)}
/* horizontal guides. Vertical rhythm is as much alignment as the left rail is,
   and the section was only drawing one of the two axes. */
.gh{position:absolute;left:0;right:0;height:0;border-top:1px dashed var(--c-mauve);
  z-index:60;pointer-events:none;transition:opacity 140ms ease}
.gh > b{position:absolute;right:8px;top:-16px;font:var(--fw-medium) 10px/1.4 var(--font-ui);
  letter-spacing:.05em;text-transform:uppercase;color:var(--c-mauve);white-space:nowrap;
  background:var(--surface-page);padding:1px 5px;border-radius:3px}
.sec:has(#alg-g:not(:checked)) .gh{opacity:0}
/* the composition matrix. Cells are outlined so a child escaping one is visible
   rather than merely measurable. */
.mx{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.mx--wide{grid-template-columns:1fr;gap:10px}
.mx-cell{border:1px solid var(--hairline);border-radius:var(--radius-s);
  background:var(--surface-page);overflow:visible}
.mx-lbl{margin:0;padding:5px 8px;border-bottom:1px solid var(--hairline);
  font:var(--fw-medium) 10px/1.4 var(--font-ui);letter-spacing:.05em;
  text-transform:uppercase;color:var(--ink-quiet)}
.mx-leaf{font-size:var(--fs-fine)}
.mx-real{border:1px solid var(--hairline);border-radius:var(--radius-s);
  padding:10px;margin:0 0 14px;background:var(--surface-page)}
.mx-alone > div{border:1px dashed var(--c-mauve);border-radius:var(--radius-xs);
  margin:0 0 10px}
/* *** THE SPACE UNDER A FIELD IS NOT PADDING - IT IS A RESERVED LINE. ***
   The owner read it as loose padding, which is a fair reading of an empty gap.
   Tinting it while the guides are on says what it is: room kept for the error
   message so the page does not grow by 18px per invalid field under a thumb
   that is already moving. */
.sec:has(#alg-g:checked) .algn .d-field__error{
  background:color-mix(in oklab, var(--c-cherry) 9%, transparent);border-radius:3px}
.sec:has(#alg-g:checked) .algn .d-fieldgrid{
  background:color-mix(in oklab, var(--g-core) 14%, transparent);border-radius:var(--radius-xs)}
.sec:has(#alg-g:checked) .algn .d-fieldgrid > *{background:var(--surface-page);border-radius:var(--radius-xs)}

.sec:has(#alg-g:not(:checked)) .gl{opacity:0}

/* gallery furniture for the flow specimens: a dashed edge so the GAP is what
   you see. Prefixed and scoped so nothing here can be mistaken for a pattern. */
.flowdemo{ background:var(--surface-quiet,#f4f2ef); padding:var(--space-s); border-radius:var(--radius-m) }
.flowdemo--wide{ max-width:none }
.flowpage{ background:var(--surface-page,#efecea); border-radius:var(--radius-m); overflow:hidden }
/* the width row breaks OUT of .wrap: a demo narrower than the cap it is
   demonstrating shows nothing, which is why .alignwide and .alignfull looked
   identical in the first version */
.flowfull{ background:var(--surface-page,#efecea); padding-block:var(--space-s);
  /* *** THE WIDTH ROW IS FULL BLEED, ON PURPOSE. *** The owner: "I liked the
     section showing what the actual widths are unconstrained." A demo of
     percentages inside a padded container measures percentages OF THE CONTAINER,
     which is not the number anybody wants to read. 100vw against the real page. */
  width:100vw; margin-inline:calc(50% - 50vw) }
/* two whole pages side by side, so the edge rule is visible rather than asserted */
.edgepair{ display:grid; grid-template-columns:repeat(auto-fit,minmax(19rem,1fr)); gap:var(--space-m) }
.edgepair .d-section-title{ font-size:var(--fs-h4,1rem) }
/* gallery furniture: a frame for text that is invisible on purpose, and the
   switch that neutralises the utility so it can be seen at all */
.nsldemo{ max-width:22rem; background:var(--surface-raised,#fff);
  border-radius:var(--radius-l); padding:var(--space-m);
  box-shadow:inset 0 0 0 1px color-mix(in oklab, currentColor 12%, transparent) }
/* GALLERY ONLY - TRANCHE 6's BEFORE. These are woocommerce.css's own six values,
   restored on the left column so the owner can see what patterns/forms.css
   replaces. Nothing here ships; the class is applied by a button. */
.t6-woo .col-1 .form-row{ display:block; padding:3px; margin:0 }
.t6-woo .col-1 .form-row-wide{ clear:both }
.t6-woo .col-1 .form-row .input-text{ display:inline-block; width:auto }
.t6-woo .col-1 .password-input{ display:flex; flex-direction:column;
  justify-content:center }
.t6-woo .col-1 .show-password-input{ position:relative; inset:auto;
  transform:translateY(-15.2px); translate:none; margin-inline-start:auto }
.t6-woo .col-1 .woocommerce-form-login__submit{ float:left; margin-right:1em }
/* GALLERY ONLY. The gallery caps its prose at a measure, which is right for a
   note and wrong for an alignment specimen - has-text-align-right aligned to the
   end of the MEASURE and read as broken. The box is the ruler here. */
.algdemo p{ max-width:none }
/* GALLERY ONLY. A frame for the two CAPTURED specimens, so a full page of
   WooCommerce markup reads as a page inside the gallery rather than as loose
   markup bleeding into the notes around it. Padding and a surface only - it
   must not style anything INSIDE, or the specimen stops being a specimen. */
.wcspec{ padding:var(--space-m); border-radius:var(--radius-l);
  background:var(--surface-page);
  box-shadow:inset 0 0 0 1px color-mix(in oklab, currentColor 12%, transparent) }
.vhdemo{ background:var(--surface-raised,#fff); border-radius:var(--radius-m);
  padding:var(--space-s); box-shadow:inset 0 0 0 1px var(--hairline,#0002) }
.vhdemo--reveal .screen-reader-text{
  position:static; width:auto; height:auto; margin:0; clip-path:none;
  overflow:visible; white-space:normal;
  outline:1px dashed var(--c-cherry,#d42a3c); outline-offset:2px;
}
/* NO `.flowpage main{display:block}` HERE. It was, and it overrode the very
   rule the specimen exists to show - main is a grid now, and the furniture
   was quietly turning it back into a block. */
</style></head><body><div class="wrap">
<!--GNAV-->
''')

# The header markup, hoisted so the flow specimen can show the REAL header
# rather than a box labelled 'header'. It was already written out twice in this
# file before this; now it is written once.
# *** THE HEADER SPECIMEN IS READ FROM parts/header.html, NOT COPIED. ***
# It was a copy, and it drifted: the gallery advertised Начало / Категории /
# Промоции / За нас while the part ships a Продукти mega trigger plus За нас,
# Помощ, Контакти. Three of the four did not exist on the site. Patching the copy
# then broke it outright - a non-greedy `.*?</ul>` stopped at the mega panel's
# INNER </ul> and left orphan </div></li> behind, which closed the header early
# and collapsed it into a column. That is the same non-greedy trap HANDOFF.md
# already records from b1shell.js, made twice now.
#
# So it is no longer a copy. The part is the source; the gallery shows what
# ships, and cannot say otherwise.
_part = open(os.path.join(THEME, 'parts', 'header.html'), encoding='utf-8').read()
_m = re.search(r'<header\b.*?</header>', _part, re.S)
if not _m:
    sys.stderr.write('gen-gallery: no <header> in parts/header.html\n')
    raise SystemExit(1)
HEADER_SPECIMEN = (_m.group(0)
                   # the specimen sits inside the page rather than at its top
                   .replace('<header class="d-header"', '<header class="d-header" style="position:relative"', 1))


# ---------------------------------------------------------------- WooCommerce --
# *** THE CHECKOUT AND CART SPECIMENS ARE CAPTURED MARKUP, NOT WRITTEN MARKUP. ***
# The owner, on the cutover screenshots: "For both the checkout after looks
# great, with small adjustments. I think we can leave whatever styling the before
# applies and start from the after. Put it in our gallery as its own sections and
# we can review it."
#
# So these two are WooCommerce's own block output, class for class, pulled out of
# the mirror by scripts/cutshot.js's sibling and saved under theme/darling/
# specimens/. Hand-writing them would make the gallery a specimen of my guess
# about Woo's DOM - and this project has paid for that guess twice already, with
# the upsell cards and the add-to-cart button.
#
# They are checked in rather than generated at build time so the gallery builds
# without a mirror; scripts/_extract.js regenerates them when Woo's markup moves.
def _spec(name):
	f = os.path.join(THEME, 'specimens', name + '.html')
	if not os.path.exists(f):
		sys.stderr.write('gen-gallery: missing specimen %s - run scripts/_extract.js\n' % f)
		raise SystemExit(1)
	return open(f, encoding='utf-8').read()

# *** THE CHECKOUT HEADER IS READ FROM page-checkout.html, NOT FROM A PART. ***
# Same rule as the site header - the gallery must not be able to disagree with
# what ships - but a different file, and the difference is the whole story.
#
# This read `parts/checkout-header.html` until now, and that part DOES NOT EXIST.
# It was the first attempt at the checkout header, it blanked the live checkout
# for about twenty minutes, and it was reverted. The generator kept reading it
# because a stale working copy still had the file on disk; on any checkout of
# the repo, gen-gallery.py died on a FileNotFoundError. A gallery that only
# builds on one machine is a gallery nobody else can check.
#
# The header now lives inline in a wp:html block in the checkout template,
# precisely so there is no slug to resolve and no second file to find. So that
# is where this reads it from - the same one file that ships.
_ctpl = os.path.join(THEME, 'templates', 'page-checkout.html')
_cm = re.search(r'<header\b.*?</header>', open(_ctpl, encoding='utf-8').read(), re.S)
if not _cm:
	sys.stderr.write('gen-gallery: no <header> in templates/page-checkout.html\n')
	raise SystemExit(1)
CHECKOUT_HEADER = _cm.group(0).replace('<header class="d-header',
                                       '<header style="position:relative" class="d-header', 1)

WC_CHECKOUT = _spec('checkout')
WC_CART = _spec('cart')

# *** THE PROFILE SPECIMENS ARE CAPTURED THE SAME WAY, FOR THE SAME REASON. ***
# The owner: "One page that we have never gotten to is the Profile page... Right
# now there is just a bullet list with different URLs for the different pages,
# which should be styled. There is also a notice there which appears at the wrong
# place. Plus the actual pages where the bullet list items lead to need to also
# be looked at."
#
# So all six sub-pages are here, not just the dashboard, and they are the live
# DOM rather than my reading of WooCommerce's templates. scripts/acctpages.js
# logs in and saves them; scripts/_extract.js --account cuts them up.
#
# The nav is lifted ONCE. All six pages carry the identical six-item list, and
# six copies of it would mean six chances to review the same thing and none to
# see the content columns next to each other.
MY_PAGE = _spec('account-page')
MY_NAV = _spec('account-nav')
MY_DASH = _spec('account-dashboard')
MY_ORDERS = _spec('account-orders')
MY_ADDRESSES = _spec('account-addresses')
MY_ADDRESS_FORM = _spec('account-address-form')
MY_PAYMENT = _spec('account-payment')
MY_DETAILS = _spec('account-details')
MY_ORDER_VIEW = _spec('account-order-view')

PRODUCTS = [
    ('Керамична купа', '26,40', None, None),
    ('Дървена дъска за рязане с дръжка', '31,90', None, 'Ново'),
    ('Ленена кърпа', '22,00', '18,50', 'Намаление'),
    ('Стъклена кана', '42,00', None, None),
]

def FLOW_CARD(name, price, was, badge):
    """The catalogue card, as one function. The owner asked to see the cards in
    the page flow so the rhythm around them could be judged; writing the markup
    a second time is how the four non-existent classes got into the first
    specimen, so it is written once and called twice."""
    return ('<article class="d-card">'
            '<div class="d-card__media"><img src="%s" alt="">%s</div>'
            '<div class="d-card__accent d-finish"></div>'
            '<h3 class="d-card__title"><a href="#">%s</a></h3>'
            '<p class="d-card__price">%s</p>'
            '<button class="d-card__cta">\u0414\u043e\u0431\u0430\u0432\u0438</button></article>'
            % (CUTOUT,
               ('<span class="d-badge d-badge--on-image" style="position:absolute;top:8px;left:8px">%s</span>' % badge) if badge else '',
               name, price + ' \u043b\u0432.'))

# --------------------------------------------------------------------- flow ---
# TRANCHE 1 OF THE DEQUEUE. These specimens carry WORDPRESS's markup, not ours -
# .wp-site-blocks, .is-layout-flow, .is-layout-constrained - because the thing
# under review is whether OUR rules dress somebody else's boxes correctly.
#
# *** THE GALLERY IS ALREADY THE POST-DEQUEUE PAGE. *** It loads
# darling.build.css and nothing else: no global-styles, no WooCommerce. So what
# these show is not a preview of the fix, it is the fix, rendered under exactly
# the conditions the live page will have once the sheet is dequeued.
A('<section class="sec" id="flow" style="max-width:none;padding-inline:0"><div class="wrap">'
  '<h2>Dequeue tranche 1</h2><h3>Page rhythm &mdash; the gaps between real things</h3>')
A('''<p class="note"><b>Every box below is a real component.</b> The first version of
this specimen used dashed placeholders, and the owner was right that it proved
nothing: a rhythm can only be judged between the things it separates.</p>
<p class="note"><b>And measuring it against the real page corrected the claim.</b>
I said the vertical rhythm of every page had never been ours. That was too broad.
<code>.wp-site-blocks</code> has exactly THREE children &mdash; header, main, footer
&mdash; so WordPress&rsquo;s 24px is <em>the air under the header and above the
footer</em>, on every page. The home page&rsquo;s own section rhythm is already ours,
set by <code>.d-section-title</code> and <code>.d-carousel</code>. What was never
ours is smaller than I said, and more structural.</p>
<p class="lbl">.wp-site-blocks &gt; * &mdash; header, page, footer</p>''')
# *** IT HAS TO WEAR THE CLASS. *** The first version wrapped this in a plain
# .flowpage and the rule under review did not apply to it at all - the specimen
# was demonstrating nothing and the measurement came back with an empty list.
A('<div class="flowpage wp-site-blocks">' + HEADER_SPECIMEN)
A('''<main>
  <div class="d-hero-band"><div class="d-hero d-hero--red d-shell">
    <div class="d-hero__copy"><p class="d-hero__eyebrow">Сезонна селекция</p>
    <h2 class="d-hero__title">Подаръци, които <em>се помнят</em></h2>
    <p class="d-hero__sub">Всяко нещо в Дарлинг е избрано на ръка.</p>
    <p class="d-hero__actions"><a class="d-btn d-finish" href="#">Разгледай всичко</a></p></div>
    <div class="d-hero__visual"><span class="d-hero__glow"></span>''' + BOW + '''</div>
  </div></div>
  <section class="d-section">
  <h2 class="d-section-title d-shell">Изборът на Lady D</h2>
  <div class="d-shell"><div class="d-grid">''')
for name, price, was, badge in PRODUCTS:
    A(FLOW_CARD(name, price, was, badge))
A('''</div></div></section>
  <section class="d-band"><h2 class="d-band__title">Подаръци, които се помнят</h2></section>
</main>''')
A(FOOTER_SPECIMEN)
A('</div>')
A('''<p class="note"><b>The rhythm is a gap on the container, not padding on the
sections.</b> <code>main</code> is a grid with <code>row-gap:--section-y</code>, so
the space belongs to the page rather than to either neighbour. It cannot double,
because there is only one of it; it cannot go missing, because a section with no
opinion still sits in a container that has one; and it has no first- or last-child
case at all &mdash; a gap exists only BETWEEN items, which is why the hero is
flush under the header for free. The <code>:has()</code> exception this carried
for one commit is deleted: with a gap there was never anything to except.</p>
<p class="note"><b>Three lines:</b> a section owns no outer margin, ever; a
container owns the gaps between its children; a surface owns its own padding,
because that padding is inside its background and is not a gap. The footer and
the claret band are surfaces, which is why neither needs a margin above it.</p>
<p class="note"><b>Measured here:</b> header&rarr;page&rarr;footer 0 and 0;
between sections 59px; title&rarr;grid 20px inside <code>.d-section</code>.</p>
<p class="note"><b>The footer links were 44px tall and are now 28px &mdash; on a
mouse only.</b> That 44px is a deliberate tap target, not padding: a column of
13px links at their natural line height is a stack of 18px targets, and the
footer is where the policy links live. Halving it outright would have traded an
accessibility decision for a visual one without saying so, so it is halved behind
<code>@media (pointer: fine)</code>. A phone keeps 44px (WCAG 2.5.5); a desktop
gets 28px, still over the 24px minimum of WCAG 2.5.8.</p>

<p class="lbl">The edges &mdash; a bleed touches, anything else gets air</p>''')
A('''<p class="note">The gap has no leading or trailing edge, which is why the hero
came out flush for free &mdash; and also why the page would have <em>no</em> air at
its ends at all. Correct when a bleed is there; wrong the moment anything else is.
So <code>main</code> carries <code>padding-block:--section-y</code> and a bleed at
an end removes it. Two edge-to-edge surfaces meeting need no air between them;
a card grid butting into the footer does.</p>
<div class="edgepair">''')
for last, label in ((True, 'ends with a bleed &mdash; touches the footer'),
                    (False, 'ends with a grid &mdash; takes the page\u2019s air')):
    A('<div><p class="lbl">%s</p><div class="flowpage wp-site-blocks"><main>' % label)
    A('<section class="d-section"><h2 class="d-section-title d-shell">\u0418\u0437\u0431\u043e\u0440\u044a\u0442</h2>'
      '<div class="d-shell"><div class="d-grid">')
    for name, price, was, badge in PRODUCTS[:2]:
        A(FLOW_CARD(name, price, was, badge))
    A('</div></div></section>')
    if last:
        A('<section class="d-band"><h2 class="d-band__title">\u041f\u043e\u0434\u0430\u0440\u044a\u0446\u0438</h2></section>')
    A('</main>' + FOOTER_SPECIMEN + '</div></div>')
A('''</div>
<p class="lbl">.is-layout-flow &gt; * &mdash; the product page&rsquo;s buy column</p>''')
A('''<div class="flowdemo"><div class="is-layout-flow" style="max-width:23rem">
  <h1 class="d-product__title">Керамична купа</h1>
  <div class="d-product__price">26,40 лв.</div>
  <div class="d-qty"><button class="d-qty__button" aria-label="По-малко">&minus;</button>
    <input class="d-qty__input" type="number" value="1" aria-label="Количество">
    <button class="d-qty__button" aria-label="Повече">+</button></div>
  <p><a class="d-btn d-finish" href="#">Добави в кошницата</a></p>
</div></div>
<p class="note">On the live product page WordPress puts 24px above the price and
24px above the add-to-cart form &mdash; two gaps inside a component we otherwise
own completely. Here they are <code>--stack</code>, which is the same 24px at the
small end. Ownership, not a redesign.</p>

<p class="lbl">.is-layout-constrained &mdash; four widths, each with a job</p>''')
A('''</div><div class="flowfull"><div class="is-layout-constrained">
  <div class="d-prose"><p>.d-prose &mdash; <code>--measure-lede</code>, 44ch. Running
  text, and the About&nbsp;Me page. Керамика, стъкло и дърво, подбрани на ръка.</p></div>
  <div class="d-box d-box--quiet">default &mdash; <code>--measure-page</code>, 966.67px.
  Two thirds of the way from the prose measure to the page rail.</div>
  <div class="alignwide"><div class="d-box d-box--quiet">.alignwide &mdash; <code>--page-max</code>, 1120px</div></div>
  <div class="alignfull"><div class="d-box d-box--quiet">.alignfull &mdash; no cap, edge to edge</div></div>
</div></div><div class="wrap">
<p class="note"><b>The 660px cap is a measure and it has bitten us once.</b> B1
found a constrained layout on three templates capping their children at the prose
measure &mdash; the search results grid rendered at 374px instead of 714px. A
measure belongs on running text, never on a grid or a cart.
<code>--measure-hero</code> is the same token <code>gen-theme-json.js</code> feeds
to theme.json&rsquo;s <code>contentSize</code>, so the two cannot drift.</p>
</div></section>''')

# ------------------------------------------------------------------- hidden ---
# TRANCHE 2. The hard part of a specimen for visually-hidden text is that there
# is, by design, nothing to look at. So it is shown twice: as it ships, and with
# the utility neutralised by a gallery-only class, so the owner can see WHAT is
# hidden and WHERE it sits in the component.
A('<section class="sec" id="hidden"><h2>Dequeue tranche 2</h2>'
  '<h3>Visually hidden text</h3>')
A('<p class="note"><b>Three sheets we are about to remove set '
  '<code>.screen-reader-text</code>, and we set nothing.</b> wc-blocks.css, '
  'woocommerce.css and wp-block-library. Four distinct nodes wear the class on '
  'this site and two of them are words a customer would read &mdash; a stray '
  '&ldquo;количество за&nbsp;&hellip;&rdquo; '
  'label beside the quantity control, and '
  '&ldquo;Задължително&rdquo; beside every '
  'required field on /my-account/. Hidden text going visible is the loudest '
  'dequeue regression and the easiest to miss, because it does not look like a '
  'CSS bug &mdash; it looks like somebody added stray text.</p>')
A('<p class="note"><b>It may not be <code>display:none</code>.</b> That removes '
  'the element from the accessibility tree, which is the opposite of the job '
  '&mdash; this text exists <em>for</em> a screen reader. It stays rendered and '
  'becomes impossible to see: a 1px box, clipped, its 1px pulled back out of the '
  'flow by a negative margin.</p>')

VH_ROWS = ('<p class="d-shell">Количество '
           '<span class="screen-reader-text">количество '
           'за Керамична купа</span></p>'
           '<p class="d-shell">Имейл '
           '<span class="screen-reader-text">Задължително</span></p>')

A('<p class="lbl">As it ships &mdash; the hidden text is present, and invisible</p>')
A('<div class="vhdemo">' + VH_ROWS + '</div>')
A('<p class="lbl">The same markup with the utility switched off &mdash; this is '
  'what the dequeue would put on the page</p>')
A('<div class="vhdemo vhdemo--reveal">' + VH_ROWS + '</div>')
A('<p class="lbl">Focusable &mdash; the skip link. Tab into the box below.</p>')
A('<div class="vhdemo" style="min-height:5.5rem">'
  '<a class="screen-reader-text" href="#hidden">Към '
  'съдържанието</a>'
  '<p class="d-shell"><small>The link above is invisible until it takes focus, '
  'then it becomes a real control. <code>:focus</code> and not '
  '<code>:focus-visible</code>: the element is only reachable by keyboard anyway, '
  'and <code>:focus-visible</code> would leave a programmatic <code>focus()</code> '
  'silent.</small></p></div>')
A('<p class="note"><b>And the recipe now has a name.</b> The same seven '
  'declarations were typed out by hand in <code>field.css</code>, '
  '<code>table.css</code>, <code>patterns/table.css</code> and '
  '<code>checkout.css</code> twice &mdash; seven copies, none of them named. '
  '<code>.d-vh</code> is the name; folding the five existing copies into it is a '
  'sweep, not this commit.</p>')
A('</section>')

# -------------------------------------------------------------------- nsl ---
# TRANCHE 3. The markup is the plugin's, copied from the live /my-account/ - the
# brand fills come in on the style attribute, exactly as they ship, because an
# inline style beats every author rule that is not !important and that is the
# correct outcome here rather than an obstacle.
NSL_SVG_F = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" '
             'fill="#fff" aria-hidden="true"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 '
             '1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 '
             '12 0 0 0 24 12z"/></svg>')
NSL_SVG_G = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" '
             'aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 '
             '0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 '
             '8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" '
             'd="M5.4 14.3a7.1 7.1 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" '
             'd="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z"/></svg>')

def NSL(provider, skin, bg, svg, label):
    return ('<a href="#" rel="nofollow" aria-label="Продължи с %s" '
            'data-plugin="nsl" data-action="connect" data-provider="%s">'
            '<div class="nsl-button nsl-button-default nsl-button-%s" data-skin="%s" '
            'style="background-color:%s;">'
            '<div class="nsl-button-svg-container">%s</div>'
            '<div class="nsl-button-label-container">Продължи с <b>%s</b></div>'
            '</div></a>' % (label, provider, provider, skin, bg, svg, label))

A('<section class="sec" id="social"><h2>Dequeue tranche 3</h2>'
  '<h3>Social login &mdash; the tranche where we do the least</h3>')
A('<p class="note"><b>41 declarations, 12 selectors, one inline &lt;style&gt; the '
  'plugin prints with no id.</b> The biggest tranche after the product grid, and '
  'the one we deliberately leave mostly alone. The brand fills arrive on the '
  'element itself &mdash; <code>style="background-color:#1877F2"</code> &mdash; so '
  'they beat every author rule that is not <code>!important</code>. That is the '
  'right outcome: a &ldquo;Continue with Google&rdquo; button is Google&rsquo;s '
  'mark on our page, and its colour, logo and wording are governed by their brand '
  'terms rather than by our tokens.</p>')
A('<p class="note"><b>So this takes the layout and leaves the brand.</b> How the '
  'two stack, how wide they are, how they sit in the card&rsquo;s rhythm, the type '
  'inside them, a 44px tap target (<code>--tap</code>), and a focus ring &mdash; '
  'which the plugin does not draw at all, so a keyboard user had no idea where '
  'they were in the login card.</p>')
A('<p class="note"><b>And one thing must be replaced rather than dropped.</b> The '
  'Google button is <code>#fff</code> on a card that is also near-white; the '
  'plugin gives it its edge with a 1px box-shadow. Dequeue without replacing that '
  'and the button does not look unstyled &mdash; it disappears.</p>')
A('<p class="lbl">In the login card</p>')
A('<div class="nsldemo"><div class="nsl-container nsl-container-block" data-align="left">'
  '<div class="nsl-container-buttons">'
  + NSL('facebook', 'dark', '#1877F2', NSL_SVG_F, 'Facebook')
  + NSL('google', 'light', '#fff', NSL_SVG_G, 'Google')
  + '</div></div></div>')
A('<p class="note"><b>A defect the plugin ships, found while measuring this.</b> '
  'On the live page the accessible name is literally '
  '<code>Продължи с &lt;b&gt;Facebook&lt;/b&gt;</code> '
  '&mdash; the markup is in the attribute, so a screen reader announces the tags. '
  'axe passes it, because a name exists; <code>scripts/namegate.js</code> now also '
  'fails a name that contains markup. It is the plugin&rsquo;s bug and it needs a '
  'filter on its output, not CSS. The specimen above uses the corrected name.</p>')
A('</section>')

# ------------------------------------------------------------------ upsell ---
# TRANCHE 4. The other product grid - Woo's older block grid, which the cart and
# checkout pages use for "you may also like" and which nothing of ours had ever
# touched. The markup is Woo's, copied from the live cart.
def UPSELL(name, price, badge):
    return ('<li class="wc-block-grid__product">'
            '<a href="#" class="wc-block-grid__product-link">'
            # NO NESTED <a>. The first draft wrapped the image in its own link
            # inside the product link - invalid HTML, and it left the outer link
            # with no accessible name because the inner one swallowed the title.
            # scripts/namegate.js failed the build on it, which is the whole
            # point of the gate: it caught this in the spec page, not on the site.
            '<div class="wc-block-components-product-image">'
            '<img src="%s" alt=""></div>'
            '<div class="wc-block-grid__product-title">%s</div></a>'
            '<div class="wc-block-grid__product-price wc-block-components-product-price">'
            '<span class="wc-block-components-product-price__value">%s лв.</span></div>'
            '<div class="wp-block-button wc-block-grid__product-add-to-cart '
            'wc-block-components-product-button">'
            '<a href="#" class="wp-block-button__link">Добави</a>'
            '</div></li>' % (CUTOUT, name, price))

A('<section class="sec" id="upsell"><h2>Dequeue tranche 4</h2>'
  '<h3>&bdquo;Може би ще харесате&ldquo; '
  '&mdash; the second product grid</h3>')
A('<p class="note"><b>There are two product grids on this site and they share '
  'nothing.</b> The shop, home and 404 use '
  '<code>ul.wp-block-post-template &gt; li.wp-block-post.product</code>, which '
  '<code>adopted/card.css</code> dresses. The cart and checkout pages use this one '
  '&mdash; <code>ul.wc-block-grid__products &gt; li.wc-block-grid__product</code> '
  '&mdash; and it was wearing WooCommerce&rsquo;s clothes end to end and nothing of '
  'ours. <b>Not the cart drawer</b>, which is a different component and was already '
  'ours.</p>')
A('<p class="note"><b>Both grids are <code>&lt;ul&gt;</code>, and that is the '
  'loudest thing in the tranche.</b> With the sheets off, this one went '
  '<code>display:flex &rarr; block</code>, <code>padding-left 0 &rarr; 40px</code> '
  'and <code>list-style none &rarr; disc</code>: a product grid with bullets down '
  'the left. The list <em>semantics</em> stay &mdash; &ldquo;list, 4 items&rdquo; is '
  'how somebody knows how many products are there &mdash; only the marker and the '
  'indent go.</p>')
A('<p class="note">Woo lays it out as flex with <code>margin:0 -8px</code> and a '
  'transparent 16px border on each card standing in for the gap, the pre-'
  '<code>gap</code> idiom. It is replaced with the same auto-fill arithmetic as '
  '<code>.d-grid</code>, so the two product grids finally agree about how wide a '
  'product is and how far apart they sit. <b>This is what it looks like after the '
  'dequeue</b> &mdash; the gallery loads no WooCommerce CSS, so what you see here '
  'is our rules alone.</p>')
A('<ul class="wc-block-grid__products">')
for name, price, was, badge in PRODUCTS:
    A(UPSELL(name, price, badge))
A('</ul>')
A('</section>')

# ------------------------------------------------------------------ addcart ---
# TRANCHE 5. WooCommerce's add-to-cart form and the review form's star picker,
# both copied from the live product page. Neither was in the gallery, which is
# why neither had ever been reviewed.
A('<section class="sec" id="addcart"><h2>Dequeue tranche 5</h2>'
  '<h3>Add to cart, and the star picker</h3>')
A('<p class="note"><b>Woo lays this form out two ways at once and we had claimed '
  'neither.</b> The block editor&rsquo;s sheet makes <code>form.cart</code> a grid; '
  '<code>woocommerce.css</code>, written years earlier, floats the quantity beside '
  'the button. With both sheets off the quantity stacked above a shrink-wrapped '
  'button. One rule replaces both idioms &mdash; <code>auto 1fr</code>, quantity '
  'then button, with the float explicitly cleared so nothing of the old one is '
  'left to leak.</p>')
# *** THE WRAPPER NEEDS `.woocommerce`. *** adopted/quantity.css styles
# `.woocommerce .quantity input.qty`, and the first version of this specimen had
# no such ancestor - so the field rendered as a bare browser input and looked
# nothing like the product page. The real page has it; the specimen must too.
A('<div class="nsldemo woocommerce" style="max-width:26rem">'
  '<div class="wp-block-woocommerce-add-to-cart-form">'
  '<form class="cart" action="#" method="post">'
  '<div class="quantity">'
  '<label class="screen-reader-text" for="gq">количество за Керамична купа</label>'
  '<input type="number" id="gq" class="input-text qty text" name="quantity" '
  'value="1" min="1" max="3" step="1" inputmode="numeric" autocomplete="off">'
  '</div>'
  '<button type="submit" name="add-to-cart" class="single_add_to_cart_button button alt wp-element-button">'
  'Добавяне в количката</button>'
  '</form></div></div>')
A('<p class="note"><b>The star picker is ours already, and its SIZE was Woo&rsquo;s.</b> '
  'The shape is a mask we draw, so the WooCommerce icon font going with the '
  'dequeue costs nothing &mdash; but the box is <code>1.3em</code>, and the only '
  'thing setting that em was <code>.woocommerce p.stars a{font-size:24px}</code>. '
  'Measured with the sheet off: 31px stars became 21px and the links picked up an '
  'underline they never had. Now <code>1.5rem</code>, which is the same 24px, in '
  'rem because a star is a control and should not resize with whatever paragraph '
  'it lands in.</p>')
A('<div class="nsldemo woocommerce" style="max-width:26rem">'
  '<p class="stars"><span>'
  '<a class="star-1" href="#">1</a><a class="star-2" href="#">2</a>'
  '<a class="star-3" href="#">3</a><a class="star-4" href="#">4</a>'
  '<a class="star-5" href="#">5</a></span></p></div>')
A('</section>')

# --------------------------------------------------------------- account ---
# TRANCHE 6. Same problem as #hidden: what the tranche REMOVES is invisible
# once it is removed, because the gallery loads no WooCommerce CSS at all. So
# the form is shown twice - as it ships, and with a gallery-only class that
# reinstates Woo's own six values, so the owner can see what is being replaced
# rather than take the diff on trust.
A('<section class="sec" id="account"><h2>Dequeue tranche 6</h2>'
  '<h3>Account forms, and the password reveal</h3>')
A('<p class="note"><b>The whole tranche is floats and a 3px padding.</b> '
  'Woo&rsquo;s classic forms predate flexbox: a row is a block with '
  '<code>padding:3px</code>, a wide row clears, the submit floats with a 1em '
  'margin, and the reveal button is hauled into place with '
  '<code>transform:translateY(-15.2px)</code> against a column-direction flex '
  'parent &mdash; a position expressed as an apology. Thirteen declarations, and '
  'the only reason to write any of them down is that removing them moves 48 form '
  'rows on /my-account/ and the classic checkout.</p>')
A('<p class="note"><b>Toggle below reinstates Woo&rsquo;s six values on the left '
  'column only</b>, so the two columns are the before and the after side by '
  'side. Nothing in the toggle ships; it is a gallery-only class.</p>')
A('<p><button type="button" class="d-btn d-btn--quiet" '
  'onclick="document.getElementById(\'t6\').classList.toggle(\'t6-woo\')">'
  'Покажи старото '
  'поведение</button></p>')

def _acctform(kind, heading):
	# The real shapes, from woocommerce/templates/myaccount/form-login.php.
	# `.woocommerce-form` is on both forms; adopted/account.css needs it to
	# reach (0,3,1), so a specimen without it would be testing a different rule.
	o = []
	o.append(u'<div class="col-%s">' % ('1' if kind == 'login' else '2'))
	o.append(u'<h2>%s</h2>' % heading)
	o.append(u'<form class="woocommerce-form woocommerce-form-%s %s" method="post">'
	         % (kind, kind))
	uid = 'username' if kind == 'login' else 'reg_email'
	o.append(u'<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">'
	         u'<label for="%s">%s&nbsp;<span class="required" aria-hidden="true">*</span>'
	         u'<span class="screen-reader-text">Задължително</span>'
	         u'</label>'
	         u'<input type="%s" class="woocommerce-Input woocommerce-Input--text input-text" '
	         u'name="%s" id="%s" autocomplete="%s" value="">'
	         u'</p>'
	         % (uid,
	            (u'Потребителско име или имейл'
	             if kind == 'login' else u'Имейл адрес'),
	            'text' if kind == 'login' else 'email', uid, uid,
	            'username' if kind == 'login' else 'email'))
	pid = 'password' if kind == 'login' else 'reg_password'
	o.append(u'<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">'
	         u'<label for="%s">Парола&nbsp;'
	         u'<span class="required" aria-hidden="true">*</span></label>'
	         u'<span class="password-input">'
	         u'<input class="woocommerce-Input woocommerce-Input--text input-text" '
	         u'type="password" name="%s" id="%s" autocomplete="%s">'
	         u'<button type="button" class="show-password-input" '
	         u'aria-label="Покажи паролата"></button>'
	         u'</span>%s</p>'
	         % (pid, pid, pid,
	            'current-password' if kind == 'login' else 'new-password',
	            (u'<div class="woocommerce-password-strength good">'
	             u'Силата на паролата: добра</div>'
	             u'<div class="woocommerce-password-hint">Поне 8 знака, '
	             u'с големи и малки букви.</div>')
	            if kind == 'register' else u''))
	o.append(u'<p class="form-row">')
	if kind == 'login':
		o.append(u'<label class="woocommerce-form__label woocommerce-form__label-for-checkbox '
		         u'woocommerce-form-login__rememberme">'
		         u'<input class="woocommerce-form__input woocommerce-form__input-checkbox" '
		         u'name="rememberme" type="checkbox" value="forever">'
		         u'<span>Запомни ме</span></label>')
	o.append(u'<button type="submit" class="woocommerce-button button d-btn '
	         u'woocommerce-form-%s__submit" name="%s">%s</button>'
	         % (kind, kind,
	            u'Вход' if kind == 'login'
	            else u'Регистрация'))
	o.append(u'</p>')
	if kind == 'login':
		o.append(u'<p class="woocommerce-LostPassword lost_password">'
		         u'<a href="#account">Забравена '
		         u'парола?</a></p>')
	o.append(u'</form></div>')
	return u''.join(o)

A('<div class="woocommerce" id="t6"><div class="u-columns col2-set" id="customer_login">')
A(_acctform('login', u'Вход'))
A(_acctform('register', u'Регистрация'))
A('</div></div>')
A('<p class="note"><b>What to look for.</b> The gap between a label and its field '
  'is <code>--stack-tight</code> and the gap between rows is <code>--space-s</code>, '
  'both from the form rather than 3px of padding on each row. The input fills the '
  'row. The eye sits at the field&rsquo;s inline end, placed by the row, and stays '
  'there at any width &mdash; drag the window. &ldquo;Запомни '
  'ме&rdquo; and the submit are two rows now, not a float and whatever '
  'landed beside it.</p>')
A('</section>')

# --------------------------------------------------------------- columns ---
# TRANCHE 8's other half. #flow shows the rhythm; this shows the block
# primitives, and it exists because the tranche was written against a
# measurement and never rendered.
A('<section class="sec" id="columns"><h2>Dequeue tranche 8</h2>'
  '<h3>Block columns, and content flow</h3>')
A('<p class="note"><b>Seventeen declarations, and not one of them is a component '
  'anybody designed</b> &mdash; they are the primitives the block editor emits. '
  'They live in <code>patterns/flow.css</code> beside the layout supports because '
  'that file is where WordPress&rsquo;s own structure is claimed.</p>')
A('<p class="note"><b><code>min-width:0</code> is the one that bites hardest.</b> '
  'A flex item&rsquo;s automatic minimum size is its content, so one unbroken '
  'string in one column widens the whole row and pushes its neighbour off. '
  '<code>patterns/layout.css</code> records the same fix for the footer&rsquo;s '
  'children. The second column below holds a URL with no break opportunity in '
  'it; if the row scrolls sideways, the rule is gone.</p>')
A('<div class="wp-block-columns">'
  '<div class="wp-block-column">'
  '<p>Две колони, както '
  'ги изписва редакторът. '
  'Тази има обикновен '
  'текст.</p></div>'
  '<div class="wp-block-column">'
  '<p>А тази има адрес '
  'без място за пренасяне:</p>'
  '<p><a href="#columns">https://darlinghome.bg/product-category/'
  'kuhnya-i-trapezariya-keramika-porcelan-i-stuklo-servizi</a></p></div>'
  '</div>')
A('<p class="note"><b>The wrapper was missing, and rendering it is what found '
  'that.</b> The tranche shipped with <code>.wp-block-column</code> claimed and '
  '<code>.wp-block-columns</code> not, because the ablation reported only the '
  'child &mdash; the live pages hold their columns inside a '
  '<code>wp-container-*</code> hashed layout rule, so disabling core&rsquo;s sheet '
  'moved the child and left the parent looking untouched. The first render of this '
  'specimen came out stacked, full width, one under the other. Two declarations '
  'were doing the work: <code>display:flex</code> on the wrapper and '
  '<code>flex-basis:0</code> on the child over 782px. '
  '<code>flex-grow</code> alone does nothing while the base size is '
  '<code>auto</code>, because auto means max-content &mdash; so the column holding '
  'the URL asked for the whole row and the other one wrapped. That is also why '
  '<code>min-width:0</code> looked fine: the two were never on one line to '
  'compete. Third time an absence has been found by rendering rather than by '
  'measuring.</p>')
A('<p class="note"><b><code>display:flow-root</code> on the post content</b> makes '
  'it contain its children&rsquo;s margins instead of letting the first one escape '
  'through the top. The box below is outlined; its paragraph has a 2rem top margin. '
  'If the outline starts BELOW the gap rather than above it, the margin has '
  'escaped.</p>')
A('<div class="wp-block-post-content" style="box-shadow:inset 0 0 0 1px '
  'color-mix(in oklab, currentColor 25%, transparent);border-radius:var(--radius-m)">'
  '<p style="margin-block-start:2rem">Първият '
  'параграф има '
  'горно поле от 2rem.</p></div>')
A('<p class="note"><b>The three alignment classes</b>, which core writes and we '
  'now write, at <code>:root</code> specificity so a layered rule cannot lose to '
  'a block&rsquo;s own inline layout.</p>')
A('<div class="algdemo" style="box-shadow:inset 0 0 0 1px color-mix(in oklab, '
  'currentColor 25%, transparent);border-radius:var(--radius-m);'
  'padding:var(--space-s)">'
  '<p class="has-text-align-left">has-text-align-left</p>'
  '<p class="has-text-align-center">has-text-align-center</p>'
  '<p class="has-text-align-right">has-text-align-right</p></div>')
A('</section>')

# ------------------------------------------------------------------ tail ---
A('<section class="sec" id="tail"><h2>Dequeue tranches 7 and 9</h2>'
  '<h3>The tail</h3>')
A('<p class="note"><b>Twenty small things belonging to no component, on six '
  'pages.</b> Each is here because removing its sheet moves something. They are '
  'unglamorous by definition &mdash; a float, a font size, two margins and a cap '
  '&mdash; and every one of them is on a page a customer reaches.</p>')
A('<p class="note"><b>The ordering dropdown floated right</b>, which is how it '
  'came to sit beside the results count at all: nobody placed them together, the '
  'float did. <code>.d-toolbar</code> places them now and the float only had to '
  'stop. And the <b>select is the field component</b>, not the fallback net: '
  '<code>.woocommerce-ordering select.orderby</code> is on '
  '<code>.d-field</code>&rsquo;s own selector lists, so it is the same control '
  'as every other dropdown on the site &mdash; same box, same chevron, same '
  'styled menu when you open it.</p>')
A('<div class="woocommerce" style="max-width:44rem">'
  '<div class="wp-block-group d-toolbar">'
  '<p class="woocommerce-result-count">Показване '
  'на 1&ndash;12 от 48 резултата</p>'
  '<form class="woocommerce-ordering" method="get">'
  '<select name="orderby" class="orderby" aria-label="Подреждане">'
  '<option value="popularity">По популярност</option>'
  '<option value="date">По новост</option>'
  '<option value="price">Цена: ниска към висока</option>'
  '</select></form></div></div>')
A('<p class="note"><b>The stock line</b> is meta, not body text, and the only '
  'thing that had ever said so was <code>woocommerce.css</code>.</p>')
A('<div class="woocommerce" style="max-width:44rem"><div class="product">'
  '<p class="stock in-stock">Наличен &mdash; Woo</p>'
  '<p class="d-product__stock d-product__stock--in">Наличен '
  '&mdash; ours</p>'
  '<p class="stock available-on-backorder">Доставка по '
  'заявка &mdash; Woo</p>'
  '<p class="d-product__stock d-product__stock--backorder">Доставка '
  'по заявка &mdash; ours</p>'
  '<p class="stock out-of-stock">Изчерпано &mdash; Woo</p>'
  '<p class="d-product__stock d-product__stock--out">Изчерпано '
  '&mdash; ours</p>'
  '<p class="d-product__stock d-product__stock--low">Остават 3 '
  'бр. &mdash; ours, no Woo class exists</p>'
  '</div></div>')
A('<p class="note"><b>Three states, and the first one is not on the page.</b> '
  '&ldquo;Наличен&rdquo; is hidden, because the '
  'buy button being enabled already says it &mdash; that was decided for '
  '<code>.d-product__stock</code> on the product page, and it applies here now '
  'that Woo&rsquo;s <code>p.stock</code> is on the same selector lists instead of '
  'having its own font-size in <code>woo-tail.css</code>. Backorder is the gold '
  'chip, out of stock the quiet one, and neither stretches to the column. '
  '<b>Each state is shown twice</b> &mdash; Woo&rsquo;s class and ours &mdash; '
  'and the two must be indistinguishable, because they are now one rule. The '
  'in-stock pair is invisible on purpose: both are hidden. Low stock has no Woo '
  'class at all; the theme&rsquo;s own template computes it, which is why that '
  'one keeps only our name.</p>')
A('<p class="note"><b>And the cap on the account page&rsquo;s title goes.</b> '
  '<code>patterns/flow.css</code> decides how wide a page column is; a second '
  'opinion from a plugin is how the site ended up with two rails in the first '
  'place. Below, the same title with the cap reinstated and without it.</p>')
A('<div class="woocommerce-account">'
  '<h1 class="wp-block-post-title" style="max-width:474px">'
  'Моята сметка &mdash; '
  'с тяхната шапка</h1>'
  '<h1 class="wp-block-post-title">'
  'Моята сметка &mdash; '
  'без нея</h1></div>')
A('<p class="note"><b>One correction to what the commit message said.</b> '
  '<code>.wp-block-woocommerce-cart{container-type:inline-size}</code> is claimed '
  'and it is correct to claim it, but the reason given was too strong. It said '
  'dropping it would silently stop every <code>@container</code> rule inside the '
  'cart from matching. There are, today, <b>zero</b> such rules of ours &mdash; '
  '<code>grep</code> finds one <code>@container</code> in the whole system and it '
  'is in <code>media-fail.css</code>. Woo&rsquo;s own cart container queries go '
  'out with Woo&rsquo;s own sheet. So it protects nothing right now; it is kept '
  'because it costs one declaration and the alternative is discovering the need '
  'for it from a broken narrow cart. There is nothing here to render, which is '
  'why this is a paragraph and not a specimen.</p>')
A('</section>')

A('<section class="sec" id="wcheader"><h2>The cutover</h2>'
  '<h3>The checkout header</h3>')
A('<p class="note"><b>The one regression the two sections above could not show.</b> '
  '<code>page-checkout.html</code> pulled '
  '<code>template-part slug="checkout-header" theme="woocommerce/woocommerce"</code> '
  '&mdash; the plugin&rsquo;s header, built from CORE blocks. '
  '<code>patterns/header.css</code> keys everything off <code>.d-header</code>, so '
  'it never reached a single node of it, and core&rsquo;s own flex layout was the '
  'only thing putting the wordmark and the cart on one line. Both stacked at the '
  'left edge the moment that sheet went.</p>')
A('<p class="note"><b>Correction, and it is the expensive one on this page.</b> '
  'This section used to say &ldquo;a theme part beats a plugin part of the same '
  'slug, so the whole fix is a file.&rdquo; That fix <b>blanked the checkout on '
  'the live shop for about twenty minutes</b> &mdash; the template rendered its '
  'header and its footer and no checkout block at all &mdash; and it was reverted. '
  'Two candidates were never separated: the <code>{"theme":"darling"}</code> '
  'reference failing to resolve, or the part file opening with a long HTML comment '
  'before any block markup. I also misdiagnosed the outage as the dequeue and '
  'reverted that first, which cost most of the twenty minutes.</p>')
A('<p class="note"><b>So the question was removed rather than answered.</b> The '
  'header below is inline markup in a <code>wp:html</code> block in '
  '<code>templates/page-checkout.html</code>: no slug to resolve, no second file '
  'to find, no theme attribute to be wrong about &mdash; and it is used on exactly '
  'one template, which is the case where a part buys nothing. If it is ever needed '
  'on a second one, that is the moment to make it a part, with a rendered check on '
  'the page it is added to. It stays minimal because that was WooCommerce&rsquo;s '
  'decision and a good one: no nav, no search, no mega menu, nothing that leads out '
  'of the funnel. The wordmark is the way back if somebody changes their mind; the '
  'cart is what they came to pay for.</p>')
A(CHECKOUT_HEADER)
A('<p class="note"><b>Two details that are not decoration.</b> The cart sits in '
  '<code>.d-header__actions</code> rather than a class of its own &mdash; that '
  'component already carries the flex, the gap and the '
  '<code>margin-inline-start:auto</code> that pushes it to the end, and my first '
  'draft invented <code>.d-header__basket</code> and would have restated all three. '
  'And it carries <code>data-cart-button</code>, because <code>header.css</code> '
  'hides every icon button in that row on a narrow screen except the burger, the '
  'small search and anything with that attribute &mdash; without it the only way '
  'back to the cart vanishes on a phone, on the page where somebody most wants it. '
  'The rail is <code>.d-shell--bar</code>, the same one the site header uses, so '
  'the wordmark lands on the same vertical line here as everywhere else and '
  '<code>aligngate</code> covers it for free.</p>')
A('</section>')

# ------------------------------------------------------------- wc-checkout ---
A('<section class="sec" id="wcheckout" style="max-width:none;padding-inline:0">'
  '<div class="wrap"><h2>The cutover</h2>'
  '<h3>Checkout, with none of WooCommerce&rsquo;s CSS</h3>')
A('<p class="note"><b>This is WooCommerce&rsquo;s own block markup with only our '
  'stylesheet behind it.</b> Not a mock-up and not a copy &mdash; it is the DOM '
  'captured off the live checkout and saved to '
  '<code>theme/darling/specimens/checkout.html</code>, class for class. The '
  'gallery loads no WooCommerce CSS at all, so what is below IS the post-dequeue '
  'page. Every one of the 132 declarations triage reports for '
  '<code>wc-blocks-style-checkout</code> is already gone here.</p>')
A('<p class="note"><b>Four things to look at, because they are what the cutover '
  'actually costs.</b> (1) The <b>address grid</b> pairs again, and it broke '
  'for a reason worth keeping: four of the six paired fields were named '
  '<code>span 1</code> and two were not. A half-named pair does not make half '
  'a row, it makes NO row &mdash; Град took one column, Област took the full '
  'width and started a new line, so each sat alone with a hole beside it and '
  'read as a deliberate full-width field.'
  'its own border and radius, which is right: '
  '<code>adopted/checkout.css</code> already makes the sidebar a card and '
  'Woo&rsquo;s was a second card inside it. (3) Everything is <b>looser</b>, '
  'because their compact paddings go. (4) The column is <b>narrower</b>, because '
  '<code>--w-body</code> at 80% now decides it rather than their constrained '
  'layout.</p>')
A('<p class="note"><b>Not shown, and it is the one regression worth naming.</b> '
  'The live checkout has a stripped-down header built from CORE blocks rather '
  'than <code>.d-header</code>, so <code>patterns/header.css</code> never reaches '
  'it and the wordmark and cart icon lose their row when core&rsquo;s flex layout '
  'goes. It is not in this specimen because the specimen is the checkout BLOCK; '
  'the header is a separate fix and it belongs with the header, not here.</p>')
A('<div class="wcspec">' + WC_CHECKOUT + '</div>')
A('</div></section>')

# ----------------------------------------------------------------- wc-cart ---
A('<section class="sec" id="wcart" style="max-width:none;padding-inline:0">'
  '<div class="wrap"><h2>The cutover</h2>'
  '<h3>Cart, with none of WooCommerce&rsquo;s CSS</h3>')
A('<p class="note"><b>Same again: captured markup, our CSS only.</b> The cart '
  'survives the cutover better than the checkout &mdash; the sidebar card, the '
  'coupon row, the totals and the quantity stepper are all ours already.</p>')
A('<p class="note"><b>Two claims here, and both are small.</b> The <b>items '
  'table</b> does not fill its column: <code>width:100%</code> on '
  '<code>table.wc-block-cart-items</code> was theirs, so the table shrink-wraps '
  'to its content and leaves the column short. And '
  '<b>&ldquo;Продължи към поръчката&rdquo;</b> '
  'renders as a plain link rather than our button &mdash; '
  '<code>.wc-block-cart__submit-button</code> is a real button element that '
  '<code>patterns/button.css</code> does not name yet.</p>')
A('<div class="wcspec">' + WC_CART + '</div>')
A('</div></section>')

# --------------------------------------------------------------- my-account ---
# *** THE PROFILE, AND IT IS SIX PAGES RATHER THAN ONE. *** Everything below is
# captured markup with only our stylesheet behind it, exactly like the two
# sections above. What it shows is a hole: `.woocommerce-MyAccount-navigation`
# and `.woocommerce-MyAccount-content` appear NOWHERE in src/, so the whole
# profile is running on fallback.css and browser defaults.
A('<section class="sec" id="profile" style="max-width:none;padding-inline:0">'
  '<div class="wrap"><h2>The cutover</h2>'
  '<h3>The profile &mdash; six pages, none of them ported</h3>')
A('<p class="note"><b>Measured, not guessed.</b> <code>scripts/acctpages.js</code> '
  'logs in as the parity customer and saves all six account pages; '
  '<code>scripts/_extract.js --account</code> cuts them up. Everything below is '
  'that DOM with our stylesheet and nothing of WooCommerce&rsquo;s &mdash; which '
  'is what the live site is serving right now.</p>')
A('<p class="note"><b>And one Woo stylesheet is still shipping.</b> Every one of '
  'the six captures has <code>select2-css</code> in its head: '
  '<code>plugins/woocommerce/assets/css/select2.css</code>, on the dashboard too, '
  'where there is no select at all. The dequeue sweeps by prefix &mdash; '
  '<code>wc-blocks-</code>, <code>woocommerce-</code>, <code>wc-stripe-blocks</code>, '
  '<code>wp-block-</code> &mdash; and this handle is called plain '
  '<code>select2</code>, so it matches none of them. It is the answer to '
  '&ldquo;are all of Woo&rsquo;s styles dequeued&rdquo;: all but this one. '
  '<b>It must not be dropped before <code>.select2-*</code> is ported</b>, '
  'because the country and area pickers on this form and on checkout are select2 '
  'widgets and dropping the sheet first ships a broken country picker.</p>')

A('<h3>The layout, which is the actual complaint</h3>')
A('<p class="note"><b>&ldquo;Right now there is just a bullet list with different '
  'URLs.&rdquo;</b> Below is a whole profile page as it renders. The nav is a '
  'plain <code>&lt;ul&gt;</code> with browser bullets and browser indentation, and '
  'because nothing makes the two into columns, the content follows the list in '
  'normal flow instead of sitting beside it. That is also why <b>the notice is in '
  'the wrong place</b> &mdash; it is the first child of the content column and the '
  'content column starts below the nav, so a message about the thing you just did '
  'appears halfway down the page under a list of links.</p>')
A('<div class="wcspec">' + MY_PAGE + '</div>')

A('<h3>The navigation on its own</h3>')
A('<p class="note"><b>Six items, one of them destructive.</b> '
  '<code>--dashboard</code>, <code>--orders</code>, <code>--edit-address</code>, '
  '<code>--payment-methods</code>, <code>--edit-account</code> and '
  '<code>--customer-logout</code>, and the current page carries '
  '<code>.is-active</code> plus <code>aria-current="page"</code> &mdash; so the '
  'active state can be styled off the markup that is already there rather than a '
  'class we add. Logout is a link with a nonce in it, which is worth knowing '
  'before anything here is turned into a tab strip: whatever this becomes, that '
  'item should not read as the same kind of thing as the other five.</p>')
A('<div class="wcspec">' + MY_NAV + '</div>')

A('<h3>Табло</h3>')
A('<p class="note">Two paragraphs of prose and the notice slot. Nothing to port, '
  'but it is the page the notice lands on and the reason the misplacement is '
  'visible at all.</p>')
A('<div class="wcspec">' + MY_DASH + '</div>')

A('<h3>Поръчки &mdash; and this is what WooCommerce actually gives you</h3>')
A('<p class="note"><b>Populated at last, with a real order.</b> There was a test '
  'order on the parity account on 12 August (#48, cancelled straight after), so '
  'this is the orders table with a row in it rather than the empty state. '
  '<b>Read the columns, because they are the whole scoping question:</b> '
  'Поръчка, Дата, Статут, Общо, Действия. That is WooCommerce&rsquo;s default '
  '<code>myaccount/orders.php</code> and it is all of it.</p>')
A('<p class="note"><b>What the owner asked for and what is here.</b> The ask was '
  'address, date AND time, total, status, tracking, and a click-through to a '
  'line-item breakdown with documents. Of those: <b>total</b> and <b>status</b> '
  'are here; <b>time</b> is in the markup but not shown &mdash; the cell renders '
  '&ldquo;12 август 2026&rdquo; while the <code>&lt;time datetime&gt;</code> '
  'attribute beside it carries <code>2026-08-12T04:10:58+00:00</code>; '
  '<b>address</b>, <b>tracking</b> and <b>documents</b> are not in this template '
  'at all. Address is on the order, so it is a template change. Tracking and '
  'documents have no source on this site &mdash; the only plugins on an account '
  'page are WooCommerce, the Stripe gateway and our own <code>darling-checkout</code> '
  '&mdash; so they come from Barsy or they do not exist yet.</p>')
A('<div class="wcspec">' + MY_ORDERS + '</div>')

A('<h3>The order&rsquo;s own page &mdash; the breakdown already exists</h3>')
A('<p class="note"><b>This is the click-through, and it is most of what was '
  'asked for.</b> A line-item table with the product and its total, a foot '
  'carrying Междинна сума, Доставка (named: &ldquo;чрез Спиди &mdash; до адрес&rdquo;), '
  'Общо and Начин на плащане, and both addresses underneath. Turning it into an '
  'expanding row inside the table above is a presentation decision on top of data '
  'that is already rendered &mdash; which is a much smaller job than it sounded '
  'like, and worth knowing before anyone builds a second view of it.</p>')
A('<div class="wcspec">' + MY_ORDER_VIEW + '</div>')

A('<h3>Методи за разплащане</h3>')
A('<p class="note"><b>Still the empty state, and it will stay that way here.</b> '
  'Saving a card needs a real card, so this is the one page that cannot be '
  'populated from a test account. The shape is the same as the old empty orders '
  'page: a block notice and a bare <code>&lt;a class="button"&gt;</code> &mdash; '
  'which is now our cherry button, along with Запази адреса and Запазване на '
  'промените. All three were running on the fallback net.</p>')
A('<div class="wcspec">' + MY_PAYMENT + '</div>')

A('<h3>Адреси</h3>')
A('<p class="note"><b>Populated too, because filling the checkout address filled '
  'this.</b> Both cards now hold a real address instead of &ldquo;Все още не сте '
  'попълнили този адрес&rdquo;. The owner wants these to become editable fields '
  'in place rather than a label and a link out to a separate form &mdash; that is '
  'a <code>myaccount/my-address.php</code> override, not CSS.</p>')
A('<p class="note"><b>This one has a real two-column layout already.</b> '
  '<code>.u-columns.col2-set</code> with <code>.col-1</code> and '
  '<code>.col-2</code> is ported in <code>adopted/account.css</code> &mdash; '
  '<code>wooinv.js</code> found those names. What is NOT ported is the pair '
  'inside: <code>.woocommerce-Address-title</code> holds an '
  '<code>&lt;h2&gt;</code> and an edit link that should sit on one line with the '
  'link at the end, and <code>&lt;address&gt;</code> is a raw element with the '
  'browser&rsquo;s italic on it.</p>')
A('<div class="wcspec">' + MY_ADDRESSES + '</div>')

A('<h3>Адрес за фактуриране</h3>')
A('<p class="note"><b>The classic form-row grid, not the block one.</b> '
  '<code>form-row-first</code> / <code>form-row-last</code> / '
  '<code>form-row-wide</code>, with each field wrapped in '
  '<code>&lt;span class="woocommerce-input-wrapper"&gt;</code> &mdash; a different '
  'DOM from the checkout block, and the same visual job. And '
  '<b>two select2 widgets</b>: the real <code>&lt;select&gt;</code> is hidden with '
  '<code>.select2-hidden-accessible</code> and a stack of spans is drawn beside '
  'it. Those spans are why <code>select2.css</code> cannot simply be dequeued.</p>')
A('<p class="note"><b>Read the two country pickers below as a preview, not a '
  'bug.</b> They render TWICE here &mdash; the real <code>&lt;select&gt;</code> and '
  'the span stack side by side &mdash; because the gallery loads no WooCommerce '
  'CSS, and the only thing hiding the real select is '
  '<code>.select2-hidden-accessible</code> in <code>select2.css</code>. '
  'That is precisely what the live form would look like the moment that handle is '
  'added to the sweep with nothing written to replace it, which is the argument '
  'for porting first and dropping second, in that order.</p>')
A('<div class="wcspec">' + MY_ADDRESS_FORM + '</div>')

A('<h3>Детайли на профила</h3>')
A('<p class="note"><b>And the password eye, which is a known open bug and lives '
  'here.</b> <code>.password-input</code> is defined twice &mdash; in '
  '<code>adopted/account.css</code> and again in <code>patterns/forms.css</code> '
  '&mdash; and the <code>padding-inline-end:2.6em</code> that keeps the text clear '
  'of the eye loses. One component, two definitions, and the visible cost is the '
  'reveal button sitting on top of the characters. Also here: '
  '<code>&lt;div class="clear"&gt;</code>, a float clearer from before this form '
  'was a grid, which in a grid is a phantom row; and a real '
  '<code>&lt;fieldset&gt;&lt;legend&gt;</code>, which we have no rule for.</p>')
A('<div class="wcspec">' + MY_DETAILS + '</div>')
A('</div></section>')

# --------------------------------------------------------------------- card ---



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
# *** THE CHERRY BUTTON WAS NOT IN THE BUTTON SECTION. *** Every specimen here
# wore .d-finish, so the base .d-btn - the solid cherry one, which is what a
# .d-card__cta and the filters' Apply actually are - could not be reviewed at
# all. The owner found it by hovering things elsewhere and noticing they behaved
# differently.
A('<a class="d-btn" href="#">Cherry &mdash; the base .d-btn</a>')
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
# *** THE LABEL HAD NO `for` AND DID NOT WRAP THE INPUT, SO IT NAMED NOTHING. ***
# axe, run over this gallery: 10 x `label` [critical]. A <label> that is neither
# associated by `for` nor wrapping its control is decoration - a sighted person
# reads it and a screen reader announces the field as "edit text, blank". The
# pattern's markup contract is `for`/`id`, and the gallery has to show that or it
# teaches the broken shape to whoever copies from it.
for fi, (label, typ, val, hint, err) in enumerate(FIELDS):
    cls = 'd-field d-field--invalid' if err else 'd-field'
    fid = 'gf-%d' % fi
    A('<div class="%s"><label class="d-field__label" for="%s">%s</label>'
      '<input class="d-field__control" id="%s" type="%s" value="%s" placeholder=" ">'
      % (cls, fid, html.escape(label), fid, typ, html.escape(val)))
    if hint:
        A('<p class="d-field__hint">%s</p>' % html.escape(hint))
    A('<p class="d-field__error">%s</p></div>' % html.escape(err))

A('''<div class="d-field"><label class="d-field__label" for="gf-region">Област</label>
<select class="d-field__control" id="gf-region"><option>Изберете област</option><option>София</option>
<option>Пловдив</option></select><p class="d-field__error"></p></div>
<div class="d-field"><label class="d-field__label" for="gf-note">Бележка към поръчката</label>
<textarea class="d-field__control" id="gf-note" placeholder="По избор"></textarea>
<p class="d-field__error"></p></div>
<div class="d-field d-field--disabled"><label class="d-field__label" for="gf-eik">ЕИК</label>
<input class="d-field__control" id="gf-eik" type="text" value="206094211" disabled>
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
<button class="d-icon-btn" aria-label="Търсене"><span class="d-icon d-icon--search"></span></button>
<button class="d-icon-btn" aria-label="Количка"><span class="d-icon d-icon--cart"></span>
  <span class="d-icon-btn__count">3</span></button>
<button class="d-icon-btn" aria-label="Профил"><span class="d-icon d-icon--user"></span></button>
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
A('''<section class="sec" id="chrome"><h2>Patterns</h2><h3>Header, nav, mega menu, search, drawer</h3>
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
<div style="border:1px solid var(--hairline);border-radius:var(--radius-l)">''' + HEADER_SPECIMEN + '''
<div style="padding:26px;background:var(--surface-page);color:var(--ink-quiet);
  font-size:var(--fs-meta)">Click <b>Продукти</b> to open the mega menu &mdash; the
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
  <button class="d-icon-btn" aria-label="Количка" data-cart-button onclick="this.setAttribute('data-added','');setTimeout(()=>this.removeAttribute('data-added'),900)">
  <span class="d-icon d-icon--cart"></span></button>press me</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <button class="d-icon-btn" aria-label="Профил"><span class="d-icon d-icon--user"></span></button>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <button class="d-icon-btn" aria-label="Търсене"><span class="d-icon d-icon--search"></span></button>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <input type="checkbox" class="d-heart" aria-label="Любими">tick me</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <button class="d-icon-btn" aria-label="Затвори"><span class="d-icon d-icon--close"></span></button>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <a class="d-icon-btn" href="#" aria-label="Изтегли"><span class="d-icon d-icon--download"></span></a>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <a class="d-icon-btn" href="#" aria-label="Върни"><span class="d-icon d-icon--return"></span></a>hover</span>
<span style="display:grid;justify-items:center;gap:6px;font-size:var(--fs-fine);color:var(--ink-quiet)">
  <a class="d-icon-btn" href="#" aria-label="Напред"><span class="d-icon d-icon--chevron-right"></span></a>hover</span>
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
A('''<div class="wrap"><section class="sec" id="season"><h2>Pattern</h2><h3>Season band</h3>
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
  <label class="d-field" style="margin:0"><span class="d-vh">Подредба</span><select class="d-field__select" aria-label="Подредба">
    <option>Подредба по подразбиране</option><option>Най-нови</option>
    <option>Цена: ниска към висока</option></select></label>
  <!-- The markup here is COPIED FROM templates/archive-product.html, svg and
       all. It used to be a d-icon span with aria-pressed, which the template
       never emitted - so the gallery showed a working control and the live
       toolbar showed two empty pills. A specimen that does not match the
       template is not a review surface, it is a second implementation. -->
  <div class="d-view">
    <button class="is-active" aria-pressed="true" aria-label="Мрежа"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg></button>
    <button aria-pressed="false" aria-label="Списък"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="5" width="16" height="3" rx="1.5"/><rect x="4" y="10.5" width="16" height="3" rx="1.5"/><rect x="4" y="16" width="16" height="3" rx="1.5"/></svg></button>
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



TABS_MARKUP = '''<section class="sec" id="tabs"><h2>Patterns</h2>
<h3>Tabs</h3>
<p class="note"><b>One row of labels, one panel showing at a time, and an
underline that travels.</b> The mark is not a background on the selected tab
&mdash; a background cannot move between two elements, and moving is the whole
point. It is two bars on one pair of values, <code>--tab-x</code> and
<code>--tab-w</code>, transitioned on two different clocks: the cherry mark on
the UI curve arrives first, the gold ghost on the wake curve is still catching
up, and the lit gap between them <em>is</em> the trail. Nothing computes a
direction; the sign of the gap falls out of the ghost being late. Same trick as
the panel&rsquo;s swimmer and the paginator&rsquo;s wake.</p>
<p class="note"><b>Tab widths depend on their text</b>, so unlike the paginator
there is no cell size to multiply an index by, and CSS cannot measure a box.
<code>darling-ui.js</code> measures the selected tab and publishes the two
numbers. Until it has, the CSS draws <em>no</em> travelling bar at all and the
selected tab carries a plain static underline &mdash; so a page whose script
failed to load still has a correct tab strip, just a still one. The two are
never both drawn.</p>
<div class="d-tabs" id="tabsdemo">
  <ul class="d-tabs__list" role="tablist">
    <li><a class="d-tabs__tab" role="tab" aria-selected="true" href="#tp1">Описание</a></li>
    <li><a class="d-tabs__tab" role="tab" aria-selected="false" href="#tp2">Отзиви (2)</a></li>
    <li><a class="d-tabs__tab" role="tab" aria-selected="false" href="#tp3">Доставка</a></li>
  </ul>
  <div class="d-tabpanel" id="tp1" role="tabpanel">
    <h3>Описание</h3>
    <p>Купата е хвърлена на колело и глазирана на ръка. Две съседни купи никога
    не са напълно еднакви &mdash; това е глазурата, не дефект.</p>
  </div>
  <div class="d-tabpanel" id="tp2" role="tabpanel" hidden>
    <h3>Отзиви</h3><p>Две мнения, средно 4,5 от 5.</p>
  </div>
  <div class="d-tabpanel" id="tp3" role="tabpanel" hidden>
    <h3>Доставка</h3><p>Еконт и Спиди, до адрес или до офис.</p>
  </div>
</div>
<div class="todo"><b>Two tabs on the product page, not three.</b> Owner&rsquo;s
call: <code>Описание</code> and <code>Отзиви</code> are enough, because the care
instructions, the safety warnings, the manufacturer and the attributes all
belong in the description &mdash; as a table, which WooCommerce already emits as
<code>table.shop_attributes</code> and which <code>adopted/table.css</code>
already styles. That is a <em>content</em> change, not a style one: the third tab
is registered in PHP, so removing it is a change to whatever adds the
<code>darling_gpsr</code> tab, not to any file in <code>src/</code>. Written down
here so it does not get lost between the two.<br><br>
<b>Still open:</b> these are links with <code>aria-selected</code>, which is not
strictly correct &mdash; a tab should be a <code>button</code> inside a
<code>role="tablist"</code>, with arrow-key navigation between them. On the
product page the markup is WooCommerce&rsquo;s and we do not get a choice; here
we do, and it should become buttons before this pattern is used anywhere new.
</div>
<script>
/* Gallery chrome only. On a real page whatever owns the tabs owns this. */
(function(){
  var w=document.getElementById('tabsdemo'); if(!w) return;
  w.querySelector('.d-tabs__list').addEventListener('click',function(e){
    var a=e.target.closest('a'); if(!a) return; e.preventDefault();
    w.querySelectorAll('.d-tabs__tab').forEach(function(x){x.setAttribute('aria-selected','false')});
    a.setAttribute('aria-selected','true');
    w.querySelectorAll('.d-tabpanel').forEach(function(p){p.hidden=true});
    var t=w.querySelector(a.getAttribute('href')); if(t) t.hidden=false;
  });
})();
</script>
</section>'''

# --------------------------------------------------------------------- tabs ---
A(TABS_MARKUP)

# ------------------------------------------------------------------ product ---
# *** THE FIXTURE USES WOO'S CLASS NAMES, NOT OURS, AND THAT IS THE POINT. ***
# The gallery, the tabs and the review list are WooCommerce's markup. The rules
# that style them are in src/adopted/, unlayered, and their whole job is to beat
# woocommerce.css. A fixture written with .d-gallery would render beautifully
# and prove nothing. This one is shaped like the real page - .woocommerce >
# div.product > div.images - so what it shows is whether we won.
# *** NO BACKGROUND RECTANGLE. *** The owner asked for the thumbnails to carry
# the main image's background. Measured: they already did - both resolve the same
# radial-gradient - and what hid it was THIS stand-in painting a full-bleed
# opaque rect over it. Real product photographs are cut-outs with transparency
# (the licence register makes that a rendering requirement), so the opaque
# fixture was the thing telling the lie.
THUMB = ("data:image/svg+xml;utf8,"
  "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E"
  "%3Ccircle cx='50' cy='56' r='27' fill='%23c9b9a6'/%3E"
  "%3Cellipse cx='50' cy='36' rx='27' ry='7' fill='%23efe6d9'/%3E%3C/svg%3E")

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
        <div class="woocommerce-product-gallery__image"><a href="#" aria-label="Уголеми снимката"><img src="''' + CUTOUT + '''" alt=""></a></div>
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
      <button class="d-btn d-finish d-burst-host">Добавяне в количката<span
        class="d-burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></button>
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
      <details class="d-panel d-panel--gold"><summary class="d-panel__summary">Доставка</summary>
        <div class="d-panel__content"><p>Изпращаме с Еконт или Спиди &mdash; ти избираш
        при поръчката. Обикновено тръгва в рамките на един работен ден.</p></div></details>
      <details class="d-panel d-panel--gold"><summary class="d-panel__summary">Връщане и замяна</summary>
        <div class="d-panel__content"><p>14 дни за връщане без причина, стига опаковката
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
  </ul>
  <div class="woocommerce-Tabs-panel panel entry-content wc-tab" id="tab-description">
    <h2>Описание</h2>
    <p>Купата е хвърлена на колело и глазирана на ръка, затова две съседни купи
    никога не са напълно еднакви. Издържа на съдомиялна и микровълнова.</p>
    <table class="woocommerce-product-attributes shop_attributes">
      <tr class="woocommerce-product-attributes-item">
        <th class="woocommerce-product-attributes-item__label">Материал</th>
        <td class="woocommerce-product-attributes-item__value"><p>Керамика, ръчна глазура</p></td></tr>
      <tr class="woocommerce-product-attributes-item">
        <th class="woocommerce-product-attributes-item__label">Размери</th>
        <td class="woocommerce-product-attributes-item__value"><p>&Oslash; 22 &times; 9 см</p></td></tr>
      <tr class="woocommerce-product-attributes-item">
        <th class="woocommerce-product-attributes-item__label">Тегло</th>
        <td class="woocommerce-product-attributes-item__value"><p>0,74 кг</p></td></tr>
      <tr class="woocommerce-product-attributes-item">
        <th class="woocommerce-product-attributes-item__label">Цвят</th>
        <td class="woocommerce-product-attributes-item__value"><p>Пясък</p></td></tr>
      <tr class="woocommerce-product-attributes-item">
        <th class="woocommerce-product-attributes-item__label">Грижа</th>
        <td class="woocommerce-product-attributes-item__value"><p>Съдомиялна и микровълнова, без фурна</p></td></tr>
      <tr class="woocommerce-product-attributes-item">
        <th class="woocommerce-product-attributes-item__label">Производител</th>
        <td class="woocommerce-product-attributes-item__value"><p>Дарлинг 7 ООД, София</p></td></tr>
      <tr class="woocommerce-product-attributes-item">
        <th class="woocommerce-product-attributes-item__label">Безопасност</th>
        <td class="woocommerce-product-attributes-item__value"><p>Не е играчка. Ръбовете могат да се нащърбят при удар.</p></td></tr>
    </table>
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
      <p class="lbl" style="margin:22px 0 6px">And the same tab with no reviews yet</p>
      <p class="woocommerce-noreviews">Все още няма отзиви.</p>
      <div id="review_form_wrapper"><div id="review_form"><div id="respond" class="comment-respond">
        <span id="reply-title" class="comment-reply-title">Напиши отзив</span>
        <form id="commentform" class="comment-form">
          <div class="comment-form-rating"><label for="rating">Твоята оценка</label>
            <p class="stars"><span><a class="star-1" href="#">1</a><a class="star-2" href="#">2</a><a
              class="star-3" href="#">3</a><a class="star-4" href="#">4</a><a class="star-5" href="#">5</a></span></p>
          </div>
          <p class="comment-form-comment"><label for="comment">Отзив <span class="required">*</span></label>
            <textarea id="comment" name="comment" cols="45" rows="8" required></textarea></p>
          <p class="comment-form-author"><label for="author">Име <span class="required">*</span></label>
            <input id="author" name="author" type="text" size="30" required></p>
          <p class="comment-form-email"><label for="email">Имейл <span class="required">*</span></label>
            <input id="email" name="email" type="email" size="30" required></p>
          <p class="comment-form-cookies-consent">
            <input id="wp-comment-cookies-consent" name="wp-comment-cookies-consent" type="checkbox" value="yes">
            <label for="wp-comment-cookies-consent">Запомни името ми за следващия път</label></p>
          <p class="form-submit"><input name="submit" type="submit" id="submit" class="submit" value="Изпрати"></p>
        </form>
      </div></div></div>
    </div>
  </div>
</div>

</div></div>
<div class="todo"><b>The stars come out on the click and only on the click.</b>
They were doing both &mdash; out on hover, then thrown again on the click &mdash;
because <code>burst.css</code>&rsquo;s hover rules were written as a bare
<code>:hover</code> back when hover was the only trigger. They are scoped away
from click hosts now, so the season banner keeps its hover and the buy button
has one event. Four times the size, nine of them, 1.5s, and twice as far as the
first attempt threw them.<br><br>
<b>The review form was not styled badly &mdash; it was not styled at all.</b>
Everything in <code>adopted/field.css</code> targets either the block checkout or
the classic checkout, and WooCommerce&rsquo;s review form is neither: it is
WordPress&rsquo;s comment form, a bare <code>&lt;textarea id="comment"&gt;</code>
with no <code>.input-text</code> and no <code>.form-row</code>. Not one rule was
selecting it.<br><br>
<b>The rating picker had the shape but not the behaviour.</b> Woo emits
<code>&lt;p class="stars"&gt;&lt;span&gt;</code> and my fixture said
<code>&lt;span class="stars"&gt;</code>, so <code>p.stars</code> never matched and
five bare links rendered as the text &ldquo;1 2 3 4 5&rdquo;. Now they lift and a
band of light sweeps across them, the same as <code>.d-rating-input</code> &mdash;
in two selectors rather than fifteen, by asking <em>&ldquo;does a hovered star
come after me?&rdquo;</em> instead of enumerating every combination.
<em>Still not right:</em> these are anchors. Woo&rsquo;s picker needs JavaScript,
cannot be operated from the keyboard and tells a screen reader nothing.
<code>.d-rating-input</code> is five real radios and has none of those problems;
swapping them is a PHP change to
<code>woocommerce_comment_form_rating()</code>.<br><br>
<b>The travelling underline is not a background on the active
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
  14 дни за връщане &middot; безопасно плащане</p>
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


FOOTER_MARKUP = '''</div>
<section class="sec" id="footer" style="max-width:none;padding-inline:0">
<div class="wrap" style="padding-bottom:0">
<h2>Patterns</h2><h3>Footer, flair, legal strip, newsletter</h3>
<p class="note"><b>113 legacy rules, and the most valuable line in all of them
is <code>min-height:44px</code> on every link.</b> A column of 13px links at
their natural line height is a stack of 18px targets &mdash; and the footer is
where the policy links live, the ones somebody reaches for on a phone when they
are already annoyed. Kept exactly as it was.</p>
<p class="note"><b>The flair comes first on a phone</b>, as it did before: on a
narrow screen the wordmark and the social links are what a footer is <em>for</em>,
and three columns of text ahead of them is three screens of scrolling past the
point.</p>
<p class="note"><b>The rule between the links and the bow is not a new divider.</b>
<code>patterns/band.css</code> already draws the plywood rule as
<code>.d-band__rule</code>; the footer&rsquo;s name joins that selector list
rather than a second block being written. Same for the gold surface: the gap
report says <code>.d-metal</code> is missing, and it is not &mdash; it is
<code>.d-finish</code>, and <code>.darling-wordmark</code> is
<code>.d-finish--text</code>. The tool cannot see a rename.</p>
</div>

<div class="d-band" style="--surface-band:var(--c-claret)">
  <div class="d-news">
    <span class="d-news__flow" aria-hidden="true"><i style="--a:-42deg;--s:1.30;--d:0.00s"></i><i style="--a:152deg;--s:0.95;--d:0.18s"></i><i style="--a:17deg;--s:1.10;--d:0.36s"></i><i style="--a:186deg;--s:1.40;--d:0.54s"></i><i style="--a:-18deg;--s:0.80;--d:0.72s"></i><i style="--a:209deg;--s:1.15;--d:0.90s"></i><i style="--a:40deg;--s:1.25;--d:1.08s"></i><i style="--a:163deg;--s:0.75;--d:1.26s"></i><i style="--a:-7deg;--s:1.45;--d:1.44s"></i><i style="--a:197deg;--s:1.00;--d:1.62s"></i><i style="--a:29deg;--s:0.85;--d:1.80s"></i><i style="--a:140deg;--s:1.35;--d:1.98s"></i><i style="--a:-30deg;--s:1.05;--d:2.16s"></i><i style="--a:220deg;--s:0.90;--d:2.34s"></i><i style="--a:5deg;--s:1.20;--d:2.52s"></i><i style="--a:174deg;--s:0.70;--d:2.70s"></i></span>
    <h2 class="d-news__title">Писма от <em>Дарлинг</em></h2>
    <p>Веднъж месечно: какво е пристигнало, какво си отива и по някой съвет за
    дома. Без спам, обещаваме.</p>
    <form class="d-news__form">
      <label class="d-news__hp">Не попълвайте<input type="text" tabindex="-1" autocomplete="off"></label>
      <input type="email" placeholder="твоят имейл" aria-label="Имейл">
      <button class="d-btn d-finish" type="submit">Абонирай ме</button>
    </form>
    <p class="d-news__note">Може да се отпишеш по всяко време.</p>
  </div>
</div>

<footer class="d-footer">
  <div>
    <h2 class="d-footer__head">Дарлинг</h2>
    <nav class="d-footer__links">
      <a href="#">За нас</a><a href="#">Контакти</a><a href="#">Доставка</a>
      <a href="#">Връщане и замяна</a><a href="#">Често задавани въпроси</a>
    </nav>
  </div>

  <div class="d-footflair">
    <span class="d-finish d-footflair__rule" aria-hidden="true"></span>
    <span class="d-footflair__mark">
      <span class="d-footflair__bow" aria-hidden="true"></span>
      <i class="d-footflair__s" aria-hidden="true"></i>
      <i class="d-footflair__s" aria-hidden="true"></i>
      <i class="d-footflair__s" aria-hidden="true"></i>
    </span>
    <p class="d-footflair__word">Дарлинг</p>
    <p class="d-footflair__tag">Неща за дома, подбрани с внимание</p>
    <ul class="d-footflair__social">
      <li><a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6A21 21 0 0 0 14.3 3.5c-2.4 0-4 1.46-4 4.14V9.9H7.6V13h2.7v8z"/></svg></a></li>
      <li><a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 7.2A4.8 4.8 0 1 0 16.8 12 4.81 4.81 0 0 0 12 7.2m0 7.92A3.12 3.12 0 1 1 15.12 12 3.12 3.12 0 0 1 12 15.12M18.1 7a1.12 1.12 0 1 1-1.12-1.12A1.12 1.12 0 0 1 18.1 7M16.2 3H7.8A4.8 4.8 0 0 0 3 7.8v8.4A4.8 4.8 0 0 0 7.8 21h8.4a4.8 4.8 0 0 0 4.8-4.8V7.8A4.8 4.8 0 0 0 16.2 3m3 13.2a3 3 0 0 1-3 3H7.8a3 3 0 0 1-3-3V7.8a3 3 0 0 1 3-3h8.4a3 3 0 0 1 3 3Z"/></svg></a></li>
      <li><a href="#" aria-label="Имейл"><span class="d-icon d-icon--mail"></span></a></li>
    </ul>
  </div>

  <div>
    <h2 class="d-footer__head">Дарлинг 7 ООД</h2>
    <div class="d-footer__policies">
      <a href="#">Общи условия</a><a href="#">Поверителност</a><a href="#">Бисквитки</a>
    </div>
    <p class="d-footer__map"><a href="#">ул. Пример 12, София 1000</a></p>
  </div>
</footer>
<div class="d-footer__legal">
  <p>&copy; 2026 Дарлинг 7 ООД &middot; ЕИК 000000000</p>
</div>

<div class="wrap" style="padding-top:0">
<div class="todo"><b>The footer idles, and that is the one deliberate exception.</b>
Everywhere else in this system a mark moves only when something happens. The bow
is the brand mark at the very bottom of the page, and a slow rise and fall reads
as the page breathing rather than as something asking for attention &mdash; the
same call you already made on the hero. Three stars twinkle with it, staggered,
so they are never all bright at once. <code>motion.css</code> still kills every
one of them on cart, checkout and order-received.<br><br>
<b>The wordmark is plain ink, and that is your ruling, not a shortcut.</b>
&ldquo;We shouldn&rsquo;t use the texture on text &mdash; it makes it hard to
read.&rdquo; <code>finish.css</code> records the deleted
<code>.d-finish--text</code> with <em>do not reintroduce this</em> beside it, and
I reintroduced it anyway by reading the legacy <code>.darling-wordmark</code>
mapping without noticing that what it maps to is a comment rather than a rule.
The check caught it.<br><br>
<b>The two stars on the newsletter band are masks, not dingbats.</b> The legacy
pair were <code>content</code> set to a dingbat character, which made them <em>text</em>:
selectable, copied with the page, and read out by a screen reader as
&ldquo;black four pointed star&rdquo;.<br><br>
<b>The email field cannot be the field pattern.</b> <code>.d-field</code> draws a
light surface with a grey edge, which on claret is a hole. This one is the
band&rsquo;s own colour a shade deeper with a lit edge &mdash; and its focus ring
is cream rather than <code>--focus-ring</code>, because a cocoa ring on claret is
invisible. That is the only place in the system where the focus token is
deliberately not used.<br><br>
<b>The social circles lost three of their four hover properties.</b> Legacy moved
them, recoloured them, changed the background <em>and</em> grew a coloured
box-shadow, all on a 42px circle.</div>
</div>
</section>
<div class="wrap">'''

# ------------------------------------------------------------------- footer ---
A(FOOTER_MARKUP)


PAGES_MARKUP = '''<section class="sec" id="pages"><h2>Patterns</h2>
<h3>Accessibility mode, prose, blog, 404, consent, GPSR</h3>
<p class="note"><b>The accessibility switch existed and the mode did not.</b>
Three <code>html.d-a11y</code> rules were already scattered across the hero, the
season band and the category banner, each forcing a title to white on a dark
photograph. That was all of it: no text size, no underlines, no animation kill,
no focus change. The switch was in the markup and in the legacy stylesheet, and
in our system it did three things to three headings.</p>
<p class="note"><b>And the type scale cannot be scaled from the root.</b> The
legacy mode did <code>html.darling-a11y body{ font-size:17px }</code>, which
works because those sizes were relative. Ours are not &mdash;
<code>tokens/type.css</code> declares <code>--fs-body:16px</code> and the rest in
<em>pixels</em>, so a root font-size change moves nothing at all. The mode
redeclares nine size tokens instead, which is the mechanism a token system is
for. The better fix some day is one multiplier, and then those nine lines become
one.</p>
<p class="note"><b>Two of these are not new components.</b> The GPSR block is a
disclosure and a warning, and we already have <code>.d-panel</code> and
<code>.d-notice</code>. The legacy stylesheet wrote a third disclosure and a
fourth notice for it. Both are gone.</p>

<p class="lbl">Prose page &mdash; and an authored &lt;details&gt;, which IS the
quiet panel</p>
<div class="d-prose d-prose--card">
  <h2>Доставка и плащане</h2>
  <p>Изпращаме с Еконт и Спиди, до адрес или до офис. Поръчките, направени до
  16:00 в работен ден, обикновено тръгват същия ден.</p>
  <ul><li>Безплатна доставка над 77&nbsp;&euro;</li><li>Наложен платеж или карта</li>
  <li>14 дни за връщане</li></ul>
  <details class="wp-block-details"><summary>Колко време отнема доставката?</summary>
  <p>До офис обикновено един работен ден, до адрес един до два.</p></details>
  <details class="wp-block-details"><summary>Мога ли да сменя адреса след поръчка?</summary>
  <p>Да, ако пратката още не е предадена на куриера. <a href="#">Пишете ни</a>.</p></details>
</div>

<p class="lbl" style="margin-top:26px">Blog list</p>
<ul class="d-postlist">
  <li><article class="d-post">
    <h2 class="d-post__title"><a href="#">Как да подредим масата за гости</a></h2>
    <p class="d-post__date">12 юли 2026</p>
    <p class="d-post__excerpt">Три чинии, две чаши и малко търпение &mdash; и
    защо ленената покривка е по-прощаваща от памучната. <a href="#">Прочети още</a></p>
  </article></li>
  <li><article class="d-post">
    <h2 class="d-post__title"><a href="#">Грижа за ръчно глазирана керамика</a></h2>
    <p class="d-post__date">2 август 2026</p>
    <p class="d-post__excerpt">Съдомиялна &mdash; да. Фурна &mdash; не. И какво
    всъщност значи, когато две купи не са еднакви.</p>
  </article></li>
</ul>

<p class="lbl" style="margin-top:26px">404</p>
<div class="d-404" style="background:var(--surface-raised);border-radius:var(--radius-l)">
  <h2 class="d-404__title">Тази страница я няма</h2>
  <p class="d-404__sub">Може да е преместена, а може и никога да не е била тук.
  Ето откъде да продължиш.</p>
  <div class="d-404__actions">
    <a class="d-btn d-finish" href="#">Към магазина</a>
  </div>
</div>

<p class="lbl" style="margin-top:26px">GPSR &mdash; a panel and a notice, not a
third disclosure and a fourth notice</p>
<details class="d-panel d-gpsr"><summary class="d-panel__summary">Безопасност и производител</summary>
  <div class="d-panel__content">
    <p><strong>Производител:</strong> Дарлинг 7 ООД, ул. Пример 12, София 1000</p>
    <p class="d-gpsr__warn">Не е играчка. Ръбовете могат да се нащърбят при удар.</p>
  </div>
</details>
<div class="d-notice d-notice--error" style="margin-top:14px" role="alert">
  <p class="d-notice__body">Този артикул не може да бъде изпратен до избраната държава.</p>
</div>

<p class="lbl" style="margin-top:26px">Consent card and the two buttons &mdash;
shown here in place rather than fixed to the window</p>
<div style="position:relative;height:230px;background:var(--surface-quiet);border-radius:var(--radius-l);overflow:hidden">
  <div class="d-consent" style="position:absolute">
    <p>Използваме бисквитки, за да работи количката и да разберем кое си струва.
    <a href="#">Повече</a></p>
    <div class="d-consent__actions">
      <button class="d-btn">Приемам</button>
      <button class="d-btn d-btn--quiet">Само необходимите</button>
    </div>
  </div>
  <button class="d-fab d-fab--a11y" style="position:absolute" aria-label="Достъпен режим"
    aria-pressed="false"
    onclick="var on=document.documentElement.classList.toggle('d-a11y');this.setAttribute('aria-pressed',on)">
    <span class="d-icon d-icon--user"></span></button>
  <a class="d-fab d-fab--lang" style="position:absolute" href="#" aria-label="English">EN</a>
</div>
<div class="todo"><b>The two buttons are bottom-LEFT, and that is not
arbitrary.</b> Bottom-right is where every chat widget, cookie nag and
back-to-top button goes, and this is the control somebody needs when all of those
are in the way.<br><br>
<b>The consent card clears them by variable, not by 78px.</b> The legacy version
hard-coded the gap, which is correct until somebody changes a button&rsquo;s size
&mdash; and then it is a card sitting on top of the accessibility switch, the one
control a person in that situation most needs to reach.<br><br>
<b>The mode is the only place <code>!important</code> is allowed.</b> Everywhere
else in this system an <code>!important</code> is a specificity argument somebody
lost. Here it is the point: a person who asked for the plain version gets it
whatever any component says, including components written after this file.<br><br>
<b>Quiet ink becomes ordinary ink in the mode</b>, which flattens the hierarchy
on purpose &mdash; it trades &ldquo;you can see what is secondary&rdquo; for
&ldquo;you can read everything&rdquo;, which is the trade somebody makes by
turning it on. Worth a look with the switch flipped before it ships.</div>
<p class="lbl" style="margin-top:22px">Flip the mode on this page</p>
<button class="d-btn d-btn--quiet" onclick="document.documentElement.classList.toggle('d-a11y')">
  Превключи достъпен режим</button>
</section>'''

# -------------------------------------------------------------------- pages ---
A(PAGES_MARKUP)


CHECKOUT_MARKUP = '''<section class="sec" id="checkout"><h2>Patterns</h2>
<h3>Checkout add-ons &mdash; VAT invoice and the office picker</h3>
<p class="note"><b>This one is mostly a deletion.</b> The two blocks carried 28
legacy rules and all but a handful were the system saying something twice: field
borders and radii, a focus ring (amber &mdash; every other field in the system is
cocoa), an invalid state, a hint, an error, a warning notice and a radio. They
are <code>.d-field__control</code>, <code>.d-field--invalid</code>,
<code>.d-field__hint</code>, <code>.d-field__error</code>,
<code>.d-notice--warning</code> and <code>.d-check</code>. What is left is a
card, a grid and a disabled state.</p>
<p class="note"><b>Nothing here animates, deliberately.</b>
<code>motion.css</code> kills every animation and transition on
<code>body.woocommerce-checkout</code>, and these two blocks live nowhere else
&mdash; so a transition written here is dead code that looks alive.</p>

<div class="d-intake">
  <label class="d-check d-intake__toggle">
    <input type="checkbox" checked><span>Фактура на фирма</span></label>
  <div class="d-fieldgrid">
    <div class="d-field d-field--wide"><label class="d-field__label" for="di-company">Фирма</label>
      <input class="d-field__control" id="di-company" type="text" value="Пример ЕООД"></div>
    <div class="d-field"><label class="d-field__label" for="di-vat">ЕИК / ДДС №</label>
      <input class="d-field__control" id="di-vat" type="text" value="000000000"></div>
    <div class="d-field d-field--invalid"><label class="d-field__label" for="di-mol">МОЛ</label>
      <input class="d-field__control" id="di-mol" type="text" aria-invalid="true">
      <p class="d-field__error">Полето е задължително за фактура.</p></div>
    <div class="d-field d-field--wide"><label class="d-field__label" for="di-address">Адрес по регистрация</label>
      <input class="d-field__control" id="di-address" type="text"></div>
    <p class="d-field__hint">Фактурата се издава след потвърждаване на поръчката.</p>
  </div>
</div>

<div class="d-courier">
  <label class="d-check d-courier__toggle">
    <input type="checkbox" checked><span>Доставка до офис на куриер</span></label>
  <div class="d-courier__fields">
    <div class="d-courier__carriers">
      <label class="d-check"><input type="radio" name="dcdemo" checked><span>Еконт</span></label>
      <label class="d-check"><input type="radio" name="dcdemo"><span>Спиди</span></label>
    </div>
    <div class="d-field"><label class="d-field__label" for="dc-city">Град</label>
      <input class="d-field__control" id="dc-city" type="text" value="София"></div>
    <div class="d-field"><label class="d-field__label" for="dc-office">Офис</label>
      <select class="d-field__control" id="dc-office">
        <option>София, ул. Пример 12</option><option>София, бул. Пример 44</option></select></div>
    <p class="d-field__hint">Изберете град, за да видите офисите наблизо.</p>
  </div>
</div>

<div class="d-notice d-notice--warning" style="margin-top:14px">
  <p class="d-notice__body">Един артикул е по заявка &mdash; поръчката тръгва до
  5 работни дни.</p>
</div>
<p class="lbl" style="margin-top:22px">The office picker, in the five states it actually has</p>
<p class="note">The card above is the resting one. These are the other four the
plugin writes into that same select, plus what the order review prints once a
choice is made. A picker is mostly not resting, so reviewing only the resting
state is reviewing the part that never goes wrong.</p>
<div class="d-courier">
  <div class="d-courier__fields">
    <div class="d-field"><label class="d-field__label" for="dcs-1">Преди град</label>
      <select class="d-field__control" id="dcs-1"><option>Изберете офис</option></select>
      <p class="d-field__hint">Изберете град, за да видите офисите наблизо.</p></div>

    <div class="d-field"><label class="d-field__label" for="dcs-2">Докато зарежда</label>
      <select class="d-field__control" id="dcs-2" disabled><option>Зареждане…</option></select>
      <p class="d-field__hint"><span class="d-icon d-icon--spinner" aria-hidden="true"></span>
      Офисите се теглят от куриера.</p></div>

    <div class="d-field d-field--invalid"><label class="d-field__label" for="dcs-3">Ако куриерът мълчи</label>
      <select class="d-field__control" id="dcs-3" aria-invalid="true"><option>Грешка при зареждане</option></select>
      <p class="d-field__error">Опитайте пак или изберете доставка до адрес.</p></div>

    <div class="d-field"><label class="d-field__label" for="dcs-4">Град без офис</label>
      <select class="d-field__control" id="dcs-4"><option>Няма офиси в този град</option></select>
      <p class="d-field__hint">Най-близкият е в Пловдив, на 14 км.</p></div>
  </div>
</div>

<p class="lbl" style="margin-top:22px">And what the order review prints</p>
<div class="d-trust" style="max-width:32rem">
  <p class="d-trust__ship"><span class="d-icon d-icon--truck" aria-hidden="true"></span>
  <b>Еконт</b> &middot; София, ул. Пример 12</p>
</div>
<div class="d-notice d-notice--warning" style="margin-top:10px;max-width:32rem">
  <p class="d-notice__body">Офисът не е потвърден от куриера. Ще се свържем с вас
  преди изпращане.</p>
  <span class="d-notice__stars" aria-hidden="true"></span>
</div>

<div class="todo"><b>The unconfirmed warning is a hard-coded colour in PHP.</b>
<code>class-office-field.php</code> prints
<code>&lt;span style="color:#b01f30"&gt;</code> straight into the order review.
It is one shade off <code>--notice-error-edge</code>, it is not in any
stylesheet, and the cutover will therefore not find it &mdash; deleting
<code>style.css</code> changes nothing about it. It wants to be a
<code>.d-notice--warning</code>, and that is a plugin change rather than a theme
one.<br><br>
<b>The select is the system's select.</b> <code>.d-field select</code> already
draws our chevron, so the picker needs no rule of its own; the four states above
are markup and copy, not CSS. The one thing they do need is the disabled state,
which is why the loading select is really disabled rather than merely
grey.</div>

<p class="lbl" style="margin-top:22px">The submit, blocked</p>
<button class="d-btn d-finish d-blocked" aria-disabled="true">Поръчай</button>

<div class="todo"><b>The layout spans by class, not by id.</b> Legacy said
<code>.di-fields #di-company, .di-fields #di-address{ grid-column:1/-1 }</code>
&mdash; the layout keyed to two specific fields by name, so a third long field
means editing CSS and renaming one silently drops it back into half a column.
<br><br>
<b>The courier block is a stack, not a grid.</b> City and office are dependent
&mdash; you cannot pick an office before a city &mdash; and putting a dependent
pair side by side invites filling the second one first.<br><br>
<b>The blocked button keeps its focus.</b> A <code>disabled</code> button cannot
be focused, so a keyboard user tabbing to the end of the checkout finds nothing
and no explanation of why. The style is on <code>aria-disabled</code> as well, so
the plugin can leave the button enabled and put the reason in the field error
&mdash; which is where somebody is actually looking.<br><br>
<b>Greyscale as well as opacity.</b> A cherry button at 50% is still cherry and
still reads as the live action; on the plywood button opacity alone barely
registers.</div>
</section>'''

# ----------------------------------------------------------------- checkout ---
A(CHECKOUT_MARKUP)

MEDIA_FAIL_CAP = u'\u0421\u043d\u0438\u043c\u043a\u0430\u0442\u0430 \u043d\u0435 \u043c\u043e\u0436\u0435 \u0434\u0430 \u0431\u044a\u0434\u0435 \u0437\u0430\u0440\u0435\u0434\u0435\u043d\u0430'
MEDIA_FAIL_NAME = u'\u041a\u0435\u0440\u0430\u043c\u0438\u0447\u043d\u0430 \u043a\u0443\u043f\u0430'
# The brand bow, from the hero constant defined above - NOT a new one. The
# live slab renders assets/img-fallback.js's BOW, which is this same path,
# so the gallery and the page draw one mark rather than two that resemble
# each other.
# The torn bow: the SAME path as BOW above, rendered twice and clipped to
# either side of one jag, which is how a tear stays a tear of THIS mark.
# Kept in step with assets/img-fallback.js by rev11cgate.js, which compares
# the path data in both files rather than trusting this comment.
# The torn bow: the SAME path as BOW above, drawn twice and clipped to
# either side of one lightning line through the right flap. Kept in step
# with assets/img-fallback.js by scripts/bowgate.js, which compares the
# path data everywhere it appears rather than trusting this comment.
MEDIA_FAIL_BOW = ('<svg class="d-media-fail__bow" viewBox="0 0 24 12" fill="currentColor" aria-hidden="true"><defs><clipPath id="d-bow-keep"><path d="M0 0 H23.2 L18.4 3.5 L20.8 4.3 L14.9 6.4 L17.3 7.4 L13.6 12 H0 Z"/></clipPath><clipPath id="d-bow-torn"><path d="M24 0 H23.2 L18.4 3.5 L20.8 4.3 L14.9 6.4 L17.3 7.4 L13.6 12 H24 Z"/></clipPath></defs><g clip-path="url(#d-bow-keep)"><path d="M12 6 L3.2 1.4 C1.8.7 1.8 11.3 3.2 10.6 Z M12 6 l8.8-4.6 c1.4-.7 1.4 9.9 0 9.2 Z"/><circle cx="12" cy="6" r="2.4"/></g><g class="d-media-fail__torn" clip-path="url(#d-bow-torn)"><path d="M12 6 L3.2 1.4 C1.8.7 1.8 11.3 3.2 10.6 Z M12 6 l8.8-4.6 c1.4-.7 1.4 9.9 0 9.2 Z"/><circle cx="12" cy="6" r="2.4"/></g></svg>')

A('''<section class="sec" id="media"><h2>Pattern</h2><h3>Failed image</h3>
<p class="note"><b>This is an error state, not a placeholder.</b> The panel
refuses to flag a product sellable online without an image, so a card with no
picture means something upstream is wrong &mdash; a placeholder that escaped the
rule, or a <code>src</code> that 404s. A pretty grey box would hide that, so the
slab writes a sentence instead. It is built by <code>assets/img-fallback.js</code>,
because CSS can neither see a broken <code>&lt;img&gt;</code> nor write a
sentence; the stylesheet only decides how it looks.</p>
<p class="note"><b>The three below are one component at three widths.</b> The
caption disappears under 120px through a <em>container</em> query &mdash; what
matters is the size of the slab, not of the window &mdash; which is why the cart
drawer's 64px thumbnail needs no rule of its own. The bow is aria-hidden and the
accessible name sits on the container, so nothing is lost when it goes.</p>
<div class="grid" style="align-items:start">
  <div>
    <p class="note">In a product card.</p>
    <article class="d-card"><div class="d-card__media">
      <div class="d-media-fail" role="img" aria-label="%(cap)s">%(bow)s
        <p class="d-media-fail__cap" aria-hidden="true">%(cap)s</p></div>
    </div>
    <h3 class="d-card__title"><a href="#">%(name)s</a></h3>
    <p class="d-card__price">26,40</p></article>
  </div>
  <div>
    <p class="note">Bare, and square.</p>
    <div style="max-width:240px"><div class="d-media-fail" role="img" aria-label="%(cap)s">%(bow)s
      <p class="d-media-fail__cap" aria-hidden="true">%(cap)s</p></div></div>
  </div>
  <div>
    <p class="note">At 64px, in the cart drawer. Same element.</p>
    <ul class="d-drawer__list" style="max-width:300px"><li class="d-drawer__line">
      <div class="d-drawer__line__thumb"><div class="d-media-fail" role="img" aria-label="%(cap)s">%(bow)s
        <p class="d-media-fail__cap" aria-hidden="true">%(cap)s</p></div></div>
      <div class="d-drawer__line__body">
        <span class="d-drawer__line__name">%(name)s</span>
        <span class="d-drawer__line__meta">&euro;26,40 / 51,64 &#1083;&#1074;.</span>
      </div></li></ul>
  </div>
</div>
<p class="lbl" style="margin-top:26px">And the three other things batch nine shipped</p>
<p class="note">All four went into the stylesheet; only the slab went onto the
page. A component that is only in the stylesheet does not exist, so here are the
other three.</p>

<p class="note"><b>1. <code>.d-section-title</code></b> &mdash; the heading that
names a band. Legacy declared it four separate times across four slices, each
adding a font-size or a margin to the last, and all four said the same size. What
is worth looking at is not the title, it is the gap ABOVE and BELOW it: an
eyebrow labels the heading beneath it, so proximity has to bind downward. On the
live home page three of them had 0px above and 42px below, which reads as a
caption hanging off the bottom of the previous section.</p>
<div style="border:1px dashed var(--hairline);border-radius:var(--radius-m);padding:4px 0">
  <p class="d-hero__eyebrow" style="max-width:1120px;margin:0 auto;padding-inline:var(--gutter)">Току-що пристигна</p>
  <h2 class="d-section-title d-shell">Новото от Дарлинг</h2>
  <p style="max-width:1120px;margin:0 auto;padding-inline:var(--gutter);color:var(--ink-quiet)">
  The eyebrow sits close to the title; the title sits far from whatever is above it.</p>
</div>

<p class="note" style="margin-top:22px"><b>2. <code>.d-drawer__trust</code></b>
&mdash; one line, and the reason it is not <code>.d-trustbar</code> is width. The
band version is a grid of three promises and needs the room to be a row of
anything; in a 300px drawer the same three stack into three lines and push the
first product below the fold. Both are below, at the width each one gets.</p>
<div class="grid" style="align-items:start">
  <div style="max-width:300px;border:1px solid var(--hairline);border-radius:var(--radius-m);padding:14px">
    <p class="d-drawer__trust"><span class="d-icon d-icon--shield" aria-hidden="true"></span>
    Наложен платеж &middot; Връщане до 14 дни</p>
    <ul class="d-drawer__list"><li class="d-drawer__line">
      <img class="d-drawer__line__thumb" src="data:image/svg+xml;utf8,%%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%%3E%%3Crect width='100' height='100' fill='%%23e3d9cc'/%%3E%%3Ccircle cx='50' cy='56' r='26' fill='%%23c9b9a6'/%%3E%%3C/svg%%3E" alt="">
      <div class="d-drawer__line__body">
        <span class="d-drawer__line__name">Керамична купа</span>
        <span class="d-drawer__line__meta">&euro;26,40</span>
      </div></li></ul>
  </div>
  <div style="grid-column:span 2">
    <ul class="d-trustbar">
      <li><b>Наложен платеж</b><span>Плащате при получаване</span></li>
      <li><b>14 дни за връщане</b><span>Без да обяснявате защо</span></li>
      <li><b>Доставка за 1&ndash;2 дни</b><span>До офис или до адрес</span></li>
    </ul>
  </div>
</div>

<p class="note" style="margin-top:22px"><b>3. <code>main{ overflow-x: clip }</code></b>
&mdash; one declaration whose effect is the absence of something, so the only way
to show it is to turn it off. Both frames below hold the same band, and the band
is deliberately wider than the frame, the way a full-bleed band is wider than the
shell. <b>The right one has a horizontal scrollbar.</b> That is what every page
had. It has to be <code>clip</code> and not <code>hidden</code>, because
<code>hidden</code> makes the element a scroll container and a scroll container
is the containing block for <code>position:sticky</code> &mdash; so the header
would stop sticking to the window and start sticking to a box it is not
inside.</p>
<div class="grid" style="grid-template-columns:1fr 1fr">
  <div>
    <p class="lbl">overflow-x: clip</p>
    <div style="overflow-x:clip;border:1px solid var(--hairline);border-radius:var(--radius-m)">
      <div style="width:150%%;background:var(--surface-band);color:var(--ink-on-dark);padding:18px">
      A band that reaches past the shell, on purpose.</div>
    </div>
  </div>
  <div>
    <p class="lbl">without it</p>
    <div style="border:1px solid var(--notice-error-edge);border-radius:var(--radius-m)">
      <div style="width:150%%;background:var(--surface-band);color:var(--ink-on-dark);padding:18px">
      The same band, and a scrollbar nobody asked for.</div>
    </div>
  </div>
</div>
</section>''' %(dict(cap=MEDIA_FAIL_CAP, bow=MEDIA_FAIL_BOW, name=MEDIA_FAIL_NAME)))

A('''<section class="sec" id="mappick"><h2>Pattern</h2><h3>Office and locker picker</h3>
<p class="note"><b>The map is an enhancement over the list, never a replacement.</b>
The list is what works with no JavaScript, on a slow connection and in a screen
reader &mdash; and it is what still works when the tile host is down. A map that
replaces it takes all three away for a picture. So the real
<code>&lt;select&gt;</code> stays underneath, the list is the control, and the map
reflects it and can drive it: either way round, neither one required.</p>
<p class="note"><b>Tiles: OpenFreeMap. Renderer: MapLibre GL.</b> Surveyed today
&mdash; no API key, no registration, no cookies, no request limit, commercial use
explicit, and the whole production stack is open-source so we can host it
ourselves when we want to. What it has not got is an SLA, which is exactly why
the paragraph above is a rule rather than a nicety. Stadia&rsquo;s free tier is
non-commercial, CARTO&rsquo;s Positron wants an enterprise licence, and
openstreetmap.org&rsquo;s own tiles forbid this use outright.</p>
<p class="note"><b>We do not need a geocoder.</b> Speedy and Econt return their
offices with their own coordinates &mdash; that is what
<code>office-picker.js</code> already fetches. The map is a backdrop and pins we
place, so the only thing that has to be good in Bulgaria is street rendering,
which is ordinary OpenStreetMap. That is most of my &ldquo;patchy coverage&rdquo;
worry answered: it was aimed at a layer we are not using.</p>
<p class="note"><b>Nothing here loads anything.</b> The frame is a sized, styled
hole for MapLibre to mount into, filled by the pattern&rsquo;s own hatching. A
review document that quietly pings a third party every time it is opened has
opinions about privacy nobody agreed to.</p>

<div class="d-mappick">
  <div class="d-scrollframe d-mappick__list">
    <div class="d-scroll">
      <button type="button" class="d-mappick__office" aria-current="true">
        <span class="d-mappick__name">Офис Свищов Център</span>
        <span class="d-mappick__dist">0,4 км</span>
        <span class="d-mappick__addr">ул. „Цар Освободител“ 12</span>
        <span class="d-mappick__hours" data-open="true">09:00 – 18:00</span>
      </button>
      <button type="button" class="d-mappick__office">
        <span class="d-mappick__name">Офис Свищов Изток</span>
        <span class="d-mappick__dist">1,8 км</span>
        <span class="d-mappick__addr">ул. „Патриарх Евтимий“ 3</span>
        <span class="d-mappick__hours" data-open="true">09:00 – 17:30</span>
      </button>
      <button type="button" class="d-mappick__office">
        <span class="d-mappick__name">Автомат Билла Свищов</span>
        <span class="d-mappick__dist">2,1 км</span>
        <span class="d-mappick__addr">бул. „Дунав“ 44</span>
        <span class="d-mappick__hours" data-open="true">00:00 – 24:00</span>
      </button>
      <button type="button" class="d-mappick__office">
        <span class="d-mappick__name">Офис Свищов Запад</span>
        <span class="d-mappick__dist">3,6 км</span>
        <span class="d-mappick__addr">ул. „Кирил и Методий“ 9</span>
        <span class="d-mappick__hours" data-open="false">затворен днес</span>
      </button>
      <button type="button" class="d-mappick__office">
        <span class="d-mappick__name">Автомат Кауфланд</span>
        <span class="d-mappick__dist">4,2 км</span>
        <span class="d-mappick__addr">ул. „Хан Аспарух“ 1</span>
        <span class="d-mappick__hours" data-open="true">00:00 – 24:00</span>
      </button>
    </div>
    <div class="d-scrollframe__rail"><div class="d-scrollframe__wake"></div><div class="d-scrollframe__thumb"></div></div>
  </div>
  <div class="d-mappick__map" data-state="loading">
      <span class="d-mappick__pin" style="left:31%;top:44%" aria-current="true" aria-hidden="true"></span>
      <span class="d-mappick__pin" style="left:58%;top:30%" aria-hidden="true"></span>
      <span class="d-mappick__pin" style="left:46%;top:68%" aria-hidden="true"></span>
      <span class="d-mappick__pin" style="left:72%;top:57%" aria-hidden="true"></span>
      <span class="d-mappick__pin" style="left:22%;top:71%" aria-hidden="true"></span>
    <p class="d-mappick__note">Картата се зарежда&hellip;</p>
    <p class="d-mappick__attrib">&copy; <a href="https://openfreemap.org/">OpenFreeMap</a>
    &middot; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></p>
  </div>
</div>

<p class="lbl" style="margin-top:22px">And the two states a picker spends most of its life in</p>
<div class="grid" style="grid-template-columns:1fr 1fr">
  <div>
    <p class="note">Nothing near this address.</p>
    <div class="d-mappick__map" data-state="down" style="min-height:11rem">
      <p class="d-mappick__note">Няма офиси в този град. Най-близкият е в Плевен, на 14 км.</p>
      <p class="d-mappick__attrib">&copy; OpenFreeMap &middot; OpenStreetMap</p>
    </div>
  </div>
  <div>
    <p class="note">The tile host is unreachable &mdash; and the order still goes through.</p>
    <div class="d-mappick__map" data-state="down" style="min-height:11rem">
      <p class="d-mappick__note">Картата не можа да се зареди. Изберете офис от списъка.</p>
      <p class="d-mappick__attrib">&copy; OpenFreeMap &middot; OpenStreetMap</p>
    </div>
  </div>
</div>

<div class="todo"><b>The pin is our mark, not the library&rsquo;s.</b> A teardrop
with the four-point star punched out of it, so the marker on the map and the
bullet in the list are the same shape. Selected is bigger <em>and</em> gold:
colour alone is the one cue a colour-blind visitor does not get, and this is the
cue that says where the order is going.<br><br>
<b>Attribution is a licence condition, not a credit.</b> It is in the pattern, so
removing it means deleting a rule with a comment above it saying that.<br><br>
<b>Still to decide before the map itself is built:</b> whether we ship
MapLibre&rsquo;s ~200&nbsp;KB on the checkout for every visitor or load it only
when the office option is chosen (the second, almost certainly), and whether the
pins cluster &mdash; Sofia has over two hundred offices and Speedy returns them
all.</div>
</section>''')

A('''<section class="sec" id="filters"><h2>Adopted</h2><h3>Catalogue filters</h3>
<p class="note"><b>It is a trigger and a dialog, not a sidebar.</b> Read off the
live archive rather than assumed &mdash; which matters, because most of this
batch turns out to be composition: the trigger is
<code>.d-btn--quiet</code> and the panel is <code>.d-drawer</code>, and we own
both. The markup below is WooCommerce&rsquo;s, class for class, down to the
<code>data-wp-on--click</code> attributes.</p>
<p class="note"><b>The open state is <code>.is-overlay-opened</code> on the block
root</b>, set at runtime by the Interactivity API and therefore nowhere in the
served HTML. I know it because I read
<code>blocks/woocommerce/product-filters-style.css</code> &mdash; a 5&nbsp;KB
per-block sheet WordPress <em>inlines</em> rather than links, which is why it
never appeared in any stylesheet list we have taken and why the first surface
inventory did not know it existed. Here it is added by hand, because a static
page has no runtime.</p>
<p class="note"><b>Two modes, one markup.</b> A dialog under 900px and a sidebar
above it &mdash; the archive already has a sticky 250px column and the filters
belong in it. Same breakpoint as the header&rsquo;s, so the page changes shape
once rather than twice. Both are below.</p>

<p class="note"><b>The sheet, at the width it is actually used at.</b> Two things are true and I overstated them last time: a <code>position: fixed</code> element cannot be <em>contained</em> by a box, and a <em>viewport</em> media query cannot be <em>faked</em> by one. Neither stops this page from overriding those two things for itself. Inside the frame below, <code>fixed</code> is turned into <code>absolute</code> and the desktop mode is switched back off. <b>That is the entire fake.</b> The surface, the corner, the shadow, the header, the scrolling body, the hairline footer and the apply button are the shipped stylesheet, unmodified. The overriding rules live in this document&rsquo;s own <code>&lt;style&gt;</code>, not in the theme &mdash; a rule whose only reader is a review document is a second component wearing a disguise.</p>
<p class="note"><b>And it is not a centred modal.</b> It is a sheet from the <em>left edge</em>, full height, the same shape and the same arrival as our cart drawer &mdash; which is deliberate: it is the same gesture, so it should be the same object. The greyed-out ground is the scrim, and it now closes on a click, like the drawers.</p>
<style>
/* GALLERY-LOCAL. Not shipped. Two overrides and nothing else. */
.d-ovdemo{ position:relative; height:34rem; overflow:hidden;
  border-radius:var(--radius-l); box-shadow:inset 0 0 0 1px var(--hairline);
  background:var(--surface) }
.d-ovdemo__page{ padding:20px }
/* one: the fixed sheet is contained by the frame */
.d-ovdemo .wc-block-product-filters__overlay{ position:absolute }
/* two: this window is wider than 900px, so the shipped sheet has already
   turned the block inline. Put the phone mode back, inside the frame. */
@media (min-width:901px){
  .d-ovdemo .wc-block-product-filters__open-overlay,
  .d-ovdemo .wc-block-product-filters__close-overlay{ display:inline-flex }
  .d-ovdemo .wc-block-product-filters__overlay-header{ display:flex }
  .d-ovdemo .wc-block-product-filters__overlay-footer{ display:block }
  .d-ovdemo .wc-block-product-filters__overlay,
  .d-ovdemo .wc-block-product-filters.is-overlay-opened .wc-block-product-filters__overlay{
    position:absolute; inset:0; z-index:1;
    background:var(--scrim); pointer-events:auto }
  .d-ovdemo .wc-block-product-filters__overlay-wrapper{ width:100%; height:100% }
  .d-ovdemo .wc-block-product-filters__overlay-dialog,
  .d-ovdemo .wc-block-product-filters.is-overlay-opened .wc-block-product-filters__overlay-dialog{
    position:absolute; inset-block:0; inset-inline-start:0;
    width:min(var(--filters-w), 88%);
    background:var(--surface-raised);
    border-start-end-radius:var(--radius-l);
    border-end-end-radius:var(--radius-l);
    box-shadow:var(--shadow-card-hover);
    translate:0 0 }
  .d-ovdemo .wc-block-product-filters__overlay-content{
    overflow-y:auto; padding:var(--space-s); gap:var(--space-s) }
</style>
<p class="lbl">The overlay, open &mdash; placement faked, everything else shipped</p>
<div class="d-ovdemo"><div class="d-ovdemo__page">
<div class="wc-block-product-filters is-overlay-opened">
  <button class="wc-block-product-filters__open-overlay" data-wp-on--click="actions.openOverlay">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 17.5H14V16H10V17.5ZM6 6V7.5H18V6H6ZM8 12.5H16V11H8V12.5Z" fill="currentColor"/></svg><span>Филтриране на продукти</span></button>
  <div class="wc-block-product-filters__overlay">
    <div class="wc-block-product-filters__overlay-wrapper">
      <div class="wc-block-product-filters__overlay-dialog" role="dialog" aria-label="Филтри">
        <header class="wc-block-product-filters__overlay-header">
          <button class="wc-block-product-filters__close-overlay" data-wp-on--click="actions.closeOverlay">
            <span>Затваряне</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 13.06 15.71 16.77 16.77 15.71 13.06 12 16.77 8.29 15.71 7.23 12 10.94 8.29 7.23 7.23 8.29 10.94 12 7.23 15.71 8.29 16.77 12 13.06Z" fill="currentColor"/></svg></button>
        </header>
        <div class="wc-block-product-filters__overlay-content">
            <div class="wp-block-woocommerce-product-filter">
              <h3 class="wp-block-heading">Цена</h3>
              <div class="wc-block-product-filter-price-content" style="display:flex;gap:.5rem;align-items:center">
                <input type="text" value="12" aria-label="От"> <span>&ndash;</span>
                <input type="text" value="240" aria-label="До">
              </div>
            </div>
            <div class="wp-block-woocommerce-product-filter">
              <h3 class="wp-block-heading">Материал</h3>
              <div style="display:flex;flex-wrap:wrap;gap:.4rem">
                <button class="wc-block-product-filter-chips__item" aria-checked="true">Керамика</button>
                <button class="wc-block-product-filter-chips__item" aria-checked="false">Стъкло</button>
                <button class="wc-block-product-filter-chips__item" aria-checked="false">Дърво</button>
                <button class="wc-block-product-filter-chips__item" aria-checked="false">Меламин</button>
              </div>
              <button class="wc-block-product-filter__show-more">Още 6</button>
            </div>
            <div class="wp-block-woocommerce-product-filter">
              <h3 class="wp-block-heading">Наличност</h3>
              <label class="d-check"><input type="checkbox" checked><span>В наличност</span></label>
              <label class="d-check"><input type="checkbox"><span>По заявка</span></label>
            </div>
        </div>
        <footer class="wc-block-product-filters__overlay-footer">
          <button class="wc-block-product-filters__apply wp-element-button"><span>Прилагане</span></button>
        </footer>
      </div>
    </div>
  </div>
</div>
<div class="d-grid" style="grid-template-columns:repeat(2,1fr);margin-top:16px">
<div class="d-skeleton d-skeleton--media"></div>
<div class="d-skeleton d-skeleton--media"></div>
</div>
</div></div>

<p class="lbl">Inline in the sidebar, which is what this width gets</p>
<div class="d-archive__body" style="display:grid;grid-template-columns:250px minmax(0,1fr);gap:24px">
  <div class="d-archive__side" style="position:static;max-height:none">
    <div class="wc-block-product-filters">
  <button class="wc-block-product-filters__open-overlay" data-wp-on--click="actions.openOverlay">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 17.5H14V16H10V17.5ZM6 6V7.5H18V6H6ZM8 12.5H16V11H8V12.5Z" fill="currentColor"/></svg><span>Филтриране на продукти</span></button>
  <div class="wc-block-product-filters__overlay">
    <div class="wc-block-product-filters__overlay-wrapper">
      <div class="wc-block-product-filters__overlay-dialog" role="dialog" aria-label="Филтри">
        <header class="wc-block-product-filters__overlay-header">
          <button class="wc-block-product-filters__close-overlay" data-wp-on--click="actions.closeOverlay">
            <span>Затваряне</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 13.06 15.71 16.77 16.77 15.71 13.06 12 16.77 8.29 15.71 7.23 12 10.94 8.29 7.23 7.23 8.29 10.94 12 7.23 15.71 8.29 16.77 12 13.06Z" fill="currentColor"/></svg></button>
        </header>
        <div class="wc-block-product-filters__overlay-content">
            <div class="wp-block-woocommerce-product-filter">
              <h3 class="wp-block-heading">Цена</h3>
              <div class="wc-block-product-filter-price-content" style="display:flex;gap:.5rem;align-items:center">
                <input type="text" value="12" aria-label="От"> <span>&ndash;</span>
                <input type="text" value="240" aria-label="До">
              </div>
            </div>
            <div class="wp-block-woocommerce-product-filter">
              <h3 class="wp-block-heading">Материал</h3>
              <div style="display:flex;flex-wrap:wrap;gap:.4rem">
                <button class="wc-block-product-filter-chips__item" aria-checked="true">Керамика</button>
                <button class="wc-block-product-filter-chips__item" aria-checked="false">Стъкло</button>
                <button class="wc-block-product-filter-chips__item" aria-checked="false">Дърво</button>
                <button class="wc-block-product-filter-chips__item" aria-checked="false">Меламин</button>
              </div>
              <button class="wc-block-product-filter__show-more">Още 6</button>
            </div>
            <div class="wp-block-woocommerce-product-filter">
              <h3 class="wp-block-heading">Наличност</h3>
              <label class="d-check"><input type="checkbox" checked><span>В наличност</span></label>
              <label class="d-check"><input type="checkbox"><span>По заявка</span></label>
            </div>
        </div>
        <footer class="wc-block-product-filters__overlay-footer">
          <button class="wc-block-product-filters__apply wp-element-button"><span>Прилагане</span></button>
        </footer>
      </div>
    </div>
  </div>
</div>
  </div>
  <div>
    <div class="d-toolbar">
      <p class="d-toolbar__count">24 артикула</p>
      <span class="d-toolbar__spacer"></span>
      <select class="orderby" aria-label="Подреждане">
        <option>Подреждане по подразбиране</option>
        <option>Първо най-новите</option>
        <option>Първо най-евтините</option>
      </select>
    </div>
    <div class="d-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="d-skeleton d-skeleton--media"></div>
      <div class="d-skeleton d-skeleton--media"></div>
      <div class="d-skeleton d-skeleton--media"></div>
    </div>
  </div>
</div>

<div class="todo"><b>Everything below the shell is a floor, not a finish, and it
is marked as one in the stylesheet.</b> The price filter renders EMPTY on the
live archive &mdash; one product in the catalogue, so there is no range &mdash;
and the attribute, stock, rating and chip blocks are not in the template at all.
Their rules are written against WooCommerce&rsquo;s stylesheet rather than
against captured markup, which is exactly the method that made
<code>field.css</code> wrong twice: Woo puts the label AFTER the input and floats
it, and no amount of reading the stylesheet tells you that. Re-verify against
the real DOM the day the catalogue lands.<br><br>
<b>The price pair wants to become <code>.d-slider--pair</code>.</b> We already
own the two-handle slider; what is here is two number inputs wearing our field,
because there is no live range to build the slider against yet.<br><br>
<b><code>select.orderby</code> was the last bare select on the catalogue.</b> It
has no <code>.d-field</code> around it, so the field pattern&rsquo;s selector
list never reached it and it has been rendering as the browser&rsquo;s own
control this whole time.</div>
</section>''')

# --------------------------------------------------------------- primitives ---
# The four that were missing. Each one existed already - written by hand, with
# its own numbers, in between three and nine files.
A(u'''<section class="sec" id="primitives"><h2>Rules</h2><h3>Layout primitives &mdash; the small closed set everything is composed from</h3>
<p class="note">A page is not a list of components. It is components inside
<em>layouts</em>, and there are only a handful of layouts in any website. Naming
them is what stops each surface inventing its own spacing: eight primitives, and
every arrangement on the site is a composition of them.</p>
<p class="note"><b>The rule they exist to make possible:</b> a surface owns
padding, a layout owns gaps, and a component owns neither. That is why a
checkbox can go inside a panel inside a table without anyone having to reason
about it &mdash; the checkbox has no opinion about what is above it, so it
cannot be wrong about it. Nesting goes wrong through <em>double padding</em>,
not through alignment.</p>

<p class="lbl">CLUSTER &mdash; a row of things that wraps. It existed nine times before it existed once</p>
<div class="d-box d-box--outline">
<div class="d-cluster">
  <span class="d-badge">&#x41D;&#x43E;&#x432;&#x43E;</span>
  <span class="d-badge d-badge--sale">&#x41D;&#x430;&#x43C;&#x430;&#x43B;&#x435;&#x43D;&#x438;&#x435;</span>
  <span class="d-badge">&#x41F;&#x43E;&#x441;&#x43B;&#x435;&#x434;&#x43D;&#x438; 2</span>
  <a class="d-btn d-btn--quiet" href="#">&#x421;&#x44A;&#x440;&#x430;&#x432;&#x43D;&#x438;</a>
  <a class="d-btn d-btn--text" href="#">&#x41E;&#x442;&#x43A;&#x430;&#x436;&#x438;</a>
</div>
</div>
<p class="lbl">&mdash;&mdash; and the same markup with <code>--between</code>, <code>--end</code>, <code>--baseline</code></p>
<div class="d-box d-box--outline d-stack d-stack--tight">
<div class="d-cluster d-cluster--between"><span>&#x41C;&#x435;&#x436;&#x434;&#x438;&#x43D;&#x435;&#x43D; &#x441;&#x431;&#x43E;&#x440;</span><b>26,40 &euro;</b></div>
<div class="d-cluster d-cluster--end"><a class="d-btn d-btn--text" href="#">&#x41E;&#x442;&#x43A;&#x430;&#x436;&#x438;</a><a class="d-btn d-finish" href="#">&#x417;&#x430;&#x43F;&#x430;&#x437;&#x438;</a></div>
<div class="d-cluster d-cluster--baseline"><span style="font:var(--type-section)">42,00 &euro;</span><del style="color:var(--ink-quiet)">56,00 &euro;</del><span style="font-size:var(--fs-fine);color:var(--ink-quiet)">&#x441; &#x414;&#x414;&#x421;</span></div>
</div>

<p class="lbl">BOX &mdash; the only thing allowed to own inner padding</p>
<div class="d-cluster d-cluster--loose d-cluster--top">
  <div class="d-box d-box--raised" style="flex:1;min-width:200px"><b>--raised</b><br>a card&rsquo;s surface</div>
  <div class="d-box d-box--quiet" style="flex:1;min-width:200px"><b>--quiet</b><br>a lift that is not a card</div>
  <div class="d-box d-box--outline" style="flex:1;min-width:200px"><b>--outline</b><br>a hairline only</div>
</div>
<p class="lbl">&mdash;&mdash; and the failure it is here to prevent: a padded box as the only child of a padded box</p>
<div class="d-cluster d-cluster--loose d-cluster--top">
  <div class="d-box d-box--outline" style="flex:1;min-width:240px">
    <div class="d-box d-box--quiet">Two paddings. 40&nbsp;px of air nobody asked for.</div>
  </div>
  <div class="d-box d-box--outline d-box--flush" style="flex:1;min-width:240px">
    <div class="d-box d-box--quiet">One padding, because the outer box asked for <code>--flush</code>.</div>
  </div>
</div>

<p class="lbl">SWITCHER &mdash; n columns or one, decided by the CONTAINER and not by a media query</p>
<p class="note">Identical markup in a wide box and a narrow one, at the same
window size. A breakpoint cannot do this: a media query only ever knows about
the viewport, so it cannot tell that this thing is inside a sidebar.</p>
<div class="d-cluster d-cluster--loose d-cluster--top">
  <div class="d-box d-box--outline" style="width:640px;max-width:100%">
    <div class="d-switcher">
      <div class="d-box d-box--quiet">&#x414;&#x43E;&#x441;&#x442;&#x430;&#x432;&#x43A;&#x430;</div>
      <div class="d-box d-box--quiet">&#x41F;&#x43B;&#x430;&#x449;&#x430;&#x43D;&#x435;</div>
      <div class="d-box d-box--quiet">&#x412;&#x440;&#x44A;&#x449;&#x430;&#x43D;&#x435;</div>
    </div>
  </div>
  <div class="d-box d-box--outline" style="width:260px">
    <div class="d-switcher">
      <div class="d-box d-box--quiet">&#x414;&#x43E;&#x441;&#x442;&#x430;&#x432;&#x43A;&#x430;</div>
      <div class="d-box d-box--quiet">&#x41F;&#x43B;&#x430;&#x449;&#x430;&#x43D;&#x435;</div>
      <div class="d-box d-box--quiet">&#x412;&#x440;&#x44A;&#x449;&#x430;&#x43D;&#x435;</div>
    </div>
  </div>
</div>

<p class="lbl">FRAME &mdash; media with a ratio, so a picture never resizes the row it lands in</p>
<div class="d-cluster d-cluster--loose d-cluster--top">
  <div style="width:200px"><div class="d-frame"><img src="''' + CUTOUT + u'''" alt=""></div><p class="lbl">4 / 3, the default</p></div>
  <div style="width:200px"><div class="d-frame d-frame--square"><img src="''' + CUTOUT + u'''" alt=""></div><p class="lbl">--square</p></div>
  <div style="width:200px"><div class="d-frame d-frame--wide"><img src="''' + CUTOUT + u'''" alt=""></div><p class="lbl">--wide</p></div>
  <div style="width:200px"><div class="d-frame d-frame--square d-frame--contain"><img src="''' + CUTOUT + u'''" alt=""></div><p class="lbl">--contain, which letterboxes rather than crops</p></div>
</div>

<div class="todo"><b>Eight primitives now: shell, split, stack, grid, cluster,
box, switcher, frame.</b> Four of them are new and nothing has been converted to
them yet &mdash; the hand-written flex rows in the header, footer, filters, card
actions and payment icons are still hand-written. Converting them is worth doing
<em>after</em> the composition matrix, not before, because the matrix is what
will say which of those hand-written rows were actually wrong.<br><br>
<b>And one rule is stated but not yet enforced:</b> a component never sets its
own outer margin. Known offenders are listed at the foot of
<code>src/patterns/layout.css</code> &mdash; <code>.d-intake</code>,
<code>.d-courier</code>, and two adopted WooCommerce families. The matrix gate
is what will hold the line, by measuring the rendered margin rather than
grepping for the word.</div>
</section>''')

# ---------------------------------------------------------------- alignment ---
# *** THE ONE SECTION THAT IS NOT ABOUT A COMPONENT. ***
# Everything above shows a pattern on its own, where it is always correct. What
# an owner actually sees is two correct patterns starting in different places,
# and no screenshot of either one on its own can show that. So: components next
# to each other, with the rails drawn from the tokens they read.
A(u'''<section class="sec" id="align"><h2>Rules</h2><h3>Alignment &mdash; what lines up with what, and with the page</h3>
<p class="note">Most of what reads as untidy on a real page is not a component
being wrong. It is two correct components starting in slightly different
places, and neither one&rsquo;s own screenshot can show it.</p>
<p class="note"><b>Measured at 1440, with only the built stylesheet loaded:</b>
the page had <b>three</b> left rails. <code>x=180</code> for the header and its
logo, <code>x=220</code> for every section title, grid, archive, product and
hero, and the mega menu&rsquo;s columns at the page maximum&rsquo;s own edge with
no gutter at all. Nobody chose that: seven files each wrote
<code>max-width:var(--page-max)</code> beside their own padding, and two reached
for <code>--space-s</code> where the other five used <code>--gutter</code>. A
rule repeated in seven files is seven chances to differ, and the difference is
invisible in every one of them.</p>
<p class="note">The frame is now one class &mdash; <code>.d-shell</code> in
<code>src/patterns/layout.css</code> &mdash; and every guide below is positioned
with the same token the component reads. The line is not an opinion about where
the rail is; it <em>is</em> the rail, so a component that misses it is missing
its own token.</p>
<p class="lbl"><label><input type="checkbox" id="alg-g" checked> Show guides</label></p>

<p class="lbl">1 &middot; THE PAGE RAIL &mdash; header, section title and grid, all in <code>.d-shell</code></p>
<div class="algn"><div class="algn-page">
<i class="gl gl--low" style="left:calc((100% - var(--w-body)) / 2)"><b>page rail &mdash; --w-body, 80%</b></i>
<i class="gl" style="left:auto;right:calc((100% - var(--w-body)) / 2)"></i>
<i class="gl gl--bar" style="left:calc((100% - var(--w-wide)) / 2)"><b>bar rail &mdash; --w-wide, 95%</b></i>
<i class="gl gl--was" style="left:calc((100% - var(--w-wide)) / 2 + var(--gutter))"><b>where content started while --page-max was a max-width AND --gutter a padding</b></i>
<header class="d-header" style="position:relative;border-radius:var(--radius-m) var(--radius-m) 0 0">
  <div class="d-header__inner d-shell d-shell--bar">
    <a class="d-header__logo" href="#">&#x414;&#x430;&#x440;&#x43B;&#x438;&#x43D;&#x433;</a>
    <nav class="d-nav"><ul>
      <li><a href="#" aria-current="page">&#x41D;&#x430;&#x447;&#x430;&#x43B;&#x43E;</a></li>
      <li><a href="#">&#x41F;&#x440;&#x43E;&#x43C;&#x43E;&#x446;&#x438;&#x438;</a></li>
    </ul></nav>
  </div>
</header>
<h2 class="d-section-title d-shell" style="margin-block:var(--space-m) var(--space-s)">&#x41D;&#x43E;&#x432;&#x43E; &#x432; &#x43C;&#x430;&#x433;&#x430;&#x437;&#x438;&#x43D;&#x430;</h2>
<div class="d-grid d-shell" style="padding-bottom:var(--space-m)">''')
for name, price, now, chip in PRODUCTS[:3]:
    A('<article class="d-card">')
    A('<div class="d-card__media">')
    if chip:
        A('<span class="d-card__chip d-finish">%s</span>' % html.escape(chip))
    A('<img src="%s" alt=""></div>' % CUTOUT)
    A('<div class="d-card__accent d-finish"></div>')
    A('<h3 class="d-card__title"><a href="#">%s</a></h3>' % html.escape(name))
    A('<p class="d-card__price">%s \u043b\u0432.</p>' % price)
    A('</article>')
A(u'''</div>
</div></div>
<p class="note"><b>Two rails, and only one of them is a decision.</b> The heading
and the first card sit on the page rail. The logo sits further out, on the bar
rail, because the owner asked for it there &mdash; a header is chrome, and chrome
may sit outside the column it frames. The cherry dots are where the logo used to
be: not chosen, just <code>--space-s</code> typed into <code>header.css</code>
where five other files had typed <code>--gutter</code>. The difference between
that and this is that <code>--gutter-bar</code> is named, is one number, and
<code>aligngate.js</code> fails if the logo ever leaves it.</p>

<p class="lbl">2 &middot; A COLUMN WITH SOMETHING BESIDE IT &mdash; <code>.d-split</code></p>
<div class="algn"><div class="algn-page">
<i class="gl" style="left:calc((100% - var(--w-body)) / 2)"><b>page rail</b></i>
<i class="gl gl--right" style="left:auto;right:calc((100% - var(--w-body)) / 2)"><b>and the aside ends on it</b></i>
<div class="d-shell" style="padding-block:var(--space-m)">
<div class="d-split">
  <div class="d-split__main d-stack">
    <h3 style="font:var(--type-section);margin:0">&#x410;&#x434;&#x440;&#x435;&#x441; &#x437;&#x430; &#x434;&#x43E;&#x441;&#x442;&#x430;&#x432;&#x43A;&#x430;</h3>
    <div class="d-fieldgrid" style="margin-top:0">
      <div class="d-field"><label class="d-field__label">&#x418;&#x43C;&#x435;</label>
        <input class="d-field__control" type="text" value="&#x41C;&#x430;&#x440;&#x438;&#x44F;" placeholder=" " aria-label="&#x418;&#x43C;&#x435;"><p class="d-field__error"></p></div>
      <div class="d-field"><label class="d-field__label">&#x424;&#x430;&#x43C;&#x438;&#x43B;&#x438;&#x44F;</label>
        <input class="d-field__control" type="text" placeholder=" " aria-label="Пример"><p class="d-field__error"></p></div>
      <div class="d-field d-field--wide"><label class="d-field__label">&#x410;&#x434;&#x440;&#x435;&#x441;</label>
        <input class="d-field__control" type="text" placeholder=" " aria-label="Пример"><p class="d-field__error"></p></div>
    </div>
    <label class="d-check"><input type="checkbox" checked><span>&#x418;&#x437;&#x43F;&#x43E;&#x43B;&#x437;&#x432;&#x430;&#x439; &#x441;&#x44A;&#x449;&#x438;&#x44F; &#x430;&#x434;&#x440;&#x435;&#x441; &#x438; &#x437;&#x430; &#x444;&#x430;&#x43A;&#x442;&#x443;&#x440;&#x438;&#x440;&#x430;&#x43D;&#x435;</span></label>
    <button class="d-btn d-finish" style="width:100%">&#x41F;&#x43E;&#x440;&#x44A;&#x447;&#x430;&#x439;</button>
  </div>
  <aside class="d-split__aside">
    <div style="padding:var(--space-s);background:var(--surface-raised);
         border:1px solid var(--hairline);border-radius:var(--radius-l)">
      <p style="margin:0 0 var(--stack-tight);font:var(--type-section);font-size:var(--fs-ui)">&#x41E;&#x431;&#x43E;&#x431;&#x449;&#x435;&#x43D;&#x438;&#x435;</p>
      <div class="d-stack d-stack--tight">
        <p style="display:flex;justify-content:space-between;margin:0;font-size:var(--fs-meta)"><span>&#x41C;&#x435;&#x436;&#x434;&#x438;&#x43D;&#x435;&#x43D; &#x441;&#x431;&#x43E;&#x440;</span><b>26,40 &euro;</b></p>
        <p style="display:flex;justify-content:space-between;margin:0;font-size:var(--fs-meta)"><span>&#x414;&#x43E;&#x441;&#x442;&#x430;&#x432;&#x43A;&#x430;</span><b>5,90 &euro;</b></p>
        <p style="display:flex;justify-content:space-between;margin:0"><span><b>&#x41E;&#x431;&#x449;&#x43E;</b></span><b>32,30 &euro;</b></p>
      </div>
    </div>
  </aside>
</div></div>
</div></div>
<p class="note"><b>The vertical axis is alignment too, and the first version of
this section only drew one of the two.</b> With the guides on, the gold behind
the field grid is its <code>--space-xs</code> gap and the pink strips are the
<code>.d-field__error</code> lines. That is the answer to &ldquo;why is there so
much padding under a field&rdquo;: there is none. Every field keeps a line in
reserve for its error message, always, so a form cannot grow by 18&nbsp;px per
invalid field under a thumb that is already moving toward the button. It is the
one piece of empty space on the page that is doing a job.</p>
<p class="note">The aside is <code>21rem</code>, not a percentage. A percentage
column keeps shrinking until the summary&rsquo;s own two-column rows wrap, at
window sizes nobody opens on a desktop to check. Below <code>62rem</code> it
stops being a column and becomes the next block down &mdash; narrow this page to
see it. The stand-in surface inside it is exactly that: a box drawn from tokens,
not a component we have agreed on.</p>

<p class="lbl">3 &middot; THE CONTROL COLUMN &mdash; a tick, a radio and Woo&rsquo;s own checkbox, one text rail</p>
<div class="algn"><div class="algn-page">
<i class="gl" style="left:calc((100% - var(--w-body)) / 2)"><b>page rail</b></i>
<i class="gl gl--bar" style="left:calc(calc((100% - var(--w-body)) / 2) + var(--inline))"><b>control rail</b></i>
<i class="gl gl--low" style="left:calc((100% - var(--w-body)) / 2 + var(--inline) + var(--control) + var(--inline))"><b>text rail</b></i>
<div class="d-shell d-stack d-stack--tight" style="padding-block:var(--space-m)">
<label class="d-check"><input type="checkbox" checked><span>&#x418;&#x441;&#x43A;&#x430;&#x43C; &#x444;&#x430;&#x43A;&#x442;&#x443;&#x440;&#x430; &#x437;&#x430; &#x444;&#x438;&#x440;&#x43C;&#x430;</span></label>
<label class="d-check"><input type="radio" name="alg-r" checked><span>&#x421;&#x43F;&#x438;&#x434;&#x438; &#x43E;&#x444;&#x438;&#x441;</span></label>
<label class="d-check"><input type="radio" name="alg-r"><span>&#x414;&#x43E; &#x430;&#x434;&#x440;&#x435;&#x441;</span></label>
<div class="wc-block-components-form">
<div class="wc-block-components-checkbox">
<label for="alg-wc"><input id="alg-wc" class="wc-block-components-checkbox__input" type="checkbox" checked>
<svg class="wc-block-components-checkbox__mark" aria-hidden="true" viewBox="0 0 24 20"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg>
<span class="wc-block-components-checkbox__label">WooCommerce&rsquo;s own checkbox, unmodified markup</span></label>
</div></div>
</div>
</div></div>
<p class="note">Three components, three files, two rails &mdash; one for the
control and one for the text, and all three families on both. They were
<code>1.18em</code>, <code>1.15rem</code> and <code>1.25rem</code>: three sizes
for one job, so a form that mixed them put its text on rails up to
3.5&nbsp;px apart. Too small to name, exactly large enough to make a form feel
loose. One token, <code>--control</code>, at the size the owner had already
approved, and the em one is gone &mdash; an em control changed size with
whatever font-size its label happened to have.</p>
<p class="note"><b>The control is inset from the row&rsquo;s edge by the same gap
it keeps on its other side.</b> Sitting exactly on the rail it had
<code>--inline</code> of air to its right, before the label, and none at all to
its left. The row&rsquo;s own box still starts on the rail &mdash; this is
padding inside it, not a margin on it &mdash; so a list of tickboxes still lines
up with the headings and fields above it.</p>

<p class="lbl">4 &middot; RHYTHM &mdash; <code>.d-stack</code>, and why the gap is not a margin</p>
<div class="algn"><div class="algn-page">
<i class="gl" style="left:calc((100% - var(--w-body)) / 2)"><b>page rail</b></i>
<div class="d-shell" style="padding-block:var(--space-m)">
<div class="d-stack">
  <h3 style="font:var(--type-section);margin:0">&#x414;&#x43E;&#x441;&#x442;&#x430;&#x432;&#x43A;&#x430;</h3>
  <div class="d-notice d-notice--info"><span class="d-notice__stars"></span>
  <span class="d-notice__stars"></span><span class="d-notice__stars"></span>
  <div class="d-notice__body"><span class="d-notice__title">&#x411;&#x435;&#x437;&#x43F;&#x43B;&#x430;&#x442;&#x43D;&#x430; &#x434;&#x43E;&#x441;&#x442;&#x430;&#x432;&#x43A;&#x430;</span>&#x41D;&#x430;&#x434; 100 &euro; &#x434;&#x43E;&#x441;&#x442;&#x430;&#x432;&#x43A;&#x430;&#x442;&#x430; &#x435; &#x437;&#x430; &#x43D;&#x430;&#x448;&#x430; &#x441;&#x43C;&#x435;&#x442;&#x43A;&#x430;.</div></div>
  <p style="margin:0">&#x411;&#x43B;&#x43E;&#x43A; &#x435;&#x434;&#x438;&#x43D;.</p>
  <p style="margin:0">&#x411;&#x43B;&#x43E;&#x43A; &#x434;&#x432;&#x430;.</p>
</div>
</div>
</div></div>
<p class="note">The heading sits closer to what it names than blocks sit to each
other &mdash; <code>--stack-tight</code> after a heading, <code>--stack</code>
between blocks &mdash; so a title reads as belonging to the thing under it rather
than floating between two. The gap is <em>between</em>: the first block starts
flush against the top of its column and the last one leaves no trailing hole,
which a margin on the block itself cannot do.</p>

<div class="todo"><b>What this section is for.</b> B1 of the checkout port is
&ldquo;the form&rsquo;s own frame&rdquo;, and the honest way to do it is not to
write rules for the checkout &mdash; it is to have a frame, a split and a rhythm
that every page uses, and then let the checkout be one of them. Anything still
declaring its own <code>max-width:var(--page-max)</code> is on the list:
<b>As of 2026-08-10 they no longer do.</b> <code>.d-grid</code>,
<code>.d-archive</code>, <code>.d-product</code>, <code>.d-hero</code>, <code>.d-404</code>
and <code>.d-section-title</code> used to be listed beside <code>.d-shell</code> so
the templates would not have to say it. Measured, that cost two bugs: the 404 page
applied the gutter twice (its heading and grid are INSIDE the main), and the shop
archive paid the page gutter inside a column. A frame taken by name cannot know
where it is. Now the markup composes <code>.d-shell</code> and
<code>scripts/b1shell.js</code> fails if any shell leaves the rail.</div>
</section>''')

# ------------------------------------------------------------------- matrix ---
# *** THE ONLY HONEST ANSWER TO "WILL A CHECKBOX IN A PANEL IN A TABLE WORK". ***
# You cannot reason it out past two levels of nesting - the owner's question was
# three deep and he was right that nobody knows. So the combinations are
# rendered, and scripts/matrixgate.js measures them. Generated from the list, so
# adding a primitive adds its whole row and column without anyone remembering to.
MX_LEAF = (u'<div class="d-box d-box--quiet mx-leaf">\u0430</div>'
           u'<div class="d-box d-box--quiet mx-leaf">\u0431</div>')

def mx_wrap(kind, inner):
    """One layout primitive around whatever is handed to it."""
    if kind == 'split':
        # a split needs its two named children, so the inner goes in the main
        # column and the aside is a stub - anything else would not be a split
        return (u'<div class="d-split" style="--aside:5rem">'
                u'<div class="d-split__main">%s</div>'
                u'<div class="d-split__aside"><div class="d-box d-box--quiet mx-leaf">side</div></div>'
                u'</div>' % inner)
    return u'<div class="d-%s">%s</div>' % (kind, inner)

# .d-grid is NOT in this list, and that is a finding rather than an omission:
# it still carries the page frame (max-width, centring, --gutter) because its
# markup is WordPress block templates - see layout.css. Nested inside a 230px
# cell that is 60px of gutter on each side and no room left. It cannot be
# composed until the templates are regenerated, which is the rest of B1.
MX_KINDS = ['stack', 'cluster', 'switcher', 'box', 'split']

A(u'''<section class="sec" id="matrix"><h2>Rules</h2><h3>Composition &mdash; every primitive inside every other, and the awkward real ones</h3>
<p class="note"><b>&ldquo;How do we know that if we put a checkbox next to a
table, inside a panel, inside a table, it will display properly?&rdquo;</b> You
do not, and neither does anyone else, because reasoning does not survive two
levels of nesting. You render it and you measure it. That is this section, and
<code>scripts/matrixgate.js</code> is the measuring.</p>
<p class="note">Every cell below is <b>two</b> of the inner primitive inside
one of the outer one, with the same two boxes at the bottom of all of them. Two,
because a stack with one child and a cluster with one child are the same thing
&mdash; nothing &mdash; and the first version of this grid had exactly that, so
twenty of the twenty-five cells were showing the inner primitive and saying
nothing about the outer. The cells are outlined, so a child escaping its
container is visible as well as measurable.</p>
<p class="note"><b>What each one is.</b>
<code>.d-stack</code> is a column: things one under another, one gap between
each. <code>.d-cluster</code> is a row that wraps: things side by side at their
natural widths, wrapping individually when they run out of room.
<code>.d-switcher</code> is a row that becomes a column all at once: equal
widths, and either all beside each other or all stacked, decided by how wide its
container is and never half and half. <code>.d-box</code> is not a layout at all
&mdash; it is a surface with padding, and the only thing allowed to inset its
contents. <code>.d-split</code> is a main column with a fixed-width companion
beside it that drops underneath when there is no room.</p>
<p class="note">The gate asserts three things over the whole section: nothing
sticks out past its container, no padded box sits alone inside another padded
box, and every component rendered on its own has zero outer margin.</p>
<p class="lbl">EVERY PRIMITIVE INSIDE EVERY OTHER &mdash; 25 cells, generated from the list</p>
<div class="mx">''')
for outer in MX_KINDS:
    for inner in MX_KINDS:
        # *** THE OUTER LAYOUT NEEDS TWO CHILDREN OR IT IS NOT BEING TESTED. ***
        # The first version put ONE inner layout inside each outer one, and a
        # stack with one child, a cluster with one child and a switcher with one
        # child are the same thing: nothing. Twenty of the twenty-five cells
        # were rendering the inner primitive and saying nothing at all about the
        # outer. The owner spotted it by looking at them. Two inner groups now,
        # so the outer's own direction and gap have something to act on.
        pair = mx_wrap(inner, MX_LEAF) + mx_wrap(inner, MX_LEAF)
        A(u'<div class="mx-cell" data-mx="%s>%s"><p class="mx-lbl">%s &rsaquo; %s</p>%s</div>'
          % (outer, inner, outer, inner, mx_wrap(outer, pair)))
A(u'''</div>

<p class="note"><b>Two of the five cannot show what they do in a cell that
narrow, and that is a hole in the grid above rather than a fact about them.</b>
A switcher goes to one column below <code>30rem</code> and a split below
<code>62rem</code>, and every cell up there is about 230&nbsp;px wide &mdash; so
in all twenty-five of them the switcher is stacked and the split is stacked, and
neither has been tested doing the thing it exists for. The same twenty-five
below, one per row at full width, where both of them are above their threshold.
Compare a row here against its cell above: if a pair looks the same in both, one
of the two primitives in it does not care about width, which is itself worth
knowing.</p>
<p class="lbl">THE SAME TWENTY-FIVE, IN A CONTAINER WIDE ENOUGH FOR ALL OF THEM</p>
<div class="mx mx--wide">''')
for outer in MX_KINDS:
    for inner in MX_KINDS:
        pair = mx_wrap(inner, MX_LEAF) + mx_wrap(inner, MX_LEAF)
        A(u'<div class="mx-cell" data-mx="wide %s>%s"><p class="mx-lbl">%s &rsaquo; %s</p>%s</div>'
          % (outer, inner, outer, inner, mx_wrap(outer, pair)))
A(u'''</div>

<p class="lbl">AND THE ONES THAT ACTUALLY HAPPEN &mdash; starting with the owner&rsquo;s</p>

<p class="lbl">1 &middot; a checkbox next to a table, inside a panel, inside a table</p>
<div class="mx-real">
<table class="d-table" style="max-width:620px"><tbody>
<tr><td>\u0420\u0435\u0434 \u0435\u0434\u0438\u043d</td><td>
  <details class="d-panel" open><summary class="d-panel__summary">\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0441\u0442\u0438</summary>
  <div class="d-panel__content">
    <div class="d-cluster d-cluster--top">
      <label class="d-check"><input type="checkbox" checked><span>\u0421 \u043a\u0443\u0442\u0438\u044f</span></label>
      <table class="d-table d-table--flat">
        <tbody><tr><td>\u0428\u0438\u0440\u0438\u043d\u0430</td><td class="d-table__num">24 \u0441\u043c</td></tr>
        <tr><td>\u0412\u0438\u0441\u043e\u0447\u0438\u043d\u0430</td><td class="d-table__num">11 \u0441\u043c</td></tr></tbody>
      </table>
    </div>
  </div></details>
</td></tr>
<tr><td>\u0420\u0435\u0434 \u0434\u0432\u0430</td><td>&mdash;</td></tr>
</tbody></table>
</div>

<p class="lbl">2 &middot; a panel in a split&rsquo;s aside, with a card in a switcher in the main column</p>
<div class="mx-real">
<div class="d-split">
  <div class="d-split__main"><div class="d-switcher">
    <article class="d-card"><div class="d-card__media"><img src="''' + CUTOUT + u'''" alt=""></div>
      <h3 class="d-card__title"><a href="#">\u041a\u0435\u0440\u0430\u043c\u0438\u0447\u043d\u0430 \u043a\u0443\u043f\u0430</a></h3>
      <p class="d-card__price">26,40 \u043b\u0432.</p></article>
    <article class="d-card"><div class="d-card__media"><img src="''' + CUTOUT + u'''" alt=""></div>
      <h3 class="d-card__title"><a href="#">\u041b\u0435\u043d\u0435\u043d\u0430 \u043a\u044a\u0440\u043f\u0430</a></h3>
      <p class="d-card__price">22,00 \u043b\u0432.</p></article>
  </div></div>
  <div class="d-split__aside">
    <details class="d-panel" open><summary class="d-panel__summary">\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430</summary>
    <div class="d-panel__content">\u0411\u0435\u0437\u043f\u043b\u0430\u0442\u043d\u0430 \u043d\u0430\u0434 100 &euro;.</div></details>
  </div>
</div>
</div>

<p class="lbl">3 &middot; a notice inside a card, and a cluster of badges inside a table cell</p>
<div class="mx-real">
<div class="d-cluster d-cluster--top d-cluster--loose">
  <article class="d-card" style="width:240px">
    <div class="d-card__media"><img src="''' + CUTOUT + u'''" alt=""></div>
    <h3 class="d-card__title"><a href="#">\u0421\u0442\u044a\u043a\u043b\u0435\u043d\u0430 \u043a\u0430\u043d\u0430</a></h3>
    <div class="d-notice d-notice--warning"><span class="d-notice__stars"></span>
      <span class="d-notice__stars"></span><span class="d-notice__stars"></span>
      <div class="d-notice__body">\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438 2 \u0431\u0440\u043e\u044f</div></div>
    <p class="d-card__price">42,00 \u043b\u0432.</p>
  </article>
  <table class="d-table" style="flex:1;min-width:260px"><tbody>
    <tr><td>\u0421\u044a\u0441\u0442\u043e\u044f\u043d\u0438\u0435</td><td><div class="d-cluster d-cluster--tight">
      <span class="d-badge">\u041d\u043e\u0432\u043e</span><span class="d-badge d-badge--sale">\u041d\u0430\u043c\u0430\u043b\u0435\u043d\u0438\u0435</span>
      <span class="d-badge">\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438 2</span></div></td></tr>
    <tr><td>\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430</td><td><div class="d-box d-box--quiet">
      <label class="d-check"><input type="radio" name="mx-r" checked><span>\u0414\u043e \u0430\u0434\u0440\u0435\u0441</span></label>
      <label class="d-check"><input type="radio" name="mx-r"><span>\u0414\u043e \u043e\u0444\u0438\u0441</span></label>
    </div></td></tr>
  </tbody></table>
</div>
</div>

<p class="lbl">4 &middot; a field inside a box inside a table cell, beside WooCommerce&rsquo;s own field</p>
<div class="mx-real">
<table class="d-table" style="max-width:640px"><tbody>
<tr><td style="width:50%"><div class="d-box d-box--outline">
  <div class="d-field"><label class="d-field__label">\u041a\u043e\u0434</label>
  <input class="d-field__control" type="text" placeholder=" " aria-label="Пример"><p class="d-field__error"></p></div>
</div></td>
<td><div class="d-box d-box--outline"><div class="wc-block-components-form">
  <div class="wc-block-components-text-input"><input type="text" placeholder=" " id="mx-wc"><label for="mx-wc">\u041a\u043e\u0434</label></div>
</div></div></td></tr>
</tbody></table>
</div>

<p class="lbl">EVERY COMPONENT ON ITS OWN &mdash; the gate reads the outer margin off each of these</p>
<p class="note">A component must not set its own outer margin: the gap between
two things belongs to whatever contains them, because only the container knows
what the two things are. Each dashed box below holds one component as an only
child, so a margin has nowhere to hide.</p>
<div class="mx-alone" id="mx-alone">''')
MX_ALONE = [
    (u'd-btn', u'<a class="d-btn d-finish" href="#">\u041a\u0443\u043f\u0438</a>'),
    (u'd-badge', u'<span class="d-badge">\u041d\u043e\u0432\u043e</span>'),
    (u'd-check', u'<label class="d-check"><input type="checkbox" checked><span>\u0421 \u043a\u0443\u0442\u0438\u044f</span></label>'),
    (u'd-field', u'<div class="d-field"><label class="d-field__label">\u0418\u043c\u0435</label>'
                 u'<input class="d-field__control" type="text" placeholder=" " aria-label="Пример"><p class="d-field__error"></p></div>'),
    (u'd-notice', u'<div class="d-notice d-notice--info"><span class="d-notice__stars"></span>'
                  u'<span class="d-notice__stars"></span><span class="d-notice__stars"></span>'
                  u'<div class="d-notice__body">\u0411\u0435\u0437\u043f\u043b\u0430\u0442\u043d\u0430 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430</div></div>'),
    (u'd-panel', u'<details class="d-panel"><summary class="d-panel__summary">\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430</summary>'
                 u'<div class="d-panel__content">\u0422\u0435\u043a\u0441\u0442.</div></details>'),
    (u'd-table', u'<table class="d-table"><tbody><tr><td>\u0420\u0435\u0434</td>'
                 u'<td class="d-table__num">1,00</td></tr></tbody></table>'),
    (u'd-card', u'<article class="d-card" style="width:200px"><div class="d-card__media">'
                u'<img src="' + CUTOUT + u'" alt=""></div>'
                u'<h3 class="d-card__title"><a href="#">\u041a\u0443\u043f\u0430</a></h3>'
                u'<p class="d-card__price">26,40 \u043b\u0432.</p></article>'),
    (u'wc checkbox', u'<div class="wc-block-components-form"><div class="wc-block-components-checkbox" data-mx-target>'
                     u'<label for="mx-wcc"><input id="mx-wcc" class="wc-block-components-checkbox__input" type="checkbox" checked>'
                     u'<svg class="wc-block-components-checkbox__mark" aria-hidden="true" viewBox="0 0 24 20">'
                     u'<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg>'
                     u'<span class="wc-block-components-checkbox__label">Woo</span></label></div></div>'),
    (u'wc text input', u'<div class="wc-block-components-form"><div class="wc-block-components-text-input" data-mx-target>'
                       u'<input type="text" placeholder=" " id="mx-wct"><label for="mx-wct">Woo</label></div></div>'),
]
for name, markup in MX_ALONE:
    A(u'<div data-mx-alone="%s">%s</div>' % (name, markup))
A(u'''</div>
<div class="todo"><b>What this section cannot do.</b> It proves the
combinations it contains and nothing else, and it is a fixed list &mdash; the
five primitives crossed with themselves plus four real arrangements. It will not
find a bug in a nesting nobody wrote down. That is a real limit and the answer
to it is to add rows when a new arrangement appears on the site, which is cheap
because the grid is generated.<br><br>
<b>And one primitive is missing from the grid on purpose.</b>
<code>.d-grid</code> still carries the page frame &mdash; max-width, centring
and <code>--gutter</code> &mdash; because its markup is WordPress block
templates where a class is written twice. Nested in a 230&nbsp;px cell that is
60&nbsp;px of gutter each side and nothing left over, so it cannot be composed
until the templates are regenerated. That is the rest of B1, and it is now a
visible consequence rather than a note.</div>
</section>''')

# ------------------------------------------------------------------ rategrid ---
# Owner, 2026-08-10: the other two are Pigeon Express and Sameday, not DHL and
# Bulgarian Post. Mock data, but a mock with the wrong names teaches the wrong
# thing to whoever reads it next.
# Owner, 2026-08-10: five couriers with up to three methods each is fifteen
# radio rows in a column - "a lot of the page", and hard to compare. A matrix
# instead: couriers across, methods down, empty where a courier does not offer
# one, cheapest row on top.
RATES = [
    # method label,        boxnow,   speedy,   econt,    dhl,     bgpost
    (u'\u0414\u043e \u0430\u0432\u0442\u043e\u043c\u0430\u0442',
     u'1,64', None, None, None, u'2,10'),
    (u'\u0414\u043e \u043e\u0444\u0438\u0441',
     None, u'4,42', u'7,31', u'3,95', None),
    (u'\u0414\u043e \u0430\u0434\u0440\u0435\u0441',
     None, u'7,17', u'8,55', u'6,20', u'5,80'),
]
COURIERS = [u'BoxNow', u'\u0421\u043f\u0438\u0434\u0438', u'\u0415\u043a\u043e\u043d\u0442',
            u'Pigeon Express', u'Sameday']

A(u'''<section class="sec" id="rategrid"><h2>Pattern</h2><h3>Choice table &mdash; the delivery matrix</h3>
<p class="note">Five couriers with up to three methods each is <b>fifteen radio
rows in a column</b>. The list below the fold, the prices in fifteen different
places, and no way to see that Спиди to an office is cheaper than Еконт to an
office without reading both. Same information as a matrix: couriers across,
methods down, every price in the same place in its row.</p>
<p class="note"><b>Which component is it?</b> Both, and that is the answer
rather than a dodge. What is on screen is a <em>table</em> of prices, so the
grid, the tone and the headers are a table variant &mdash;
<code>.d-table--choice</code>. What it does is a <em>radio group</em>, exactly
one of which is chosen, so the cell control lives beside
<code>.d-check</code> in field.css &mdash; <code>.d-choice</code>. The input is
still a real radio: it is what is focused, what arrow keys move between, what a
screen reader announces and what the form submits. Only the dot is gone.</p>
<p class="note"><b>An empty cell is a statement, so it is drawn.</b> Left blank
it reads as a rendering fault and the customer has to work out that the hole
means &ldquo;Еконт does not do lockers&rdquo;. A dashed quiet box says
unavailable without claiming to be pressable.</p>
<table class="d-table d-table--choice" style="max-width:760px">
<caption class="screen-reader-text">\u041d\u0430\u0447\u0438\u043d \u043d\u0430 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430</caption>
<thead><tr><td></td>''' + u''.join(
  u'<th scope="col"><span class="d-ratehead">%s</span></th>' % c for c in COURIERS
) + u'</tr></thead><tbody>')
first = True
for row in RATES:
    method = row[0]
    A(u'<tr><th scope="row">%s</th>' % method)
    for i, price in enumerate(row[1:]):
        if price is None:
            A(u'<td></td>')
        else:
            checked = u' checked' if first else u''
            first = False
            A(u'<td><label class="d-choice">'
              u'<input type="radio" name="gallery-rate" aria-label="%s, %s, %s \u043b\u0432."%s>'
              u'<span class="d-choice__price">%s \u043b\u0432.</span></label></td>'
              % (COURIERS[i], method, price, checked, price))
    A(u'</tr>')
A(u'''</tbody></table>
<p class="lbl" style="margin-top:22px">The same five couriers as WooCommerce renders them today &mdash; nine rows, and this is only three of the five</p>
<div class="d-stack d-stack--tight" style="max-width:420px">
<label class="d-check"><input type="radio" name="gallery-rate-list" checked><span>BoxNow &mdash; \u0434\u043e \u0430\u0432\u0442\u043e\u043c\u0430\u0442 &nbsp; 1,64 \u043b\u0432.</span></label>
<label class="d-check"><input type="radio" name="gallery-rate-list"><span>\u0421\u043f\u0438\u0434\u0438 &mdash; \u0434\u043e \u043e\u0444\u0438\u0441 &nbsp; 4,42 \u043b\u0432.</span></label>
<label class="d-check"><input type="radio" name="gallery-rate-list"><span>\u0421\u043f\u0438\u0434\u0438 &mdash; \u0434\u043e \u0430\u0434\u0440\u0435\u0441 &nbsp; 7,17 \u043b\u0432.</span></label>
<label class="d-check"><input type="radio" name="gallery-rate-list"><span>\u0415\u043a\u043e\u043d\u0442 &mdash; \u0434\u043e \u043e\u0444\u0438\u0441 &nbsp; 7,31 \u043b\u0432.</span></label>
<label class="d-check"><input type="radio" name="gallery-rate-list"><span>\u0415\u043a\u043e\u043d\u0442 &mdash; \u0434\u043e \u0430\u0434\u0440\u0435\u0441 &nbsp; 8,55 \u043b\u0432.</span></label>
</div>
<div class="todo"><b>Not done, and each one is a decision rather than CSS.</b>
<br><br><b>The logos.</b> The head cell takes an <code>&lt;img&gt;</code> and
falls back to the wordmark, which is what is drawn above &mdash; we have no
courier logo files, and four of the five are Bulgarian couriers whose wordmarks
a customer here reads faster than a symbol anyway. Real logos are trademark
files and belong in the licence register like every other image.<br><br>
<b>Cheapest on top.</b> Sorting needs the numbers, so it is not CSS's to do:
the markup has to arrive sorted. Above it is sorted by hand.<br><br>
<b>And WooCommerce does not emit this markup.</b> It renders a flat list of
labels whose <code>for</code> is <code>radio-control-1-darling_speedy:office</code>
&mdash; courier and method, both in the attribute. That is enough to place every
existing label into a grid cell with attribute selectors and no DOM surgery at
all, which is the plan: no rebuilding of React-owned nodes, nothing to be undone
by a re-render. The headers are the part that has to be added rather than moved.
</div>
</section>''')

A('''<section class="sec" id="next"><h2>Status</h2>
<h3>Where this actually stands</h3>
<p class="note"><b>The patterns are done and reviewed.</b> Every section above
this one has been through the owner, and every one is written against markup
captured from the live site rather than against class names. Anything that has
to overrule WooCommerce lives in <code>src/adopted/</code>, outside the cascade
layers, because that is the only place it can win.</p>
<p class="note"><b>What is left is WooCommerce&rsquo;s own furniture</b> &mdash;
the surfaces we do not author but do have to dress. The catalogue filters
(above) were the first of four:</p>
<div class="todo"><b>A. Catalogue filters &mdash; done, and reviewed.</b> Shell
and both modes are real; everything below the shell is a floor rather than a
finish, and <code>src/adopted/filters.css</code> says so in capitals. Re-verify
against the real DOM the day the catalogue has more than one product in
it.<br><br>
<b>B. The block checkout&rsquo;s innards.</b> Captured with a browser and a
seeded cart, because the served page is 3&nbsp;KB of scaffolding and the entire
form is built by React &mdash; 141 distinct <code>wc-block</code> classes that
<code>curl</code> cannot see. Steps, address form, totals, payment radios,
express payment.<br><br>
<b>C. The two libraries WooCommerce brings with it.</b> select2, which is 230
rules and is live on <code>/my-account/</code> today, and PhotoSwipe on the
product gallery. Each is a decision before it is a stylesheet: dress it, or
replace it with something of ours.<br><br>
<b>D. Woo&rsquo;s button variants.</b> <code>is-link</code> and
<code>is-style-outline</code> arrive from the block editor on content nobody
here wrote, and neither has a home in this system yet.</div>
<p class="note"><b>Then the cutover</b>, which has not moved: point
<code>functions.php</code> at the built stylesheet, add
<code>add_editor_style()</code> so the block editor gets the same file, delete
<code>style.css</code> and <code>assets/darling.css</code>, then take
WooCommerce&rsquo;s own stylesheets off one handle at a time in the order set
out in the surface inventory.</p>
<p class="note"><b>And two things carried, so they are not quietly lost.</b> The
map picker above is the styled component only &mdash; the map itself is a later
job, and OpenFreeMap with MapLibre is the current answer (no key, no quota,
commercial use explicit, self-hostable, and no SLA, which is the catch). And the
office-field plugin still emits an inline
<code style="color:#b01f30">#b01f30</code> that wants to become
<code>.d-notice--warning</code>.</p>
</section></div></body></html>''')

out = ''.join(P)

# *** THE NAV IS GENERATED FROM THE SECTIONS, BECAUSE A HAND-KEPT ONE DRIFTS. ***
# It had: twenty-five sections, twenty-three links. Panel and Slider had no way
# in, and #small was still advertised as "Quantity, badge, panel" from before the
# panel got its own section. Nothing was done wrong - a list kept in one place
# and sections written in another simply separate, and they do it silently.
#
# A missing link is now impossible rather than unlikely. NAV_LABEL is only for
# headings too long to sit in a strip; anything not in it is named after its own
# <h3>, truncated at the em dash. Add a section, get a link.
NAV_LABEL = {
	'chrome':    u'Header, mega, drawer',
	'flow':      u'Rhythm',
	'hidden':    u'Hidden text',
	'social':    u'Social login',
	'account':   u'Account forms',
	'columns':   u'Block columns',
	'tail':      u'The tail',
	'wcheckout': u'Checkout, dequeued',
	'wcart':     u'Cart, dequeued',
	'wcheader':  u'Checkout header',
	'profile':   u'Profile, dequeued',
	'season':    u'Season',
	'upsell':    u'Upsell grid',
	'addcart':   u'Add to cart',
	'footer':    u'Footer',
	'hero':      u'Hero',
	'catalogue': u'Catalogue',
	'pages':     u'Pages, a11y',
	'filters':   u'Filters',
	'mappick':   u'Map picker',
	'primitives': u'Primitives',
	'align':     u'Alignment',
	'matrix':    u'Composition',
	'rategrid':  u'Choice table',
	'next':      u'Still to come',
}
# Not by pattern-matching the opening tag: two sections legitimately do not open
# <h2><h3>. The season strip inside the hero is a second <section class="sec">
# with NO id - a continuation, not a destination - and #footer carries a style
# attribute and wraps its heading in .wrap so it can run edge to edge. So: take
# the id where there is one, take the first <h3> after it wherever it sits, and
# say out loud how many were anonymous instead of letting the number hide.
links, anon = [], 0
for m in re.finditer(r'<section class="sec"([^>]*)>', out):
	sid = re.search(r'id="([a-z0-9-]+)"', m.group(1))
	if not sid:
		anon += 1
		continue
	sid = sid.group(1)
	h3 = re.search(r'<h3>(.*?)</h3>', out[m.end():m.end() + 2000], re.S)
	assert h3, 'gen-gallery: #%s has no <h3> within 2000 chars to name its nav link' % sid
	label = NAV_LABEL.get(sid)
	if not label:
		label = re.sub(r'<[^>]+>', '', h3.group(1)).split('&mdash;')[0].strip().rstrip(',')
	links.append(u'<a href="#%s">%s</a>' % (sid, label))
out = out.replace(u'<!--GNAV-->',
                  u'<nav class="gnav">%s</nav>' % u''.join(links), 1)
assert u'<!--GNAV-->' not in out
# A stray cp1252 run in the OUTPUT means something was mangled on the way in and
# the gallery would ship with broken Cyrillic. Fail rather than publish it.
strays = sorted({m.group(0) for m in RUN.finditer(out) if unmangle(m) != m.group(0)})
assert not strays, strays
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(out)
print('gen-gallery: %d sections, %d nav links (%d anonymous), %.1f KB -> %s'
      % (out.count('<section class="sec"'), len(links), anon,
         len(out.encode()) / 1024, os.path.relpath(OUT_FILE, ROOT)))
