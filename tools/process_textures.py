#!/usr/bin/env python3
"""One-time: raw NASA/three.js downloads -> engine/tex. Usage: process_textures.py RAW_DIR"""
import sys, os, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
raw = sys.argv[1]; out = os.path.join(os.path.dirname(__file__), '..', 'engine', 'tex')
os.makedirs(out, exist_ok=True)
def save(im, name, q=88):
    p = os.path.join(out, name); im.save(p, quality=q, optimize=True, progressive=True); print(name, os.path.getsize(p)//1024, 'KB')

# --- Moon colour (LROC WAC mosaic) ---
c = Image.open(os.path.join(raw, 'lroc_color_poles_8k.tif')).convert('RGB')
print('color', c.size)
save(c.resize((8192, 4096), Image.LANCZOS), 'moon_color_8k.jpg', 86)
save(c.resize((2048, 1024), Image.LANCZOS), 'moon_color_2k.jpg', 88)

# --- Moon elevation (LOLA LDEM, uint16 half-metres) -> normal + relief ---
d = np.array(Image.open(os.path.join(raw, 'ldem_16_uint.tif'))).astype(np.float32)
print('ldem', d.shape, d.min(), d.max())
h = d * 0.5                                # metres (offset irrelevant for slopes)
H, W = h.shape
R = 1737400.0
dx_m = 2*np.pi*R/W; dy_m = np.pi*R/H
lat = (0.5 - (np.arange(H)+0.5)/H) * np.pi
coslat = np.clip(np.cos(lat), 0.02, 1)[:, None]
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / (2*dx_m*coslat)
gy = np.empty_like(h); gy[1:-1] = (h[:-2] - h[2:]) / (2*dy_m); gy[0] = gy[1]; gy[-1] = gy[-2]
EX = 1.0                                   # true slopes; exaggerate in shader (normalScale)
n = np.stack([-gx*EX, -gy*EX, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
nm = ((n*0.5+0.5)*255).round().astype(np.uint8)
save(Image.fromarray(nm).resize((4096, 2048), Image.LANCZOS), 'moon_normal_4k.jpg', 92)
rel = (h - h.min()) / (h.max() - h.min())
save(Image.fromarray((rel*255).round().astype(np.uint8)).resize((4096, 2048), Image.LANCZOS), 'moon_relief_4k.jpg', 90)

# --- Earth (three.js r169 planets) ---
for f in ['earth_day_4096.jpg', 'earth_night_4096.jpg', 'earth_bump_roughness_clouds_4096.jpg']:
    save(Image.open(os.path.join(raw, f)).convert('RGB'), f, 88)
