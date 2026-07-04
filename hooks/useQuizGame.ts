'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSocket } from './useSocket';
import { useGroup } from './useGroup';
import { toast } from '@/components/ui/toast';

export interface QuizPlayer {
  uid: string;
  name: string;
  avatar: string | null;
  groupId: string | null;
  groupName: string | null;
  score: number;
}
export interface QuizQuestion {
  index: number;
  total: number;
  id: string;
  question: string;
  options: [string, string, string, string];
  durationSec: number;
  deadline: number;
}
export interface QuizGroupScore {
  groupId: string;
  groupName: string;
  score: number;
  members: number;
}
export type QuizPhase = 'lobby' | 'question' | 'reveal' | 'finished';
export type PowerUpKind = 'negotiation' | 'extend' | 'intel';

export function useQuizGame() {
  const router = useRouter();
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase();
  const isHost = params.get('host') === '1';
  const { data: session, status } = useSession();
  const { user } = useGroup();
  const { socket, connected } = useSocket();

  const [phase, setPhase] = useState<QuizPhase>('lobby');
  const [players, setPlayers] = useState<QuizPlayer[]>([]);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [groupScores, setGroupScores] = useState<QuizGroupScore[]>([]);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; points: number; correct: number; explanation: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [eliminated, setEliminated] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [powerUpsAvailable, setPowerUpsAvailable] = useState({ negotiation: false, extend: false, intel: false });
  const [powerUpsUsed, setPowerUpsUsed] = useState({ negotiation: false, extend: false, intel: false });
  const [finalData, setFinalData] = useState<any>(null);

  const uid = (session?.user as any)?.uid as string | undefined;
  const resultRef = useRef(result);
  resultRef.current = result;

  // Auth + room validation
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      toast({ title: 'Cần đăng nhập trước', variant: 'warning' });
      router.replace('/game?type=quiz');
      return;
    }
    if (!roomCode) router.replace('/game?type=quiz');
  }, [status, session, roomCode, router]);

  // Join socket room
  useEffect(() => {
    if (!socket || !connected || !uid || !user || !roomCode) return;
    const doJoin = () => {
      socket.emit('quiz:join', {
        roomCode, uid,
        name: session?.user?.name || 'Người chơi',
        avatar: session?.user?.image,
        groupId: user.groupId,
        groupName: user.groupName,
      }, (res: any) => {
        if (!res?.ok) {
          toast({ title: 'Không vào được phòng', description: res?.error || 'Phòng không tồn tại', variant: 'danger' });
          router.replace('/game?type=quiz');
          return;
        }
        setHostUid(res.hostUid);
        setPlayers(res.players);
        if (res.status === 'playing') setPhase('question');
      });
    };
    if (isHost) socket.emit('quiz:create', { hostUid: uid, roomCode }, () => doJoin());
    else doJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, uid, user?.groupId, roomCode]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const onPlayers = (list: QuizPlayer[]) => setPlayers(list);
    const onGroupScores = (s: QuizGroupScore[]) => setGroupScores(s);
    const onStarted = () => { setPhase('question'); setFinalData(null); };
    const onQuestion = (q: QuizQuestion) => {
      setQuestion(q); setSelected(null); setResult(null);
      setEliminated(null); setHint(null); setPhase('question');
    };
    const onAnswerResult = (data: any) => {
      setResult(data); setStreak(data.streak); setScore(data.score);
      setPowerUpsAvailable(data.powerUpsAvailable);
    };
    const onQuestionEnded = (data: { index: number; correct: number; explanation: string }) => {
      setPhase('reveal');
      if (!resultRef.current) {
        setResult({ isCorrect: false, points: 0, correct: data.correct, explanation: data.explanation });
      }
    };
    const onPowerUpResult = (payload: any) => {
      setPowerUpsUsed(u => ({ ...u, [payload.kind]: true }));
      setPowerUpsAvailable(a => ({ ...a, [payload.kind]: false }));
      if (payload.kind === 'negotiation') setEliminated(payload.eliminated);
      if (payload.kind === 'intel') setHint(payload.hint);
      if (payload.kind === 'extend') {
        toast({ title: '+10 giây!', variant: 'success' });
        setQuestion(q => (q ? { ...q, deadline: payload.newDeadline } : q));
      }
    };
    const onFinished = (data: any) => { setFinalData(data); setPhase('finished'); };

    socket.on('quiz:players', onPlayers);
    socket.on('quiz:groupScores', onGroupScores);
    socket.on('quiz:started', onStarted);
    socket.on('quiz:question', onQuestion);
    socket.on('quiz:answerResult', onAnswerResult);
    socket.on('quiz:questionEnded', onQuestionEnded);
    socket.on('quiz:powerUpResult', onPowerUpResult);
    socket.on('quiz:finished', onFinished);
    return () => {
      socket.off('quiz:players', onPlayers);
      socket.off('quiz:groupScores', onGroupScores);
      socket.off('quiz:started', onStarted);
      socket.off('quiz:question', onQuestion);
      socket.off('quiz:answerResult', onAnswerResult);
      socket.off('quiz:questionEnded', onQuestionEnded);
      socket.off('quiz:powerUpResult', onPowerUpResult);
      socket.off('quiz:finished', onFinished);
    };
  }, [socket]);

  // Timer
  useEffect(() => {
    if (!question || phase !== 'question') return;
    const tick = () => {
      const t = Math.max(0, Math.round((question.deadline - Date.now()) / 1000));
      setTimeLeft(t);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [question, phase]);

  const submitAnswer = (i: number) => {
    if (selected !== null || !socket || !question) return;
    setSelected(i);
    socket.emit('quiz:answer', { roomCode, uid, answer: i });
  };

  const usePowerUp = (kind: PowerUpKind) => {
    if (!socket || !powerUpsAvailable[kind] || powerUpsUsed[kind]) return;
    socket.emit('quiz:powerUp', { roomCode, uid, kind });
  };

  const startGame = () => {
    if (!socket) return;
    if (players.length < 2 && !confirm('Chỉ có 1 người chơi. Vẫn bắt đầu?')) return;
    socket.emit('quiz:start', { roomCode, uid });
  };

  const myPlayer = useMemo(() => players.find(p => p.uid === uid), [players, uid]);
  const myGroupScore = useMemo(() => groupScores.find(g => g.groupId === user?.groupId)?.score || 0, [groupScores, user]);
  const isHostMe = useMemo(() => uid !== undefined && uid === hostUid, [uid, hostUid]);

  return {
    // identity
    roomCode, uid, isHostMe, user,
    // state
    phase, players, groupScores, question, timeLeft, selected, result,
    streak, score, eliminated, hint,
    powerUpsAvailable, powerUpsUsed, finalData,
    myPlayer, myGroupScore,
    connected,
    // actions
    submitAnswer, usePowerUp, startGame,
  };
}
