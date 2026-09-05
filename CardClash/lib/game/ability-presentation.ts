import type { AbilityType, CharacterAbilityId } from './types';
import { getAbilityNameOnly } from './ability-names';
import { SEMANTIC_COLOR } from '@/components/ui/design-tokens';

export type AbilityPresentationFamily =
  | 'damage'
  | 'healing'
  | 'protection'
  | 'stat_up'
  | 'stat_down'
  | 'control'
  | 'transformation'
  | 'revival'
  | 'prediction'
  | 'cancellation'
  | 'utility';

export type AbilityAnimationPreset =
  | 'impact'
  | 'restore'
  | 'shield'
  | 'rise'
  | 'drain'
  | 'bind'
  | 'morph'
  | 'revive'
  | 'scan'
  | 'cancel'
  | 'pulse';

export interface AbilityPresentation {
  id: AbilityType | CharacterAbilityId | string;
  family: AbilityPresentationFamily;
  icon: string;
  animation: AbilityAnimationPreset;
  effectColor: string;
  shortLabel: string;
  accessibilityAnnouncement: string;
  haptic: 'selection' | 'ability' | 'attackImpact' | 'acceptedPlacement';
}

const FAMILY_STYLE: Record<AbilityPresentationFamily, Omit<AbilityPresentation, 'id' | 'family' | 'shortLabel' | 'accessibilityAnnouncement'>> = {
  damage: {
    icon: 'swords',
    animation: 'impact',
    effectColor: SEMANTIC_COLOR.status.danger,
    haptic: 'attackImpact',
  },
  healing: {
    icon: 'heart-pulse',
    animation: 'restore',
    effectColor: SEMANTIC_COLOR.status.success,
    haptic: 'ability',
  },
  protection: {
    icon: 'shield',
    animation: 'shield',
    effectColor: SEMANTIC_COLOR.accent.secondary,
    haptic: 'acceptedPlacement',
  },
  stat_up: {
    icon: 'trending-up',
    animation: 'rise',
    effectColor: SEMANTIC_COLOR.status.success,
    haptic: 'ability',
  },
  stat_down: {
    icon: 'trending-down',
    animation: 'drain',
    effectColor: SEMANTIC_COLOR.status.danger,
    haptic: 'ability',
  },
  control: {
    icon: 'scan-line',
    animation: 'bind',
    effectColor: '#C084FC',
    haptic: 'ability',
  },
  transformation: {
    icon: 'refresh-cw',
    animation: 'morph',
    effectColor: '#F0ABFC',
    haptic: 'ability',
  },
  revival: {
    icon: 'sparkles',
    animation: 'revive',
    effectColor: SEMANTIC_COLOR.status.success,
    haptic: 'ability',
  },
  prediction: {
    icon: 'eye',
    animation: 'scan',
    effectColor: SEMANTIC_COLOR.accent.secondary,
    haptic: 'selection',
  },
  cancellation: {
    icon: 'ban',
    animation: 'cancel',
    effectColor: SEMANTIC_COLOR.status.warning,
    haptic: 'ability',
  },
  utility: {
    icon: 'wand-sparkles',
    animation: 'pulse',
    effectColor: SEMANTIC_COLOR.accent.primary,
    haptic: 'ability',
  },
};

/**
 * Explicit manual-ability coverage. `satisfies` makes a newly-added AbilityType
 * fail TypeScript until it receives a deliberate presentation family.
 */
export const MANUAL_ABILITY_FAMILY = {
  LogicalEncounter: 'prediction',
  Recall: 'utility',
  Protection: 'protection',
  Arise: 'revival',
  Reinforcement: 'stat_up',
  Wipe: 'cancellation',
  Purge: 'cancellation',
  HalvePoints: 'stat_down',
  Seal: 'control',
  DoubleOrNothing: 'utility',
  StarSuperiority: 'stat_up',
  Reduction: 'stat_down',
  Sacrifice: 'damage',
  Popularity: 'prediction',
  Eclipse: 'control',
  CancelAbility: 'cancellation',
  Revive: 'revival',
  ConsecutiveLossBuff: 'stat_up',
  Lifesteal: 'healing',
  Revenge: 'stat_up',
  Suicide: 'damage',
  Disaster: 'damage',
  Compensation: 'stat_up',
  Weakening: 'stat_down',
  Misdirection: 'control',
  StealAbility: 'control',
  Rescue: 'protection',
  Trap: 'control',
  ConvertDebuffsToBuffs: 'transformation',
  Sniping: 'damage',
  Merge: 'transformation',
  DoubleNextCards: 'stat_up',
  Deprivation: 'control',
  Greed: 'stat_up',
  Dilemma: 'control',
  Subhan: 'control',
  Propaganda: 'control',
  DoubleYourBuffs: 'stat_up',
  Avatar: 'transformation',
  Penetration: 'damage',
  Pool: 'control',
  Conversion: 'transformation',
  Shield: 'protection',
  SwapClass: 'transformation',
  TakeIt: 'control',
  Skip: 'control',
  AddElement: 'transformation',
  Explosion: 'damage',
  DoublePoints: 'stat_up',
  ElementalMastery: 'stat_up',
  AbsoluteDominance: 'control',
  InfinityLoop: 'utility',
  PhantomBlade: 'damage',
  NothingHappened: 'cancellation',
} satisfies Record<AbilityType, AbilityPresentationFamily>;

export const CHARACTER_ABILITY_IDS = [
  'mihawk_swordsman_mastery',
  'gehrman_monster_hunter',
  'sanji_chivalry',
  'tsunade_medical_ninjutsu',
  'sakura_victory_heal',
  'ainz_death_king',
  'makima_control',
  'kaido_dragon_strength',
  'zoro_three_round_cut',
  'nami_weather_forecast',
  'chopper_medical_kit',
  'hinata_gentle_fist',
  'kurenai_crimson_illusion',
  'coby_marine_resolve',
  'bulma_capsule_scanner',
  'brook_soul_melody',
  'shikamaru_shadow_bind',
  'toge_cursed_command',
  'rock_lee_first_gate',
  'robin_blooming_arms',
  'piccolo_namekian_regeneration',
  'usopp_kayzer_shot',
  'ino_mind_possession',
  'tanjiro_water_breathing_barrier',
  'edward_equivalent_exchange',
  'alphonse_soul_bond',
  'midoriya_controlled_full_cowl',
  'endeavor_hellflame_focus',
  'inosuke_predator_sense',
  'aki_fog_contract',
  'itachi_yata_mirror',
  'eren_titan_hardening',
  'ichigo_final_getsuga',
  'pain_shinra_push',
  'obito_kamui_phase',
  'all_might_last_symbol',
  'artorias_abyss_stance',
] as const satisfies readonly CharacterAbilityId[];

export const CHARACTER_ABILITY_FAMILY = {
  mihawk_swordsman_mastery: 'stat_up',
  gehrman_monster_hunter: 'damage',
  sanji_chivalry: 'protection',
  tsunade_medical_ninjutsu: 'healing',
  sakura_victory_heal: 'healing',
  ainz_death_king: 'control',
  makima_control: 'control',
  kaido_dragon_strength: 'stat_up',
  zoro_three_round_cut: 'damage',
  nami_weather_forecast: 'prediction',
  chopper_medical_kit: 'healing',
  hinata_gentle_fist: 'stat_down',
  kurenai_crimson_illusion: 'control',
  coby_marine_resolve: 'stat_up',
  bulma_capsule_scanner: 'prediction',
  brook_soul_melody: 'control',
  shikamaru_shadow_bind: 'control',
  toge_cursed_command: 'control',
  rock_lee_first_gate: 'stat_up',
  robin_blooming_arms: 'control',
  piccolo_namekian_regeneration: 'healing',
  usopp_kayzer_shot: 'damage',
  ino_mind_possession: 'control',
  tanjiro_water_breathing_barrier: 'protection',
  edward_equivalent_exchange: 'transformation',
  alphonse_soul_bond: 'protection',
  midoriya_controlled_full_cowl: 'stat_up',
  endeavor_hellflame_focus: 'damage',
  inosuke_predator_sense: 'prediction',
  aki_fog_contract: 'control',
  itachi_yata_mirror: 'protection',
  eren_titan_hardening: 'protection',
  ichigo_final_getsuga: 'damage',
  pain_shinra_push: 'damage',
  obito_kamui_phase: 'protection',
  all_might_last_symbol: 'stat_up',
  artorias_abyss_stance: 'damage',
} satisfies Record<CharacterAbilityId, AbilityPresentationFamily>;

function humanizeIdentifier(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function build(id: string, family: AbilityPresentationFamily, label: string): AbilityPresentation {
  const style = FAMILY_STYLE[family];
  return {
    id,
    family,
    ...style,
    shortLabel: label,
    accessibilityAnnouncement: `تم تفعيل ${label}`,
  };
}

export const MANUAL_ABILITY_PRESENTATION = Object.fromEntries(
  (Object.keys(MANUAL_ABILITY_FAMILY) as AbilityType[]).map((id) => [
    id,
    build(id, MANUAL_ABILITY_FAMILY[id], getAbilityNameOnly(id)),
  ]),
) as Record<AbilityType, AbilityPresentation>;

export const CHARACTER_ABILITY_PRESENTATION = Object.fromEntries(
  CHARACTER_ABILITY_IDS.map((id) => [
    id,
    build(id, CHARACTER_ABILITY_FAMILY[id], humanizeIdentifier(id)),
  ]),
) as Record<CharacterAbilityId, AbilityPresentation>;

export function getAbilityPresentation(id: AbilityType | CharacterAbilityId | string): AbilityPresentation {
  if (id in MANUAL_ABILITY_PRESENTATION) {
    return MANUAL_ABILITY_PRESENTATION[id as AbilityType];
  }
  if (id in CHARACTER_ABILITY_PRESENTATION) {
    return CHARACTER_ABILITY_PRESENTATION[id as CharacterAbilityId];
  }
  return build(id, 'utility', humanizeIdentifier(id));
}
