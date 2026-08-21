import { describe, expect, it } from 'vitest';
import { Player, RoomManager } from '../room-manager';

function player(id: string): Player {
  return { id, name: id, socketId: id, isReady: false };
}

const card = (attack: number, race: string = 'human', overrides: Record<string, unknown> = {}) => ({ id: `card-${attack}-${race}`, race, attack, defense: 1, ...overrides });

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

  it('applies the faction multiplier without forcing a round winner', () => {
    const manager = new RoomManager();
    const host = player('host-faction-test');
    const guest = player('guest-faction-test');
    manager.createRoom(host, 'FACT01');
    manager.joinRoom('FACT01', guest);
    manager.setPlayerCards(host.id, [card(10, 'human')], 1);
    manager.setPlayerCards(guest.id, [card(10, 'elf')], 1);
    manager.setPlayerReady(host.id, true);
    manager.setPlayerReady(guest.id, true);
    manager.startMatch('FACT01');

    manager.revealCard(host.id, 0, card(10, 'human'));
    const result = manager.revealCard(guest.id, 0, card(10, 'elf'));

    expect(result?.winner).toBe('player1');
    expect(result?.advantage).toBe('faction');
    expect(result?.p1FactionAdvantage).toBe('strong');
    expect(result?.p2FactionAdvantage).toBe('weak');
  });

  it('keeps All Might’s good and evil alignment aura active after he appears', () => {
    const manager = new RoomManager();
    const host = player('host-all-might-test');
    const guest = player('guest-all-might-test');
    manager.createRoom(host, 'MIGHT1');
    manager.joinRoom('MIGHT1', guest);
    const allMight = card(10, 'human', { id: 'all_might', alignment: 'good', defense: 10 });
    const goodFollower = card(10, 'human', { id: 'good-follower', alignment: 'good', defense: 10 });
    const evilCard = card(10, 'demon', { id: 'evil-opponent', alignment: 'evil', defense: 10 });
    manager.setPlayerCards(host.id, [allMight, goodFollower], 2);
    manager.setPlayerCards(guest.id, [evilCard, evilCard], 2);
    manager.setPlayerReady(host.id, true);
    manager.setPlayerReady(guest.id, true);
    manager.startMatch('MIGHT1');

    manager.revealCard(host.id, 0, allMight);
    const firstResult = manager.revealCard(guest.id, 0, evilCard);
    expect(firstResult?.p1Card.attack).toBe(13);
    expect(firstResult?.p2Card.defense).toBe(7);

    manager.revealCard(host.id, 1, goodFollower);
    const secondResult = manager.revealCard(guest.id, 1, evilCard);
    expect(secondResult?.p1Card.attack).toBe(13);
    expect(secondResult?.p2Card.defense).toBe(7);
  });

  it('marks and stores Artorias’s one-round swap for the following web-room round', () => {
    const manager = new RoomManager();
    const host = player('host-artorias-test');
    const guest = player('guest-artorias-test');
    manager.createRoom(host, 'ARTOR1');
    manager.joinRoom('ARTOR1', guest);
    const artorias = card(20, 'human', { id: 'artorias', defense: 10 });
    const opponent = card(10, 'orc', { id: 'opponent', defense: 16 });
    const hostNext = card(5, 'human', { id: 'host-next' });
    const guestNext = card(6, 'elf', { id: 'guest-next' });
    manager.setPlayerCards(host.id, [artorias, hostNext], 2);
    manager.setPlayerCards(guest.id, [opponent, guestNext], 2);
    manager.setPlayerReady(host.id, true);
    manager.setPlayerReady(guest.id, true);
    manager.startMatch('ARTOR1');

    manager.revealCard(host.id, 0, artorias);
    const result = manager.revealCard(guest.id, 0, opponent);
    expect(result?.nextRoundCardsSwapped).toBe(true);
    const room = manager.getRoom('ARTOR1');
    expect(room?.player1?.cards?.[1].id).toBe('guest-next');
    expect(room?.player2?.cards?.[1].id).toBe('host-next');
  });
});
