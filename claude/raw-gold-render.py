#!/usr/bin/env python3
"""
RAW GOLD — six unrefined surfaces, rendered rather than drawn.

The research changed the brief. Native gold does NOT read like the polished
metal we have been building:
  • its lustre is described as "buttery" or "greasy" — soft, NON-SPARKLING
    reflection, i.e. diffuse-dominant, high roughness
  • nuggets are irregular and water-worn; in host rock it grows dendritic /
    wire-like; in quartz it is mottled with pale non-metal
  • colour drifts with impurity: silver -> paler, whitish yellow;
    copper -> redder
So the pipeline here is a proper micro-facet bake (height field -> normals ->
GGX specular + wrapped diffuse + AO) with a PER-PIXEL ROUGHNESS map, which is
the thing that separates raw from refined. Tiles are seamless by construction
(all noise is generated in the Fourier domain, so it wraps exactly).

Outputs, per variant:
  raw-<name>-map.webp    greyscale shading map  -> tints to ANY gold (overlay)
  raw-<name>-<n>.webp    colour tile per gold   -> hue rotation baked in
"""
import numpy as np
from PIL import Image
import colorsys, os, base64, json

N = 256
rng = np.random.default_rng(20260806)

# ── seamless noise ────────────────────────────────────────────────────────────
def fftnoise(beta, seed):
    """Periodic noise with a 1/f^beta power spectrum. Seamless by construction."""
    r = np.random.default_rng(seed)
    w = r.normal(size=(N, N))
    F = np.fft.fft2(w)
    fy = np.fft.fftfreq(N)[:, None]
    fx = np.fft.fftfreq(N)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1e-6
    F *= f ** (-beta / 2.0)
    F[0, 0] = 0
    out = np.real(np.fft.ifft2(F))
    return (out - out.mean()) / (out.std() + 1e-9)

def norm01(a):
    return (a - a.min()) / (np.ptp(a) + 1e-9)

def wrapd(a, b, n=N):
    """Toroidal distance component."""
    d = np.abs(a - b)
    return np.minimum(d, n - d)

def cells(k, seed):
    """Periodic Voronoi: returns (id, d1, d2) for k seeds."""
    r = np.random.default_rng(seed)
    pts = r.random((k, 2)) * N
    yy, xx = np.mgrid[0:N, 0:N]
    D = np.empty((k, N, N))
    for i, (py, px) in enumerate(pts):
        D[i] = np.hypot(wrapd(yy, py), wrapd(xx, px))
    idx = D.argmin(0)
    Ds = np.sort(D, axis=0)
    return idx, Ds[0], Ds[1], pts

# ── the six raw surfaces ──────────────────────────────────────────────────────
def v_nugget():
    """Water-worn nugget: big smooth lumps, rounded, matte. The classic."""
    h = 0.75 * fftnoise(3.4, 11) + 0.25 * fftnoise(2.2, 12)
    h = norm01(h)
    h = h ** 1.15                       # flatten the peaks: tumbled, not sharp
    rough = 0.42 + 0.16 * norm01(fftnoise(2.6, 13))
    return h, rough, 0.030

def v_crystal():
    """Dendritic / crystalline growth: flat facets meeting at hard edges."""
    idx, d1, d2, pts = cells(26, 21)
    r = np.random.default_rng(22)
    tilt = r.normal(scale=0.9, size=(len(pts), 2))
    lift = r.normal(scale=0.5, size=len(pts))
    yy, xx = np.mgrid[0:N, 0:N]
    h = np.zeros((N, N))
    for i, (py, px) in enumerate(pts):
        m = idx == i
        dy = np.where(np.abs(yy - py) <= N / 2, yy - py, yy - py - np.sign(yy - py) * N)
        dx = np.where(np.abs(xx - px) <= N / 2, xx - px, xx - px - np.sign(xx - px) * N)
        h[m] = (tilt[i, 0] * dy[m] + tilt[i, 1] * dx[m]) / N + lift[i]
    h = norm01(h) + 0.10 * norm01(fftnoise(2.8, 23))
    h = norm01(h)
    rough = 0.22 + 0.30 * norm01(d1 / d1.max())      # edges duller than faces
    return h, rough, 0.055

def v_quartz():
    """Gold in quartz: metal mottled with pale, rough, non-metallic host rock."""
    h = norm01(0.6 * fftnoise(3.0, 31) + 0.4 * fftnoise(2.0, 32))
    veins = norm01(fftnoise(2.6, 33))
    mask = np.clip((veins - 0.54) * 5.0, 0, 1)       # where quartz sits
    h = h * (1 - 0.4 * mask)
    rough = 0.38 + 0.34 * mask
    return h, rough, 0.034, mask

def v_cast():
    """As-cast / sand-cast: fine even granular pitting. Foundry gold."""
    h = norm01(0.35 * fftnoise(2.0, 41) + 0.65 * fftnoise(1.1, 42))
    rough = 0.50 + 0.12 * norm01(fftnoise(1.4, 43))
    return h, rough, 0.022

def v_buttery():
    """The 'buttery / greasy lustre' the sources describe. Almost no relief,
       almost no sparkle — a soft broad sheen. The quietest of the six."""
    h = norm01(fftnoise(4.2, 51))
    rough = 0.55 + 0.08 * norm01(fftnoise(3.0, 52))
    return h, rough, 0.020

def v_tumbled():
    """Raw body, high points worn bright — how a real nugget in jewellery reads.
       Roughness is driven BY the height, which is the whole trick."""
    h = 0.7 * fftnoise(3.4, 61) + 0.3 * fftnoise(2.0, 62)
    h = norm01(h)
    rough = 0.52 - 0.34 * (h ** 2)                   # peaks polished, pits matte
    return h, np.clip(rough, 0.12, 0.62), 0.032

# ── the bake ──────────────────────────────────────────────────────────────────
L = np.array([-0.34, -0.58, 0.74]); L /= np.linalg.norm(L)
V = np.array([0.0, 0.0, 1.0])
Hv = L + V; Hv /= np.linalg.norm(Hv)

def shade(h, rough, amp):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    s = amp * N
    nx, ny, nz = -dx * s, -dy * s, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / l, ny / l, nz / l

    ndl = nx * L[0] + ny * L[1] + nz * L[2]
    ndh = np.clip(nx * Hv[0] + ny * Hv[1] + nz * Hv[2], 1e-4, 1)

    w = 0.55                                          # wrapped diffuse: metal
    diff = np.clip((ndl + w) / (1 + w), 0, 1)         # never fully black

    a = np.clip(rough, 0.04, 0.95) ** 2
    a2 = a * a
    D = a2 / (np.pi * ((ndh ** 2) * (a2 - 1) + 1) ** 2)
    spec = D / (1.0 + D)                              # soft-clip: no blown pixels

    ao = 1.0 - 0.30 * np.clip(1.0 - norm01(h), 0, 1) ** 1.5
    lum = (0.20 + 0.62 * diff + 0.46 * spec) * ao
    return np.clip(lum, 0, 1.6)

# ── the gold ramp, straight from the CSS in §2 ────────────────────────────────
RAMP = [(9, 8, .93), (6, 6, .82), (2, 0, .68), (0, 0, .52),
        (-9, 6, .38), (-17, 10, .27), (-24, 12, .19)]
GOLDS = {1: ("Мед / honey", 40, 72), 3: ("Шампанско / champagne", 43, 38),
         7: ("Зелено злато / green-gold", 54, 60)}

def ramp_rgb(hue, sat):
    out = []
    for dh, ds, li in RAMP:
        r, g, b = colorsys.hls_to_rgb(((hue + dh) % 360) / 360.0, li, min((sat + ds) / 100.0, 1))
        out.append((r, g, b))
    return np.array(out[::-1])                        # dark -> light

def colourise(lum, hue, sat, mask=None):
    stops = ramp_rgb(hue, sat)
    t = np.clip((lum - 0.18) / 1.05, 0, 1) * (len(stops) - 1)
    i0 = np.floor(t).astype(int); i1 = np.minimum(i0 + 1, len(stops) - 1)
    f = (t - i0)[..., None]
    rgb = stops[i0] * (1 - f) + stops[i1] * f
    if mask is not None:                              # quartz: pale, desaturated
        q = np.stack([0.86, 0.85, 0.83] * np.ones_like(rgb))
        m = mask[..., None] * 0.72
        rgb = rgb * (1 - m) + q * m * (0.55 + 0.5 * lum[..., None])
    return np.clip(rgb, 0, 1)

def save(arr01, path, q=88):
    Image.fromarray((np.clip(arr01, 0, 1) * 255).astype(np.uint8)).save(path, quality=q, method=6)
    return os.path.getsize(path)

VARIANTS = [
    ("nugget",  "1. Самородък — water-worn nugget",
     "Big rounded lumps, tumbled smooth. The shape a river gives gold.", v_nugget),
    ("crystal", "2. Кристално — dendritic growth",
     "Flat facets meeting at hard edges: gold grown in rock, never melted.", v_crystal),
    ("quartz",  "3. В кварц — gold in host quartz",
     "Metal mottled with pale, rough, non-metallic vein rock.", v_quartz),
    ("cast",    "4. Лято — as-cast / sand-cast",
     "Fine even granular pitting. Foundry surface, straight from the mould.", v_cast),
    ("buttery", "5. Маслен блясък — buttery lustre",
     "Almost no relief, almost no sparkle. The 'greasy' soft sheen sources describe.", v_buttery),
    ("tumbled", "6. Излъскани върхове — raw body, worn peaks",
     "Roughness driven BY height: pits stay matte, high points wear bright.", v_tumbled),
]

meta = []
for key, title, blurb, fn in VARIANTS:
    r = fn()
    mask = r[3] if len(r) > 3 else None
    h, rough, amp = r[0], r[1], r[2]
    lum = shade(h, rough, amp)
    # greyscale shading map, centred on mid-grey so `overlay` leaves flats alone
    g = 0.5 + 0.92 * (lum - lum.mean())
    gsz = save(g, f"raw-{key}-map.webp")
    tiles = {}
    for n, (nm, hue, sat) in GOLDS.items():
        rgb = colourise(lum, hue, sat, mask)
        tiles[n] = save(rgb, f"raw-{key}-{n}.webp")
    meta.append(dict(key=key, title=title, blurb=blurb, map=gsz, tiles=tiles,
                     rough=[float(np.min(rough)), float(np.max(rough))]))
    print(f"{key:8s} map {gsz:6d}B  colour {tiles}  rough {np.min(rough):.2f}-{np.max(rough):.2f}")

json.dump(meta, open("meta.json", "w"), ensure_ascii=False, indent=1)
print("done")
