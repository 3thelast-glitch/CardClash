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

  it('copies the prior opponent defense only when Itachi appears after the opening web-room round', () => {
    const manager = new RoomManager();
    const host = player('host-itachi-test');
    const guest = player('guest-itachi-test');
    manager.createRoom(host, 'YATA01');
    manager.joinRoom('YATA01', guest);
    const openingHost = card(10, 'human', { id: 'opening-host', defense: 8 });
    const itachi = card(16, 'human', { id: 'itachi_uchiha', defense: 12 });
    const previousGuest = card(8, 'orc', { id: 'previous-guest', defense: 7 });
    const currentGuest = card(12, 'elf', { id: 'current-guest', defense: 23 });
    manager.setPlayerCards(host.id, [openingHost, itachi], 2);
    manager.setPlayerCards(guest.id, [previousGuest, currentGuest], 2);
    manager.setPlayerReady(host.id, true);
    manager.setPlayerReady(guest.id, true);
    manager.startMatch('YATA01');

    manager.revealCard(host.id, 0, openingHost);
    const openingResult = manager.revealCard(guest.id, 0, previousGuest);
    expect(openingResult?.p2Card.defense).toBe(7);

    manager.revealCard(host.id, 1, itachi);
    const yataResult = manager.revealCard(guest.id, 1, currentGuest);
    expect(yataResult?.p2Card.defense).toBe(7);
  });

  it('applies Makima control and keeps Bulma’s class scan private in the web-room result', () => {
    const manager = new RoomManager();
    const host = player('host-makima-bulma-test');
    const guest = player('guest-makima-bulma-test');
    manager.createRoom(host, 'MAKIMA');
    manager.joinRoom('MAKIMA', guest);
    const makima = card(18, 'human', { id: 'makima', defense: 8 });
    const monster = card(21, 'monster', { id: 'monster-opponent', defense: 8 });
    manager.setPlayerCards(host.id, [makima], 1);
    manager.setPlayerCards(guest.id, [monster], 1);
    manager.setPlayerReady(host.id, true);
    manager.setPlayerReady(guest.id, true);
    manager.startMatch('MAKIMA');

    manager.revealCard(host.id, 0, makima);
    const makimaResult = manager.revealCard(guest.id, 0, monster);
    expect(makimaResult?.p1Card.attack).toBe(22);
    expect(makimaResult?.p2Card.attack).toBe(17);

    const scanManager = new RoomManager();
    const scanHost = player('host-bulma-test');
    const scanGuest = player('guest-bulma-test');
    scanManager.createRoom(scanHost, 'BULMA1');
    scanManager.joinRoom('BULMA1', scanGuest);
    const bulma = card(10, 'human', { id: 'bulma', defense: 8 });
    scanManager.setPlayerCards(scanHost.id, [bulma, card(10, 'human', { id: 'host-next' })], 2);
    scanManager.setPlayerCards(scanGuest.id, [card(10, 'elf', { id: 'guest-swordsman', cardClass: 'swordsman' }), card(10, 'elf', { id: 'guest-mage', cardClass: 'mage' })], 2);
    scanManager.setPlayerReady(scanHost.id, true);
    scanManager.setPlayerReady(scanGuest.id, true);
    scanManager.startMatch('BULMA1');
    scanManager.revealCard(scanHost.id, 0, bulma);
    const bulmaResult = scanManager.revealCard(scanGuest.id, 0, card(10, 'elf', { id: 'guest-swordsman', cardClass: 'swordsman' }));
    expect(bulmaResult?.p1PersonalInsight).toContain('ساحر: 1');
    expect(bulmaResult?.p1PersonalInsight).not.toContain('سياف: 1');
    expect(bulmaResult?.p2PersonalInsight).toBeUndefined();
  });

  it('applies Kaido, Alphonse, Chopper, and Toge at their required web-room moments', () => {
    const manager = new RoomManager();
    const host = player('host-pro-sequence-test');
    const guest = player('guest-pro-sequence-test');
    manager.createRoom(host, 'PROSEQ');
    manager.joinRoom('PROSEQ', guest);
    const kaido = card(10, 'dragon', { id: 'kaido', defense: 10 });
    const dragonFollower = card(10, 'dragon', { id: 'dragon-follower', defense: 10 });
    const toge = card(16, 'human', { id: 'toge_inumaki', defense: 10 });
    const chopper = card(3, 'human', { id: 'chopper', defense: 0 });
    const enemy = card(12, 'elf', { id: 'enemy', defense: 8 });
    manager.setPlayerCards(host.id, [kaido, dragonFollower, toge, chopper, card(10, 'human', { id: 'chopper-next', defense: 8 })], 5);
    manager.setPlayerCards(guest.id, [enemy, enemy, card(5, 'elf', { id: 'toge-target', defense: 0 }), card(30, 'elf', { id: 'chopper-winner', defense: 20 }), enemy], 5);
    manager.setPlayerReady(host.id, true);
    manager.setPlayerReady(guest.id, true);
    manager.startMatch('PROSEQ');

    manager.revealCard(host.id, 0, kaido);
    manager.revealCard(guest.id, 0, enemy);
    manager.revealCard(host.id, 1, dragonFollower);
    const kaidoResult = manager.revealCard(guest.id, 1, enemy);
    expect(kaidoResult?.p1Card.attack).toBe(12);
    expect(kaidoResult?.p1Card.defense).toBe(12);

    manager.revealCard(host.id, 2, toge);
    manager.revealCard(guest.id, 2, card(5, 'elf', { id: 'toge-target', defense: 0 }));
    manager.revealCard(host.id, 3, chopper);
    const togeResult = manager.revealCard(guest.id, 3, card(30, 'elf', { id: 'chopper-winner', defense: 20 }));
    expect(togeResult?.p2Card.attack).toBe(28);
    expect(togeResult?.nextRoundP1AttackBonus).toBe(1);
    expect(manager.getRoom('PROSEQ')?.player1?.cards?.[4].attack).toBe(11);
  });

  it('activates Alphonse’s good-card attack aura only at a three-point health deficit in web rooms', () => {
    const manager = new RoomManager();
    const host = player('host-alphonse-test');
    const guest = player('guest-alphonse-test');
    manager.createRoom(host, 'ALPHON');
    manager.joinRoom('ALPHON', guest);
    const alphonse = card(10, 'human', { id: 'alphonse_elric', alignment: 'good', defense: 8 });
    const opponent = card(10, 'elf', { id: 'opponent', defense: 8 });
    manager.setPlayerCards(host.id, [alphonse, alphonse, alphonse, alphonse], 4);
    manager.setPlayerCards(guest.id, [opponent, opponent, opponent, opponent], 4);
    manager.setPlayerReady(host.id, true);
    manager.setPlayerReady(guest.id, true);
    manager.startMatch('ALPHON');
    const room = manager.getRoom('ALPHON');
    if (!room) throw new Error('Expected test room');
    room.p1Score = 1;
    room.p2Score = 4;

    manager.revealCard(host.id, 0, alphonse);
    const result = manager.revealCard(guest.id, 0, opponent);
    expect(result?.p1Card.attack).toBe(12);
  });
});
