import { createServer, type Server } from 'http';
import { once } from 'events';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { buildTrustedCardCatalog } from '../card-catalog';
import { roomManager } from '../room-manager';
import { MultiplayerWebSocketServer } from '../websocket-server';

type WireMessage = { type: string; payload: Record<string, any> };

describe('Multiplayer WebSocket security boundary', () => {
  let httpServer: Server;
  let multiplayerServer: MultiplayerWebSocketServer;
  let url: string;
  const sockets: WebSocket[] = [];
  const roomIds: string[] = [];

  beforeEach(async () => {
    sockets.length = 0;
    roomIds.length = 0;
    httpServer = createServer();
    multiplayerServer = new MultiplayerWebSocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const address = httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Expected a TCP test address');
    url = `ws://127.0.0.1:${address.port}/multiplayer`;
  });

  afterEach(async () => {
    roomIds.forEach((roomId) => roomManager.deleteRoom(roomId));
    sockets.forEach((socket) => socket.terminate());
    await multiplayerServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  async function openSocket(): Promise<WebSocket> {
    const socket = new WebSocket(url);
    sockets.push(socket);
    await once(socket, 'open');
    return socket;
  }

  function waitForMessage(socket: WebSocket, type: string): Promise<WireMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off('message', onMessage);
        reject(new Error(`Timed out waiting for ${type}`));
      }, 2_000);
      const onMessage = (raw: WebSocket.RawData) => {
        const message = JSON.parse(raw.toString()) as WireMessage;
        if (message.type !== type) return;
        clearTimeout(timeout);
        socket.off('message', onMessage);
        resolve(message);
      };
      socket.on('message', onMessage);
    });
  }

  async function sendAndWait(socket: WebSocket, message: WireMessage, responseType: string): Promise<WireMessage> {
    const response = waitForMessage(socket, responseType);
    socket.send(JSON.stringify(message));
    return response;
  }

  async function createTwoPlayerRoom() {
    const host = await openSocket();
    const hostCreated = await sendAndWait(host, {
      type: 'CREATE_ROOM',
      payload: { playerId: 'player_host_secure', playerName: 'Host' },
    }, 'ROOM_CREATED');
    const roomId = hostCreated.payload.roomId as string;
    roomIds.push(roomId);

    const guest = await openSocket();
    const hostJoinedNotice = waitForMessage(host, 'PLAYER_JOINED');
    const guestJoined = await sendAndWait(guest, {
      type: 'JOIN_ROOM',
      payload: { roomId, playerId: 'player_guest_secure', playerName: 'Guest' },
    }, 'ROOM_JOINED');
    await hostJoinedNotice;
    return { host, guest, roomId, hostCreated, guestJoined };
  }

  it('binds commands to their socket and requires a rotating reconnect token', async () => {
    const { host, guest, roomId, hostCreated } = await createTwoPlayerRoom();

    const spoofed = await sendAndWait(guest, {
      type: 'PLAYER_READY',
      payload: { playerId: 'player_host_secure', isReady: true },
    }, 'ERROR');
    expect(spoofed.payload.code).toBe('INVALID_MESSAGE');
    expect(roomManager.getRoom(roomId)?.player1?.isReady).toBe(false);

    const reconnectToken = hostCreated.payload.reconnectToken as string;
    host.close();
    await once(host, 'close');

    const reconnecting = await openSocket();
    const rejected = await sendAndWait(reconnecting, {
      type: 'RECONNECT',
      payload: { playerId: 'player_host_secure', roomId, reconnectToken: 'x'.repeat(43) },
    }, 'ERROR');
    expect(rejected.payload.error).toContain('Reconnect credentials');

    const reconnected = await sendAndWait(reconnecting, {
      type: 'RECONNECT',
      payload: { playerId: 'player_host_secure', roomId, reconnectToken },
    }, 'RECONNECTED');
    expect(reconnected.payload.reconnectToken).not.toBe(reconnectToken);
    expect(reconnected.payload.you.id).toBe('player_host_secure');
    expect(reconnected.payload.opponent).not.toHaveProperty('cards');
  });

  it('resolves deck IDs on the server and never sends the opponent future deck', async () => {
    const { host, guest } = await createTwoPlayerRoom();
    const catalog = buildTrustedCardCatalog();
    const trustedCards = ['sanji', 'nami', 'usopp', 'robin'].map((id) => catalog.get(id));
    expect(trustedCards.every(Boolean)).toBe(true);
    const [hostCard, hostNextCard, guestCard, guestNextCard] = trustedCards as NonNullable<(typeof trustedCards)[number]>[];

    const settingsReceived = waitForMessage(guest, 'MATCH_SETTINGS_RECEIVED');
    host.send(JSON.stringify({
      type: 'MATCH_SETTINGS',
      payload: {
        rounds: 2,
        withAbilities: true,
        rarityWeights: { common: 45, rare: 28, epic: 17, legendary: 8, special: 2 },
      },
    }));
    await settingsReceived;

    const hostStart = waitForMessage(host, 'BATTLE_START');
    const guestStart = waitForMessage(guest, 'BATTLE_START');
    host.send(JSON.stringify({ type: 'ARRANGEMENT_READY', payload: { cardIds: [hostCard.id, hostNextCard.id] } }));
    guest.send(JSON.stringify({ type: 'ARRANGEMENT_READY', payload: { cardIds: [guestCard.id, guestNextCard.id] } }));
    const [hostBattle, guestBattle] = await Promise.all([hostStart, guestStart]);

    expect(hostBattle.payload.position).toBe('player1');
    expect(hostBattle.payload.you.cards).toEqual([
      expect.objectContaining({ id: hostCard.id, attack: hostCard.attack, defense: hostCard.defense }),
      expect.objectContaining({ id: hostNextCard.id }),
    ]);
    expect(hostBattle.payload.opponent).not.toHaveProperty('cards');
    expect(hostBattle.payload).not.toHaveProperty('player2');
    expect(JSON.stringify(hostBattle.payload)).not.toContain(guestCard.id);
    expect(JSON.stringify(hostBattle.payload)).not.toContain(guestNextCard.id);
    expect(guestBattle.payload.you.cards.map((card: any) => card.id)).toEqual([guestCard.id, guestNextCard.id]);
    expect(JSON.stringify(guestBattle.payload)).not.toContain(hostCard.id);
    expect(JSON.stringify(guestBattle.payload)).not.toContain(hostNextCard.id);

    const forgedStats = await sendAndWait(host, {
      type: 'REVEAL_CARD',
      payload: { roundIndex: 0, cardId: hostCard.id, attack: 999_999 },
    }, 'ERROR');
    expect(forgedStats.payload.code).toBe('INVALID_MESSAGE');

    const wrongCard = await sendAndWait(host, {
      type: 'REVEAL_CARD',
      payload: { roundIndex: 0, cardId: guestCard.id },
    }, 'ERROR');
    expect(wrongCard.payload.code).toBe('CARD_MISMATCH');

    host.send(JSON.stringify({ type: 'REVEAL_CARD', payload: { roundIndex: 0, cardId: hostCard.id } }));
    const hostResult = waitForMessage(host, 'ROUND_RESULT');
    const guestResult = waitForMessage(guest, 'ROUND_RESULT');
    guest.send(JSON.stringify({ type: 'REVEAL_CARD', payload: { roundIndex: 0, cardId: guestCard.id } }));
    const [hostRound, guestRound] = await Promise.all([hostResult, guestResult]);

    expect(hostRound.payload.p1Card).toEqual(expect.objectContaining({ id: hostCard.id }));
    expect(hostRound.payload.p2Card).toEqual(expect.objectContaining({ id: guestCard.id }));
    expect(hostRound.payload.nextOwnCard).toEqual(expect.objectContaining({ id: hostNextCard.id }));
    expect(guestRound.payload.nextOwnCard).toEqual(expect.objectContaining({ id: guestNextCard.id }));
    expect(JSON.stringify(hostRound.payload)).not.toContain(guestNextCard.id);
    expect(JSON.stringify(guestRound.payload)).not.toContain(hostNextCard.id);
  });

  it('closes a connection that exceeds the message rate limit', async () => {
    const socket = await openSocket();
    const closed = once(socket, 'close');
    for (let index = 0; index <= 40; index += 1) {
      socket.send(JSON.stringify({ type: 'PING', payload: { ts: index } }));
    }
    const [code] = await closed;
    expect(code).toBe(1008);
  });

  it('rejects WebSocket frames larger than the configured payload limit', async () => {
    const socket = await openSocket();
    const closed = once(socket, 'close');
    socket.send(JSON.stringify({ type: 'PING', payload: { padding: 'x'.repeat(20 * 1024) } }));
    const [code] = await closed;
    expect(code).toBe(1009);
  });
});
