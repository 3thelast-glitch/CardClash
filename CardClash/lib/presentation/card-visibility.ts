import type { Card } from '../game/types';

export interface CardAccessibilitySummaryOptions {
  card?: Card;
  hidden: boolean;
  rarityLabel?: string;
  attack?: number;
  defense?: number;
  includeStats?: boolean;
  abilityText?: string;
  includeAbility?: boolean;
  unavailableReason?: string;
}

/**
 * Builds the screen-reader summary from data the viewer is already allowed to
 * know. Hidden cards return a constant neutral label and never read identity,
 * rarity, stats, ability text, or debug fields from the supplied card object.
 */
export function buildCardAccessibilitySummary({
  card,
  hidden,
  rarityLabel,
  attack,
  defense,
  includeStats = true,
  abilityText,
  includeAbility = false,
  unavailableReason,
}: CardAccessibilitySummaryOptions): string {
  if (hidden || !card) return 'بطاقة خصم مخفية';

  const pieces: (string | null)[] = [
    card.nameAr || card.name,
    rarityLabel ? `الندرة ${rarityLabel}` : null,
    includeStats && attack !== undefined ? `الهجوم ${attack}` : null,
    includeStats && defense !== undefined ? `الدفاع ${defense}` : null,
    includeStats && card.hp !== undefined ? `الصحة ${card.hp}` : null,
    includeAbility && abilityText ? `القدرة ${abilityText}` : null,
    unavailableReason ? `غير متاحة: ${unavailableReason}` : null,
  ];

  return pieces.filter((piece): piece is string => Boolean(piece)).join('، ');
}
