import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { roomManager, Player, Room, RoundResult } from './room-manager';
import { MatchmakingManager, normalizeRating, tierForRating } from './matchmaking-manager';

export interface GameMessage {
  type: string;
  payload: any;
}

export class MultiplayerWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private matchmaking = new MatchmakingManager();

  // تتبع من ضغط زر "ابدأ المعركة" لكل لاعب
  private arrangementReady: Map<string, Set<string>> = new Map(); // roomId → Set<playerId>

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: '/multiplayer' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      let playerId: string | null = null;

      ws.on('message', (data: Buffer) => {
        try {
          const message: GameMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message, (id) => { playerId = id; });
        } catch (error) {
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        if (playerId) {
          this.handlePlayerDisconnect(playerId);
          this.clients.delete(playerId);
        }
      });

      ws.on('error', (error: Error) => {
        console.error('[Multiplayer] WS error:', error.message);
      });

      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
        else clearInterval(pingInterval);
      }, 25000);
    });

    console.log('[Multiplayer] WebSocket server ready on /multiplayer');
  }

  // ─── Message Router ──────────────────────────────────────────────────────────────────────────────
  private handleMessage(ws: WebSocket, message: GameMessage, setPlayerId: (id: string) => void) {
    const { type, payload } = message;
    switch (type) {
      case 'CREATE_ROOM':        this.handleCreateRoom(ws, payload, setPlayerId); break;
      case 'JOIN_ROOM':          this.handleJoinRoom(ws, payload, setPlayerId); break;
      case 'RECONNECT':          this.handleReconnect(ws, payload, setPlayerId); break;
      case 'LEAVE_ROOM':         this.handleLeaveRoom(payload.playerId); break;
      case 'QUEUE_MATCHMAKING':  this.handleQueueMatchmaking(ws, payload, setPlayerId); break;
      case 'CANCEL_MATCHMAKING': this.handleCancelMatchmaking(ws, payload.playerId); break;
      case 'SET_CARDS':          this.handleSetCards(payload); break;
      case 'PLAYER_READY':       this.handlePlayerReady(payload); break;
      case 'REVEAL_CARD':        this.handleRevealCard(payload); break;
      // ── جديد ──
      case 'MATCH_SETTINGS':     this.handleMatchSettings(payload); break;
      case 'ARRANGEMENT_READY':  this.handleArrangementReady(payload); break;
      case 'PING':               this.send(ws, { type: 'PONG', payload: { ts: Date.now() } }); break;
      default: console.warn('[Multiplayer] Unknown message type:', type);
    }
  }

  // ─── Create Room ────────────────────────────────────────────────────────────────────────
  private handleCreateRoom(ws: WebSocket, payload: { playerId: string; playerName: string; inviteCode?: string }, setPlayerId: (id: string) => void) {
    const { playerId, playerName, inviteCode } = payload;
    if (!playerId || !playerName) {
      this.sendError(ws, 'playerId and playerName are required');
      return;
    }
    if (roomManager.getPlayerRoom(playerId)) {
      this.sendError(ws, 'Leave the current room before creating a new one');
      return;
    }
    const player: Player = { id: playerId, name: playerName, socketId: playerId, isReady: false };
    const room = roomManager.createRoom(player, inviteCode);
    if (!room) {
      this.sendError(ws, inviteCode ? 'Invite code is invalid or already in use' : 'Unable to create room');
      return;
    }
    this.clients.set(playerId, ws);
    setPlayerId(playerId);
    this.send(ws, { type: 'ROOM_CREATED', payload: { roomId: room.id, playerId } });
    console.log(`[Multiplayer] Room created: ${room.id} by ${playerName}`);
  }

  // ─── Join Room ──────────────────────────────────────────────────────────────────────────
  private handleJoinRoom(ws: WebSocket, payload: { roomId: string; playerId: string; playerName: string }, setPlayerId: (id: string) => void) {
    const { roomId, playerId, playerName } = payload;
    const player: Player = { id: playerId, name: playerName, socketId: playerId, isReady: false };
    const room = roomManager.joinRoom(roomId, player);
    if (!room) { this.sendError(ws, 'Room not found or full'); return; }
    this.clients.set(playerId, ws);
    setPlayerId(playerId);
    this.send(ws, { type: 'ROOM_JOINED', payload: { roomId: room.id, player1: room.player1, player2: room.player2 } });
    if (room.player1) {
      this.sendToPlayer(room.player1.id, { type: 'PLAYER_JOINED', payload: { roomId: room.id, player: room.player2 } });
    }
    console.log(`[Multiplayer] ${playerName} joined room: ${roomId}`);
  }

  // ─── Ranked Matchmaking ─────────────────────────────────────────────────────────────────
  private handleQueueMatchmaking(
    ws: WebSocket,
    payload: { playerId: string; playerName: string; rating?: number },
    setPlayerId: (id: string) => void,
  ) {
    const { playerId, playerName } = payload;
    if (!playerId || !playerName) {
      this.sendError(ws, 'playerId and playerName are required');
      return;
    }
    if (roomManager.getPlayerRoom(playerId)) {
      this.sendError(ws, 'Leave the current room before joining matchmaking');
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

    this.clients.set(playerId, ws);
    setPlayerId(playerId);
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
    if (!room) {
      this.sendError(ws, 'Unable to create ranked room');
      return;
    }
    roomManager.joinRoom(room.id, match.guest);
    const matchPayload = {
      roomId: room.id,
      ranked: true,
      ratingDifference: match.ratingDifference,
      player1: room.player1,
      player2: room.player2,
    };
    this.sendToPlayer(match.host.id, { type: 'MATCH_FOUND', payload: matchPayload });
    this.sendToPlayer(match.guest.id, { type: 'MATCH_FOUND', payload: matchPayload });
    console.log(`[Multiplayer] Ranked match found: ${room.id} (${match.ratingDifference} rating gap)`);
  }

  private handleCancelMatchmaking(ws: WebSocket, playerId: string) {
    const removed = this.matchmaking.cancel(playerId);
    this.send(ws, { type: 'MATCHMAKING_CANCELLED', payload: { playerId, removed } });
  }

  // ─── Reconnect ──────────────────────────────────────────────────────────────────────────
  private handleReconnect(ws: WebSocket, payload: { playerId: string; roomId: string }, setPlayerId: (id: string) => void) {
    const { playerId, roomId } = payload;
    const room = roomManager.getRoom(roomId);
    if (!room) { this.sendError(ws, 'Room expired or not found'); return; }
    const timer = this.reconnectTimers.get(playerId);
    if (timer) { clearTimeout(timer); this.reconnectTimers.delete(playerId); }
    this.clients.set(playerId, ws);
    setPlayerId(playerId);
    const otherPlayer = room.player1?.id === playerId ? room.player2 : room.player1;
    this.send(ws, {
      type: 'RECONNECTED',
      payload: {
        room: {
          id: room.id,
          p1Score: room.p1Score,
          p2Score: room.p2Score,
          currentRoundIndex: room.roundHistory.length,
          totalRounds: room.totalRounds,
          status: room.status,
        },
        opponent: otherPlayer,
      },
    });
    if (otherPlayer) this.sendToPlayer(otherPlayer.id, { type: 'OPPONENT_RECONNECTED', payload: { playerId } });
  }

  // ─── Leave Room ────────────────────────────────────────────────────────────────────────
  private handleLeaveRoom(playerId: string) {
    this.matchmaking.cancel(playerId);
    const room = roomManager.leaveRoom(playerId);
    if (room) {
      const other = room.player1 || room.player2;
      if (other) this.sendToPlayer(other.id, { type: 'PLAYER_LEFT', payload: { playerId } });
    }
    this.clients.delete(playerId);
  }

  // ─── Set Cards ─────────────────────────────────────────────────────────────────────────
  private handleSetCards(payload: { playerId: string; cards: any[]; rounds: number }) {
    const { playerId, cards, rounds } = payload;
    const room = roomManager.setPlayerCards(playerId, cards, rounds);
    if (!room) return;
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_CARDS_SET', payload: { rounds } });
  }

  // ─── Player Ready ────────────────────────────────────────────────────────────────────────
  private handlePlayerReady(payload: { playerId: string; isReady: boolean }) {
    const { playerId, isReady } = payload;
    const room = roomManager.setPlayerReady(playerId, isReady);
    if (!room) return;
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_READY', payload: { isReady } });
    if (roomManager.areBothPlayersReady(room.id)) this.startBattle(room);
  }

  private startBattle(room: Room) {
    if (!room.player1 || !room.player2) return;
    const payload = {
      player1: { id: room.player1.id, name: room.player1.name, cards: room.player1.cards },
      player2: { id: room.player2.id, name: room.player2.name, cards: room.player2.cards },
      totalRounds: room.totalRounds || (room.player1.rounds ?? 5),
      p1Score: room.p1Score,
      p2Score: room.p2Score,
    };
    this.broadcastToRoom(room.id, { type: 'BATTLE_START', payload });
    console.log(`[Multiplayer] Battle started in room ${room.id}`);
  }

  // ─── جديد: Match Settings ────────────────────────────────────────────────────────────────
  // يرسلها صاحب الجلسة بعد ضبط الإعدادات — يستقبلها الضيف تلقائياً
  private handleMatchSettings(payload: {
    playerId: string;
    rounds: number;
    withAbilities: boolean;
    rarityWeights: Record<string, number>;
  }) {
    const { playerId, rounds, withAbilities, rarityWeights } = payload;
    const room = roomManager.getPlayerRoom(playerId);
    if (!room) return;

    // حفظ الإعدادات في الغرفة
    roomManager.setMatchSettings(room.id, { rounds, withAbilities, rarityWeights });

    // أرسل للضيف فقط
    const guest = room.player1?.id === playerId ? room.player2 : room.player1;
    if (guest) {
      this.sendToPlayer(guest.id, {
        type: 'MATCH_SETTINGS_RECEIVED',
        payload: { rounds, withAbilities, rarityWeights },
      });
    }
    console.log(`[Multiplayer] Match settings set in room ${room.id}: ${rounds} rounds`);
  }

  // ─── جديد: Arrangement Ready ────────────────────────────────────────────────────────────
  // لاعب ضغط "ابدأ المعركة" بعد ترتيب كروته — إذا ضغط الاثنين تبدأ المعركة
  private handleArrangementReady(payload: { playerId: string; cards: any[] }) {
    const { playerId, cards } = payload;
    const room = roomManager.getPlayerRoom(playerId);
    if (!room) return;

    // حفظ كروت هذا اللاعب
    roomManager.setPlayerCards(playerId, cards, room.totalRounds || cards.length);
    roomManager.setPlayerReady(playerId, true);

    // تتبع من ضغط
    if (!this.arrangementReady.has(room.id)) {
      this.arrangementReady.set(room.id, new Set());
    }
    this.arrangementReady.get(room.id)!.add(playerId);

    const readySet = this.arrangementReady.get(room.id)!;
    const totalPlayers = [room.player1, room.player2].filter(Boolean).length;

    // أخبر الخصم
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) {
      this.sendToPlayer(other.id, {
        type: 'OPPONENT_ARRANGEMENT_READY',
        payload: { readyCount: readySet.size, totalPlayers },
      });
    }

    console.log(`[Multiplayer] Room ${room.id}: ${readySet.size}/${totalPlayers} ready`);

    // إذا الاثنين جاهزين → ابدأ المعركة
    if (readySet.size >= totalPlayers) {
      this.arrangementReady.delete(room.id);
      this.startBattle(room);
    }
  }

  // ─── Reveal Card ──────────────────────────────────────────────────────────────────────────
  private handleRevealCard(payload: { playerId: string; roundIndex: number; card: any }) {
    const { playerId, roundIndex, card } = payload;
    const room = roomManager.getPlayerRoom(playerId);
    if (!room) return;
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_CARD_REVEALED', payload: { roundIndex } });
    const result = roomManager.revealCard(playerId, roundIndex, card);
    if (result) {
      this.broadcastToRoom(room.id, { type: 'ROUND_RESULT', payload: result });
      if (roomManager.isGameOver(room)) {
        const gameOverPayload = {
          winner: result.p1Score > result.p2Score ? 'player1' : result.p2Score > result.p1Score ? 'player2' : 'draw',
          p1Score: result.p1Score,
          p2Score: result.p2Score,
          roundHistory: room.roundHistory,
        };
        this.broadcastToRoom(room.id, { type: 'GAME_OVER', payload: gameOverPayload });
        roomManager.finishRoom(room.id);
        setTimeout(() => roomManager.deleteRoom(room.id), 60000);
        console.log(`[Multiplayer] Game over in room ${room.id}: ${gameOverPayload.winner}`);
      }
    }
  }

  // ─── Disconnect ──────────────────────────────────────────────────────────────────────────
  private handlePlayerDisconnect(playerId: string) {
    this.matchmaking.cancel(playerId);
    const room = roomManager.getPlayerRoom(playerId);
    if (!room) return;
    const other = room.player1?.id === playerId ? room.player2 : room.player1;
    if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_DISCONNECTED', payload: { playerId, grace: 30 } });
    const timer = setTimeout(() => {
      const currentRoom = roomManager.getRoom(room.id);
      if (currentRoom && !this.clients.has(playerId)) {
        if (other) this.sendToPlayer(other.id, { type: 'OPPONENT_LEFT_PERMANENTLY', payload: { playerId } });
        roomManager.deleteRoom(room.id);
      }
      this.reconnectTimers.delete(playerId);
    }, 30000);
    this.reconnectTimers.set(playerId, timer);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────────────────
  private send(ws: WebSocket, message: GameMessage) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  private sendToPlayer(playerId: string, message: GameMessage) {
    const ws = this.clients.get(playerId);
    if (ws) this.send(ws, message);
  }

  private sendError(ws: WebSocket, error: string) {
    this.send(ws, { type: 'ERROR', payload: { error } });
  }

  private broadcastToRoom(roomId: string, message: GameMessage) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    if (room.player1) this.sendToPlayer(room.player1.id, message);
    if (room.player2) this.sendToPlayer(room.player2.id, message);
  }
}
