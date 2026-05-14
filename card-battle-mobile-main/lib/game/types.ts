// أنواع البطاقات والإحصائيات

import type { ImageSourcePropType } from 'react-native';

export type Race =
  | 'human'
  | 'elf'
  | 'orc'
  | 'dragon'
  | 'demon'
  | 'undead'
  | 'monster'   // anime-cards-data
  | 'robot';    // anime-cards-data

export type CardClass = 'warrior' | 'knight' | 'mage' | 'archer' | 'berserker' | 'paladin';

// ✦ نظام خماسي — تم حذف عنصر الجليد (ice)
export type Element = 'fire' | 'water' | 'earth' | 'lightning' | 'wind';

// Removed predefined tags to rely entirely on Element, Race, and Class.
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
 * بيانات وضع الغضب للبطاقة — اختياري، يُضبَط من شاشة إدارة الكروت
 * عند خسارة الكرت: تتحول البطاقة إلى نسخة أقوى مع صورة/فيديو جديد
 */
export interface RageModeData {
  /** هل الميزة مفعّلة لهذه البطاقة؟ */
  enabled: boolean;
  /** رابط صورة الغضب (URL أو base64) — تحل محل صورة الكرت عند التفعيل */
  rageImageUrl?: string;
  /** رابط فيديو التحول — يُشغَّل لحظة تفعيل وضع الغضب */
  rageVideoUrl?: string;
  /** زيادة قيمة الهجوم عند الغضب */
  rageAttackBoost: number;
  /** زيادة قيمة الدفاع عند الغضب */
  rageDefenseBoost: number;
  /** اسم وضع الغضب بالعربية (مثل: سوبر سايان) */
  rageNameAr?: string;
  /** تفعيل مرة واحدة فقط في المباراة، أو عند كل خسارة */
  oncePer: 'match' | 'unlimited';
}

export interface Card {
  id: string;
  name: string;
  nameAr: string;
  nameEn?: string;
  /** Local image source — optional when imageUrl is provided instead */
  finalImage?: ImageSourcePropType;
  /** URL string fallback used by anime-cards-data (remote images) */
  imageUrl?: string;
  attack: number;
  defense: number;
  /** Legacy hp field used by older screens/tests */
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
  /** Optional ability slot — can be undefined after Recall/Merge/etc. */
  ability?: AbilityType;
  /** إعدادات وضع الغضب — اختياري، يُفعّل من شاشة إدارة الكروت */
  rageMode?: RageModeData;
  /** هل البطاقة في وضع الغضب حالياً؟ */
  isRagedVersion?: boolean;
  /** الهجوم الأصلي قبل تفعيل وضع الغضب */
  originalAttack?: number;
  /** الدفاع الأصلي قبل تفعيل وضع الغضب */
  originalDefense?: number;
  /** علامة داخلية لمتابعة حالة الغضب */
  _rageActive?: boolean;
  /** جنس الكارت: ذكر أو أنثى أو غير محدد */
  gender?: Gender;
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
  | 'ElementalMastery';

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
  | 'pool';

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
  human: '\u{1F464}',
  elf: '\u{1F9DD}',
  orc: '\u{1F479}',
  dragon: '\u{1F409}',
  demon: '\u{1F608}',
  undead: '\u{1F480}',
  monster: '\u{1F47E}',
  robot: '\u{1F916}',
};

export const CLASS_EMOJI: Record<CardClass, string> = {
  warrior: '\u2694\ufe0f',
  knight: '\u{1F6E1}\ufe0f',
  mage: '\u{1F52E}',
  archer: '\u{1F3F9}',
  berserker: '\u{1F5E1}\ufe0f',
  paladin: '\u{1F4AA}',
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
// القيم: 2.0 = تفوق قوي | 0.5 = ضعف واضح
export const ELEMENTAL_MAP: Record<string, Record<string, number>> = {
  'نار':  { 'أرض': 2.0, 'ماء': 0.5 },
  'ماء':  { 'نار': 2.0, 'أرض': 0.5, 'برق': 0.5 },
  'أرض':  { 'برق': 2.0, 'ماء': 2.0, 'ريح': 0.5 },
  'برق':  { 'ماء': 2.0, 'ريح': 2.0, 'أرض': 0.5 },
  'ريح':  { 'أرض': 2.0, 'برق': 0.5, 'نار': 0.5 },
};
