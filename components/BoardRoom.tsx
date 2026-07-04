'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Dice5, Trophy, Users, Copy, Check, ArrowRight, Sparkles,
  HelpCircle, Camera, Crown, Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useSocket } from '@/hooks/useSocket';
import { useGroup } from '@/hooks/useGroup';
import { boardTiles, BOARD_SIZE } from '@/data/boardData';
import { cn } from '@/lib/utils';

interface Player {
  uid: string; name: string; avatar: string | null;
  groupId: string | null; groupName: string | null;
}
interface Group {
  groupId: string; groupName: string; score: number; position: number; skipNext: boolean;
}
interface BoardState {
  status: 'waiting' | 'playing' | 'finished';
  phase: string;
  round: number;
  maxRounds: number;
  turnOrder: string[];
  activeGroupId: string | null;
  groups: Group[];
}
interface Question {
  id: string; question: string; options: [string, string, string, string];
  durationSec: number; deadline: number; activeGroupId: string; round: number;
}
interface AnswerResult {
  groupId: string; correct: boolean; correctIndex: number | null;
  explanation: string; chosen?: number; answeredBy?: string; timedOut?: boolean;
}
interface MoveEvent {
  groupId: string; groupName: string; from: number; to: number; steps: number; passedGo: boolean;
}
interface ResolveEvent {
  groupId: string; groupName: string; tileIndex: number; tileType: string;
  tileLabel: string; scoreDelta: number; newScore: number; passedGo: boolean;
  card: { text: string } | null;
}
interface CameraTile { id: number; center: { x: number; y: number } }

const TILE_COLOR: Record<string, string> = {
  start: '#2E8B6B',
  question: '#4A90D9',
  bonus: '#F4A261',
  penalty: '#E05C5C',
  lucky: '#9C5BC0',
  skip: '#6B7D74',
  move: '#F4C542'
};
const TILE_ICON: Record<string, string> = {
  start: '🏁', question: '❓', bonus: '➕', penalty: '➖',
  lucky: '🎲', skip: '⏭️', move: '↪️'
};
const GROUP_PIECE_COLORS = ['#E05C5C', '#4A90D9', '#F4A261', '#2E8B6B', '#9C5BC0', '#F4C542'];

// Board is drawn as a landscape rectangle ring to match a widescreen ratio.
// 11 columns × 7 rows → 2*(11-1) + 2*(7-1) = 32 perimeter tiles (= BOARD_SIZE).
const BOARD_COLS = 11;
const BOARD_ROWS = 7;

/** Map tile index 0..23 to a cell on the portrait perimeter ring (row, col). */
function idxToCell(i: number): { row: number; col: number } {
  const C = BOARD_COLS, R = BOARD_ROWS;
  const n = ((i % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  if (n <= C - 1) return { row: 0, col: n };                              // top
  if (n <= C - 1 + (R - 1)) return { row: n - (C - 1), col: C - 1 };      // right
  if (n <= 2 * (C - 1) + (R - 1)) return { row: R - 1, col: (2 * (C - 1) + (R - 1)) - n }; // bottom
  return { row: (2 * (C - 1) + 2 * (R - 1)) - n, col: 0 };                // left
}

export function BoardRoom() {
  const router = useRouter();
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase();
  const isHost = params.get('host') === '1';
  const { data: session, status } = useSession();
  const { user } = useGroup();
  const { socket, connected } = useSocket();

  const uid = (session?.user as any)?.uid as string | undefined;
  const myGroupId = user?.groupId || '__no_group__';

  const [players, setPlayers] = useState<Player[]>([]);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [state, setState] = useState<BoardState | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [diceSent, setDiceSent] = useState(false);
  const [lastMove, setLastMove] = useState<MoveEvent | null>(null);
  const [lastResolve, setLastResolve] = useState<ResolveEvent | null>(null);
  const [turnBanner, setTurnBanner] = useState<{ groupName: string; round: number } | null>(null);
  const [finished, setFinished] = useState<{ standings: Group[]; winner: Group | null } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  // camera
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFrame, setCameraFrame] = useState<string | null>(null);
  const [cameraTiles, setCameraTiles] = useState<CameraTile[]>([]);

  const activeGroupId = state?.activeGroupId || null;
  const isMyTurn = activeGroupId === myGroupId;
  const phase = state?.phase || 'lobby';
  const gameStatus = state?.status || 'waiting';

  /* ---- auth guard (no redirect — RoleGate shows the popup when there is no room) ---- */
  useEffect(() => {
    if (status === 'loading') return;
    if (roomCode && !session) {
      toast({ title: 'Cần đăng nhập trước', variant: 'warning' });
      signIn('google');
    }
  }, [status, session, roomCode]);

  /* ---- join room ---- */
  useEffect(() => {
    if (!socket || !connected || !uid || !user || !roomCode) return;
    let cancelled = false;
    let attempt = 0;
    const MAX_ATTEMPTS = 6;
    const doJoin = () => {
      if (cancelled) return;
      socket.emit('board:join', {
        roomCode, uid,
        name: session?.user?.name || 'Người chơi',
        avatar: session?.user?.image,
        groupId: user.groupId,
        groupName: user.groupName,
      }, (res: any) => {
        if (cancelled) return;
        if (!res?.ok) {
          // Room may be briefly gone (host re-creating after a reload / server
          // restart). Retry before giving up so players are not kicked out.
          attempt += 1;
          if (isHost) {
            socket.emit('board:create', { hostUid: uid, roomCode }, () => {
              setTimeout(doJoin, 400);
            });
            return;
          }
          if (attempt < MAX_ATTEMPTS) {
            setTimeout(doJoin, 1200);
            return;
          }
          toast({ title: 'Không vào được phòng', description: res?.error || 'Phòng không tồn tại', variant: 'danger' });
          router.replace('/game?play=quiz');
          return;
        }
        setHostUid(res.hostUid);
        setPlayers(res.players);
        setState(res.state);
      });
    };
    if (isHost) socket.emit('board:create', { hostUid: uid, roomCode }, () => doJoin());
    else doJoin();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, uid, user?.groupId, roomCode]);

  /* ---- socket events ---- */
  useEffect(() => {
    if (!socket) return;
    const onPlayers = (l: Player[]) => setPlayers(l);
    const onState = (s: BoardState) => setState(s);
    const onStarted = (s: BoardState) => { setState(s); setFinished(null); };
    const onTurn = (d: { activeGroupId: string; groupName: string; round: number }) => {
      setTurnBanner({ groupName: d.groupName, round: d.round });
      setSelected(null); setAnswerResult(null); setDiceValue(null); setDiceSent(false);
      setLastResolve(null);
    };
    const onQuestion = (q: Question) => {
      setQuestion(q); setSelected(null); setAnswerResult(null);
    };
    const onAnswerResult = (r: AnswerResult) => {
      setAnswerResult(r);
      if (r.correct && r.groupId === myGroupId) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
    };
    const onAwaitDice = () => { /* phase comes via state too */ };
    const onSkipped = (d: { groupName: string }) => {
      toast({ title: `${d.groupName} bị mất lượt`, description: 'Hải quan giữ lại 🚧', variant: 'warning' });
    };
    const onMove = (m: MoveEvent) => setLastMove(m);
    const onResolve = (r: ResolveEvent) => {
      setLastResolve(r);
      const sign = r.scoreDelta >= 0 ? '+' : '';
      if (r.card) {
        toast({ title: '🎲 Vận May', description: r.card.text, variant: r.scoreDelta >= 0 ? 'success' : 'danger' });
      } else if (r.scoreDelta !== 0) {
        toast({
          title: `${r.groupName}: ${sign}${r.scoreDelta} điểm`,
          description: r.tileLabel,
          variant: r.scoreDelta >= 0 ? 'success' : 'danger'
        });
      }
    };
    const onFinished = (d: { standings: Group[]; winner: Group | null }) => {
      setFinished(d);
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
    };
    const onCamStatus = (d: { connected: boolean }) => {
      setCameraOn(d.connected);
      if (!d.connected) { setCameraFrame(null); setCameraTiles([]); }
    };
    const onCamFrame = (d: { jpeg: string }) => setCameraFrame(d.jpeg);
    const onCamTiles = (d: { tiles: CameraTile[] }) => setCameraTiles(d.tiles || []);

    socket.on('board:players', onPlayers);
    socket.on('board:state', onState);
    socket.on('board:started', onStarted);
    socket.on('board:turn', onTurn);
    socket.on('board:question', onQuestion);
    socket.on('board:answerResult', onAnswerResult);
    socket.on('board:awaitDice', onAwaitDice);
    socket.on('board:turnSkipped', onSkipped);
    socket.on('board:move', onMove);
    socket.on('board:resolve', onResolve);
    socket.on('board:finished', onFinished);
    socket.on('board:cameraStatus', onCamStatus);
    socket.on('board:cameraFrame', onCamFrame);
    socket.on('board:cameraTiles', onCamTiles);
    return () => {
      socket.off('board:players', onPlayers);
      socket.off('board:state', onState);
      socket.off('board:started', onStarted);
      socket.off('board:turn', onTurn);
      socket.off('board:question', onQuestion);
      socket.off('board:answerResult', onAnswerResult);
      socket.off('board:awaitDice', onAwaitDice);
      socket.off('board:turnSkipped', onSkipped);
      socket.off('board:move', onMove);
      socket.off('board:resolve', onResolve);
      socket.off('board:finished', onFinished);
      socket.off('board:cameraStatus', onCamStatus);
      socket.off('board:cameraFrame', onCamFrame);
      socket.off('board:cameraTiles', onCamTiles);
    };
  }, [socket, myGroupId]);

  /* ---- question timer ---- */
  useEffect(() => {
    if (!question || phase !== 'question') return;
    const tick = () => setTimeLeft(Math.max(0, Math.round((question.deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [question, phase]);

  /* ---- actions (host drives the shared board) ---- */
  const startGame = () => {
    if (!socket) return;
    const distinctGroups = new Set(players.map(p => p.groupId || '__no_group__'));
    if (distinctGroups.size < 2 && !confirm('Cần ít nhất 2 nhóm để thi đấu hấp dẫn. Vẫn bắt đầu?')) return;
    socket.emit('board:start', { roomCode, uid });
  };
  const pickGroup = (groupId: string) => {
    if (!socket || !isHostMe || phase !== 'selecting') return;
    socket.emit('board:pickGroup', { roomCode, uid, groupId });
  };
  const answer = (i: number) => {
    if (!socket || !isHostMe || phase !== 'question' || selected !== null) return;
    setSelected(i);
    socket.emit('board:answer', { roomCode, uid, answer: i });
  };
  const exitQuestion = () => {
    if (!socket || !isHostMe || phase !== 'revealed') return;
    socket.emit('board:exitQuestion', { roomCode, uid });
  };
  const sendDice = () => {
    if (!socket || !isHostMe || phase !== 'awaitDice' || diceValue == null || diceSent) return;
    setDiceSent(true);
    socket.emit('board:dice', { roomCode, uid, value: diceValue });
  };
  const endGame = () => {
    if (!socket || !isHostMe) return;
    if (!confirm('Kết thúc trò chơi và tổng kết điểm?')) return;
    socket.emit('board:end', { roomCode, uid });
  };

  const copyCode = useCallback(() => {
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [roomCode]);

  const createRoom = useCallback(async () => {
    if (!session) { signIn('google'); return; }
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/quiz/session', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.roomCode) throw new Error(data?.error || 'Không tạo được phòng');
      router.push(`/game?play=quiz&room=${data.roomCode}&host=1`);
    } catch (e: any) {
      toast({ title: 'Không tạo được phòng', description: String(e?.message || e), variant: 'danger' });
      setCreating(false);
    }
  }, [session, creating, router]);

  const isHostMe = uid != null && uid === hostUid;
  const activeGroupName = useMemo(
    () => state?.groups.find(g => g.groupId === activeGroupId)?.groupName || '—',
    [state, activeGroupId]
  );
  const groupColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    (state?.turnOrder || []).forEach((gid, i) => { m[gid] = GROUP_PIECE_COLORS[i % GROUP_PIECE_COLORS.length]; });
    return m;
  }, [state?.turnOrder]);

  /* =============================== RENDER =============================== */

  if (!roomCode) {
    return <RoleGate creating={creating} onHost={createRoom} />;
  }

  if (finished) {
    return <FinishScreen standings={finished.standings} winner={finished.winner} myGroupId={myGroupId} onExit={() => router.push('/leaderboard')} onHome={() => router.push('/game')} />;
  }

  return (
    <div className="min-h-screen py-6 px-4 flex items-center justify-center">
      <div className="w-[98vw] max-w-[1600px] bg-bg rounded-2xl border border-border shadow-2xl px-4 py-6 md:px-8">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl text-text flex items-center gap-2">
            <Dice5 className="text-primary" /> Đại Sứ Tri Thức — Cờ Tỷ Phú
          </h1>
          {gameStatus === 'playing' && state && (
            <p className="text-muted text-sm mt-1">
              Lượt {state.round} · {activeGroupId ? <>Nhóm <span className="font-semibold text-text">{activeGroupName}</span></> : 'Chọn nhóm để ra câu hỏi'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {gameStatus === 'playing' && isHostMe && (
            <Button variant="outline" size="sm" onClick={endGame}>
              <Flag size={15} className="mr-1" /> Kết thúc
            </Button>
          )}
          <button onClick={copyCode} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border hover:shadow-md transition">
            <span className="font-mono font-bold tracking-widest text-primary">{roomCode}</span>
            {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-muted" />}
          </button>
        </div>
      </div>

      {gameStatus === 'waiting' ? (
        <Lobby
          players={players}
          roomCode={roomCode}
          isHostMe={isHostMe}
          cameraOn={cameraOn}
          cameraFrame={cameraFrame}
          cameraTiles={cameraTiles}
          groups={state?.groups || []}
          groupColorMap={groupColorMap}
          onStart={startGame}
        />
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          {/* camera + stage */}
          <div className="space-y-4">
            <BoardView
              groups={state?.groups || []}
              groupColorMap={groupColorMap}
              activeGroupId={activeGroupId}
              cameraOn={cameraOn}
              cameraFrame={cameraFrame}
              cameraTiles={cameraTiles}
            />

            {phase === 'selecting' && (
              <GroupPicker
                groups={state?.groups || []}
                groupColorMap={groupColorMap}
                isHost={isHostMe}
                onPick={pickGroup}
              />
            )}

            {(phase === 'question' || phase === 'revealed') && (
              <QuestionCard
                phase={phase}
                question={question}
                selected={selected}
                answerResult={answerResult}
                timeLeft={timeLeft}
                activeGroupName={activeGroupName}
                isHost={isHostMe}
                onAnswer={answer}
                onExit={exitQuestion}
              />
            )}

            {(phase === 'moving' || phase === 'resolve') && lastResolve && (
              <ResolveCard lastResolve={lastResolve} />
            )}
          </div>

          {/* scoreboard */}
          <Scoreboard
            groups={state?.groups || []}
            groupColorMap={groupColorMap}
            activeGroupId={activeGroupId}
            myGroupId={myGroupId}
          />
        </div>
      )}
      </div>

      {/* Dice popup — appears after a correct answer when the host taps Thoát */}
      <AnimatePresence>
        {phase === 'awaitDice' && (
          <DiceModal
            isHost={isHostMe}
            activeGroupName={activeGroupName}
            answerResult={answerResult}
            diceValue={diceValue}
            diceSent={diceSent}
            setDiceValue={setDiceValue}
            onSend={sendDice}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ RoleGate ----------------------------- */
function PopupShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-bg rounded-2xl border border-border shadow-2xl p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-text flex items-center justify-center gap-2">
            <Dice5 className="text-primary" /> {title}
          </h1>
          {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function RoleGate({ creating, onHost }: { creating: boolean; onHost: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [code, setCode] = useState('');

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) { toast({ title: 'Nhập mã phòng hợp lệ', variant: 'warning' }); return; }
    if (!session) { signIn('google'); return; }
    router.push(`/game?play=quiz&room=${c}`);
  };

  return (
    <PopupShell title="Đại Sứ Tri Thức — Cờ Tỷ Phú" subtitle="Bạn tham gia với vai trò nào?">
      {mode === 'choose' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={onHost}
            disabled={creating}
            className="group rounded-2xl border border-border bg-surface p-5 text-left transition hover:shadow-md hover:border-primary disabled:opacity-60"
          >
            <Crown className="text-accent mb-3" size={28} />
            <div className="font-display text-lg text-text">Chủ trò</div>
            <p className="text-sm text-muted mt-1">Tạo phòng, hiện mã QR và quản lý người chơi từng nhóm.</p>
            <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold mt-3">
              {creating ? 'Đang tạo phòng…' : <>Tạo phòng <ArrowRight size={16} /></>}
            </span>
          </button>
          <button
            onClick={() => setMode('join')}
            className="group rounded-2xl border border-border bg-surface p-5 text-left transition hover:shadow-md hover:border-secondary"
          >
            <Users className="text-secondary mb-3" size={28} />
            <div className="font-display text-lg text-text">Người chơi</div>
            <p className="text-sm text-muted mt-1">Nhập mã phòng do chủ trò cung cấp để tham gia.</p>
            <span className="inline-flex items-center gap-1 text-secondary text-sm font-semibold mt-3">
              Nhập mã <ArrowRight size={16} />
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Mã phòng</label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') join(); }}
              maxLength={6}
              placeholder="VD: XK8F2"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-lg tracking-widest text-center text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setMode('choose')}>Quay lại</Button>
            <Button className="flex-1" onClick={join}>Vào phòng <ArrowRight size={16} className="ml-1" /></Button>
          </div>
        </div>
      )}
    </PopupShell>
  );
}

/* ------------------------------- Lobby ------------------------------- */
function Lobby({ players, roomCode, isHostMe, cameraOn, cameraFrame, cameraTiles, groups, groupColorMap, onStart }:
  {
    players: Player[]; roomCode: string; isHostMe: boolean; cameraOn: boolean;
    cameraFrame: string | null; cameraTiles: CameraTile[];
    groups: Group[]; groupColorMap: Record<string, string>; onStart: () => void;
  }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // The camera page needs a secure context (HTTPS) on phones. The host PC is on
  // http://localhost, so build the camera link from the LAN IP + HTTPS port that
  // the server reports. Players join over the LAN HTTP URL.
  const [net, setNet] = useState<{ lanIp: string | null; httpPort: number; httpsPort: number; httpsEnabled: boolean } | null>(null);
  useEffect(() => {
    fetch('/api/netinfo').then(r => r.json()).then(setNet).catch(() => {});
  }, []);

  const cameraBase = useMemo(() => {
    if (net?.lanIp && net.httpsEnabled) return `https://${net.lanIp}:${net.httpsPort}`;
    return origin;
  }, [net, origin]);
  const joinBase = useMemo(() => {
    if (net?.lanIp) return `http://${net.lanIp}:${net.httpPort}`;
    return origin;
  }, [net, origin]);

  const cameraUrl = `${cameraBase}/camera?room=${roomCode}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(cameraUrl)}`;
  const joinUrl = `${joinBase}/game?play=quiz&room=${roomCode}`;
  const joinQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;

  const grouped = useMemo(() => {
    const m = new Map<string, Player[]>();
    players.forEach(p => {
      const k = p.groupName || 'Khách';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    });
    return Array.from(m.entries());
  }, [players]);

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-[1fr_280px] gap-5">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h2 className="font-display text-xl mb-4 flex items-center gap-2"><Users size={20} className="text-primary" /> Người chơi ({players.length})</h2>          <div className="grid sm:grid-cols-2 gap-3">
            {grouped.map(([name, ps]) => (
              <div key={name} className="rounded-xl border border-border p-3">
                <div className="font-semibold text-text mb-2">{name}</div>
                <ul className="space-y-1">
                  {ps.map(p => (
                    <li key={p.uid} className="text-sm text-muted flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block" /> {p.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {players.length === 0 && <p className="text-muted text-sm">Đang chờ người chơi…</p>}
          </div>
          {isHostMe ? (
            <>
              <Button onClick={onStart} disabled={!cameraOn} className="mt-5 w-full" size="lg">
                {cameraOn ? <>Bắt đầu thi đấu <ArrowRight size={18} className="ml-1" /></> : <>Hãy kết nối điện thoại trước <Camera size={18} className="ml-1" /></>}
              </Button>
              {!cameraOn && (
                <p className="text-muted text-xs mt-2 text-center">
                  Quét mã QR bên phải bằng điện thoại để chiếu bàn cờ thật. Nút bắt đầu sẽ mở khi camera đã kết nối.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted text-sm mt-5">Chờ chủ phòng bắt đầu…</p>
          )}
        </div>

        <div className="space-y-5">
          {isHostMe && (
            <div className="bg-surface rounded-2xl border border-border p-5 text-center">
              <h3 className="font-display text-lg mb-1 flex items-center justify-center gap-2">
                <Users size={18} className="text-primary" /> Mời người chơi
              </h3>
              <p className="text-xs text-muted mb-3">Quét mã hoặc chia sẻ mã phòng để các nhóm vào chơi.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={joinQrSrc} alt="QR vào phòng" width={180} height={180} className="mx-auto rounded-lg border border-border" />
              <div className="mt-3 font-mono font-bold tracking-widest text-primary text-lg">{roomCode}</div>
            </div>
          )}

          <div className="bg-surface rounded-2xl border border-border p-5 text-center">
            <h3 className="font-display text-lg mb-1 flex items-center justify-center gap-2">
              <Camera size={18} className="text-secondary" /> Kết nối Camera
            </h3>
            <p className="text-xs text-muted mb-3">Quét mã bằng điện thoại để chiếu bàn cờ thật lên web.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR camera" width={180} height={180} className="mx-auto rounded-lg border border-border" />
            <div className={cn('mt-3 text-sm font-medium', cameraOn ? 'text-primary' : 'text-muted')}>
              {cameraOn ? '● Camera đã kết nối' : '○ Chưa có camera'}
            </div>
            <p className="text-[11px] text-muted mt-2 break-all">{cameraUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ BoardView ------------------------------ */
function BoardView({ groups, groupColorMap, activeGroupId, cameraOn, cameraFrame, cameraTiles }:
  {
    groups: Group[]; groupColorMap: Record<string, string>; activeGroupId: string | null;
    cameraOn: boolean; cameraFrame: string | null; cameraTiles: CameraTile[];
  }) {

  // Match the camera frame's real aspect ratio (phones are usually portrait) so
  // the video fills the box without letterboxing and the overlay stays aligned.
  const [frameAspect, setFrameAspect] = useState(9 / 16);

  // If a camera is streaming, overlay pieces on detected tile centers.
  if (cameraOn && cameraFrame) {
    const portrait = frameAspect < 1;
    return (
      <div
        className="relative mx-auto bg-black rounded-2xl overflow-hidden border border-border"
        style={portrait
          ? { aspectRatio: frameAspect, height: '72vh', maxWidth: '100%' }
          : { aspectRatio: frameAspect, width: '100%', maxWidth: 760 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cameraFrame}
          alt="Bàn cờ thật"
          className="w-full h-full object-cover"
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth && el.naturalHeight) {
              setFrameAspect(el.naturalWidth / el.naturalHeight);
            }
          }}
        />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {cameraTiles.map(t => {
            const tile = boardTiles[t.id];
            if (!tile) return null;
            return (
              <g key={t.id}>
                <circle cx={t.center.x * 100} cy={t.center.y * 100} r={1.4}
                  fill="none" stroke={TILE_COLOR[tile.type]} strokeWidth={0.5} />
              </g>
            );
          })}
          {groups.map(g => {
            const det = cameraTiles.find(t => t.id === g.position);
            if (!det) return null;
            return (
              <circle key={g.groupId} cx={det.center.x * 100} cy={det.center.y * 100} r={2.2}
                fill={groupColorMap[g.groupId] || '#2E8B6B'} stroke="#fff" strokeWidth={0.6}
                opacity={activeGroupId === g.groupId ? 1 : 0.85} />
            );
          })}
        </svg>
        <div className="absolute top-2 left-2 text-[11px] bg-black/50 text-white px-2 py-1 rounded">
          📷 Camera trực tiếp · {cameraTiles.length} ô nhận diện
        </div>
      </div>
    );
  }

  // Fallback: rendered landscape ring board (11 cols × 7 rows = 32 perimeter tiles).
  return (
    <div className="bg-primary-soft/40 rounded-2xl border border-border p-3">
      <div
        className="grid gap-2 aspect-[11/7] w-full max-w-4xl mx-auto"
        style={{ gridTemplateColumns: `repeat(${BOARD_COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${BOARD_ROWS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: BOARD_COLS * BOARD_ROWS }).map((_, cell) => {
          const row = Math.floor(cell / BOARD_COLS);
          const col = cell % BOARD_COLS;
          const isPerim = row === 0 || row === BOARD_ROWS - 1 || col === 0 || col === BOARD_COLS - 1;
          if (!isPerim) {
            // center label cell — render once at the top-left interior cell
            if (row === 1 && col === 1) {
              return (
                <div key={cell} className="flex items-center justify-center"
                  style={{ gridColumn: `2 / ${BOARD_COLS}`, gridRow: `2 / ${BOARD_ROWS}` }}>
                  <div className="text-center">
                    <div className="font-display text-xl text-primary leading-tight">Cờ Tỷ Phú</div>
                    <div className="text-muted text-[10px] mt-1">Hội nhập & Tự chủ</div>
                  </div>
                </div>
              );
            }
            return null;
          }
          const idx = cellToIdx(row, col);
          const tile = boardTiles[idx];
          const here = groups.filter(g => g.position === idx);
          return (
            <div key={cell}
              className={cn('relative rounded-md border flex flex-col items-center justify-center p-0.5 text-center',
                activeGroupId && here.some(g => g.groupId === activeGroupId) ? 'ring-2 ring-primary' : '')}
              style={{ background: `${TILE_COLOR[tile.type]}22`, borderColor: `${TILE_COLOR[tile.type]}66` }}
            >
              <div className="text-lg leading-none">{TILE_ICON[tile.type]}</div>
              <div className="text-[9px] leading-tight text-text/70 mt-0.5 line-clamp-2">{tile.label}</div>
              {here.length > 0 && (
                <div className="absolute -top-1 -right-1 flex gap-0.5">
                  {here.map(g => (
                    <span key={g.groupId} className="w-2.5 h-2.5 rounded-full border border-white"
                      style={{ background: groupColorMap[g.groupId] || '#2E8B6B' }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Inverse of idxToCell: (row,col) on the portrait ring -> tile index. */
function cellToIdx(row: number, col: number): number {
  const C = BOARD_COLS, R = BOARD_ROWS;
  if (row === 0) return col;                                      // top
  if (col === C - 1) return (C - 1) + row;                        // right
  if (row === R - 1) return 2 * (C - 1) + (R - 1) - col;          // bottom
  return 2 * (C - 1) + 2 * (R - 1) - row;                         // left
}

/* ----------------------------- GroupPicker ----------------------------- */
function GroupPicker({ groups, groupColorMap, isHost, onPick }: any) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <h3 className="font-display text-lg text-text mb-1 flex items-center gap-2">
        <Users className="text-primary" size={20} /> Chọn nhóm trả lời
      </h3>
      <p className="text-muted text-sm mb-4">
        {isHost ? 'Bấm vào một nhóm để hiện câu hỏi và bắt đầu đếm ngược.' : 'Chủ phòng đang chọn nhóm…'}
      </p>
      {groups.length === 0 ? (
        <p className="text-muted text-sm text-center py-4">Chưa có nhóm nào tham gia.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {groups.map((g: any) => (
            <button key={g.groupId}
              disabled={!isHost}
              onClick={() => onPick(g.groupId)}
              className={cn(
                'px-3 py-3 rounded-xl border text-left transition font-semibold',
                isHost ? 'bg-bg border-border hover:border-primary hover:shadow-md' : 'bg-bg border-border opacity-70 cursor-default'
              )}
            >
              <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ background: groupColorMap[g.groupId] }} />
              <span className="align-middle">{g.groupName}</span>
              <span className="block text-xs text-muted font-normal mt-0.5 font-mono">{g.score} điểm</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- QuestionCard ---------------------------- */
function QuestionCard({
  phase, question, selected, answerResult, timeLeft, activeGroupName, isHost, onAnswer, onExit
}: any) {
  if (!question) return null;
  const revealed = phase === 'revealed' || !!answerResult;
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-secondary uppercase">
          Câu hỏi · Nhóm {activeGroupName}
        </span>
        {!revealed && (
          <span className={cn('font-mono font-bold', timeLeft <= 5 ? 'text-danger' : 'text-accent')}>⏱ {timeLeft}s</span>
        )}
      </div>
      <p className="font-display text-lg text-text mb-4">{question.question}</p>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {question.options.map((opt: string, i: number) => {
          const isCorrect = revealed && answerResult && answerResult.correctIndex === i;
          const isChosen = selected === i || (revealed && answerResult && answerResult.chosen === i);
          return (
            <button key={i}
              disabled={!isHost || selected !== null || revealed}
              onClick={() => onAnswer(i)}
              className={cn(
                'text-left px-4 py-3 rounded-xl border transition font-medium',
                isCorrect ? 'bg-primary-soft border-primary text-primary' :
                  revealed && isChosen && !isCorrect ? 'bg-danger/10 border-danger text-danger' :
                    isChosen ? 'bg-secondary/10 border-secondary' :
                      'bg-bg border-border hover:border-primary disabled:opacity-60 disabled:hover:border-border'
              )}
            >
              <span className="font-bold mr-2">{['A', 'B', 'C', 'D'][i]}.</span>{opt}
            </button>
          );
        })}
      </div>
      {answerResult && (
        <div className={cn('mt-4 rounded-xl p-3 text-sm',
          answerResult.correct ? 'bg-primary-soft text-text' : 'bg-danger/10 text-text')}>
          <b>{answerResult.correct ? '✅ Chính xác!' : answerResult.timedOut ? '⏰ Hết giờ!' : '❌ Chưa đúng.'}</b> {answerResult.explanation}
        </div>
      )}
      {/* Thoát button — only lights up for the host after the answer is revealed */}
      <div className="mt-4 flex justify-end">
        <Button
          onClick={onExit}
          disabled={!isHost || !revealed}
          size="lg"
          className={cn(!revealed && 'opacity-40')}
        >
          Thoát <ArrowRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ DiceModal ------------------------------ */
function DiceModal({ isHost, activeGroupName, answerResult, diceValue, diceSent, setDiceValue, onSend }: any) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl p-6 text-center"
        initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 12 }}
      >
        <h3 className="font-display text-xl mb-1 flex items-center justify-center gap-2">
          <Dice5 className="text-accent" /> Tung xúc xắc ngoài đời
        </h3>
        <p className="text-primary text-sm mb-4">✅ Nhóm <b>{activeGroupName}</b> trả lời đúng!</p>
        {isHost ? (
          <>
            <p className="text-muted text-sm mb-4">Nhập số chấm vừa tung được (1–6):</p>
            <div className="flex justify-center gap-2 flex-wrap mb-5">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button key={n}
                  disabled={diceSent}
                  onClick={() => setDiceValue(n)}
                  className={cn('w-12 h-12 rounded-xl border font-mono text-lg font-bold transition',
                    diceValue === n ? 'bg-accent text-white border-accent' : 'bg-bg border-border hover:border-accent')}
                >{n}</button>
              ))}
            </div>
            <Button onClick={onSend} disabled={diceValue == null || diceSent} size="lg" className="w-full">
              {diceSent ? 'Đang di chuyển…' : 'Di chuyển'} <ArrowRight size={16} className="ml-1" />
            </Button>
          </>
        ) : (
          <p className="text-muted text-sm mt-2">Chủ phòng đang nhập số xúc xắc…</p>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------ ResolveCard ---------------------------- */
function ResolveCard({ lastResolve }: any) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 text-center">
      <div className="text-3xl mb-1">{TILE_ICON[lastResolve.tileType]}</div>
      <h3 className="font-display text-lg">{lastResolve.tileLabel}</h3>
      {lastResolve.card && <p className="text-sm text-secondary mt-1">{lastResolve.card.text}</p>}
      <p className={cn('font-mono font-bold mt-2', lastResolve.scoreDelta >= 0 ? 'text-primary' : 'text-danger')}>
        {lastResolve.scoreDelta >= 0 ? '+' : ''}{lastResolve.scoreDelta} điểm → {lastResolve.newScore}
      </p>
    </div>
  );
}

/* ------------------------------ Scoreboard ------------------------------ */
function Scoreboard({ groups, groupColorMap, activeGroupId, myGroupId }:
  { groups: Group[]; groupColorMap: Record<string, string>; activeGroupId: string | null; myGroupId: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 h-fit lg:sticky lg:top-20">
      <h3 className="font-display text-lg mb-3 flex items-center gap-2"><Trophy size={18} className="text-accent" /> Bảng điểm</h3>
      <ul className="space-y-2">
        {groups.map((g, i) => (
          <li key={g.groupId}
            className={cn('flex items-center gap-2 rounded-xl px-3 py-2 border',
              g.groupId === myGroupId ? 'bg-primary-soft border-primary' : 'bg-bg border-border',
              activeGroupId === g.groupId ? 'ring-2 ring-accent' : '')}>
            <span className="font-bold text-muted w-5">{i + 1}</span>
            <span className="w-3 h-3 rounded-full border border-white" style={{ background: groupColorMap[g.groupId] || '#2E8B6B' }} />
            <span className="flex-1 truncate text-sm font-medium">{g.groupName}</span>
            <span className="text-xs text-muted">ô {g.position}</span>
            <span className="font-mono font-bold text-text">{g.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- FinishScreen ----------------------------- */
function FinishScreen({ standings, winner, myGroupId, onExit, onHome }:
  { standings: Group[]; winner: Group | null; myGroupId: string; onExit: () => void; onHome: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Crown className="mx-auto text-accent mb-2" size={48} />
        <h1 className="font-display text-3xl text-text">Kết thúc!</h1>
        {winner && <p className="text-lg text-primary font-semibold mt-1">🏆 Vô địch: {winner.groupName} ({winner.score} điểm)</p>}
      </motion.div>
      <div className="mt-8 space-y-2">
        {standings.map((g, i) => (
          <motion.div key={g.groupId}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
            className={cn('flex items-center gap-3 rounded-xl px-4 py-3 border',
              g.groupId === myGroupId ? 'bg-primary-soft border-primary' : 'bg-surface border-border')}>
            <span className="text-xl w-7">{['🥇', '🥈', '🥉'][i] || `${i + 1}`}</span>
            <span className="flex-1 text-left font-medium">{g.groupName}</span>
            <span className="font-mono font-bold text-lg">{g.score}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onExit} size="lg"><Trophy size={16} className="mr-1" /> Xem bảng xếp hạng</Button>
        <Button onClick={onHome} size="lg" variant="outline"><ArrowRight size={16} className="mr-1" /> Thoát về sảnh game</Button>
      </div>
    </div>
  );
}
