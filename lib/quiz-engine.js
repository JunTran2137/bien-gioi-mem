// @ts-check
// In-memory quiz game state machine

const { getDb } = require('./db');
const { questionsData } = require('../data/questionsData');

/**
 * @typedef {Object} QuizPlayer
 * @property {string} uid
 * @property {string} name
 * @property {string|null} avatar
 * @property {string|null} groupId
 * @property {string|null} groupName
 * @property {string} socketId
 * @property {number} score
 * @property {number} streak
 * @property {number} maxStreak
 * @property {number} correctCount
 * @property {number} fastestMs
 * @property {{negotiation:boolean, extend:boolean, intel:boolean}} powerUpsUsed
 * @property {{negotiation:boolean, extend:boolean, intel:boolean}} powerUpsAvailable
 */

/**
 * @typedef {Object} QuizRoom
 * @property {string} roomCode
 * @property {string} hostUid
 * @property {'waiting'|'playing'|'finished'} status
 * @property {Map<string, QuizPlayer>} players
 * @property {any[]} questions
 * @property {number} currentIdx
 * @property {number} questionStartedAt
 * @property {number} questionDeadline
 * @property {Set<string>} answeredCurrent
 * @property {NodeJS.Timeout|null} timer
 */

const QUESTION_SECONDS = 15;
const TOTAL_QUESTIONS = 10;

/** @type {Map<string, QuizRoom>} */
const rooms = new Map();

function pickQuestions() {
  const pool = [...questionsData];
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, TOTAL_QUESTIONS);
}

function createRoom(roomCode, hostUid) {
  const room = {
    roomCode,
    hostUid,
    status: 'waiting',
    players: new Map(),
    questions: [],
    currentIdx: -1,
    questionStartedAt: 0,
    questionDeadline: 0,
    answeredCurrent: new Set(),
    timer: null
  };
  rooms.set(roomCode, room);
  return room;
}

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

function joinRoom(roomCode, player) {
  let room = rooms.get(roomCode);
  if (!room) return null;
  // Host is spectator — never counted as a player/group
  if (player.uid === room.hostUid) return room;
  const existing = room.players.get(player.uid);
  if (existing) {
    existing.socketId = player.socketId;
    existing.name = player.name;
    existing.avatar = player.avatar;
    existing.groupId = player.groupId;
    existing.groupName = player.groupName;
    return room;
  }
  room.players.set(player.uid, {
    uid: player.uid,
    name: player.name,
    avatar: player.avatar || null,
    groupId: player.groupId || null,
    groupName: player.groupName || null,
    socketId: player.socketId,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    fastestMs: Number.POSITIVE_INFINITY,
    powerUpsUsed: { negotiation: false, extend: false, intel: false },
    powerUpsAvailable: { negotiation: false, extend: false, intel: false }
  });
  return room;
}

function leaveBySocketId(socketId) {
  for (const room of rooms.values()) {
    for (const [uid, p] of room.players) {
      if (p.socketId === socketId) {
        // keep their record for scoring (allow rejoin via uid)
        return { room, uid };
      }
    }
  }
  return null;
}

function computeGroupScores(room) {
  /** @type {Record<string, {groupId:string, groupName:string, score:number, members:number}>} */
  const map = {};
  for (const p of room.players.values()) {
    const key = p.groupId || '__no_group__';
    const name = p.groupName || 'Khách';
    if (!map[key]) map[key] = { groupId: key, groupName: name, score: 0, members: 0 };
    map[key].score += p.score;
    map[key].members += 1;
  }
  return Object.values(map).sort((a, b) => b.score - a.score);
}

function publicPlayerList(room) {
  return Array.from(room.players.values()).map(p => ({
    uid: p.uid,
    name: p.name,
    avatar: p.avatar,
    groupId: p.groupId,
    groupName: p.groupName,
    score: p.score
  }));
}

function publicQuestion(room) {
  const q = room.questions[room.currentIdx];
  if (!q) return null;
  return {
    index: room.currentIdx,
    total: room.questions.length,
    id: q.id,
    question: q.question,
    options: q.options,
    durationSec: QUESTION_SECONDS,
    deadline: room.questionDeadline
  };
}

function startQuestion(room, io) {
  room.answeredCurrent = new Set();
  room.questionStartedAt = Date.now();
  room.questionDeadline = room.questionStartedAt + QUESTION_SECONDS * 1000;
  if (room.timer) clearTimeout(room.timer);
  io.to(room.roomCode).emit('quiz:question', publicQuestion(room));
  io.to(room.roomCode).emit('quiz:groupScores', computeGroupScores(room));
  room.timer = setTimeout(() => endQuestion(room, io), QUESTION_SECONDS * 1000 + 200);
}

function endQuestion(room, io) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
  const q = room.questions[room.currentIdx];
  if (q) {
    io.to(room.roomCode).emit('quiz:questionEnded', {
      index: room.currentIdx,
      correct: q.correct,
      explanation: q.explanation
    });
  }
  setTimeout(() => {
    if (room.currentIdx + 1 < room.questions.length) {
      room.currentIdx += 1;
      startQuestion(room, io);
    } else {
      finalize(room, io);
    }
  }, 3000);
}

function startGame(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.status = 'playing';
  room.questions = pickQuestions();
  room.currentIdx = 0;
  // persist session
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO quiz_sessions (id, room_code, status, started_at)
       VALUES (?, ?, 'playing', datetime('now'))`
    ).run(roomCode, roomCode);
  } catch (e) {
    console.error('[quiz] start persist failed', e);
  }
  io.to(roomCode).emit('quiz:started', { total: room.questions.length });
  startQuestion(room, io);
}

function submitAnswer(roomCode, uid, answer, io) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing') return null;
  const player = room.players.get(uid);
  if (!player) return null;
  if (room.answeredCurrent.has(uid)) return null;
  const q = room.questions[room.currentIdx];
  if (!q) return null;
  const elapsedMs = Date.now() - room.questionStartedAt;
  const timeLeftSec = Math.max(0, QUESTION_SECONDS - elapsedMs / 1000);
  const isCorrect = answer === q.correct;
  let points = 0;
  if (isCorrect) {
    points = Math.round(50 + timeLeftSec * 5);
    player.correctCount += 1;
    player.streak += 1;
    player.maxStreak = Math.max(player.maxStreak, player.streak);
    player.fastestMs = Math.min(player.fastestMs, elapsedMs);
    // award power-up on every 3rd streak
    if (player.streak > 0 && player.streak % 3 === 0) {
      const choices = ['negotiation', 'extend', 'intel'].filter(
        k => !player.powerUpsUsed[k] && !player.powerUpsAvailable[k]
      );
      if (choices.length) {
        const pick = choices[Math.floor(Math.random() * choices.length)];
        player.powerUpsAvailable[pick] = true;
      }
    }
  } else {
    player.streak = 0;
  }
  player.score += points;
  room.answeredCurrent.add(uid);
  // emit to the player
  const playerSocket = io.sockets.sockets.get(player.socketId);
  if (playerSocket) {
    playerSocket.emit('quiz:answerResult', {
      isCorrect,
      points,
      correct: q.correct,
      explanation: q.explanation,
      score: player.score,
      streak: player.streak,
      powerUpsAvailable: player.powerUpsAvailable
    });
  }
  io.to(roomCode).emit('quiz:groupScores', computeGroupScores(room));
  io.to(roomCode).emit('quiz:playerAnswered', { uid, total: room.answeredCurrent.size, of: room.players.size });
  // if everyone answered → end early
  if (room.answeredCurrent.size >= room.players.size) {
    endQuestion(room, io);
  }
  return { isCorrect, points };
}

function usePowerUp(roomCode, uid, kind, io) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const player = room.players.get(uid);
  if (!player) return null;
  if (!player.powerUpsAvailable[kind] || player.powerUpsUsed[kind]) return null;
  player.powerUpsUsed[kind] = true;
  player.powerUpsAvailable[kind] = false;
  const q = room.questions[room.currentIdx];
  if (!q) return null;
  /** @type {any} */
  const payload = { kind };
  if (kind === 'negotiation') {
    // eliminate one wrong answer
    const wrongs = q.options.map((_, i) => i).filter(i => i !== q.correct);
    payload.eliminated = wrongs[Math.floor(Math.random() * wrongs.length)];
  } else if (kind === 'extend') {
    room.questionDeadline += 10_000;
    if (room.timer) clearTimeout(room.timer);
    const remaining = Math.max(0, room.questionDeadline - Date.now());
    room.timer = setTimeout(() => endQuestion(room, io), remaining + 200);
    payload.newDeadline = room.questionDeadline;
  } else if (kind === 'intel') {
    payload.hint = q.hint || 'Hãy nhớ lại các sự kiện hội nhập gần nhất.';
  }
  const playerSocket = io.sockets.sockets.get(player.socketId);
  if (playerSocket) playerSocket.emit('quiz:powerUpResult', payload);
  return payload;
}

function finalize(room, io) {
  room.status = 'finished';
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
  // group totals
  const groupScores = computeGroupScores(room);
  // badges
  const players = Array.from(room.players.values());
  const fastest = players.slice().sort((a, b) => a.fastestMs - b.fastestMs)[0];
  const longestStreak = players.slice().sort((a, b) => b.maxStreak - a.maxStreak)[0];
  const mostAccurate = players.slice().sort((a, b) => b.correctCount - a.correctCount)[0];
  const badges = {
    fastest: fastest && fastest.fastestMs !== Number.POSITIVE_INFINITY ? { uid: fastest.uid, name: fastest.name } : null,
    longestStreak: longestStreak ? { uid: longestStreak.uid, name: longestStreak.name, streak: longestStreak.maxStreak } : null,
    mostAccurate: mostAccurate ? { uid: mostAccurate.uid, name: mostAccurate.name, correct: mostAccurate.correctCount } : null
  };
  // persist to DB
  try {
    const db = getDb();
    db.prepare(`UPDATE quiz_sessions SET status='finished', ended_at=datetime('now') WHERE room_code=?`).run(room.roomCode);
    const insertScore = db.prepare(`INSERT OR REPLACE INTO quiz_scores (session_id, uid, score) VALUES (?, ?, ?)`);
    const incUser = db.prepare(`UPDATE users SET total_score = total_score + ? WHERE uid = ?`);
    const incGroup = db.prepare(`UPDATE groups SET total_score = total_score + ? WHERE id = ?`);
    const tx = db.transaction(() => {
      for (const p of players) {
        insertScore.run(room.roomCode, p.uid, p.score);
        incUser.run(p.score, p.uid);
        if (p.groupId) incGroup.run(p.score, p.groupId);
      }
    });
    tx();
  } catch (e) {
    console.error('[quiz] finalize persist failed', e);
  }
  io.to(room.roomCode).emit('quiz:finished', {
    players: players.map(p => ({
      uid: p.uid,
      name: p.name,
      avatar: p.avatar,
      groupId: p.groupId,
      groupName: p.groupName,
      score: p.score,
      correct: p.correctCount,
      streak: p.maxStreak
    })),
    groupScores,
    badges
  });
  io.emit('leaderboard:update');
  // cleanup after a while
  setTimeout(() => rooms.delete(room.roomCode), 60_000);
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  leaveBySocketId,
  startGame,
  submitAnswer,
  usePowerUp,
  publicPlayerList,
  computeGroupScores
};
