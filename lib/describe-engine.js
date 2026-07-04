// @ts-check
// In-memory state machine for "Mô tả & Đoán thẻ" (Describe & Guess).
//
// Flow:
//   lobby -> prepare(5 min: each group's random scribe writes 3 descriptions,
//            each tied to a physical card) -> reveal loop over all 3*N
//            descriptions -> finished.
//
// Per description (authored by group A):
//   showing  : text is shown; the OTHER groups hold up the physical card they
//              think it describes; their phone camera reports the ArUco marker
//              -> a live guess per group.
//   revealed : host reveals the answer; guesses are snapshotted & auto-graded
//              against the author's declared card. Players may Agree/Disagree.
//   rebuttal : if a group disagreed, host can run 30s rebuttal rounds.
//   voting   : after rebuttal ends, every player types the card they vote for;
//              the most-voted card becomes the accepted answer.
//   resolved : scores are awarded, then the host advances to the next one.

const { getDb } = require('./db');
const { describeCards, cardByMarker, cardById } = require('../data/describeCards');

const PREPARE_SECONDS = 5 * 60;
const REBUTTAL_SECONDS = 30;
const DESCRIPTIONS_PER_GROUP = 3;
const NO_GROUP = '__no_group__';

// scoring (tunable)
const POINTS_CORRECT_GUESS = 100;
// The author LOSES points for every group that guesses their card right, with
// no cap — this rewards descriptions that are clear yet hard to crack.
const POINTS_AUTHOR_PER_CORRECT = -10;

/** @type {Map<string, any>} */
const rooms = new Map();

/* ------------------------------ room lifecycle ---------------------------- */

function createRoom(roomCode, hostUid) {
  const existing = rooms.get(roomCode);
  if (existing) {
    // Only allow the host uid to be reassigned if the game has NOT started yet
    // (reconnect by the same host before start). Once playing, lock it.
    if (hostUid && existing.status === 'waiting') existing.hostUid = hostUid;
    return existing;
  }
  const room = {
    roomCode,
    hostUid,
    status: 'waiting', // waiting | playing | finished
    phase: 'lobby', // lobby | prepare | reveal | finished
    players: new Map(), // uid -> player
    groups: new Map(), // groupId -> { groupId, groupName, score }
    // prepare
    scribes: new Map(), // groupId -> uid
    submissions: new Map(), // groupId -> [{ text, cardId }]
    prepareDeadline: 0,
    // reveal
    order: /** @type {any[]} */ ([]), // [{ authorGroupId, authorGroupName, text, cardId }]
    idx: -1,
    subPhase: 'showing', // showing | revealed | rebuttal | voting | resolved
    guesses: new Map(), // groupId -> cardId (live)
    snapshot: new Map(), // groupId -> cardId (captured at reveal)
    stances: new Map(), // groupId -> 'agree' | 'disagree'
    rebuttalRound: 0,
    rebuttalDeadline: 0,
    votes: new Map(), // uid -> cardId
    acceptedCardId: /** @type {string|null} */ (null),
    timer: /** @type {NodeJS.Timeout|null} */ (null)
  };
  rooms.set(roomCode, room);
  return room;
}

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
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
  if (!room.groups.has(gid)) {
    room.groups.set(gid, { groupId: gid, groupName: gname, score: 0 });
  }
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

/** groupId -> how many descriptions submitted (for prepare progress) */
function submissionCounts(room) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const [gid, list] of room.submissions) out[gid] = list.length;
  return out;
}

function scribeMap(room) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [gid, uid] of room.scribes) out[gid] = uid;
  return out;
}

function currentDescription(room) {
  return room.order[room.idx] || null;
}

/** The groups expected to guess this round = every group except the author. */
function guesserGroupIds(room) {
  const cur = currentDescription(room);
  if (!cur) return [];
  return Array.from(room.groups.keys()).filter(gid => gid !== cur.authorGroupId);
}

function publicReveal(room) {
  const cur = currentDescription(room);
  if (!cur) return null;
  const base = {
    index: room.idx,
    total: room.order.length,
    subPhase: room.subPhase,
    authorGroupId: cur.authorGroupId,
    authorGroupName: cur.authorGroupName,
    text: cur.text,
    guesserGroupIds: guesserGroupIds(room),
    rebuttalRound: room.rebuttalRound,
    rebuttalDeadline: room.rebuttalDeadline
  };
  if (room.subPhase === 'showing') {
    return { ...base, guesses: liveGuesses(room) };
  }
  // revealed / rebuttal / voting / resolved -> answer is known
  const answerCard = cardById(cur.cardId);
  return {
    ...base,
    guesses: snapshotGuesses(room),
    stances: Object.fromEntries(room.stances),
    card: answerCard ? { id: answerCard.id, name: answerCard.name, category: answerCard.category } : null,
    acceptedCardId: room.acceptedCardId,
    voteTally: voteTally(room)
  };
}

function liveGuesses(room) {
  /** @type {Record<string, {cardId:string, cardName:string}>} */
  const out = {};
  for (const [gid, cardId] of room.guesses) {
    const c = cardById(cardId);
    if (c) out[gid] = { cardId, cardName: c.name };
  }
  return out;
}

function snapshotGuesses(room) {
  const cur = currentDescription(room);
  /** @type {Record<string, {cardId:string, cardName:string, correct:boolean}>} */
  const out = {};
  const answerId = room.acceptedCardId || (cur ? cur.cardId : null);
  for (const [gid, cardId] of room.snapshot) {
    const c = cardById(cardId);
    if (c) out[gid] = { cardId, cardName: c.name, correct: cardId === answerId };
  }
  return out;
}

function voteTally(room) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const cardId of room.votes.values()) counts[cardId] = (counts[cardId] || 0) + 1;
  return Object.entries(counts)
    .map(([cardId, count]) => {
      const c = cardById(cardId);
      return { cardId, cardName: c ? c.name : cardId, count };
    })
    .sort((a, b) => b.count - a.count);
}

function anyDisagree(room) {
  for (const s of room.stances.values()) if (s === 'disagree') return true;
  return false;
}

function publicState(room) {
  return {
    status: room.status,
    phase: room.phase,
    groups: publicGroups(room),
    prepareDeadline: room.prepareDeadline,
    prepareSeconds: PREPARE_SECONDS,
    descriptionsPerGroup: DESCRIPTIONS_PER_GROUP,
    submissionCounts: submissionCounts(room),
    reveal: room.phase === 'reveal' ? publicReveal(room) : null,
    anyDisagree: anyDisagree(room)
  };
}

function emitState(room, io) {
  io.to(room.roomCode).emit('dg:state', publicState(room));
}

/* ------------------------------- game start ------------------------------- */

function assignScribes(room) {
  room.scribes = new Map();
  /** @type {Record<string, string[]>} */
  const byGroup = {};
  for (const p of room.players.values()) {
    (byGroup[p.groupId] = byGroup[p.groupId] || []).push(p.uid);
  }
  for (const [gid, uids] of Object.entries(byGroup)) {
    const pick = uids[Math.floor(Math.random() * uids.length)];
    room.scribes.set(gid, pick);
  }
}

function startGame(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room || room.status === 'playing') return;
  // ensure all groups from current players exist
  for (const p of room.players.values()) {
    if (!room.groups.has(p.groupId)) {
      room.groups.set(p.groupId, { groupId: p.groupId, groupName: p.groupName, score: 0 });
    }
  }
  for (const g of room.groups.values()) g.score = 0;

  room.status = 'playing';
  room.phase = 'prepare';
  room.submissions = new Map();
  assignScribes(room);
  room.prepareDeadline = Date.now() + PREPARE_SECONDS * 1000;

  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO quiz_sessions (id, room_code, status, started_at)
       VALUES (?, ?, 'playing', datetime('now'))`
    ).run(roomCode, roomCode);
  } catch (e) {
    console.error('[describe] start persist failed', e);
  }

  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => beginReveal(roomCode, io), PREPARE_SECONDS * 1000 + 200);

  io.to(roomCode).emit('dg:started', { scribes: scribeMap(room) });
  emitState(room, io);
}

function submitDescriptions(roomCode, uid, list, io) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'prepare') return { ok: false, error: 'not_preparing' };
  const player = room.players.get(uid);
  if (!player) return { ok: false, error: 'not_in_room' };
  if (room.scribes.get(player.groupId) !== uid) return { ok: false, error: 'not_scribe' };
  // sanitise: keep valid entries, cap at DESCRIPTIONS_PER_GROUP
  const clean = [];
  for (const item of Array.isArray(list) ? list : []) {
    const text = String(item?.text || '').trim().slice(0, 400);
    const cardId = String(item?.cardId || '');
    if (text && cardById(cardId)) clean.push({ text, cardId });
    if (clean.length >= DESCRIPTIONS_PER_GROUP) break;
  }
  room.submissions.set(player.groupId, clean);
  emitState(room, io);
  return { ok: true, count: clean.length };
}

function endPrepareEarly(roomCode, uid, io) {
  const room = rooms.get(roomCode);
  if (!room || room.hostUid !== uid || room.phase !== 'prepare') return;
  beginReveal(roomCode, io);
}

/* -------------------------------- reveal loop ----------------------------- */

function beginReveal(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room || room.phase === 'reveal' || room.phase === 'finished') return;
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }

  // Build the description queue from every group's submissions, then shuffle.
  const queue = [];
  for (const [gid, list] of room.submissions) {
    const group = room.groups.get(gid);
    const gname = group ? group.groupName : 'Nhóm';
    for (const s of list) {
      queue.push({ authorGroupId: gid, authorGroupName: gname, text: s.text, cardId: s.cardId });
    }
  }
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  room.order = queue;
  room.idx = -1;
  room.phase = 'reveal';

  if (queue.length === 0) {
    finalize(room, io);
    return;
  }
  advance(roomCode, io);
}

function startDescription(room, io) {
  room.subPhase = 'showing';
  room.guesses = new Map();
  room.snapshot = new Map();
  room.stances = new Map();
  room.votes = new Map();
  room.acceptedCardId = null;
  room.rebuttalRound = 0;
  room.rebuttalDeadline = 0;
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  io.to(room.roomCode).emit('dg:description', publicReveal(room));
  emitState(room, io);
}

/** Live camera guess for a group during the "showing" sub-phase. */
function setGuess(roomCode, groupId, markerId, io) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'reveal' || room.subPhase !== 'showing') return;
  const cur = currentDescription(room);
  if (!cur || groupId === cur.authorGroupId) return; // author does not guess
  if (!room.groups.has(groupId)) return;
  const card = cardByMarker(markerId);
  if (!card) return;
  room.guesses.set(groupId, card.id);
  io.to(room.roomCode).emit('dg:guesses', { index: room.idx, guesses: liveGuesses(room) });
}

function revealAnswer(roomCode, uid, io) {
  const room = rooms.get(roomCode);
  if (!room || room.hostUid !== uid || room.phase !== 'reveal' || room.subPhase !== 'showing') return;
  // snapshot the live guesses
  room.snapshot = new Map(room.guesses);
  room.subPhase = 'revealed';
  const cur = currentDescription(room);
  room.acceptedCardId = cur ? cur.cardId : null; // author's declared answer, until a vote overrides
  io.to(room.roomCode).emit('dg:revealed', publicReveal(room));
  emitState(room, io);
}

/** A group Agrees/Disagrees with the revealed answer. */
function setStance(roomCode, uid, stance, io) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'reveal') return;
  if (room.subPhase !== 'revealed') return;
  const player = room.players.get(uid);
  if (!player) return;
  const s = stance === 'disagree' ? 'disagree' : 'agree';
  room.stances.set(player.groupId, s);
  io.to(room.roomCode).emit('dg:stances', { index: room.idx, stances: Object.fromEntries(room.stances), anyDisagree: anyDisagree(room) });
  emitState(room, io);
}

function startRebuttal(roomCode, uid, io) {
  const room = rooms.get(roomCode);
  if (!room || room.hostUid !== uid || room.phase !== 'reveal') return;
  if (room.subPhase !== 'revealed' && room.subPhase !== 'rebuttal') return;
  room.subPhase = 'rebuttal';
  room.rebuttalRound += 1;
  room.rebuttalDeadline = Date.now() + REBUTTAL_SECONDS * 1000;
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    room.timer = null;
    io.to(room.roomCode).emit('dg:rebuttalTimeUp', { index: room.idx, round: room.rebuttalRound });
  }, REBUTTAL_SECONDS * 1000 + 100);
  io.to(room.roomCode).emit('dg:rebuttal', { index: room.idx, round: room.rebuttalRound, deadline: room.rebuttalDeadline });
  emitState(room, io);
}

/** Host ends rebuttals -> open the vote. */
function endRebuttal(roomCode, uid, io) {
  const room = rooms.get(roomCode);
  if (!room || room.hostUid !== uid || room.phase !== 'reveal' || room.subPhase !== 'rebuttal') return;
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  room.subPhase = 'voting';
  room.votes = new Map();
  io.to(room.roomCode).emit('dg:voting', publicReveal(room));
  emitState(room, io);
}

function submitVote(roomCode, uid, cardId, io) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'reveal' || room.subPhase !== 'voting') return;
  if (!room.players.has(uid)) return;
  if (!cardById(cardId)) return;
  room.votes.set(uid, cardId);
  io.to(room.roomCode).emit('dg:voteUpdate', { index: room.idx, tally: voteTally(room) });
  emitState(room, io);
}

/** Award points for the current description and remember the accepted answer. */
function resolveCurrent(room, io) {
  const cur = currentDescription(room);
  if (!cur) return;

  // Accepted answer: most-voted card if a vote happened, else the author's declared card.
  if (room.votes.size > 0) {
    const tally = voteTally(room);
    room.acceptedCardId = tally.length ? tally[0].cardId : cur.cardId;
  } else {
    room.acceptedCardId = cur.cardId;
  }

  let correctCount = 0;
  for (const [gid, cardId] of room.snapshot) {
    if (gid === cur.authorGroupId) continue;
    if (cardId === room.acceptedCardId) {
      correctCount += 1;
      const g = room.groups.get(gid);
      if (g) g.score += POINTS_CORRECT_GUESS;
    }
  }
  const author = room.groups.get(cur.authorGroupId);
  if (author) {
    author.score += correctCount * POINTS_AUTHOR_PER_CORRECT;
  }

  room.subPhase = 'resolved';
  io.to(room.roomCode).emit('dg:resolved', {
    index: room.idx,
    acceptedCardId: room.acceptedCardId,
    correctCount,
    guesses: snapshotGuesses(room),
    groups: publicGroups(room)
  });
  io.to(room.roomCode).emit('dg:groupScores', publicGroups(room));
}

/** Host advances: resolve the current description (if any) then show the next. */
function advance(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'reveal') return;
  if (room.idx >= 0) resolveCurrent(room, io);
  if (room.idx + 1 >= room.order.length) {
    finalize(room, io);
    return;
  }
  room.idx += 1;
  startDescription(room, io);
}

function nextDescription(roomCode, uid, io) {
  const room = rooms.get(roomCode);
  if (!room || room.hostUid !== uid || room.phase !== 'reveal') return;
  // Can only advance once the answer has been revealed.
  if (room.subPhase === 'showing') return;
  advance(roomCode, io);
}

function endGameByHost(roomCode, uid, io) {
  const room = rooms.get(roomCode);
  if (!room || room.hostUid !== uid) return;
  finalize(room, io);
}

/* --------------------------------- finalize ------------------------------- */

function finalize(room, io) {
  if (room.status === 'finished') return;
  room.status = 'finished';
  room.phase = 'finished';
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }

  const standings = publicGroups(room);
  try {
    const db = getDb();
    db.prepare(`UPDATE quiz_sessions SET status='finished', ended_at=datetime('now') WHERE room_code=?`).run(room.roomCode);
    const incGroup = db.prepare(`UPDATE groups SET total_score = total_score + ? WHERE id = ?`);
    const insertScore = db.prepare(`INSERT OR REPLACE INTO quiz_scores (session_id, uid, score) VALUES (?, ?, ?)`);
    const incUser = db.prepare(`UPDATE users SET total_score = total_score + ? WHERE uid = ?`);
    const tx = db.transaction(() => {
      for (const g of room.groups.values()) {
        if (g.groupId && g.groupId !== NO_GROUP) incGroup.run(g.score, g.groupId);
      }
      // distribute a group's score across its members for personal totals
      for (const p of room.players.values()) {
        const g = room.groups.get(p.groupId);
        const members = Array.from(room.players.values()).filter(x => x.groupId === p.groupId).length || 1;
        const share = g ? Math.round(g.score / members) : 0;
        insertScore.run(room.roomCode, p.uid, share);
        incUser.run(share, p.uid);
      }
    });
    tx();
  } catch (e) {
    console.error('[describe] finalize persist failed', e);
  }

  const winner = standings.length ? standings[0] : null;
  io.to(room.roomCode).emit('dg:finished', { standings, winner });
  io.emit('leaderboard:update');
  setTimeout(() => rooms.delete(room.roomCode), 120_000);
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  leaveBySocketId,
  publicPlayerList,
  publicState,
  startGame,
  submitDescriptions,
  endPrepareEarly,
  setGuess,
  revealAnswer,
  setStance,
  startRebuttal,
  endRebuttal,
  submitVote,
  nextDescription,
  endGameByHost,
  // constants for reference
  PREPARE_SECONDS,
  REBUTTAL_SECONDS,
  DESCRIPTIONS_PER_GROUP
};
