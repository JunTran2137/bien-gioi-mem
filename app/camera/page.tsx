'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';

/**
 * /camera — Standalone phone capture device for the Monopoly-style board game.
 *
 * A player points their phone at the REAL physical board (printed with ArUco
 * markers on each tile). This page:
 *   1. Opens the rear camera (getUserMedia).
 *   2. Detects ArUco markers in-browser with js-aruco2 (dictionary "ARUCO" /
 *      "Original ArUco" so cheap online generators work — marker id === tile id).
 *   3. Streams a down-scaled JPEG of the live feed + the normalised tile centres
 *      to the game room so the desktop board can overlay virtual pieces on the
 *      real tiles.
 *
 * It is intentionally a flat 2D page (see WorldShell TWO_D_ROUTES) — no 3D city.
 */

const DETECT_WIDTH = 480; // px the frame is down-scaled to before detection
const FRAME_QUALITY = 0.5; // JPEG quality for the streamed preview
const TARGET_FPS = 8;

function CameraInner() {
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase().trim();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastTickRef = useRef(0);

  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [markerCount, setMarkerCount] = useState(0);
  const [joined, setJoined] = useState(false);

  // ---- socket: announce this device to the room -------------------------
  useEffect(() => {
    if (!roomCode) return;
    const socket = getSocket();
    const announce = () => {
      socket.emit('camera:join', { roomCode });
      setJoined(true);
    };
    if (socket.connected) announce();
    socket.on('connect', announce);
    return () => {
      socket.off('connect', announce);
    };
  }, [roomCode]);

  // ---- detection loop ---------------------------------------------------
  const loop = useCallback(
    (now: number) => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(loop);

      const minGap = 1000 / TARGET_FPS;
      if (now - lastTickRef.current < minGap) return;
      lastTickRef.current = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = detectorRef.current;
      if (!video || !canvas || !detector || video.readyState < 2) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const w = DETECT_WIDTH;
      const h = Math.round((vh / vw) * w);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);

      let tiles: { id: number; center: { x: number; y: number } }[] = [];
      try {
        const imageData = ctx.getImageData(0, 0, w, h);
        const markers = detector.detect(imageData) || [];
        tiles = markers.map((m: any) => {
          const cx = (m.corners[0].x + m.corners[1].x + m.corners[2].x + m.corners[3].x) / 4;
          const cy = (m.corners[0].y + m.corners[1].y + m.corners[2].y + m.corners[3].y) / 4;
          return { id: m.id, center: { x: cx / w, y: cy / h } };
        });
      } catch {
        /* detection can throw on degenerate frames — skip this frame */
      }

      setMarkerCount(tiles.length);

      const socket = getSocket();
      socket.emit('camera:tiles', { roomCode, tiles });
      try {
        const jpeg = canvas.toDataURL('image/jpeg', FRAME_QUALITY);
        socket.emit('camera:frame', { roomCode, jpeg });
      } catch {
        /* ignore toDataURL failures */
      }
    },
    [roomCode]
  );

  const start = useCallback(async () => {
    if (!roomCode) {
      setStatus('error');
      setErrorMsg('Thiếu mã phòng. Hãy quét lại mã QR từ màn hình chính.');
      return;
    }
    setStatus('starting');
    setErrorMsg('');
    try {
      // Camera APIs are only exposed in a secure context (https:// or localhost).
      // Over plain http on a LAN IP the browser hides navigator.mediaDevices.
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMsg(
          !window.isSecureContext
            ? 'Trình duyệt chặn camera vì trang đang chạy qua HTTP (không bảo mật). Camera chỉ bật được khi truy cập bằng HTTPS hoặc localhost. Xem hướng dẫn bật HTTPS bên dưới.'
            : 'Trình duyệt này không hỗ trợ camera (getUserMedia).'
        );
        return;
      }

      // Load the ArUco detector lazily (browser-only, heavy).
      if (!detectorRef.current) {
        const mod: any = await import('js-aruco2');
        const AR = mod.AR ?? mod.default?.AR ?? mod.default;
        detectorRef.current = new AR.Detector({ dictionaryName: 'ARUCO' });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      runningRef.current = true;
      setStatus('live');
      rafRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(
        e?.name === 'NotAllowedError'
          ? 'Bạn đã từ chối quyền camera. Hãy cấp quyền và thử lại.'
          : 'Không mở được camera: ' + (e?.message || 'lỗi không xác định')
      );
    }
  }, [roomCode, loop]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus('idle');
    setMarkerCount(0);
  }, []);

  // cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="px-4 py-3 border-b border-border bg-surface">
        <h1 className="font-display text-xl text-primary">📷 Camera Bàn Cờ</h1>
        <p className="text-xs text-muted mt-0.5">
          {roomCode ? (
            <>
              Phòng <span className="font-mono text-secondary">{roomCode}</span>
              {joined && status === 'live' && <span className="text-primary"> · đang phát trực tiếp</span>}
            </>
          ) : (
            'Chưa có mã phòng'
          )}
        </p>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-border">
          <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
          {status !== 'live' && (
            <div className="absolute inset-0 grid place-items-center text-white/80 text-sm text-center px-6">
              {status === 'starting' ? 'Đang mở camera…' : 'Camera chưa bật'}
            </div>
          )}
          {status === 'live' && (
            <div className="absolute top-2 left-2 text-[11px] bg-black/50 text-white px-2 py-1 rounded">
              ● LIVE · {markerCount} ô nhận diện
            </div>
          )}
        </div>

        {/* offscreen detection canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {status === 'error' && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 text-danger text-sm px-4 py-3">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-3">
          {status !== 'live' ? (
            <button
              onClick={start}
              disabled={status === 'starting' || !roomCode}
              className="flex-1 rounded-xl bg-primary text-white font-medium py-3 disabled:opacity-50"
            >
              {status === 'starting' ? 'Đang khởi động…' : 'Bật camera & kết nối'}
            </button>
          ) : (
            <button onClick={stop} className="flex-1 rounded-xl bg-danger text-white font-medium py-3">
              Dừng phát
            </button>
          )}
        </div>

        <ol className="text-sm text-muted space-y-2 leading-relaxed">
          <li>
            <b className="text-text">1.</b> In bộ thẻ ArUco (mã <span className="font-mono">0–23</span>, từ điển
            <i> Original ArUco</i>) và dán mỗi thẻ lên một ô của bàn cờ thật.
          </li>
          <li>
            <b className="text-text">2.</b> Đặt điện thoại cố định, hướng camera bao quát toàn bộ bàn cờ.
          </li>
          <li>
            <b className="text-text">3.</b> Bấm <b className="text-text">Bật camera</b>. Hình ảnh và vị trí các ô sẽ
            hiện trên màn hình chính của phòng.
          </li>
        </ol>
      </main>
    </div>
  );
}

export default function CameraPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-bg text-muted">Đang tải…</div>}>
      <CameraInner />
    </Suspense>
  );
}
