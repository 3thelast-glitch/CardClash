import { describe, expect, it } from 'vitest';
import { getCardCollectionStrength, sortCardCollectionByStrength } from '../card-collection-sort';
import type { Card } from '../types';

function card(id: string, attack: number, defense: number, nameAr = id): Card {
  return {
    id,
    name: id,
    nameAr,
    attack,
    defense,
    stars: 1,
    rarity: 'common',
    element: 'fire',
    race: 'human',
    cardClass: 'fighter',
    tags: [],
  };
}

describe('Card Collection strength ordering', () => {
  it('calculates the visible combat strength from attack and defense', () => {
    expect(getCardCollectionStrength(card('a', 8, 7))).toBe(15);
  });

  it('sorts cards from strongest total combat strength to weakest', () => {
    const sorted = sortCardCollectionByStrength([
      card('weak', 3, 2),
      card('strong', 11, 9),
      card('medium', 8, 7),
    ]);

    expect(sorted.map(item => item.id)).toEqual(['strong', 'medium', 'weak']);
  });

  it('breaks ties by attack, then defense, then Arabic name', () => {
    const sorted = sortCardCollectionByStrength([
      card('defense-first', 7, 8, 'باء'),
      card('attack-first', 8, 7, 'جيم'),
      card('name-second', 8, 7, 'باء'),
      card('name-first', 8, 7, 'ألف'),
    ]);

    expect(sorted.map(item => item.id)).toEqual([
      'name-first',
      'name-second',
      'attack-first',
      'defense-first',
    ]);
  });
});
