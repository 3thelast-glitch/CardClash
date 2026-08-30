import type { Card } from '@/lib/game/types';

export type MPMessageType =
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'PLAYER_JOINED'
  | 'OPPONENT_READY'
  | 'OPPONENT_CARDS_SET'
  | 'BATTLE_START'
  | 'ROUND_RESULT'
  | 'TURN_CHANGED'
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
  | 'MATCHMAKING_QUEUED'
  | 'MATCHMAKING_CANCELLED'
  | 'MATCH_FOUND'
  | 'QUEUE_MATCHMAKING'
  | 'CANCEL_MATCHMAKING'
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
  reconnectToken: string;
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
type BrowserLocation = { protocol: string; host: string };

export class MultiplayerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultiplayerConfigurationError';
  }
}

/** يتيح لخادم الغرف المنشور مشاركة نطاق الويب نفسه، مع دعم عنوان WSS صريح عند فصل الاستضافة. */
export function resolveMultiplayerWebSocketUrl(
  configuredUrl = process.env.EXPO_PUBLIC_MP_SERVER_URL,
  browserLocation?: BrowserLocation | null,
): string {
  const configured = configuredUrl?.trim();
  if (configured) {
    if (!/^wss?:\/\//i.test(configured)) {
      throw new MultiplayerConfigurationError('EXPO_PUBLIC_MP_SERVER_URL must use ws:// or wss://.');
    }
    return configured;
  }
  const currentLocation = browserLocation ?? (typeof globalThis !== 'undefined' && 'location' in globalThis
    ? globalThis.location as unknown as BrowserLocation
    : null);
  if (currentLocation?.host) {
    const protocol = currentLocation.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${currentLocation.host}/multiplayer`;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new MultiplayerConfigurationError('EXPO_PUBLIC_MP_SERVER_URL must be set for production native multiplayer builds.');
  }
  return 'ws://localhost:3001/multiplayer';
}

/**
 * Client-side transport for the multiplayer protocol.
 *
 * The class owns the socket lifecycle and preserves the current room identity,
 * so a transient transport loss can resume the same room without duplicating
 * listeners or leaking ping/retry timers.
 */
export class MultiplayerClient {
  private readonly configuredUrl?: string;
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
    // Resolve the environment-backed default only when connect() is requested.
    // The singleton below is imported during app startup, so resolving here would
    // turn a missing multiplayer URL into a native release boot crash.
    this.configuredUrl = options.url?.trim() || undefined;
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
        const url = resolveMultiplayerWebSocketUrl(this.configuredUrl);
        const socket = this.webSocketFactory(url);
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
        if (error instanceof MultiplayerConfigurationError) this.setStatus('failed');
        else this.scheduleReconnect();
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

  queueRankedMatch(playerId: string, playerName: string, rating: number): boolean {
    this.pendingPlayerId = playerId;
    return this.send('QUEUE_MATCHMAKING', { playerId, playerName, rating });
  }

  cancelMatchmaking(): boolean {
    return this.send('CANCEL_MATCHMAKING', {});
  }

  joinRoom(roomId: string, playerId: string, playerName: string): boolean {
    this.pendingPlayerId = playerId;
    return this.send('JOIN_ROOM', { roomId: roomId.trim().toUpperCase(), playerId, playerName });
  }

  reconnect(session: RoomSession): boolean {
    this.setSession(session);
    return this.send('RECONNECT', session);
  }

  leaveRoom(): boolean {
    const sent = this.send('LEAVE_ROOM', {});
    if (sent) this.session = null;
    return sent;
  }

  setCards(cards: Card[], rounds: number): boolean {
    return this.send('SET_CARDS', { cardIds: cards.map((card) => card.id), rounds });
  }

  setReady(isReady: boolean): boolean {
    return this.send('PLAYER_READY', { isReady });
  }

  setMatchSettings(settings: MatchSettings): boolean {
    return this.send('MATCH_SETTINGS', settings);
  }

  setArrangementReady(cards: Card[]): boolean {
    return this.send('ARRANGEMENT_READY', { cardIds: cards.map((card) => card.id) });
  }

  revealCard(roundIndex: number, cardId: string): boolean {
    return this.send('REVEAL_CARD', { roundIndex, cardId });
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
      const reconnectToken = readString(message.payload, 'reconnectToken');
      if (roomId && playerId && reconnectToken) this.session = { roomId, playerId, reconnectToken };
    }

    if (message.type === 'ROOM_JOINED') {
      const roomId = readString(message.payload, 'roomId');
      const reconnectToken = readString(message.payload, 'reconnectToken');
      if (roomId && this.pendingPlayerId && reconnectToken) {
        this.session = { roomId, playerId: this.pendingPlayerId, reconnectToken };
      }
    }

    if (message.type === 'MATCH_FOUND') {
      const roomId = readString(message.payload, 'roomId');
      const reconnectToken = readString(message.payload, 'reconnectToken');
      if (roomId && this.pendingPlayerId && reconnectToken) {
        this.session = { roomId, playerId: this.pendingPlayerId, reconnectToken };
      }
    }

    if (message.type === 'RECONNECTED' && this.session) {
      const reconnectToken = readString(message.payload, 'reconnectToken');
      if (reconnectToken) this.session = { ...this.session, reconnectToken };
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
