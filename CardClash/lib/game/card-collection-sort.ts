import type { Card } from './types';

export function getCardCollectionStrength(card: Pick<Card, 'attack' | 'defense'>): number {
  return card.attack + card.defense;
}

/**
 * يرتّب كروت Card Collection من الأقوى إلى الأضعف.
 * عند تساوي المجموع يُرجّح الهجوم، ثم الدفاع، ثم الاسم العربي لترتيب ثابت.
 */
export function sortCardCollectionByStrength<T extends Card>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    const strengthDifference = getCardCollectionStrength(b) - getCardCollectionStrength(a);
    if (strengthDifference !== 0) return strengthDifference;

    const attackDifference = b.attack - a.attack;
    if (attackDifference !== 0) return attackDifference;

    const defenseDifference = b.defense - a.defense;
    if (defenseDifference !== 0) return defenseDifference;

    return (a.nameAr || a.name).localeCompare(b.nameAr || b.name, 'ar');
  });
}
