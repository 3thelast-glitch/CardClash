import type { Card, CharacterAbilityId, Gender, Race } from './types';

export type CharacterMatchupTarget = 'swordsman' | 'monster' | 'female';

export interface CharacterAbilityDefinition {
  id: CharacterAbilityId;
  nameAr: string;
  descriptionAr: string;
  matchup?: {
    target: CharacterMatchupTarget;
    outcome: 'win' | 'lose';
  };
  statModifiers?: {
    attackBonus?: number;
    defenseBonus?: number;
    defenseOverride?: number;
    cancelOpponentDefense?: boolean;
    opponentAttackPenalty?: number;
  };
  roundStartHealthBonus?: number;
  winHealthBonus?: number;
}

export const CHARACTER_ABILITY_DEFINITIONS: Record<CharacterAbilityId, CharacterAbilityDefinition> = {
  mihawk_swordsman_mastery: {
    id: 'mihawk_swordsman_mastery',
    nameAr: 'تفوق السياف',
    descriptionAr: 'فوز مضمون أمام شخصيات فئة السياف.',
    matchup: { target: 'swordsman', outcome: 'win' },
  },
  gehrman_monster_hunter: {
    id: 'gehrman_monster_hunter',
    nameAr: 'صياد الوحوش',
    descriptionAr: 'فوز مضمون أمام شخصيات عرق الوحش.',
    matchup: { target: 'monster', outcome: 'win' },
  },
  sanji_chivalry: {
    id: 'sanji_chivalry',
    nameAr: 'شهامة سانجي',
    descriptionAr: 'يخسر أمام الشخصيات الأنثوية.',
    matchup: { target: 'female', outcome: 'lose' },
  },
  tsunade_medical_ninjutsu: {
    id: 'tsunade_medical_ninjutsu',
    nameAr: 'طب تسونادي',
    descriptionAr: '+2 صحة للمباراة عند دخول البطاقة الجولة.',
    roundStartHealthBonus: 2,
  },
  sakura_victory_heal: {
    id: 'sakura_victory_heal',
    nameAr: 'شفاء النصر',
    descriptionAr: '+1 صحة للمباراة عند الفوز.',
    winHealthBonus: 1,
  },
  ainz_death_king: {
    id: 'ainz_death_king',
    nameAr: 'ملك الموت',
    descriptionAr: 'يلغي دفاع الخصم في هذه الجولة.',
    statModifiers: { cancelOpponentDefense: true },
  },
  gojo_infinity: {
    id: 'gojo_infinity',
    nameAr: 'اللانهاية',
    descriptionAr: 'يضبط الدفاع على 99 في هذه الجولة.',
    statModifiers: { defenseOverride: 99 },
  },
  sukuna_curse_king: {
    id: 'sukuna_curse_king',
    nameAr: 'ملك اللعنات',
    descriptionAr: '+6 هجوم في هذه الجولة.',
    statModifiers: { attackBonus: 6 },
  },
  makima_control: {
    id: 'makima_control',
    nameAr: 'السيطرة',
    descriptionAr: '+4 هجوم وتخفيض هجوم الخصم بمقدار 4.',
    statModifiers: { attackBonus: 4, opponentAttackPenalty: 4 },
  },
  kaido_dragon_strength: {
    id: 'kaido_dragon_strength',
    nameAr: 'قوة التنين',
    descriptionAr: '+2 هجوم و+4 دفاع في هذه الجولة.',
    statModifiers: { attackBonus: 2, defenseBonus: 4 },
  },
};

const LEGACY_ABILITY_IDS: Partial<Record<string, CharacterAbilityId>> = {
  dracule_mihawk: 'mihawk_swordsman_mastery',
  gehrman: 'gehrman_monster_hunter',
  sanji: 'sanji_chivalry',
  tsunade: 'tsunade_medical_ninjutsu',
  sakura_haruno: 'sakura_victory_heal',
  ainz_ooal_gown: 'ainz_death_king',
  satoru_gojo: 'gojo_infinity',
  ryomen_sukuna: 'sukuna_curse_king',
  makima: 'makima_control',
  kaido: 'kaido_dragon_strength',
};

export function getCharacterAbilityId(card: Card): CharacterAbilityId | undefined {
  return card.characterAbilityId ?? LEGACY_ABILITY_IDS[card.id];
}

export function getCharacterAbility(card: Card): CharacterAbilityDefinition | undefined {
  const abilityId = getCharacterAbilityId(card);
  return abilityId ? CHARACTER_ABILITY_DEFINITIONS[abilityId] : undefined;
}

export function matchesCharacterAbilityTarget(
  card: Card,
  target: CharacterMatchupTarget,
): boolean {
  const tags = (card.tags ?? []).map((tag) => tag.toLowerCase());

  if (target === 'swordsman') {
    return card.cardClass === 'swordsman' || tags.includes('swordsman') || tags.includes('sword');
  }
  if (target === 'monster') {
    return card.race === ('monster' as Race)
      || tags.includes('monster')
      || tags.includes('beast')
      || tags.includes('وحش');
  }
  return card.gender === ('female' as Gender)
    || tags.includes('female')
    || tags.includes('woman')
    || tags.includes('أنثى');
}
