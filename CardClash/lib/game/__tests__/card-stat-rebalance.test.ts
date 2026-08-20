import { describe, expect, it } from 'vitest';
import { rebalanceCardStats, type RebalanceableCard } from '../card-stat-rebalance';

const card = (id: string, rarity: RebalanceableCard['rarity'], attack: number, defense: number): RebalanceableCard => ({
  id,
  rarity,
  stars: rarity === 'common' ? 1 : rarity === 'rare' ? 3 : rarity === 'epic' ? 4 : 5,
  attack,
  defense,
});

describe('Card Collection stat rebalancing', () => {
  it('keeps all non-special cards inside their rarity bands', () => {
    const balanced = rebalanceCardStats([
      card('common', 'common', 10, 11),
      card('rare', 'rare', 16, 17),
      card('epic', 'epic', 18, 14),
      card('legendary', 'legendary', 15, 13),
    ]);

    balanced.forEach(item => expect(item.attack).not.toBe(item.defense));
    expect(balanced[0].attack).toBeGreaterThanOrEqual(0);
    expect(balanced[0].defense).toBeLessThanOrEqual(6);
    expect(balanced[1].attack).toBeGreaterThanOrEqual(7);
    expect(balanced[1].defense).toBeLessThanOrEqual(10);
    expect(balanced[2].attack).toBeGreaterThanOrEqual(11);
    expect(balanced[2].defense).toBeLessThanOrEqual(15);
    expect(balanced[3].attack).toBeGreaterThanOrEqual(16);
    expect(balanced[3].defense).toBeLessThanOrEqual(20);
  });

  it('spreads cards with identical source values across available stat pairs', () => {
    const epics = Array.from({ length: 52 }, (_, index) => card(`epic-${index}`, 'epic', 17, 17));
    const balanced = rebalanceCardStats(epics);
    const counts = new Map<string, number>();
    for (const item of balanced) {
      const key = `${item.attack}-${item.defense}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      expect(item.attack).toBeGreaterThanOrEqual(11);
      expect(item.attack).toBeLessThanOrEqual(15);
      expect(item.defense).toBeGreaterThanOrEqual(11);
      expect(item.defense).toBeLessThanOrEqual(15);
      expect(item.attack).not.toBe(item.defense);
    }

    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
  });

  it('retains the ordering of relative strength inside the same rarity', () => {
    const balanced = rebalanceCardStats([
      card('weaker', 'legendary', 15, 13),
      card('stronger', 'legendary', 20, 19),
    ]);

    expect(balanced[1].attack + balanced[1].defense).toBeGreaterThan(balanced[0].attack + balanced[0].defense);
  });

  it('does not cap special cards', () => {
    const [special] = rebalanceCardStats([card('special', 'special', 40, 26)]);
    expect(special).toMatchObject({ attack: 40, defense: 26, rarity: 'special' });
  });

  it('creates both attacking and defensive card styles', () => {
    const balanced = rebalanceCardStats(Array.from(
      { length: 18 },
      (_, index) => card(`rare-${index}`, 'rare', 9, 9),
    ));

    expect(balanced.some(item => item.attack > item.defense)).toBe(true);
    expect(balanced.some(item => item.defense > item.attack)).toBe(true);
  });
});
