"""Build the WooCommerce/Stripe surface inventory.

Every stylesheet the live site loads is fetched, its selectors are parsed, and
the class families are clustered so each stylesheet becomes a list of NAMED
SURFACES rather than a byte count. That list is the porting checklist: a handle
can be dequeued once every surface under it has a darling equivalent.

Derived from the real bytes on the real server, not from memory or from the
plugin docs, because the docs cover three of the fifteen.
"""
import re, json, urllib.request, collections

BASE = 'https://darlinghome.bg/wp-content/'
SHEETS = [
    ('woocommerce-general',      'plugins/woocommerce/assets/css/woocommerce.css'),
    ('woocommerce-layout',       'plugins/woocommerce/assets/css/woocommerce-layout.css'),
    ('woocommerce-smallscreen',  'plugins/woocommerce/assets/css/woocommerce-smallscreen.css'),
    ('woocommerce-blocktheme',   'plugins/woocommerce/assets/css/woocommerce-blocktheme.css'),
    ('wc-blocks-style',          'plugins/woocommerce/assets/client/blocks/wc-blocks.css'),
    ('wc-blocks-style-cart',     'plugins/woocommerce/assets/client/blocks/cart.css'),
    ('wc-blocks-packages-style', 'plugins/woocommerce/assets/client/blocks/packages-style.css'),
    ('wc-blocks-style-all-products', 'plugins/woocommerce/assets/client/blocks/all-products.css'),
    ('wc-blocks-style-store-notices', 'plugins/woocommerce/assets/client/blocks/store-notices.css'),
    ('wc-blocks-style-product-image', 'plugins/woocommerce/assets/client/blocks/product-image.css'),
    ('stripe-upe-blocks',        'plugins/woocommerce-gateway-stripe/build/upe-blocks.css'),
    ('stripe-upe-classic',       'plugins/woocommerce-gateway-stripe/build/upe-classic.css'),
    ('stripe-express-checkout',  'plugins/woocommerce-gateway-stripe/build/express-checkout.css'),
    ('stripe-link',              'plugins/woocommerce-gateway-stripe/assets/css/stripe-link.css'),
]

# A family is the part of a class name that identifies the COMPONENT, before any
# BEM element or modifier. Everything below collapses to one of these.
STRIP = re.compile(r'(__|--).*$')
NOISE = re.compile(r'^(is|has|wp|screen|clear|sr|components|theme|editor|wc-block-grid)$')


def family(cls):
    c = cls.lstrip('.')
    c = STRIP.sub('', c)
    for p in ('wc-block-components-', 'wc-block-', 'woocommerce-', 'wc-'):
        if c.startswith(p):
            c = c[len(p):]
            break
    return c


def selectors(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'@(media|supports|layer|container)[^{]*\{', '', css)
    out = []
    for m in re.finditer(r'([^{}]+)\{[^{}]*\}', css):
        sel = m.group(1).strip()
        if sel.startswith('@') or not sel:
            continue
        out.append(sel)
    return out


report = {}
for handle, path in SHEETS:
    try:
        css = urllib.request.urlopen(BASE + path, timeout=30).read().decode('utf-8', 'replace')
    except Exception as e:
        report[handle] = {'error': str(e)}
        continue
    sels = selectors(css)
    fams = collections.Counter()
    for sel in sels:
        seen = set()
        for cls in re.findall(r'\.[A-Za-z][\w-]*', sel):
            f = family(cls)
            if not f or NOISE.match(f) or len(f) < 3:
                continue
            seen.add(f)
        for f in seen:
            fams[f] += 1
    report[handle] = {
        'kb': round(len(css.encode()) / 1024, 1),
        'rules': len(sels),
        'families': fams.most_common(400),
    }

json.dump(report, open('/home/claude/surfaces.json', 'w'), indent=1)
for h, d in report.items():
    if 'error' in d:
        print('%-32s FETCH FAILED %s' % (h, d['error']))
        continue
    print('%-32s %6.1f KB  %4d rules  %3d families' % (h, d['kb'], d['rules'], len(d['families'])))
