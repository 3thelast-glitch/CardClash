import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../cards-data-exports';
import { MAX_CARD_STAT, RARITY_POWER_RANGES, isCardPowerWithinRarityRange, normalizeCardPower } from '../card-power-balance';
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

  it('caps excessive values and preserves a legendary card inside its configured total range', () => {
    const normalized = normalizeCardPower(makeCard());
    const rule = RARITY_POWER_RANGES.legendary;
    expect(normalized.attack).toBeLessThanOrEqual(MAX_CARD_STAT);
    expect(normalized.defense).toBeLessThanOrEqual(MAX_CARD_STAT);
    expect(normalized.attack + normalized.defense).toBeLessThanOrEqual(rule.maxTotal);
    expect(normalized.attack + normalized.defense).toBeGreaterThanOrEqual(rule.minTotal);
  });

  it('raises very low common cards into the common power band without exceeding the rarity stat ceiling', () => {
    const normalized = normalizeCardPower(makeCard({ rarity: 'common', stars: 1, attack: 1, defense: 2 }));
    const rule = RARITY_POWER_RANGES.common;
    expect(normalized.attack + normalized.defense).toBeGreaterThanOrEqual(rule.minTotal);
    expect(normalized.attack).toBeLessThanOrEqual(rule.maxStat);
    expect(normalized.defense).toBeLessThanOrEqual(rule.maxStat);
  });
});
