/**
 * Simulate groups 2-8 joining a describe or debate room.
 * Usage: node scripts/sim-groups.js ROOMCODE [describe|debate]
 *   describe (default): connects via dg:join
 *   debate: connects via debate:join
 *
 * Run AFTER creating a room in the browser, BEFORE clicking Start.
 * Keep this process running while the game is played.
 */
const { io } = require('socket.io-client');

const ROOM = (process.argv[2] || '').toUpperCase().trim();
const GAME = (process.argv[3] || 'describe').toLowerCase();

if (!ROOM) {
  console.error('Usage: node scripts/sim-groups.js ROOMCODE [describe|debate]');
  process.exit(1);
}

const BASE = process.env.SERVER_URL || 'http://localhost:3000';
const NGROUPS = 7; // groups 2-8

const sockets = [];

for (let i = 0; i < NGROUPS; i++) {
  const n = i + 2; // groups 2..8
  const socket = io(BASE, { path: '/socket.io', transports: ['websocket'] });

  socket.on('connect', () => {
    console.log(`[G${n}] connected: ${socket.id}`);
    if (GAME === 'debate') {
      socket.emit('debate:join', {
        roomCode: ROOM,
        uid: `sim_uid_${n}`,
        name: `Người Chơi ${n}`,
        avatar: null,
        groupId: `sim_group_${n}`,
        groupName: `Nhóm ${n}`
      }, (res) => {
        console.log(`[G${n}] debate:join`, res?.ok ? 'OK' : res?.error);
      });
    } else {
      socket.emit('dg:join', {
        roomCode: ROOM,
        uid: `sim_uid_${n}`,
        name: `Người Chơi ${n}`,
        avatar: null,
        groupId: `sim_group_${n}`,
        groupName: `Nhóm ${n}`
      }, (res) => {
        console.log(`[G${n}] dg:join`, res?.ok ? 'OK' : res?.error);
        // if game already in prepare phase, submit descriptions immediately
        if (res?.ok && res.state?.phase === 'prepare') {
          submitIfScribe(res.state.submissionCounts ? {} : {},
            `sim_group_${n}`, `sim_uid_${n}`);
          // always submit since we're the only player in this sim group
          const { describeCards } = require('../data/describeCards');
          const offset = ((n - 1) * 3) % describeCards.length;
          const descs = [0, 1, 2].map(k => ({
            text: `Mô tả của nhóm ${n} về thẻ ${describeCards[(offset + k) % describeCards.length].name}`,
            cardId: describeCards[(offset + k) % describeCards.length].id
          }));
          setTimeout(() => {
            socket.emit('dg:submit', { roomCode: ROOM, uid: `sim_uid_${n}`, descriptions: descs }, (r) => {
              console.log(`[G${n}] dg:submit (rejoin)`, r?.ok ? `OK (${r.count})` : r?.error);
            });
          }, 400);
        }
      });
    }
  });

  // --- DESCRIBE game automation ---
  function submitIfScribe(scribes, myGid, myUid) {
    if (scribes[myGid] !== myUid) return;
    const { describeCards } = require('../data/describeCards');
    const offset = ((n - 1) * 3) % describeCards.length;
    const descs = [0, 1, 2].map(k => ({
      text: `Mô tả của nhóm ${n} về thẻ ${describeCards[(offset + k) % describeCards.length].name}`,
      cardId: describeCards[(offset + k) % describeCards.length].id
    }));
    setTimeout(() => {
      socket.emit('dg:submit', { roomCode: ROOM, uid: myUid, descriptions: descs }, (res) => {
        console.log(`[G${n}] dg:submit`, res?.ok ? `OK (${res.count})` : res?.error);
      });
    }, 600);
  }

  socket.on('dg:started', ({ scribes }) => {
    submitIfScribe(scribes, `sim_group_${n}`, `sim_uid_${n}`);
  });

  socket.on('dg:revealed', () => {
    // agree with revealed answer
    socket.emit('dg:stance', { roomCode: ROOM, uid: `sim_uid_${n}`, stance: 'agree' });
  });

  socket.on('dg:voting', () => {
    // vote for a random valid card
    const { describeCards } = require('../data/describeCards');
    const pick = describeCards[Math.floor(Math.random() * describeCards.length)];
    socket.emit('dg:vote', { roomCode: ROOM, uid: `sim_uid_${n}`, cardId: pick.id });
    console.log(`[G${n}] voted`);
  });

  // --- DEBATE game automation ---
  socket.on('debate:state', (state) => {
    const myGid = `sim_group_${n}`;
    if (!state.match) return;
    const m = state.match;

    if (state.phase === 'TURN' && m.activeGroupId === myGid) {
      setTimeout(() => {
        socket.emit('debate:argument', {
          roomCode: ROOM,
          uid: `sim_uid_${n}`,
          text: `Lập luận của nhóm ${n} — ${m.team1Side || ''}: Đây là một luận điểm quan trọng về chủ đề này.`
        });
        console.log(`[G${n}] sent argument`);
      }, 400);
    }

    if (state.phase === 'VOTING' && m.team1 !== myGid && m.team2 !== myGid) {
      const target = Math.random() < 0.5 ? m.team1 : m.team2;
      socket.emit('debate:vote', { roomCode: ROOM, uid: `sim_uid_${n}`, votedGroupId: target });
      console.log(`[G${n}] voted for ${target}`);
    }
  });

  socket.on('dg:state', (state) => {
    const myGid = `sim_group_${n}`;
    if (!state.match) return;
    const m = state.match;
    // auto-react during TURN phase
    if (state.phase === 'TURN') {
      socket.emit('dg:guesses', {}); // just a keep-alive reaction
    }
    // vote in VOTING phase
    if (m.subPhase === 'voting') {
      const { describeCards } = require('../data/describeCards');
      const pick = describeCards[Math.floor(Math.random() * describeCards.length)];
      socket.emit('dg:vote', { roomCode: ROOM, uid: `sim_uid_${n}`, cardId: pick.id });
    }
  });

  socket.on('dg:finished', (data) => {
    console.log(`[G${n}] game finished! winner: ${data.winner?.groupName}`);
  });
  socket.on('debate:finished', (data) => {
    console.log(`[G${n}] debate finished! champion: ${data.championName}`);
  });
  socket.on('connect_error', (e) => console.error(`[G${n}] connect error:`, e.message));

  sockets.push(socket);
}

process.on('SIGINT', () => {
  sockets.forEach(s => s.disconnect());
  process.exit(0);
});

console.log(`Simulating groups 2-8 for room ${ROOM} (${GAME} game) on ${BASE}`);
console.log('Press Ctrl+C to stop.');
