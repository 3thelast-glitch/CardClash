// أنواع البطاقات والإحصائيات

import type { ImageSourcePropType } from 'react-native';

export type Race =
  | 'human'
  | 'elf'
  | 'orc'
  | 'dragon'
  | 'demon'
  | 'undead'
  | 'monster'
  | 'robot';

export type CardClass =
  | 'mage'        // ساحر
  | 'archer'      // رامي
  | 'swordsman'   // سياف
  | 'fighter'     // مقاتل
  | 'healer';     // طبيب

// ✦ نظام خماسي
export type Element = 'fire' | 'water' | 'earth' | 'lightning' | 'wind';

export type Tag = string;

/** Rarity tier for a card */
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'special';

/** Special in-game effects a card can carry */
export type CardEffect = 'taunt' | 'divine_shield' | 'poison' | 'stealth' | 'charge';

/** Localised string for bilingual support */
export interface LocalizedString {
  en: string;
  ar: string;
}

/** Per-card animation preset key */
export type CardAnimationPreset = 'default' | 'fire' | 'lightning' | 'shadow' | 'holy';

/** جنس الكارت */
export type Gender = 'male' | 'female' | 'unknown';

/**
 * بيانات وضع الغضب للبطاقة
 */
export interface RageModeData {
  enabled: boolean;
  rageImageUrl?: string;
  rageVideoUrl?: string;
  rageAttackBoost: number;
  rageDefenseBoost: number;
  rageNameAr?: string;
  oncePer: 'match' | 'unlimited';
}

export interface Card {
  id: string;
  name: string;
  nameAr: string;
  nameEn?: string;
  finalImage?: ImageSourcePropType;
  imageUrl?: string;
  attack: number;
  defense: number;
  hp?: number;
  race: Race;
  cardClass: CardClass;
  element: Element;
  tags?: Tag[];
  emoji?: string;
  videoUrl?: string;
  rarity?: CardRarity;
  stars?: number;
  specialAbility?: string;
  cardEffects?: CardEffect[];
  animationPreset?: CardAnimationPreset;
  ability?: AbilityType;
  rageMode?: RageModeData;
  isRagedVersion?: boolean;
  originalAttack?: number;
  originalDefense?: number;
  _rageActive?: boolean;
  gender?: Gender;
  universe?: string;
}

export type AbilityType =
  | 'LogicalEncounter'
  | 'Recall'
  | 'Protection'
  | 'Arise'
  | 'Reinforcement'
  | 'Wipe'
  | 'Purge'
  | 'HalvePoints'
  | 'Seal'
  | 'DoubleOrNothing'
  | 'StarSuperiority'
  | 'Reduction'
  | 'Sacrifice'
  | 'Popularity'
  | 'Eclipse'
  | 'CancelAbility'
  | 'Revive'
  | 'ConsecutiveLossBuff'
  | 'Lifesteal'
  | 'Revenge'
  | 'Suicide'
  | 'Disaster'
  | 'Compensation'
  | 'Weakening'
  | 'Misdirection'
  | 'StealAbility'
  | 'Rescue'
  | 'Trap'
  | 'ConvertDebuffsToBuffs'
  | 'Sniping'
  | 'Merge'
  | 'DoubleNextCards'
  | 'Deprivation'
  | 'Greed'
  | 'Dilemma'
  | 'Subhan'
  | 'Propaganda'
  | 'DoubleYourBuffs'
  | 'Avatar'
  | 'Penetration'
  | 'Pool'
  | 'Conversion'
  | 'Shield'
  | 'SwapClass'
  | 'TakeIt'
  | 'Skip'
  | 'AddElement'
  | 'Explosion'
  | 'DoublePoints'
  | 'ElementalMastery'
  | 'LoseHalfRounds'; // ← Turin: تخسر نصف الجولات الأولى إجباريًا

export type Side = 'player' | 'bot';

export type EffectKind =
  | 'prediction'
  | 'protection'
  | 'fortify'
  | 'statModifier'
  | 'halvePoints'
  | 'silenceAbilities'
  | 'doubleOrNothing'
  | 'forcedOutcome'
  | 'starAdvantage'
  | 'sacrifice'
  | 'greedBuff'
  | 'lifesteal'
  | 'revengeBuff'
  | 'suicidePact'
  | 'compensationBuff'
  | 'weakeningDebuff'
  | 'explosionDebuff'
  | 'consecutiveLoss'
  | 'shieldGuard'
  | 'trap'
  | 'convertDebuffs'
  | 'doubleBuffs'
  | 'conversion'
  | 'takeIt'
  | 'deprivation'
  | 'pool'
  | 'turinPenalty'; // ✅ Turin: جولات الخسارة الإجبارية

export interface Effect {
  id: string;
  kind: EffectKind;
  sourceSide: Side;
  targetSide: Side | 'all';
  createdAtRound: number;
  expiresAtRound?: number;
  charges?: number;
  priority: number;
  data?: Record<string, unknown>;
}

export interface ActiveEffect {
  type: 'buff' | 'debuff' | 'seal';
  target: 'player' | 'bot' | 'all';
  stat: 'attack' | 'defense' | 'ability';
  value: number;
  roundsLeft: number;
  sourceAbility: AbilityType;
}

export interface GameState {
  playerDeck: Card[];
  botDeck: Card[];
  currentRound: number;
  totalRounds: number;
  playerScore: number;
  botScore: number;
  roundResults: RoundResult[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  abilitiesEnabled: boolean;
  activeEffects: Effect[];
  playerAbilities: AbilityState[];
  botAbilities: AbilityState[];
  usedAbilities: AbilityType[];
}

export interface AbilityState {
  type: AbilityType;
  used: boolean;
}

export interface RoundResult {
  round: number;
  playerCard: Card;
  botCard: Card;
  playerDamage: number;
  botDamage: number;
  playerBaseDamage: number;
  botBaseDamage: number;
  playerElementAdvantage: ElementAdvantage;
  botElementAdvantage: ElementAdvantage;
  winner: 'player' | 'bot' | 'draw';
}

export const RACE_EMOJI: Record<Race, string> = {
  human:   '\u{1F464}',
  elf:     '\u{1F9DD}',
  orc:     '\u{1F479}',
  dragon:  '\u{1F409}',
  demon:   '\u{1F608}',
  undead:  '\u{1F480}',
  monster: '\u{1F47E}',
  robot:   '\u{1F916}',
};

export const CLASS_EMOJI: Record<CardClass, string> = {
  mage:      '\u{1F9D9}',          // 🧙  ساحر
  archer:    '\u{1F3F9}',          // 🏹  رامي
  swordsman: '\u{1F93A}',          // 🤺  سياف
  fighter:   '\u{1F94A}',          // 🥊  مقاتل
  healer:    '\u2695\ufe0f',       // ⚕️  طبيب
};

// ✦ بدون ice
export const ELEMENT_EMOJI: Record<Element, string> = {
  fire:      '\u{1F525}',
  water:     '\u{1F4A7}',
  earth:     '\u{1F30D}',
  lightning: '\u26a1',
  wind:      '\u{1F4A8}',
};

export const ELEMENT_COLORS: Record<Element, string> = {
  fire:      '#ef4444',
  water:     '#3b82f6',
  earth:     '#a3e635',
  lightning: '#facc15',
  wind:      '#a78bfa',
};

export const GENDER_EMOJI: Record<Gender, string> = {
  male:    '\u{1F466}',  // 👦
  female:  '\u{1F467}',  // 👧
  unknown: '\u2753',     // ❓
};

export const GENDER_COLORS: Record<Gender, string> = {
  male:    '#60A5FA',
  female:  '#F472B6',
  unknown: '#6B7280',
};

export type ElementAdvantage = 'strong' | 'weak' | 'neutral';

export const ELEMENT_MULTIPLIER = {
  strong: 1.25,
  weak: 0.75,
  neutral: 1.0,
};

// ─── نظام التفوق العنصري الخماسي ────────────────────────────────────────────
export const ELEMENT_ADVANTAGES: Record<Element, Element[]> = {
  fire:      ['earth'],
  water:     ['fire'],
  earth:     ['lightning', 'water'],
  lightning: ['water', 'wind'],
  wind:      ['earth'],
};

export const ELEMENT_WEAKNESSES: Record<Element, Element[]> = {
  fire:      ['water', 'wind'],
  water:     ['earth', 'lightning'],
  earth:     ['wind'],
  lightning: ['earth'],
  wind:      ['lightning', 'fire'],
};

// ─── خريطة المضاعفات العنصرية (ELEMENTAL_MAP) ────────────────────────────────
export const ELEMENTAL_MAP: Record<string, Record<string, number>> = {
  '\u0646\u0627\u0631':  { '\u0623\u0631\u0636': 2.0, '\u0645\u0627\u0621': 0.5 },
  '\u0645\u0627\u0621':  { '\u0646\u0627\u0631': 2.0, '\u0623\u0631\u0636': 0.5, '\u0628\u0631\u0642': 0.5 },
  '\u0623\u0631\u0636':  { '\u0628\u0631\u0642': 2.0, '\u0645\u0627\u0621': 2.0, '\u0631\u064a\u062d': 0.5 },
  '\u0628\u0631\u0642':  { '\u0645\u0627\u0621': 2.0, '\u0631\u064a\u062d': 2.0, '\u0623\u0631\u0636': 0.5 },
  '\u0631\u064a\u062d':  { '\u0623\u0631\u0636': 2.0, '\u0628\u0631\u0642': 0.5, '\u0646\u0627\u0631': 0.5 },
};
