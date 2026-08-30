import { randomBytes, timingSafeEqual } from 'crypto';
import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { roomManager, type Player, type Room } from './room-manager';
import { MatchmakingManager, normalizeRating, tierForRating } from './matchmaking-manager';

const MAX_PAYLOAD_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MESSAGES = 40;
const MAX_PROTOCOL_VIOLATIONS = 3;

const playerIdSchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/);
const playerNameSchema = z.string().trim().min(1).max(20);
const roomIdSchema = z.string().trim().min(4).max(8).regex(/^[A-Za-z0-9]+$/);
const reconnectTokenSchema = z.string().min(32).max(128).regex(/^[A-Za-z0-9_-]+$/);
const cardIdSchema = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_.:-]+$/);
const cardIdsSchema = z.array(cardIdSchema).min(1).max(20).refine(
  (cardIds) => new Set(cardIds).size === cardIds.length,
  'Deck cannot contain duplicate card IDs',
);
const roundCountSchema = z.number().int().min(1).max(20);
const optionalBoundPlayerId = { playerId: playerIdSchema.optional() };
const rarityWeightsSchema = z.object({
  common: z.number().int().min(0).max(100),
  rare: z.number().int().min(0).max(100),
  epic: z.number().int().min(0).max(100),
  legendary: z.number().int().min(0).max(100),
  special: z.number().int().min(0).max(100),
}).strict().refine((weights) => Object.values(weights).reduce((sum, value) => sum + value, 0) === 100, {
  message: 'Rarity weights must total 100',
});

const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('CREATE_ROOM'),
    payload: z.object({ playerId: playerIdSchema, playerName: playerNameSchema, inviteCode: z.string().trim().max(16).optional() }).strict(),
  }).strict(),
  z.object({
    type: z.literal('JOIN_ROOM'),
    payload: z.object({ roomId: roomIdSchema, playerId: playerIdSchema, playerName: playerNameSchema }).strict(),
  }).strict(),
  z.object({
    type: z.literal('QUEUE_MATCHMAKING'),
    payload: z.object({ playerId: playerIdSchema, playerName: playerNameSchema, rating: z.number().int().min(0).max(5_000).optional() }).strict(),
  }).strict(),
  z.object({
    type: z.literal('RECONNECT'),
    payload: z.object({ playerId: playerIdSchema, roomId: roomIdSchema, reconnectToken: reconnectTokenSchema }).strict(),
  }).strict(),
  z.object({ type: z.literal('LEAVE_ROOM'), payload: z.object(optionalBoundPlayerId).strict() }).strict(),
  z.object({ type: z.literal('CANCEL_MATCHMAKING'), payload: z.object(optionalBoundPlayerId).strict() }).strict(),
  z.object({
    type: z.literal('SET_CARDS'),
    payload: z.object({ ...optionalBoundPlayerId, cardIds: cardIdsSchema, rounds: roundCountSchema }).strict(),
  }).strict(),
  z.object({
    type: z.literal('PLAYER_READY'),
    payload: z.object({ ...optionalBoundPlayerId, isReady: z.boolean() }).strict(),
  }).strict(),
  z.object({
    type: z.literal('MATCH_SETTINGS'),
    payload: z.object({
      ...optionalBoundPlayerId,
      rounds: roundCountSchema,
      withAbilities: z.boolean(),
      rarityWeights: rarityWeightsSchema,
    }).strict(),
  }).strict(),
  z.object({
    type: z.literal('ARRANGEMENT_READY'),
    payload: z.object({ ...optionalBoundPlayerId, cardIds: cardIdsSchema }).strict(),
  }).strict(),
  z.object({
    type: z.literal('REVEAL_CARD'),
    payload: z.object({ ...optionalBoundPlayerId, roundIndex: z.number().int().min(0).max(19), cardId: cardIdSchema }).strict(),
  }).strict(),
  z.object({
    type: z.literal('PING'),
    payload: z.object({ ts: z.number().finite().optional() }).strict(),
  }).strict(),
]);

type ClientMessage = z.infer<typeof clientMessageSchema>;

export interface GameMessage {
  type: string;
  payload: Record<string, unknown>;
}

type ConnectionState = {
  playerId: string | null;
  recentMessages: number[];
  protocolViolations: number;
  pingInterval: ReturnType<typeof setInterval> | null;
};

type PublicPlayer = Pick<Player, 'id' | 'name' | 'isReady' | 'rating' | 'tier'>;

export class MultiplayerWebSocketServer {
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<string, WebSocket>();
  private readonly reconnectTokens = new Map<string, string>();
  private readonly reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly matchmaking = new MatchmakingManager();
  private readonly arrangementReady = new Map<string, Set<string>>();
  private shuttingDown = false;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/multiplayer',
      maxPayload: MAX_PAYLOAD_BYTES,
      perMessageDeflate: false,
    });
    this.setupWebSocketServer();
  }

  close(): Promise<void> {
    this.shuttingDown = true;
    for (const timer of this.reconnectTimers.values()) clearTimeout(timer);
    this.reconnectTimers.clear();
    for (const client of this.wss.clients) client.close(1001, 'Server shutting down');
    return new Promise((resolve) => this.wss.close(() => resolve()));
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const state: ConnectionState = {
        playerId: null,
        recentMessages: [],
        protocolViolations: 0,
        pingInterval: null,
      };

      ws.on('message', (data, isBinary) => {
        if (!this.consumeRateLimit(ws, state)) return;
        if (isBinary) {
          this.recordProtocolViolation(ws, state, 'Binary messages are not supported');
          return;
        }

        let rawMessage: unknown;
        try {
          rawMessage = JSON.parse(data.toString());
        } catch {
          this.recordProtocolViolation(ws, state, 'Invalid JSON message');
          return;
        }

        const parsed = clientMessageSchema.safeParse(rawMessage);
        if (!parsed.success) {
          this.recordProtocolViolation(ws, state, 'Invalid message payload');
          return;
        }

        this.handleMessage(ws, state, parsed.data);
      });

      ws.on('close', () => {
        if (state.pingInterval) clearInterval(state.pingInterval);
        const playerId = state.playerId;
        if (!this.shuttingDown && playerId && this.clients.get(playerId) === ws) {
          this.clients.delete(playerId);
          this.handlePlayerDisconnect(playerId);
        }
      });

      ws.on('error', (error: Error) => {
        console.error('[Multiplayer] WS error:', error.message);
      });

      state.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
        else if (state.pingInterval) clearInterval(state.pingInterval);
      }, 25_000);
    });

    console.log('[Multiplayer] WebSocket server ready on /multiplayer');
  }

  private handleMessage(ws: WebSocket, state: ConnectionState, message: ClientMessage): void {
    switch (message.type) {
      case 'CREATE_ROOM':
        this.handleCreateRoom(ws, state, message.payload);
        break;
      case 'JOIN_ROOM':
        this.handleJoinRoom(ws, state, message.payload);
        break;
      case 'QUEUE_MATCHMAKING':
        this.handleQueueMatchmaking(ws, state, message.payload);
        break;
      case 'RECONNECT':
        this.handleReconnect(ws, state, message.payload);
        break;
      case 'LEAVE_ROOM': {
        const playerId = this.requireBoundPlayer(ws, state, message.payload.playerId);
        if (playerId) this.handleLeaveRoom(ws, playerId);
        break;
      }
      case 'CANCEL_MATCHMAKING': {
        const playerId = this.requireBoundPlayer(ws, state, message.payload.playerId);
        if (playerId) this.handleCancelMatchmaking(ws, playerId);
        break;
      }
      case 'SET_CARDS': {
        const playerId = this.requireBoundPlayer(ws, state, message.payload.playerId);
        if (playerId) this.handleSetCards(ws, playerId, message.payload.cardIds, message.payload.rounds);
        break;
      }
      case 'PLAYER_READY': {
        const playerId = this.requireBoundPlayer(ws, state, message.payload.playerId);
        if (playerId) this.handlePlayerReady(ws, playerId, message.payload.isReady);
        break;
      }
      case 'MATCH_SETTINGS': {
        const playerId = this.requireBoundPlayer(ws, state, message.payload.playerId);
        if (playerId) this.handleMatchSettings(ws, playerId, message.payload);
        break;
      }
      case 'ARRANGEMENT_READY': {
        const playerId = this.requireBoundPlayer(ws, state, message.payload.playerId);
        if (playerId) this.handleArrangementReady(ws, playerId, message.payload.cardIds);
        break;
      }
      case 'REVEAL_CARD': {
        const playerId = this.requireBoundPlayer(ws, state, message.payload.playerId);
        if (playerId) this.handleRevealCard(ws, playerId, message.payload.roundIndex, message.payload.cardId);
        break;
      }
      case 'PING':
        this.send(ws, { type: 'PONG', payload: { ts: Date.now() } });
        break;
    }
  }

  private handleCreateRoom(
    ws: WebSocket,
    state: ConnectionState,
    payload: Extract<ClientMessage, { type: 'CREATE_ROOM' }>['payload'],
  ): void {
    const { playerId, playerName, inviteCode } = payload;
    if (!this.canBindPlayer(ws, state, playerId)) return;
    if (roomManager.getPlayerRoom(playerId)) {
      this.sendError(ws, 'Leave the current room before creating a new one', 'ROOM_CONFLICT');
      return;
    }

    const player: Player = { id: playerId, name: playerName, socketId: playerId, isReady: false };
    const room = roomManager.createRoom(player, inviteCode);
    if (!room) {
      this.sendError(ws, inviteCode ? 'Invite code is invalid or already in use' : 'Unable to create room', 'ROOM_CREATE_FAILED');
      return;
    }

    this.bindPlayer(ws, state, playerId);
    const reconnectToken = this.issueReconnectToken(playerId);
    this.send(ws, { type: 'ROOM_CREATED', payload: { roomId: room.id, playerId, reconnectToken } });
    console.log(`[Multiplayer] Room created: ${room.id} by ${playerName}`);
  }

  private handleJoinRoom(
    ws: WebSocket,
    state: ConnectionState,
    payload: Extract<ClientMessage, { type: 'JOIN_ROOM' }>['payload'],
  ): void {
    const { playerId, playerName } = payload;
    const roomId = payload.roomId.toUpperCase();
    if (!this.canBindPlayer(ws, state, playerId)) return;
    if (roomManager.getPlayerRoom(playerId)) {
      this.sendError(ws, 'Leave the current room before joining another one', 'ROOM_CONFLICT');
      return;
    }

    const player: Player = { id: playerId, name: playerName, socketId: playerId, isReady: false };
    const room = roomManager.joinRoom(roomId, player);
    if (!room) {
      this.sendError(ws, 'Room not found or full', 'ROOM_JOIN_FAILED');
      return;
    }

    this.bindPlayer(ws, state, playerId);
    const reconnectToken = this.issueReconnectToken(playerId);
    this.send(ws, {
      type: 'ROOM_JOINED',
      payload: {
        roomId: room.id,
        player1: this.publicPlayer(room.player1),
        player2: this.publicPlayer(room.player2),
        reconnectToken,
      },
    });
    if (room.player1) {
      this.sendToPlayer(room.player1.id, {
        type: 'PLAYER_JOINED',
        payload: { roomId: room.id, player: this.publicPlayer(room.player2) },
      });
    }
    console.log(`[Multiplayer] ${playerName} joined room: ${roomId}`);
  }

  private handleQueueMatchmaking(
    ws: WebSocket,
    state: ConnectionState,
    payload: Extract<ClientMessage, { type: 'QUEUE_MATCHMAKING' }>['payload'],
  ): void {
    const { playerId, playerName } = payload;
    if (!this.canBindPlayer(ws, state, playerId)) return;
    if (roomManager.getPlayerRoom(playerId)) {
      this.sendError(ws, 'Leave the current room before joining matchmaking', 'ROOM_CONFLICT');
      return;
    }

    const rating = normalizeRating(payload.rating);
    const player: Player & { rating: number; tier: string } = {
      id: playerId,
      name: playerName,
      socketId: playerId,
      isReady: false,
      rating,
      tier: tierForRating(rating),
    };

    this.bindPlayer(ws, state, playerId);
    this.getOrCreateReconnectToken(playerId);
    const match = this.matchmaking.enqueue(player);
    if (!match) {
      this.send(ws, {
        type: 'MATCHMAKING_QUEUED',
        payload: {
          rating,
          tier: player.tier,
          position: this.matchmaking.getQueuePosition(playerId),
          searchRange: this.matchmaking.getSearchRange(playerId),
        },
      });
      return;
    }

    const room = roomManager.createRoom(match.host);
    const joinedRoom = room && roomManager.joinRoom(room.id, match.guest);
    if (!room || !joinedRoom) {
      this.sendToPlayer(match.host.id, { type: 'ERROR', payload: { error: 'Unable to create ranked room', code: 'MATCH_CREATE_FAILED' } });
      this.sendToPlayer(match.guest.id, { type: 'ERROR', payload: { error: 'Unable to create ranked room', code: 'MATCH_CREATE_FAILED' } });
      return;
    }

    const sharedPayload = {
      roomId: room.id,
      ranked: true,
      ratingDifference: match.ratingDifference,
      player1: this.publicPlayer(room.player1),
      player2: this.publicPlayer(room.player2),
    };
    this.sendToPlayer(match.host.id, {
      type: 'MATCH_FOUND',
      payload: { ...sharedPayload, reconnectToken: this.getOrCreateReconnectToken(match.host.id) },
    });
    this.sendToPlayer(match.guest.id, {
      type: 'MATCH_FOUND',
      payload: { ...sharedPayload, reconnectToken: this.getOrCreateReconnectToken(match.guest.id) },
    });
    console.log(`[Multiplayer] Ranked match found: ${room.id} (${match.ratingDifference} rating gap)`);
  }

  private handleCancelMatchmaking(ws: WebSocket, playerId: string): void {
    const removed = this.matchmaking.cancel(playerId);
    this.send(ws, { type: 'MATCHMAKING_CANCELLED', payload: { removed } });
  }

  private handleReconnect(
    ws: WebSocket,
    state: ConnectionState,
    payload: Extract<ClientMessage, { type: 'RECONNECT' }>['payload'],
  ): void {
    const { playerId, reconnectToken } = payload;
    const roomId = payload.roomId.toUpperCase();
    const room = roomManager.getRoom(roomId);
    const player = room?.player1?.id === playerId ? room.player1 : room?.player2?.id === playerId ? room.player2 : null;
    if (!room || !player) {
      this.sendError(ws, 'Room expired or player is not a member', 'RECONNECT_ROOM_INVALID');
      return;
    }
    const expectedToken = this.reconnectTokens.get(playerId);
    if (!expectedToken || !this.tokensEqual(expectedToken, reconnectToken)) {
      this.recordProtocolViolation(ws, state, 'Reconnect credentials are invalid');
      return;
    }
    if (!this.canBindPlayer(ws, state, playerId)) return;

    const timer = this.reconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(playerId);
    }
    this.bindPlayer(ws, state, playerId);
    const nextReconnectToken = this.issueReconnectToken(playerId);
    const position = room.player1?.id === playerId ? 'player1' : 'player2';
    const otherPlayer = position === 'player1' ? room.player2 : room.player1;
    this.send(ws, {
      type: 'RECONNECTED',
      payload: {
        reconnectToken: nextReconnectToken,
        position,
        room: {
          id: room.id,
          p1Score: room.p1Score,
          p2Score: room.p2Score,
          currentRoundIndex: room.currentRound.roundIndex,
          totalRounds: room.totalRounds,
          status: room.status,
          turnPlayerId: room.currentTurnPlayerId,
        },
        you: { ...this.publicPlayer(player), cards: player.cards ?? [] },
        opponent: this.publicPlayer(otherPlayer),
      },
    });
    if (otherPlayer) {
      this.sendToPlayer(otherPlayer.id, { type: 'OPPONENT_RECONNECTED', payload: { playerId } });
    }
  }

  private handleLeaveRoom(ws: WebSocket, playerId: string): void {
    this.matchmaking.cancel(playerId);
    const previousRoom = roomManager.getPlayerRoom(playerId);
    const room = roomManager.leaveRoom(playerId);
    if (room) {
      const other = room.player1 || room.player2;
      if (other) this.sendToPlayer(other.id, { type: 'PLAYER_LEFT', payload: { playerId } });
    }
    if (previousRoom) this.arrangementReady.get(previousRoom.id)?.delete(playerId);
    if (this.clients.get(playerId) === ws) this.clients.delete(playerId);
    this.reconnectTokens.delete(playerId);
  }

  private handleSetCards(ws: WebSocket, playerId: string, cardIds: string[], rounds: number): void {
    const room = roomManager.setPlayerCards(playerId, cardIds, rounds);
    if (!room) {
      this.sendError(ws, 'Deck is invalid or does not match the configured round count', 'INVALID_DECK');
      return;
    }
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_CARDS_SET', payload: { rounds } });
  }

  private handlePlayerReady(ws: WebSocket, playerId: string, isReady: boolean): void {
    const room = roomManager.setPlayerReady(playerId, isReady);
    if (!room) {
      this.sendError(ws, 'Player is not in an active room', 'ROOM_NOT_FOUND');
      return;
    }
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_READY', payload: { isReady } });
    if (roomManager.areBothPlayersReady(room.id)) this.startBattle(room);
  }

  private startBattle(room: Room): void {
    const startedRoom = roomManager.startMatch(room.id);
    if (!startedRoom?.player1 || !startedRoom.player2) return;

    const shared = {
      totalRounds: startedRoom.totalRounds,
      p1Score: startedRoom.p1Score,
      p2Score: startedRoom.p2Score,
      turnPlayerId: startedRoom.currentTurnPlayerId,
    };
    this.sendToPlayer(startedRoom.player1.id, {
      type: 'BATTLE_START',
      payload: {
        ...shared,
        position: 'player1',
        you: { ...this.publicPlayer(startedRoom.player1), cards: startedRoom.player1.cards ?? [] },
        opponent: this.publicPlayer(startedRoom.player2),
      },
    });
    this.sendToPlayer(startedRoom.player2.id, {
      type: 'BATTLE_START',
      payload: {
        ...shared,
        position: 'player2',
        you: { ...this.publicPlayer(startedRoom.player2), cards: startedRoom.player2.cards ?? [] },
        opponent: this.publicPlayer(startedRoom.player1),
      },
    });
    console.log(`[Multiplayer] Battle started in room ${startedRoom.id}`);
  }

  private handleMatchSettings(
    ws: WebSocket,
    playerId: string,
    payload: Extract<ClientMessage, { type: 'MATCH_SETTINGS' }>['payload'],
  ): void {
    const room = roomManager.getPlayerRoom(playerId);
    if (!room) {
      this.sendError(ws, 'Player is not in an active room', 'ROOM_NOT_FOUND');
      return;
    }
    if (room.player1?.id !== playerId) {
      this.sendError(ws, 'Only the room host can change match settings', 'HOST_ONLY');
      return;
    }

    const settings = {
      rounds: payload.rounds,
      withAbilities: payload.withAbilities,
      rarityWeights: payload.rarityWeights,
    };
    if (!roomManager.setMatchSettings(room.id, settings)) {
      this.sendError(ws, 'Match settings are invalid', 'INVALID_SETTINGS');
      return;
    }

    if (room.player2) {
      this.sendToPlayer(room.player2.id, { type: 'MATCH_SETTINGS_RECEIVED', payload: settings });
    }
    console.log(`[Multiplayer] Match settings set in room ${room.id}: ${payload.rounds} rounds`);
  }

  private handleArrangementReady(ws: WebSocket, playerId: string, cardIds: string[]): void {
    const room = roomManager.getPlayerRoom(playerId);
    if (!room) {
      this.sendError(ws, 'Player is not in an active room', 'ROOM_NOT_FOUND');
      return;
    }
    const rounds = room.totalRounds || cardIds.length;
    if (!roomManager.setPlayerCards(playerId, cardIds, rounds) || !roomManager.setPlayerReady(playerId, true)) {
      this.sendError(ws, 'Deck contains unknown cards or does not match the configured rounds', 'INVALID_DECK');
      return;
    }

    const readySet = this.arrangementReady.get(room.id) ?? new Set<string>();
    readySet.add(playerId);
    this.arrangementReady.set(room.id, readySet);
    const totalPlayers = [room.player1, room.player2].filter(Boolean).length;
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) {
      this.sendToPlayer(other.id, {
        type: 'OPPONENT_ARRANGEMENT_READY',
        payload: { readyCount: readySet.size, totalPlayers },
      });
    }

    if (readySet.size >= totalPlayers && roomManager.areBothPlayersReady(room.id)) {
      this.arrangementReady.delete(room.id);
      this.startBattle(room);
    }
  }

  private handleRevealCard(ws: WebSocket, playerId: string, roundIndex: number, cardId: string): void {
    const room = roomManager.getPlayerRoom(playerId);
    if (!room) {
      this.sendError(ws, 'Player is not in an active room', 'ROOM_NOT_FOUND');
      return;
    }
    if (room.currentTurnPlayerId !== playerId) {
      this.sendError(ws, 'ليس دورك حالياً', 'OUT_OF_TURN');
      return;
    }
    if (room.currentRound.roundIndex !== roundIndex) {
      this.sendError(ws, 'رقم الجولة غير صحيح', 'INVALID_ROUND');
      return;
    }
    if (roomManager.getExpectedCardId(playerId, roundIndex) !== cardId) {
      this.sendError(ws, 'الكرت لا يطابق التشكيلة المحفوظة على الخادم', 'CARD_MISMATCH');
      return;
    }

    const turnBefore = room.currentTurnPlayerId;
    const result = roomManager.revealCard(playerId, roundIndex, cardId);
    const turnAfter = room.currentTurnPlayerId;
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_CARD_REVEALED', payload: { roundIndex } });
    if (turnAfter && turnAfter !== turnBefore) {
      this.broadcastToRoom(room.id, {
        type: 'TURN_CHANGED',
        payload: { turnPlayerId: turnAfter, roundIndex: room.currentRound.roundIndex },
      });
    }
    if (!result || !room.player1 || !room.player2) return;

    const { p1PersonalInsight, p2PersonalInsight, ...publicResult } = result;
    const nextRoundIndex = result.roundIndex + 1;
    this.sendToPlayer(room.player1.id, {
      type: 'ROUND_RESULT',
      payload: {
        ...publicResult,
        personalInsight: p1PersonalInsight,
        nextOwnCard: room.player1.cards?.[nextRoundIndex] ?? null,
      },
    });
    this.sendToPlayer(room.player2.id, {
      type: 'ROUND_RESULT',
      payload: {
        ...publicResult,
        personalInsight: p2PersonalInsight,
        nextOwnCard: room.player2.cards?.[nextRoundIndex] ?? null,
      },
    });

    if (roomManager.isGameOver(room)) {
      const gameOverPayload = {
        winner: result.p1Score > result.p2Score ? 'player1' : result.p2Score > result.p1Score ? 'player2' : 'draw',
        p1Score: result.p1Score,
        p2Score: result.p2Score,
        roundHistory: room.roundHistory.map(({ p1PersonalInsight: _p1Insight, p2PersonalInsight: _p2Insight, ...round }) => round),
      };
      this.broadcastToRoom(room.id, { type: 'GAME_OVER', payload: gameOverPayload });
      roomManager.finishRoom(room.id);
      const playerIds = [room.player1.id, room.player2.id];
      setTimeout(() => {
        roomManager.deleteRoom(room.id);
        playerIds.forEach((id) => this.reconnectTokens.delete(id));
      }, 60_000);
      console.log(`[Multiplayer] Game over in room ${room.id}: ${gameOverPayload.winner}`);
    }
  }

  private handlePlayerDisconnect(playerId: string): void {
    this.matchmaking.cancel(playerId);
    const room = roomManager.getPlayerRoom(playerId);
    if (!room) {
      this.reconnectTokens.delete(playerId);
      return;
    }
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) {
      this.sendToPlayer(other.id, { type: 'OPPONENT_DISCONNECTED', payload: { playerId, grace: 30 } });
    }
    const existingTimer = this.reconnectTimers.get(playerId);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      const currentRoom = roomManager.getRoom(room.id);
      if (currentRoom && !this.clients.has(playerId)) {
        if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_LEFT_PERMANENTLY', payload: { playerId } });
        const memberIds = [currentRoom.player1?.id, currentRoom.player2?.id].filter((id): id is string => Boolean(id));
        roomManager.deleteRoom(room.id);
        memberIds.forEach((id) => this.reconnectTokens.delete(id));
        this.arrangementReady.delete(room.id);
      }
      this.reconnectTimers.delete(playerId);
    }, 30_000);
    this.reconnectTimers.set(playerId, timer);
  }

  private canBindPlayer(ws: WebSocket, state: ConnectionState, playerId: string): boolean {
    if (state.playerId && state.playerId !== playerId) {
      this.sendError(ws, 'This connection is already bound to another player', 'IDENTITY_MISMATCH');
      return false;
    }
    const existing = this.clients.get(playerId);
    if (existing && existing !== ws && existing.readyState === WebSocket.OPEN) {
      this.sendError(ws, 'Player is already connected', 'PLAYER_ALREADY_CONNECTED');
      return false;
    }
    return true;
  }

  private bindPlayer(ws: WebSocket, state: ConnectionState, playerId: string): void {
    state.playerId = playerId;
    this.clients.set(playerId, ws);
  }

  private requireBoundPlayer(ws: WebSocket, state: ConnectionState, claimedPlayerId?: string): string | null {
    const playerId = state.playerId;
    if (!playerId || this.clients.get(playerId) !== ws) {
      this.sendError(ws, 'Authenticate this connection before sending room commands', 'UNAUTHENTICATED');
      return null;
    }
    if (claimedPlayerId && claimedPlayerId !== playerId) {
      this.recordProtocolViolation(ws, state, 'Player identity does not match this connection');
      return null;
    }
    return playerId;
  }

  private issueReconnectToken(playerId: string): string {
    const token = randomBytes(32).toString('base64url');
    this.reconnectTokens.set(playerId, token);
    return token;
  }

  private getOrCreateReconnectToken(playerId: string): string {
    return this.reconnectTokens.get(playerId) ?? this.issueReconnectToken(playerId);
  }

  private tokensEqual(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);
    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private consumeRateLimit(ws: WebSocket, state: ConnectionState): boolean {
    const now = Date.now();
    state.recentMessages = state.recentMessages.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
    if (state.recentMessages.length >= RATE_LIMIT_MESSAGES) {
      this.sendError(ws, 'Too many messages', 'RATE_LIMITED');
      ws.close(1008, 'Rate limit exceeded');
      return false;
    }
    state.recentMessages.push(now);
    return true;
  }

  private recordProtocolViolation(ws: WebSocket, state: ConnectionState, error: string): void {
    state.protocolViolations += 1;
    this.sendError(ws, error, 'INVALID_MESSAGE');
    if (state.protocolViolations >= MAX_PROTOCOL_VIOLATIONS) ws.close(1008, 'Protocol violation');
  }

  private publicPlayer(player: Player | null): PublicPlayer | null {
    if (!player) return null;
    return {
      id: player.id,
      name: player.name,
      isReady: player.isReady,
      rating: player.rating,
      tier: player.tier,
    };
  }

  private send(ws: WebSocket, message: GameMessage): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  private sendToPlayer(playerId: string, message: GameMessage): void {
    const ws = this.clients.get(playerId);
    if (ws) this.send(ws, message);
  }

  private sendError(ws: WebSocket, error: string, code = 'BAD_REQUEST'): void {
    this.send(ws, { type: 'ERROR', payload: { error, code } });
  }

  private broadcastToRoom(roomId: string, message: GameMessage): void {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    if (room.player1) this.sendToPlayer(room.player1.id, message);
    if (room.player2) this.sendToPlayer(room.player2.id, message);
  }
}
