import { Card, AbilityType, ActiveEffect, GameState } from './types';

// قائمة بجميع القدرات المتاحة
export const ALL_ABILITIES: AbilityType[] = [
  'LogicalEncounter',
  'Recall',
  'Protection',
  'Arise',
  'Reinforcement',
  'Wipe',
  'Purge',
  'HalvePoints',
  'Seal',
  'DoubleOrNothing',
  'StarSuperiority',
  'Reduction',
  'Sacrifice',
  'Popularity',
  'Eclipse',
  'CancelAbility',
  'Revive',
  'Shambles',
  'ConsecutiveLossBuff',
  'Lifesteal',
  'Revenge',
  'Suicide',
  'Disaster',
  'Compensation',
  'Weakening',
  'Misdirection',
  'StealAbility',
  'Rescue',
  'Trap',
  'ConvertDebuffsToBuffs',
  'Sniping',
  'Merge',
  'DoubleNextCards',
  'Deprivation',
  'Greed',
  'Dilemma',
  'Subhan',
  'Propaganda',
  'DoubleYourBuffs',
  'Avatar',
  'Penetration',
  'Pool',
  'Conversion',
  'Shield',
  'SwapClass',
  'TakeIt',
  'Skip',
  'AddElement',
  'Explosion',
  'DoublePoints',
  'ElementalMastery',
];

// دالة لاختيار عدد محدد من القدرات العشوائية وغير المكررة
export function getRandomAbilities(count: number): AbilityType[] {
  const shuffled = [...ALL_ABILITIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// تعريف واجهة لدالة تنفيذ القدرة
interface AbilityExecutionResult {
  newEffects: ActiveEffect[];
  // يمكن إضافة تغييرات أخرى على حالة اللعبة هنا لاحقاً
}

export type AbilityExecutor = (
  playerCard: Card,
  botCard: Card,
  state: GameState,
  isPlayer: boolean, // هل اللاعب هو من يستخدم القدرة؟
) => AbilityExecutionResult;

// خريطة لتخزين دوال تنفيذ القدرات
const abilityExecutors: Record<AbilityType, AbilityExecutor> = {
  // القدرات البسيطة (تأثيرات فورية)
  Penetration: (playerCard, botCard, state, isPlayer) => {
    // الاختراق (نقاط دفاع الخصم 0)
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'defense',
      value: -botCard.defense, // لتقليل الدفاع إلى 0
      roundsLeft: 1, // تأثير فوري للجولة الحالية
      sourceAbility: 'Penetration',
    };
    return { newEffects: [effect] };
  },

  Wipe: (playerCard, botCard, state, isPlayer) => {
    // المسح (امسح اي تأثيرات عليك فاللعبة)
    // هذا يتطلب استدعاء removeEffects في game-context.tsx
    // لا يضيف تأثيرات جديدة، بل يعتمد على الإجراء المباشر
    return { newEffects: [] };
  },

  Purge: (playerCard, botCard, state, isPlayer) => {
    // التطهير (نظف كل التأثيرات فاللعبة)
    // هذا يتطلب استدعاء removeEffects في game-context.tsx
    // لا يضيف تأثيرات جديدة، بل يعتمد على الإجراء المباشر
    return { newEffects: [] };
  },

  Seal: (playerCard, botCard, state, isPlayer) => {
    // الختم (اختم قدرة لمدة 5 جولات)
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'seal',
      target: target,
      stat: 'ability',
      value: 0,
      roundsLeft: 5,
      sourceAbility: 'Seal',
    };
    return { newEffects: [effect] };
  },

  Eclipse: (playerCard, botCard, state, isPlayer) => {
    // الخسف (هجوم خصمك 0 بدون البفات)
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'attack',
      value: -playerCard.attack, // لتقليل الهجوم إلى 0
      roundsLeft: 1,
      sourceAbility: 'Eclipse',
    };
    return { newEffects: [effect] };
  },

  Avatar: (playerCard, botCard, state, isPlayer) => {
    // افاتار (+2 لكل العناصر لك)
    const target = isPlayer ? 'player' : 'bot';
    const effectAttack: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'attack',
      value: 2,
      roundsLeft: 1,
      sourceAbility: 'Avatar',
    };
    const effectDefense: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'defense',
      value: 2,
      roundsLeft: 1,
      sourceAbility: 'Avatar',
    };
    return { newEffects: [effectAttack, effectDefense] };
  },

  Reduction: (playerCard, botCard, state, isPlayer) => {
    // التقليص (-2 لكل عناصر الخصم)
    const target = isPlayer ? 'bot' : 'player';
    const effectAttack: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'attack',
      value: -2,
      roundsLeft: 1,
      sourceAbility: 'Reduction',
    };
    const effectDefense: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'defense',
      value: -2,
      roundsLeft: 1,
      sourceAbility: 'Reduction',
    };
    return { newEffects: [effectAttack, effectDefense] };
  },

  // القدرات التي تتطلب منطق أكثر تعقيداً أو تفاعلاً
  LogicalEncounter: () => ({ newEffects: [] }),
  Recall: () => ({ newEffects: [] }),
  Protection: () => ({ newEffects: [] }),
  Arise: () => ({ newEffects: [] }),
  Reinforcement: () => ({ newEffects: [] }),
  DoubleOrNothing: () => ({ newEffects: [] }),
  StarSuperiority: () => ({ newEffects: [] }),
  Sacrifice: () => ({ newEffects: [] }),
  Popularity: () => ({ newEffects: [] }),
  CancelAbility: () => ({ newEffects: [] }),
  Revive: () => ({ newEffects: [] }),
  Shambles: () => ({ newEffects: [] }),
  ConsecutiveLossBuff: () => ({ newEffects: [] }),
  Lifesteal: () => ({ newEffects: [] }),
  Revenge: () => ({ newEffects: [] }),
  Suicide: () => ({ newEffects: [] }),
  Disaster: () => ({ newEffects: [] }),
  Compensation: () => ({ newEffects: [] }),
  Weakening: () => ({ newEffects: [] }),
  Misdirection: () => ({ newEffects: [] }),
  StealAbility: () => ({ newEffects: [] }),
  Rescue: () => ({ newEffects: [] }),
  Trap: () => ({ newEffects: [] }),
  ConvertDebuffsToBuffs: () => ({ newEffects: [] }),
  Sniping: () => ({ newEffects: [] }),
  Merge: () => ({ newEffects: [] }),
  DoubleNextCards: () => ({ newEffects: [] }),
  Deprivation: () => ({ newEffects: [] }),
  Greed: () => ({ newEffects: [] }),
  Dilemma: () => ({ newEffects: [] }),
  Subhan: () => ({ newEffects: [] }),
  Propaganda: () => ({ newEffects: [] }),
  DoubleYourBuffs: () => ({ newEffects: [] }),
  Pool: () => ({ newEffects: [] }),
  Conversion: () => ({ newEffects: [] }),
  Shield: () => ({ newEffects: [] }),
  SwapClass: () => ({ newEffects: [] }),
  TakeIt: () => ({ newEffects: [] }),
  Skip: () => ({ newEffects: [] }),
  AddElement: () => ({ newEffects: [] }),
  Explosion: () => ({ newEffects: [] }),
  DoublePoints: () => ({ newEffects: [] }),
  ElementalMastery: () => ({ newEffects: [] }),

  HalvePoints: (playerCard, botCard, state, isPlayer) => {
    // خصم نقاط الكرت للنصف
    const target = isPlayer ? 'bot' : 'player';
    const card = isPlayer ? botCard : playerCard;
    const effectAttack: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'attack',
      value: -Math.floor(card.attack / 2),
      roundsLeft: 1,
      sourceAbility: 'HalvePoints',
    };
    const effectDefense: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'defense',
      value: -Math.floor(card.defense / 2),
      roundsLeft: 1,
      sourceAbility: 'HalvePoints',
    };
    return { newEffects: [effectAttack, effectDefense] };
  },

  // القدرات التي تتطلب منطق أكثر تعقيداً أو تفاعلاً
  LogicalEncounter: () => ({ newEffects: [] }),
  Recall: () => ({ newEffects: [] }),
  Protection: () => ({ newEffects: [] }),
  Arise: () => ({ newEffects: [] }),
  Reinforcement: () => ({ newEffects: [] }),
  Purge: () => ({ newEffects: [] }),
  Seal: () => ({ newEffects: [] }),
  DoubleOrNothing: () => ({ newEffects: [] }),
  StarSuperiority: () => ({ newEffects: [] }),
  Reduction: () => ({ newEffects: [] }),
  Sacrifice: () => ({ newEffects: [] }),
  Popularity: () => ({ newEffects: [] }),
  Eclipse: () => ({ newEffects: [] }),
  CancelAbility: () => ({ newEffects: [] }),
  Revive: () => ({ newEffects: [] }),
  Shambles: () => ({ newEffects: [] }),
  ConsecutiveLossBuff: () => ({ newEffects: [] }),
  Lifesteal: () => ({ newEffects: [] }),
  Revenge: () => ({ newEffects: [] }),
  Suicide: () => ({ newEffects: [] }),
  Disaster: () => ({ newEffects: [] }),
  Compensation: () => ({ newEffects: [] }),
  Weakening: () => ({ newEffects: [] }),
  Misdirection: () => ({ newEffects: [] }),
  StealAbility: () => ({ newEffects: [] }),
  Rescue: () => ({ newEffects: [] }),
  Trap: () => ({ newEffects: [] }),
  ConvertDebuffsToBuffs: () => ({ newEffects: [] }),
  Sniping: () => ({ newEffects: [] }),
  Merge: () => ({ newEffects: [] }),
  DoubleNextCards: () => ({ newEffects: [] }),
  Deprivation: () => ({ newEffects: [] }),
  Greed: () => ({ newEffects: [] }),
  Dilemma: () => ({ newEffects: [] }),
  Subhan: () => ({ newEffects: [] }),
  Propaganda: () => ({ newEffects: [] }),
  DoubleYourBuffs: () => ({ newEffects: [] }),
  Avatar: () => ({ newEffects: [] }),
  Pool: () => ({ newEffects: [] }),
  Conversion: () => ({ newEffects: [] }),
  Shield: () => ({ newEffects: [] }),
  SwapClass: () => ({ newEffects: [] }),
  TakeIt: () => ({ newEffects: [] }),
  Skip: () => ({ newEffects: [] }),
  AddElement: () => ({ newEffects: [] }),
  Explosion: () => ({ newEffects: [] }),
  DoublePoints: () => ({ newEffects: [] }),
  ElementalMastery: () => ({ newEffects: [] }),
};

export function executeAbility(
  card: Card,
  opponentCard: Card,
  state: GameState,
  isPlayer: boolean,
): AbilityExecutionResult {
  if (!card.ability) {
    return { newEffects: [] };
  }

  const executor = abilityExecutors[card.ability];
  if (!executor) {
    console.warn(`No executor found for ability: ${card.ability} - abilities.ts:311`);
    return { newEffects: [] };
  }

  // التحقق من الختم (Seal)
  const sealEffect = state.activeEffects.find(
    (e) => e.type === 'seal' && e.target === (isPlayer ? 'player' : 'bot') && e.stat === 'ability'
  );

  if (sealEffect) {
    console.log(`Ability ${card.ability} is sealed for ${isPlayer ? 'player' : 'bot'} - abilities.ts:321`);
    return { newEffects: [] };
  }

  return executor(card, opponentCard, state, isPlayer);
}
