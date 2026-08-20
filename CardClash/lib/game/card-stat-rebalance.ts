import { getRarityFromStars } from './card-rarity';
import { RARITY_POWER_RANGES } from './card-power-balance';
import type { CardRarity } from './types';

export type RebalanceableCard = {
  id: string;
  attack: number;
  defense: number;
  rarity?: CardRarity;
  stars?: number;
};

type StatPair = { attack: number; defense: number };

export function getRebalanceRarity(card: Pick<RebalanceableCard, 'rarity' | 'stars'>): CardRarity {
  return card.rarity === 'special' ? 'special' : (card.rarity ?? getRarityFromStars(card.stars));
}

function getStatPairs(rarity: Exclude<CardRarity, 'special'>): StatPair[] {
  const { minStat, maxStat } = RARITY_POWER_RANGES[rarity];
  const pairs: StatPair[] = [];
  for (let attack = minStat; attack <= maxStat; attack += 1) {
    for (let defense = minStat; defense <= maxStat; defense += 1) {
      pairs.push({ attack, defense });
    }
  }
  return pairs.sort((a, b) => {
    const totalDifference = (a.attack + a.defense) - (b.attack + b.defense);
    if (totalDifference !== 0) return totalDifference;
    const attackDifference = a.attack - b.attack;
    if (attackDifference !== 0) return attackDifference;
    return a.defense - b.defense;
  });
}

/**
 * يوزع القيم داخل نطاق الندرة بالتدرج من الأضعف إلى الأقوى.
 * يحافظ على ترتيب قوة السجلات المصدرية داخل الندرة، ولا يغير الكروت الخاصة.
 */
export function rebalanceCardStats<T extends RebalanceableCard>(cards: T[]): T[] {
  const balanced = new Map<string, T>();
  const groups = new Map<Exclude<CardRarity, 'special'>, T[]>();

  for (const card of cards) {
    const rarity = getRebalanceRarity(card);
    if (rarity === 'special') {
      balanced.set(card.id, { ...card, rarity, attack: Math.max(0, Math.round(card.attack)), defense: Math.max(0, Math.round(card.defense)) });
      continue;
    }
    const group = groups.get(rarity) ?? [];
    group.push(card);
    groups.set(rarity, group);
  }

  for (const [rarity, group] of groups) {
    const pairs = getStatPairs(rarity);
    const ranked = [...group].sort((a, b) => {
      const totalDifference = (a.attack + a.defense) - (b.attack + b.defense);
      if (totalDifference !== 0) return totalDifference;
      const attackDifference = a.attack - b.attack;
      if (attackDifference !== 0) return attackDifference;
      const defenseDifference = a.defense - b.defense;
      if (defenseDifference !== 0) return defenseDifference;
      return a.id.localeCompare(b.id);
    });

    ranked.forEach((card, index) => {
      const pairIndex = ranked.length === 1
        ? Math.floor((pairs.length - 1) / 2)
        : Math.round((index * (pairs.length - 1)) / (ranked.length - 1));
      const pair = pairs[pairIndex];
      balanced.set(card.id, { ...card, rarity, attack: pair.attack, defense: pair.defense });
    });
  }

  return cards.map(card => balanced.get(card.id) ?? card);
}
