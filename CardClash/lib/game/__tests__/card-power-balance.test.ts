import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../cards-data-exports';
import { MAX_CARD_STAT, RARITY_POWER_RANGES, getCardStatCap, isCardPowerWithinRarityRange, normalizeCardPower } from '../card-power-balance';
import type { Card } from '../types';

const makeCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'balance-test', name: 'Balance Test', nameAr: 'اختبار توازن', attack: 25, defense: 25,
  race: 'human', cardClass: 'warrior', element: 'fire', rarity: 'legendary', stars: 5,
  ...overrides,
});

describe('card power balance by rarity', () => {
  it('keeps every base card within its rarity band and below the absolute stat cap', () => {
    expect(ALL_CARDS.length).toBeGreaterThan(0);
    ALL_CARDS.forEach(card => {
      expect(card.attack).toBeLessThanOrEqual(MAX_CARD_STAT);
      expect(card.defense).toBeLessThanOrEqual(MAX_CARD_STAT);
      expect(isCardPowerWithinRarityRange(card)).toBe(true);
    });
  });

  it('caps excessive values and keeps each legendary stat inside its configured range', () => {
    const normalized = normalizeCardPower(makeCard());
    const rule = RARITY_POWER_RANGES.legendary;
    expect(normalized.attack).toBeLessThanOrEqual(MAX_CARD_STAT);
    expect(normalized.defense).toBeLessThanOrEqual(MAX_CARD_STAT);
    expect(normalized.attack).toBeGreaterThanOrEqual(rule.minStat);
    expect(normalized.defense).toBeGreaterThanOrEqual(rule.minStat);
  });

  it('normalizes each common stat into the 0–6 range', () => {
    const normalized = normalizeCardPower(makeCard({ rarity: 'common', stars: 1, attack: 1, defense: 2 }));
    const rule = RARITY_POWER_RANGES.common;
    expect(normalized.attack).toBeGreaterThanOrEqual(rule.minStat);
    expect(normalized.defense).toBeGreaterThanOrEqual(rule.minStat);
    expect(normalized.attack).toBeLessThanOrEqual(rule.maxStat);
    expect(normalized.defense).toBeLessThanOrEqual(rule.maxStat);
  });

  it('preserves each character’s relative ranking inside a rarity range', () => {
    const weakerCommon = normalizeCardPower(makeCard({ rarity: 'common', stars: 1, attack: 1, defense: 1 }));
    const strongerCommon = normalizeCardPower(makeCard({ rarity: 'common', stars: 1, attack: 15, defense: 14 }));
    const weakerEpic = normalizeCardPower(makeCard({ rarity: 'epic', stars: 4, attack: 10, defense: 5 }));
    const strongerEpic = normalizeCardPower(makeCard({ rarity: 'epic', stars: 4, attack: 20, defense: 18 }));
    expect(weakerCommon.attack).toBe(0);
    expect(weakerCommon.defense).toBe(0);
    expect(strongerCommon.attack).toBe(6);
    expect(strongerCommon.defense).toBe(6);
    expect(weakerEpic.attack).toBe(11);
    expect(weakerEpic.defense).toBe(11);
    expect(strongerEpic.attack).toBe(15);
    expect(strongerEpic.defense).toBe(15);
  });

  it('exempts special cards from the standard 20-stat cap while retaining their values', () => {
    const special = makeCard({ rarity: 'special', stars: 5, attack: 27, defense: 24 });
    const normalized = normalizeCardPower(special);
    expect(getCardStatCap(special)).toBe(Number.POSITIVE_INFINITY);
    expect(normalized.attack).toBe(27);
    expect(normalized.defense).toBe(24);
    expect(isCardPowerWithinRarityRange(normalized)).toBe(true);
  });
});
