import { describe, expect, it } from 'vitest';
import type { Card, Race } from '@/lib/game/types';
import { isLanGameOver, resolveLanRound } from '../lan-match-engine';

const card = (id: string, attack: number, defense: number, race: Race): Card => ({
  id,
  name: id,
  nameAr: id,
  attack,
  defense,
  element: 'fire',
  rarity: 'common',
  stars: 1,
  race,
  cardClass: 'fighter',
  gender: 'unknown',
});

describe('LAN match engine', () => {
  it('keeps the host and guest result identical when a faction advantage decides the round', () => {
    const result = resolveLanRound(0, card('host', 70, 1, 'human'), card('guest', 99, 1, 'elf'), 3, 3);
    expect(result).toMatchObject({ winner: 'host', hostScore: 3, guestScore: 2, advantage: 'faction' });
  });

  it('uses attack after factions tie and ends the match on a depleted score', () => {
    const result = resolveLanRound(2, card('host', 2, 1, 'human'), card('guest', 8, 1, 'human'), 1, 3);
    expect(result).toMatchObject({ winner: 'guest', hostScore: 0, guestScore: 3, advantage: 'attack' });
    expect(isLanGameOver(result, 5)).toBe(true);
  });

  it('does not label the result as faction-decided when the advantaged card still loses on damage', () => {
    const result = resolveLanRound(0, card('host', 1, 1, 'human'), card('guest', 99, 99, 'elf'), 3, 3);
    expect(result).toMatchObject({ winner: 'guest', advantage: 'attack' });
  });
});
