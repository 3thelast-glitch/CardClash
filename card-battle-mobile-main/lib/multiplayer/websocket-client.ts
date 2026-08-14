import type { Card } from '@/lib/game/types';

export type MPMessageType =
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'PLAYER_JOINED'
  | 'OPPONENT_READY'
  | 'OPPONENT_CARDS_SET'
  | 'BATTLE_START'
  | 'ROUND_RESULT'
  | 'GAME_OVER'
  | 'OPPONENT_CARD_REVEALED'
  | 'OPPONENT_DISCONNECTED'
  | 'OPPONENT_RECONNECTED'
  | 'OPPONENT_LEFT_PERMANENTLY'
  | 'RECONNECTED'
  | 'PLAYER_LEFT'
  | 'ERROR'
  | 'PONG'
  | 'CREATE_ROOM'
  | 'JOIN_ROOM'
  | 'RECONNECT'
  | 'SET_CARDS'
  | 'PLAYER_READY'
  | 'REVEAL_CARD'
  | 'MATCH_SETTINGS'
  | 'ARRANGEMENT_READY'
  | 'LEAVE_ROOM'
  | 'MATCH_SETTINGS_RECEIVED'
  | 'OPPONENT_ARRANGEMENT_READY'
  | 'PING';

export interface MPMessage<TPayload = any> {
  type: MPMessageType;
  payload: TPayload;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface MatchSettings {
  rounds: number;
  withAbilities: boolean;
  rarityWeights: Record<string, number>;
}

export interface RoomSession {
  playerId: string;
  roomId: string;
}

export interface WebSocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;
export type MessageHandler = (message: MPMessage) => void;
export type StatusHandler = (status: ConnectionStatus) => void;
export type ClientErrorHandler = (error: Error) => void;

export interface MultiplayerClientOptions {
  url?: string;
  webSocketFactory?: WebSocketFactory;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectBaseDelayMs?: number;
  maxReconnectDelayMs?: number;
  pingIntervalMs?: number;
}

const OPEN = 1;
const DEFAULT_URL = process.env.EXPO_PUBLIC_MP_SERVER_URL ?? 'ws://localhost:3001/multiplayer';

/**
 * Client-side transport for the multiplayer protocol.
 *
 * The class owns the socket lifecycle and preserves the current room identity,
 * so a transient transport loss can resume the same room without duplicating
 * listeners or leaking ping/retry timers.
 */
export class MultiplayerClient {
  private readonly url: string;
  private readonly webSocketFactory: WebSocketFactory;
  private readonly autoReconnect: boolean;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly maxReconnectDelayMs: number;
  private readonly pingIntervalMs: number;

  private socket: WebSocketLike | null = null;
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;
  private status: ConnectionStatus = 'idle';
  private session: RoomSession | null = null;
  private pendingPlayerId: string | null = null;

  private readonly handlers = new Map<MPMessageType, Set<MessageHandler>>();
  private readonly globalHandlers = new Set<MessageHandler>();
  private readonly statusHandlers = new Set<StatusHandler>();
  private readonly errorHandlers = new Set<ClientErrorHandler>();

  constructor(options: MultiplayerClientOptions = {}) {
    this.url = options.url ?? DEFAULT_URL;
    this.webSocketFactory = options.webSocketFactory ?? defaultWebSocketFactory;
    this.autoReconnect = options.autoReconnect ?? true;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 1_000;
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 10_000;
    this.pingIntervalMs = options.pingIntervalMs ?? 20_000;
  }

  connect(): Promise<void> {
    if (this.isConnected()) return Promise.resolve();
    if (this.connectionPromise) return this.connectionPromise;

    this.intentionalClose = false;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        this.connectionPromise = null;
        callback();
      };

      try {
        const socket = this.webSocketFactory(this.url);
        this.socket = socket;

        socket.onopen = () => {
          if (this.socket !== socket) return;
          const shouldResumeRoom = this.status === 'reconnecting';
          this.reconnectAttempts = 0;
          this.startPing();
          this.setStatus('connected');
          settle(resolve);
          if (shouldResumeRoom) this.resumeRoomIfNeeded();
        };

        socket.onmessage = (event) => this.handleRawMessage(event.data);

        socket.onerror = () => {
          if (this.socket !== socket) return;
          const error = new Error('WebSocket connection failed');
          this.emitError(error);
          settle(() => reject(error));
        };

        socket.onclose = () => {
          if (this.socket !== socket) return;
          this.stopPing();
          this.socket = null;
          settle(() => reject(new Error('WebSocket connection closed')));

          if (this.intentionalClose) {
            this.setStatus('disconnected');
          } else {
            this.scheduleReconnect();
          }
        };
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error('Unable to create WebSocket');
        this.emitError(error);
        settle(() => reject(error));
        this.scheduleReconnect();
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.stopPing();

    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.connectionPromise = null;
    this.setStatus('disconnected');
  }

  dispose(): void {
    this.disconnect();
    this.handlers.clear();
    this.globalHandlers.clear();
    this.statusHandlers.clear();
    this.errorHandlers.clear();
    this.session = null;
  }

  isConnected(): boolean {
    return this.socket?.readyState === OPEN;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getSession(): RoomSession | null {
    return this.session ? { ...this.session } : null;
  }

  setSession(session: RoomSession | null): void {
    this.session = session ? { ...session } : null;
  }

  send(type: MPMessageType, payload: any): boolean {
    if (!this.isConnected() || !this.socket) {
      this.emitError(new Error(`Cannot send ${type}: WebSocket is not connected`));
      return false;
    }

    try {
      this.socket.send(JSON.stringify({ type, payload }));
      return true;
    } catch (cause) {
      this.emitError(cause instanceof Error ? cause : new Error(`Failed to send ${type}`));
      return false;
    }
  }

  createRoom(playerId: string, playerName: string): boolean {
    this.pendingPlayerId = playerId;
    return this.send('CREATE_ROOM', { playerId, playerName });
  }

  joinRoom(roomId: string, playerId: string, playerName: string): boolean {
    this.pendingPlayerId = playerId;
    return this.send('JOIN_ROOM', { roomId: roomId.trim().toUpperCase(), playerId, playerName });
  }

  reconnect(playerId: string, roomId: string): boolean {
    this.setSession({ playerId, roomId });
    return this.send('RECONNECT', { playerId, roomId });
  }

  leaveRoom(playerId: string): boolean {
    const sent = this.send('LEAVE_ROOM', { playerId });
    if (sent) this.session = null;
    return sent;
  }

  setCards(playerId: string, cards: Card[], rounds: number): boolean {
    return this.send('SET_CARDS', { playerId, cards, rounds });
  }

  setReady(playerId: string, isReady: boolean): boolean {
    return this.send('PLAYER_READY', { playerId, isReady });
  }

  setMatchSettings(playerId: string, settings: MatchSettings): boolean {
    return this.send('MATCH_SETTINGS', { playerId, ...settings });
  }

  setArrangementReady(playerId: string, cards: Card[]): boolean {
    return this.send('ARRANGEMENT_READY', { playerId, cards });
  }

  revealCard(playerId: string, roundIndex: number, card: Card): boolean {
    return this.send('REVEAL_CARD', { playerId, roundIndex, card });
  }

  ping(): boolean {
    return this.send('PING', { ts: Date.now() });
  }

  on(type: MPMessageType, handler: MessageHandler): () => void {
    const typeHandlers = this.handlers.get(type) ?? new Set<MessageHandler>();
    typeHandlers.add(handler);
    this.handlers.set(type, typeHandlers);
    return () => this.off(type, handler);
  }

  onAny(handler: MessageHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  onError(handler: ClientErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  off(type: MPMessageType, handler: MessageHandler): void {
    const typeHandlers = this.handlers.get(type);
    typeHandlers?.delete(handler);
    if (typeHandlers?.size === 0) this.handlers.delete(type);
  }

  private handleRawMessage(rawMessage: string): void {
    let message: MPMessage;
    try {
      const parsed = JSON.parse(rawMessage) as unknown;
      if (!isProtocolMessage(parsed)) throw new Error('Invalid WebSocket message shape');
      message = parsed;
    } catch {
      this.emitError(new Error('Received an invalid WebSocket message'));
      return;
    }

    this.trackSession(message);
    this.globalHandlers.forEach((handler) => safelyInvoke(() => handler(message)));
    this.handlers.get(message.type)?.forEach((handler) => safelyInvoke(() => handler(message)));
  }

  private trackSession(message: MPMessage): void {
    if (message.type === 'ROOM_CREATED') {
      const roomId = readString(message.payload, 'roomId');
      const playerId = readString(message.payload, 'playerId') ?? this.pendingPlayerId;
      if (roomId && playerId) this.session = { roomId, playerId };
    }

    if (message.type === 'ROOM_JOINED') {
      const roomId = readString(message.payload, 'roomId');
      if (roomId && this.pendingPlayerId) this.session = { roomId, playerId: this.pendingPlayerId };
    }

    if (message.type === 'GAME_OVER' || message.type === 'OPPONENT_LEFT_PERMANENTLY') {
      this.session = null;
    }
  }

  private resumeRoomIfNeeded(): void {
    if (!this.session) return;
    this.send('RECONNECT', this.session);
  }

  private scheduleReconnect(): void {
    if (!this.autoReconnect || this.intentionalClose || this.reconnectTimer || this.isConnected()) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('failed');
      return;
    }

    this.reconnectAttempts += 1;
    this.setStatus('reconnecting');
    const delay = Math.min(
      this.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1),
      this.maxReconnectDelayMs,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // The close callback schedules the following attempt when appropriate.
      });
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => this.ping(), this.pingIntervalMs);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusHandlers.forEach((handler) => safelyInvoke(() => handler(status)));
  }

  private emitError(error: Error): void {
    this.errorHandlers.forEach((handler) => safelyInvoke(() => handler(error)));
  }
}

function defaultWebSocketFactory(url: string): WebSocketLike {
  return new WebSocket(url) as unknown as WebSocketLike;
}

function isProtocolMessage(value: unknown): value is MPMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { type?: unknown; payload?: unknown };
  return typeof candidate.type === 'string' && Boolean(candidate.payload) && typeof candidate.payload === 'object';
}

function readString(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

function safelyInvoke(callback: () => void): void {
  try {
    callback();
  } catch {
    // A UI subscriber must not interrupt networking or other subscribers.
  }
}

export const mpClient = new MultiplayerClient();
