import { getRarityFromStars } from './card-rarity';
import type { Card, CardRarity } from './types';

/** سقف إحصاءات الكرت الأساسية، بما في ذلك الإحصاء بعد تفعيل وضع الغضب. */
export const MAX_CARD_STAT = 20;

/**
 * النطاق يحد قوة الكرت (الهجوم + الدفاع) مع سقف مستقل لكل إحصاء.
 * يتيح تداخل بسيط بين الحدود كي تبقى أدوار الكروت الهجومية والدفاعية متنوعة.
 */
export const RARITY_POWER_RANGES: Record<CardRarity, { minTotal: number; maxTotal: number; maxStat: number }> = {
  common: { minTotal: 6, maxTotal: 16, maxStat: 9 },
  rare: { minTotal: 14, maxTotal: 24, maxStat: 13 },
  epic: { minTotal: 22, maxTotal: 31, maxStat: 16 },
  legendary: { minTotal: 31, maxTotal: 39, maxStat: MAX_CARD_STAT },
  special: { minTotal: 36, maxTotal: 40, maxStat: MAX_CARD_STAT },
};

export function getCardBalanceRarity(card: Pick<Card, 'rarity' | 'stars'>): CardRarity {
  return card.rarity === 'special' ? 'special' : (card.rarity ?? getRarityFromStars(card.stars));
}

function toStat(value: number | undefined, maximum: number): number {
  return Math.min(maximum, Math.max(0, Math.round(value ?? 0)));
}

function reduceHighest(attack: number, defense: number, amount: number): [number, number] {
  let nextAttack = attack;
  let nextDefense = defense;
  for (let step = 0; step < amount; step += 1) {
    if (nextAttack >= nextDefense && nextAttack > 0) nextAttack -= 1;
    else if (nextDefense > 0) nextDefense -= 1;
  }
  return [nextAttack, nextDefense];
}

function raiseLowest(attack: number, defense: number, amount: number, maximum: number): [number, number] {
  let nextAttack = attack;
  let nextDefense = defense;
  for (let step = 0; step < amount; step += 1) {
    if (nextAttack <= nextDefense && nextAttack < maximum) nextAttack += 1;
    else if (nextDefense < maximum) nextDefense += 1;
  }
  return [nextAttack, nextDefense];
}

/** يعيد نسخة متوازنة من الكرت، ولا يغير مرجع البيانات الأصلي. */
export function normalizeCardPower<T extends Card>(card: T): T {
  const rarity = getCardBalanceRarity(card);
  const rule = RARITY_POWER_RANGES[rarity];
  let attack = toStat(card.attack, rule.maxStat);
  let defense = toStat(card.defense, rule.maxStat);
  const total = attack + defense;

  if (total > rule.maxTotal) [attack, defense] = reduceHighest(attack, defense, total - rule.maxTotal);
  if (attack + defense < rule.minTotal) [attack, defense] = raiseLowest(attack, defense, rule.minTotal - attack - defense, rule.maxStat);

  return { ...card, rarity, attack, defense };
}

export function isCardPowerWithinRarityRange(card: Card): boolean {
  const rule = RARITY_POWER_RANGES[getCardBalanceRarity(card)];
  const total = card.attack + card.defense;
  return card.attack >= 0 && card.defense >= 0
    && card.attack <= MAX_CARD_STAT && card.defense <= MAX_CARD_STAT
    && card.attack <= rule.maxStat && card.defense <= rule.maxStat
    && total >= rule.minTotal && total <= rule.maxTotal;
}
