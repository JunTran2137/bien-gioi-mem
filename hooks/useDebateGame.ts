'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useSocket } from './useSocket';
import { useGroup } from './useGroup';
import { toast } from '@/components/ui/toast';

export type DebatePhase = 'LOBBY' | 'MATCH_PREP' | 'TURN' | 'VOTING' | 'MATCH_RESULT' | 'FINISHED';

export interface DebatePlayer {
  uid: string; name: string; avatar: string | null;
  groupId: string | null; groupName: string | null;
}
export interface DebateTopic {
  id: string; title: string; side: string; context: string; argumentStarters: string[];
}
export interface DebateMatchSummary {
  id: string; team1: string; team1Name: string; team2: string; team2Name: string;
  winner: string | null; topicTitle: string | null;
}
export interface DebateMessage {
  turnIdx: number; groupId: string; text: string; ts: number;
}
export interface DebateMatch {
  id: string;
  team1: string; team1Name: string;
  team2: string; team2Name: string;
  team1Side: string; team2Side: string;
  topic: DebateTopic | null;
  roundIdx: number; matchIdx: number;
  turnOrder: string[];
  turnIdx: number;
  activeGroupId: string | null;
  messages: DebateMessage[];
  reactions: Record<string, { clap: number; think: number; exclaim: number }>;
  voteTally: Record<string, number>;
  winner: string | null;
}
export interface DebateGroup { groupId: string; groupName: string; score: number; }
export interface DebateState {
  status: string; phase: DebatePhase;
  roundIdx: number; matchIdx: number;
  bracket: DebateMatchSummary[][];
  groups: DebateGroup[];
  match: DebateMatch | null;
  deadline: number;
}

export function useDebateGame() {
  const router = useRouter();
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase();
  const isHost = params.get('host') === '1';
  const { data: session, status } = useSession();
  const { user } = useGroup();
  const { socket, connected } = useSocket();

  const uid = (session?.user as any)?.uid as string | undefined;
  const myGroupId = user?.groupId || '__no_group__';

  const [players, setPlayers] = useState<DebatePlayer[]>([]);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [state, setState] = useState<DebateState | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [lastMatchResult, setLastMatchResult] = useState<any>(null);
  const [finished, setFinished] = useState<any>(null);
  const joinedRef = useRef(false);

  const isHostMe = uid != null && uid === hostUid;
  const phase = state?.phase || 'LOBBY';
  const match = state?.match || null;
  const amIDebating = match ? (match.team1 === myGroupId || match.team2 === myGroupId) : false;
  const amIActive = match?.activeGroupId === myGroupId;

  /* ---- auth ---- */
  useEffect(() => {
    if (status === 'loading') return;
    if (roomCode && !session) { signIn('google'); }
  }, [status, session, roomCode]);

  /* ---- join ---- */
  useEffect(() => {
    if (!socket || !connected || !uid || !user || !roomCode || joinedRef.current) return;
    let attempt = 0;
    const doJoin = () => {
      socket.emit('debate:join', {
        roomCode, uid,
        name: session?.user?.name || 'Người chơi',
        avatar: session?.user?.image,
        groupId: user.groupId, groupName: user.groupName,
      }, (res: any) => {
        if (!res?.ok) {
          attempt++;
          if (isHost) { socket.emit('debate:create', { hostUid: uid, roomCode }, () => setTimeout(doJoin, 400)); return; }
          if (attempt < 6) { setTimeout(doJoin, 1200); return; }
          toast({ title: 'Không vào được phòng', variant: 'danger' });
          router.replace('/game');
          return;
        }
        joinedRef.current = true;
        setHostUid(res.hostUid);
      });
    };
    if (isHost) socket.emit('debate:create', { hostUid: uid, roomCode }, () => doJoin());
    else doJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, uid, user?.groupId, roomCode]);

  /* ---- events ---- */
  useEffect(() => {
    if (!socket) return;
    const onPlayers = (l: DebatePlayer[]) => setPlayers(l);
    const onState = (s: DebateState) => { setState(s); if (s.phase === 'VOTING') setMyVote(null); };
    const onArg = (entry: DebateMessage) => setState(s => {
      if (!s?.match) return s;
      return { ...s, match: { ...s.match, messages: [...s.match.messages, entry] } };
    });
    const onReaction = (r: { groupId: string; reactions: any }) => setState(s => {
      if (!s?.match) return s;
      return { ...s, match: { ...s.match, reactions: { ...s.match.reactions, [r.groupId]: r.reactions } } };
    });
    const onVoteUpdate = (tally: Record<string, number>) => setState(s => {
      if (!s?.match) return s;
      return { ...s, match: { ...s.match, voteTally: tally } };
    });
    const onMatchResult = (d: any) => setLastMatchResult(d);
    const onFinished = (d: any) => setFinished(d);
    const onError = (e: { message: string }) => toast({ title: 'Lỗi', description: e.message, variant: 'danger' });

    socket.on('debate:players', onPlayers);
    socket.on('debate:state', onState);
    socket.on('debate:argument', onArg);
    socket.on('debate:reaction', onReaction);
    socket.on('debate:voteUpdate', onVoteUpdate);
    socket.on('debate:matchResult', onMatchResult);
    socket.on('debate:finished', onFinished);
    socket.on('debate:error', onError);
    return () => {
      socket.off('debate:players', onPlayers);
      socket.off('debate:state', onState);
      socket.off('debate:argument', onArg);
      socket.off('debate:reaction', onReaction);
      socket.off('debate:voteUpdate', onVoteUpdate);
      socket.off('debate:matchResult', onMatchResult);
      socket.off('debate:finished', onFinished);
      socket.off('debate:error', onError);
    };
  }, [socket]);

  /* ---- countdown ---- */
  useEffect(() => {
    if (!state?.deadline) return;
    const tick = () => setTimeLeft(Math.max(0, Math.round((state.deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state?.deadline, state?.phase]);

  const startGame = useCallback(() => { socket?.emit('debate:start', { roomCode, uid }); }, [socket, roomCode, uid]);
  const sendArg = useCallback((text: string) => {
    if (!text.trim()) return;
    socket?.emit('debate:argument', { roomCode, uid, text: text.trim() });
  }, [socket, roomCode, uid]);
  const react = useCallback((kind: string) => { socket?.emit('debate:react', { roomCode, uid, kind }); }, [socket, roomCode, uid]);
  const vote = useCallback((groupId: string) => {
    if (amIDebating) { toast({ title: 'Nhóm đang tranh luận không được vote', variant: 'warning' }); return; }
    socket?.emit('debate:vote', { roomCode, uid, votedGroupId: groupId });
    setMyVote(groupId);
  }, [socket, roomCode, uid, amIDebating]);

  return {
    roomCode, uid, isHostMe, user, connected,
    players, hostUid, state, phase, match,
    myGroupId, amIDebating, amIActive, timeLeft, myVote,
    lastMatchResult, finished,
    startGame, sendArg, react, vote,
  };
}
