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
  | 'warrior'
  | 'knight'
  | 'mage'
  | 'archer'
  | 'berserker'
  | 'paladin'
  | 'swordsman'   // سياف
  | 'fighter'     // مقاتل
  | 'guardian'    //'روبوت
  | 'healer';     // طبيب

/** @deprecated بيانات قديمة؛ لم تعد تستعمل في اللعب أو الواجهة. */
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
export type CardAnimationPreset = 'default' | 'fire' | 'lightning' | 'shadow' | 'holy' | 'wind' | 'water' | 'earth';

/** معرف قدرة الشخصية المدمجة، مستقل عن بطاقات القدرات اليدوية. */
export type CharacterAbilityId =
  | 'mihawk_swordsman_mastery'
  | 'gehrman_monster_hunter'
  | 'sanji_chivalry'
  | 'tsunade_medical_ninjutsu'
  | 'sakura_victory_heal'
  | 'ainz_death_king'
  | 'gojo_infinity'
  | 'sukuna_curse_king'
  | 'makima_control'
  | 'kaido_dragon_strength';

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
  /** @deprecated بيانات قديمة فقط؛ لم تعد العناصر جزءاً من نظام اللعب أو الواجهة. */
  element: Element;
  tags?: Tag[];
  emoji?: string;
  videoUrl?: string;
  rarity?: CardRarity;
  stars?: number;
  specialAbility?: string;
  /** تعريف منظم لقدرة الشخصية؛ النص المعروض يبقى في specialAbility. */
  characterAbilityId?: CharacterAbilityId;
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
  winState?: 'win' | 'lose' | 'draw';
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
  | 'LoseHalfRounds' // ← Turin: تخسر نصف الجولات الأولى إجباريًا
  | 'AbsoluteDominance'
  | 'InfinityLoop'
  | 'PhantomBlade';

export type Side = 'player' | 'bot';

/** طريقة إدارة الطرف الثاني في المباراة. تبقى أسماء player/bot داخل المحرك
 * متوافقة مع منطق القتال، لكن واجهة local تعرضها كمضيف وضيف. */
export type MatchMode = 'solo' | 'local' | 'lan';

/** أسماء الإحصاءات التي يمكن لتأثير القدرة تعديلها. */
export type EffectStat = 'attack' | 'defense' | 'all_stats';

/** البيانات الاختيارية المشتركة التي تحملها القدرة أو التأثير. */
export interface AbilityData {
  amount?: number;
  penaltyHp?: number;
  rewardHp?: number;
  appliesToRound?: number;
  lossCount?: number;
  penaltyRound?: number;
  rounds?: number;
  totalPenalty?: number;
  double?: boolean;
  faction?: Race;
  guessedAttack?: number;
  multiplier?: number | boolean;
  outcome?: 'player' | 'bot' | 'draw' | 'win' | 'loss';
  predictions?: Record<number, 'player' | 'bot' | 'draw' | 'win' | 'loss'>;
  round?: number;
  roundIndex?: number;
  selection?: CardClass | string;
  stat?: EffectStat;
  targetClass?: CardClass | string;
  abilityType?: AbilityType;
}

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
  | 'doubleDebuffs'
  | 'doublePoints'
  | 'factionMastery'
  | 'turinPenalty' // ✅ Turin: جولات الخسارة الإجبارية
  | 'absoluteDominance'
  | 'phantomBlade';

export interface Effect {
  id: string;
  kind: EffectKind;
  sourceSide: Side;
  targetSide: Side | 'all';
  createdAtRound: number;
  expiresAtRound?: number;
  charges?: number;
  priority: number;
  data?: AbilityData;
}

/** تأثير الجولة بعد ربطه ببيانات قدرة typed بدلاً من Record أو any. */
export interface RoundEffect extends Omit<Effect, 'data'> {
  data?: AbilityData;
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
  /** غيابه في البيانات القديمة يعني مباراة فردية. */
  matchMode?: MatchMode;
  playerDeck: Card[];
  botDeck: Card[];
  currentRound: number;
  totalRounds: number;
  playerScore: number;
  botScore: number;
  /** أعلى صحة وصلت إليها كل جهة في المباراة؛ لا تتغير مع الضرر العادي. */
  playerMaxHealth: number;
  botMaxHealth: number;
  roundResults: RoundResult[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  abilitiesEnabled: boolean;
  activeEffects: Effect[];
  playerAbilities: AbilityState[];
  botAbilities: AbilityState[];
  usedAbilities: AbilityType[];
  /** تُسجل مؤقتاً حتى تُربط قدرة البوت بنتيجة الجولة الحالية. */
  botAbilityUsedThisRound?: AbilityType;
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
  playerFactionAdvantage?: FactionAdvantage;
  botFactionAdvantage?: FactionAdvantage;
  /** التغير النهائي في صحة المباراة بعد الحسم والعلاج والآثار النشطة. */
  playerHealthDelta: number;
  botHealthDelta: number;
  /** قدرة البوت التي فُعّلت قبل حسم هذه الجولة إن وُجدت. */
  botAbilityUsed?: AbilityType;
  winner: 'player' | 'bot' | 'draw';
}

export const RACE_EMOJI: Record<Race, string> = {
  human: '\u{1F9D1}',
  elf: '\u{1F9DD}',
  orc: '\u{1F47A}',
  dragon: '\u{1F432}',
  demon: '\u{1F47F}',
  undead: '\u2620\ufe0f',
  monster: '\u{1F47E}',
  robot: '\u{1F916}',
};

export const CLASS_EMOJI: Record<CardClass, string> = {
  warrior: '\u2694\ufe0f',        // ⚔️ محارب
  knight: '\u{1F6E1}\ufe0f',      // 🛡️ فارس
  mage: '\u{1FA84}',               // 🪄 ساحر
  archer: '\u{1F3F9}',             // 🏹 رامي
  berserker: '\u{1FA93}',          // 🪓 ضاري
  paladin: '\u2728',               // ✨ بالادين
  swordsman: '\u{1F5E1}\ufe0f',   // 🗡️ سياف
  fighter: '\u{1F94A}',            // 🥊 مقاتل
  guardian: '\u{1F3F0}',           // 🏰 حارس
  healer: '\u{1FA7A}',             // 🩺 طبيب
};

export const GENDER_EMOJI: Record<Gender, string> = {
  male: '\u{1F466}',  // 👦
  female: '\u{1F467}',  // 👧
  unknown: '\u2753',     // ❓
};

export const GENDER_COLORS: Record<Gender, string> = {
  male: '#60A5FA',
  female: '#F472B6',
  unknown: '#6B7280',
};

export type FactionAdvantage = 'strong' | 'weak' | 'neutral';

export const FACTION_MULTIPLIER: Record<FactionAdvantage, number> = {
  strong: 1.25,
  weak: 0.75,
  neutral: 1.0,
};

/**
 * دورة التضاد المعتمدة: كل فصيلة تتفوق على الفصيلة المسجلة أمامها فقط.
 * بشر > ألف > أورك > تنين > شيطان > ميت > وحش > روبوت > بشر.
 */
export const FACTION_ADVANTAGES: Record<Race, Race> = {
  human: 'elf',
  elf: 'orc',
  orc: 'dragon',
  dragon: 'demon',
  demon: 'undead',
  undead: 'monster',
  monster: 'robot',
  robot: 'human',
};

export const RACE_LABELS: Record<Race, string> = {
  human: 'بشر',
  elf: 'ألف',
  orc: 'أورك',
  dragon: 'تنين',
  demon: 'شيطان',
  undead: 'ميت',
  monster: 'وحش',
  robot: 'روبوت',
};
