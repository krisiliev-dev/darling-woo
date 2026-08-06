# Дарлинг — brand design defaults

**Locked by Kris, 2026-08-06.** This is the canonical description of how the brand looks.
Anything built for darlinghome.bg from now on starts here rather than from a fresh opinion.

The implementation lives in `claude/SLICE6_FINAL.css`. This document is the *why*; that file
is the *what*. If the two ever disagree, the CSS is wrong — the reasoning here was settled
with the owner and the CSS is a transcription of it.

---

## 1. Colour

| Role | Value | Notes |
|---|---|---|
| Page ground | `#E6E6EC` | grey, +2 step. Locked early and never revisited. |
| Dividers, quiet fills | `#D4D4DD` | |
| Borders that must be seen | `#C2C2CD` | |
| Large red fields | `#9E1B32` claret | hero band, newsletter band |
| Claret shadow side | `#7D1526` | |
| Prices, accents, default button | `#D42A3C` cherry | |
| Cherry pressed / hovered | `#B01F30` | |
| Headings and body ink | `#3A1D20` cocoa | |
| On-dark text, halos | `#FFF6E9` cream | |
| Warm tint on dark surfaces | `#FFE9C9` vanilla | |

### The metal is three numbers, not seven hex codes

```
--gold-hue: 36;   --gold-sat: 88;   --gold-lift: -2;     /* КЕХЛИБАР */
```

Seven ramp stops derive from those three. Two properties of the ramp matter and must not be
undone:

**The hue ROTATES across the ramp** — +9° at the highlight to −17° at the deepest. Real
gold's shadows go amber and copper; they do not merely go dark. Three or four degrees of
rotation is invisible, which is what the owner looked at and could not see. Do not flatten
this back into a lightness ramp.

**Lift is the third number and it is what "browner" means.** Honey → brass → bronze is
mostly a LIGHTNESS move, not a hue move. Chasing it with hue alone produces a muddy yellow.

## 2. The button rule

> **Cherry on grey. Metal on claret.**

It is a rule about contrast, not a colour preference: a button contrasts with what it sits
ON. Cherry holds 4.03:1 against the grey page; the metal holds against claret, where
cherry-on-claret would be a low-contrast pairing.

A consequence worth knowing before anyone proposes a darker metal: **the darker the gold,
the worse it sits on claret and the better on grey.** Past brass the metal wants the grey
page, which is cherry's seat — so the rule itself caps how brown the metal may go.

## 3. The surface

**Body + one specular + a real rim.** Not banding.

Banding across a form is the reflection of a WIDE environment — a rolled sheet, a mirror, a
car panel — which is exactly why it reads as "cut out of something larger". A small solid
object is lit by a comparatively small source, so it shows a body tone, one specular
highlight, and a darker rim where the surface curves away.

**The rim is `inset` box-shadows, never a gradient.** An inset shadow follows
`border-radius` exactly, so one declaration works on a pill, a circle, a rounded square and
a badge alike; a radial gradient cannot. The rim is also the only element of the treatment
that says *this object ends here* — without it any surface reads as a window onto a larger
material, however handsome.

## 4. The grain

**Plywood, as a GREY map, masked to the rim and the padding.**

Two rules, both learned the hard way:

- **Textures enter as greyscale relief maps and take their colour from the ramp.** The wood
  is not brown; it lends its pattern and nothing else. One asset then serves any future
  retint, and no photograph locks a hue into a JPEG.
- **The grain is an accent, never the main event.** It lives on an `::after` with a
  percentage mask so it is clean where the label sits and visible in the padding and along
  the rim. Percentage masks follow the element at any width, with no fixed geometry and no
  JavaScript.

## 5. Light

Glow + lit rim + static glints, at full strength.

The glints are **ornament**: measured, they change contrast by 0.00–0.02, so they can be
added or dropped freely. Say so wherever they appear, so nobody later mistakes them for
structure.

## 6. Motion

Two rhythms, deliberately incommensurable so nothing pulses in unison:

- the bloom and glints **breathe** — 11s, `opacity`, composite-only
- the highlight **drifts** — 26s, `background-position`, *the one repaint*

**Nothing rotates, and nothing sweeps.**

- A sweeping sheen was built, shown and rejected by the owner as "gambling website". It
  stays rejected. Light may breathe, drift and settle; it may not travel across a surface.
- Rotation was tried and was wrong. Turning a glint layer reads as light on a roughly
  **square** badge, but on a wide pill it orbits and on a 76×3 divider it is simply a
  spinning line. **Rotation is only ever correct for something roughly square, and nothing
  here that wears the metal is square.**
- **A long thin element carries no glints at all.** On a 3px rule a sparkle is a blob. That
  is a rule about geometry, not taste: an ornament sized for a badge is wrong on a hairline.

Two guards, both pure CSS, no JavaScript to forget: `prefers-reduced-motion` stops
everything, and so does being on cart, checkout or order-received. The money path is still.

## 7. Type

Inter for body and UI, Playfair Display for display and headings, both self-hosted with
Cyrillic subsets. Prices are Inter 700 with `tabular-nums` — a price is a number, not an
ornament.

**Never negative letter-spacing on Cyrillic below 40px.** The parent theme sets −0.1px
globally; theme.json overrides it to 0.

Metal as TEXT uses its own fill and **must stay in the dark half of the ramp**, because the
page behind it is light. A vanilla stop lands mid-word and the letters dissolve. The fix
took the wordmark from 1.42–1.74:1 to 3.79–5.11:1 against the grey page.

A pale material cannot fill text on a light page at all — for those the wordmark is solid
cocoa and the material is kept for the objects.

## 8. Where the metal actually lands

Verified in the live DOM, not assumed. Every class already exists, so the brand needs **no
markup change**:

```
a.d-btn.d-btn--primary            inside .darling-hero--red
button.d-btn.d-btn--primary       inside .darling-news-band
a.darling-header__logo.darling-wordmark
span.dff-rule   ·   div.dff-mark
```

Two things do **not** exist and must not be styled blind: the trust "ticks" are the text
glyph ✦ with no element of their own (they can take the flat gold colour, not the metal
surface), and the product card has **no badge element at all**.

## 9. What was tried and rejected — so it is not re-proposed

| Tried | Why it lost |
|---|---|
| Thirteen-stop reflection banding | reads as corduroy; also flattened the differences between golds |
| Animated sheen sweeping the metal | owner: "reminds me of gambling websites" |
| Rotating glints | correct only on a square; a spinning line on the divider |
| Photographic texture maps as colour | locks the hue; and none of them tile |
| Frosted glass, rubber, wood, terracotta on claret | fail 3:1 — they cannot separate from the field |
| Amber glass, transparent | a transmissive material takes the colour behind it; over claret it goes red |
| WebGL refraction | genuinely convincing, but it needs a 100–500 ms DOM capture, and the emission required to stop it turning red is the tell that it is no longer glass |
| CSS "glass" made of gradients | gradients paint a picture of light; they never displace anything |

## 10. Method rules that produced all of this

- **Test the RESULT, never the code.** Every decision above was measured on a render.
- **Measure text contrast with the glyphs hidden.** Screenshot a second time with
  `color:transparent`; otherwise you measure the ink against itself and every element scores
  1.00:1. This mistake was made twice.
- **A number that disagrees with an earlier measurement of the same thing is a bug until
  proven otherwise.**
- **When a treatment is parameterised by shape, test the EXTREMES of the shape.** The
  divider, not the button, is what exposed the rotation flaw.
- **Probe the live DOM before writing a selector.** Three separate slices were saved by
  this, and the classes turned out to exist already.
- **Prefer the mean only when the background is flat.** Contrast means at the WORST point;
  a mean lies over a gradient, and it inverted the ink recommendation for bronze.

---

## Status of the implementation

`claude/SLICE6_FINAL.css` — 370 lines, braces balanced, **written and inert**. Nothing
enqueues it and `claude/` is not deploy-synced, so it cannot reach the site by accident.

To ship, in this order:

1. `cp claude/assets/strong-ply.webp theme/darling/assets/ply-grain.webp`
2. **record a fresh diff11 checkout-geometry baseline BEFORE the paste** — this slice
   unifies the button primitive including WooCommerce's checkout buttons, which slice 11
   deliberately left alone so the checkout absorbs one change instead of two. Highest
   checkout risk of the whole design pass.
3. paste §1–§8 at the end of `theme/darling/style.css`
4. gate: design audit 0 defects across 36 combos · product-card PASS · checkout-polish PASS ·
   diff11 UNCHANGED at 390 and 1440 · reduced-motion renders `none` · cart and checkout
   render `none` under no preference · contrast sweep. Check the divider and the wordmark at
   the extremes of their aspect ratios, not only the button.
5. Revert rather than argue if the checkout geometry moves.
