/**
 * WebSocket Client — Multiplayer
 * يتصل بـ server/multiplayer/websocket-server.ts
 */

import { Card } from '@/lib/game/types';

export type MPMessageType =
  | 'ROOM_CREATED' | 'ROOM_JOINED' | 'PLAYER_JOINED'
  | 'OPPONENT_READY' | 'OPPONENT_CARDS_SET'
  | 'BATTLE_START' | 'ROUND_RESULT' | 'GAME_OVER'
  | 'OPPONENT_CARD_REVEALED'
  | 'OPPONENT_DISCONNECTED' | 'OPPONENT_RECONNECTED' | 'OPPONENT_LEFT_PERMANENTLY'
  | 'RECONNECTED' | 'PLAYER_LEFT'
  | 'ERROR' | 'PONG'
  | 'CREATE_ROOM' | 'JOIN_ROOM' | 'SET_CARDS' | 'PLAYER_READY' 
  | 'REVEAL_CARD' | 'MATCH_SETTINGS' | 'ARRANGEMENT_READY' | 'LEAVE_ROOM'
  | 'MATCH_SETTINGS_RECEIVED' | 'OPPONENT_ARRANGEMENT_READY';

export interface MPMessage {
  type: MPMessageType;
  payload: any;
}

type MessageHandler = (msg: MPMessage) => void;

const SERVER_URL = process.env.EXPO_PUBLIC_MP_SERVER_URL ?? 'ws://localhost:3001/multiplayer';

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private handlers: Map<MPMessageType, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 3;

  // ─── Connect ────────────────────────────────────────────────────────────────
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(SERVER_URL) as any;

        this.ws!.onopen = () => {
          this.reconnectAttempts = 0;
          this.startPing();
          resolve();
        };

        this.ws!.onmessage = (event: MessageEvent) => {
          try {
            const msg: MPMessage = JSON.parse(event.data);
            this.dispatch(msg);
          } catch { }
        };

        this.ws!.onerror = (err: Event) => {
          reject(new Error('WebSocket connection failed'));
        };

        this.ws!.onclose = () => {
          this.stopPing();
          this.dispatch({ type: 'OPPONENT_DISCONNECTED', payload: { grace: 0 } });
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect() {
    this.stopPing();
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
    this.globalHandlers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ─── Send ────────────────────────────────────────────────────────────────────
  send(type: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  // ─── Game Actions ────────────────────────────────────────────────────────────
  createRoom(playerId: string, playerName: string) {
    this.send('CREATE_ROOM', { playerId, playerName });
  }

  joinRoom(roomId: string, playerId: string, playerName: string) {
    this.send('JOIN_ROOM', { roomId, playerId, playerName });
  }

  setCards(playerId: string, cards: Card[], rounds: number) {
    this.send('SET_CARDS', { playerId, cards, rounds });
  }

  setReady(playerId: string, isReady: boolean) {
    this.send('PLAYER_READY', { playerId, isReady });
  }

  revealCard(playerId: string, roundIndex: number, card: Card) {
    this.send('REVEAL_CARD', { playerId, roundIndex, card });
  }

  leaveRoom(playerId: string) {
    this.send('LEAVE_ROOM', { playerId });
  }

  reconnect(playerId: string, roomId: string) {
    this.send('RECONNECT', { playerId, roomId });
  }

  // ─── Event Handling ──────────────────────────────────────────────────────────
  on(type: MPMessageType, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.off(type, handler);
  }

  onAny(handler: MessageHandler) {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  off(type: MPMessageType, handler: MessageHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  private dispatch(msg: MPMessage) {
    this.globalHandlers.forEach(h => h(msg));
    this.handlers.get(msg.type)?.forEach(h => h(msg));
  }

  // ─── Ping ────────────────────────────────────────────────────────────────────
  private startPing() {
    this.pingInterval = setInterval(() => {
      this.send('PING', { ts: Date.now() });
    }, 20000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const mpClient = new MultiplayerClient();
