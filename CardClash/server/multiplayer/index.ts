import { Server as HTTPServer } from 'http';
import { MultiplayerWebSocketServer } from './websocket-server';
import { roomManager } from './room-manager';

export function initializeMultiplayer(httpServer: HTTPServer) {
  // تهيئة WebSocket server
  const wsServer = new MultiplayerWebSocketServer(httpServer);

  console.log('[Multiplayer] Multiplayer system initialized');

  return {
    wsServer,
    roomManager,
  };
}

export { roomManager } from './room-manager';
export type { Player, Room } from './room-manager';
export type { GameMessage } from './websocket-server';
