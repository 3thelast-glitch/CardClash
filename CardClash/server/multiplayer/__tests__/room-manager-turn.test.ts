import { describe, expect, it } from 'vitest';
import { Player, RoomManager } from '../room-manager';

function player(id: string): Player {
  return { id, name: id, socketId: id, isReady: false };
}

const card = (attack: number) => ({ element: 'fire', attack, defense: 1 });

describe('RoomManager turn protocol', () => {
  it('rejects out-of-turn reveals and alternates turns across rounds', () => {
    const manager = new RoomManager();
    const host = player('host-turn-test');
    const guest = player('guest-turn-test');
    const room = manager.createRoom(host, 'TURN01');
    expect(room).not.toBeNull();
    expect(manager.joinRoom('TURN01', guest)).not.toBeNull();
    expect(manager.getCurrentTurnPlayerId('TURN01')).toBe(host.id);

    // Guest cannot reveal before the host.
    expect(manager.revealCard(guest.id, 0, card(9))).toBeNull();
    expect(manager.getCurrentTurnPlayerId('TURN01')).toBe(host.id);

    expect(manager.revealCard(host.id, 0, card(9))).toBeNull();
    expect(manager.getCurrentTurnPlayerId('TURN01')).toBe(guest.id);

    const result = manager.revealCard(guest.id, 0, card(3));
    expect(result?.roundIndex).toBe(0);
    expect(manager.getCurrentTurnPlayerId('TURN01')).toBe(host.id);
  });
});
