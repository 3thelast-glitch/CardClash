import type { Card, CharacterAbilityId, Gender, Race } from './types';
import { PROFESSIONAL_CARD_ABILITIES } from './professional-card-abilities';

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
    /** لا يعمل التعديل إلا ضد إحدى الفصائل المحددة. */
    opponentRaces?: Race[];
  };
  /** يضيف فوزاً قسرياً للجولات التالية بعد ظهور البطاقة. */
  cutNextRounds?: number;
  roundStartHealthBonus?: number;
  winHealthBonus?: number;
}

type BuiltInCharacterAbilityId =
  | 'mihawk_swordsman_mastery'
  | 'gehrman_monster_hunter'
  | 'sanji_chivalry'
  | 'tsunade_medical_ninjutsu'
  | 'sakura_victory_heal'
  | 'ainz_death_king'
  | 'makima_control'
  | 'kaido_dragon_strength'
  | 'zoro_three_round_cut';

export const CHARACTER_ABILITY_DEFINITIONS: Record<BuiltInCharacterAbilityId, CharacterAbilityDefinition> = {
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
  makima_control: {
    id: 'makima_control',
    nameAr: 'السيطرة',
    descriptionAr: 'ضد الوحوش أو الشياطين: +4 هجوم لكرتها و−4 هجوم لكرت الخصم.',
    statModifiers: { attackBonus: 4, opponentAttackPenalty: 4, opponentRaces: ['monster', 'demon'] },
  },
  kaido_dragon_strength: {
    id: 'kaido_dragon_strength',
    nameAr: 'قوة التنين',
    descriptionAr: 'عند الظهور: كروت الأورك والتنانين والشياطين والأموات والوحوش +2 هجوم و+2 دفاع حتى نهاية المباراة.',
  },
  zoro_three_round_cut: {
    id: 'zoro_three_round_cut',
    nameAr: 'يقطع 3 الجولات القادمة',
    descriptionAr: 'يفرض الفوز في الجولات الثلاث التالية بغض النظر عن قوة الكروت، مع أثر الشق على كرت الخصم.',
    cutNextRounds: 3,
  },
};

const LEGACY_ABILITY_IDS: Partial<Record<string, CharacterAbilityId>> = {
  dracule_mihawk: 'mihawk_swordsman_mastery',
  gehrman: 'gehrman_monster_hunter',
  sanji: 'sanji_chivalry',
  tsunade: 'tsunade_medical_ninjutsu',
  sakura_haruno: 'sakura_victory_heal',
  ainz_ooal_gown: 'ainz_death_king',
  makima: 'makima_control',
  kaido: 'kaido_dragon_strength',
  roronoa_zoro: 'zoro_three_round_cut',
};

export function getCharacterAbilityId(card: Card): CharacterAbilityId | undefined {
  return card.characterAbilityId
    ?? LEGACY_ABILITY_IDS[card.id]
    ?? PROFESSIONAL_CARD_ABILITIES[card.id]?.id;
}

export function getCharacterAbility(card: Card): CharacterAbilityDefinition | undefined {
  const abilityId = getCharacterAbilityId(card);
  if (!abilityId) return undefined;
  const existing = (CHARACTER_ABILITY_DEFINITIONS as Partial<Record<CharacterAbilityId, CharacterAbilityDefinition>>)[abilityId];
  if (existing) return existing;
  return PROFESSIONAL_CARD_ABILITIES[card.id];
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
