'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSocket } from './useSocket';
import { useGroup } from './useGroup';
import { toast } from '@/components/ui/toast';

export type DebatePhase = 'WAITING' | 'PREP' | 'SPEAKING' | 'REBUTTAL' | 'RESPONSE' | 'VOTING' | 'FINISHED';

export interface DebatePlayer {
  uid: string;
  name: string;
  avatar: string | null;
  groupId: string | null;
  groupName: string | null;
}
export interface DebateTopic {
  id: string;
  title: string;
  side: string;
  context: string;
  argumentStarters: string[];
}
export interface DebateGroupState {
  groupId: string;
  groupName: string;
  topic: DebateTopic;
  arguments: string[];
  reactions: { clap: number; think: number; exclaim: number };
  challenges: { fromGroupId: string; fromGroupName: string; text: string }[];
  responses: string[];
}
export interface DebateState {
  phase: DebatePhase;
  deadline: number;
  speakingGroupId: string | null;
  speakingIdx: number;
  speakingOrder: string[];
  groupStates: Record<string, DebateGroupState>;
  players: DebatePlayer[];
  voteCount: Record<string, number>;
}

export function useDebateGame() {
  const router = useRouter();
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase();
  const isHost = params.get('host') === '1';
  const { data: session, status } = useSession();
  const { user } = useGroup();
  const { socket, connected } = useSocket();

  const [state, setState] = useState<DebateState | null>(null);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [finished, setFinished] = useState<any>(null);
  const joinedRef = useRef(false);

  const uid = (session?.user as any)?.uid as string | undefined;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      toast({ title: 'Cần đăng nhập trước', variant: 'warning' });
      router.replace('/game?type=debate');
      return;
    }
    if (!roomCode) router.replace('/game?type=debate');
  }, [status, session, roomCode, router]);

  useEffect(() => {
    if (!socket || !connected || !uid || !user || !roomCode || joinedRef.current) return;
    const doJoin = () => {
      socket.emit('debate:join', {
        roomCode, uid,
        name: session?.user?.name || 'Người chơi',
        avatar: session?.user?.image,
        groupId: user.groupId,
        groupName: user.groupName,
      }, (res: any) => {
        if (!res?.ok) {
          toast({ title: 'Không vào được phòng', description: res?.error || 'Phòng không tồn tại', variant: 'danger' });
          router.replace('/game?type=debate');
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

  useEffect(() => {
    if (!socket) return;
    const onPlayers = (list: DebatePlayer[]) => setState(s => (s ? { ...s, players: list } : s));
    const onState = (s: DebateState) => setState(s);
    const onArg = (a: { groupId: string; text: string }) => {
      setState(s => {
        if (!s) return s;
        const gs = s.groupStates[a.groupId];
        if (!gs) return s;
        return { ...s, groupStates: { ...s.groupStates, [a.groupId]: { ...gs, arguments: [...gs.arguments, a.text] } } };
      });
    };
    const onChallenge = (c: { toGroupId: string; fromGroupId: string; text: string }) => {
      setState(s => {
        if (!s) return s;
        const gs = s.groupStates[c.toGroupId];
        if (!gs) return s;
        const fromName = s.groupStates[c.fromGroupId]?.groupName || 'Nhóm';
        return {
          ...s,
          groupStates: { ...s.groupStates, [c.toGroupId]: { ...gs, challenges: [...gs.challenges, { fromGroupId: c.fromGroupId, fromGroupName: fromName, text: c.text }] } },
        };
      });
    };
    const onResp = (r: { groupId: string; text: string }) => {
      setState(s => {
        if (!s) return s;
        const gs = s.groupStates[r.groupId];
        if (!gs) return s;
        return { ...s, groupStates: { ...s.groupStates, [r.groupId]: { ...gs, responses: [...gs.responses, r.text] } } };
      });
    };
    const onReaction = (r: { groupId: string; reactions: DebateGroupState['reactions'] }) => {
      setState(s => {
        if (!s) return s;
        const gs = s.groupStates[r.groupId];
        if (!gs) return s;
        return { ...s, groupStates: { ...s.groupStates, [r.groupId]: { ...gs, reactions: r.reactions } } };
      });
    };
    const onVote = (tally: Record<string, number>) => setState(s => (s ? { ...s, voteCount: tally } : s));
    const onFinished = (data: any) => {
      setFinished(data);
      setState(s => (s ? { ...s, phase: 'FINISHED' as DebatePhase, voteCount: data.tally, groupStates: data.groupStates } : s));
    };
    const onError = (e: { message: string }) => toast({ title: 'Lỗi', description: e.message, variant: 'danger' });

    socket.on('debate:players', onPlayers);
    socket.on('debate:state', onState);
    socket.on('debate:argument', onArg);
    socket.on('debate:challenge', onChallenge);
    socket.on('debate:response', onResp);
    socket.on('debate:reaction', onReaction);
    socket.on('debate:voteUpdate', onVote);
    socket.on('debate:finished', onFinished);
    socket.on('debate:error', onError);
    return () => {
      socket.off('debate:players', onPlayers);
      socket.off('debate:state', onState);
      socket.off('debate:argument', onArg);
      socket.off('debate:challenge', onChallenge);
      socket.off('debate:response', onResp);
      socket.off('debate:reaction', onReaction);
      socket.off('debate:voteUpdate', onVote);
      socket.off('debate:finished', onFinished);
      socket.off('debate:error', onError);
    };
  }, [socket]);

  useEffect(() => {
    if (!state || !state.deadline) return;
    const tick = () => setTimeLeft(Math.max(0, Math.round((state.deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, [state?.deadline, state?.phase]);

  const sendArg = (text: string) => {
    if (!socket || !text.trim()) return;
    socket.emit('debate:argument', { roomCode, uid, text: text.trim() });
  };
  const sendChallenge = (text: string) => {
    if (!socket || !text.trim()) return;
    socket.emit('debate:challenge', { roomCode, uid, text: text.trim() });
  };
  const sendResponse = (text: string) => {
    if (!socket || !text.trim()) return;
    socket.emit('debate:response', { roomCode, uid, text: text.trim() });
  };
  const react = (kind: 'clap' | 'think' | 'exclaim') => {
    if (!socket) return;
    socket.emit('debate:react', { roomCode, uid, kind });
  };
  const vote = (groupId: string) => {
    if (!socket) return;
    if (groupId === user?.groupId) {
      toast({ title: 'Không thể vote cho nhóm mình', variant: 'warning' });
      return;
    }
    socket.emit('debate:vote', { roomCode, uid, votedGroupId: groupId });
    setMyVote(groupId);
  };
  const startGame = () => {
    if (!socket) return;
    const groups = new Set(state?.players.map(p => p.groupId).filter(Boolean));
    if (groups.size < 2) {
      toast({ title: 'Cần ít nhất 2 nhóm khác nhau', variant: 'warning' });
      return;
    }
    socket.emit('debate:start', { roomCode, uid });
  };

  const myGroupState = useMemo(() => {
    if (!state || !user?.groupId) return null;
    return state.groupStates[user.groupId] || null;
  }, [state, user]);
  const speakingGS = state?.speakingGroupId ? state.groupStates[state.speakingGroupId] : null;
  const isMyGroupSpeaking = state?.speakingGroupId === user?.groupId;
  const totalVotes = state ? Object.values(state.voteCount || {}).reduce((a, b) => a + b, 0) : 0;
  const isHostMe = uid !== undefined && uid === hostUid;

  return {
    roomCode, uid, user, isHostMe, connected,
    state, timeLeft, myVote, finished,
    myGroupState, speakingGS, isMyGroupSpeaking, totalVotes,
    sendArg, sendChallenge, sendResponse, react, vote, startGame,
  };
}
