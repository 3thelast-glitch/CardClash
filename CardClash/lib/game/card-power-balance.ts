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

/** نطاقات القوة الأصلية في بيانات الشخصيات، وتستخدم لحفظ ترتيب قوتها النسبي داخل الندرة. */
const RARITY_SOURCE_STAT_RANGES: Record<Exclude<CardRarity, 'special'>, { attack: readonly [number, number]; defense: readonly [number, number] }> = {
  common: { attack: [1, 15], defense: [1, 14] },
  rare: { attack: [3, 18], defense: [4, 16] },
  epic: { attack: [10, 20], defense: [5, 18] },
  legendary: { attack: [16, 25], defense: [14, 25] },
};

export function getCardBalanceRarity(card: Pick<Card, 'rarity' | 'stars'>): CardRarity {
  return card.rarity === 'special' ? 'special' : (card.rarity ?? getRarityFromStars(card.stars));
}

/** الكروت الخاصة مستثناة من سقف 20، وتحتفظ بقيمها المميزة. */
export function getCardStatCap(card: Pick<Card, 'rarity' | 'stars'>): number {
  return getCardBalanceRarity(card) === 'special' ? Number.POSITIVE_INFINITY : MAX_CARD_STAT;
}

function scaleStatIntoRarityRange(value: number | undefined, sourceRange: readonly [number, number], targetRange: { minStat: number; maxStat: number }): number {
  const rawValue = Math.round(value ?? 0);
  if (!Number.isFinite(targetRange.maxStat)) return Math.max(targetRange.minStat, rawValue);
  const [sourceMin, sourceMax] = sourceRange;
  const bounded = Math.min(sourceMax, Math.max(sourceMin, rawValue));
  const progress = sourceMax === sourceMin ? 1 : (bounded - sourceMin) / (sourceMax - sourceMin);
  return Math.round(targetRange.minStat + progress * (targetRange.maxStat - targetRange.minStat));
}

/** يعيد نسخة متوازنة من الكرت، ولا يغير مرجع البيانات الأصلي. */
export function normalizeCardPower<T extends Card>(card: T): T {
  const rarity = getCardBalanceRarity(card);
  const rule = RARITY_POWER_RANGES[rarity];
  if (rarity === 'special') {
    return { ...card, rarity, attack: Math.max(0, Math.round(card.attack)), defense: Math.max(0, Math.round(card.defense)) };
  }
  const sourceRule = RARITY_SOURCE_STAT_RANGES[rarity];
  const attack = scaleStatIntoRarityRange(card.attack, sourceRule.attack, rule);
  const defense = scaleStatIntoRarityRange(card.defense, sourceRule.defense, rule);

  return { ...card, rarity, attack, defense };
}

export function isCardPowerWithinRarityRange(card: Card): boolean {
  const rarity = getCardBalanceRarity(card);
  const rule = RARITY_POWER_RANGES[rarity];
  return card.attack >= rule.minStat && card.defense >= rule.minStat
    && (rarity === 'special' || (card.attack <= MAX_CARD_STAT && card.defense <= MAX_CARD_STAT))
    && card.attack <= rule.maxStat && card.defense <= rule.maxStat;
}
