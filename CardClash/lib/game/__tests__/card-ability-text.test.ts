import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../cards-data-exports';
import { getCardAbilityDisplayText } from '../card-ability-text';
import { getCharacterAbility } from '../character-abilities';

describe('النص الظاهر على كروت الشخصيات ذات القدرات', () => {
  it('يطابق كل كرت معروف نص تعريف القدرة الفعلي في المحرك', () => {
    const cardsWithDefinedAbility = ALL_CARDS.filter(card => !!getCharacterAbility(card));

    expect(cardsWithDefinedAbility.length).toBeGreaterThan(0);
    for (const card of cardsWithDefinedAbility) {
      const ability = getCharacterAbility(card)!;
      expect(getCardAbilityDisplayText(card)).toBe(`${ability.nameAr}: ${ability.descriptionAr}`);
    }
  });

  it('يعرض الشرط الفعلي لقدرات كايدو وماكيما وزورو حتى إذا احتوى المصدر القديم نصاً مختصراً', () => {
    const byId = new Map(ALL_CARDS.map(card => [card.id, card]));

    expect(getCardAbilityDisplayText(byId.get('kaido')!)).toContain('حتى نهاية المباراة');
    expect(getCardAbilityDisplayText(byId.get('makima')!)).toContain('ضد الوحوش أو الشياطين');
    expect(getCardAbilityDisplayText(byId.get('roronoa_zoro')!)).toContain('الجولات الثلاث التالية');
  });
});
