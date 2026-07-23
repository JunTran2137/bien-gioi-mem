// @ts-check
// Server-side OCR for the "Luận Giải" describe game.
//
// The phone/laptop cameras no longer run OCR themselves — they just stream a
// sharp JPEG frame (~1 fps) via `dgcam:ocrframe`. This module forwards each frame
// to the EasyOCR sidecar (HTTP), throttled per group and single-flighted so the
// CPU stays bounded even with many groups. On a confident match it drives the
// group's live guess (describe.setGuess) and broadcasts the recognised name back
// so the camera device + host can display it.

const { matchCardByText } = require('../data/describeCards');
const describe = require('./describe-engine');

// OCR engine: an EasyOCR sidecar (Vietnamese model) reached over HTTP. If it's
// unreachable or too slow we simply skip the frame — there is deliberately no
// tesseract fallback, because on real webcam Vietnamese tesseract only produced
// garbage that caused false-positive matches and stole CPU from the sidecar.
const OCR_URL = process.env.OCR_URL || 'http://localhost:8868/ocr';
let remoteWarned = false;

/** POST the JPEG to the EasyOCR sidecar. Returns the parsed {text, blur, ...}
 * response, or null if unreachable/errored. */
async function recognizeRemote(buf) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(OCR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: buf,
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j && typeof j.text === 'string' ? j : { text: '' };
  } catch {
    return null; // sidecar down / not built yet
  } finally {
    clearTimeout(timer);
  }
}

const MIN_INTERVAL_MS = 1000; // per-group minimum gap between OCR passes (bounds CPU)
const MATCH_MIN = 0.4;        // fuzzy-match confidence floor (matcher also needs a margin)
const MIN_FRAME_BYTES = 9000; // below this a frame is almost certainly blank (skip OCR)

/** key `${roomCode}:${groupId}` -> newest frame awaiting OCR (older frames are dropped) */
const pending = new Map();
/** key -> timestamp of the last OCR pass for that group */
const lastProcessed = new Map();
let busy = false; // single-flight guard: only one recognize() runs at a time

/** @param {any} jpeg */
function toBuffer(jpeg) {
  if (Buffer.isBuffer(jpeg)) return jpeg;
  if (jpeg instanceof ArrayBuffer) return Buffer.from(jpeg);
  if (ArrayBuffer.isView(jpeg)) return Buffer.from(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength);
  return null;
}

/**
 * Accept a sharp camera frame for recognition. Keeps only the newest frame per
 * group and kicks the processing pump.
 * @param {string} roomCode
 * @param {string} groupId
 * @param {any} jpeg  Buffer | ArrayBuffer | TypedArray of JPEG bytes
 * @param {import('socket.io').Server} io
 */
function submitFrame(roomCode, groupId, jpeg, io) {
  if (!roomCode || !groupId) return;
  const buf = toBuffer(jpeg);
  if (!buf || !buf.length) return;
  // Skip near-blank frames: when the camera captures before the video frame is
  // ready it produces a ~3-7KB uniform JPEG. A real 960px card frame is ~20KB+.
  // Running EasyOCR (~seconds) on blanks wastes the throttled OCR slots, so a
  // real card held to the camera never gets a turn. Drop anything too small.
  if (buf.length < MIN_FRAME_BYTES) return;
  pending.set(roomCode + ':' + groupId, { roomCode, groupId, buf, io });
  pump();
}

async function pump() {
  if (busy) return;
  busy = true;
  try {
    // Drain: process eligible groups (past their min interval), newest-waiting
    // first, one recognition at a time.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const now = Date.now();
      let pickKey = null;
      let pickAge = -1;
      for (const [key] of pending) {
        const since = now - (lastProcessed.get(key) || 0);
        if (since < MIN_INTERVAL_MS) continue;
        if (since > pickAge) { pickAge = since; pickKey = key; }
      }
      if (!pickKey) break; // nothing eligible right now

      const ent = pending.get(pickKey);
      pending.delete(pickKey);
      lastProcessed.set(pickKey, Date.now());

      // TEMP DEBUG: dump the exact frame we feed to OCR so we can eyeball real
      // camera image quality/framing. Remove once tuned.
      try { require('fs').writeFileSync(require('path').join(__dirname, '..', 'scripts', 'last-ocr-frame.jpg'), ent.buf); } catch { /* ignore */ }

      try {
        const engine = 'easyocr';
        const remote = await recognizeRemote(ent.buf);
        if (remote === null) {
          // Sidecar unreachable / too slow. Do NOT fall back to tesseract: on
          // webcam Vietnamese it returns garbage that both creates false-positive
          // matches AND steals CPU, which makes EasyOCR time out even more (a
          // death spiral). Just skip this frame and try the next one.
          if (!remoteWarned) { console.warn('[ocr] EasyOCR sidecar unreachable/slow at', OCR_URL, '- skipping frames until it recovers'); remoteWarned = true; }
          continue;
        }
        if (remoteWarned) { remoteWarned = false; console.log('[ocr] EasyOCR sidecar recovered'); }
        const raw = (remote.text || '').replace(/\s+/g, ' ').trim();
        const card = matchCardByText(raw, MATCH_MIN);
        // Only log frames where OCR actually read text (or matched) — skips the
        // empty-frame spam so a real card read is easy to spot. `blur` is the
        // focus metric (higher = sharper); frames below the sidecar's gate are
        // skipped there and never reach here.
        if (raw || card) console.log('[ocr]', engine, ent.groupId, 'bytes=' + ent.buf.length, 'blur=' + (remote.blur != null ? remote.blur : '?'), 'raw=' + JSON.stringify(raw.slice(0, 80)), '=> match=' + (card ? card.name : 'null'));
        if (card) describe.setGuess(ent.roomCode, ent.groupId, card.markerId, ent.io);
        // Feedback for the camera device (shows what was read) + host (name label).
        ent.io.to(ent.roomCode).emit('dg:cameraRecognized', {
          groupId: ent.groupId,
          name: card ? card.name : null,
          text: raw.slice(0, 60)
        });
      } catch { /* transient engine error — skip this frame, keep draining */ }
    }
  } finally {
    busy = false;
    // Frames arrived but are still within their per-group cooldown → wake soon.
    if (pending.size) setTimeout(pump, 200);
  }
}

/** Forget a group's throttle/pending state (e.g. on camera disconnect).
 * @param {string} roomCode @param {string} groupId */
function clearGroup(roomCode, groupId) {
  const key = roomCode + ':' + groupId;
  pending.delete(key);
  lastProcessed.delete(key);
}

module.exports = { submitFrame, clearGroup };
