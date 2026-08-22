import { getCharacterAbility } from './character-abilities';
import type { Card } from './types';

/**
 * النص الموثوق الذي يظهر على وجه الكرت. تُفضّل تعريفات المحرك على النصوص
 * المخزنة القديمة كي لا يظهر شرط أو رقم مختلف عن القدرة المطبقة فعلياً.
 */
export function getCardAbilityDisplayText(card: Card): string | undefined {
  const ability = getCharacterAbility(card);
  if (ability) return `${ability.nameAr}: ${ability.descriptionAr}`;
  return card.specialAbility?.trim() || undefined;
}
