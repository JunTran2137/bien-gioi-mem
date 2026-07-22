'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socket-client';
import {
  Copy, Check, Users, Trophy, Camera, Flag, Eye, ThumbsUp, ThumbsDown,
  Megaphone, Send, ArrowRight, Crown, Timer, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useDescribeGame } from '@/hooks/useDescribeGame';
import { describeCards } from '@/data/describeCards';
import { cn } from '@/lib/utils';

const GROUP_COLORS = ['#E05C5C', '#4A90D9', '#F4A261', '#2E8B6B', '#9C5BC0', '#F4C542', '#E86AA6', '#3AB0A2'];

function colorForGroup(groupId: string, groups: { groupId: string }[]) {
  const i = Math.max(0, groups.findIndex(g => g.groupId === groupId));
  return GROUP_COLORS[i % GROUP_COLORS.length];
}

export function DescribeRoom() {
  const router = useRouter();
  const { data: session } = useSession();
  const g = useDescribeGame();
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const copyCode = useCallback(() => {
    navigator.clipboard?.writeText(g.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [g.roomCode]);

  const createRoom = useCallback(async () => {
    if (!session) { signIn('google'); return; }
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/describe/session', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.roomCode) throw new Error(data?.error || 'Không tạo được phòng');
      router.push(`/game/describe?room=${data.roomCode}&host=1`);
    } catch (e: any) {
      toast({ title: 'Không tạo được phòng', description: String(e?.message || e), variant: 'danger' });
      setCreating(false);
    }
  }, [session, creating, router]);

  if (!g.roomCode) return <RoleGate creating={creating} onHost={createRoom} />;

  if (g.finished) {
    return <FinishScreen standings={g.finished.standings} winner={g.finished.winner} myGroupId={g.myGroupId} onHome={() => router.push('/game')} onBoard={() => router.push('/leaderboard')} />;
  }

  const groups = g.state?.groups || [];

  return (
    <div className="min-h-screen py-6 px-3 md:px-4 flex justify-center">
      <div className="w-full max-w-[1500px]">
        {/* header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-text flex items-center gap-2">
              <Eye className="text-primary" /> Luận Giải
            </h1>
            <p className="text-muted text-sm mt-0.5">
              {g.phase === 'lobby' && 'Chờ các nhóm vào phòng'}
              {g.phase === 'prepare' && 'Chuẩn bị mô tả'}
              {g.phase === 'reveal' && g.reveal && `Mô tả ${g.reveal.index + 1}/${g.reveal.total}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {g.state?.status === 'playing' && g.isHostMe && (
              <Button variant="outline" size="sm" onClick={g.endGame}>
                <Flag size={15} className="mr-1" /> Kết thúc
              </Button>
            )}
            <button onClick={copyCode} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border hover:shadow-md transition">
              <span className="font-mono font-bold tracking-widest text-primary">{g.roomCode}</span>
              {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-muted" />}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-4">
          <div className="space-y-4">
            {g.phase === 'lobby' && <Lobby g={g} groups={groups} />}
            {g.phase === 'prepare' && <Prepare g={g} groups={groups} />}
            {g.phase === 'reveal' && <RevealStage g={g} groups={groups} />}
          </div>
          {g.phase !== 'lobby' && <Scoreboard groups={groups} myGroupId={g.myGroupId} />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Role gate -------------------------------- */
function RoleGate({ creating, onHost }: { creating: boolean; onHost: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [showRules, setShowRules] = useState(false);

  if (showRules) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-xl p-8 space-y-5">
          <h2 className="font-display text-2xl text-text">Luật chơi — Luận Giải</h2>
          <ol className="space-y-3 text-sm text-text list-decimal list-inside">
            <li><span className="font-semibold">Chuẩn bị (5 phút):</span> Mỗi nhóm được phân ngẫu nhiên 1 người viết. Người đó chọn 3 thẻ vật lý và viết 3 mô tả gợi ý — không được nói thẳng tên thẻ.</li>
            <li><span className="font-semibold">Giơ thẻ:</span> Khi mô tả được hiện, các nhóm khác cầm thẻ mà mình nghĩ là đúng giơ trước camera. Camera tự đọc mã ArUco.</li>
            <li><span className="font-semibold">Đoán đúng:</span> Nhóm đoán đúng +100 điểm. Nhóm viết mô tả bị trừ − 10 điểm cho mỗi nhóm đoán đúng (mô tả dễ quá thì thiệt!).</li>
            <li><span className="font-semibold">Phản đối:</span> Sau khi đáp án được công bố, các nhóm có thể Đồng ý hoặc Phản đối. Nếu có phản đối, quản trò mở vòng phản biện 30 giây.</li>
            <li><span className="font-semibold">Bỏ phiếu:</span> Sau phản biện, tất cả bỏ phiếu chọn thẻ nào đúng. Thẻ được vote nhiều nhất là đáp án chính thức.</li>
          </ol>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowRules(false)}>Quay lại</Button>
            <Button className="flex-1" onClick={onHost} disabled={creating}>
              {creating ? 'Đang tạo phòng…' : 'Tiếp tục'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-xl p-8 space-y-6">
        <div className="text-center">
          <Eye className="mx-auto text-primary mb-2" size={40} />
          <h1 className="font-display text-2xl text-text">Luận Giải</h1>
          <p className="text-muted text-sm mt-1">Mỗi nhóm mô tả thẻ của mình, các nhóm khác giơ thẻ đoán.</p>
        </div>
        <Button className="w-full" onClick={() => setShowRules(true)}>
          Tạo phòng
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" /><span className="text-xs text-muted">hoặc</span><div className="h-px flex-1 bg-border" />
        </div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Nhập mã phòng"
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-bg font-mono tracking-widest uppercase"
          />
          <Button variant="secondary" onClick={() => code.trim() && router.push(`/game/describe?room=${code.trim()}`)}>Vào</Button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Lobby ---------------------------------- */
function Lobby({ g, groups }: { g: any; groups: any[] }) {
  const cameraUrl = (typeof window !== 'undefined' ? window.location.origin : '') +
    `/game/describe/camera?room=${g.roomCode}`;

  const byGroup = useMemo(() => {
    const m: Record<string, any[]> = {};
    (g.players as any[]).forEach(p => { const k = p.groupId || '__no_group__'; (m[k] = m[k] || []).push(p); });
    return m;
  }, [g.players]);

  // Groups that have joined but don't have a camera connected yet
  const missingCamGroups: string[] = Object.keys(byGroup).filter(
    gid => gid !== '__no_group__' && !g.cameras[gid]?.connected
  );
  const myGroupMissingCam = !g.isHostMe && !g.isHost && g.myGroupId !== '__no_group__' && !g.cameras[g.myGroupId]?.connected;

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-5">
      <div className="flex items-center gap-2 text-text font-semibold">
        <Users size={18} className="text-primary" /> {g.players.length} người · {Object.keys(byGroup).length} nhóm
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(byGroup).sort(([, a], [, b]) => {
          const nameA = (a as any[])[0]?.groupName || '';
          const nameB = (b as any[])[0]?.groupName || '';
          return nameA.localeCompare(nameB, 'vi', { numeric: true });
        }).map(([gid, members]) => {
          const camOk = g.cameras[gid]?.connected;
          return (
          <div key={gid} className="rounded-xl border border-border p-3" style={{ borderLeftWidth: 4, borderLeftColor: colorForGroup(gid, groups) }}>
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-text text-sm">{(members as any[])[0]?.groupName || 'Khách'}</div>
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', camOk ? 'bg-primary-soft text-primary' : 'bg-accent/15 text-accent')}>
                {camOk ? '📷 Camera ✓' : '⚠️ Chưa có camera'}
              </span>
            </div>
            <div className="text-xs text-muted">{(members as any[]).map((m: any) => m.name).join(', ')}</div>
          </div>
          );
        })}
      </div>

      {/* Player: my group hasn't connected camera yet */}
      {myGroupMissingCam && (
        <div className="rounded-xl border border-accent/50 bg-accent/10 p-4 text-sm space-y-1">
          <p className="font-semibold text-accent flex items-center gap-1"><Camera size={15} /> Nhóm bạn chưa kết nối camera!</p>
          <p className="text-muted">Mở link sau trên điện thoại và đăng nhập để kết nối:</p>
          <a href={cameraUrl} target="_blank" rel="noopener noreferrer"
            className="font-mono font-medium text-primary underline break-all">{cameraUrl}</a>
        </div>
      )}

      {/* Player: camera connected */}
      {(!g.isHostMe && !g.isHost && !myGroupMissingCam && g.myGroupId !== '__no_group__') && (
        <div className="rounded-xl bg-primary-soft p-3 text-sm text-primary font-medium flex items-center gap-2">
          <Camera size={15} /> Camera nhóm bạn đã kết nối ✓
        </div>
      )}

      {/* Host: list groups without camera */}
      {(g.isHostMe || g.isHost) && missingCamGroups.length > 0 && (
        <div className="rounded-xl border border-accent/50 bg-accent/10 p-4 text-sm">
          <p className="font-semibold text-accent flex items-center gap-1"><Camera size={15} /> {missingCamGroups.length} nhóm chưa kết nối camera</p>
        </div>
      )}

      {(!g.isHostMe && !g.isHost) && (
        <div className="rounded-xl bg-primary-soft p-4 text-sm text-text space-y-2">
          <p className="font-semibold flex items-center gap-1"><Camera size={15} /> Chuẩn bị camera</p>
          <p className="text-muted">Mỗi nhóm mở link sau trên 1 điện thoại và chọn nhóm mình để giơ thẻ khi đoán:</p>
          <a href={cameraUrl} target="_blank" rel="noopener noreferrer"
            className="font-mono text-primary underline break-all">{cameraUrl}</a>
        </div>
      )}

      {(g.isHostMe || g.isHost) ? (
        <Button className="w-full" size="lg" onClick={g.startGame}>Bắt đầu</Button>
      ) : (
        <p className="text-center text-muted text-sm">Chờ quản trò bắt đầu…</p>
      )}
    </div>
  );
}

/* -------------------------------- Prepare --------------------------------- */
function Prepare({ g, groups }: { g: any; groups: any[] }) {
  const perGroup: number = g.state?.descriptionsPerGroup || 3;
  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-text font-semibold">
          <Timer size={18} className="text-accent" /> Thời gian chuẩn bị
        </div>
        <Countdown seconds={g.prepareTimeLeft} big />
      </div>

      {g.amIScribe ? (
        <ScribeForm g={g} perGroup={perGroup} />
      ) : (
        <div className="bg-surface rounded-2xl border border-border p-6 text-center space-y-2">
          <Sparkles className="mx-auto text-primary" />
          <p className="text-text font-semibold">Bạn KHÔNG phải người nhập lần này</p>
          <p className="text-muted text-sm">Hãy cùng nhóm bàn bạc, chọn {perGroup} thẻ và viết mô tả. Một thành viên trong nhóm đang nhập giúp cả nhóm.</p>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-border p-4">
        <p className="text-sm font-semibold text-text mb-2">Tiến độ các nhóm</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {groups.map(gr => {
            const n = g.state?.submissionCounts?.[gr.groupId] || 0;
            return (
              <div key={gr.groupId} className="flex items-center justify-between text-sm rounded-lg border border-border px-3 py-2">
                <span className="text-text">{gr.groupName}</span>
                <span className={cn('font-mono', n >= perGroup ? 'text-primary' : 'text-muted')}>{n}/{perGroup}</span>
              </div>
            );
          })}
        </div>
      </div>

      {(g.isHostMe || g.isHost) && (
        <Button variant="outline" className="w-full" onClick={g.endPrepare}>Kết thúc chuẩn bị sớm →</Button>
      )}
    </div>
  );
}

function ScribeForm({ g, perGroup }: { g: any; perGroup: number }) {
  const [rows, setRows] = useState(() => Array.from({ length: perGroup }, () => ({ text: '', cardId: '' })));
  const [saved, setSaved] = useState(false);
  const setRow = (i: number, patch: Partial<{ text: string; cardId: string }>) => {
    setRows(r => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
    setSaved(false);
  };
  const submit = () => {
    const filled = rows.filter(r => r.text.trim() && r.cardId);
    if (filled.length === 0) { toast({ title: 'Hãy nhập ít nhất 1 mô tả', variant: 'warning' }); return; }
    g.submitDescriptions(filled, (res: any) => {
      if (res?.ok) { setSaved(true); toast({ title: `Đã lưu ${res.count} mô tả`, variant: 'success' }); }
      else toast({ title: 'Không lưu được', description: res?.error, variant: 'danger' });
    });
  };
  return (
    <div className="bg-surface rounded-2xl border-2 border-primary p-5 space-y-4">
      <p className="font-semibold text-text flex items-center gap-2"><Send size={16} className="text-primary" /> Bạn nhập mô tả cho cả nhóm</p>
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Mô tả #{i + 1}</span>
            <select
              value={row.cardId}
              onChange={e => setRow(i, { cardId: e.target.value })}
              className="text-sm px-2 py-1 rounded-lg border border-border bg-bg max-w-[60%]"
            >
              <option value="">— Chọn thẻ —</option>
              {describeCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <textarea
            value={row.text}
            onChange={e => setRow(i, { text: e.target.value })}
            rows={2}
            maxLength={400}
            placeholder="Viết mô tả gợi ý (không nói thẳng tên thẻ)…"
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm resize-none"
          />
        </div>
      ))}
      <Button className="w-full" onClick={submit}>{saved ? 'Đã lưu ✓ — Lưu lại' : 'Lưu mô tả'}</Button>
    </div>
  );
}

/* ------------------------------ Reveal stage ------------------------------ */
function RevealStage({ g, groups }: { g: any; groups: any[] }) {
  const r = g.reveal;
  if (!r) return null;
  const isAuthor = r.authorGroupId === g.myGroupId;
  const revealed = r.subPhase !== 'showing';

  return (
    <div className="space-y-4">
      {/* description card */}
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-secondary">Mô tả của nhóm {r.authorGroupName}</span>
          <span className="text-xs font-mono text-muted">{r.index + 1}/{r.total}</span>
        </div>
        <p className="text-lg md:text-xl text-text leading-relaxed">{r.text}</p>
        {revealed && r.card && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5">
            <Check size={16} className="text-primary" />
            <span className="font-semibold text-text">Đáp án: {r.card.name}</span>
          </div>
        )}
      </div>

      {/* camera grid of the 7 other groups */}
      <CameraGrid g={g} groups={groups} />

      {/* controls / interaction by role */}
      {g.isHostMe ? <HostControls g={g} /> : <PlayerControls g={g} isAuthor={isAuthor} />}
    </div>
  );
}

function CameraGrid({ g, groups }: { g: any; groups: any[] }) {
  const r = g.reveal;
  const ids: string[] = r?.guesserGroupIds || [];
  const guesses = r?.subPhase === 'showing' ? g.liveGuesses : (r?.guesses || {});
  // Decode JPEG off main thread via createImageBitmap, draw to <canvas>
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  // Cache bitmaprenderer contexts (zero-copy transferFromImageBitmap)
  // Use explicit false sentinel to distinguish "queried+unsupported" from "not yet queried"
  const bmpCtxRefs = useRef<Record<string, ImageBitmapRenderingContext | false | null>>({});
  // Per-group decode guard: skip incoming frame if previous createImageBitmap still pending
  const decodingRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const socket = getSocket();
    const onFrame = (d: { groupId: string; jpeg: ArrayBuffer | string }) => {
      if (!(d.jpeg instanceof ArrayBuffer)) return;
      // Drop frame if still decoding previous one for this group (prevent queue buildup)
      if (decodingRef.current[d.groupId]) return;
      const canvas = canvasRefs.current[d.groupId];
      if (!canvas) return;
      const blob = new Blob([d.jpeg], { type: 'image/jpeg' });
      if (typeof createImageBitmap !== 'undefined') {
        decodingRef.current[d.groupId] = true;
        // colorSpaceConversion:'none' skips sRGB→display conversion (not needed for thumbnails)
        // premultiplyAlpha:'none' skips alpha processing (JPEG has no alpha)
        createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).then(bmp => {
          decodingRef.current[d.groupId] = false;
          const cv = canvasRefs.current[d.groupId];
          if (!cv) { bmp.close(); return; }
          // Use bitmaprenderer for zero-copy transfer (faster than drawImage)
          // bmpCtxRefs stores: null = not queried, false = queried+unsupported, context = supported
          let bmpCtx = bmpCtxRefs.current[d.groupId];
          if (bmpCtx === null || bmpCtx === undefined) {
            const ctx = cv.getContext('bitmaprenderer') as ImageBitmapRenderingContext | null;
            bmpCtx = ctx ?? false; // false = unsupported, avoid repeated getContext calls
            bmpCtxRefs.current[d.groupId] = bmpCtx;
          }
          if (bmpCtx) {
            bmpCtx.transferFromImageBitmap(bmp); // zero-copy, bmp is consumed
          } else {
            // Fallback to 2d drawImage
            if (cv.width !== bmp.width || cv.height !== bmp.height) {
              cv.width = bmp.width; cv.height = bmp.height;
            }
            cv.getContext('2d')?.drawImage(bmp, 0, 0);
            bmp.close();
          }
        }).catch(() => { decodingRef.current[d.groupId] = false; });
      } else {
        // Fallback: draw via Image — revoke previous URL to prevent memory leak
        const prev = (canvas as any).__objUrl as string | undefined;
        if (prev) URL.revokeObjectURL(prev);
        const url = URL.createObjectURL(blob);
        (canvas as any).__objUrl = url;
        const img = new Image();
        img.onload = () => {
          const cv = canvasRefs.current[d.groupId];
          if (!cv) return;
          if (cv.width !== img.naturalWidth) cv.width = img.naturalWidth;
          if (cv.height !== img.naturalHeight) cv.height = img.naturalHeight;
          cv.getContext('2d')?.drawImage(img, 0, 0);
        };
        img.src = url;
      }
    };
    socket.on('dg:cameraFrame', onFrame);
    return () => { socket.off('dg:cameraFrame', onFrame); };
  }, []);
  return (
    <div>
      <p className="text-sm font-semibold text-text mb-2 flex items-center gap-1"><Camera size={15} /> Các nhóm giơ thẻ đoán</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {ids.map(gid => {
          const cam = g.cameras[gid];
          const guess = guesses[gid];
          const correct = guess?.correct;
          return (
            <div key={gid} className={cn(
              'rounded-xl overflow-hidden border bg-black/80 relative aspect-[4/3]',
              correct === true ? 'border-primary border-2' : correct === false ? 'border-danger border-2' : 'border-border'
            )}>
              <canvas
                ref={el => { canvasRefs.current[gid] = el; }}
                className={cn('w-full h-full object-cover', cam?.connected ? '' : 'hidden')}
              />
              {!cam?.connected && (
                <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
                  Chưa kết nối camera
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                <div className="text-white text-xs font-semibold truncate">{g.groupNameMap[gid] || 'Nhóm'}</div>
                {guess && (
                  <div className={cn('text-[11px] truncate', correct === true ? 'text-emerald-300' : correct === false ? 'text-red-300' : 'text-white/80')}>
                    → {guess.cardName}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HostControls({ g }: { g: any }) {
  const r = g.reveal;
  const sub = r.subPhase;
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
      {sub === 'showing' && (
        <Button className="w-full" size="lg" onClick={g.revealAnswer}>
          <Eye size={18} className="mr-1" /> Công bố đáp án
        </Button>
      )}

      {sub === 'revealed' && (
        <div className="space-y-3">
          <StanceSummary g={g} />
          {g.state?.anyDisagree && (
            <div className="rounded-xl border-2 border-danger bg-danger/5 p-3 space-y-2">
              <p className="text-sm font-semibold text-danger flex items-center gap-1"><Megaphone size={15} /> Có nhóm phản đối!</p>
              <Button variant="secondary" className="w-full" onClick={g.startRebuttal}>Bắt đầu phản biện (30s)</Button>
            </div>
          )}
          <Button className="w-full" onClick={g.next}><ArrowRight size={16} className="mr-1" /> Câu tiếp theo</Button>
        </div>
      )}

      {sub === 'rebuttal' && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted">Vòng phản biện {r.rebuttalRound}</p>
          <Countdown seconds={g.rebuttalTimeLeft} big />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={g.startRebuttal}>Tiếp tục</Button>
            <Button className="flex-1" onClick={g.endRebuttal}>Kết thúc</Button>
          </div>
        </div>
      )}

      {sub === 'voting' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-text flex items-center gap-1"><Trophy size={15} className="text-accent" /> Kết quả bỏ phiếu</p>
          <VoteTally tally={r.voteTally || []} />
          <Button className="w-full" onClick={g.next}><Check size={16} className="mr-1" /> Chốt đáp án được vote nhiều nhất</Button>
        </div>
      )}
    </div>
  );
}

function StanceSummary({ g }: { g: any }) {
  const stances: Record<string, string> = g.reveal?.stances || {};
  const entries = Object.entries(stances);
  if (!entries.length) return <p className="text-sm text-muted">Đang chờ các nhóm bấm Đồng ý / Phản đối…</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([gid, s]) => (
        <span key={gid} className={cn('text-xs px-2 py-1 rounded-full', s === 'disagree' ? 'bg-danger/10 text-danger' : 'bg-primary-soft text-primary')}>
          {g.groupNameMap[gid] || 'Nhóm'}: {s === 'disagree' ? 'Phản đối' : 'Đồng ý'}
        </span>
      ))}
    </div>
  );
}

function VoteTally({ tally }: { tally: { cardId: string; cardName: string; count: number }[] }) {
  const max = Math.max(1, ...tally.map(t => t.count));
  if (!tally.length) return <p className="text-sm text-muted">Chưa có phiếu nào.</p>;
  return (
    <div className="space-y-1.5">
      {tally.map(t => (
        <div key={t.cardId} className="flex items-center gap-2">
          <span className="text-sm text-text w-40 truncate">{t.cardName}</span>
          <div className="flex-1 h-4 rounded-full bg-bg overflow-hidden border border-border">
            <div className="h-full bg-secondary" style={{ width: `${(t.count / max) * 100}%` }} />
          </div>
          <span className="text-sm font-mono text-muted w-6 text-right">{t.count}</span>
        </div>
      ))}
    </div>
  );
}

function PlayerControls({ g, isAuthor }: { g: any; isAuthor: boolean }) {
  const r = g.reveal;
  const sub = r.subPhase;
  const myGuess = (sub === 'showing' ? g.liveGuesses : r.guesses)?.[g.myGroupId];

  if (sub === 'showing') {
    return (
      <div className="bg-surface rounded-2xl border border-border p-5 text-center space-y-2">
        {isAuthor ? (
          <p className="text-text font-semibold">Đây là mô tả của nhóm bạn — chờ các nhóm khác đoán.</p>
        ) : (
          <>
            <Camera className="mx-auto text-primary" />
            <p className="text-text font-semibold">Giơ thẻ bạn cho là đúng trước camera của nhóm</p>
            {myGuess && <p className="text-sm text-muted">Đang nhận diện: <span className="font-semibold text-text">{myGuess.cardName}</span></p>}
          </>
        )}
      </div>
    );
  }

  if (sub === 'revealed') {
    return (
      <div className="bg-surface rounded-2xl border border-border p-5 space-y-3 text-center">
        {isAuthor ? (
          <p className="text-muted text-sm">Chờ các nhóm phản hồi…</p>
        ) : (
          <>
            <p className="text-text font-semibold">Bạn có đồng ý với đáp án không?</p>
            {g.myStance ? (
              <p className="text-sm text-muted">Nhóm bạn đã chọn: <b>{g.myStance === 'disagree' ? 'Phản đối' : 'Đồng ý'}</b></p>
            ) : (
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={() => g.setStance('agree')}><ThumbsUp size={16} className="mr-1" /> Đồng ý</Button>
                <Button variant="outline" className="border-danger text-danger" onClick={() => g.setStance('disagree')}><ThumbsDown size={16} className="mr-1" /> Phản đối</Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (sub === 'rebuttal') {
    return (
      <div className="bg-surface rounded-2xl border border-border p-5 text-center space-y-2">
        <Megaphone className="mx-auto text-secondary" />
        <p className="text-text font-semibold">Đang phản biện (vòng {r.rebuttalRound})</p>
        <Countdown seconds={g.rebuttalTimeLeft} />
      </div>
    );
  }

  if (sub === 'voting') {
    return <VotePopup g={g} />;
  }

  return null;
}

function VotePopup({ g }: { g: any }) {
  const [picked, setPicked] = useState('');
  const [done, setDone] = useState(false);
  const submit = () => {
    if (!picked) { toast({ title: 'Chọn một thẻ để bỏ phiếu', variant: 'warning' }); return; }
    g.vote(picked);
    setDone(true);
    toast({ title: 'Đã bỏ phiếu', variant: 'success' });
  };
  return (
    <div className="bg-surface rounded-2xl border-2 border-secondary p-5 space-y-3">
      <p className="font-semibold text-text flex items-center gap-2"><Trophy size={16} className="text-accent" /> Bỏ phiếu đáp án đúng</p>
      <select value={picked} onChange={e => { setPicked(e.target.value); setDone(false); }} className="w-full px-3 py-2 rounded-xl border border-border bg-bg">
        <option value="">— Chọn thẻ bạn cho là đúng —</option>
        {describeCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Button className="w-full" onClick={submit}>{done ? 'Đổi phiếu' : 'Gửi phiếu'}</Button>
      <VoteTally tally={g.reveal?.voteTally || []} />
    </div>
  );
}

/* ------------------------------ Scoreboard -------------------------------- */
function Scoreboard({ groups, myGroupId }: { groups: any[]; myGroupId: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 h-fit lg:sticky lg:top-4">
      <p className="font-semibold text-text mb-3 flex items-center gap-2"><Trophy size={16} className="text-accent" /> Bảng điểm</p>
      <div className="space-y-1.5">
        <AnimatePresence>
          {groups.map((gr, i) => (
            <motion.div
              key={gr.groupId}
              layout
              className={cn('flex items-center justify-between rounded-lg px-3 py-2 text-sm', gr.groupId === myGroupId ? 'bg-primary-soft' : 'bg-bg')}
            >
              <span className="flex items-center gap-2 text-text">
                <span className="w-5 text-center font-mono text-muted">{i + 1}</span>
                {gr.groupName}
                {gr.groupId === myGroupId && <span className="text-[10px] text-primary">(bạn)</span>}
              </span>
              <span className="font-mono font-bold text-primary">{gr.score}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {!groups.length && <p className="text-muted text-sm">Chưa có nhóm nào.</p>}
      </div>
    </div>
  );
}

/* -------------------------------- Finish ---------------------------------- */
function FinishScreen({ standings, winner, myGroupId, onHome, onBoard }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-surface rounded-2xl border border-border shadow-xl p-8 text-center space-y-5">
        <Crown className="mx-auto text-accent" size={48} />
        <h1 className="font-display text-3xl text-text">Kết thúc!</h1>
        {winner && <p className="text-lg text-text">Nhóm vô địch: <b className="text-primary">{winner.groupName}</b> ({winner.score} điểm)</p>}
        <div className="space-y-1.5 text-left">
          {standings.map((gr: any, i: number) => (
            <div key={gr.groupId} className={cn('flex items-center justify-between rounded-lg px-3 py-2', gr.groupId === myGroupId ? 'bg-primary-soft' : 'bg-bg')}>
              <span className="text-text">{i + 1}. {gr.groupName}</span>
              <span className="font-mono font-bold text-primary">{gr.score}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onHome}>Về sảnh</Button>
          <Button className="flex-1" onClick={onBoard}>Bảng xếp hạng</Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- helpers --------------------------------- */
function Countdown({ seconds, big }: { seconds: number; big?: boolean }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const danger = seconds <= 10;
  return (
    <motion.span
      animate={{ scale: danger ? [1, 1.08, 1] : 1 }}
      transition={{ repeat: danger ? Infinity : 0, duration: 1 }}
      className={cn('font-mono font-bold', big ? 'text-3xl' : 'text-xl', danger ? 'text-danger' : 'text-text')}
    >
      {m}:{String(s).padStart(2, '0')}
    </motion.span>
  );
}
