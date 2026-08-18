import { describe, expect, it, vi } from 'vitest';
import { fetchJoinableRooms, resolveRoomDirectoryUrl } from '../room-directory';

describe('room directory', () => {
  it('derives the HTTP room endpoint from the WebSocket server URL', () => {
    expect(resolveRoomDirectoryUrl('wss://rooms.example.com/multiplayer')).toBe('https://rooms.example.com/rooms');
    expect(resolveRoomDirectoryUrl('ws://localhost:3001/multiplayer')).toBe('http://localhost:3001/rooms');
  });

  it('returns only waiting rooms with a host name', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rooms: [
        { id: 'OPEN1', status: 'waiting', players: ['Fahad'], createdAt: '2026-08-18T10:00:00.000Z' },
        { id: 'FULL1', status: 'playing', players: ['Fahad', 'Sara'], createdAt: '2026-08-18T10:01:00.000Z' },
      ] }),
    });
    await expect(fetchJoinableRooms(fetcher, 'wss://rooms.example.com/multiplayer'))
      .resolves.toEqual([{ id: 'OPEN1', hostName: 'Fahad', createdAt: '2026-08-18T10:00:00.000Z' }]);
    expect(fetcher).toHaveBeenCalledWith('https://rooms.example.com/rooms');
  });
});
