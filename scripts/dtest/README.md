# dtest — the design system's test suite

Four commands. Each exits non-zero on failure, like every other gate in
`scripts/`, so they can be chained in a build.

    node scripts/dtest/mirror.js     build an offline copy of the live site
    node scripts/dtest/capture.js    render it: pages x viewports x engines -> capture.json
    node scripts/dtest/assert.js     the assertions, all of them, against that capture
    node scripts/dtest/shots.js      screenshot baselines; --update to accept a change

## Why a mirror, and not the live site

Three reasons, in order of importance.

1. **Determinism.** A visual test against a live WooCommerce store fails when a
   price changes, when a notice appears, when the cart has something in it. The
   mirror is a fixed corpus; a diff means the CSS moved, which is the only thing
   this suite is for.
2. **Three engines.** Firefox and WebKit have to be able to load the pages.
   Wherever this runs, the mirror works; the live site may not be reachable.
3. **Speed.** 81 renders off the filesystem, with no network, is minutes rather
   than tens of minutes.

Rebuild the mirror (`mirror.js`) whenever the MARKUP changes — a template edit,
a plugin update. Not needed for a CSS-only change: `darling.build.css` is
mirrored as a file and re-fetched on every mirror run.

*** THE MIRROR IS NOT THE SITE. *** Nothing that needs the network at runtime
works in it: cart fragments, the newsletter relay, Stripe. Console 404s are
mirror noise. Anything about live behaviour still belongs in `liveshot.js`.

## What each layer catches, and what it cannot

| layer | catches | blind to |
|---|---|---|
| static (`assert.js --static`) | dangling `var()`, layer order, hardcoded colour, budget | anything about rendering |
| computed (`assert.js`) | overflow, contrast, target size, engine parity, motion | anything that looks wrong but measures fine |
| pixels (`shots.js`) | everything the other two miss | tells you *that* it changed, never *why* |

Run all three. The pixel layer is last on purpose: it is the one that cries
wolf, and a suite people stop believing is worse than no suite.

## Baselines: about 8 MB, losslessly optimised, and committed

49 full-page PNGs — 9 pages x 2 viewports x 3 engines, minus the renders Firefox
cannot load offline. They are the specification, so they belong in git.

`optipng -o2` is run over them, which is **lossless**: the pixels are identical,
only the encoding is smaller. Do not be tempted by `pngquant` or a palette
quantise, however good the saving looks — I tried it and got 7.8 MB down to
2.4 MB, and then the baselines no longer matched a fresh render, which is the
only thing a baseline is for.

Full-page rather than viewport-height, deliberately: the footer, the newsletter
band and the bottom of a long grid are exactly where a cascade change shows up
last and gets noticed latest.
