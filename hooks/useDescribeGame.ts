'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useSocket } from './useSocket';
import { useGroup } from './useGroup';
import { toast } from '@/components/ui/toast';

export interface DGPlayer {
  uid: string;
  name: string;
  avatar: string | null;
  groupId: string | null;
  groupName: string | null;
}
export interface DGGroup {
  groupId: string;
  groupName: string;
  score: number;
}
export interface DGGuess {
  cardId: string;
  cardName: string;
  correct?: boolean;
}
export interface DGReveal {
  index: number;
  total: number;
  subPhase: 'showing' | 'revealed' | 'rebuttal' | 'voting' | 'resolved';
  authorGroupId: string;
  authorGroupName: string;
  text: string;
  guesserGroupIds: string[];
  rebuttalRound: number;
  rebuttalDeadline: number;
  guesses: Record<string, DGGuess>;
  stances?: Record<string, 'agree' | 'disagree'>;
  card?: { id: string; name: string; category: string } | null;
  acceptedCardId?: string | null;
  voteTally?: { cardId: string; cardName: string; count: number }[];
}
export interface DGState {
  status: 'waiting' | 'playing' | 'finished';
  phase: 'lobby' | 'prepare' | 'reveal' | 'finished';
  groups: DGGroup[];
  prepareDeadline: number;
  prepareSeconds: number;
  descriptionsPerGroup: number;
  submissionCounts: Record<string, number>;
  reveal: DGReveal | null;
  anyDisagree: boolean;
}
export interface DGCamera {
  connected: boolean;
}

export function useDescribeGame() {
  const router = useRouter();
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase();
  const isHost = params.get('host') === '1';
  const { data: session, status } = useSession();
  const { user } = useGroup();
  const { socket, connected } = useSocket();

  const uid = (session?.user as any)?.uid as string | undefined;
  const myGroupId = user?.groupId || '__no_group__';

  const [players, setPlayers] = useState<DGPlayer[]>([]);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [state, setState] = useState<DGState | null>(null);
  const [scribes, setScribes] = useState<Record<string, string>>({});
  const [cameras, setCameras] = useState<Record<string, DGCamera>>({});
  const [liveGuesses, setLiveGuesses] = useState<Record<string, DGGuess>>({});
  const [rebuttalEnded, setRebuttalEnded] = useState(false);
  const [finished, setFinished] = useState<{ standings: DGGroup[]; winner: DGGroup | null } | null>(null);
  const [prepareTimeLeft, setPrepareTimeLeft] = useState(0);
  const [rebuttalTimeLeft, setRebuttalTimeLeft] = useState(0);

  // While waiting for the server ack (hostUid still null), trust the URL param.
  const isHostMe = uid != null && (hostUid !== null ? uid === hostUid : isHost);
  const phase = state?.phase || 'lobby';
  const reveal = state?.reveal || null;
  const subPhase = reveal?.subPhase || null;
  const amIScribe = uid != null && scribes[myGroupId] === uid;

  /* ---- reset state on room change ---- */
  useEffect(() => {
    if (!roomCode) return;
    setPlayers([]);
    setHostUid(null);
    setState(null);
    setScribes({});
    setCameras({});
    setLiveGuesses({});
    setRebuttalEnded(false);
    setFinished(null);
    setPrepareTimeLeft(0);
    setRebuttalTimeLeft(0);
  }, [roomCode]);

  /* ---- auth guard ---- */
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
      socket.emit('dg:join', {
        roomCode, uid,
        name: session?.user?.name || 'Người chơi',
        avatar: session?.user?.image,
        groupId: user.groupId,
        groupName: user.groupName,
      }, (res: any) => {
        if (cancelled) return;
        if (!res?.ok) {
          attempt += 1;
          if (attempt < MAX_ATTEMPTS) { setTimeout(doJoin, 1200); return; }
          toast({ title: 'Không vào được phòng', description: res?.error || 'Phòng không tồn tại', variant: 'danger' });
          router.replace('/game');
          return;
        }
        setHostUid(res.hostUid);
        setPlayers(res.players);
        setState(res.state);
      });
    };
    if (isHost) {
      socket.emit('dg:create', { hostUid: uid, roomCode }, (res: any) => {
        if (cancelled) return;
        if (res?.ok) {
          // Only block imposters when both values are known non-null strings.
          if (uid && res.hostUid && res.hostUid !== uid) {
            router.replace(`/game?play=describe&room=${roomCode}`);
            return;
          }
          setHostUid(res.hostUid);
          setState(res.state);
          setPlayers(res.players || []);
        } else {
          router.replace(`/game?play=describe&room=${roomCode}`);
        }
      });
    } else doJoin();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, uid, user?.groupId, roomCode]);

  /* ---- socket events ---- */
  useEffect(() => {
    if (!socket) return;
    const onPlayers = (l: DGPlayer[]) => setPlayers(l);
    const onState = (s: DGState) => {
      setState(s);
      if (Array.isArray((s as any).players)) setPlayers((s as any).players);
      // scribes are now embedded in every state snapshot
      if ((s as any).scribes && typeof (s as any).scribes === 'object') setScribes((s as any).scribes);
      if (s.reveal?.subPhase === 'showing') setLiveGuesses(s.reveal.guesses || {});
      if (s.status === 'finished') setFinished(prev => prev ?? { standings: s.groups, winner: s.groups[0] ?? null });
    };
    const onStarted = (d: { scribes: Record<string, string> }) => { setScribes(d.scribes || {}); setFinished(null); };
    const onDescription = () => { setLiveGuesses({}); setRebuttalEnded(false); };
    const onGuesses = (d: { guesses: Record<string, DGGuess> }) => setLiveGuesses(d.guesses || {});
    const onRevealed = () => setRebuttalEnded(false);
    const onRebuttal = () => setRebuttalEnded(false);
    const onRebuttalTimeUp = () => setRebuttalEnded(true);
    const onFinished = (d: { standings: DGGroup[]; winner: DGGroup | null }) => setFinished(d);
    const onCamStatus = (d: { groupId: string; connected: boolean }) =>
      setCameras(c => ({ ...c, [d.groupId]: { connected: d.connected } }));

    socket.on('dg:players', onPlayers);
    socket.on('dg:state', onState);
    socket.on('dg:started', onStarted);
    socket.on('dg:description', onDescription);
    socket.on('dg:guesses', onGuesses);
    socket.on('dg:revealed', onRevealed);
    socket.on('dg:rebuttal', onRebuttal);
    socket.on('dg:rebuttalTimeUp', onRebuttalTimeUp);
    socket.on('dg:finished', onFinished);
    socket.on('dg:cameraStatus', onCamStatus);
    return () => {
      socket.off('dg:players', onPlayers);
      socket.off('dg:state', onState);
      socket.off('dg:started', onStarted);
      socket.off('dg:description', onDescription);
      socket.off('dg:guesses', onGuesses);
      socket.off('dg:revealed', onRevealed);
      socket.off('dg:rebuttal', onRebuttal);
      socket.off('dg:rebuttalTimeUp', onRebuttalTimeUp);
      socket.off('dg:finished', onFinished);
      socket.off('dg:cameraStatus', onCamStatus);
    };
  }, [socket]);

  /* ---- prepare countdown ---- */
  useEffect(() => {
    if (phase !== 'prepare' || !state?.prepareDeadline) return;
    const tick = () => setPrepareTimeLeft(Math.max(0, Math.round((state.prepareDeadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, state?.prepareDeadline]);

  /* ---- rebuttal countdown ---- */
  useEffect(() => {
    if (subPhase !== 'rebuttal' || !reveal?.rebuttalDeadline) return;
    const tick = () => setRebuttalTimeLeft(Math.max(0, Math.round((reveal.rebuttalDeadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [subPhase, reveal?.rebuttalDeadline]);

  /* ---- actions ---- */
  const startGame = useCallback(() => {
    if (!socket) return;
    const distinct = new Set(players.map(p => p.groupId || '__no_group__'));
    if (distinct.size < 2 && !confirm('Cần ít nhất 2 nhóm để chơi. Vẫn bắt đầu?')) return;
    socket.emit('dg:start', { roomCode, uid });
  }, [socket, players, roomCode, uid]);

  const submitDescriptions = useCallback((descriptions: { text: string; cardId: string }[], cb?: (r: any) => void) => {
    if (!socket) return;
    socket.emit('dg:submit', { roomCode, uid, descriptions }, (r: any) => cb && cb(r));
  }, [socket, roomCode, uid]);

  const endPrepare = useCallback(() => { socket?.emit('dg:endPrepare', { roomCode, uid }); }, [socket, roomCode, uid]);
  const revealAnswer = useCallback(() => { socket?.emit('dg:reveal', { roomCode, uid }); }, [socket, roomCode, uid]);
  const setStance = useCallback((stance: 'agree' | 'disagree') => { socket?.emit('dg:stance', { roomCode, uid, stance }); }, [socket, roomCode, uid]);
  const startRebuttal = useCallback(() => { socket?.emit('dg:startRebuttal', { roomCode, uid }); }, [socket, roomCode, uid]);
  const endRebuttal = useCallback(() => { socket?.emit('dg:endRebuttal', { roomCode, uid }); }, [socket, roomCode, uid]);
  const vote = useCallback((cardId: string) => { socket?.emit('dg:vote', { roomCode, uid, cardId }); }, [socket, roomCode, uid]);
  const next = useCallback(() => { socket?.emit('dg:next', { roomCode, uid }); }, [socket, roomCode, uid]);
  const endGame = useCallback(() => {
    if (!confirm('Kết thúc trò chơi và tổng kết điểm?')) return;
    socket?.emit('dg:end', { roomCode, uid });
  }, [socket, roomCode, uid]);

  const groupNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    (state?.groups || []).forEach(g => { m[g.groupId] = g.groupName; });
    players.forEach(p => { if (p.groupId) m[p.groupId] = p.groupName || m[p.groupId] || 'Nhóm'; });
    return m;
  }, [state?.groups, players]);

  const myStance = reveal?.stances?.[myGroupId] || null;

  return {
    roomCode, uid, isHostMe, isHost, user, connected,
    players, hostUid, state, phase, reveal, subPhase,
    scribes, amIScribe, myGroupId, groupNameMap,
    cameras, liveGuesses, rebuttalEnded, finished,
    prepareTimeLeft, rebuttalTimeLeft, myStance,
    startGame, submitDescriptions, endPrepare, revealAnswer,
    setStance, startRebuttal, endRebuttal, vote, next, endGame,
  };
}
