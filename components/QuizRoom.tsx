'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Clock, Sparkles, Handshake, Search, Trophy, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useSocket } from '@/hooks/useSocket';
import { useGroup } from '@/hooks/useGroup';
import { cn } from '@/lib/utils';

interface Player {
  uid: string;
  name: string;
  avatar: string | null;
  groupId: string | null;
  groupName: string | null;
  score: number;
}
interface Question {
  index: number;
  total: number;
  id: string;
  question: string;
  options: [string, string, string, string];
  durationSec: number;
  deadline: number;
}
interface GroupScore {
  groupId: string;
  groupName: string;
  score: number;
  members: number;
}
type Phase = 'lobby' | 'question' | 'reveal' | 'finished';
type PowerUpKind = 'negotiation' | 'extend' | 'intel';

export function QuizRoom() {
  const router = useRouter();
  const params = useSearchParams();
  const roomCode = (params.get('room') || '').toUpperCase();
  const isHost = params.get('host') === '1';
  const { data: session, status } = useSession();
  const { user } = useGroup();
  const { socket, connected } = useSocket();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [groupScores, setGroupScores] = useState<GroupScore[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
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
  const [copied, setCopied] = useState(false);
  const cardShake = useRef<HTMLDivElement>(null);

  const uid = (session?.user as any)?.uid as string | undefined;

  // Validate auth + room
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      toast({ title: 'Cần đăng nhập trước', variant: 'warning' });
      router.replace('/game?type=quiz');
      return;
    }
    if (!roomCode) {
      router.replace('/game?type=quiz');
    }
  }, [status, session, roomCode, router]);

  // Join socket room
  useEffect(() => {
    if (!socket || !connected || !uid || !user || !roomCode) return;

    const doJoin = () => {
      socket.emit(
        'quiz:join',
        {
          roomCode,
          uid,
          name: session?.user?.name || 'Người chơi',
          avatar: session?.user?.image,
          groupId: user.groupId,
          groupName: user.groupName
        },
        (res: any) => {
          if (!res?.ok) {
            toast({ title: 'Không vào được phòng', description: res?.error || 'Phòng không tồn tại', variant: 'danger' });
            router.replace('/game?type=quiz');
            return;
          }
          setHostUid(res.hostUid);
          setPlayers(res.players);
          if (res.status === 'playing') setPhase('question');
        }
      );
    };

    if (isHost) {
      socket.emit('quiz:create', { hostUid: uid, roomCode }, (res: any) => {
        // Even if room already exists (server restart edge), proceed to join
        doJoin();
      });
    } else {
      doJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, uid, user?.groupId, roomCode]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const onPlayers = (list: Player[]) => setPlayers(list);
    const onGroupScores = (scores: GroupScore[]) => setGroupScores(scores);
    const onStarted = () => {
      setPhase('question');
      setFinalData(null);
    };
    const onQuestion = (q: Question) => {
      setQuestion(q);
      setSelected(null);
      setResult(null);
      setEliminated(null);
      setHint(null);
      setPhase('question');
    };
    const onAnswerResult = (data: any) => {
      setResult(data);
      setStreak(data.streak);
      setScore(data.score);
      setPowerUpsAvailable(data.powerUpsAvailable);
      if (data.isCorrect) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2E8B6B', '#4A90D9', '#F4A261']
        });
      } else {
        if (cardShake.current) {
          cardShake.current.classList.remove('animate-shake');
          // force reflow
          void cardShake.current.offsetWidth;
          cardShake.current.classList.add('animate-shake');
        }
      }
    };
    const onQuestionEnded = (data: { index: number; correct: number; explanation: string }) => {
      setPhase('reveal');
      if (!result) {
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
    const onFinished = (data: any) => {
      setFinalData(data);
      setPhase('finished');
      // confetti shower for winners
      const shower = () => {
        confetti({ particleCount: 100, spread: 100, origin: { y: 0.3 }, colors: ['#2E8B6B', '#F4A261', '#4A90D9'] });
      };
      shower();
      setTimeout(shower, 400);
      setTimeout(shower, 900);
    };

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
  }, [socket, result]);

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

  const handlePowerUp = (kind: PowerUpKind) => {
    if (!socket || !powerUpsAvailable[kind] || powerUpsUsed[kind]) return;
    socket.emit('quiz:powerUp', { roomCode, uid, kind });
  };

  const startGame = () => {
    if (!socket) return;
    if (players.length < 2) {
      if (!confirm('Chỉ có 1 người chơi. Vẫn bắt đầu?')) return;
    }
    socket.emit('quiz:start', { roomCode, uid });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast({ title: 'Đã copy mã phòng', variant: 'success' });
    setTimeout(() => setCopied(false), 1500);
  };

  const myPlayer = useMemo(() => players.find(p => p.uid === uid), [players, uid]);
  const myGroupScore = useMemo(() => groupScores.find(g => g.groupId === user?.groupId)?.score || 0, [groupScores, user]);

  if (phase === 'lobby') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="surface-card p-8">
          <div className="text-center mb-6">
            <p className="text-sm font-mono text-primary mb-2">PHÒNG QUIZ</p>
            <div className="flex justify-center items-center gap-2 mb-2">
              <h1 className="font-display text-5xl font-bold text-gradient-primary">{roomCode}</h1>
              <button onClick={copyCode} className="p-2 rounded-lg hover:bg-primary-soft" aria-label="Copy mã">
                {copied ? <Check className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5 text-muted" />}
              </button>
            </div>
            <p className="text-muted">Chia sẻ mã này cho bạn bè để cùng tham gia</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-display font-bold">Người chơi ({players.length})</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {players.map(p => (
                <div key={p.uid} className="flex items-center gap-3 rounded-xl bg-primary-soft px-3 py-2">
                  {p.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar} alt={p.name} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      {p.name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    {p.groupName && <div className="text-xs text-muted">Nhóm {p.groupName}</div>}
                  </div>
                  {p.uid === hostUid && (
                    <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full">Host</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {uid === hostUid ? (
            <Button onClick={startGame} className="w-full" size="lg" disabled={players.length === 0}>
              <Sparkles className="h-4 w-4" />
              Bắt đầu game
            </Button>
          ) : (
            <div className="text-center text-muted text-sm py-4">
              Đang đợi host bắt đầu…
              <div className="mt-3 inline-flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'finished' && finalData) {
    const podium = (finalData.groupScores as GroupScore[]).slice(0, 3);
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <Trophy className="h-12 w-12 text-accent mx-auto mb-3" />
          <h1 className="font-display text-4xl font-bold mb-2">Kết quả chung cuộc</h1>
          <p className="text-muted">Các nhóm dẫn đầu</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10 items-end">
          {[1, 0, 2].map((targetRank, idx) => {
            const g = podium[targetRank];
            if (!g) return <div key={idx} />;
            const heights = ['h-48', 'h-64', 'h-40'];
            const colors = ['from-gray-300 to-gray-400', 'from-accent to-yellow-400', 'from-orange-400 to-orange-600'];
            const medals = ['🥈', '🥇', '🥉'];
            const delays = [0.3, 0.1, 0.5];
            return (
              <motion.div
                key={g.groupId}
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delays[idx], type: 'spring', stiffness: 120 }}
                className={cn('surface-card flex flex-col items-center justify-end p-5 bg-gradient-to-b text-white', heights[idx], colors[idx])}
              >
                <div className="text-6xl mb-2">{medals[idx]}</div>
                <div className="font-display text-xl font-bold text-center">{g.groupName}</div>
                <div className="font-mono text-3xl font-bold">{g.score.toLocaleString()}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Badges */}
        {finalData.badges && (
          <div className="surface-card p-6 mb-6">
            <h3 className="font-display font-bold mb-3">Huy hiệu cá nhân</h3>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              {finalData.badges.fastest && (
                <div className="rounded-xl bg-primary-soft p-3">
                  <div className="text-xs text-muted">⚡ Nhanh nhất</div>
                  <div className="font-medium">{finalData.badges.fastest.name}</div>
                </div>
              )}
              {finalData.badges.longestStreak && (
                <div className="rounded-xl bg-accent/10 p-3">
                  <div className="text-xs text-muted">🔥 Streak dài nhất</div>
                  <div className="font-medium">
                    {finalData.badges.longestStreak.name} <span className="text-muted">({finalData.badges.longestStreak.streak})</span>
                  </div>
                </div>
              )}
              {finalData.badges.mostAccurate && (
                <div className="rounded-xl bg-secondary/10 p-3">
                  <div className="text-xs text-muted">🎯 Chính xác nhất</div>
                  <div className="font-medium">
                    {finalData.badges.mostAccurate.name} <span className="text-muted">({finalData.badges.mostAccurate.correct})</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push('/leaderboard')}>
            Xem BXH
          </Button>
          <Button onClick={() => router.push('/game')}>Chơi ván mới</Button>
        </div>
      </div>
    );
  }

  // PHASE: question / reveal
  const lowTime = timeLeft <= 5;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono text-muted">Câu {question ? question.index + 1 : '-'}/{question?.total || '-'}</span>
          <span className="text-muted">•</span>
          <span className="text-muted">Nhóm <strong className="text-primary">{user?.groupName}</strong>: <strong className="font-mono">{myGroupScore.toLocaleString()}đ</strong></span>
          <span className="text-muted">•</span>
          <span className="text-muted">Bạn: <strong className="font-mono text-primary">{score.toLocaleString()}đ</strong></span>
          {streak >= 2 && <span className="text-accent font-mono">🔥 x{streak}</span>}
        </div>
      </div>

      {/* Timer bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className={cn('h-4 w-4', lowTime ? 'text-danger' : 'text-muted')} />
            <motion.span
              className={cn('font-mono text-lg font-bold', lowTime ? 'text-danger' : 'text-text')}
              animate={lowTime ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.7 }}
            >
              {timeLeft}s
            </motion.span>
          </div>
          {/* Group scoreboard */}
          <div className="flex gap-2 flex-wrap text-xs">
            {groupScores.slice(0, 4).map((g, i) => (
              <span key={g.groupId} className="rounded-full bg-primary-soft px-2 py-0.5 font-mono">
                {['🥇', '🥈', '🥉'][i] || ''} {g.groupName}: {g.score}
              </span>
            ))}
          </div>
        </div>
        <div className="h-2 rounded-full bg-primary-soft overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: question ? `${(timeLeft / question.durationSec) * 100}%` : '0%' }}
            className={cn('h-full', lowTime ? 'bg-danger' : 'bg-primary')}
          />
        </div>
      </div>

      {/* Question card */}
      {question && (
        <div ref={cardShake} className="surface-card p-6 md:p-8 mb-5">
          <h2 className="font-display text-xl md:text-2xl font-bold text-text mb-6 leading-snug">
            {question.question}
          </h2>
          {hint && (
            <div className="rounded-xl bg-secondary/10 border border-secondary/30 px-4 py-2 mb-4 text-sm">
              <Search className="inline h-4 w-4 text-secondary mr-1" />
              <span className="text-text">{hint}</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {question.options.map((opt, i) => {
              const isSelected = selected === i;
              const isEliminated = eliminated === i;
              const showCorrect = result && i === result.correct;
              const showWrong = result && isSelected && !result.isCorrect;
              return (
                <motion.button
                  key={i}
                  whileHover={!result && !isEliminated ? { scale: 1.02 } : {}}
                  whileTap={!result && !isEliminated ? { scale: 0.98 } : {}}
                  onClick={() => submitAnswer(i)}
                  disabled={selected !== null || isEliminated || !!result}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-all relative',
                    'disabled:cursor-not-allowed',
                    isEliminated && 'opacity-30 line-through',
                    !result && !isSelected && !isEliminated && 'border-border bg-surface hover:border-primary hover:bg-primary-soft',
                    isSelected && !result && 'border-primary bg-primary-soft',
                    showCorrect && 'border-primary bg-primary text-white',
                    showWrong && 'border-danger bg-danger/20 text-danger'
                  )}
                >
                  <span className="font-mono font-bold mr-2 opacity-60">{['A', 'B', 'C', 'D'][i]}</span>
                  {opt}
                </motion.button>
              );
            })}
          </div>

          {/* Score pop */}
          <AnimatePresence>
            {result && result.points > 0 && (
              <motion.div
                key={result.points}
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 1], y: -30, opacity: [0, 1, 1] }}
                exit={{ opacity: 0, y: -60 }}
                transition={{ duration: 0.8 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-display font-bold text-accent pointer-events-none drop-shadow-lg"
              >
                +{result.points}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reveal explanation */}
          {phase === 'reveal' && result?.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl bg-primary-soft p-3 text-sm text-text"
            >
              <span className="font-medium text-primary">💡 Giải thích: </span>
              {result.explanation}
            </motion.div>
          )}
        </div>
      )}

      {/* Power-ups */}
      <div className="flex gap-2 flex-wrap">
        <PowerUpButton
          kind="negotiation"
          label="Đàm phán"
          icon={Handshake}
          desc="Loại 1 đáp án sai"
          available={powerUpsAvailable.negotiation}
          used={powerUpsUsed.negotiation}
          disabled={selected !== null}
          onClick={() => handlePowerUp('negotiation')}
        />
        <PowerUpButton
          kind="extend"
          label="Gia hạn"
          icon={Clock}
          desc="+10 giây"
          available={powerUpsAvailable.extend}
          used={powerUpsUsed.extend}
          disabled={selected !== null}
          onClick={() => handlePowerUp('extend')}
        />
        <PowerUpButton
          kind="intel"
          label="Tình báo"
          icon={Search}
          desc="Gợi ý"
          available={powerUpsAvailable.intel}
          used={powerUpsUsed.intel}
          disabled={selected !== null}
          onClick={() => handlePowerUp('intel')}
        />
      </div>
    </div>
  );
}

function PowerUpButton({
  label,
  icon: Icon,
  desc,
  available,
  used,
  disabled,
  onClick
}: {
  kind: string;
  label: string;
  icon: any;
  desc: string;
  available: boolean;
  used: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!available || used || disabled}
      className={cn(
        'flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm transition-all',
        available && !used && !disabled
          ? 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-white cursor-pointer'
          : 'border-border bg-surface text-muted opacity-50 cursor-not-allowed'
      )}
      title={available ? desc : used ? 'Đã dùng' : 'Chưa mở khoá (streak 3 câu đúng)'}
    >
      <Icon className="h-4 w-4" />
      <div className="text-left leading-tight">
        <div className="font-medium">{label}</div>
        <div className="text-[10px] opacity-80">{desc}</div>
      </div>
    </button>
  );
}
