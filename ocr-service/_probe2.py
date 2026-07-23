"""Probe 2: deblur / binarize attempts on the same frame, all at fast sizes."""

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
g = ImageOps.grayscale(img)

# G: unsharp mask (deblur-ish)
u = g.filter(ImageFilter.UnsharpMask(radius=2, percent=250, threshold=2))
u = ImageOps.autocontrast(u, cutoff=1)
run("G unsharp mag1", np.array(u), mag_ratio=1.0, text_threshold=0.4, low_text=0.25)

# H: upscale 1200 + strong unsharp
big = g.resize((1200, int(h * 1200.0 / w)), Image.LANCZOS)
bu = big.filter(ImageFilter.UnsharpMask(radius=3, percent=300, threshold=2))
bu = ImageOps.autocontrast(bu, cutoff=1)
run(
    "H up1200 unsharp mag1",
    np.array(bu),
    mag_ratio=1.0,
    text_threshold=0.4,
    low_text=0.25,
)

# I: binarize (simple threshold at mean)
arr = np.array(ImageOps.autocontrast(g, cutoff=1))
thr = int(arr.mean())
b = (arr > thr).astype(np.uint8) * 255
run("I binarize mean mag1", b, mag_ratio=1.0, text_threshold=0.4, low_text=0.25)

# J: invert + binarize (white-on-dark -> black-on-white)
inv = 255 - arr
thr2 = int(inv.mean())
bj = (inv > thr2).astype(np.uint8) * 255
run("J inv-binarize mag1", bj, mag_ratio=1.0, text_threshold=0.4, low_text=0.25)

# K: upscale 1200 color + unsharp on color
bigc = img.resize((1200, int(h * 1200.0 / w)), Image.LANCZOS).filter(
    ImageFilter.UnsharpMask(radius=3, percent=300, threshold=2)
)
run(
    "K up1200 color unsharp mag1",
    np.array(bigc),
    mag_ratio=1.0,
    text_threshold=0.4,
    low_text=0.25,
)

# L: smaller 640 for latency reference (native gray)
small = g.resize((640, int(h * 640.0 / w)), Image.LANCZOS)
run(
    "L 640 gray mag1",
    np.array(ImageOps.autocontrast(small, cutoff=1)),
    mag_ratio=1.0,
    text_threshold=0.4,
    low_text=0.25,
)
