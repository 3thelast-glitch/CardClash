import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBotCards, type BotRarityWeights } from '../bot-ai';
import { ALL_CARDS } from '../cards-data-exports';

const only = (rarity: keyof BotRarityWeights): BotRarityWeights => ({
  common: 0,
  rare: 0,
  epic: 0,
  legendary: 0,
  special: 0,
  [rarity]: 100,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Bot rarity odds', () => {
  it('uses the same configured rarity odds at every difficulty', () => {
    const commonCount = ALL_CARDS.filter(card => (card.rarity ?? 'common') === 'common').length;
    expect(commonCount).toBeGreaterThan(0);

    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const count = Math.min(3, commonCount);

    for (const difficulty of [1, 2, 3, 4] as const) {
      const cards = getBotCards(count, difficulty, undefined, only('common'));
      expect(cards).toHaveLength(count);
      expect(cards.every(card => (card.rarity ?? 'common') === 'common')).toBe(true);
    }
  });

  it('can force another available rarity without difficulty overriding it', () => {
    const rarity = (['special', 'legendary', 'epic', 'rare'] as const)
      .find(key => ALL_CARDS.some(card => card.rarity === key));
    expect(rarity).toBeDefined();
    if (!rarity) return;

    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    for (const difficulty of [1, 2, 3, 4] as const) {
      const [card] = getBotCards(1, difficulty, undefined, only(rarity));
      expect(card.rarity).toBe(rarity);
    }
  });

  it('wires solo battles to the player rarity settings without exposing the player order', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/screens/card-selection.tsx'), 'utf8');
    expect(source).toContain('getBotCards(sorted.length, state.difficulty, undefined, rarityWeights)');
    expect(source).toContain('startBattle(sorted, assignedAbilities, botDeck)');
  });
});
