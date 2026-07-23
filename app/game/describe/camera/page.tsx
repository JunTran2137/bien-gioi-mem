'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSocket } from '@/lib/socket-client';

/**
 * /game/describe/camera — per-group camera (phone OR laptop) for the "Luận Giải" game.
 *
 * One device per group. Auto-detects the user's group from session.
 *
 * The device does ZERO recognition — it only captures the webcam and streams
 * two things: a small thumbnail (~5fps) for the host grid, and a sharp frame
 * (~1fps) for the SERVER to OCR. The server reads the card NAME, matches it to
 * a card and drives the guess, then sends the recognised name back here to show.
 * This keeps every device (weak phones included) smooth and lag-free.
 */

const STREAM_WIDTH = 360;    // thumbnail width for the host grid
const FRAME_QUALITY = 0.6;   // thumbnail JPEG quality
const STREAM_FPS = 30;       // smooth live feed on the host grid
const OCR_FRAME_WIDTH = 960; // sharp frame sent to the server for OCR (card text must be legible)
const OCR_FRAME_QUALITY = 0.82;
const OCR_FRAME_FPS = 1.2;   // low rate — the card doesn't change fast; keeps bandwidth + server load low

// A tiny Web Worker whose only job is to fire two heartbeats. Timers inside a
// worker are NOT throttled to ~1/sec the way a background tab's main-thread
// setInterval is — so the feed keeps streaming at full FPS even when this
// camera tab is in the background (e.g. testing host + camera on one machine).
const TICK_WORKER_SRC = `let s=null,o=null;onmessage=(e)=>{const d=e.data;if(d&&d.type==='start'){clearInterval(s);clearInterval(o);s=setInterval(()=>postMessage('s'),d.streamMs);o=setInterval(()=>postMessage('o'),d.ocrMs);}else if(d&&d.type==='stop'){clearInterval(s);clearInterval(o);s=o=null;}};`;

// The real 30fps pipeline: read VideoFrames straight from the camera track via a
// transferred ReadableStream (MediaStreamTrackProcessor) and JPEG-encode them on
// an OffscreenCanvas — ENTIRELY inside the worker. This is decoupled from the
// <video> element's paint rate and from main-thread/timer throttling, so it
// keeps delivering full FPS even when the tab is hidden. The main thread only
// forwards the finished JPEG bytes over the socket.
const CAPTURE_WORKER_SRC = `
let running=false,reader=null,sMs=33,oMs=833,tW=360,tQ=0.6,oW=720,oQ=0.72;
let tCan=null,tCtx=null,oCan=null,oCtx=null,lastT=0,lastO=0;
let camN=0,emitN=0,encSum=0,encCnt=0,statT=0,tBusy=false,oBusy=false;
onmessage=async(e)=>{const d=e.data;
 if(d.type==='config'){sMs=d.sMs;oMs=d.oMs;tW=d.tW;tQ=d.tQ;oW=d.oW;oQ=d.oQ;}
 else if(d.type==='start'){if(running)return;running=true;reader=d.readable.getReader();loop();}
 else if(d.type==='stop'){running=false;try{reader&&reader.cancel();}catch(_){}reader=null;}};
async function loop(){while(running){let res;try{res=await reader.read();}catch(_){break;}if(res.done)break;const frame=res.value;try{const vw=frame.displayWidth||frame.codedWidth,vh=frame.displayHeight||frame.codedHeight;const now=performance.now();camN++;if(now-statT>=1000){postMessage({type:'stats',cam:camN,emit:emitN,enc:encCnt?Math.round(encSum/encCnt):0});camN=0;emitN=0;encSum=0;encCnt=0;statT=now;}if(vw&&vh){if(now-lastT>=sMs&&!tBusy){lastT=now;const w=tW,h=Math.round(vh/vw*w);if(!tCan||tCan.width!==w||tCan.height!==h){tCan=new OffscreenCanvas(w,h);tCtx=tCan.getContext('2d');}tCtx.drawImage(frame,0,0,w,h);tBusy=true;const et0=performance.now();tCan.convertToBlob({type:'image/jpeg',quality:tQ}).then(b=>b.arrayBuffer()).then(buf=>{encSum+=performance.now()-et0;encCnt++;emitN++;postMessage({type:'thumb',buf},[buf]);tBusy=false;}).catch(()=>{tBusy=false;});}if(now-lastO>=oMs&&!oBusy){lastO=now;const cw=vw*0.82,ch=vh*0.56,cx=(vw-cw)/2,cy=(vh-ch)/2;const w=oW,h=Math.round(ch/cw*w);if(!oCan||oCan.width!==w||oCan.height!==h){oCan=new OffscreenCanvas(w,h);oCtx=oCan.getContext('2d');}oCtx.drawImage(frame,cx,cy,cw,ch,0,0,w,h);oBusy=true;oCan.convertToBlob({type:'image/jpeg',quality:oQ}).then(b=>b.arrayBuffer()).then(buf=>{postMessage({type:'ocr',buf},[buf]);oBusy=false;}).catch(()=>{oBusy=false;});}}}finally{frame.close();}}}`;

function CameraInner() {
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase().trim();
  const { status: sessionStatus } = useSession(); // session data not needed, only auth status

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null); // thumbnail canvas
  const frameCtxRef = useRef<CanvasRenderingContext2D | null>(null);  // cached thumbnail ctx
  const ocrCanvasRef = useRef<HTMLCanvasElement | null>(null); // sharp OCR-frame canvas
  const ocrCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const streamTimerRef = useRef<any>(null);   // setInterval handle for the thumbnail relay
  const ocrTimerRef = useRef<any>(null);      // setInterval handle for the OCR-frame relay
  const tickWorkerRef = useRef<Worker | null>(null); // heartbeat worker (survives background-tab throttling)
  const captureWorkerRef = useRef<Worker | null>(null); // 30fps track-processor capture+encode worker
  const runningRef = useRef(false);
  const encodingRef = useRef(false);    // skip thumbnail frame if previous toBlob not done
  const ocrEncodingRef = useRef(false); // skip OCR frame if previous toBlob not done
  const groupRef = useRef<string>('');
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null); // cached socket
  const wakeLockRef = useRef<WakeLockSentinel | null>(null); // prevent screen sleep

  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [groupLoaded, setGroupLoaded] = useState(false);
  const [alreadyConnected, setAlreadyConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [detected, setDetected] = useState<string | null>(null); // card name the server recognised
  const [ocrText, setOcrText] = useState('');                    // raw text the server last read
  const [stat, setStat] = useState<{ cam: number; emit: number; enc: number } | null>(null); // worker capture stats

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

  // ── Thumbnail relay: stream a small JPEG so the host grid shows each group's
  //    live camera. Driven by a wall-clock interval (keeps ticking even when the
  //    <video> scrolls out of view / the tab briefly blurs). ────────────────
  const streamFrame = useCallback(() => {
    if (!runningRef.current || encodingRef.current) return;
    const video = videoRef.current;
    const socket = socketRef.current;
    const gid = groupRef.current;
    if (!video || !socket || !gid || video.readyState < 2) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;
    if (!frameCanvasRef.current) frameCanvasRef.current = document.createElement('canvas');
    const fc = frameCanvasRef.current;
    const fw = STREAM_WIDTH, fh = Math.round((vh / vw) * fw);
    if (fc.width !== fw || fc.height !== fh) { fc.width = fw; fc.height = fh; frameCtxRef.current = null; }
    if (!frameCtxRef.current) frameCtxRef.current = fc.getContext('2d');
    const fctx = frameCtxRef.current;
    if (!fctx) return;
    encodingRef.current = true;
    fctx.drawImage(video, 0, 0, fw, fh);
    fc.toBlob((blob) => {
      encodingRef.current = false;
      if (!blob || !runningRef.current) return;
      // volatile: if the socket buffer is backed up (slow network/CPU), DROP this
      // frame instead of queuing it. Live video must stay near real-time — a
      // growing queue is exactly what makes the feed lag further and further behind.
      socket.volatile.compress(false).emit('dgcam:frame', { roomCode, groupId: gid, jpeg: blob });
    }, 'image/jpeg', FRAME_QUALITY);
  }, [roomCode]);

  // ── OCR-frame relay: a sharp, low-rate frame the SERVER recognises. The card
  //    name must be legible, so this is bigger/higher-quality than the thumbnail
  //    but sent only ~1fps so it barely costs the device anything. ───────────
  const ocrFrame = useCallback(() => {
    if (!runningRef.current || ocrEncodingRef.current) return;
    const video = videoRef.current;
    const socket = socketRef.current;
    const gid = groupRef.current;
    if (!video || !socket || !gid || video.readyState < 2) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;
    if (!ocrCanvasRef.current) ocrCanvasRef.current = document.createElement('canvas');
    const oc = ocrCanvasRef.current;
    const ow = Math.min(OCR_FRAME_WIDTH, vw), oh = Math.round((vh / vw) * ow);
    if (oc.width !== ow || oc.height !== oh) { oc.width = ow; oc.height = oh; ocrCtxRef.current = null; }
    if (!ocrCtxRef.current) ocrCtxRef.current = oc.getContext('2d');
    const octx = ocrCtxRef.current;
    if (!octx) return;
    ocrEncodingRef.current = true;
    octx.drawImage(video, 0, 0, ow, oh);
    oc.toBlob((blob) => {
      ocrEncodingRef.current = false;
      if (!blob || !runningRef.current) return;
      socket.volatile.compress(false).emit('dgcam:ocrframe', { roomCode, groupId: gid, jpeg: blob });
    }, 'image/jpeg', OCR_FRAME_QUALITY);
  }, [roomCode]);

  // Receive the server's recognition result for THIS group and show it.
  useEffect(() => {
    if (!groupId) return;
    const socket = getSocket();
    const onRecognized = (d: { groupId: string; name: string | null; text?: string }) => {
      if (d.groupId !== groupRef.current) return;
      // Keep the last confident name on screen — non-matching frames (blur /
      // mid-move) still arrive with name=null and would otherwise wipe it out,
      // making it look like nothing was ever recognised.
      if (d.name) setDetected(d.name);
      setOcrText(d.text || '');
    };
    socket.on('dg:cameraRecognized', onRecognized);
    return () => { socket.off('dg:cameraRecognized', onRecognized); };
  }, [groupId]);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        // Prefer 1280×720 so the server OCR gets a sharp, legible card name.
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, frameRate: { ideal: 30, max: 60 } },
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
          const wl = await (navigator as any).wakeLock.request('screen');
          // The OS auto-releases the lock whenever the page is hidden; null the
          // ref then so the visibilitychange handler knows to re-acquire it.
          wl.addEventListener?.('release', () => { if (wakeLockRef.current === wl) wakeLockRef.current = null; });
          wakeLockRef.current = wl;
        } catch { /* permission denied or unsupported, non-fatal */ }
      }
      // Cache socket once (avoids getSocket() call in every tick)
      socketRef.current = getSocket();

      // Preferred path: read frames straight from the camera track in a worker
      // (MediaStreamTrackProcessor) and JPEG-encode on an OffscreenCanvas there.
      // This hits a true 30fps and is immune to background-tab throttling, since
      // it never touches a main-thread timer or the <video> paint loop.
      const track = stream.getVideoTracks()[0];
      // Nudge the camera into a 30fps capture mode even if getUserMedia negotiated
      // a slower one (many webcams default to 20-24fps at 720p). Best-effort — the
      // sensor + lighting still cap the real rate, but this switches the mode when
      // a 30fps mode exists. Log the mode actually granted for diagnostics.
      try {
        await track.applyConstraints({ frameRate: { ideal: 30, min: 24 } });
        const s = track.getSettings?.();
        if (s) console.log('[camera] granted mode:', s.width + 'x' + s.height + '@' + Math.round(s.frameRate || 0) + 'fps');
      } catch { /* constraint unsupported — keep whatever mode we got */ }
      const canProcess = typeof (window as any).MediaStreamTrackProcessor !== 'undefined'
        && typeof OffscreenCanvas !== 'undefined'
        && typeof (OffscreenCanvas.prototype as any).convertToBlob === 'function'
        && !!track;

      const startHeartbeatFallback = () => {
        try {
          const blob = new Blob([TICK_WORKER_SRC], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          const w = new Worker(url);
          URL.revokeObjectURL(url);
          w.onmessage = (ev) => { if (ev.data === 's') streamFrame(); else if (ev.data === 'o') ocrFrame(); };
          w.postMessage({ type: 'start', streamMs: Math.round(1000 / STREAM_FPS), ocrMs: Math.round(1000 / OCR_FRAME_FPS) });
          tickWorkerRef.current = w;
        } catch {
          streamTimerRef.current = setInterval(streamFrame, Math.round(1000 / STREAM_FPS));
          ocrTimerRef.current = setInterval(ocrFrame, Math.round(1000 / OCR_FRAME_FPS));
        }
      };

      if (canProcess) {
        try {
          const processor = new (window as any).MediaStreamTrackProcessor({ track });
          const readable = processor.readable;
          const blob = new Blob([CAPTURE_WORKER_SRC], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          const w = new Worker(url);
          URL.revokeObjectURL(url);
          const rc = roomCode;
          w.onmessage = (ev) => {
            const m = ev.data;
            if (m.type === 'stats') { setStat({ cam: m.cam, emit: m.emit, enc: m.enc }); console.log('[camera] cam=' + m.cam + 'fps  emit=' + m.emit + 'fps  enc=' + m.enc + 'ms'); return; }
            const socket = socketRef.current;
            const gid = groupRef.current;
            if (!socket || !runningRef.current || !gid) return;
            if (m.type === 'thumb') socket.volatile.compress(false).emit('dgcam:frame', { roomCode: rc, groupId: gid, jpeg: m.buf });
            else if (m.type === 'ocr') socket.volatile.compress(false).emit('dgcam:ocrframe', { roomCode: rc, groupId: gid, jpeg: m.buf });
          };
          w.postMessage({ type: 'config', sMs: Math.round(1000 / STREAM_FPS), oMs: Math.round(1000 / OCR_FRAME_FPS), tW: STREAM_WIDTH, tQ: FRAME_QUALITY, oW: OCR_FRAME_WIDTH, oQ: OCR_FRAME_QUALITY });
          w.postMessage({ type: 'start', readable }, [readable]);
          captureWorkerRef.current = w;
        } catch {
          startHeartbeatFallback();
        }
      } else {
        startHeartbeatFallback();
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.name === 'NotAllowedError' ? 'Bạn đã từ chối quyền camera.' : 'Không mở được camera: ' + (e?.message || 'lỗi'));
    }
  }, [roomCode, groupId, streamFrame, ocrFrame]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (captureWorkerRef.current) { captureWorkerRef.current.postMessage({ type: 'stop' }); captureWorkerRef.current.terminate(); captureWorkerRef.current = null; }
    if (tickWorkerRef.current) { tickWorkerRef.current.postMessage({ type: 'stop' }); tickWorkerRef.current.terminate(); tickWorkerRef.current = null; }
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    streamTimerRef.current = null;
    if (ocrTimerRef.current) clearInterval(ocrTimerRef.current);
    ocrTimerRef.current = null;
    socketRef.current = null;
    setOcrText('');
    // Release wake lock
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStatus('idle');
    setDetected(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  // When the phone returns to the foreground (user tabbed away, screen slept,
  // notification, etc.) mobile browsers pause the <video> and drop the wake
  // lock. Re-play the stream and re-acquire the lock so the feed keeps flowing
  // without the user having to restart the camera.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible' || !runningRef.current) return;
      try { await videoRef.current?.play(); } catch { /* autoplay guard, non-fatal */ }
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch { /* non-fatal */ }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

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
              ● LIVE {detected ? `· ${detected}` : '· máy chủ đang đọc…'}
            </div>
          )}
          {status === 'live' && stat && (
            <div className="absolute top-2 right-2 text-[11px] font-mono bg-black/50 text-white px-2 py-1 rounded tabular-nums">
              cam {stat.cam} · emit {stat.emit} · enc {stat.enc}ms
            </div>
          )}
          {/* Guide box: OCR only reads THIS centered region (82%×56%). Align the
              card inside it so its text fills the box — dramatically improves reads. */}
          {status === 'live' && (
            <div className="pointer-events-none absolute" style={{ left: '9%', top: '22%', width: '82%', height: '56%' }}>
              <div className={`w-full h-full rounded-lg border-2 border-dashed ${detected ? 'border-primary' : 'border-white/70'}`} />
              <div className="absolute -top-5 left-0 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">Đặt thẻ vừa khung này</div>
            </div>
          )}
        </div>

        {/* Live recognition readout — the server sends back what it read so you can aim/focus the card */}
        {status === 'live' && (
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Chữ đọc được (máy chủ)</div>
            {detected ? (
              <div className="font-semibold text-primary">✓ {detected}</div>
            ) : (
              <div className="font-mono text-xs text-muted break-words min-h-[1rem]">{ocrText || '… đang quét, giơ thẻ vào khung hình'}</div>
            )}
          </div>
        )}

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
          <li><b className="text-text">1.</b> Khi mô tả hiện trên màn hình chính, giơ thẻ (có in <b className="text-text">TÊN thẻ</b>) bạn cho là đúng trước camera.</li>
          <li><b className="text-text">2.</b> Giữ thẻ <b className="text-text">thẳng, rõ nét, đủ sáng</b> — máy chủ nhận diện tên rồi hiện ở đây và trên màn hình quản trò.</li>
          <li><b className="text-text">3.</b> Mỗi nhóm chỉ cần 1 thiết bị (điện thoại hoặc laptop) bật camera.</li>
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
