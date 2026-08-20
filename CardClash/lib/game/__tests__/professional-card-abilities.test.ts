import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../cards-data-exports';
import {
  PROFESSIONAL_CARD_ABILITIES,
  attachProfessionalCardAbilities,
  getProfessionalCombatModifiers,
} from '../professional-card-abilities';
import type { Card } from '../types';

const card = (id: string, overrides: Partial<Card> = {}): Card => ({
  id,
  name: id,
  nameAr: id,
  attack: 20,
  defense: 18,
  hp: 3,
  race: 'human',
  cardClass: 'fighter',
  element: 'fire',
  rarity: 'rare',
  ...overrides,
});

describe('professional card abilities', () => {
  it('assigns exactly seven new abilities to each non-special rarity group', () => {
    expect(Object.keys(PROFESSIONAL_CARD_ABILITIES)).toHaveLength(28);
    expect(ALL_CARDS.filter(item => PROFESSIONAL_CARD_ABILITIES[item.id])).toHaveLength(28);
    const attached = attachProfessionalCardAbilities([card('nami'), card('unrelated')]);
    expect(attached[0].characterAbilityId).toBe('nami_weather_forecast');
    expect(attached[0].specialAbility).toContain('تنين');
    expect(attached[1].characterAbilityId).toBeUndefined();
  });

  it('applies conditional common and rare effects only when their target condition is satisfied', () => {
    const nami = card('nami');
    const dragon = card('dragon-opponent', { race: 'dragon', cardClass: 'warrior' });
    const human = card('human-opponent');
    expect(getProfessionalCombatModifiers(nami, dragon, nami, dragon).defenseBonus).toBe(1);
    expect(getProfessionalCombatModifiers(nami, human, nami, human).defenseBonus).toBeUndefined();

    const shikamaru = card('shikamaru_nara');
    expect(getProfessionalCombatModifiers(shikamaru, dragon, shikamaru, dragon).opponentAttackPenalty).toBe(2);
  });

  it('keeps high-impact legendary abilities behind state or matchup conditions', () => {
    const allMight = card('all_might');
    const enemy = card('enemy');
    expect(getProfessionalCombatModifiers(allMight, enemy, allMight, enemy, { ownScore: 2, opponentScore: 3 }).attackBonus).toBeUndefined();
    expect(getProfessionalCombatModifiers(allMight, enemy, allMight, enemy, { ownScore: 1, opponentScore: 3 })).toMatchObject({ attackBonus: 3, ownDefensePenalty: 2 });

    const ichigo = card('ichigo_kurosaki', { attack: 22, defense: 18 });
    const tiedEnemy = card('tied-enemy', { attack: 21, defense: 19 });
    expect(getProfessionalCombatModifiers(ichigo, tiedEnemy, ichigo, tiedEnemy).attackBonus).toBe(3);
  });
});
