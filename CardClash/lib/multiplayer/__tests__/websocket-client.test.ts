import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MultiplayerClient,
  resolveMultiplayerWebSocketUrl,
  type WebSocketLike,
} from '../websocket-client';

class MockWebSocket implements WebSocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  readonly sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.();
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(message: unknown): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  receiveRaw(data: string): void {
    this.onmessage?.({ data });
  }
}

function makeClient() {
  const sockets: MockWebSocket[] = [];
  const client = new MultiplayerClient({
    url: 'ws://test.local/multiplayer',
    webSocketFactory: () => {
      const socket = new MockWebSocket();
      sockets.push(socket);
      return socket;
    },
    reconnectBaseDelayMs: 10,
    maxReconnectDelayMs: 10,
    pingIntervalMs: 60_000,
  });
  return { client, sockets };
}

function sentMessages(socket: MockWebSocket) {
  return socket.sent.map((message) => JSON.parse(message));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('MultiplayerClient', () => {
  it('uses a configured server or derives a secure same-origin web socket URL', () => {
    expect(resolveMultiplayerWebSocketUrl('wss://rooms.example.com/multiplayer', { protocol: 'https:', host: 'game.example.com' }))
      .toBe('wss://rooms.example.com/multiplayer');
    expect(resolveMultiplayerWebSocketUrl(undefined, { protocol: 'https:', host: 'game.example.com' }))
      .toBe('wss://game.example.com/multiplayer');
    expect(resolveMultiplayerWebSocketUrl(undefined, { protocol: 'http:', host: 'localhost:8081' }))
      .toBe('ws://localhost:8081/multiplayer');
  });

  it('fails fast in production native builds when no server URL is configured', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() => resolveMultiplayerWebSocketUrl(undefined, null)).toThrow(/EXPO_PUBLIC_MP_SERVER_URL/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('opens a connection, sends room commands, and stores the room session', async () => {
    const { client, sockets } = makeClient();
    const connection = client.connect();
    sockets[0].open();
    await connection;

    expect(client.getStatus()).toBe('connected');
    expect(client.createRoom('player_1', 'Fahad')).toBe(true);
    expect(sentMessages(sockets[0])).toContainEqual({
      type: 'CREATE_ROOM',
      payload: { playerId: 'player_1', playerName: 'Fahad' },
    });

    sockets[0].receive({
      type: 'ROOM_CREATED',
      payload: { roomId: 'AB12CD', playerId: 'player_1' },
    });

    expect(client.getSession()).toEqual({ roomId: 'AB12CD', playerId: 'player_1' });
  });

  it('dispatches typed messages once and supports unsubscription', async () => {
    const { client, sockets } = makeClient();
    const connection = client.connect();
    sockets[0].open();
    await connection;

    const handler = vi.fn();
    const unsubscribe = client.on('ROUND_RESULT', handler);
    const result = { type: 'ROUND_RESULT', payload: { roundIndex: 0, winner: 'player1' } };

    sockets[0].receive(result);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(result);

    unsubscribe();
    sockets[0].receive(result);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports malformed server messages without invoking application handlers', async () => {
    const { client, sockets } = makeClient();
    const connection = client.connect();
    sockets[0].open();
    await connection;

    const messageHandler = vi.fn();
    const errorHandler = vi.fn();
    client.onAny(messageHandler);
    client.onError(errorHandler);

    sockets[0].receiveRaw('{not-json');

    expect(messageHandler).not.toHaveBeenCalled();
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ message: 'Received an invalid WebSocket message' }));
  });

  it('reconnects after an unexpected close and resumes the stored room', async () => {
    vi.useFakeTimers();
    const { client, sockets } = makeClient();
    const connection = client.connect();
    sockets[0].open();
    await connection;

    client.createRoom('player_1', 'Fahad');
    sockets[0].receive({ type: 'ROOM_CREATED', payload: { roomId: 'AB12CD', playerId: 'player_1' } });
    sockets[0].close();

    expect(client.getStatus()).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(10);
    expect(sockets).toHaveLength(2);

    sockets[1].open();
    expect(sentMessages(sockets[1])).toContainEqual({
      type: 'RECONNECT',
      payload: { roomId: 'AB12CD', playerId: 'player_1' },
    });
  });

  it('does not retry after an intentional disconnect and rejects commands while offline', async () => {
    vi.useFakeTimers();
    const { client, sockets } = makeClient();
    const connection = client.connect();
    sockets[0].open();
    await connection;

    client.disconnect();
    await vi.advanceTimersByTimeAsync(100);

    expect(sockets).toHaveLength(1);
    expect(client.getStatus()).toBe('disconnected');
    expect(client.setReady('player_1', true)).toBe(false);
  });
});
