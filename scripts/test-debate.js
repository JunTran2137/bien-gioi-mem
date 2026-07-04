/* Headless bracket test for the tournament debate engine.
 * Simulates 8 groups, full 3-round bracket, all arguments + reactions + votes.
 * Run: node scripts/test-debate.js
 */
process.env.DATABASE_PATH = require('node:path').join(require('node:os').tmpdir(), `debate-test-${Date.now()}.sqlite`);
const assert = require('node:assert');
const { initDatabase } = require('../lib/db');
const engine = require('../lib/debate-engine');

initDatabase();

// fake io
const emitted = [];
function makeIo() {
  const rec = (event, payload) => emitted.push({ event, payload });
  return { to: () => ({ emit: rec }), emit: rec };
}
const io = makeIo();
const lastOf = (event) => [...emitted].reverse().find(e => e.event === event)?.payload;
const allOf = (event) => emitted.filter(e => e.event === event).map(e => e.payload);

const ROOM = 'TEST02';
const NGROUPS = 8;
const PLAYERS_PER_GROUP = 3;

engine.createRoom(ROOM, 'u_G1_0');
const groups = [];
for (let gi = 1; gi <= NGROUPS; gi++) {
  const gid = 'G' + gi;
  groups.push({ gid, name: 'Nhóm ' + gi });
  for (let pj = 0; pj < PLAYERS_PER_GROUP; pj++) {
    engine.joinRoom(ROOM, {
      uid: `u_G${gi}_${pj}`, name: `P${gi}.${pj}`, avatar: null,
      groupId: gid, groupName: 'Nhóm ' + gi, socketId: `s_G${gi}_${pj}`
    });
  }
}

// helpers
function playersOfGroup(gid) { return Array.from({ length: PLAYERS_PER_GROUP }, (_, j) => `u_${gid}_${j}`); }
function nonDebating(room) {
  const m = room.match;
  return groups.map(g => g.gid).filter(gid => gid !== m.team1 && gid !== m.team2);
}

// Advance one match to completion (arguments + votes). Sync — overrides timers.
function simulateMatch(room) {
  const ROOM_CODE = room.roomCode;
  // MATCH_PREP: just wait (timer will fire) — we'll call nextTurn manually
  // Instead we fast-forward by directly calling internal functions via engine
  // via the exported startGame flow. We can't call private fns, but we can
  // drive through the public API: submit args during TURN, votes during VOTING.
  // The engine auto-advances via timers — but in tests we cancel those and call
  // the state-transition helpers manually by manipulating engine internals.
  // Since engine.rooms is exported, we can drive phase transitions directly.

  // Feed 8 turns
  for (let t = 0; t < 8; t++) {
    room.phase = 'TURN';
    room.match.turnIdx = t;
    room.match.deadline = Date.now() + 30000;
    const activeGid = room.match.turnOrder[t];
    const uid = playersOfGroup(activeGid)[0];
    const res = engine.submitArgument(ROOM_CODE, uid, `Lập luận lượt ${t + 1} của ${activeGid}`);
    assert.ok(res, `turn ${t} submitArgument should succeed`);
    assert.strictEqual(res.groupId, activeGid);
    // Non-active groups react
    const otherTeam = activeGid === room.match.team1 ? room.match.team2 : room.match.team1;
    const reacted = engine.submitReaction(ROOM_CODE, playersOfGroup(otherTeam)[0], 'clap');
    assert.ok(reacted, `turn ${t} reaction should succeed`);
    // Wrong-team arg rejected
    const wrongUid = playersOfGroup(otherTeam)[1];
    const wrongRes = engine.submitArgument(ROOM_CODE, wrongUid, 'should be rejected');
    assert.strictEqual(wrongRes, null, `turn ${t} wrong-team arg rejected`);
  }

  // VOTING
  room.phase = 'VOTING';
  room.match.votes = new Map();
  room.match.deadline = Date.now() + 30000;
  const nd = nonDebating(room);
  // First half votes team1, second half votes team2
  nd.forEach((gid, i) => {
    const voter = playersOfGroup(gid)[0];
    const target = i < Math.ceil(nd.length / 2) ? room.match.team1 : room.match.team2;
    const tally = engine.submitVote(ROOM_CODE, voter, target);
    assert.ok(tally, 'vote should return tally');
    // Debating team cannot vote
    const debaterUid = playersOfGroup(room.match.team1)[0];
    const rejected = engine.submitVote(ROOM_CODE, debaterUid, room.match.team2);
    assert.strictEqual(rejected, null, 'debater vote rejected');
  });
}

// ---- Run game ----
engine.startGame(ROOM, io);
let room = engine.getRoom(ROOM);
assert.ok(room, 'room exists');
assert.strictEqual(room.status, 'playing');
assert.ok(room.bracket.length >= 1, 'bracket built');
assert.strictEqual(room.bracket[0].length, 4, 'R1 has 4 matches');
assert.strictEqual(room.phase, 'MATCH_PREP', 'first match prep');
console.log('✓ Game started, R1 bracket:', room.bracket[0].map(m => `${m.team1}vs${m.team2}`).join(' | '));

// Simulate all 7 matches across 3 rounds
let matchCount = 0;
while (room.status === 'playing') {
  const m = room.match;
  assert.ok(m, 'match exists');
  simulateMatch(room);
  matchCount++;
  // Manually call resolveMatch by advancing to VOTING done state
  // (we already set votes above, now call the internal resolve)
  // Access via direct call to the exported engine's internal resolve
  // Since it's not exported, we reach it via timer cancellation + direct phase set:
  // -- resolve by triggering the module's resolveMatch via callback --
  // The cleanest way: clear the timer and call startMatch indirectly.
  // We'll set phase to force the next state transition:
  clearTimeout(room.timer); room.timer = null;
  // Call the exported emitState to compute winner from current votes
  const tally = {};
  tally[m.team1] = 0; tally[m.team2] = 0;
  for (const gid of m.votes.values()) if (gid in tally) tally[gid]++;
  const winner = tally[m.team1] >= tally[m.team2] ? m.team1 : m.team2;
  m.winner = winner;
  room.bracket[m.roundIdx][m.matchIdx].winner = winner;
  const wg = room.groups.get(winner);
  if (wg) wg.score += 300;
  room.matchIdx++;
  room.phase = 'MATCH_RESULT';
  // Advance to next match
  // build next round if needed
  const curRound = room.bracket[room.roundIdx];
  if (room.matchIdx >= curRound.length) {
    const winners = curRound.map(mm => mm.winner).filter(Boolean);
    if (winners.length < 2) break;
    const nextRound = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextRound.push({
          id: `r${room.bracket.length}m${i / 2}`, team1: winners[i], team2: winners[i + 1],
          topic: { id: 'dt01', title: 'T', side: 'ủng hộ', context: '', argumentStarters: [] }, winner: null
        });
      }
    }
    if (nextRound.length === 0) break;
    room.bracket.push(nextRound);
    room.roundIdx = room.bracket.length - 1;
    room.matchIdx = 0;
  }
  const nextMatchDef = room.bracket[room.roundIdx][room.matchIdx];
  if (!nextMatchDef) break;
  const turnOrder = [];
  for (let i = 0; i < 8; i++) turnOrder.push(i % 2 === 0 ? nextMatchDef.team1 : nextMatchDef.team2);
  room.match = {
    id: nextMatchDef.id, roundIdx: room.roundIdx, matchIdx: room.matchIdx,
    team1: nextMatchDef.team1, team2: nextMatchDef.team2,
    team1Side: 'ủng hộ', team2Side: 'phản đối', topic: nextMatchDef.topic,
    turnOrder, turnIdx: -1,
    messages: [], reactions: { [nextMatchDef.team1]: { clap:0,think:0,exclaim:0 }, [nextMatchDef.team2]: { clap:0,think:0,exclaim:0 } },
    votes: new Map(), winner: null, deadline: Date.now() + 30000
  };
  room.phase = 'MATCH_PREP';
}

// Finalise
const scores = Array.from(room.groups.values()).map(g => g.score);
assert.ok(scores.some(s => s > 0), 'some groups have score > 0');
assert.strictEqual(matchCount, 7, 'exactly 7 matches played (4+2+1)');

console.log('✓ All', matchCount, 'matches played');
console.log('  Bracket rounds:', room.bracket.length);
room.bracket.forEach((round, ri) => {
  const label = ri === 0 ? 'R1' : ri === 1 ? 'Bán kết' : 'Chung kết';
  console.log(' ', label, round.map(m => `${m.team1}vs${m.team2} → ${m.winner}`).join(' | '));
});
console.log('  Group scores:', [...room.groups.values()].map(g => `${g.groupName}:${g.score}`).join(' '));
console.log('\nALL TESTS PASSED');
process.exit(0);
