"""EasyOCR sidecar for the "Luận Giải" describe game.

Node streams a cropped JPEG of the card region here; we run EasyOCR (Vietnamese
model) and return the concatenated text. The Node side still does the fuzzy
card-name matching, so this service only needs to turn pixels into text.

EasyOCR replaced PaddleOCR because paddlepaddle 2.6.x crashes natively at model
init (free(): invalid pointer in inflateReset2 — a bundled-zlib conflict) and
never builds. EasyOCR gives the same offline, self-hosted Vietnamese OCR.
"""

import io
import os

import easyocr
import numpy as np
from fastapi import FastAPI, Request
from PIL import Image, ImageFilter, ImageOps

# ['vi'] loads the Vietnamese recognition model (latin script + diacritics).
# gpu=False → pure CPU. Models are pre-downloaded in the Docker build so runtime
# needs no internet.
_reader = easyocr.Reader(["vi"], gpu=False)

# Sensitivity knobs (env-overridable). Lower conf keeps more borderline reads.
MIN_CONF = float(os.environ.get("OCR_MIN_CONF", "0.12"))
# Fixed working width: every frame is resized to this (down OR up) so EasyOCR's
# CPU cost is bounded and predictable regardless of the camera's frame size.
# Card text is large, so ~900px reads it fine while staying fast (~2-4s/frame).
TARGET_WIDTH = int(os.environ.get("OCR_TARGET_WIDTH", "900"))
# Sharpness gate: frames whose Laplacian variance is below this are too
# motion-blurred to read, so we skip OCR (which costs seconds) and let a sharp
# frame get a turn instead. A visibly-blurry handheld frame measures ~30; sharp
# card text is well above 100.
BLUR_MIN = float(os.environ.get("OCR_BLUR_MIN", "50"))

app = FastAPI()


@app.get("/health")
def health():
    return {"ok": True}


def _laplacian_var(gray: np.ndarray) -> float:
    """Focus measure: variance of a 4-neighbour Laplacian. Low => blurry."""
    g = gray.astype(np.float64)
    lap = (
        -4.0 * g
        + np.roll(g, 1, 0)
        + np.roll(g, -1, 0)
        + np.roll(g, 1, 1)
        + np.roll(g, -1, 1)
    )
    return float(lap.var())


def _preprocess(img: Image.Image) -> np.ndarray:
    """Resize to a fixed working width + contrast-stretch + unsharp so card text
    is easy for EasyOCR to read while keeping CPU cost bounded. Returns a
    grayscale numpy array."""
    w, h = img.size
    if w != TARGET_WIDTH and w > 0:
        scale = TARGET_WIDTH / float(w)
        img = img.resize((TARGET_WIDTH, max(1, int(h * scale))), Image.LANCZOS)
    g = ImageOps.grayscale(img)
    g = ImageOps.autocontrast(g, cutoff=1)  # stretch dynamic range
    g = g.filter(ImageFilter.UnsharpMask(radius=2, percent=200, threshold=2))
    return np.array(g)


@app.post("/ocr")
async def do_ocr(request: Request):
    body = await request.body()
    if not body:
        return {"text": "", "lines": [], "blur": 0}
    try:
        img = Image.open(io.BytesIO(body)).convert("RGB")
    except Exception:
        return {"text": "", "lines": [], "blur": 0}

    # Focus check on the raw grayscale (matches the calibration reference).
    blur = _laplacian_var(np.array(ImageOps.grayscale(img)))
    if blur < BLUR_MIN:
        return {"text": "", "lines": [], "blur": round(blur, 1), "skipped": True}

    arr = _preprocess(img)
    # detail=1 → [ [box, text, conf], ... ]; paragraph=False keeps lines separate.
    # Lowered detector thresholds pick up low-contrast card text; mag_ratio=1.0
    # (no magnification) keeps it fast since the text is already large.
    result = _reader.readtext(
        arr,
        detail=1,
        paragraph=False,
        mag_ratio=1.0,
        text_threshold=0.5,
        low_text=0.3,
        link_threshold=0.3,
        contrast_ths=0.05,
        adjust_contrast=0.7,
    )

    lines = []
    for item in result:
        try:
            text = item[1]
            conf = float(item[2])
        except (IndexError, TypeError, ValueError):
            continue
        if text and conf >= MIN_CONF:
            lines.append(text)

    return {"text": " ".join(lines), "lines": lines, "blur": round(blur, 1)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8868")))
