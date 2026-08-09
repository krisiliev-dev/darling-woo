# -*- coding: utf-8 -*-
u"""Does the new stylesheet answer the markup we actually ship?

*** THIS IS THE CUTOVER'S ONLY REAL PRECONDITION. ***
The port can be finished and the site can still be dressed entirely by
style.css, because the port renamed everything: `.darling-header` became
`.d-header`, `df-head` became `.d-footer__head`. Measured on 2026-08-09, before
the rename: 141 classes in our own templates that src/ does not draw, 96 of them
renames and the rest genuinely unported. Every one of those is a piece of the
page that goes bare the moment style.css is deleted.

Nothing else notices. The build succeeds, the token check passes, the gallery is
perfect - because the gallery is written in the new names and the SITE is not.

So this compares the two sets and fails when they disagree:

    MARKUP  every class on an element in templates/, parts/, and the strings our
            own JS builds
    DRAWN   every class named in a selector anywhere under src/

WordPress's and WooCommerce's own classes are reported separately and never
fail: `wp-block-group` is not ours to name, and whether we adopt it is a
different question from whether we renamed it.

Run it before the cutover, and after any template edit. An empty OURS list is
the thing that makes deleting style.css a rename rather than a demolition.
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.join(ROOT, 'theme', 'darling')

def rd(p):
    return io.open(p, encoding='utf-8', errors='replace').read()

CLASS_ATTR = re.compile(r'class=(?:"([^"]*)"|\'([^\']*)\')')
markup = {}
for sub in ('templates', 'parts', 'assets'):
    d = os.path.join(T, sub)
    if not os.path.isdir(d):
        continue
    for dp, dn, fs in os.walk(d):
        for f in fs:
            if os.path.splitext(f)[1] not in ('.html', '.php', '.js'):
                continue
            rel = os.path.relpath(os.path.join(dp, f), T).replace('\\', '/')
            for m in CLASS_ATTR.finditer(rd(os.path.join(dp, f))):
                for c in (m.group(1) or m.group(2) or '').split():
                    # block templates carry PHP and handlebars fragments inside
                    # class=""; anything with a brace or a dollar is not a
                    # literal class name.
                    if c and not re.search(r'[{}$<>()]', c):
                        markup.setdefault(c, set()).add(rel)

drawn = set()
for dp, dn, fs in os.walk(os.path.join(T, 'src')):
    for f in fs:
        if f.endswith('.css'):
            # a class inside a comment is not drawn, and these files are mostly
            # comment
            css = re.sub(r'/\*[\s\S]*?\*/', '', rd(os.path.join(dp, f)))
            drawn |= set(re.findall(r'\.(-?[_a-zA-Z][\w-]*)', css))

THIRD = re.compile(r'^(wp-|wc-|woocommerce|nsl-|pswp|flex-|screen-reader|has-|is-'
                   r'|align|entry-|post-|page-|comment|says|sticky|bypostauthor)')

ours, theirs = [], []
for c in sorted(markup):
    if c in drawn:
        continue
    (theirs if THIRD.match(c) else ours).append(c)

print('OUR CLASSES WITH NO RULE IN src/  (%d)' % len(ours))
for c in ours:
    print('  *FAIL*  %-34s %s' % (c, ', '.join(sorted(markup[c]))))
if not ours:
    print('  PASS    the built stylesheet answers every class our markup uses')

print('\nTHIRD-PARTY CLASSES, NOT OURS TO NAME  (%d, never fatal)' % len(theirs))
for c in theirs:
    print('          %-34s %s' % (c, ', '.join(sorted(markup[c]))))

print('\n%s' % ('RESULT: FAILURES   %d' % len(ours) if ours else 'RESULT: nothing goes bare'))
sys.exit(1 if ours else 0)
