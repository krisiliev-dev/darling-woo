#!/usr/bin/env python3
"""
HONEY -> BRASS -> BRONZE, and Kris's own downloaded texture maps.

Two things at once:
  A. The gold ramp gains a THIRD number. Honey -> brass -> bronze is mostly a
     LIGHTNESS move, not a hue move, so `--gold-lift` shifts every stop of the
     ramp together. hue/sat/lift describes the whole family.
  B. The five PBR sets from his „Metal textures" folder, baked through the same
     micro-facet pipeline: height (or normal) -> surface normals -> GGX specular
     + wrapped diffuse + AO, using each set's OWN roughness map where it ships one.

Every source tile is made seamless by an offset-and-feather blend (roll by half,
blend the seam under a cosine mask) because none of them ship tileable.
"""
import numpy as np, colorsys, os, json
from PIL import Image

T = 512  # working tile

# ── seamless-ing ──────────────────────────────────────────────────────────────
def to_tile(a, size=T, box=None):
    """Crop (fractional box, to dodge calibration marks), resize, then wrap by
       offset+feather. `box` = (y0, x0, side) as fractions of the source."""
    h, w = a.shape[:2]
    if box:
        y0, x0, side = int(box[0] * h), int(box[1] * w), int(box[2] * min(h, w))
        a = a[y0:y0 + side, x0:x0 + side]
    else:
        s = min(h, w)
        a = a[(h - s) // 2:(h - s) // 2 + s, (w - s) // 2:(w - s) // 2 + s]
    im = Image.fromarray(np.uint8(np.clip(a, 0, 255)))
    im = im.resize((size, size), Image.LANCZOS)
    a = np.asarray(im, dtype=float)

    # MIRROR TILE. None of these downloaded maps ship tileable, and healing the
    # seam by cloning left a visible ridge on the high-relief ones (a bright grid
    # line, which is worse than symmetry). Mirroring is seamless BY CONSTRUCTION:
    # the tile is a quarter, flipped into the other three quadrants. The cost is a
    # symmetry that a sharp eye can find on a wide surface — stated, not hidden.
    q = np.asarray(Image.fromarray(np.uint8(np.clip(a, 0, 255)))
                   .resize((size // 2, size // 2), Image.LANCZOS), dtype=float)
    top = np.concatenate([q, q[:, ::-1]], axis=1)
    return np.concatenate([top, top[::-1, :]], axis=0)

def norm01(a):
    return (a - a.min()) / (np.ptp(a) + 1e-9)

# ── the bake (same model as raw.py) ───────────────────────────────────────────
L = np.array([-0.34, -0.58, 0.74]); L /= np.linalg.norm(L)
Hv = L + np.array([0.0, 0.0, 1.0]); Hv /= np.linalg.norm(Hv)

def shade_from_normals(nx, ny, nz, rough, ao):
    ndl = nx * L[0] + ny * L[1] + nz * L[2]
    ndh = np.clip(nx * Hv[0] + ny * Hv[1] + nz * Hv[2], 1e-4, 1)
    w = 0.55
    diff = np.clip((ndl + w) / (1 + w), 0, 1)
    a = np.clip(rough, 0.05, 0.95) ** 2; a2 = a * a
    D = a2 / (np.pi * ((ndh ** 2) * (a2 - 1) + 1) ** 2)
    spec = D / (1.0 + D)
    return np.clip((0.20 + 0.62 * diff + 0.46 * spec) * ao, 0, 1.6)

def normals_from_height(h, amp):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    s = amp * h.shape[0]
    nx, ny, nz = -dx * s, -dy * s, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return nx / l, ny / l, nz / l

BOX = None

def load(name, mode="L"):
    p = f"maps/{name}.png"
    if not os.path.exists(p):
        return None
    return np.asarray(Image.open(p).convert(mode), dtype=float)

# ── the ramp, now THREE numbers ───────────────────────────────────────────────
RAMP = [(9, 8, 93), (6, 6, 82), (2, 0, 68), (0, 0, 52),
        (-9, 6, 38), (-17, 10, 27), (-24, 12, 19)]

FAMILY = [
    ("Мед — honey (контролата)",      40, 72,   0),
    ("Тъмен мед — deep honey",        39, 70,  -6),
    ("Кехлибар — amber",              36, 76,  -4),
    ("Месинг — brass",                43, 50,  -3),
    ("Матов месинг — dull brass",     41, 40,  -8),
    ("Антично месинг — antique",      34, 46, -11),
    ("Бронз — bronze",                28, 50, -14),
    ("Тъмно кафяво — dark bronze",    24, 42, -18),
]

def ramp_rgb(hue, sat, lift):
    out = []
    for dh, ds, li in RAMP:
        l = max(4, min(97, li + lift)) / 100.0
        r, g, b = colorsys.hls_to_rgb(((hue + dh) % 360) / 360.0, l,
                                      min(max((sat + ds) / 100.0, 0), 1))
        out.append((r, g, b))
    return np.array(out[::-1])

def colourise(lum, hue, sat, lift):
    stops = ramp_rgb(hue, sat, lift)
    t = np.clip((lum - 0.18) / 1.05, 0, 1) * (len(stops) - 1)
    i0 = np.floor(t).astype(int); i1 = np.minimum(i0 + 1, len(stops) - 1)
    f = (t - i0)[..., None]
    return np.clip(stops[i0] * (1 - f) + stops[i1] * f, 0, 1)

def grey_map(lum, gain=0.92):
    return np.clip(0.5 + gain * (lum - lum.mean()), 0, 1)

def save(a01, path, q=80):
    Image.fromarray(np.uint8(np.clip(a01, 0, 1) * 255)).save(path, quality=q, method=6)
    return os.path.getsize(path)

# ── Kris's five sets ──────────────────────────────────────────────────────────
SETS = [
    dict(key="brass",  title="dull-brass (Unity) — албедо + normal",
         note="Много равен материал: normal std 0.9, релефът е почти нула. Характерът му е ЦВЕТЪТ (170,143,92), не геометрията.",
         normal="brass_normal", colour="brass_color", ao="brass_ao", rough=None, amp=None,
         box=(0.05, 0.05, 0.55)),
    dict(key="et102",  title="everytexture 00102 — грапава плоча",
         note="Единственият с истински дълбок релеф (height std 30). Сив по цвят, затова се тонира чисто в което и да е злато.",
         height="et102_height", colour="et102_color", rough=None, ao=None, amp=0.055,
         box=(0.52, 0.06, 0.42)),
    dict(key="m65",    title="metal_0065 — четкан/надраскан",
         note="Златист по цвят (214,169,87) и има СОБСТВЕНА карта на грапавостта. Height е почти плосък (std 0.6) — характерът идва от roughness, не от геометрия.",
         height="m65_height", colour="m65_color", rough="m65_rough", ao="m65_ao", amp=0.10,
         box=(0.03, 0.03, 0.40)),
    dict(key="m73",    title="metal_0073 — тъмен кафеникав метал",
         note="Тъмно кафяво (98,73,59) — точно посоката, за която питаш. Собствена roughness + AO.",
         height="m73_height", colour="m73_color", rough="m73_rough", ao="m73_ao", amp=0.09,
         box=(0.04, 0.04, 0.40)),
    dict(key="rust",   title="rusty_metal_04 — ръждив",
         note="Силен релеф и много характер, но ръждата чете като износване, не като лукс. Включен за сравнение.",
         height="rust_height", colour="rust_color", rough=None, ao=None, amp=0.05,
         box=(0.10, 0.10, 0.45)),
]

meta = []
for s in SETS:
    ao = load(s.get("ao")) if s.get("ao") else None
    ao = norm01(to_tile(ao, box=s.get("box"))) * 0.35 + 0.65 if ao is not None else np.ones((T, T))
    rough = load(s.get("rough")) if s.get("rough") else None
    rough = 0.18 + 0.55 * norm01(to_tile(rough, box=s.get("box"))) if rough is not None else np.full((T, T), 0.38)

    if s.get("normal"):
        n = to_tile(load(s["normal"], "RGB"), box=s.get("box"))
        nx = n[..., 0] / 127.5 - 1; ny = -(n[..., 1] / 127.5 - 1); nz = n[..., 2] / 127.5 - 1
        l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2) + 1e-9
        nx, ny, nz = nx / l, ny / l, nz / l
        nx, ny = nx * 3.0, ny * 3.0                       # this map is very flat; exaggerate
        l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2); nx, ny, nz = nx / l, ny / l, nz / l
    else:
        h = norm01(to_tile(load(s["height"]), box=s.get("box")))
        nx, ny, nz = normals_from_height(h, s["amp"])

    lum = shade_from_normals(nx, ny, nz, rough, ao)
    g = grey_map(lum)
    gsz = save(g, f"tex-{s['key']}-map.webp")

    col = to_tile(load(s["colour"], "RGB"), box=s.get("box")) / 255.0        # the source's own colour, as-is
    csz = save(col, f"tex-{s['key']}-orig.webp")

    honey = colourise(lum, 40, 72, 0)                      # his pick, on this relief
    hsz = save(honey, f"tex-{s['key']}-honey.webp")

    meta.append(dict(key=s["key"], title=s["title"], note=s["note"],
                     map=gsz, orig=csz, honey=hsz))
    print(f"{s['key']:7s} map {gsz//1024:3d}KB  orig {csz//1024:3d}KB  honey {hsz//1024:3d}KB")

json.dump(meta, open("texmeta.json", "w"), ensure_ascii=False, indent=1)

# ── the family, rendered on the best-behaved relief (et102) for a fair compare ─
h = norm01(to_tile(load("et102_height"), box=(0.52, 0.06, 0.42)))
nx, ny, nz = normals_from_height(h, 0.05)
famlum = shade_from_normals(nx, ny, nz, np.full((T, T), 0.42), np.ones((T, T)))
fam = []
for name, hue, sat, lift in FAMILY:
    a = colourise(famlum, hue, sat, lift)
    key = f"fam-{hue}-{sat}-{lift}".replace("-", "m", 1)
    fn = f"fam_{hue}_{sat}_{lift}.webp".replace("-", "n")
    sz = save(a, fn)
    fam.append(dict(name=name, hue=hue, sat=sat, lift=lift, file=fn, size=sz))
    print(f"{name:34s} {hue:3d}/{sat:3d}/{lift:4d}  {sz//1024}KB")
json.dump(fam, open("fammeta.json", "w"), ensure_ascii=False, indent=1)
print("done")
