import { getRarityFromStars } from './card-rarity';
import type { Card, CardRarity } from './types';

/** سقف إحصاءات الكرت الأساسية ووضع الغضب للندرات غير الخاصة. */
export const MAX_CARD_STAT = 20;

/** نطاق كل إحصاء منفرداً (الهجوم أو الدفاع) حسب الندرة. */
export const RARITY_POWER_RANGES: Record<CardRarity, { minStat: number; maxStat: number }> = {
  common: { minStat: 0, maxStat: 6 },
  rare: { minStat: 7, maxStat: 10 },
  epic: { minStat: 11, maxStat: 15 },
  legendary: { minStat: 16, maxStat: MAX_CARD_STAT },
  special: { minStat: 0, maxStat: Number.POSITIVE_INFINITY },
};

export function getCardBalanceRarity(card: Pick<Card, 'rarity' | 'stars'>): CardRarity {
  return card.rarity === 'special' ? 'special' : (card.rarity ?? getRarityFromStars(card.stars));
}

/** الكروت الخاصة مستثناة من سقف 20، وتحتفظ بقيمها المميزة. */
export function getCardStatCap(card: Pick<Card, 'rarity' | 'stars'>): number {
  return getCardBalanceRarity(card) === 'special' ? Number.POSITIVE_INFINITY : MAX_CARD_STAT;
}

function toStat(value: number | undefined, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value ?? 0)));
}

/** يعيد نسخة متوازنة من الكرت، ولا يغير مرجع البيانات الأصلي. */
export function normalizeCardPower<T extends Card>(card: T): T {
  const rarity = getCardBalanceRarity(card);
  const rule = RARITY_POWER_RANGES[rarity];
  const attack = toStat(card.attack, rule.minStat, rule.maxStat);
  const defense = toStat(card.defense, rule.minStat, rule.maxStat);

  return { ...card, rarity, attack, defense };
}

export function isCardPowerWithinRarityRange(card: Card): boolean {
  const rarity = getCardBalanceRarity(card);
  const rule = RARITY_POWER_RANGES[rarity];
  return card.attack >= rule.minStat && card.defense >= rule.minStat
    && (rarity === 'special' || (card.attack <= MAX_CARD_STAT && card.defense <= MAX_CARD_STAT))
    && card.attack <= rule.maxStat && card.defense <= rule.maxStat;
}
