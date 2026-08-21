import { describe, expect, it } from 'vitest';
import { CARD_ALIGNMENT_BY_ID, CARD_ALIGNMENT_META, attachCardAlignments, getCardAlignment } from '../lib/game/card-alignment';
import { ALL_CARDS } from '../lib/game/cards-data-exports';
import type { Card } from '../lib/game/types';

const card = (id: string, alignment?: Card['alignment']) => ({ id, alignment } as Pick<Card, 'id' | 'alignment'>);

describe('تصنيف الخير والشر والمحايد للكروت', () => {
  it('يصنّف أمثلة من الأنواع الثلاثة ويجعل الكرت غير المعرّف محايداً', () => {
    expect(getCardAlignment(card('ace'))).toBe('good');
    expect(getCardAlignment(card('acnologia'))).toBe('evil');
    expect(getCardAlignment(card('Turin_Turambar'))).toBe('neutral');
    expect(getCardAlignment(card('custom-card'))).toBe('neutral');
  });

  it('يحتوي على خريطة كاملة من 292 كرت مع بيانات الشارات الثلاث', () => {
    expect(Object.keys(CARD_ALIGNMENT_BY_ID)).toHaveLength(292);
    expect(CARD_ALIGNMENT_META.good.label).toBe('خير');
    expect(CARD_ALIGNMENT_META.evil.label).toBe('شر');
    expect(CARD_ALIGNMENT_META.neutral.label).toBe('محايد/رمادي');
  });

  it('يربط التصنيف ببيانات البطاقة من دون تغيير إحصاءاتها', () => {
    const source = [{ id: 'ace', attack: 14, defense: 9 } as Card];
    const attached = attachCardAlignments(source);
    expect(attached[0]).toMatchObject({ id: 'ace', alignment: 'good', attack: 14, defense: 9 });
    expect(source[0].alignment).toBeUndefined();
  });

  it('يلحق التصنيف بجميع كروت مصدر اللعبة النهائي', () => {
    const idsMissingFromMap = ALL_CARDS.filter((item) => !(item.id in CARD_ALIGNMENT_BY_ID)).map((item) => item.id);
    expect(ALL_CARDS).toHaveLength(292);
    expect(idsMissingFromMap).toEqual([]);
    expect(ALL_CARDS.every((item) => item.alignment !== undefined)).toBe(true);
    expect(ALL_CARDS.find((item) => item.id === 'ace')?.alignment).toBe('good');
    expect(ALL_CARDS.find((item) => item.id === 'acnologia')?.alignment).toBe('evil');
    expect(ALL_CARDS.find((item) => item.id === 'Turin_Turambar')?.alignment).toBe('neutral');
  });
});
