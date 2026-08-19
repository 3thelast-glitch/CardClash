import { describe, expect, it } from 'vitest';
import {
  customAbilityToRuntime,
  customCardsToRuntime,
  generateCustomContentCode,
  parseCustomContentJson,
  validateCustomAbility,
  validateCustomCard,
} from '../custom-content-store';

const validCard = {
  id: 'custom_hero',
  name: 'Custom Hero',
  nameAr: 'بطل مخصص',
  attack: 20,
  defense: 18,
  race: 'human',
  cardClass: 'warrior',
  element: 'fire',
  stars: 4,
} as const;

const validAbility = {
  id: 'custom_strike',
  nameEn: 'Custom Strike',
  nameAr: 'ضربة مخصصة',
  description: 'Deals damage.',
  rarity: 'Epic',
  runtimeType: 'Reduction',
} as const;

describe('custom-content-store', () => {
  it('validates supported custom card and ability shapes', () => {
    expect(validateCustomCard(validCard)).toBe(true);
    expect(validateCustomCard({ ...validCard, element: undefined })).toBe(true);
    expect(validateCustomAbility(validAbility)).toBe(true);
    expect(validateCustomCard({ ...validCard, attack: 0 })).toBe(false);
    expect(validateCustomAbility({ ...validAbility, runtimeType: 'unsupported' })).toBe(false);
  });

  it('filters invalid JSON entries without crashing', () => {
    const parsed = parseCustomContentJson({ cards: [validCard, { id: 'broken' }], abilities: [validAbility, null] });
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.abilities).toHaveLength(1);
    expect(parsed.cards[0].id).toBe('custom_hero');
  });

  it('converts custom cards and abilities into runtime data', () => {
    const [card] = customCardsToRuntime([validCard]);
    const ability = customAbilityToRuntime(validAbility);
    expect(card.rarity).toBe('epic');
    expect(card.hp).toBe(18);
    expect(ability.nameAr).toBe('ضربة مخصصة');
    expect(typeof ability.id).toBe('number');
  });

  it('generates importable TypeScript content', () => {
    const code = generateCustomContentCode({ cards: [validCard], abilities: [validAbility] });
    expect(code).toContain('CustomContentJson');
    expect(code).toContain('custom_hero');
    expect(code).toContain('custom_strike');
    expect(code).toContain("runtimeType: 'Reduction'");
  });
});
