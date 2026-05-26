/**
 * Multiplayer Server Entry Point
 * Run: node server/index.js (after tsc compilation)
 * Or: npx ts-node server/index.ts
 *
 * PORT: 3001 (separate from Expo/tRPC app on 3000)
 */

import http from 'http';
import { initializeMultiplayer, roomManager } from './multiplayer/index';

const PORT = parseInt(process.env.MULTIPLAYER_PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET' && req.url === '/health') {
        const rooms = roomManager.getAllRooms();
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            uptime: process.uptime(),
            rooms: rooms.length,
            activePlayers: rooms.reduce((acc, r) => {
                return acc + (r.player1 ? 1 : 0) + (r.player2 ? 1 : 0);
            }, 0),
            timestamp: new Date().toISOString(),
        }));
        return;
    }

    if (req.method === 'GET' && req.url === '/rooms') {
        const rooms = roomManager.getAllRooms().map(r => ({
            id: r.id,
            status: r.status,
            players: [r.player1?.name, r.player2?.name].filter(Boolean),
            createdAt: r.createdAt,
        }));
        res.writeHead(200);
        res.end(JSON.stringify({ rooms }));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

// ─── WebSocket Multiplayer Server ─────────────────────────────────────────────

const { wsServer } = initializeMultiplayer(httpServer);

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, HOST, () => {
    console.log(`\n🃏 Card Clash Multiplayer Server`);
    console.log(`   WebSocket: ws://${HOST}:${PORT}/multiplayer`);
    console.log(`   Health:    http://${HOST}:${PORT}/health`);
    console.log(`   Rooms:     http://${HOST}:${PORT}/rooms\n`);
});

httpServer.on('error', (err) => {
    console.error('[Server] Fatal error:', err);
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('[Server] Shutting down gracefully...');
    httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    console.log('[Server] Interrupted — shutting down...');
    httpServer.close(() => process.exit(0));
});
