#!/usr/bin/env python3
"""Bake the three new sets Kris added: white marble, misc-00079 (reads as opal /
mother-of-pearl), and plywood. Mirror-tiled, because none of them ship seamless."""
import numpy as np, os
from PIL import Image

T = 512

def tile(a, size=T, box=None):
    h, w = a.shape[:2]
    if box:
        y0, x0, s = int(box[0]*h), int(box[1]*w), int(box[2]*min(h, w))
        a = a[y0:y0+s, x0:x0+s]
    else:
        s = min(h, w); a = a[(h-s)//2:(h-s)//2+s, (w-s)//2:(w-s)//2+s]
    q = np.asarray(Image.fromarray(np.uint8(np.clip(a, 0, 255)))
                   .resize((size//2, size//2), Image.LANCZOS), dtype=float)
    top = np.concatenate([q, q[:, ::-1]], axis=1)
    return np.concatenate([top, top[::-1, :]], axis=0)

def n01(a): return (a - a.min()) / (np.ptp(a) + 1e-9)
def load(n, m="L"): return np.asarray(Image.open(f"maps/{n}.png").convert(m), dtype=float)
def save(a, p, q=76):
    Image.fromarray(np.uint8(np.clip(a, 0, 1)*255)).save(p, quality=q, method=6)
    return os.path.getsize(p)

L = np.array([-0.34, -0.58, 0.74]); L /= np.linalg.norm(L)
Hv = L + np.array([0., 0., 1.]); Hv /= np.linalg.norm(Hv)

def shade(h, amp, rough=0.34):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1))*0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0))*0.5
    s = amp*h.shape[0]
    nx, ny, nz = -dx*s, -dy*s, np.ones_like(h)
    l = np.sqrt(nx*nx+ny*ny+nz*nz); nx, ny, nz = nx/l, ny/l, nz/l
    ndl = nx*L[0]+ny*L[1]+nz*L[2]
    ndh = np.clip(nx*Hv[0]+ny*Hv[1]+nz*Hv[2], 1e-4, 1)
    w = .55; diff = np.clip((ndl+w)/(1+w), 0, 1)
    a = rough**2; a2 = a*a
    D = a2/(np.pi*((ndh**2)*(a2-1)+1)**2)
    return np.clip(0.22 + 0.62*diff + 0.42*(D/(1+D)), 0, 1.6)

out = {}

# WHITE MARBLE. Its height map is all zeros and its normal is flat, so the ALBEDO is the
# only real information in the set — the veining IS the texture. Used as a colour tile
# directly, plus a grey map derived from its own luminance so it can tint to amber.
mc = tile(load("marble_color", "RGB"), box=(0.02, 0.02, 0.62))
out["marble_color"] = save(mc/255.0, "new-marble-col.webp")
ml = n01(tile(load("marble_color"), box=(0.02, 0.02, 0.62)))
out["marble_map"] = save(np.clip(0.5 + 0.85*(ml - ml.mean()), 0, 1), "new-marble-map.webp")

# MISC 00079 — it reads as opal / mother-of-pearl: pale body with pink and grey iridescence.
# That is the one set here with a genuine „magic" quality, so it is worth its own page.
oc = tile(load("misc79_color", "RGB"), box=(0.30, 0.05, 0.40))
out["opal_color"] = save(oc/255.0, "new-opal-col.webp")
oh = n01(tile(load("misc79_height"), box=(0.30, 0.05, 0.40)))
om = shade(oh, 0.030)
out["opal_map"] = save(np.clip(0.5 + 0.80*(om - om.mean()), 0, 1), "new-opal-map.webp")

# PLYWOOD — clean straight grain, warm. Colour only (its nor/rough ship as EXR).
pc = tile(load("ply_color", "RGB"), box=(0.05, 0.05, 0.55))
out["ply_color"] = save(pc/255.0, "new-ply-col.webp")
pl = n01(tile(load("ply_color"), box=(0.05, 0.05, 0.55)))
out["ply_map"] = save(np.clip(0.5 + 0.75*(pl - pl.mean()), 0, 1), "new-ply-map.webp")

for k, v in out.items():
    print(f"{k:14s} {v//1024:3d} KB")
