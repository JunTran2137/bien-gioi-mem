// @ts-check
// In-memory debate game — TOURNAMENT BRACKET edition
//
// Format:
//   Round 1 (R1): 4 matches (8 groups → 4 winners)
//   Round 2 (R2): 2 matches (4 winners → 2 winners)
//   Round 3 (R3): 1 match  (Grand final → 1 champion)
//
// Per match:
//   MATCH_PREP  (PREP_SECONDS)  — topic revealed, both teams prepare
//   TURN × 8   (TURN_SECONDS)  — alternating: team1, team2, team1, …  (4 each)
//     Active team can type arguments; non-active players can react.
//   VOTING      (VOTE_SECONDS)  — only the 6 non-debating groups vote
//   MATCH_RESULT (RESULT_SECONDS) — winner shown, bracket advances
//   repeat until all rounds done → FINISHED

const { getDb } = require('./db');
const { debateTopics } = require('../data/debateTopics');

const PREP_SECONDS = 30;          // prep time per match
const TURN_SECONDS = 30;          // each speaking turn
const TURNS_PER_TEAM = 4;         // each team gets 4 turns → 8 turns total
const VOTE_SECONDS = 30;
const RESULT_SECONDS = 8;         // show result before auto-advancing

/** @type {Map<string, any>} */
const rooms = new Map();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ----------------------------- room lifecycle ----------------------------- */

function createRoom(roomCode, hostUid) {
  const existing = rooms.get(roomCode);
  if (existing) { if (hostUid && existing.status === 'waiting') existing.hostUid = hostUid; return existing; }
  const room = {
    roomCode,
    hostUid,
    status: 'waiting', // waiting | playing | finished
    phase: 'LOBBY',    // LOBBY | MATCH_PREP | TURN | VOTING | MATCH_RESULT | FINISHED
    players: new Map(),     // uid -> player
    groups: new Map(),      // groupId -> { groupId, groupName, score }
    // bracket[roundIdx][matchIdx] = { id, team1, team2, topic, winner }
    bracket: /** @type {any[][]} */ ([]),
    shuffledTopics: /** @type {any[]} */ ([]),
    topicIdx: 0,
    roundIdx: 0,
    matchIdx: 0,
    // live match state
    match: /** @type {any} */ (null),
    timer: null
  };
  rooms.set(roomCode, room);
  return room;
}

function getRoom(roomCode) { return rooms.get(roomCode) || null; }

function joinRoom(roomCode, player) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const gid = player.groupId || '__no_group__';
  const gname = player.groupName || 'Khách';
  const existing = room.players.get(player.uid);
  if (existing) {
    existing.socketId = player.socketId;
    existing.name = player.name;
    existing.groupId = gid;
    existing.groupName = gname;
  } else {
    room.players.set(player.uid, {
      uid: player.uid, name: player.name, avatar: player.avatar || null,
      groupId: gid, groupName: gname, socketId: player.socketId
    });
  }
  if (!room.groups.has(gid)) room.groups.set(gid, { groupId: gid, groupName: gname });
  return room;
}

function leaveBySocketId(socketId) {
  for (const room of rooms.values()) {
    for (const p of room.players.values()) {
      if (p.socketId === socketId) return { room, uid: p.uid };
    }
  }
  return null;
}

/* ------------------------------- public views ----------------------------- */

function publicPlayerList(room) {
  return Array.from(room.players.values()).map(p => ({
    uid: p.uid, name: p.name, avatar: p.avatar, groupId: p.groupId, groupName: p.groupName
  }));
}

function publicGroups(room) {
  return Array.from(room.groups.values()).map(g => ({ ...g }));
}

/** Public bracket: array of rounds, each an array of match summaries */
function publicBracket(room) {
  return room.bracket.map(round =>
    round.map(m => ({
      id: m.id,
      team1: m.team1,
      team1Name: room.groups.get(m.team1)?.groupName || m.team1,
      team2: m.team2,
      team2Name: room.groups.get(m.team2)?.groupName || m.team2,
      winner: m.winner || null,
      topicTitle: m.topic?.title || null
    }))
  );
}

/** Public match state — safe to send to all clients */
function publicMatch(room) {
  const m = room.match;
  if (!m) return null;
  return {
    id: m.id,
    team1: m.team1,
    team1Name: room.groups.get(m.team1)?.groupName || m.team1,
    team2: m.team2,
    team2Name: room.groups.get(m.team2)?.groupName || m.team2,
    team1Side: m.team1Side,
    team2Side: m.team2Side,
    topic: m.topic,
    roundIdx: m.roundIdx,
    matchIdx: m.matchIdx,
    turnOrder: m.turnOrder,
    turnIdx: m.turnIdx,
    activeGroupId: m.turnIdx >= 0 && m.turnIdx < m.turnOrder.length ? m.turnOrder[m.turnIdx] : null,
    messages: m.messages,
    reactions: m.reactions,
    voteTally: publicTally(m),
    winner: m.winner || null
  };
}

function publicTally(m) {
  if (!m) return {};
  /** @type {Record<string,number>} */
  const t = { [m.team1]: 0, [m.team2]: 0 };
  for (const gid of m.votes.values()) if (gid in t) t[gid]++;
  return t;
}

function emitState(room, io) {
  io.to('debate:' + room.roomCode).emit('debate:state', {
    status: room.status,
    phase: room.phase,
    roundIdx: room.roundIdx,
    matchIdx: room.matchIdx,
    bracket: publicBracket(room),
    groups: publicGroups(room),
    match: publicMatch(room),
    deadline: room.match?.deadline || 0
  });
}

/* ------------------------------- game start ------------------------------- */

function buildBracket(groupIds, topics) {
  const shuffled = shuffle(groupIds);
  // ensure even count (bye = null if odd)
  const padded = [...shuffled];
  if (padded.length % 2 !== 0) padded.push(null);
  /** @type {any[][]} */
  const bracket = [];
  let topicIdx = 0;
  let roundTeams = padded;
  while (roundTeams.length >= 2) {
    /** @type {any[]} */
    const round = [];
    for (let i = 0; i < roundTeams.length; i += 2) {
      round.push({
        id: `r${bracket.length}m${i / 2}`,
        team1: roundTeams[i],
        team2: roundTeams[i + 1],
        topic: topics[topicIdx % topics.length],
        winner: null
      });
      topicIdx++;
    }
    bracket.push(round);
    // next round slots start empty (filled as winners advance)
    if (round.length <= 1) break;
    roundTeams = new Array(Math.floor(round.length / 2)).fill(null); // placeholders
    break; // only build first round statically; later rounds built dynamically
  }
  return { bracket, topicIdx };
}

function startGame(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room || room.status === 'playing') return;
  const groupIds = Array.from(room.groups.keys());
  if (groupIds.length < 2) {
    io.to('debate:' + roomCode).emit('debate:error', { message: 'Cần ít nhất 2 nhóm để tranh luận.' });
    return;
  }
  room.shuffledTopics = shuffle(debateTopics);
  const { bracket } = buildBracket(groupIds, room.shuffledTopics);
  room.bracket = bracket;
  room.topicIdx = bracket[0].length; // topics already used
  room.status = 'playing';
  room.roundIdx = 0;
  room.matchIdx = 0;
  try {
    const db = getDb();
    db.prepare(`INSERT OR REPLACE INTO debate_sessions (id, room_code, status, started_at) VALUES (?, ?, 'playing', datetime('now'))`).run(roomCode, roomCode);
  } catch (e) { console.error('[debate] start persist failed', e); }
  startMatch(room, io);
}

/* ------------------------------- match loop ------------------------------- */

function startMatch(room, io) {
  clearTimer(room);
  const bracket = room.bracket;
  // check if we're past the end
  if (room.roundIdx >= bracket.length) { finalize(room, io); return; }
  const round = bracket[room.roundIdx];
  if (room.matchIdx >= round.length) {
    // advance to next round: build it from winners
    const winners = round.map(m => m.winner).filter(Boolean);
    if (winners.length < 2) { finalize(room, io); return; }
    const padded = [...winners];
    if (padded.length % 2 !== 0) padded.push(null);
    /** @type {any[]} */
    const nextRound = [];
    for (let i = 0; i < padded.length; i += 2) {
      nextRound.push({
        id: `r${room.bracket.length}m${i / 2}`,
        team1: padded[i],
        team2: padded[i + 1],
        topic: room.shuffledTopics[room.topicIdx++ % room.shuffledTopics.length],
        winner: null
      });
    }
    room.bracket.push(nextRound);
    room.roundIdx = room.bracket.length - 1;
    room.matchIdx = 0;
  }
  const matchDef = room.bracket[room.roundIdx][room.matchIdx];
  if (!matchDef.team1 || !matchDef.team2) {
    // bye — auto-advance without playing
    matchDef.winner = matchDef.team1 || matchDef.team2;
    room.matchIdx++;
    startMatch(room, io);
    return;
  }
  // Build alternating turn order: t1 t2 t1 t2 ...
  const turnOrder = [];
  for (let i = 0; i < TURNS_PER_TEAM * 2; i++) {
    turnOrder.push(i % 2 === 0 ? matchDef.team1 : matchDef.team2);
  }
  room.match = {
    id: matchDef.id,
    roundIdx: room.roundIdx,
    matchIdx: room.matchIdx,
    team1: matchDef.team1,
    team2: matchDef.team2,
    team1Side: 'ủng hộ',
    team2Side: 'phản đối',
    topic: matchDef.topic,
    turnOrder,
    turnIdx: -1,       // -1 = prep phase
    messages: [],      // { turnIdx, groupId, text, ts }
    reactions: {       // groupId -> { clap, think, exclaim }
      [matchDef.team1]: { clap: 0, think: 0, exclaim: 0 },
      [matchDef.team2]: { clap: 0, think: 0, exclaim: 0 }
    },
    votes: new Map(),  // uid -> groupId (team1 or team2)
    winner: null,
    deadline: 0
  };
  room.phase = 'MATCH_PREP';
  room.match.deadline = 0; // no auto-timer — host manually starts first turn
  emitState(room, io);
}

/** Host picks which team speaks first (only valid during MATCH_PREP). */
function setFirstSpeaker(roomCode, uid, teamGroupId, io) {
  const room = rooms.get(roomCode);
  if (!room || room.hostUid !== uid || room.phase !== 'MATCH_PREP') return;
  const m = room.match;
  if (!m || (teamGroupId !== m.team1 && teamGroupId !== m.team2)) return;
  const other = teamGroupId === m.team1 ? m.team2 : m.team1;
  m.turnOrder = [];
  for (let i = 0; i < TURNS_PER_TEAM * 2; i++) {
    m.turnOrder.push(i % 2 === 0 ? teamGroupId : other);
  }
  emitState(room, io);
}

/** Host force-ends current match (no votes) and moves straight to next match / result. */
function forceNextMatch(room, io) {
  if (!room || room.status !== 'playing') return;
  if (room.phase === 'FINISHED') return;
  clearTimer(room);
  if (room.match && !room.match.winner) {
    const m = room.match;
    // Default: team1 wins (or whoever has more guesses, but here just pick team1)
    m.winner = m.team1;
    room.bracket[room.roundIdx][room.matchIdx].winner = m.team1;
    const wg = room.groups.get(m.team1);
  // forceNextMatch: no scoring
  }
  room.phase = 'MATCH_RESULT';
  emitState(room, io);
  room.matchIdx++;
}

function nextTurn(room, io) {
  clearTimer(room);
  room.match.turnIdx += 1;
  if (room.match.turnIdx >= room.match.turnOrder.length) {
    // All turns done — wait for host to start voting manually
    room.phase = 'TURN';
    room.match.deadline = 0;
    emitState(room, io);
    return;
  }
  room.phase = 'TURN';
  room.match.deadline = Date.now() + TURN_SECONDS * 1000;
  emitState(room, io);
  room.timer = setTimeout(() => {
    room.timer = null;
    io.to('debate:' + room.roomCode).emit('debate:turnTimeUp', { turnIdx: room.match.turnIdx });
  }, TURN_SECONDS * 1000 + 200);
}

function startVoting(room, io) {
  clearTimer(room);
  room.phase = 'VOTING';
  room.match.votes = new Map();
  room.match.deadline = 0; // no auto-timer
  emitState(room, io);
}

function resolveMatch(room, io) {
  clearTimer(room);
  const m = room.match;
  const tally = publicTally(m);
  const t1 = tally[m.team1] || 0;
  const t2 = tally[m.team2] || 0;
  // tie-break: team1 wins (can randomise later)
  const winner = t1 >= t2 ? m.team1 : m.team2;
  m.winner = winner;
  room.bracket[room.roundIdx][room.matchIdx].winner = winner;

  // award match-win: no scoring in debate game

  room.phase = 'MATCH_RESULT';
  emitState(room, io);

  // persist votes
  try {
    const db = getDb();
    const insertVote = db.prepare(`INSERT OR REPLACE INTO debate_votes (session_id, voter_uid, voted_group) VALUES (?, ?, ?)`);
    const tx = db.transaction(() => {
      for (const [voterUid, votedGid] of m.votes) {
        insertVote.run(room.roomCode, voterUid, votedGid);
      }
    });
    tx();
  } catch (e) { console.error('[debate] vote persist failed', e); }

  io.to('debate:' + room.roomCode).emit('debate:matchResult', {
    matchId: m.id, roundIdx: m.roundIdx, matchIdx: m.matchIdx,
    winner, winnerName: room.groups.get(winner)?.groupName || winner,
    team1: m.team1, team2: m.team2, tally
  });

  room.matchIdx++;
  // No auto-timer — host manually starts next match via debate:nextMatch
}

/* ------------------------------- player actions --------------------------- */

function submitArgument(roomCode, uid, text) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'TURN') return null;
  const m = room.match;
  if (!m) return null;
  const player = room.players.get(uid);
  if (!player) return null;
  const activeGroupId = m.turnOrder[m.turnIdx];
  if (player.groupId !== activeGroupId) return null;
  const clean = String(text || '').slice(0, 500).trim();
  if (!clean) return null;
  const entry = { turnIdx: m.turnIdx, groupId: activeGroupId, text: clean, ts: Date.now() };
  m.messages.push(entry);
  return entry;
}

function submitReaction(roomCode, uid, kind) {
  const room = rooms.get(roomCode);
  if (!room || (room.phase !== 'TURN' && room.phase !== 'MATCH_PREP')) return null;
  const m = room.match;
  if (!m) return null;
  const player = room.players.get(uid);
  if (!player) return null;
  const target = m.team1 === player.groupId ? m.team2 : m.team1;
  if (!m.reactions[target]) m.reactions[target] = { clap: 0, think: 0, exclaim: 0 };
  if (kind === 'clap') m.reactions[target].clap++;
  else if (kind === 'think') m.reactions[target].think++;
  else if (kind === 'exclaim') m.reactions[target].exclaim++;
  else return null;
  return { groupId: target, reactions: m.reactions[target] };
}

function submitVote(roomCode, uid, votedGroupId) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'VOTING') return null;
  const m = room.match;
  if (!m) return null;
  const player = room.players.get(uid);
  if (!player) return null;
  // Only groups NOT in the current match can vote
  if (player.groupId === m.team1 || player.groupId === m.team2) return null;
  if (votedGroupId !== m.team1 && votedGroupId !== m.team2) return null;
  m.votes.set(uid, votedGroupId);
  return publicTally(m);
}

/* --------------------------------- finalize ------------------------------- */

function finalize(room, io) {
  clearTimer(room);
  if (room.status === 'finished') return;
  room.status = 'finished';
  room.phase = 'FINISHED';

  // find champion = winner of the last match in the last round
  let champion = null;
  for (let ri = room.bracket.length - 1; ri >= 0; ri--) {
    const round = room.bracket[ri];
    for (const m of round) {
      if (m.winner) { champion = m.winner; break; }
    }
    if (champion) break;
  }
  try {
    const db = getDb();
    db.prepare(`UPDATE debate_sessions SET status='finished', ended_at=datetime('now') WHERE room_code=?`).run(room.roomCode);
  } catch (e) { console.error('[debate] finalize persist failed', e); }

  io.to('debate:' + room.roomCode).emit('debate:finished', {
    champion,
    championName: champion ? room.groups.get(champion)?.groupName : null,
    standings: publicGroups(room),
    bracket: publicBracket(room)
  });
  io.emit('leaderboard:update');
  setTimeout(() => rooms.delete(room.roomCode), 120_000);
}

function clearTimer(room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  leaveBySocketId,
  startGame,
  startMatch,
  setFirstSpeaker,
  forceNextMatch,
  nextTurn,
  startVoting,
  resolveMatch,
  submitArgument,
  submitReaction,
  submitVote,
  publicPlayerList,
  publicMatch,
  publicBracket,
  publicGroups,
  emitState,
  PREP_SECONDS,
  TURN_SECONDS,
  VOTE_SECONDS,
  TURNS_PER_TEAM
};
