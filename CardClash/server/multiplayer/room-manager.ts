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
  advantage: 'faction' | 'attack' | 'draw';
  p1FactionAdvantage: 'strong' | 'weak' | 'neutral';
  p2FactionAdvantage: 'strong' | 'weak' | 'neutral';
  /** يرسل الخادم هذه الإشارة للطرفين لتبديل بطاقة الجولة التالية في ترتيبهما المحلي. */
  nextRoundCardsSwapped?: boolean;
  nextRoundP1AttackBonus?: number;
  nextRoundP2AttackBonus?: number;
  /** كشف بولما خاص بصاحب البطاقة؛ لا يرسل للخصم داخل payload النتيجة. */
  p1PersonalInsight?: string;
  p2PersonalInsight?: string;
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

// ─── Faction Advantage ────────────────────────────────────────────────────────────
const FACTION_BEATS: Record<string, string> = {
  human: 'elf',
  elf: 'orc',
  orc: 'dragon',
  dragon: 'demon',
  demon: 'undead',
  undead: 'monster',
  monster: 'robot',
  robot: 'human',
};

function getFactionAdvantage(faction: string, opponentFaction: string): 'strong' | 'weak' | 'neutral' {
  if (FACTION_BEATS[faction] === opponentFaction) return 'strong';
  if (FACTION_BEATS[opponentFaction] === faction) return 'weak';
  return 'neutral';
}

function hasAllMightAppeared(deck: any[] | undefined, roundIndex: number): boolean {
  return Boolean(deck?.slice(0, roundIndex + 1).some(card => card?.id === 'all_might'));
}

function hasCardAppeared(deck: any[] | undefined, roundIndex: number, cardId: string): boolean {
  return Boolean(deck?.slice(0, roundIndex + 1).some(card => card?.id === cardId));
}

const KAIDO_AURA_RACES = new Set(['orc', 'dragon', 'demon', 'undead', 'monster']);
const CLASS_LABELS: Record<string, string> = { warrior: 'محارب', knight: 'فارس', mage: 'ساحر', archer: 'رامي', berserker: 'ضاري', paladin: 'بالادين', swordsman: 'سياف', fighter: 'مقاتل', guardian: 'حارس', healer: 'طبيب' };

function buildBulmaScan(opponentDeck: any[] | undefined, currentRound: number): string {
  const counts = (opponentDeck ?? []).slice(currentRound + 1).reduce<Record<string, number>>((result, card) => {
    const cardClass = card?.cardClass;
    if (typeof cardClass === 'string') result[cardClass] = (result[cardClass] ?? 0) + 1;
    return result;
  }, {});
  const summary = Object.entries(counts).map(([cardClass, count]) => `${CLASS_LABELS[cardClass] ?? cardClass}: ${count}`).join('، ');
  return `ماسح بولما — فئات الكروت القادمة للخصم: ${summary || 'لا توجد كروت قادمة'}`;
}

function resolveCards(
  roundIndex: number,
  rawP1Card: any,
  rawP2Card: any,
  p1Score: number,
  p2Score: number,
  p1Deck?: any[],
  p2Deck?: any[],
  previousRound?: RoundResult,
): RoundResult {
  const previousP1Card = previousRound?.p1Card;
  const previousP2Card = previousRound?.p2Card;
  // مرآة ياتا لا تنسخ شيئاً في الجولة الأولى، لغياب كرت الخصم السابق.
  const yataP1Card = rawP2Card?.id === 'itachi_uchiha' && previousP1Card
    ? { ...rawP1Card, defense: previousP1Card.defense }
    : rawP1Card;
  const yataP2Card = rawP1Card?.id === 'itachi_uchiha' && previousP2Card
    ? { ...rawP2Card, defense: previousP2Card.defense }
    : rawP2Card;
  const p1AllMightAura = hasAllMightAppeared(p1Deck, roundIndex);
  const p2AllMightAura = hasAllMightAppeared(p2Deck, roundIndex);
  const p1KaidoAura = hasCardAppeared(p1Deck, roundIndex, 'kaido');
  const p2KaidoAura = hasCardAppeared(p2Deck, roundIndex, 'kaido');
  const p1AlphonseAura = hasCardAppeared(p1Deck, roundIndex, 'alphonse_elric') && p1Score <= p2Score - 3;
  const p2AlphonseAura = hasCardAppeared(p2Deck, roundIndex, 'alphonse_elric') && p2Score <= p1Score - 3;
  const p1MakimaControl = yataP1Card?.id === 'makima' && ['monster', 'demon'].includes(yataP2Card?.race);
  const p2MakimaControl = yataP2Card?.id === 'makima' && ['monster', 'demon'].includes(yataP1Card?.race);
  const p1TogePenalty = previousRound?.winner === 'player1' && previousP1Card?.id === 'toge_inumaki' ? 2 : 0;
  const p2TogePenalty = previousRound?.winner === 'player2' && previousP2Card?.id === 'toge_inumaki' ? 2 : 0;
  const p1Card = {
    ...yataP1Card,
    attack: Math.max(0, (yataP1Card.attack ?? 0) + (p1MakimaControl ? 4 : 0) - (p2MakimaControl ? 4 : 0) - p2TogePenalty + (p1KaidoAura && KAIDO_AURA_RACES.has(yataP1Card.race) ? 2 : 0) + (p1AlphonseAura && getCardAlignment(yataP1Card) === 'good' ? 2 : 0) + (p1AllMightAura && getCardAlignment(yataP1Card) === 'good' ? 3 : 0)),
    defense: Math.max(0, (yataP1Card.defense ?? 0) + (p1KaidoAura && KAIDO_AURA_RACES.has(yataP1Card.race) ? 2 : 0) - (p2AllMightAura && getCardAlignment(yataP1Card) === 'evil' ? 3 : 0)),
  };
  const p2Card = {
    ...yataP2Card,
    attack: Math.max(0, (yataP2Card.attack ?? 0) + (p2MakimaControl ? 4 : 0) - (p1MakimaControl ? 4 : 0) - p1TogePenalty + (p2KaidoAura && KAIDO_AURA_RACES.has(yataP2Card.race) ? 2 : 0) + (p2AlphonseAura && getCardAlignment(yataP2Card) === 'good' ? 2 : 0) + (p2AllMightAura && getCardAlignment(yataP2Card) === 'good' ? 3 : 0)),
    defense: Math.max(0, (yataP2Card.defense ?? 0) + (p2KaidoAura && KAIDO_AURA_RACES.has(yataP2Card.race) ? 2 : 0) - (p1AllMightAura && getCardAlignment(yataP2Card) === 'evil' ? 3 : 0)),
  };
  const p1FactionAdvantage = getFactionAdvantage(p1Card.race ?? '', p2Card.race ?? '');
  const p2FactionAdvantage = getFactionAdvantage(p2Card.race ?? '', p1Card.race ?? '');
  const p1Multiplier = p1FactionAdvantage === 'strong' ? 1.25 : p1FactionAdvantage === 'weak' ? 0.75 : 1;
  const p2Multiplier = p2FactionAdvantage === 'strong' ? 1.25 : p2FactionAdvantage === 'weak' ? 0.75 : 1;
  const p1Raw = (p1Card.attack ?? 0) * p1Multiplier;
  const p2Raw = (p2Card.attack ?? 0) * p2Multiplier;
  const p1Net = Math.max(0, Math.floor(p1Raw - (p2Card.defense ?? 0)));
  const p2Net = Math.max(0, Math.floor(p2Raw - (p1Card.defense ?? 0)));

  let winner: 'player1' | 'player2' | 'draw';
  let advantage: 'faction' | 'attack' | 'draw' = 'draw';

  if (p1Net > p2Net) { winner = 'player1'; advantage = p1FactionAdvantage === 'strong' ? 'faction' : 'attack'; }
  else if (p2Net > p1Net) { winner = 'player2'; advantage = p2FactionAdvantage === 'strong' ? 'faction' : 'attack'; }
  else { winner = 'draw'; advantage = 'draw'; }

  return {
    roundIndex,
    p1Card,
    p2Card,
    winner,
    p1Score: Math.max(0, p1Score - (winner === 'player2' ? 1 : 0)),
    p2Score: Math.max(0, p2Score - (winner === 'player1' ? 1 : 0)),
    advantage,
    p1FactionAdvantage,
    p2FactionAdvantage,
    p1PersonalInsight: rawP1Card?.id === 'bulma' ? buildBulmaScan(p2Deck, roundIndex) : undefined,
    p2PersonalInsight: rawP2Card?.id === 'bulma' ? buildBulmaScan(p1Deck, roundIndex) : undefined,
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
    // تبقى الغرفة في الانتظار حتى يؤكد الطرفان ترتيبهما؛ لا يسمح بكشف الكروت قبل BATTLE_START.
    room.currentTurnPlayerId = null;
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

  /** يبدأ المباراة مرة واحدة فقط بعد اكتمال التشكيلتين والجاهزية على الخادم. */
  startMatch(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting' || !room.player1 || !room.player2) return null;
    if (!this.areBothPlayersReady(roomId)) return null;

    const totalRounds = Math.max(room.totalRounds, room.player1.rounds ?? 0, room.player2.rounds ?? 0);
    if (!totalRounds || room.player1.cards?.length !== totalRounds || room.player2.cards?.length !== totalRounds) return null;

    room.totalRounds = totalRounds;
    room.status = 'playing';
    room.currentRound = { roundIndex: 0, p1Card: null, p2Card: null, resolved: false };
    room.currentTurnPlayerId = room.player1.id;
    room.p1Score = totalRounds;
    room.p2Score = totalRounds;
    room.roundHistory = [];
    return room;
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
      const result = resolveCards(
        roundIndex,
        room.currentRound.p1Card.card,
        room.currentRound.p2Card.card,
        room.p1Score,
        room.p2Score,
        room.player1.cards,
        room.player2.cards,
        room.roundHistory.at(-1),
      );
      room.p1Score = result.p1Score;
      room.p2Score = result.p2Score;
      const nextRoundIndex = roundIndex + 1;
      const p1FirstLossWithChopper = room.currentRound.p1Card.card?.id === 'chopper'
        && result.winner === 'player2'
        && !room.roundHistory.some(item => item.winner === 'player2');
      const p2FirstLossWithChopper = room.currentRound.p2Card.card?.id === 'chopper'
        && result.winner === 'player1'
        && !room.roundHistory.some(item => item.winner === 'player1');
      if (nextRoundIndex < room.totalRounds && p1FirstLossWithChopper && room.player1.cards?.[nextRoundIndex]) {
        room.player1.cards[nextRoundIndex] = { ...room.player1.cards[nextRoundIndex], attack: (room.player1.cards[nextRoundIndex].attack ?? 0) + 1 };
        result.nextRoundP1AttackBonus = 1;
      }
      if (nextRoundIndex < room.totalRounds && p2FirstLossWithChopper && room.player2.cards?.[nextRoundIndex]) {
        room.player2.cards[nextRoundIndex] = { ...room.player2.cards[nextRoundIndex], attack: (room.player2.cards[nextRoundIndex].attack ?? 0) + 1 };
        result.nextRoundP2AttackBonus = 1;
      }
      room.roundHistory.push(result);
      const p1TriggersArtorias = room.currentRound.p1Card.card?.id === 'artorias'
        && (room.currentRound.p1Card.card.attack ?? 0) - (room.currentRound.p2Card.card.defense ?? 0) >= 4;
      const p2TriggersArtorias = room.currentRound.p2Card.card?.id === 'artorias'
        && (room.currentRound.p2Card.card.attack ?? 0) - (room.currentRound.p1Card.card.defense ?? 0) >= 4;
      if (nextRoundIndex < room.totalRounds && p1TriggersArtorias !== p2TriggersArtorias && room.player1.cards && room.player2.cards) {
        const nextP1Card = room.player1.cards[nextRoundIndex];
        room.player1.cards[nextRoundIndex] = room.player2.cards[nextRoundIndex];
        room.player2.cards[nextRoundIndex] = nextP1Card;
        result.nextRoundCardsSwapped = true;
      }
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
import { getCardAlignment } from '../../lib/game/card-alignment';
