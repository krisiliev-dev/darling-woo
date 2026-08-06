#!/usr/bin/env python3
"""Caustics — the thing that actually says „glass".

A caustic is what happens when a curved transparent surface FOCUSES light: the rays
bunch up along thin bright filaments. Two assets:

  caustic-web   a seamless tile of filaments — the surface of the glass
  caustic-burst a kaleidoscopic burst radiating from the centre, NOT tiled — this is
                „the light is inside the object and spreading outward"

Both are greyscale and get blended with `screen`, so they ADD light and never tint.
"""
import numpy as np, os
from PIL import Image

def fftnoise(n, beta, seed):
    r = np.random.default_rng(seed)
    F = np.fft.fft2(r.normal(size=(n, n)))
    fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx**2 + fy**2); f[0, 0] = 1e-6
    F *= f ** (-beta/2.0); F[0, 0] = 0
    o = np.real(np.fft.ifft2(F))
    return (o - o.mean()) / (o.std() + 1e-9)

def n01(a): return (a - a.min()) / (np.ptp(a) + 1e-9)

def save(a, p, q=80):
    Image.fromarray(np.uint8(np.clip(a, 0, 1) * 255)).save(p, quality=q, method=6)
    return os.path.getsize(p)

out = {}

# ── 1. THE WEB. Filaments are the RIDGES of a warped field: take smooth noise, push it
#      through a sine, take the absolute value and invert. Where the sine crosses zero you
#      get a thin bright line — which is exactly how a caustic looks.
N = 384
w1 = fftnoise(N, 4.2, 11); w2 = fftnoise(N, 4.6, 12)
field = w1 * 1.5 + w2 * 0.9
web = 1.0 - np.abs(np.sin(field * 1.15))
web = web ** 7.0                       # thin them: a caustic is a hairline, not a band
web = web + 0.40 * (1.0 - np.abs(np.sin(field * 2.1))) ** 9.0   # a second, finer order
out["web"] = save(n01(web) * 0.92, "caustic-web.webp")

# ── 2. THE BURST. Kaleidoscopic by construction: build ONE angular wedge of filaments and
#      repeat it around the circle, so the pattern has true rotational symmetry — which is
#      what „kaleidoscope" means and what random noise can never give you.
M = 512
yy, xx = np.mgrid[0:M, 0:M]
cx = cy = (M - 1) / 2.0
dx, dy = (xx - cx) / cx, (yy - cy) / cy
r = np.sqrt(dx*dx + dy*dy)
th = np.arctan2(dy, dx)

FOLDS = 9
wedge = np.abs(((th * FOLDS / (2*np.pi)) % 1.0) - 0.5) * 2.0      # 0..1, mirrored per fold
rng = np.random.default_rng(77)
spokes = np.zeros_like(r)
for k, (freq, amp, ph) in enumerate([(3.0, 1.0, 0.0), (7.0, 0.55, 1.1), (13.0, 0.3, 2.3)]):
    ridge = 1.0 - np.abs(np.sin((wedge * freq + r * 2.4 + ph) * np.pi))
    spokes += amp * ridge ** (6.0 + 2*k)
# radial falloff: bright core, filaments fading outward, nothing past the edge
falloff = np.clip(1.25 - r, 0, 1) ** 1.9
core = np.exp(-(r / 0.24) ** 2) * 1.15
burst = np.clip(core + spokes * falloff * 0.9, 0, 1.4)
out["burst9"] = save(n01(burst), "caustic-burst9.webp")

# a second symmetry, so the badge and the button need not look identical
FOLDS = 14
wedge = np.abs(((th * FOLDS / (2*np.pi)) % 1.0) - 0.5) * 2.0
spokes = np.zeros_like(r)
for k, (freq, amp, ph) in enumerate([(2.0, 1.0, 0.4), (5.0, 0.5, 1.7)]):
    ridge = 1.0 - np.abs(np.sin((wedge * freq + r * 3.1 + ph) * np.pi))
    spokes += amp * ridge ** (7.0 + 2*k)
burst2 = np.clip(np.exp(-(r/0.20)**2) * 1.1 + spokes * np.clip(1.2 - r, 0, 1)**2.1 * 0.85, 0, 1.4)
out["burst14"] = save(n01(burst2), "caustic-burst14.webp")

# ── 3. FACETS — cut-glass planes, for the „витраж" variant. Angular sectors with flat
#      shading, so light steps rather than sweeps.
FOLDS = 12
sect = np.floor(((th + np.pi) / (2*np.pi)) * FOLDS)
rng2 = np.random.default_rng(5)
vals = rng2.random(FOLDS) * 0.6 + 0.35
facet = vals[np.clip(sect.astype(int), 0, FOLDS-1)]
facet = facet * np.clip(1.15 - r * 0.7, 0, 1)
facet += 0.25 * np.exp(-(r/0.3)**2)
out["facets"] = save(n01(facet), "caustic-facets.webp")

for k, v in out.items():
    print(f"{k:9s} {v//1024:3d} KB ({v} B)")
