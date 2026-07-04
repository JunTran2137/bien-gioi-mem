// @ts-check
// In-memory debate game state machine

const { getDb } = require('./db');
const { debateTopics } = require('../data/debateTopics');

const PREP_SECONDS = 120;
const SPEAK_SECONDS = 90;
const REBUTTAL_SECONDS = 60;
const RESPONSE_SECONDS = 30;
const VOTE_SECONDS = 30;

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

function createRoom(roomCode, hostUid) {
  const room = {
    roomCode,
    hostUid,
    phase: 'WAITING', // WAITING | PREP | SPEAKING | REBUTTAL | RESPONSE | VOTING | FINISHED
    players: new Map(), // uid -> {uid,name,avatar,groupId,groupName,socketId}
    /** @type {Map<string, {groupId:string, groupName:string, topic:any, arguments:string[], reactions:{clap:number,think:number,exclaim:number}, challenges:Array<{fromGroupId:string, fromGroupName:string, text:string}>, responses:string[]}>} */
    groupStates: new Map(),
    speakingOrder: [],
    speakingIdx: -1,
    deadline: 0,
    /** @type {Map<string, string>} */
    votes: new Map(), // voterUid -> votedGroupId
    timer: null
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
  const existing = room.players.get(player.uid);
  if (existing) {
    existing.socketId = player.socketId;
    return room;
  }
  room.players.set(player.uid, {
    uid: player.uid,
    name: player.name,
    avatar: player.avatar || null,
    groupId: player.groupId || null,
    groupName: player.groupName || null,
    socketId: player.socketId
  });
  return room;
}

function leaveBySocketId(socketId) {
  for (const room of rooms.values()) {
    for (const [uid, p] of room.players) {
      if (p.socketId === socketId) {
        return { room, uid };
      }
    }
  }
  return null;
}

function publicPlayerList(room) {
  return Array.from(room.players.values()).map(p => ({
    uid: p.uid,
    name: p.name,
    avatar: p.avatar,
    groupId: p.groupId,
    groupName: p.groupName
  }));
}

function publicGroupStates(room) {
  const out = {};
  for (const [gid, gs] of room.groupStates) {
    out[gid] = {
      groupId: gs.groupId,
      groupName: gs.groupName,
      topic: gs.topic,
      arguments: gs.arguments,
      reactions: gs.reactions,
      challenges: gs.challenges,
      responses: gs.responses
    };
  }
  return out;
}

function clearTimer(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

function emitState(room, io) {
  io.to('debate:' + room.roomCode).emit('debate:state', {
    phase: room.phase,
    deadline: room.deadline,
    speakingGroupId: room.speakingIdx >= 0 ? room.speakingOrder[room.speakingIdx] : null,
    speakingIdx: room.speakingIdx,
    speakingOrder: room.speakingOrder,
    groupStates: publicGroupStates(room),
    players: publicPlayerList(room),
    voteCount: tallyVotes(room)
  });
}

function startGame(roomCode, io) {
  const room = rooms.get(roomCode);
  if (!room) return;
  // collect unique groups
  /** @type {Map<string, {groupId:string, groupName:string}>} */
  const groupMap = new Map();
  for (const p of room.players.values()) {
    if (p.groupId && !groupMap.has(p.groupId)) {
      groupMap.set(p.groupId, { groupId: p.groupId, groupName: p.groupName || 'Nhóm' });
    }
  }
  const groups = Array.from(groupMap.values());
  if (groups.length < 2) {
    io.to('debate:' + roomCode).emit('debate:error', { message: 'Cần ít nhất 2 nhóm để tranh luận.' });
    return;
  }
  const shuffledTopics = shuffle(debateTopics);
  const shuffledGroups = shuffle(groups);
  room.groupStates = new Map();
  shuffledGroups.forEach((g, i) => {
    room.groupStates.set(g.groupId, {
      groupId: g.groupId,
      groupName: g.groupName,
      topic: shuffledTopics[i % shuffledTopics.length],
      arguments: [],
      reactions: { clap: 0, think: 0, exclaim: 0 },
      challenges: [],
      responses: []
    });
  });
  room.speakingOrder = shuffledGroups.map(g => g.groupId);
  room.speakingIdx = -1;
  // persist
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO debate_sessions (id, room_code, status, started_at)
       VALUES (?, ?, 'playing', datetime('now'))`
    ).run(roomCode, roomCode);
  } catch (e) {
    console.error('[debate] start persist failed', e);
  }
  // PREP phase
  room.phase = 'PREP';
  room.deadline = Date.now() + PREP_SECONDS * 1000;
  emitState(room, io);
  clearTimer(room);
  room.timer = setTimeout(() => nextSpeaker(room, io), PREP_SECONDS * 1000);
}

function nextSpeaker(room, io) {
  clearTimer(room);
  room.speakingIdx += 1;
  if (room.speakingIdx >= room.speakingOrder.length) {
    return startVoting(room, io);
  }
  room.phase = 'SPEAKING';
  room.deadline = Date.now() + SPEAK_SECONDS * 1000;
  emitState(room, io);
  room.timer = setTimeout(() => startRebuttal(room, io), SPEAK_SECONDS * 1000);
}

function startRebuttal(room, io) {
  clearTimer(room);
  room.phase = 'REBUTTAL';
  room.deadline = Date.now() + REBUTTAL_SECONDS * 1000;
  emitState(room, io);
  room.timer = setTimeout(() => startResponse(room, io), REBUTTAL_SECONDS * 1000);
}

function startResponse(room, io) {
  clearTimer(room);
  room.phase = 'RESPONSE';
  room.deadline = Date.now() + RESPONSE_SECONDS * 1000;
  emitState(room, io);
  room.timer = setTimeout(() => nextSpeaker(room, io), RESPONSE_SECONDS * 1000);
}

function startVoting(room, io) {
  clearTimer(room);
  room.phase = 'VOTING';
  room.deadline = Date.now() + VOTE_SECONDS * 1000;
  emitState(room, io);
  room.timer = setTimeout(() => finalize(room, io), VOTE_SECONDS * 1000);
}

function tallyVotes(room) {
  const tally = {};
  for (const groupId of room.speakingOrder) tally[groupId] = 0;
  for (const votedGroup of room.votes.values()) {
    if (tally[votedGroup] !== undefined) tally[votedGroup] += 1;
  }
  return tally;
}

function submitArgument(roomCode, uid, text) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'SPEAKING') return null;
  const player = room.players.get(uid);
  if (!player) return null;
  const currentGroupId = room.speakingOrder[room.speakingIdx];
  if (player.groupId !== currentGroupId) return null;
  const gs = room.groupStates.get(currentGroupId);
  if (!gs) return null;
  const clean = String(text || '').slice(0, 500).trim();
  if (!clean) return null;
  gs.arguments.push(clean);
  return { groupId: currentGroupId, text: clean };
}

function submitChallenge(roomCode, uid, text) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'REBUTTAL') return null;
  const player = room.players.get(uid);
  if (!player || !player.groupId) return null;
  const currentGroupId = room.speakingOrder[room.speakingIdx];
  if (player.groupId === currentGroupId) return null;
  const gs = room.groupStates.get(currentGroupId);
  if (!gs) return null;
  const clean = String(text || '').slice(0, 280).trim();
  if (!clean) return null;
  gs.challenges.push({ fromGroupId: player.groupId, fromGroupName: player.groupName || 'Nhóm', text: clean });
  return { toGroupId: currentGroupId, fromGroupId: player.groupId, text: clean };
}

function submitResponse(roomCode, uid, text) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'RESPONSE') return null;
  const player = room.players.get(uid);
  if (!player) return null;
  const currentGroupId = room.speakingOrder[room.speakingIdx];
  if (player.groupId !== currentGroupId) return null;
  const gs = room.groupStates.get(currentGroupId);
  if (!gs) return null;
  const clean = String(text || '').slice(0, 500).trim();
  if (!clean) return null;
  gs.responses.push(clean);
  return { groupId: currentGroupId, text: clean };
}

function submitReaction(roomCode, uid, kind) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const player = room.players.get(uid);
  if (!player) return null;
  if (room.phase !== 'SPEAKING' && room.phase !== 'RESPONSE') return null;
  const currentGroupId = room.speakingOrder[room.speakingIdx];
  if (player.groupId === currentGroupId) return null;
  const gs = room.groupStates.get(currentGroupId);
  if (!gs) return null;
  if (kind === 'clap') gs.reactions.clap += 1;
  else if (kind === 'think') gs.reactions.think += 1;
  else if (kind === 'exclaim') gs.reactions.exclaim += 1;
  else return null;
  return { groupId: currentGroupId, reactions: gs.reactions };
}

function submitVote(roomCode, uid, votedGroupId) {
  const room = rooms.get(roomCode);
  if (!room || room.phase !== 'VOTING') return null;
  const player = room.players.get(uid);
  if (!player) return null;
  if (player.groupId === votedGroupId) return null;
  if (!room.groupStates.has(votedGroupId)) return null;
  room.votes.set(uid, votedGroupId);
  return tallyVotes(room);
}

function finalize(room, io) {
  clearTimer(room);
  room.phase = 'FINISHED';
  const tally = tallyVotes(room);
  // determine winner(s)
  let max = -1;
  for (const v of Object.values(tally)) if (v > max) max = v;
  const winners = Object.entries(tally).filter(([, v]) => v === max && max > 0).map(([gid]) => gid);
  const winnerSet = new Set(winners);
  const WINNER_POOL = 500;
  /** @type {Record<string, number>} */
  const perPlayerAward = {};
  for (const winnerGid of winners) {
    const members = Array.from(room.players.values()).filter(p => p.groupId === winnerGid);
    if (members.length === 0) continue;
    const each = Math.round(WINNER_POOL / members.length);
    for (const m of members) perPlayerAward[m.uid] = (perPlayerAward[m.uid] || 0) + each;
  }
  // voter accuracy bonus
  for (const [voterUid, votedGid] of room.votes) {
    if (winnerSet.has(votedGid)) {
      perPlayerAward[voterUid] = (perPlayerAward[voterUid] || 0) + 50;
    }
  }
  // persist
  try {
    const db = getDb();
    db.prepare(`UPDATE debate_sessions SET status='finished', ended_at=datetime('now') WHERE room_code=?`).run(room.roomCode);
    const insertVote = db.prepare(`INSERT OR REPLACE INTO debate_votes (session_id, voter_uid, voted_group) VALUES (?, ?, ?)`);
    const incUser = db.prepare(`UPDATE users SET total_score = total_score + ? WHERE uid = ?`);
    const incGroup = db.prepare(`UPDATE groups SET total_score = total_score + ? WHERE id = ?`);
    const tx = db.transaction(() => {
      for (const [voterUid, votedGid] of room.votes) {
        insertVote.run(room.roomCode, voterUid, votedGid);
      }
      for (const [uid, pts] of Object.entries(perPlayerAward)) {
        incUser.run(pts, uid);
      }
      for (const winnerGid of winners) {
        incGroup.run(WINNER_POOL, winnerGid);
      }
    });
    tx();
  } catch (e) {
    console.error('[debate] finalize persist failed', e);
  }
  io.to('debate:' + room.roomCode).emit('debate:finished', {
    tally,
    winners,
    perPlayerAward,
    groupStates: publicGroupStates(room),
    winnerPool: WINNER_POOL
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
  submitArgument,
  submitChallenge,
  submitResponse,
  submitReaction,
  submitVote,
  publicPlayerList,
  publicGroupStates,
  tallyVotes,
  PREP_SECONDS,
  SPEAK_SECONDS,
  REBUTTAL_SECONDS,
  RESPONSE_SECONDS,
  VOTE_SECONDS
};
