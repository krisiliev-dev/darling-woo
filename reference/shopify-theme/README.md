# Captured Shopify theme source

Captured 2026-07-31 from the live Shopify storefront so the WooCommerce theme can
be a faithful replica rather than an approximation from memory.

- `darling.css` — the custom theme stylesheet. Holds the `--d-*` design tokens and
  every bespoke component and animation.
- `home.html` — rendered homepage, for the MARKUP the CSS expects. The CSS alone is
  not enough: several effects depend on specific element structure.

## The bespoke animations, and what they attach to

| keyframe | attaches to | effect |
|---|---|---|
| `darling-amb` | `.darling-ambient i` | ambient background stars, fade + rotate |
| `dhv-tw` | `.dhv-s`, `.dff-s`, `.mega-menu__link:hover` | star twinkle (scale + opacity) |
| `darling-float` | `.dhv-bow`, `.dff-bow` | bow idle float, ±7px |
| `darling-drift` | `.darling-season` | slow gradient drift |
| `darling-shimmer` | `.darling-shipbar .dsb-track i:after` | shipping-bar shimmer sweep |

Star glyphs are literal `✦` and `✧` characters in `<i>` elements, not images —
which is why they inherit colour and scale cleanly.

**Do not "tidy" this file.** It is a captured artefact; its value is being exactly
what the live site serves. Port FROM it into `theme/darling/`, leave it unchanged.
