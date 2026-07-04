'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket-client';
import { cardByMarker } from '@/data/describeCards';

/**
 * /game/describe/camera — per-group phone camera for the "Mô tả & Đoán thẻ" game.
 *
 * One phone per group. When a description is on screen, the group holds up the
 * physical card (printed with an ArUco marker) they think it describes. This
 * page detects the marker in-browser and reports it + a live JPEG to the room,
 * tagged with the group's id, so the host board shows every group's guess.
 */

const DETECT_WIDTH = 480;
const FRAME_QUALITY = 0.5;
const TARGET_FPS = 6;

interface GroupOpt { id: string; name: string }

function CameraInner() {
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase().trim();
  const presetGroup = params.get('group') || '';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastTickRef = useRef(0);
  const groupRef = useRef<string>(presetGroup);

  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [groupId, setGroupId] = useState<string>(presetGroup);
  const [groupName, setGroupName] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => { groupRef.current = groupId; }, [groupId]);

  // load group list for the picker
  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(d => {
      const list: GroupOpt[] = (d?.groups || []).map((g: any) => ({ id: g.id, name: g.name }));
      setGroups(list);
      const found = list.find(g => g.id === presetGroup);
      if (found) setGroupName(found.name);
    }).catch(() => {});
  }, [presetGroup]);

  // announce to room once a group is chosen
  useEffect(() => {
    if (!roomCode || !groupId) return;
    const socket = getSocket();
    const announce = () => socket.emit('dgcam:join', { roomCode, groupId, groupName });
    if (socket.connected) announce();
    socket.on('connect', announce);
    return () => { socket.off('connect', announce); };
  }, [roomCode, groupId, groupName]);

  const loop = useCallback((now: number) => {
    if (!runningRef.current) return;
    rafRef.current = requestAnimationFrame(loop);
    const minGap = 1000 / TARGET_FPS;
    if (now - lastTickRef.current < minGap) return;
    lastTickRef.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;
    if (!video || !canvas || !detector || video.readyState < 2) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;
    const w = DETECT_WIDTH;
    const h = Math.round((vh / vw) * w);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
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
    } catch { /* skip bad frame */ }

    const card = tiles.length ? cardByMarker(tiles[0].id) : null;
    setDetected(card ? card.name : null);

    const socket = getSocket();
    const gid = groupRef.current;
    if (gid) {
      socket.emit('dgcam:tiles', { roomCode, groupId: gid, tiles });
      try {
        const jpeg = canvas.toDataURL('image/jpeg', FRAME_QUALITY);
        socket.emit('dgcam:frame', { roomCode, groupId: gid, jpeg });
      } catch { /* ignore */ }
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
      setErrorMsg(e?.name === 'NotAllowedError' ? 'Bạn đã từ chối quyền camera.' : 'Không mở được camera: ' + (e?.message || 'lỗi'));
    }
  }, [roomCode, groupId, loop]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStatus('idle');
    setDetected(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

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
        {!groupId && (
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <p className="text-sm font-semibold">Chọn nhóm của bạn</p>
            <select
              className="w-full px-3 py-2 rounded-xl border border-border bg-bg"
              value={groupId}
              onChange={e => { setGroupId(e.target.value); setGroupName(groups.find(g => g.id === e.target.value)?.name || ''); }}
            >
              <option value="">— Chọn nhóm —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

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
          <li><b className="text-text">1.</b> Chọn đúng nhóm của bạn ở trên.</li>
          <li><b className="text-text">2.</b> Khi mô tả hiện trên màn hình chính, giơ thẻ (in mã ArUco) bạn cho là đúng trước camera.</li>
          <li><b className="text-text">3.</b> Tên thẻ nhận diện được sẽ hiện ở đây và trên màn hình quản trò.</li>
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
