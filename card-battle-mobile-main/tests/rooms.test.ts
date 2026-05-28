// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Unit Tests — Room System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Room System', () => {

  // ── توليد معرّف الغرفة ──────────────────────────────
  describe('Room ID Generation', () => {
    it('should generate a unique room ID', () => {
      const id1 = generateRoomId();
      const id2 = generateRoomId();
      expect(id1).not.toBe(id2);
    });

    it('should generate alphanumeric room ID of length 6', () => {
      const id = generateRoomId();
      expect(id).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

  // ── إنشاء الغرفة ────────────────────────────────────
  describe('Create Room', () => {
    it('should create a room with host player', () => {
      const room = createRoom('player_1');
      expect(room.hostId).toBe('player_1');
      expect(room.status).toBe('waiting');
      expect(room.players).toHaveLength(1);
    });

    it('should start room in waiting state', () => {
      const room = createRoom('player_1');
      expect(room.status).toBe('waiting');
    });
  });

  // ── الانضمام للغرفة ─────────────────────────────────
  describe('Join Room', () => {
    it('should allow second player to join', () => {
      const room = createRoom('player_1');
      const updated = joinRoom(room, 'player_2');
      expect(updated.players).toHaveLength(2);
      expect(updated.status).toBe('ready');
    });

    it('should reject third player', () => {
      const room = createRoom('player_1');
      const full = joinRoom(room, 'player_2');
      expect(() => joinRoom(full, 'player_3')).toThrow('Room is full');
    });

    it('should reject duplicate player', () => {
      const room = createRoom('player_1');
      expect(() => joinRoom(room, 'player_1')).toThrow('Player already in room');
    });
  });

  // ── إغلاق الغرفة ────────────────────────────────────
  describe('Close Room', () => {
    it('should mark room as closed after game ends', () => {
      const room = createRoom('player_1');
      const full = joinRoom(room, 'player_2');
      const closed = closeRoom(full);
      expect(closed.status).toBe('closed');
    });

    it('should cleanup players list on close', () => {
      const room = createRoom('player_1');
      const closed = closeRoom(room);
      expect(closed.players).toHaveLength(0);
    });
  });

});

// ── Stubs (استبدلها بالـ imports الحقيقية) ───────────
function generateRoomId(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

interface Room {
  id: string;
  hostId: string;
  players: string[];
  status: 'waiting' | 'ready' | 'playing' | 'closed';
}

function createRoom(hostId: string): Room {
  return { id: generateRoomId(), hostId, players: [hostId], status: 'waiting' };
}

function joinRoom(room: Room, playerId: string): Room {
  if (room.players.length >= 2) throw new Error('Room is full');
  if (room.players.includes(playerId)) throw new Error('Player already in room');
  return { ...room, players: [...room.players, playerId], status: 'ready' };
}

function closeRoom(room: Room): Room {
  return { ...room, players: [], status: 'closed' };
}
