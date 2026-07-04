// @ts-check
// In-memory MONOPOLY-STYLE board game state machine ("Đại Sứ Tri Thức").
// Turn-based: it is one group's turn -> they get a question -> if correct they
// enter the real-world dice value -> their piece moves that many tiles -> the
// landed tile is resolved. Fixed 3 rounds (each group plays 3 turns).

const { getDb } = require('./db');
const { questionsData } = require('../data/questionsData');
const {
  getTile,
  BOARD_SIZE,
  GO_BONUS,
  QUESTION_TILE_BONUS,
  chanceCards
} = require('../data/boardData');

const QUESTION_SECONDS = 25;
const MAX_ROUNDS = 3;
const NO_GROUP = '__no_group__';

/**
 * @typedef {Object} BoardPlayer
 * @property {string} uid
 * @property {string} name
 * @property {string|null} avatar
 * @property {string} groupId
 * @property {string} groupName
 * @property {string} socketId
 */

/**
 * @typedef {Object} BoardGroup
 * @property {string} groupId
 * @property {string} groupName
 * @property {number} score
 * @property {number} position
 * @property {boolean} skipNext
 */

/** @type {Map<string, any>} */
const rooms = new Map();

/* ----------------------------- room lifecycle ----------------------------- */

function createRoom(roomCode, hostUid) {
  // Idempotent: if the room already exists (e.g. the host page re-mounted after
  // a hot reload / reconnect), keep the running game instead of wiping it.
  const existing = rooms.get(roomCode);
  if (existing) {
    if (hostUid && existing.status === 'waiting') existing.hostUid = hostUid;
    return existing;
  }
  const room = {
    roomCode,
    hostUid,
    status: 'waiting', // 'waiting' | 'playing' | 'finished'
    players: new Map(), // uid -> BoardPlayer
    groups: new Map(), // groupId -> BoardGroup
    turnOrder: /** @type {string[]} */ ([]),
    currentTurnIdx: 0,
    round: 0,
    phase: 'lobby', // 'lobby'|'selecting'|'question'|'revealed'|'awaitDice'|'moving'|'resolve'|'finished'
    selectedGroupId: /** @type {string|null} */ (null),
    lastAnswerCorrect: false,
    questions: /** @type {any[]} */ ([]),
    questionIdx: 0,
    currentQuestion: /** @type {any} */ (null),
    answeredThisTurn: false,
    questionStartedAt: 0,
    questionDeadline: 0,
    timer: /** @type {NodeJS.Timeout|null} */ (null)
  };
  rooms.set(roomCode, room);
  return room;
}

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

function groupKey(player) {
  return player.groupId || NO_GROUP;
}

function joinRoom(roomCode, player) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const gid = player.groupId || NO_GROUP;
  const gname = player.groupName || 'Khách';
  const existing = room.players.get(player.uid);
  if (existing) {
    existing.socketId = player.socketId;
    existing.name = player.name;
    existing.avatar = player.avatar || null;
    existing.groupId = gid;
    existing.groupName = gname;
  } else {
    room.players.set(player.uid, {
      uid: player.uid,
      name: player.name,
      avatar: player.avatar || null,
      groupId: gid,
      groupName: gname,
      socketId: player.socketId
    });
  }
  // ensure the group exists in the lobby standings preview
  if (!room.groups.has(gid)) {
    room.groups.set(gid, { groupId: gid, groupName: gname, score: 0, position: 0, skipNext: false });
  }
  return room;
}

function leaveBySocketId(socketId) {
  for (const room of rooms.values()) {
    for (const p of room.players.values()) {
      if (p.socketId === socketId) {
        return { room, uid: p.uid };
      }
    }
  }
  return null;
}

/* ------------------------------ public views ------------------------------ */

function publicPlayerList(room) {
  return Array.from(room.players.values()).map(p => ({
    uid: p.uid,
    name: p.name,
    avatar: p.avatar,
    groupId: p.groupId,
    groupName: p.groupName
  }));
}

function publicGroups(room) {
  return Array.from(room.groups.values())
    .map(g => ({ ...g }))
    .sort((a, b) => b.score - a.score);
}

function activeGroupId(room) {
  return room.selectedGroupId || null;
}

function publicState(room) {
  return {
    status: room.status,
    phase: room.phase,
    round: room.round,
    maxRounds: MAX_ROUNDS,
    turnOrder: room.turnOrder,
    activeGroupId: activeGroupId(room),
    groups: publicGroups(room)
  };
}

function publicQuestion(room) {
  const q = room.currentQuestion;
  if (!q) return null;
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    durationSec: QUESTION_SECONDS,
    deadline: room.questionDeadline,
    activeGroupId: activeGroupId(room),
    round: room.round
  };
}

/* ------------------------------- game start ------------------------------- */

function pickQuestions() {
  const pool = [...questionsData];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function startGame(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room || room.status === 'playing') return;

  // Build turn order from the distinct groups present, in first-seen order.
  const order = [];
  for (const p of room.players.values()) {
    const gid = p.groupId;
    if (!order.includes(gid)) order.push(gid);
    if (!room.groups.has(gid)) {
      room.groups.set(gid, { groupId: gid, groupName: p.groupName, score: 0, position: 0, skipNext: false });
    }
  }
  if (order.length === 0) return;

  // reset group state
  for (const g of room.groups.values()) {
    g.score = 0; g.position = 0; g.skipNext = false;
  }

  room.turnOrder = order;
  room.currentTurnIdx = 0;
  room.round = 0;
  room.selectedGroupId = null;
  room.status = 'playing';
  room.phase = 'selecting';
  room.questions = pickQuestions();
  room.questionIdx = 0;

  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO quiz_sessions (id, room_code, status, started_at)
       VALUES (?, ?, 'playing', datetime('now'))`
    ).run(roomCode, roomCode);
  } catch (e) {
    console.error('[board] start persist failed', e);
  }

  io.to(roomCode).emit('board:started', publicState(room));
}

/* --------------------------- host-driven turn loop -------------------------- */

// The host runs the shared board. They pick which group plays, then a question
// appears with a countdown. The host selects the answer (or the timer expires),
// the correct answer is revealed, and the host taps "Thoát" to either roll the
// dice (if correct) or go back to picking the next group.
function pickGroup(roomCode, uid, groupId, io) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing') return;
  if (room.hostUid !== uid) return;
  if (room.phase !== 'selecting') return;
  const group = room.groups.get(groupId);
  if (!group) return;

  room.selectedGroupId = groupId;
  room.round += 1;
  const q = room.questions[room.questionIdx % room.questions.length];
  room.questionIdx += 1;
  room.currentQuestion = q;
  room.answeredThisTurn = false;
  room.lastAnswerCorrect = false;
  room.phase = 'question';
  room.questionStartedAt = Date.now();
  room.questionDeadline = room.questionStartedAt + QUESTION_SECONDS * 1000;

  io.to(room.roomCode).emit('board:turn', {
    activeGroupId: groupId,
    groupName: group.groupName,
    round: room.round,
    maxRounds: MAX_ROUNDS
  });
  io.to(room.roomCode).emit('board:question', publicQuestion(room));
  io.to(room.roomCode).emit('board:state', publicState(room));

  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  room.timer = setTimeout(() => {
    if (room.phase === 'question' && !room.answeredThisTurn) {
      revealAnswer(room, null, io); // time ran out -> reveal the correct answer
    }
  }, QUESTION_SECONDS * 1000 + 300);
}

function revealAnswer(room, chosenIndex, io) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  const q = room.currentQuestion;
  if (!q) return;
  room.answeredThisTurn = true;
  const timedOut = chosenIndex == null;
  const correct = !timedOut && chosenIndex === q.correct;
  room.lastAnswerCorrect = correct;
  room.phase = 'revealed';

  io.to(room.roomCode).emit('board:answerResult', {
    groupId: room.selectedGroupId,
    chosen: timedOut ? undefined : chosenIndex,
    correct,
    timedOut,
    correctIndex: q.correct,
    explanation: q.explanation
  });
  io.to(room.roomCode).emit('board:state', publicState(room));
}

function backToSelecting(room, io) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  room.currentQuestion = null;
  room.selectedGroupId = null;
  room.phase = 'selecting';
  io.to(room.roomCode).emit('board:state', publicState(room));
}

function submitAnswer(roomCode, uid, answer, io) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing' || room.phase !== 'question') return;
  if (room.hostUid !== uid) return;        // host controls the shared board
  if (room.answeredThisTurn) return;
  revealAnswer(room, answer, io);
}

function exitQuestion(roomCode, uid, io) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing' || room.phase !== 'revealed') return;
  if (room.hostUid !== uid) return;

  if (room.lastAnswerCorrect) {
    room.phase = 'awaitDice';
    const group = room.groups.get(room.selectedGroupId);
    io.to(room.roomCode).emit('board:awaitDice', {
      activeGroupId: room.selectedGroupId,
      groupName: group ? group.groupName : ''
    });
    io.to(room.roomCode).emit('board:state', publicState(room));
  } else {
    backToSelecting(room, io);
  }
}

function submitDice(roomCode, uid, value, io) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing' || room.phase !== 'awaitDice') return;
  if (room.hostUid !== uid) return;        // host enters the real-world dice value
  const steps = Math.floor(Number(value));
  if (!Number.isFinite(steps) || steps < 1 || steps > 6) return;

  const group = room.groups.get(room.selectedGroupId);
  if (!group) return;

  const from = group.position;
  const to = (from + steps) % BOARD_SIZE;
  const passedGo = from + steps >= BOARD_SIZE; // wrapped past start
  group.position = to;
  room.phase = 'moving';

  io.to(roomCode).emit('board:move', {
    groupId: group.groupId,
    groupName: group.groupName,
    from,
    to,
    steps,
    passedGo
  });
  io.to(roomCode).emit('board:state', publicState(room));

  // Resolve the landed tile after the client-side hop animation.
  const animMs = 350 * steps + 400;
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => resolveLanding(room, group, passedGo, io, 0), animMs);
}

/**
 * Apply the effect of the tile the group landed on.
 * `depth` guards against infinite move-chains.
 */
function resolveLanding(room, group, passedGo, io, depth) {
  const tile = getTile(group.position);
  let delta = 0;
  /** @type {any} */
  let card = null;
  let extraMove = 0;
  let skip = false;

  if (passedGo && tile.type !== 'start') {
    delta += GO_BONUS; // collected for passing start
  }

  switch (tile.type) {
    case 'start':
      delta += GO_BONUS;
      break;
    case 'bonus':
      delta += tile.value || 0;
      break;
    case 'penalty':
      delta -= tile.value || 0;
      break;
    case 'question':
      delta += QUESTION_TILE_BONUS;
      break;
    case 'move':
      extraMove = tile.move || 0;
      break;
    case 'skip':
      skip = true;
      break;
    case 'lucky': {
      card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
      if (card.effect.points) delta += card.effect.points;
      if (card.effect.move) extraMove = card.effect.move;
      if (card.effect.skip) skip = true;
      break;
    }
    default:
      break;
  }

  group.score = Math.max(0, group.score + delta);
  if (skip) group.skipNext = true;

  io.to(room.roomCode).emit('board:resolve', {
    groupId: group.groupId,
    groupName: group.groupName,
    tileIndex: tile.index,
    tileType: tile.type,
    tileLabel: tile.label,
    scoreDelta: delta,
    newScore: group.score,
    passedGo,
    card: card ? { text: card.text } : null
  });
  io.to(room.roomCode).emit('board:state', publicState(room));

  // A 'move' tile (or a lucky "move" card) hops again, then resolves once more.
  if (extraMove !== 0 && depth < 2) {
    const from = group.position;
    const to = ((from + extraMove) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
    const wrapped = from + extraMove >= BOARD_SIZE;
    group.position = to;
    if (room.timer) clearTimeout(room.timer);
    room.timer = setTimeout(() => {
      io.to(room.roomCode).emit('board:move', {
        groupId: group.groupId, groupName: group.groupName,
        from, to, steps: extraMove, passedGo: wrapped, chained: true
      });
      room.timer = setTimeout(() => resolveLanding(room, group, wrapped, io, depth + 1), 350 * Math.abs(extraMove) + 400);
    }, 900);
    return;
  }

  room.phase = 'resolve';
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => backToSelecting(room, io), 3000);
}

function endGameByHost(roomCode, uid, io) {
  const room = rooms.get(roomCode);
  if (!room || room.hostUid !== uid) return;
  finalize(room, io);
}

/* -------------------------------- finalize -------------------------------- */

function finalize(room, io) {
  room.status = 'finished';
  room.phase = 'finished';
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }

  const standings = publicGroups(room); // sorted desc by score
  const winner = standings[0] || null;

  // Persist: each group's final score added to the group total and to every
  // member's personal total (mirrors the old quiz finalize behaviour).
  try {
    const db = getDb();
    db.prepare(`UPDATE quiz_sessions SET status='finished', ended_at=datetime('now') WHERE room_code=?`).run(room.roomCode);
    const insertScore = db.prepare(`INSERT OR REPLACE INTO quiz_scores (session_id, uid, score) VALUES (?, ?, ?)`);
    const incUser = db.prepare(`UPDATE users SET total_score = total_score + ? WHERE uid = ?`);
    const incGroup = db.prepare(`UPDATE groups SET total_score = total_score + ? WHERE id = ?`);
    const tx = db.transaction(() => {
      for (const p of room.players.values()) {
        const g = room.groups.get(p.groupId);
        const gScore = g ? g.score : 0;
        insertScore.run(room.roomCode, p.uid, gScore);
        incUser.run(gScore, p.uid);
      }
      for (const g of room.groups.values()) {
        if (g.groupId !== NO_GROUP) incGroup.run(g.score, g.groupId);
      }
    });
    tx();
  } catch (e) {
    console.error('[board] finalize persist failed', e);
  }

  io.to(room.roomCode).emit('board:finished', {
    standings,
    winner,
    players: publicPlayerList(room)
  });
  io.emit('leaderboard:update');
  setTimeout(() => rooms.delete(room.roomCode), 60_000);
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  leaveBySocketId,
  startGame,
  pickGroup,
  submitAnswer,
  exitQuestion,
  submitDice,
  endGameByHost,
  publicPlayerList,
  publicGroups,
  publicState
};
