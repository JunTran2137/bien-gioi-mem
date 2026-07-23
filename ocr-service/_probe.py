"""Throwaway probe: try several preprocessing/param combos on one frame to find
what reliably reads white-on-dark, slightly-blurry card text. Run inside the
container via docker exec. Delete when done."""

import sys
import time

import easyocr
import numpy as np
from PIL import Image, ImageFilter, ImageOps

reader = easyocr.Reader(["vi"], gpu=False)


def run(name, arr, **kw):
    t = time.time()
    res = reader.readtext(arr, detail=1, paragraph=False, **kw)
    dt = int((time.time() - t) * 1000)
    txt = " | ".join(f"{r[1]}({r[2]:.2f})" for r in res)
    print(f"[{name}] {dt}ms -> {txt!r}", flush=True)


img = Image.open("/tmp/f.jpg").convert("RGB")
w, h = img.size
print(f"frame {w}x{h}", flush=True)

# A: raw color, defaults
run("A raw-default", np.array(img))

# B: grayscale + autocontrast + sharpen at native size, mag 1.0
g = ImageOps.grayscale(img)
g = ImageOps.autocontrast(g, cutoff=1)
g = g.filter(ImageFilter.SHARPEN)
run(
    "B gray-ac-sharp mag1",
    np.array(g),
    mag_ratio=1.0,
    text_threshold=0.5,
    low_text=0.3,
    link_threshold=0.3,
    contrast_ths=0.05,
    adjust_contrast=0.7,
)

# C: old winning combo — upscale to 1400 + mag 1.5
scale = 1400.0 / w
big = img.resize((1400, int(h * scale)), Image.LANCZOS)
gc = ImageOps.grayscale(big)
gc = ImageOps.autocontrast(gc, cutoff=1)
gc = gc.filter(ImageFilter.SHARPEN)
run(
    "C up1400 mag1.5",
    np.array(gc),
    mag_ratio=1.5,
    text_threshold=0.5,
    low_text=0.3,
    link_threshold=0.3,
    contrast_ths=0.05,
    adjust_contrast=0.7,
)

# D: inverted grayscale (white-on-dark -> dark-on-white)
inv = ImageOps.invert(ImageOps.grayscale(img))
inv = ImageOps.autocontrast(inv, cutoff=1)
run(
    "D inverted mag1",
    np.array(inv),
    mag_ratio=1.0,
    text_threshold=0.5,
    low_text=0.3,
    link_threshold=0.3,
)

# E: raw color defaults but upscale 1400 (no gray/sharpen)
run("E up1400 color default", np.array(big))

# F: color native, low thresholds, mag 1.3
run(
    "F color mag1.3 lowthr",
    np.array(img),
    mag_ratio=1.3,
    text_threshold=0.4,
    low_text=0.25,
    link_threshold=0.25,
    contrast_ths=0.05,
    adjust_contrast=0.8,
)
