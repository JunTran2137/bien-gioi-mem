// @ts-check
const quiz = require('./quiz-engine');
const board = require('./board-engine');
const debate = require('./debate-engine');
const describe = require('./describe-engine');
const { getDb } = require('./db');

/** roomCode -> Map<groupId, socketId> — tracks which socket holds each group's camera */
const camSessions = new Map();

/**
 * @param {import('socket.io').Server} io
 */
function initSocketHandlers(io) {
  io.on('connection', socket => {
    // ============== QUIZ ==============
    socket.on('quiz:create', ({ hostUid, roomCode }, ack) => {
      try {
        const room = quiz.createRoom(roomCode, hostUid);
        ack && ack({ ok: true, roomCode: room.roomCode });
      } catch (e) {
        ack && ack({ ok: false, error: 'create_failed' });
      }
    });

    socket.on('quiz:join', ({ roomCode, uid, name, avatar, groupId, groupName }, ack) => {
      const room = quiz.joinRoom(roomCode, {
        uid,
        name,
        avatar,
        groupId,
        groupName,
        socketId: socket.id
      });
      if (!room) {
        ack && ack({ ok: false, error: 'room_not_found' });
        return;
      }
      socket.join(roomCode);
      io.to(roomCode).emit('quiz:players', quiz.publicPlayerList(room));
      io.to(roomCode).emit('quiz:groupScores', quiz.computeGroupScores(room));
      ack && ack({
        ok: true,
        roomCode,
        hostUid: room.hostUid,
        status: room.status,
        players: quiz.publicPlayerList(room)
      });
    });

    socket.on('quiz:start', ({ roomCode, uid }) => {
      const room = quiz.getRoom(roomCode);
      if (!room || room.hostUid !== uid) return;
      quiz.startGame(roomCode, io);
    });

    socket.on('quiz:answer', ({ roomCode, uid, answer }) => {
      quiz.submitAnswer(roomCode, uid, answer, io);
    });

    socket.on('quiz:powerUp', ({ roomCode, uid, kind }) => {
      quiz.usePowerUp(roomCode, uid, kind, io);
    });

    // ============== BOARD (Monopoly-style quiz) ==============
    socket.on('board:create', ({ hostUid, roomCode }, ack) => {
      try {
        const room = board.createRoom(roomCode, hostUid);
        ack && ack({ ok: true, roomCode: room.roomCode });
      } catch (e) {
        ack && ack({ ok: false, error: 'create_failed' });
      }
    });

    socket.on('board:join', ({ roomCode, uid, name, avatar, groupId, groupName }, ack) => {
      const room = board.joinRoom(roomCode, { uid, name, avatar, groupId, groupName, socketId: socket.id });
      if (!room) {
        ack && ack({ ok: false, error: 'room_not_found' });
        return;
      }
      socket.join(roomCode);
      io.to(roomCode).emit('board:players', board.publicPlayerList(room));
      io.to(roomCode).emit('board:state', board.publicState(room));
      ack && ack({
        ok: true,
        roomCode,
        hostUid: room.hostUid,
        state: board.publicState(room),
        players: board.publicPlayerList(room)
      });
    });

    socket.on('board:start', ({ roomCode, uid }) => {
      const room = board.getRoom(roomCode);
      if (!room || room.hostUid !== uid) return;
      board.startGame(roomCode, io);
    });

    socket.on('board:pickGroup', ({ roomCode, uid, groupId }) => {
      board.pickGroup(roomCode, uid, groupId, io);
    });

    socket.on('board:exitQuestion', ({ roomCode, uid }) => {
      board.exitQuestion(roomCode, uid, io);
    });

    socket.on('board:end', ({ roomCode, uid }) => {
      board.endGameByHost(roomCode, uid, io);
    });

    socket.on('board:answer', ({ roomCode, uid, answer }) => {
      board.submitAnswer(roomCode, uid, answer, io);
    });

    socket.on('board:dice', ({ roomCode, uid, value }) => {
      board.submitDice(roomCode, uid, value, io);
    });

    // ============== CAMERA (phone board stream) ==============
    // A phone opens /camera?room=CODE, joins as a camera device and relays
    // downscaled frames + detected tile markers to the board players.
    socket.on('camera:join', ({ roomCode }, ack) => {
      if (!roomCode) { ack && ack({ ok: false }); return; }
      socket.join(roomCode);
      socket.data.cameraRoom = roomCode;
      io.to(roomCode).emit('board:cameraStatus', { connected: true });
      ack && ack({ ok: true, roomCode });
    });

    socket.on('camera:frame', ({ roomCode, jpeg }) => {
      if (!roomCode || !jpeg) return;
      socket.to(roomCode).emit('board:cameraFrame', { jpeg });
    });

    socket.on('camera:tiles', ({ roomCode, tiles }) => {
      if (!roomCode) return;
      socket.to(roomCode).emit('board:cameraTiles', { tiles: tiles || [] });
    });

    // ============== DEBATE ==============
    socket.on('debate:create', ({ hostUid, roomCode }, ack) => {
      try {
        const room = debate.createRoom(roomCode, hostUid);
        socket.join('debate:' + roomCode); // host watches without being a player
        // Push current state + players directly to host socket
        const players = debate.publicPlayerList(room);
        socket.emit('debate:players', players);
        socket.emit('debate:state', {
          status: room.status, phase: room.phase,
          roundIdx: room.roundIdx, matchIdx: room.matchIdx,
          bracket: debate.publicBracket(room), groups: debate.publicGroups(room),
          match: debate.publicMatch(room), deadline: room.match?.deadline || 0
        });
        ack && ack({ ok: true, roomCode: room.roomCode, hostUid: room.hostUid, players });
      } catch (e) {
        ack && ack({ ok: false, error: 'create_failed' });
      }
    });

    socket.on('debate:join', ({ roomCode, uid, name, avatar, groupId, groupName }, ack) => {
      const room = debate.joinRoom(roomCode, {
        uid, name, avatar, groupId, groupName, socketId: socket.id
      });
      if (!room) {
        ack && ack({ ok: false, error: 'room_not_found' });
        return;
      }
      socket.join('debate:' + roomCode);
      io.to('debate:' + roomCode).emit('debate:players', debate.publicPlayerList(room));
      // Emit full state to the room so the joining player syncs immediately
      debate.emitState(room, io);
      ack && ack({
        ok: true,
        roomCode,
        hostUid: room.hostUid,
        phase: room.phase,
        players: debate.publicPlayerList(room)
      });
    });

    socket.on('debate:start', ({ roomCode, uid }) => {
      const room = debate.getRoom(roomCode);
      if (!room || room.hostUid !== uid) return;
      debate.startGame(roomCode, io);
    });

    // Host picks first speaker
    socket.on('debate:setFirstSpeaker', ({ roomCode, uid, teamGroupId }) => {
      const room = debate.getRoom(roomCode);
      if (!room || room.hostUid !== uid) return;
      debate.setFirstSpeaker(roomCode, uid, teamGroupId, io);
    });

    // Host manually advances MATCH_PREP -> TURN, or TURN -> next TURN/VOTING
    socket.on('debate:nextTurn', ({ roomCode, uid }) => {
      const room = debate.getRoom(roomCode);
      if (!room || room.hostUid !== uid) return;
      if (room.phase !== 'MATCH_PREP' && room.phase !== 'TURN') return;
      debate.nextTurn(room, io);
    });

    // Host resolves voting and moves to MATCH_RESULT
    socket.on('debate:resolve', ({ roomCode, uid }) => {
      const room = debate.getRoom(roomCode);
      if (!room || room.hostUid !== uid || room.phase !== 'VOTING') return;
      debate.resolveMatch(room, io);
    });

    // Host starts voting after all turns
    socket.on('debate:startVoting', ({ roomCode, uid }) => {
      const room = debate.getRoom(roomCode);
      if (!room || room.hostUid !== uid || room.phase !== 'TURN') return;
      debate.startVoting(room, io);
    });

    // Host force-ends current match and goes to MATCH_RESULT immediately
    socket.on('debate:forceNext', ({ roomCode, uid }) => {
      const room = debate.getRoom(roomCode);
      if (!room || room.hostUid !== uid) return;
      debate.forceNextMatch(room, io);
    });

    // Host starts next match after MATCH_RESULT
    socket.on('debate:nextMatch', ({ roomCode, uid }) => {
      const room = debate.getRoom(roomCode);
      if (!room || room.hostUid !== uid || room.phase !== 'MATCH_RESULT') return;
      debate.startMatch(room, io);
    });

    socket.on('debate:argument', ({ roomCode, uid, text }) => {
      const entry = debate.submitArgument(roomCode, uid, text);
      if (entry) io.to('debate:' + roomCode).emit('debate:argument', entry);
    });

    socket.on('debate:react', ({ roomCode, uid, kind }) => {
      const result = debate.submitReaction(roomCode, uid, kind);
      if (result) io.to('debate:' + roomCode).emit('debate:reaction', result);
    });

    socket.on('debate:vote', ({ roomCode, uid, votedGroupId }) => {
      const tally = debate.submitVote(roomCode, uid, votedGroupId);
      if (tally) io.to('debate:' + roomCode).emit('debate:voteUpdate', tally);
    });

    // ============== DESCRIBE & GUESS ("Mô tả & Đoán thẻ") ==============
    socket.on('dg:create', ({ hostUid, roomCode }, ack) => {
      try {
        const room = describe.createRoom(roomCode, hostUid);
        socket.join(roomCode); // host watches all events without being a player
        // Push current state directly to host socket so they see existing players
        // even if the ack callback is cancelled by a React effect re-run.
        socket.emit('dg:players', describe.publicPlayerList(room));
        socket.emit('dg:state', describe.publicState(room));
        ack && ack({ ok: true, roomCode: room.roomCode, hostUid: room.hostUid, state: describe.publicState(room), players: describe.publicPlayerList(room) });
      } catch (e) {
        ack && ack({ ok: false, error: 'create_failed' });
      }
    });

    socket.on('dg:join', ({ roomCode, uid, name, avatar, groupId, groupName }, ack) => {
      const room = describe.joinRoom(roomCode, { uid, name, avatar, groupId, groupName, socketId: socket.id });
      if (!room) {
        ack && ack({ ok: false, error: 'room_not_found' });
        return;
      }
      socket.join(roomCode);
      io.to(roomCode).emit('dg:players', describe.publicPlayerList(room));
      io.to(roomCode).emit('dg:state', describe.publicState(room));
      ack && ack({
        ok: true,
        roomCode,
        hostUid: room.hostUid,
        state: describe.publicState(room),
        players: describe.publicPlayerList(room)
      });
    });

    socket.on('dg:start', ({ roomCode, uid }) => {
      const room = describe.getRoom(roomCode);
      if (!room || room.hostUid !== uid) return;
      describe.startGame(roomCode, io);
    });

    socket.on('dg:submit', ({ roomCode, uid, descriptions }, ack) => {
      const res = describe.submitDescriptions(roomCode, uid, descriptions, io);
      ack && ack(res);
    });

    socket.on('dg:endPrepare', ({ roomCode, uid }) => {
      describe.endPrepareEarly(roomCode, uid, io);
    });

    socket.on('dg:reveal', ({ roomCode, uid }) => {
      describe.revealAnswer(roomCode, uid, io);
    });

    socket.on('dg:stance', ({ roomCode, uid, stance }) => {
      describe.setStance(roomCode, uid, stance, io);
    });

    socket.on('dg:startRebuttal', ({ roomCode, uid }) => {
      describe.startRebuttal(roomCode, uid, io);
    });

    socket.on('dg:endRebuttal', ({ roomCode, uid }) => {
      describe.endRebuttal(roomCode, uid, io);
    });

    socket.on('dg:vote', ({ roomCode, uid, cardId }) => {
      describe.submitVote(roomCode, uid, cardId, io);
    });

    socket.on('dg:next', ({ roomCode, uid }) => {
      describe.nextDescription(roomCode, uid, io);
    });

    socket.on('dg:end', ({ roomCode, uid }) => {
      describe.endGameByHost(roomCode, uid, io);
    });

    // ---- per-group camera devices for the describe game ----
    // Each group points ONE phone at the physical cards it holds up.
    socket.on('dgcam:join', ({ roomCode, groupId, groupName }, ack) => {
      if (!roomCode || !groupId) { ack && ack({ ok: false }); return; }
      // Check if another socket already holds this group's camera slot
      if (!camSessions.has(roomCode)) camSessions.set(roomCode, new Map());
      const roomCams = camSessions.get(roomCode);
      const existingSocketId = roomCams.get(groupId);
      const alreadyConnected = !!(existingSocketId && existingSocketId !== socket.id && io.sockets.sockets.has(existingSocketId));
      // Register / overwrite this socket as the camera for the group
      roomCams.set(groupId, socket.id);
      socket.join(roomCode);
      socket.data.dgCamRoom = roomCode;
      socket.data.dgCamGroup = groupId;
      io.to(roomCode).emit('dg:cameraStatus', { groupId, groupName: groupName || null, connected: true });
      ack && ack({ ok: true, roomCode, groupId, alreadyConnected });
    });

    socket.on('dgcam:frame', ({ roomCode, groupId, jpeg }) => {
      if (!roomCode || !groupId || !jpeg) return;
      socket.to(roomCode).emit('dg:cameraFrame', { groupId, jpeg });
    });

    socket.on('dgcam:tiles', ({ roomCode, groupId, tiles }) => {
      if (!roomCode || !groupId) return;
      const list = Array.isArray(tiles) ? tiles : [];
      socket.to(roomCode).emit('dg:cameraTiles', { groupId, tiles: list });
      // Use the first detected marker as this group's live guess.
      if (list.length) {
        describe.setGuess(roomCode, groupId, list[0].id, io);
      }
    });

    socket.on('disconnect', () => {
      // best-effort: notify rooms about player drop but keep their record
      const q = quiz.leaveBySocketId(socket.id);
      if (q) {
        io.to(q.room.roomCode).emit('quiz:players', quiz.publicPlayerList(q.room));
      }
      const b = board.leaveBySocketId(socket.id);
      if (b) {
        io.to(b.room.roomCode).emit('board:players', board.publicPlayerList(b.room));
      }
      if (socket.data && socket.data.cameraRoom) {
        io.to(socket.data.cameraRoom).emit('board:cameraStatus', { connected: false });
      }
      if (socket.data && socket.data.dgCamRoom) {
        const rc = socket.data.dgCamRoom;
        const gid = socket.data.dgCamGroup;
        // Remove from camSessions only if this socket is still the registered one
        const roomCams = camSessions.get(rc);
        if (roomCams && roomCams.get(gid) === socket.id) roomCams.delete(gid);
        io.to(rc).emit('dg:cameraStatus', { groupId: gid, connected: false });
      }
      const d = debate.leaveBySocketId(socket.id);
      if (d) {
        io.to('debate:' + d.room.roomCode).emit('debate:players', debate.publicPlayerList(d.room));
      }
      const dg = describe.leaveBySocketId(socket.id);
      if (dg) {
        io.to(dg.room.roomCode).emit('dg:players', describe.publicPlayerList(dg.room));
      }
    });
  });
}

module.exports = { initSocketHandlers };
