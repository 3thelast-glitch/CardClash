import { describe, expect, it } from 'vitest';
import type { Card } from '../lib/game/types';
import { buildCardAccessibilitySummary } from '../lib/presentation/card-visibility';

const card = {
  id: 'visibility-fixture',
  name: 'Hidden Hero',
  nameAr: 'البطل المخفي',
  attack: 77,
  defense: 66,
  hp: 5,
  rarity: 'legendary',
  race: 'human',
  cardClass: 'warrior',
  specialAbility: 'سر بالغ الأهمية',
} as Card;

describe('character card optional metadata', () => {
  it('never leaks private identity, rarity, stats or ability text for a hidden card', () => {
    const summary = buildCardAccessibilitySummary({
      card,
      hidden: true,
      rarityLabel: 'أسطوري',
      attack: card.attack,
      defense: card.defense,
      includeAbility: true,
      abilityText: card.specialAbility,
    });

    expect(summary).toBe('بطاقة خصم مخفية');
    expect(summary).not.toContain(card.nameAr);
    expect(summary).not.toContain('77');
    expect(summary).not.toContain('66');
    expect(summary).not.toContain('سر بالغ الأهمية');
    expect(summary).not.toContain('أسطوري');
  });

  it('exposes only the requested public card fields and does not invent total power or element metadata', () => {
    const summary = buildCardAccessibilitySummary({
      card,
      hidden: false,
      rarityLabel: 'أسطوري',
      attack: 80,
      defense: 64,
      includeStats: true,
      includeAbility: false,
    });

    expect(summary).toContain('البطل المخفي');
    expect(summary).toContain('الهجوم 80');
    expect(summary).toContain('الدفاع 64');
    expect(summary).not.toContain('human');
    expect(summary).not.toContain('warrior');
    expect(summary).not.toContain('144');
    expect(summary).not.toContain('سر بالغ الأهمية');
  });

  it('includes complete ability text only when inspection explicitly requests it', () => {
    const text = 'قدرة طويلة: الشرط الأول ثم التأثير الثاني ثم المدة الدقيقة بدون اختصار.';
    const summary = buildCardAccessibilitySummary({
      card,
      hidden: false,
      rarityLabel: 'أسطوري',
      includeStats: false,
      abilityText: text,
      includeAbility: true,
    });

    expect(summary).toContain(text);
  });
});
