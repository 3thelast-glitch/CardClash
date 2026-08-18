import { describe, expect, it } from 'vitest';
import type { Card } from '@/lib/game/types';
import { isLanGameOver, resolveLanRound } from '../lan-match-engine';

const card = (id: string, attack: number, defense: number, element: Card['element']): Card => ({
  id,
  name: id,
  nameAr: id,
  attack,
  defense,
  element,
  rarity: 'common',
  stars: 1,
  race: 'human',
  cardClass: 'fighter',
  gender: 'unknown',
});

describe('LAN match engine', () => {
  it('keeps the host and guest result identical when an element decides the round', () => {
    const result = resolveLanRound(0, card('host', 5, 1, 'water'), card('guest', 99, 1, 'fire'), 3, 3);
    expect(result).toMatchObject({ winner: 'host', hostScore: 3, guestScore: 2, advantage: 'element' });
  });

  it('uses attack after elements tie and ends the match on a depleted score', () => {
    const result = resolveLanRound(2, card('host', 2, 1, 'water'), card('guest', 8, 1, 'water'), 1, 3);
    expect(result).toMatchObject({ winner: 'guest', hostScore: 0, guestScore: 3, advantage: 'attack' });
    expect(isLanGameOver(result, 5)).toBe(true);
  });
});
