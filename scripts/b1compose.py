# -*- coding: utf-8 -*-
u"""B1, finished: the frame becomes ONE class, reached ONE way.

layout.css has carried six aliases since the frame was extracted:

    .d-shell, .d-grid, .d-archive, .d-product, .d-hero, .d-404, .d-section-title

with a comment saying the tidy end state is `class="d-archive d-shell"` in the
markup and that twenty edits across eight templates was a bad trade "today".
Measuring the templates changed the arithmetic. Three things the aliases cause,
all measured by scripts/b1shell.js at 1440:

  1. 404.html DOUBLE-PADS. `.d-section-title` and `.d-grid` sit INSIDE
     `<main class="d-404">`, so the page gutter is applied twice and their
     content starts at x=280 while the page rail is x=220.

  2. archive-product.html's results grid pays the page gutter INSIDE A COLUMN.
     `.d-grid` is in the right-hand column of `.d-archive__body`; the column
     begins at 506 and the grid's content begins at 566.

  3. *** AND THE WORST ONE IS NOT IN ANY STYLESHEET. ***
     search.html, product-search-results.html and home.html declare
     `"layout":{"type":"constrained"}` with no contentSize, so WordPress emits a
     rule capping their children at theme.json's contentSize - 660px, a PROSE
     measure. The search results grid measures 374px wide instead of 714px,
     beside a 250px sidebar, inside a 1120px main.

     archive-product.html escapes it only because someone hit this before and
     hard-coded `"contentSize":"90rem"` on that one block - 1440px, wider than
     --page-max, so it is both a magic number and the wrong one. It does not
     bite purely because it is too big to.

So: the frame element composes `.d-shell`, everything nested stops claiming the
frame, and the constrained layouts stop competing with it. `"type":"default"`
rather than a corrected contentSize, because the frame is .d-shell's job and a
second place to write the number is how this started.

*** EVERY CLASS IS WRITTEN TWICE. *** Once in the HTML and once in the block
comment's JSON. If they disagree WordPress marks the block invalid and it stops
being editable, so each edit below touches both, and scripts/shellgate.py fails
if any pair ever drifts.
"""
import io, os, sys

T = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'theme', 'darling')

# (file, old, new, expected_count)
EDITS = [
    # --- 404: main takes the frame; the heading and grid inside it stop taking it
    ('templates/404.html',
     u'<main class="d-404">',
     u'<main class="d-404 d-shell">', 1),

    # --- the shop archive: frame on main, and the 90rem override goes with it
    ('templates/archive-product.html',
     u'<!-- wp:group {"tagName":"main","className":"d-archive","layout":{"type":"constrained","contentSize":"90rem"}} -->',
     u'<!-- wp:group {"tagName":"main","className":"d-archive d-shell","layout":{"type":"default"}} -->', 1),
    ('templates/archive-product.html',
     u'<main class="wp-block-group d-archive">',
     u'<main class="wp-block-group d-archive d-shell">', 1),

    # --- the front page: hero, three section titles, two grids
    ('templates/front-page.html',
     u'<div class="d-hero d-hero--red">',
     u'<div class="d-hero d-hero--red d-shell">', 1),
    ('templates/front-page.html',
     u'<h2 class="d-section-title">',
     u'<h2 class="d-section-title d-shell">', 1),
    ('templates/front-page.html',
     u'<!-- wp:heading {"level":2,"className":"d-section-title"} -->',
     u'<!-- wp:heading {"level":2,"className":"d-section-title d-shell"} -->', 2),
    ('templates/front-page.html',
     u'<h2 class="wp-block-heading d-section-title">',
     u'<h2 class="wp-block-heading d-section-title d-shell">', 2),
    ('templates/front-page.html',
     u'"className":"d-grid"} -->',
     u'"className":"d-grid d-shell"} -->', 2),
    ('templates/front-page.html',
     u'<div class="wp-block-query d-grid">',
     u'<div class="wp-block-query d-grid d-shell">', 2),

    # --- the three archives that inherit the 660px prose measure
    ('templates/home.html',
     u'<!-- wp:group {"tagName":"main","className":"d-archive","layout":{"type":"constrained"}} -->',
     u'<!-- wp:group {"tagName":"main","className":"d-archive d-shell","layout":{"type":"default"}} -->', 1),
    ('templates/home.html',
     u'<main class="wp-block-group d-archive">',
     u'<main class="wp-block-group d-archive d-shell">', 1),
    ('templates/product-search-results.html',
     u'<!-- wp:group {"tagName":"main","className":"d-archive","layout":{"type":"constrained"}} -->',
     u'<!-- wp:group {"tagName":"main","className":"d-archive d-shell","layout":{"type":"default"}} -->', 1),
    ('templates/product-search-results.html',
     u'<main class="wp-block-group d-archive">',
     u'<main class="wp-block-group d-archive d-shell">', 1),
    ('templates/search.html',
     u'<!-- wp:group {"tagName":"main","className":"d-archive","layout":{"type":"constrained"}} -->',
     u'<!-- wp:group {"tagName":"main","className":"d-archive d-shell","layout":{"type":"default"}} -->', 1),
    ('templates/search.html',
     u'<main class="wp-block-group d-archive">',
     u'<main class="wp-block-group d-archive d-shell">', 1),

    # --- the product page
    ('templates/single-product.html',
     u'<!-- wp:woocommerce/single-product {"className":"d-product"} -->',
     u'<!-- wp:woocommerce/single-product {"className":"d-product d-shell"} -->', 1),
    ('templates/single-product.html',
     u'<div class="wp-block-woocommerce-single-product d-product">',
     u'<div class="wp-block-woocommerce-single-product d-product d-shell">', 1),
]

OLD_ALIAS = u""".d-shell,
/* *** SIX PATTERNS THAT PREDATE .d-shell, TAKING THE FRAME BY NAME. ***
   The tidy end state is `class="d-archive d-shell"` in the markup. The markup
   is WordPress block templates, where every class is written TWICE - once in
   the HTML and once in the block comment's JSON beside it - and the two
   silently desyncing is how a block stops being editable. Twenty edits across
   eight templates for a rename is a bad trade today.

   So they are named here instead. It is still ONE declaration of the frame,
   which was the entire point; it is just reached by two routes. When the
   templates are next regenerated, delete these six lines. */
.d-grid,
.d-archive,
.d-product,
.d-hero,
.d-404,
.d-section-title{"""

NEW_ALIAS = u""".d-shell{
/* *** THE SIX ALIASES ARE GONE, AND SO ARE THREE BUGS THEY WERE HIDING. ***
   .d-grid, .d-archive, .d-product, .d-hero, .d-404 and .d-section-title used to
   be listed here so the templates would not have to say `d-shell`. Measured at
   1440 with scripts/b1shell.js, that cost:

     - 404.html applied the gutter TWICE, because .d-section-title and .d-grid
       are nested inside .d-404. Content began at 280; the page rail is 220.
     - archive-product.html's results grid paid the page gutter inside a COLUMN,
       beginning at 566 in a column that begins at 506.

   A frame taken by name cannot know whether it is on the page or inside
   something. .d-shell in the markup can, because a human put it there. */"""


def main():
    fail = []
    for rel, old, new, n in EDITS:
        p = os.path.join(T, rel.replace('/', os.sep))
        s = io.open(p, encoding='utf-8').read()
        got = s.count(old)
        if got != n:
            fail.append('%s: expected %d of %r, found %d' % (rel, n, old[:60], got))
            continue
        io.open(p, 'w', encoding='utf-8', newline='\n').write(s.replace(old, new))
        print('  %-42s x%d  %s' % (rel, n, old[:52]))

    lay = os.path.join(T, 'src', 'patterns', 'layout.css')
    s = io.open(lay, encoding='utf-8').read()
    if OLD_ALIAS not in s:
        fail.append('layout.css: the six-alias block is not where it was')
    else:
        io.open(lay, 'w', encoding='utf-8', newline='\n').write(s.replace(OLD_ALIAS, NEW_ALIAS))
        print('  src/patterns/layout.css                     six aliases deleted')

    if fail:
        print('\n*** NOT APPLIED CLEANLY ***')
        for f in fail:
            print('  ' + f)
        sys.exit(1)
    print('\nall edits applied')

main()
