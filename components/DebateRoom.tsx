'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Trophy, Copy, Check, Flag, Mic, ThumbsUp, ThumbsDown,
  Swords, Crown, Timer, Send, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useDebateGame, DebateMatchSummary } from '@/hooks/useDebateGame';
import { cn } from '@/lib/utils';

const GROUP_COLORS = ['#E05C5C','#4A90D9','#F4A261','#2E8B6B','#9C5BC0','#F4C542','#E86AA6','#3AB0A2'];
function gColor(gid: string, groups: { groupId: string }[]) {
  const i = Math.max(0, groups.findIndex(g => g.groupId === gid));
  return GROUP_COLORS[i % GROUP_COLORS.length];
}

export function DebateRoom() {
  const router = useRouter();
  const { data: session } = useSession();
  const g = useDebateGame();
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const copyCode = useCallback(() => {
    navigator.clipboard?.writeText(g.roomCode);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }, [g.roomCode]);

  const createRoom = useCallback(async () => {
    if (!session) { signIn('google'); return; }
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/debate/session', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.roomCode) throw new Error(data?.error || 'Không tạo được phòng');
      router.push(`/game?play=debate&room=${data.roomCode}&host=1`);
    } catch (e: any) {
      toast({ title: 'Không tạo được phòng', description: String(e?.message || e), variant: 'danger' });
      setCreating(false);
    }
  }, [session, creating, router]);

  if (!g.roomCode) return <RoleGate creating={creating} onHost={createRoom} />;
  if (g.finished) return <FinishScreen data={g.finished} myGroupId={g.myGroupId} onHome={() => router.push('/game')} onBoard={() => router.push('/leaderboard')} />;

  const groups = g.state?.groups || [];

  return (
    <div className="min-h-screen py-6 px-3 md:px-4 flex justify-center">
      <div className="w-full max-w-[1400px]">
        {/* header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-text flex items-center gap-2">
              <Swords className="text-primary" /> Nghị Trường Quốc Tế — Tranh Luận
            </h1>
            <PhaseLabel g={g} />
          </div>
          <div className="flex items-center gap-2">
            {g.state?.status === 'playing' && (g.isHostMe || g.isHost) && (
              <Button variant="outline" size="sm" onClick={() => confirm('Kết thúc sớm?') && g.sendArg('')}>
                <Flag size={14} className="mr-1" />
              </Button>
            )}
            <button onClick={copyCode} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border hover:shadow-md transition">
              <span className="font-mono font-bold tracking-widest text-primary">{g.roomCode}</span>
              {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-muted" />}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-4">
            {g.phase === 'LOBBY' && <Lobby g={g} />}
            {(g.phase === 'MATCH_PREP' || g.phase === 'TURN' || g.phase === 'VOTING' || g.phase === 'MATCH_RESULT') && (
              <MatchStage g={g} groups={groups} />
            )}
          </div>
          <div className="space-y-4">
            <BracketTree bracket={g.state?.bracket || []} groups={groups} myGroupId={g.myGroupId} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Role gate ---------------------------------- */
function RoleGate({ creating, onHost }: { creating: boolean; onHost: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [showRules, setShowRules] = useState(false);

  if (showRules) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-xl p-8 space-y-5">
          <h2 className="font-display text-2xl text-text">Luật chơi — Nghị Trường Quốc Tế</h2>
          <ol className="space-y-3 text-sm text-text list-decimal list-inside">
            <li><span className="font-semibold">Thể thức:</span> 8 nhóm, 3 vòng loại trực tiếp. Vòng 1: 4 cặp đấu, Vòng 2: 4 nhóm thắng, Chung kết: 2 nhóm cuối.</li>
            <li><span className="font-semibold">Mỗi trận:</span> 2 nhóm được phân quan điểm ngẫu nhiên cho 1 chủ đề — dù đồng ý hay không, phải bảo vệ luận điểm đó.</li>
            <li><span className="font-semibold">Lượt phát biểu:</span> 8 lượt 30 giây xen kẽ giữa 2 nhóm. Nhóm đến lượt gõ văn bản luận điểm.</li>
            <li><span className="font-semibold">Bỏ phiếu:</span> 6 nhóm không tranh luận chọn nhóm nào trình bày thuyết phục hơn. Không được vote cho nhóm mình.</li>
            <li><span className="font-semibold">Chiến thắng:</span> Nhóm được vote nhiều hơn thắng trận và +300 điểm.</li>
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
          <Swords className="mx-auto text-primary mb-2" size={40} />
          <h1 className="font-display text-2xl text-text">Nghị Trường Quốc Tế</h1>
          <p className="text-muted text-sm mt-1">Tranh luận vòng đấu loại trực tiếp — 8 nhóm, 3 vòng.</p>
        </div>
        <Button className="w-full" onClick={() => setShowRules(true)}>
          Tạo phòng
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" /><span className="text-xs text-muted">hoặc</span><div className="h-px flex-1 bg-border" />
        </div>
        <div className="flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Nhập mã phòng"
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-bg font-mono tracking-widest uppercase" />
          <Button variant="secondary" onClick={() => code.trim() && router.push(`/game?play=debate&room=${code.trim()}`)}>Vào</Button>
        </div>
      </div>
    </div>
  );
}

function PhaseLabel({ g }: { g: any }) {
  const m = g.match;
  if (g.phase === 'LOBBY') return <p className="text-muted text-sm">Chờ các nhóm vào phòng</p>;
  if (!m) return null;
  const rnd = m.roundIdx + 1; const tot = g.state?.bracket?.length || '?';
  const label = g.phase === 'MATCH_PREP' ? 'Chuẩn bị'
    : g.phase === 'TURN' ? `Lượt ${m.turnIdx + 1}/8 — ${m.activeGroupId === g.myGroupId ? 'ĐẾN LƯỢT BẠN' : `Nhóm ${g.state?.groups?.find((x: any) => x.groupId === m.activeGroupId)?.groupName || ''} đang phát biểu`}`
    : g.phase === 'VOTING' ? 'Bỏ phiếu'
    : g.phase === 'MATCH_RESULT' ? 'Kết quả trận đấu'
    : '';
  return <p className="text-muted text-sm mt-0.5">Vòng {rnd}/{tot} · Trận {m.matchIdx + 1} · {label}</p>;
}

/* ----------------------------- Lobby -------------------------------------- */
function Lobby({ g }: { g: any }) {
  const byGroup: Record<string, any[]> = {};
  (g.players as any[]).forEach(p => { const k = p.groupId || '__'; (byGroup[k] = byGroup[k] || []).push(p); });
  const sortedGroups = Object.entries(byGroup).sort(([, a], [, b]) => {
    const na = (a as any[])[0]?.groupName || '';
    const nb = (b as any[])[0]?.groupName || '';
    return na.localeCompare(nb, 'vi', { numeric: true });
  });
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-5">
      <div className="flex items-center gap-2 text-text font-semibold">
        <Users size={18} className="text-primary" /> {g.players.length} người · {sortedGroups.length} nhóm
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {sortedGroups.map(([gid, members]) => (
          <div key={gid} className="rounded-xl border border-border p-3">
            <div className="font-semibold text-text text-sm">{(members[0] as any)?.groupName || 'Khách'}</div>
            <div className="text-xs text-muted">{(members as any[]).map(m => m.name).join(', ')}</div>
          </div>
        ))}
      </div>
      {(g.isHostMe || g.isHost) ? (
        <Button className="w-full" size="lg" onClick={g.startGame}>Bắt đầu</Button>
      ) : (
        <p className="text-center text-muted text-sm">Chờ quản trò bắt đầu…</p>
      )}
    </div>
  );
}

/* ----------------------------- Match stage -------------------------------- */
function MatchStage({ g, groups }: { g: any; groups: any[] }) {
  const m = g.match;
  if (!m) return null;
  const team1Color = gColor(m.team1, groups);
  const team2Color = gColor(m.team2, groups);
  return (
    <div className="space-y-4">
      {/* match header */}
      <div className="bg-surface rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted">
            Vòng {m.roundIdx + 1} · Trận {m.matchIdx + 1}
          </span>
          <div className="flex items-center gap-2">
            <Countdown seconds={g.phase === 'TURN' && g.turnEnded ? -1 : g.timeLeft} />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-center flex-wrap mb-3">
          <TeamBadge name={m.team1Name} side={m.team1Side} color={team1Color} active={m.activeGroupId === m.team1} isMe={g.myGroupId === m.team1}
            isFirst={!m.activeGroupId && m.turnOrder?.[0] === m.team1}
            onClick={(g.isHostMe || g.isHost) && !m.activeGroupId && m.turnOrder ? () => g.setFirstSpeaker(m.team1) : undefined} />
          <span className="font-display text-xl text-muted">VS</span>
          <TeamBadge name={m.team2Name} side={m.team2Side} color={team2Color} active={m.activeGroupId === m.team2} isMe={g.myGroupId === m.team2}
            isFirst={!m.activeGroupId && m.turnOrder?.[0] === m.team2}
            onClick={(g.isHostMe || g.isHost) && !m.activeGroupId && m.turnOrder ? () => g.setFirstSpeaker(m.team2) : undefined} />
        </div>
        {m.topic && (
          <div className="rounded-xl bg-bg border border-border p-3 text-sm">
            <p className="font-semibold text-text">{m.topic.title}</p>
            <p className="text-muted text-xs mt-1">{m.topic.context}</p>
          </div>
        )}
      </div>

      {/* turn indicator */}
      {g.phase === 'TURN' && (
        <TurnTrack turnOrder={m.turnOrder} turnIdx={m.turnIdx} team1={m.team1} team2={m.team2} team1Color={team1Color} team2Color={team2Color} groups={groups} />
      )}

      {/* chat / messages — only show when there are messages */}
      {m.messages.length > 0 && (
        <MessageFeed messages={m.messages} team1={m.team1} team1Name={m.team1Name} team2={m.team2} team2Name={m.team2Name} team1Color={team1Color} team2Color={team2Color} reactions={m.reactions} />
      )}

      {/* action panel */}
      {g.phase === 'MATCH_PREP' && <PrepPanel g={g} m={m} />}
      {g.phase === 'TURN' && <TurnPanel g={g} m={m} />}
      {g.phase === 'VOTING' && <VotePanel g={g} m={m} team1Color={team1Color} team2Color={team2Color} />}
      {g.phase === 'MATCH_RESULT' && <ResultPanel g={g} m={m} team1Color={team1Color} team2Color={team2Color} />}
    </div>
  );
}

function TeamBadge({ name, side, color, active, isMe, isFirst, onClick }: { name: string; side: string; color: string; active: boolean; isMe: boolean; isFirst?: boolean; onClick?: () => void }) {
  return (
    <div
      className={cn('rounded-xl border-2 px-4 py-2 text-center transition-all', active ? 'shadow-md scale-105' : 'opacity-80', onClick ? 'cursor-pointer hover:scale-105' : '')}
      style={{ borderColor: color, background: active ? color + '18' : isFirst ? color + '10' : undefined }}
      onClick={onClick}
    >
      <p className="font-semibold text-text text-sm">{name}{isMe && <span className="ml-1 text-xs text-muted">(bạn)</span>}</p>
      <p className="text-xs" style={{ color }}>{side}</p>
      {isFirst && <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>▶ Đi trước</p>}
    </div>
  );
}

function TurnTrack({ turnOrder, turnIdx, team1, team2, team1Color, team2Color, groups }: any) {
  return (
    <div className="bg-surface rounded-xl border border-border p-3">
      <p className="text-xs text-muted mb-2">Thứ tự lượt</p>
      <div className="flex gap-1 flex-wrap">
        {turnOrder.map((gid: string, i: number) => {
          const c = gid === team1 ? team1Color : team2Color;
          const done = i < turnIdx;
          const active = i === turnIdx;
          return (
            <div key={i} className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
              done ? 'opacity-30' : active ? 'ring-2 ring-offset-1' : 'opacity-60')}
              style={{ background: c + (done ? '40' : '30'), color: c }}>
              {Math.floor(i / 2) + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageFeed({ messages, team1, team1Name, team2, team2Name, team1Color, team2Color, reactions }: any) {
  const endRef = useRef<HTMLDivElement>(null);
  const grouped = messages.reduce((acc: any, m: any) => {
    const last = acc[acc.length - 1];
    if (last && last.groupId === m.groupId && last.turnIdx === m.turnIdx) {
      last.texts.push(m.text);
    } else {
      acc.push({ ...m, texts: [m.text] });
    }
    return acc;
  }, []);
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 max-h-72 overflow-y-auto space-y-3">
      {grouped.length === 0 && null}
      {grouped.map((g: any, i: number) => {
        const isT1 = g.groupId === team1;
        const color = isT1 ? team1Color : team2Color;
        const name = isT1 ? team1Name : team2Name;
        const r = reactions[g.groupId] || {};
        return (
          <div key={i} className={cn('flex gap-2', isT1 ? '' : 'flex-row-reverse')}>
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: color }}>{name[0]}</div>
            <div className={cn('max-w-[75%] space-y-0.5', isT1 ? '' : 'items-end flex flex-col')}>
              <p className="text-[11px] font-semibold" style={{ color }}>{name} · lượt {Math.floor(g.turnIdx / 2) + 1}</p>
              {g.texts.map((t: string, j: number) => (
                <div key={j} className="rounded-xl px-3 py-2 text-sm text-text" style={{ background: color + '18' }}>{t}</div>
              ))}
              <div className="flex gap-2 text-[11px] text-muted">
                <span>👏 {r.clap || 0}</span><span>🤔 {r.think || 0}</span><span>❗ {r.exclaim || 0}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function PrepPanel({ g, m }: any) {
  const myGid = g.myGroupId;
  const inMatch = myGid === m.team1 || myGid === m.team2;
  const mySide = myGid === m.team1 ? m.team1Side : myGid === m.team2 ? m.team2Side : null;
  const starters = m.topic?.argumentStarters || [];

  // Observer view: only host sees the advance button, others see nothing extra
  if (!inMatch && !(g.isHostMe || g.isHost)) return null;

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
      {inMatch && (
        <>
          <p className="font-semibold text-text flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Quan điểm của nhóm bạn: <b style={{ color: myGid === m.team1 ? '#2E8B6B' : '#4A90D9' }}>{mySide}</b></p>
          {starters.length > 0 && (
            <div className="rounded-xl bg-primary-soft p-3 space-y-1">
              <p className="text-xs font-semibold text-primary">Gợi ý mở đầu</p>
              {starters.map((s: string, i: number) => <p key={i} className="text-xs text-muted">• {s}</p>)}
            </div>
          )}
        </>
      )}
      {(g.isHostMe || g.isHost) && (
        <Button className="w-full" onClick={g.nextTurn}>Bắt đầu lượt đầu tiên →</Button>
      )}
    </div>
  );
}

function TurnPanel({ g, m }: any) {
  const allTurnsDone = m.turnOrder && m.turnIdx >= m.turnOrder.length;
  const isHost = g.isHostMe || g.isHost;
  // Only show if there's actually content: active speaker OR host
  if (!g.amIActive && !isHost) return null;
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
      {g.amIActive && (
        <p className="text-sm font-semibold text-primary flex items-center gap-1"><Mic size={15} /> Đến lượt nhóm bạn phát biểu!</p>
      )}
      {isHost && (
        allTurnsDone
          ? <Button className="w-full" onClick={g.startVoting}>Bắt đầu bỏ phiếu →</Button>
          : <Button className="w-full" onClick={g.nextTurn}>Lượt tiếp →</Button>
      )}
    </div>
  );
}

function VotePanel({ g, m, team1Color, team2Color }: any) {
  if (g.isHostMe || g.isHost || g.amIDebating) {
    // Host and debating teams see tally only (no vote button)
    const tally = m.voteTally || {};
    const total = (Object.values(tally) as number[]).reduce((s, n) => s + (n as number), 0);
    return (
      <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
        <p className="font-semibold text-text flex items-center gap-2"><Trophy size={16} className="text-accent" /> Kết quả bỏ phiếu ({g.timeLeft}s)</p>
        <div className="grid grid-cols-2 gap-3">
          {[{gid: m.team1, name: m.team1Name, color: team1Color}, {gid: m.team2, name: m.team2Name, color: team2Color}].map(({gid, name, color}) => {
            const n = (tally[gid] || 0) as number;
            const pct = total > 0 ? Math.round(n / total * 100) : 0;
            return (
              <div key={gid} className="rounded-xl border border-border p-4 text-center">
                <p className="font-semibold text-text">{name}</p>
                <p className="text-2xl font-bold mt-1" style={{ color }}>{pct}%</p>
                <p className="text-xs text-muted">{n} phiếu</p>
              </div>
            );
          })}
        </div>
        {g.amIDebating && <p className="text-center text-xs text-muted">Nhóm đang tranh luận không được bỏ phiếu.</p>}
        {(g.isHostMe || g.isHost) && (
          <Button className="w-full" onClick={g.forceNextMatch}>Kết thúc trận →</Button>
        )}
      </div>
    );
  }
  const tally = m.voteTally || {};
  const total = (Object.values(tally) as number[]).reduce((s, n) => s + n, 0);
  return (
    <div className="bg-surface rounded-2xl border-2 border-secondary p-5 space-y-4">
      <p className="font-semibold text-text flex items-center gap-2"><Trophy size={16} className="text-accent" /> Bỏ phiếu — nhóm nào tranh luận thuyết phục hơn?</p>
      <div className="grid grid-cols-2 gap-3">
        {[{gid: m.team1, name: m.team1Name, color: team1Color}, {gid: m.team2, name: m.team2Name, color: team2Color}].map(({gid, name, color}) => {
          const n = tally[gid] || 0;
          const pct = total > 0 ? Math.round(n / total * 100) : 0;
          const voted = g.myVote === gid;
          return (
            <button key={gid} onClick={() => g.vote(gid)}
              className={cn('rounded-xl border-2 p-4 text-center transition-all hover:scale-105', voted ? 'shadow-lg' : 'border-border')}
              style={{ borderColor: voted ? color : undefined, background: voted ? color + '18' : undefined }}>
              <p className="font-semibold text-text">{name}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{pct}%</p>
              <p className="text-xs text-muted">{n} phiếu</p>
            </button>
          );
        })}
      </div>
      {(g.isHostMe || g.isHost) && (
        <Button className="w-full mt-2" onClick={g.forceNextMatch}>Kết thúc trận →</Button>
      )}
    </div>
  );
}

function ResultPanel({ g, m, team1Color, team2Color }: any) {
  const winner = m.winner;
  const winnerName = winner === m.team1 ? m.team1Name : m.team2Name;
  const color = winner === m.team1 ? team1Color : team2Color;
  const isHost = g.isHostMe || g.isHost;
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="bg-surface rounded-2xl border-2 p-6 text-center space-y-4" style={{ borderColor: color }}>
      <Crown className="mx-auto" size={32} style={{ color }} />
      <p className="font-display text-xl text-text">Nhóm thắng:</p>
      <p className="font-display text-3xl font-bold" style={{ color }}>{winnerName}</p>
      {isHost ? (
        <Button className="w-full" size="lg" onClick={g.nextMatch}>Cặp đấu tiếp →</Button>
      ) : (
        <p className="text-muted text-sm">Chờ quản trò chuyển cặp đấu…</p>
      )}
    </motion.div>
  );
}

/* ----------------------------- Bracket Tree -------------------------------- */
function BracketTree({ bracket, groups: groupsList, myGroupId }: { bracket: DebateMatchSummary[][]; groups: any[]; myGroupId: string }) {
  if (!bracket.length) return null;

  const MATCH_H = 56, MATCH_W = 120, CONN_W = 24, GAP0 = 8;
  const BORDER_COLOR = '#D4E8DF';

  const eliminated = new Set<string>();
  bracket.forEach(round => round.forEach(m => {
    if (m.winner && m.winner !== m.team1) eliminated.add(m.team1);
    if (m.winner && m.winner !== m.team2) eliminated.add(m.team2);
  }));

  const TeamRow = ({ gid, name }: { gid: string; name: string }) => {
    const color = gColor(gid, groupsList);
    const isElim = eliminated.has(gid);
    const isMe = gid === myGroupId;
    return (
      <div className={cn('px-2 py-[5px] border-l-[3px] text-[11px]', isElim ? 'opacity-25' : '', isMe ? 'bg-primary/8' : '')}
           style={{ borderLeftColor: color }}>
        <span className={cn('block truncate', isElim ? 'text-muted' : 'text-text font-medium')}>{name || '?'}</span>
      </div>
    );
  };

  // Compute absolute top position for each match
  const positions: number[][] = [];
  positions[0] = bracket[0].map((_, mi) => mi * (MATCH_H + GAP0));
  for (let ri = 1; ri < bracket.length; ri++) {
    positions[ri] = bracket[ri].map((_, mi) => {
      const t0 = positions[ri - 1][mi * 2] ?? 0;
      const t1 = positions[ri - 1][mi * 2 + 1] ?? t0;
      return (t0 + t1 + MATCH_H) / 2 - MATCH_H / 2;
    });
  }

  const totalH = (positions[0]?.at(-1) ?? 0) + MATCH_H;
  const totalW = bracket.length * MATCH_W + (bracket.length - 1) * CONN_W;
  const roundLabels = ['Tứ kết', 'Bán kết', 'Chung kết'];

  return (
    <div className="bg-surface rounded-2xl border border-border p-4">
      <p className="font-semibold text-text mb-3 flex items-center gap-2"><Swords size={15} className="text-primary" /> Bảng đấu</p>
      <div style={{ width: totalW }} className="mb-1 flex">
        {bracket.map((_, ri) => (
          <div key={ri} style={{ width: MATCH_W + (ri < bracket.length - 1 ? CONN_W : 0) }}>
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider text-center">
              {roundLabels[ri] ?? `Vòng ${ri + 1}`}
            </p>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', height: totalH, width: totalW, overflowX: 'auto' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} overflow="visible">
          {bracket.flatMap((_, ri) => {
            if (ri >= bracket.length - 1) return [];
            return bracket[ri + 1].map((__, ni) => {
              const colX = ri * (MATCH_W + CONN_W) + MATCH_W;
              const nextX = (ri + 1) * (MATCH_W + CONN_W);
              const midX = colX + CONN_W / 2;
              const y0 = (positions[ri][ni * 2] ?? 0) + MATCH_H / 2;
              const y1 = (positions[ri][ni * 2 + 1] ?? positions[ri][ni * 2] ?? 0) + MATCH_H / 2;
              const yMid = (y0 + y1) / 2;
              return (
                <g key={`${ri}-${ni}`} stroke={BORDER_COLOR} strokeWidth={1.5} fill="none">
                  <line x1={colX} y1={y0} x2={midX} y2={y0} />
                  <line x1={colX} y1={y1} x2={midX} y2={y1} />
                  <line x1={midX} y1={y0} x2={midX} y2={y1} />
                  <line x1={midX} y1={yMid} x2={nextX} y2={yMid} />
                </g>
              );
            });
          })}
        </svg>
        {bracket.flatMap((round, ri) =>
          round.map((match, mi) => (
            <div key={match.id}
                 style={{ position: 'absolute', top: positions[ri][mi], left: ri * (MATCH_W + CONN_W), width: MATCH_W }}
                 className={cn('rounded-lg border overflow-hidden bg-surface', !match.winner ? 'border-primary/40' : 'border-border/60')}>
              <TeamRow gid={match.team1} name={match.team1Name} />
              <div className="h-px bg-border/60" />
              <TeamRow gid={match.team2 || ''} name={match.team2Name || '?'} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Finish ------------------------------------- */
function FinishScreen({ data, myGroupId, onHome, onBoard }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-xl p-8 text-center space-y-5">
        <Crown className="mx-auto text-accent" size={48} />
        <h1 className="font-display text-3xl text-text">Kết thúc giải đấu!</h1>
        {data.championName && (
          <p className="text-xl text-text">🏆 Vô địch: <b className="text-primary">{data.championName}</b></p>
        )}
        <div className={(data.standings || []).length ? 'space-y-1.5 text-left' : 'hidden'}>
          {(data.standings || []).map((gr: any, i: number) => (
            <div key={gr.groupId} className={cn('flex items-center justify-between rounded-lg px-3 py-2', gr.groupId === myGroupId ? 'bg-primary-soft' : 'bg-bg')}>
              <span className="text-text">{i + 1}. {gr.groupName}</span>
            </div>
          ))}
        </div>
        {data.bracket && <BracketTree bracket={data.bracket} groups={data.standings || []} myGroupId={myGroupId} />}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onHome}>Về sảnh</Button>
          <Button className="flex-1" onClick={onBoard}>Bảng xếp hạng</Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- helpers ------------------------------------ */
function Countdown({ seconds }: { seconds: number }) {
  if (seconds < 0) return <span className="font-mono font-bold text-xl text-accent">⏱ Hết giờ!</span>;
  if (seconds === 0) return null;
  const danger = seconds <= 8;
  return (
    <motion.span animate={{ scale: danger ? [1, 1.1, 1] : 1 }} transition={{ repeat: danger ? Infinity : 0, duration: 0.7 }}
      className={cn('font-mono font-bold text-xl', danger ? 'text-danger' : 'text-text')}>
      {seconds}s
    </motion.span>
  );
}
