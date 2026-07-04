/* Headless state-machine test for the "Mô tả & Đoán thẻ" engine.
 * Drives the full flow with a fake Socket.io `io` (no network / no browser):
 *   join -> start -> prepare -> submit -> reveal loop (with camera guesses,
 *   a disagreement -> rebuttal -> vote round) -> finished.
 * Run: node scripts/test-describe.js
 */
process.env.DATABASE_PATH = require('node:path').join(require('node:os').tmpdir(), `dg-test-${Date.now()}.sqlite`);

const assert = require('node:assert');
const { initDatabase } = require('../lib/db');
const engine = require('../lib/describe-engine');
const { describeCards } = require('../data/describeCards');

initDatabase();

// ---- fake io ----
const emitted = [];
function makeIo() {
  const rec = (event, payload) => emitted.push({ event, payload });
  return {
    to: () => ({ emit: rec }),
    emit: rec
  };
}
const io = makeIo();
const lastOf = (event) => [...emitted].reverse().find(e => e.event === event)?.payload;

const ROOM = 'TEST01';
const NGROUPS = 8;
const PLAYERS_PER_GROUP = 3;

// ---- build 8 groups x 3 players ----
engine.createRoom(ROOM, 'u_G1_0'); // host is first player of group 1
const groups = [];
for (let gi = 1; gi <= NGROUPS; gi++) {
  const gid = 'G' + gi;
  groups.push({ gid, name: 'Nhóm ' + gi });
  for (let pj = 0; pj < PLAYERS_PER_GROUP; pj++) {
    engine.joinRoom(ROOM, {
      uid: `u_G${gi}_${pj}`,
      name: `P${gi}.${pj}`,
      avatar: null,
      groupId: gid,
      groupName: 'Nhóm ' + gi,
      socketId: `s_G${gi}_${pj}`
    });
  }
}

// each group is assigned 3 distinct cards to describe
const groupCards = {};
groups.forEach((g, i) => {
  groupCards[g.gid] = [describeCards[i * 3], describeCards[i * 3 + 1], describeCards[i * 3 + 2]];
});

// ---- start -> prepare ----
engine.startGame(ROOM, io);
let room = engine.getRoom(ROOM);
assert.strictEqual(room.phase, 'prepare', 'should be in prepare phase');
assert.strictEqual(room.scribes.size, NGROUPS, 'a scribe per group');
console.log('✓ start -> prepare, scribes assigned:', room.scribes.size);

// ---- each group's scribe submits 3 descriptions ----
for (const g of groups) {
  const scribe = room.scribes.get(g.gid);
  const list = groupCards[g.gid].map((c, k) => ({ text: `Mô tả ${g.gid} #${k + 1}`, cardId: c.id }));
  const res = engine.submitDescriptions(ROOM, scribe, list, io);
  assert.strictEqual(res.ok, true, 'submit ok for ' + g.gid);
  assert.strictEqual(res.count, 3, '3 descriptions for ' + g.gid);
}
// a non-scribe must be rejected
const g1nonScribe = ['u_G1_0', 'u_G1_1', 'u_G1_2'].find(u => u !== room.scribes.get('G1'));
const bad = engine.submitDescriptions(ROOM, g1nonScribe, [{ text: 'x', cardId: describeCards[0].id }], io);
assert.strictEqual(bad.ok, false, 'non-scribe rejected');
console.log('✓ submissions saved (24 total), non-scribe rejected');

// ---- end prepare early -> reveal ----
engine.endPrepareEarly(ROOM, 'u_G1_0', io);
room = engine.getRoom(ROOM);
assert.strictEqual(room.phase, 'reveal', 'should be revealing');
assert.strictEqual(room.order.length, NGROUPS * 3, 'should have 24 descriptions');
assert.strictEqual(room.idx, 0, 'first description shown');
assert.strictEqual(room.subPhase, 'showing');
console.log('✓ prepare -> reveal, queue length:', room.order.length);

// helper: run one description round. `disputeVoteCardId` != null triggers the
// full disagreement -> rebuttal -> vote path, forcing that card as the answer.
function runRound(disputeVoteCardId) {
  const cur = room.order[room.idx];
  const authorGid = cur.authorGroupId;
  const correctCard = describeCards.find(c => c.id === cur.cardId);
  const otherGroups = groups.map(g => g.gid).filter(gid => gid !== authorGid);

  // camera guesses: first 3 other groups guess correctly, rest guess wrong
  otherGroups.forEach((gid, k) => {
    const markerId = k < 3 ? correctCard.markerId : (correctCard.markerId % 24) + 1 + 100; // wrong -> unknown marker
    // use a definitely-different valid marker for wrong guesses
    const wrong = describeCards.find(c => c.markerId !== correctCard.markerId);
    engine.setGuess(ROOM, gid, k < 3 ? correctCard.markerId : wrong.markerId, io);
  });

  // host reveals
  engine.revealAnswer(ROOM, 'u_G1_0', io);
  assert.strictEqual(room.subPhase, 'revealed');

  if (disputeVoteCardId) {
    // one group disagrees
    const dissenter = otherGroups[0];
    engine.setStance(ROOM, `u_${dissenter}_0`, 'disagree', io);
    assert.ok(engine.publicState(room).anyDisagree, 'anyDisagree true');
    engine.startRebuttal(ROOM, 'u_G1_0', io);
    assert.strictEqual(room.subPhase, 'rebuttal');
    engine.endRebuttal(ROOM, 'u_G1_0', io);
    assert.strictEqual(room.subPhase, 'voting');
    // majority of players vote for disputeVoteCardId
    let voters = 0;
    for (const g of groups) for (let pj = 0; pj < PLAYERS_PER_GROUP; pj++) {
      engine.submitVote(ROOM, `u_${g.gid}_${pj}`, disputeVoteCardId, io);
      voters++;
    }
    assert.ok(voters > 0);
  }

  engine.nextDescription(ROOM, 'u_G1_0', io);
}

// run all 24 rounds; round index 5 uses the dispute/vote path
const total = room.order.length;
for (let i = 0; i < total; i++) {
  const isLast = room.idx === total - 1;
  const dispute = i === 5 ? room.order[room.idx].cardId : null; // vote the (correct) card
  runRound(dispute);
  if (!isLast) {
    assert.strictEqual(room.subPhase, 'showing', 'next description showing at round ' + i);
  }
}

// ---- finished ----
const fin = lastOf('dg:finished');
assert.ok(fin, 'dg:finished emitted');
assert.strictEqual(fin.standings.length, NGROUPS, '8 groups in standings');
assert.ok(fin.winner, 'has a winner');
const totalScore = fin.standings.reduce((s, g) => s + g.score, 0);
assert.ok(totalScore > 0, 'scores were awarded');
room = engine.getRoom(ROOM);
assert.strictEqual(room.status, 'finished');

console.log('✓ completed', total, 'rounds -> finished');
console.log('  standings:', fin.standings.map(g => `${g.groupName}:${g.score}`).join('  '));
console.log('  winner:', fin.winner.groupName, fin.winner.score);
console.log('\nALL TESTS PASSED');
process.exit(0);
