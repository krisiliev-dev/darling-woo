# Image provenance register — 19 photographs shipping live

**2026-08-07, sprint 66, woo agent.** Written because O-4 asked me to source free-licence
stock and the first honest question was *what is already on the site* — and the answer
turned out to matter more than the sourcing.

## The short version

darlinghome.bg is serving **19 photographs, ~2.9 MB, all HTTP 200 right now**, and
**not one of them has a licence anyone can cite**. Eighteen carry no provenance metadata
at all. The nineteenth carries an explicit rights claim by a named third party.

I have not replaced or removed anything. Both actions are owner decisions, and one of
them would blank the `/shop/` banner.

## The one image with metadata

`theme/darling/assets/img/banners/all.jpg` — 1400×935, 134 KB — renders as the banner on
**`/shop/`** (`body.post-type-archive-product .darling-cat-banner .dcb-img`, style.css:677).

It carries an XMP packet:

```xml
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Go XMP SDK 1.0">
  <rdf:RDF …><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" rdf:about="">
    <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">vladimirtsarkov.com</rdf:li></rdf:Alt></dc:rights>
  </rdf:Description></rdf:RDF>
</x:xmpmeta>
```

…and the same string in the EXIF Copyright tag (0x8298). `vladimirtsarkov.com` is a live
portfolio site belonging to a working commercial photographer (wedding photography, Minsk).

**This also corrects our own log.** The sprint 11 entry records this file as
*"/collections/all pexels pottery"* — i.e. someone believed it was a free Pexels image.
The file itself says otherwise. Whoever wrote that line was reading the subject matter,
not the metadata. It is possible the image reached a stock library legitimately and the
XMP simply travelled with it, but that is a hypothesis, and a rights claim by a named
individual is not the thing to be relaxed about.

## The other eighteen

Raw-byte scan for XMP packets, IPTC markers, EXIF Copyright/Artist/Description, and the
strings `unsplash|pexels|shutterstock|istock|getty|adobe|freepik`: **no markers of any
kind**. Either stripped on export or never present. They cannot be traced from the files.

What we do know is where they came from as a *route*, not as a *licence*: they were
harvested from the client's own live Shopify storefront during slices 6 and 9
(commits `94fcb26`, `f4a396a`, both 2026-08-05). The Shopify site being the client's own
does not establish that the client held rights to publish them — that is exactly the
assumption worth not making twice.

## Register

| File | Renders on | Pixels | KB | Provenance |
|---|---|---|---|---|
| `banners/all.jpg` | `/shop/` | 1400×935 | 134 | ⚠ `dc:rights` = vladimirtsarkov.com |
| `banners/za-kuhnyata.jpg` | `/product-category/za-kuhnyata/` | 1400×1120 | 364 | none |
| `banners/za-banyata.jpg` | `…/za-banyata/` | 1400×921 | 238 | none |
| `banners/dekoraciya-za-doma.jpg` | `…/dekoraciya-za-doma/` | 1400×943 | 82 | none |
| `banners/za-gradinata.jpg` | `…/za-gradinata/` | 1400×933 | 293 | none |
| `banners/pochistvane.jpg` | `…/pochistvane/` | 1400×933 | 147 | none |
| `banners/parti.jpg` | `…/parti/` | 1400×934 | 164 | none |
| `banners/za-decata.jpg` | `…/za-decata/` | 1400×933 | 413 | none |
| `banners/podaraci.jpg` | `…/podaraci/` | 1400×968 | 157 | none |
| `banners/izborat-na-lady-d.png` | `…/izborat-na-lady-d/` | 265×265 | 83 | none |
| `banners/promocii.webp` | `…/promocii/` | 650×650 | 314 | none |
| `categories/za-kuhnyata.jpg` | home category carousel | 800×640 | 128 | none |
| `categories/za-banyata.jpg` | home category carousel | 800×526 | 107 | none |
| `categories/dekoraciya-za-doma.jpg` | home category carousel | 800×539 | 35 | none |
| `categories/za-gradinata.jpg` | home category carousel | 800×533 | 123 | none |
| `categories/pochistvane.jpg` | home category carousel | 800×533 | 68 | none |
| `categories/parti.jpg` | home category carousel | 800×534 | 74 | none |
| `categories/za-decata.jpg` | home category carousel | 800×533 | 189 | none |
| `categories/podaraci.jpg` | home category carousel | 800×553 | 68 | none |

All 19 verified live: `GET https://darlinghome.bg/wp-content/themes/darling/assets/img/…`
→ 200 on every one, byte counts matching the repo.

## Against the O-4 spec

O-4 asks for **≥2000px wide, subject centred, safe area on the right third**.

- Banners are **1400px** — 30% under spec. Two are not landscape at all
  (`izborat-na-lady-d.png` 265×265, `promocii.webp` 650×650), so those two categories have
  never had a real banner image, only a small square stretched by `background-size:cover`.
- Category tiles are **800px** — 60% under spec, though they render at ~322px so the spec
  number was clearly written for the banners.
- **There is no hero photograph at all.** `.darling-hero--red` is a cherry band with a
  CSS/SVG visual (`dhv-red`) in the right-hand column
  (`grid-template-columns:1.15fr .85fr`). The "safe area on the right third" in the spec
  describes that column — so the hero image is a genuinely new asset, not a replacement.

## Why I stopped here

Three reasons, and none of them is that the work is hard:

1. **I cannot acquire image binaries.** WebFetch reads pages, not files, and I am not
   going to route around that with a shell downloader. Sourcing is therefore not something
   I can complete regardless of how good the shortlist is.
2. **Replacing `all.jpg` is now a legal decision, not a design one.** If Дарлинг
   commissioned that photograph, replacing it would be throwing away paid work. If they
   did not, it should come down today. Only Kris knows which.
3. **Choosing brand photography blind is the O-5 mistake in a new costume.** A confident,
   wrong sentence is worse than a gap; so is a confident, wrong photograph.

## What Kris needs to decide

1. **`banners/all.jpg` — is Vladimir Tsarkov a photographer Дарлинг hired?** If yes, say
   so and I will record the licence and stop worrying. If no, or if nobody knows, it
   should come off `/shop/` — and the honest replacement in the meantime is the existing
   cherry band with no photograph, which costs nothing and claims nothing.
2. **The other eighteen — is there a paper trail anywhere?** An invoice, a stock-library
   account, a designer who supplied them. If there is, this register becomes a five-minute
   fill-in. If there is not, all eighteen are replaceable stock and O-4 becomes a
   straightforward sourcing job once someone can actually download files.
3. **Who downloads?** If Kris (or the panel agent, which has no such restriction) can pull
   the files, I can specify exactly what to fetch — subject, crop, minimum pixels, and the
   licence text to record — and gate the result on the live site as usual.

## Pexels licence text, for the record

Recorded now so it does not have to be looked up again
([pexels.com/license](https://www.pexels.com/license/), read 2026-08-07):

> All photos and videos on Pexels are free to use. Attribution is not required. Giving
> credit to the photographer or Pexels is not necessary but always appreciated.

Not allowed: identifiable people shown in a bad or offensive light; selling unaltered
copies as prints or physical products; implying endorsement by people or brands;
redistributing or selling on other stock platforms; use in trademarks or business names.

**Attribution is not required — but recording the source URL and photographer still is,
for us.** The point of the record is not the licence's demand; it is being able to answer
"where did this come from" without re-running this investigation.
