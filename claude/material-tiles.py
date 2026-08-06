#!/usr/bin/env python3
"""Seamless greyscale shading maps for the non-metal materials.

Same discipline as the gold: GREY maps, tinted in CSS. One small file per material
serves every colour, nothing locks a hue into a JPEG, and all of them wrap exactly
because the noise is generated in the Fourier domain.
"""
import numpy as np, os
from PIL import Image

N = 256

def fftnoise(beta, seed, aniso=1.0):
    r = np.random.default_rng(seed)
    F = np.fft.fft2(r.normal(size=(N, N)))
    fy = np.fft.fftfreq(N)[:, None] * aniso
    fx = np.fft.fftfreq(N)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1e-6
    F *= f ** (-beta / 2.0); F[0, 0] = 0
    o = np.real(np.fft.ifft2(F))
    return (o - o.mean()) / (o.std() + 1e-9)

def n01(a): return (a - a.min()) / (np.ptp(a) + 1e-9)

def save(a, name, q=78):
    Image.fromarray(np.uint8(np.clip(a, 0, 1) * 255)).save(name, quality=q, method=6)
    return os.path.getsize(name)

def centre(a, gain=1.0):
    """Mid-grey neutral, so `overlay` leaves flat areas of the tint untouched."""
    return np.clip(0.5 + gain * (a - a.mean()), 0, 1)

out = {}

# PAPER — short fibres, very low contrast. The whole character is fine, dense grain.
p = 0.55 * fftnoise(0.6, 101) + 0.45 * fftnoise(1.6, 102)
out["paper"] = save(centre(n01(p), 0.42), "mat-paper.webp")

# LINEN — a woven grid softened by slub. Two anisotropic noises crossed.
warp = n01(fftnoise(1.2, 201, aniso=14))
weft = n01(fftnoise(1.2, 202, aniso=0.07))
slub = n01(fftnoise(2.4, 203))
lin = 0.42 * warp + 0.42 * weft + 0.16 * slub
out["linen"] = save(centre(n01(lin), 0.75), "mat-linen.webp")

# STONE / MARBLE — broad veining plus a fine speckle. Veins from a warped low-frequency
# field run through a sine, which is the classic marble trick and still the best one.
base = fftnoise(3.4, 301)
warp2 = fftnoise(3.8, 302)
vein = np.abs(np.sin((base * 1.7 + warp2 * 1.1) * 2.6))      # abs -> thin dark veins
vein = 1.0 - np.clip(vein * 1.35, 0, 1) ** 2.2
stone = 0.78 * n01(vein) + 0.22 * n01(fftnoise(2.4, 303))
out["stone"] = save(centre(n01(stone), 0.70), "mat-stone.webp")

# WOOD — rings: a stretched field pushed through a sawtooth, plus grain streaks.
yy, xx = np.mgrid[0:N, 0:N]
warp3 = n01(fftnoise(4.0, 401)) * 2.6
rings = np.sin((yy / N * 7.0 + warp3) * 6.2832)
rings = np.sign(rings) * np.abs(rings) ** 0.6                # flatter tops, crisper lines
grain = n01(fftnoise(0.9, 402, aniso=8.0))                   # streaks along the grain
wood = 0.70 * n01(rings) + 0.30 * grain
out["wood"] = save(centre(n01(wood), 0.55), "mat-wood.webp")

# TERRACOTTA / BRICK — coarse open grain with pinholes, the surface of unglazed clay.
t = 0.5 * fftnoise(1.4, 501) + 0.5 * fftnoise(0.8, 502)
holes = n01(fftnoise(0.5, 503))
terra = n01(t) - 0.35 * np.clip((holes - 0.72) * 6, 0, 1)
out["terra"] = save(centre(n01(terra), 0.6), "mat-terra.webp")

# CERAMIC GLAZE — almost nothing: a very soft undulation, because a glaze's character is
# its SPECULAR, not its grain. Kept so the surface is not mathematically flat.
out["glaze"] = save(centre(n01(fftnoise(4.4, 601)), 0.30), "mat-glaze.webp")

for k, v in out.items():
    print(f"{k:8s} {v//1024 if v>1024 else 0:3d} KB ({v} B)")
