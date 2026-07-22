'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSocket } from '@/lib/socket-client';
import { cardByMarker } from '@/data/describeCards';

/**
 * /game/describe/camera — per-group phone camera for the "Luận Giải" game.
 *
 * One phone per group. Auto-detects the user's group from session.
 */

const DETECT_WIDTH = 256;   // small canvas for ArUco detection only
const STREAM_WIDTH = 240;   // stream canvas — 240px is enough for thumbnails, ~4× smaller data than 480px
const FRAME_QUALITY = 0.55; // slightly higher quality at lower res for readable card text
const TARGET_FPS = 4;       // 4fps is smooth enough for still-ish card display

function CameraInner() {
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase().trim();
  const { status: sessionStatus } = useSession(); // session data not needed, only auth status

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);   // detect canvas
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null); // stream canvas
  const detectCtxRef = useRef<CanvasRenderingContext2D | null>(null); // cached detect ctx
  const frameCtxRef = useRef<CanvasRenderingContext2D | null>(null);  // cached stream ctx
  const detectorRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const rvfcRef = useRef<number | null>(null); // requestVideoFrameCallback handle
  const runningRef = useRef(false);
  const lastTickRef = useRef(0);
  const encodingRef = useRef(false); // skip frame if previous toBlob not done
  const groupRef = useRef<string>('');
  const lastTilesKeyRef = useRef<string>(''); // dedupe tile emits
  const lastDetectedRef = useRef<string | null>(null); // dedupe setState
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null); // cached socket
  const wakeLockRef = useRef<WakeLockSentinel | null>(null); // prevent screen sleep

  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [groupLoaded, setGroupLoaded] = useState(false);
  const [alreadyConnected, setAlreadyConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => { groupRef.current = groupId; }, [groupId]);

  // Auto-detect group from session
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d?.groupId && d?.groupName) {
        setGroupId(d.groupId);
        setGroupName(d.groupName);
        groupRef.current = d.groupId;
      }
      setGroupLoaded(true);
    }).catch(() => setGroupLoaded(true));
  }, [sessionStatus]);

  // Announce to room once group is known
  useEffect(() => {
    if (!roomCode || !groupId) return;
    const socket = getSocket();
    const announce = () => socket.emit('dgcam:join', { roomCode, groupId, groupName }, (res: any) => {
      if (res?.alreadyConnected) setAlreadyConnected(true);
    });
    if (socket.connected) announce();
    socket.on('connect', announce);
    return () => { socket.off('connect', announce); };
  }, [roomCode, groupId, groupName]);

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;
    if (!video || !canvas || !detector || video.readyState < 2) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;

    // ── Detection on small canvas (fast) ──────────────────────────────
    const dw = DETECT_WIDTH;
    const dh = Math.round((vh / vw) * dw);
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw; canvas.height = dh;
      detectCtxRef.current = null; // reset cached ctx on resize
    }
    // Cache the 2D context — getContext() every tick is wasteful
    if (!detectCtxRef.current) {
      detectCtxRef.current = canvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = detectCtxRef.current;
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, dw, dh);

    let tiles: { id: number }[] = [];
    try {
      const imageData = ctx.getImageData(0, 0, dw, dh);
      const markers = detector.detect(imageData) || [];
      // Only send marker IDs — center coordinates are computed but never used by server
      tiles = markers.map((m: any) => ({ id: m.id }));
    } catch { /* skip bad frame */ }

    const card = tiles.length ? cardByMarker(tiles[0].id) : null;
    // Only update React state when detected card changes (avoid re-render every tick)
    const detectedName = card ? card.name : null;
    if (detectedName !== lastDetectedRef.current) {
      lastDetectedRef.current = detectedName;
      setDetected(detectedName);
    }

    // Use cached socket reference (avoid getSocket() call per tick)
    const socket = socketRef.current;
    const gid = groupRef.current;
    if (!socket || !gid) return;

    // Only emit tiles when they actually changed (dedupe to save socket traffic)
    const tilesKey = tiles.map(t => t.id).join(',');
    if (tilesKey !== lastTilesKeyRef.current) {
      lastTilesKeyRef.current = tilesKey;
      socket.emit('dgcam:tiles', { roomCode, groupId: gid, tiles });
    }

    // ── Stream on full-quality canvas (async toBlob, skip if busy) ────
    // Also enforce TARGET_FPS via wall-clock time
    const now = Date.now();
    const minInterval = 1000 / TARGET_FPS;
    if (!encodingRef.current && now - lastTickRef.current >= minInterval) {
      lastTickRef.current = now;
      encodingRef.current = true;
      // Create/reuse a separate canvas for streaming
      if (!frameCanvasRef.current) {
        frameCanvasRef.current = document.createElement('canvas');
      }
      const fc = frameCanvasRef.current;
      const fw = STREAM_WIDTH;
      const fh = Math.round((vh / vw) * fw);
      if (fc.width !== fw || fc.height !== fh) {
        fc.width = fw; fc.height = fh;
        frameCtxRef.current = null; // reset cached ctx on resize
      }
      // Cache the stream canvas context
      if (!frameCtxRef.current) frameCtxRef.current = fc.getContext('2d');
      const fctx = frameCtxRef.current;
      if (fctx) {
        fctx.drawImage(video, 0, 0, fw, fh);
        fc.toBlob((blob) => {
          encodingRef.current = false;
          if (!blob || !runningRef.current) return;
          // Send Blob directly — Socket.io v4 handles Blob as binary attachment,
          // receiver gets ArrayBuffer. Skips the extra blob.arrayBuffer() async hop.
          socket.compress(false).emit('dgcam:frame', { roomCode, groupId: gid, jpeg: blob });
        }, 'image/jpeg', FRAME_QUALITY);
      } else {
        encodingRef.current = false;
      }
    }
  }, [roomCode]);

  const start = useCallback(async () => {
    if (!roomCode) { setStatus('error'); setErrorMsg('Thiếu mã phòng.'); return; }
    if (!groupId) { setStatus('error'); setErrorMsg('Hãy chọn nhóm của bạn trước.'); return; }
    setStatus('starting'); setErrorMsg('');
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMsg(!window.isSecureContext
          ? 'Trình duyệt chặn camera vì trang chạy qua HTTP. Hãy mở bằng HTTPS (https://<ip>:3443) hoặc localhost.'
          : 'Trình duyệt không hỗ trợ camera.');
        return;
      }
      if (!detectorRef.current) {
        const mod: any = await import('js-aruco2');
        const AR = mod.AR ?? mod.default?.AR ?? mod.default;
        detectorRef.current = new AR.Detector({ dictionaryName: 'ARUCO' });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        // 640×480 ideal: drawImage from 1280p costs 4× more CPU than 640p
        // with zero quality benefit — ArUco quality depends on marker size
        // in the 256px detection canvas, not the source resolution.
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 } },
        audio: false
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      runningRef.current = true;
      setStatus('live');
      // Acquire wake lock to prevent screen from sleeping mid-game
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch { /* permission denied or unsupported, non-fatal */ }
      }
      // Cache socket once (avoids getSocket() call in every loop tick)
      socketRef.current = getSocket();
      // Prefer requestVideoFrameCallback (fires when GPU has new decoded frame)
      // IMPORTANT: gate all work behind minInterval — RVFC fires at video FPS (30fps),
      // we only want to do detection + stream at TARGET_FPS (4fps). Without the gate
      // ArUco would run 30fps which wastes CPU on mobile.
      const minInterval = 1000 / TARGET_FPS;
      const vid = videoRef.current!;
      const useRvfc = typeof (vid as any).requestVideoFrameCallback === 'function';
      if (useRvfc) {
        const scheduleRvfc = () => {
          if (!runningRef.current) return;
          // Only do actual work when enough time has elapsed
          if (Date.now() - lastTickRef.current >= minInterval) loop();
          rvfcRef.current = (vid as any).requestVideoFrameCallback(scheduleRvfc);
        };
        rvfcRef.current = (vid as any).requestVideoFrameCallback(scheduleRvfc);
      } else {
        rafRef.current = setInterval(loop, Math.round(minInterval)) as any;
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.name === 'NotAllowedError' ? 'Bạn đã từ chối quyền camera.' : 'Không mở được camera: ' + (e?.message || 'lỗi'));
    }
  }, [roomCode, groupId, loop]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) clearInterval(rafRef.current);
    rafRef.current = null;
    const vid = videoRef.current;
    if (rvfcRef.current !== null && vid && typeof (vid as any).cancelVideoFrameCallback === 'function') {
      (vid as any).cancelVideoFrameCallback(rvfcRef.current);
    }
    rvfcRef.current = null;
    socketRef.current = null;
    // Release wake lock
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStatus('idle');
    setDetected(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  // Hard block: another device from same group is already connected
  if (alreadyConnected) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface rounded-2xl border border-danger/40 p-8 text-center space-y-4">
          <div className="text-4xl">🚫</div>
          <h2 className="font-display text-xl text-danger">Nhóm đã có camera</h2>
          <p className="text-muted text-sm">
            Một thiết bị khác trong nhóm <b className="text-text">{groupName}</b> đã kết nối camera rồi.<br />
            Mỗi nhóm chỉ được dùng 1 camera.
          </p>
          <p className="text-xs text-muted">Đóng trang này và để người khác trong nhóm giữ điện thoại.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="px-4 py-3 border-b border-border bg-surface">
        <h1 className="font-display text-xl text-primary">📷 Camera nhóm — Đoán thẻ</h1>
        <p className="text-xs text-muted mt-0.5">
          {roomCode ? <>Phòng <span className="font-mono text-secondary">{roomCode}</span></> : 'Chưa có mã phòng'}
          {groupName && <> · nhóm <b>{groupName}</b></>}
        </p>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Loading state */}
        {!groupLoaded && sessionStatus === 'authenticated' && (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted text-center">Đang tải thông tin nhóm…</div>
        )}

        {/* Not in any group */}
        {groupLoaded && !groupId && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 text-danger text-sm px-4 py-3">
            Bạn chưa được phân vào nhóm nào. Hãy vào trang chủ chọn nhóm trước.
          </div>
        )}

        {/* Group OK — show name */}
        {groupId && (
          <div className="rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
            📱 Camera của <span className="text-text">{groupName || groupId}</span>
          </div>
        )}

        {/* Duplicate — hard blocked above, nothing to show here */}

        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-border">
          <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
          {status !== 'live' && (
            <div className="absolute inset-0 grid place-items-center text-white/80 text-sm">
              {status === 'starting' ? 'Đang mở camera…' : 'Camera chưa bật'}
            </div>
          )}
          {status === 'live' && (
            <div className="absolute top-2 left-2 text-[11px] bg-black/50 text-white px-2 py-1 rounded">
              ● LIVE {detected ? `· ${detected}` : '· chưa thấy thẻ'}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {status === 'error' && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 text-danger text-sm px-4 py-3">{errorMsg}</div>
        )}

        <div className="flex gap-3">
          {status !== 'live' ? (
            <button onClick={start} disabled={status === 'starting' || !roomCode || !groupId}
              className="flex-1 rounded-xl bg-primary text-white font-medium py-3 disabled:opacity-50">
              {status === 'starting' ? 'Đang khởi động…' : 'Bật camera & kết nối'}
            </button>
          ) : (
            <button onClick={stop} className="flex-1 rounded-xl bg-danger text-white font-medium py-3">Dừng phát</button>
          )}
        </div>

        <ol className="text-sm text-muted space-y-2 leading-relaxed">
          <li><b className="text-text">1.</b> Khi mô tả hiện trên màn hình chính, giơ thẻ (in mã ArUco) bạn cho là đúng trước camera.</li>
          <li><b className="text-text">2.</b> Tên thẻ nhận diện được sẽ hiện ở đây và trên màn hình quản trò.</li>
          <li><b className="text-text">3.</b> Mỗi nhóm chỉ cần 1 điện thoại bật camera.</li>
        </ol>
      </main>
    </div>
  );
}

export default function DescribeCameraPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-bg text-muted">Đang tải…</div>}>
      <CameraInner />
    </Suspense>
  );
}
