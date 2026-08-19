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
    manager.setPlayerCards(host.id, [card(9)], 1);
    manager.setPlayerCards(guest.id, [card(3)], 1);
    manager.setPlayerReady(host.id, true);
    manager.setPlayerReady(guest.id, true);
    expect(manager.startMatch('TURN01')).not.toBeNull();
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

  it('starts only after both confirmed decks are ready and assigns the first turn to the host', () => {
    const manager = new RoomManager();
    const host = player('host-start-test');
    const guest = player('guest-start-test');
    const room = manager.createRoom(host, 'START1');
    expect(room).not.toBeNull();
    expect(manager.joinRoom('START1', guest)).not.toBeNull();

    manager.setPlayerCards(host.id, [card(8), card(7)], 2);
    manager.setPlayerCards(guest.id, [card(6), card(5)], 2);
    manager.setPlayerReady(host.id, true);
    expect(manager.startMatch('START1')).toBeNull();

    manager.setPlayerReady(guest.id, true);
    const started = manager.startMatch('START1');
    expect(started?.status).toBe('playing');
    expect(started?.totalRounds).toBe(2);
    expect(manager.getCurrentTurnPlayerId('START1')).toBe(host.id);
    expect(manager.startMatch('START1')).toBeNull();
  });
});
