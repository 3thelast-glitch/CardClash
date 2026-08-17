import { isValidInviteCode, normalizeInviteCode } from '../../lib/multiplayer/invites';

export interface Player {
  id: string;
  name: string;
  socketId: string;
  isReady: boolean;
  rating?: number;
  tier?: string;
  cards?: any[];
  rounds?: number;
}

// ─── Match Settings ──────────────────────────────────────────────────────────────
// يضبطها صاحب الجلسة في rounds-config ثم تُرسل للضيف

export interface MatchSettings {
  rounds: number;
  withAbilities: boolean;
  rarityWeights: Record<string, number>;
}

// ─── Round State ────────────────────────────────────────────────────────────────
export interface RevealedCard {
  playerId: string;
  card: any;
  roundIndex: number;
}

export interface RoundState {
  roundIndex: number;
  p1Card: RevealedCard | null;
  p2Card: RevealedCard | null;
  resolved: boolean;
}

export interface RoundResult {
  roundIndex: number;
  p1Card: any;
  p2Card: any;
  winner: 'player1' | 'player2' | 'draw';
  p1Score: number;
  p2Score: number;
  advantage: 'element' | 'attack' | 'draw';
}

// ─── Room ────────────────────────────────────────────────────────────────────────
export interface Room {
  id: string;
  player1: Player | null;
  player2: Player | null;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  expiresAt: Date;
  totalRounds: number;
  currentRound: RoundState;
  p1Score: number;
  p2Score: number;
  roundHistory: RoundResult[];
  matchSettings: MatchSettings | null; // جديد — إعدادات المباراة
  /** اللاعب المسموح له بكشف الكرت في المرحلة الحالية. */
  currentTurnPlayerId: string | null;
}

// ─── Element Advantage ────────────────────────────────────────────────────────────
const ELEMENT_BEATS: Record<string, string> = {
  fire: 'ice',
  ice: 'water',
  water: 'fire',
  earth: 'lightning',
  lightning: 'wind',
  wind: 'earth',
};

function getElementAdvantage(e1: string, e2: string): 'player1' | 'player2' | 'none' {
  if (ELEMENT_BEATS[e1] === e2) return 'player1';
  if (ELEMENT_BEATS[e2] === e1) return 'player2';
  return 'none';
}

function resolveCards(roundIndex: number, p1Card: any, p2Card: any, p1Score: number, p2Score: number): RoundResult {
  const elAdv = getElementAdvantage(p1Card.element ?? '', p2Card.element ?? '');
  let p1Atk = (p1Card.attack ?? 0) + (elAdv === 'player1' ? 2 : 0);
  let p2Atk = (p2Card.attack ?? 0) + (elAdv === 'player2' ? 2 : 0);
  const p1Net = p1Atk - (p2Card.defense ?? 0);
  const p2Net = p2Atk - (p1Card.defense ?? 0);

  let winner: 'player1' | 'player2' | 'draw';
  let advantage: 'element' | 'attack' | 'draw' = 'draw';

  if (elAdv !== 'none') { winner = elAdv; advantage = 'element'; }
  else if (p1Net > p2Net) { winner = 'player1'; advantage = 'attack'; }
  else if (p2Net > p1Net) { winner = 'player2'; advantage = 'attack'; }
  else { winner = 'draw'; advantage = 'draw'; }

  return {
    roundIndex,
    p1Card,
    p2Card,
    winner,
    p1Score: Math.max(0, p1Score - (winner === 'player2' ? 1 : 0)),
    p2Score: Math.max(0, p2Score - (winner === 'player1' ? 1 : 0)),
    advantage,
  };
}

// ─── Room Manager ───────────────────────────────────────────────────────────────
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerToRoom: Map<string, string> = new Map();

  private generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    do {
      roomId = '';
      for (let i = 0; i < 6; i++) roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    } while (this.rooms.has(roomId));
    return roomId;
  }

  createRoom(player: Player, requestedInviteCode?: string): Room | null {
    const roomId = requestedInviteCode
      ? normalizeInviteCode(requestedInviteCode)
      : this.generateRoomId();

    if (!isValidInviteCode(roomId) || this.rooms.has(roomId)) return null;
    const now = new Date();
    const room: Room = {
      id: roomId,
      player1: player,
      player2: null,
      status: 'waiting',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
      totalRounds: 0,
      currentRound: { roundIndex: 0, p1Card: null, p2Card: null, resolved: false },
      p1Score: 3,
      p2Score: 3,
      roundHistory: [],
      matchSettings: null,
      currentTurnPlayerId: null,
    };
    this.rooms.set(roomId, room);
    this.playerToRoom.set(player.id, roomId);
    return room;
  }

  joinRoom(roomId: string, player: Player): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting' || room.player2) return null;
    room.player2 = player;
    room.status = 'playing';
    // يبدأ الدور بالمضيف، ثم يتناوب بعد كل جولة.
    room.currentTurnPlayerId = room.player1?.id ?? player.id;
    this.playerToRoom.set(player.id, roomId);
    return room;
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  getPlayerRoom(playerId: string): Room | null {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  // ── جديد: حفظ إعدادات المباراة في الغرفة ────────────────────────────────
  setMatchSettings(roomId: string, settings: MatchSettings): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.matchSettings = settings;
    room.totalRounds = settings.rounds;
    return room;
  }

  setPlayerReady(playerId: string, isReady: boolean): Room | null {
    const room = this.getPlayerRoom(playerId);
    if (!room) return null;
    if (room.player1?.id === playerId) room.player1.isReady = isReady;
    else if (room.player2?.id === playerId) room.player2.isReady = isReady;
    return room;
  }

  setPlayerCards(playerId: string, cards: any[], rounds: number): Room | null {
    const room = this.getPlayerRoom(playerId);
    if (!room) return null;
    if (room.player1?.id === playerId) {
      room.player1.cards = cards;
      room.player1.rounds = rounds;
      if (!room.totalRounds) room.totalRounds = rounds;
    } else if (room.player2?.id === playerId) {
      room.player2.cards = cards;
      room.player2.rounds = rounds;
      if (!room.totalRounds) room.totalRounds = rounds;
    }
    return room;
  }

  areBothPlayersReady(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.player1 || !room.player2) return false;
    return room.player1.isReady && room.player2.isReady;
  }

  revealCard(playerId: string, roundIndex: number, card: any): RoundResult | null {
    const room = this.getPlayerRoom(playerId);
    if (!room || !room.player1 || !room.player2) return null;
    if (room.status !== 'playing' || room.currentTurnPlayerId !== playerId) return null;
    if (room.currentRound.roundIndex !== roundIndex) return null;
    const isP1 = room.player1.id === playerId;
    const reveal: RevealedCard = { playerId, card, roundIndex };
    if (isP1) room.currentRound.p1Card = reveal;
    else room.currentRound.p2Card = reveal;
    if (room.currentRound.p1Card && room.currentRound.p2Card && !room.currentRound.resolved) {
      room.currentRound.resolved = true;
      const result = resolveCards(roundIndex, room.currentRound.p1Card.card, room.currentRound.p2Card.card, room.p1Score, room.p2Score);
      room.p1Score = result.p1Score;
      room.p2Score = result.p2Score;
      room.roundHistory.push(result);
      room.currentRound = { roundIndex: roundIndex + 1, p1Card: null, p2Card: null, resolved: false };
      // اللاعب الذي بدأ الجولة يتناوب في الجولة التالية.
      room.currentTurnPlayerId = room.player1.id === playerId ? room.player2.id : room.player1.id;
      return result;
    }
    // بعد كشف اللاعب الأول ينتقل الدور فوراً للاعب الآخر.
    room.currentTurnPlayerId = room.player1.id === playerId ? room.player2.id : room.player1.id;
    return null;
  }

  getCurrentTurnPlayerId(roomId: string): string | null {
    return this.rooms.get(roomId)?.currentTurnPlayerId ?? null;
  }

  isGameOver(room: Room): boolean {
    const roundsPlayed = room.roundHistory.length;
    const totalRounds = Math.max(room.totalRounds, room.player1?.rounds ?? 0, room.player2?.rounds ?? 0);
    return room.p1Score <= 0 || room.p2Score <= 0 || roundsPlayed >= totalRounds;
  }

  leaveRoom(playerId: string): Room | null {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.player1?.id === playerId) room.player1 = null;
    else if (room.player2?.id === playerId) room.player2 = null;
    this.playerToRoom.delete(playerId);
    if (!room.player1 && !room.player2) { this.rooms.delete(roomId); return null; }
    if (room.status === 'playing') room.status = 'waiting';
    return room;
  }

  finishRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.status = 'finished';
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      if (room.player1) this.playerToRoom.delete(room.player1.id);
      if (room.player2) this.playerToRoom.delete(room.player2.id);
      this.rooms.delete(roomId);
    }
  }

  cleanupExpiredRooms(): void {
    const now = new Date();
    for (const [roomId, room] of this.rooms.entries()) {
      if (now > room.expiresAt || room.status === 'finished') this.deleteRoom(roomId);
    }
  }

  getActiveRoomsCount(): number { return this.rooms.size; }
  getAllRooms(): Room[] { return Array.from(this.rooms.values()); }
}

export const roomManager = new RoomManager();

setInterval(() => roomManager.cleanupExpiredRooms(), 5 * 60 * 1000);
