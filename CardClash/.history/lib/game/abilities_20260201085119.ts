import { Card, AbilityType, ActiveEffect, GameState } from './types';

// قائمة بجميع القدرات المتاحة
export const ALL_ABILITIES: AbilityType[] = [
  'LogicalEncounter', 'Recall', 'Protection', 'Arise', 'Reinforcement', 
  'Wipe', 'Purge', 'HalvePoints', 'Seal', 'DoubleOrNothing', 
  'StarSuperiority', 'Reduction', 'Sacrifice', 'Popularity', 'Eclipse', 
  'CancelAbility', 'Revive', 'Shambles', 'ConsecutiveLossBuff', 'Lifesteal', 
  'Revenge', 'Suicide', 'Disaster', 'Compensation', 'Weakening', 
  'Misdirection', 'StealAbility', 'Rescue', 'Trap', 'ConvertDebuffsToBuffs', 
  'Sniping', 'Merge', 'DoubleNextCards', 'Deprivation', 'Greed', 
  'Dilemma', 'Subhan', 'Propaganda', 'DoubleYourBuffs', 'Avatar', 
  'Penetration', 'Pool', 'Conversion', 'Shield', 'SwapClass', 
  'TakeIt', 'Skip', 'AddElement', 'Explosion', 'DoublePoints', 'ElementalMastery'
];

// دالة لاختيار عدد محدد من القدرات العشوائية وغير المكررة
export function getRandomAbilities(count: number): AbilityType[] {
  const shuffled = [...ALL_ABILITIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// تعريف واجهة لدالة تنفيذ القدرة
interface AbilityExecutionResult {
  newEffects: ActiveEffect[];
  newPlayerScore?: number;
  newBotScore?: number;
  playerDeckChange?: { index: number, newCard: Card };
  botDeckChange?: { index: number, newCard: Card };
}

export type AbilityExecutor = (
  state: GameState,
  isPlayer: boolean,
) => AbilityExecutionResult;

// خريطة لتخزين دوال تنفيذ القدرات
export const abilityExecutors: Record<AbilityType, AbilityExecutor> = {
  // ✅ قدرات تتطلب واجهة مستخدم (Interactive)
  LogicalEncounter: (state, isPlayer) => {
    // مصادفة منطقية (توقع نتيجة دورين قادمين)
    return { newEffects: [] };
  },

  Recall: (state, isPlayer) => {
    // استدعاء (كرت سابق لك بدون خاصية)
    return { newEffects: [] };
  },

  Arise: (state, isPlayer) => {
    // أرايز (استدعي كرت من كروت خصمك)
    return { newEffects: [] };
  },

  Popularity: (state, isPlayer) => {
    // الشعبية (اغلب الشات يختار رقم راوند تفوز فيه)
    return { newEffects: [] };
  },

  Revive: (state, isPlayer) => {
    // إنعاش (كرت سابق لك بنصف طاقاته مع الخاصية)
    return { newEffects: [] };
  },

  Sniping: (state, isPlayer) => {
    // القنص (اختار راوند معين لقنص الخصم)
    return { newEffects: [] };
  },

  Subhan: (state, isPlayer) => {
    // الصبحان (توقع هجوم الكرت القادم للخصم)
    return { newEffects: [] };
  },

  Propaganda: (state, isPlayer) => {
    // بروباغاندا (اختار فئة واحدة للخصم -2 هجوم ودفاع)
    return { newEffects: [] };
  },

  // ✅ قدرات فورية (Instant) - تأثير مباشر
  Protection: (state, isPlayer) => {
    // حماية (تحمي نفسك من خسارة نقطة صحة)
    const target = isPlayer ? 'player' : 'bot';
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'hp',
      value: 1,
      roundsLeft: 1,
      sourceAbility: 'Protection',
    };
    return { newEffects: [effect] };
  },

  HalvePoints: (state, isPlayer) => {
    // تنصيف النقاط (خصم نقاط الكرت للنصف)
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'all',
      value: -50, // -50% من جميع الإحصائيات
      roundsLeft: 1,
      sourceAbility: 'HalvePoints',
    };
    return { newEffects: [effect] };
  },

  Seal: (state, isPlayer) => {
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

  StarSuperiority: (state, isPlayer) => {
    // تفوق النجوم (كل كروتك تتفوق بالنجوم على الخصم)
    const target = isPlayer ? 'player' : 'bot';
    const remainingRounds = state.totalRounds - state.currentRound;
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'all',
      value: 3, // +3 لكل الإحصائيات
      roundsLeft: remainingRounds,
      sourceAbility: 'StarSuperiority',
    };
    return { newEffects: [effect] };
  },

  Reduction: (state, isPlayer) => {
    // التقليص (-2 لكل عناصر الخصم)
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'all',
      value: -2,
      roundsLeft: 1,
      sourceAbility: 'Reduction',
    };
    return { newEffects: [effect] };
  },

  Eclipse: (state, isPlayer) => {
    // الخسوف (هجوم خصمك 0 بدون البفات)
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'attack',
      value: -9999, // هجوم يصبح 0
      roundsLeft: 1,
      sourceAbility: 'Eclipse',
    };
    return { newEffects: [effect] };
  },

  Avatar: (state, isPlayer) => {
    // أفاتار (+2 لكل العناصر لك)
    const target = isPlayer ? 'player' : 'bot';
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'all',
      value: 2,
      roundsLeft: 1,
      sourceAbility: 'Avatar',
    };
    return { newEffects: [effect] };
  },

  Penetration: (state, isPlayer) => {
    // الاختراق (نقاط دفاع الخصم 0)
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'defense',
      value: -9999, // دفاع يصبح 0
      roundsLeft: 1,
      sourceAbility: 'Penetration',
    };
    return { newEffects: [effect] };
  },

  // ✅ قدرات شرطية (Conditional) - تعتمد على نتيجة الجولة
  Reinforcement: (state, isPlayer) => {
    // التدعيم (في حال الفوز +1 دفاع لكل الكروت لك)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  DoubleOrNothing: (state, isPlayer) => {
    // دبل أو نثنق (قبل الراوند)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  Sacrifice: (state, isPlayer) => {
    // تضحية (تشيل خاصية خصم في حال الخسارة)
    return { newEffects: [] };
  },

  Lifesteal: (state, isPlayer) => {
    // سرقة الحياة (مع الفوز ترجع نقطة صحة)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  Revenge: (state, isPlayer) => {
    // الانتقام (في حال الخسارة +1 هجوم لكل الكروت لك)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  Suicide: (state, isPlayer) => {
    // الانتحار (مع الخسارة ينقص الخصم نقطة)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  Compensation: (state, isPlayer) => {
    // التعويض (في حال الخسارة +1 دفاع لكل الكروت لك)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  Weakening: (state, isPlayer) => {
    // الإضعاف (في حال الخسارة -1 هجوم للخصم)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  Greed: (state, isPlayer) => {
    // الجشع (في حال الفوز +1 هجوم لكل الكروت لك)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  Explosion: (state, isPlayer) => {
    // الانفجار (في حال الخسارة -1 دفاع لكل كروت الخصم)
    // يتم تطبيقها في playRound
    return { newEffects: [] };
  },

  ConsecutiveLossBuff: (state, isPlayer) => {
    // تعزيز الخسارة (خسارة جولتين +1 هجوم ودفاع)
    return { newEffects: [] };
  },

  // ✅ قدرات تأثير خاص (Special Effect)
  Wipe: (state, isPlayer) => {
    // المسح (امسح اي تأثيرات عليك فاللعبة)
    // يتم تطبيقها في game-context
    return { newEffects: [] };
  },

  Purge: (state, isPlayer) => {
    // التطهير (نظف كل التأثيرات فاللعبة)
    // يتم تطبيقها في game-context
    return { newEffects: [] };
  },

  ConvertDebuffsToBuffs: (state, isPlayer) => {
    // تحويل السلبيات (حول النيرفات عليك لبفات)
    // يتم تطبيقها في game-context
    return { newEffects: [] };
  },

  Deprivation: (state, isPlayer) => {
    // السلب (اسلب الخصم من البفات)
    // يتم تطبيقها في game-context
    return { newEffects: [] };
  },

  DoubleYourBuffs: (state, isPlayer) => {
    // مضاعفة البفات (دبل البفات لك)
    // يتم تطبيقها في game-context
    return { newEffects: [] };
  },

  Conversion: (state, isPlayer) => {
    // التحويل (حول بفات الخصم لنيرفات)
    // يتم تطبيقها في game-context
    return { newEffects: [] };
  },

  TakeIt: (state, isPlayer) => {
    // خذها وأنا بو مبارك (اعطي النيرفات للخصم)
    // يتم تطبيقها في game-context
    return { newEffects: [] };
  },

  Misdirection: (state, isPlayer) => {
    // التضليل (دبل كل النيرفات على الخصم)
    const opponentTarget = isPlayer ? 'bot' : 'player';
    const debuffs = state.activeEffects.filter(
      e => e.target === opponentTarget && e.type === 'debuff'
    );
    
    const doubledDebuffs: ActiveEffect[] = debuffs.map(e => ({
      ...e,
      value: e.value * 2,
      sourceAbility: 'Misdirection',
    }));
    
    return { newEffects: doubledDebuffs };
  },

  // ✅ قدرات متقدمة (Advanced)
  CancelAbility: (state, isPlayer) => {
    // إلغاء الخاصية (ألغِ قدرة الخصم)
    return { newEffects: [] };
  },

  Shambles: (state, isPlayer) => {
    // شامبلز (بدل الطاقات بدون الخاصيات)
    return { newEffects: [] };
  },

  Disaster: (state, isPlayer) => {
    // النكبة (بدل كرت الخصم بكرت سابق له)
    return { newEffects: [] };
  },

  StealAbility: (state, isPlayer) => {
    // سرقة الخاصية (اسرق قدرة من الخصم)
    return { newEffects: [] };
  },

  Rescue: (state, isPlayer) => {
    // الإنقاذ (تعطي دفاع الكرت الحالي للكرت القادم)
    return { newEffects: [] };
  },

  Trap: (state, isPlayer) => {
    // الفخ (قبل الراوند)
    return { newEffects: [] };
  },

  Merge: (state, isPlayer) => {
    // الدمج (ادمج كرتك مع كرتك السابق بدون خاصية)
    return { newEffects: [] };
  },

  DoubleNextCards: (state, isPlayer) => {
    // المضاعفة (ضاعف نقاط كرتين من الدور القادم)
    const target = isPlayer ? 'player' : 'bot';
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'all',
      value: 2, // مضاعفة
      roundsLeft: 2, // كرتين قادمين
      sourceAbility: 'DoubleNextCards',
    };
    return { newEffects: [effect] };
  },

  Dilemma: (state, isPlayer) => {
    // الوهقة (بدل كرت الخصم بكرت سابق لك)
    return { newEffects: [] };
  },

  Pool: (state, isPlayer) => {
    // المسبح (اغراق كرت الخصم وبقاء تأثير كرتك)
    return { newEffects: [] };
  },

  Shield: (state, isPlayer) => {
    // الدرع (حماية من الخسارة والخاصية)
    const target = isPlayer ? 'player' : 'bot';
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'all',
      value: 5, // حماية قوية
      roundsLeft: 1,
      sourceAbility: 'Shield',
    };
    return { newEffects: [effect] };
  },

  SwapClass: (state, isPlayer) => {
    // تبديل الفئة (بدل فئة واحدة من عندك مع فئة من خصمك)
    return { newEffects: [] };
  },

  Skip: (state, isPlayer) => {
    // تخطي (يسكب الدور بدون اي تأثير عاللعب)
    return { newEffects: [] };
  },

  AddElement: (state, isPlayer) => {
    // إضافة عنصر (اضف عنصر لأي كرت)
    return { newEffects: [] };
  },

  DoublePoints: (state, isPlayer) => {
    // مضاعفة النقاط (دبل النقاط قبل الراوند)
    const target = isPlayer ? 'player' : 'bot';
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'all',
      value: 100, // مضاعفة 100%
      roundsLeft: 1,
      sourceAbility: 'DoublePoints',
    };
    return { newEffects: [effect] };
  },

  ElementalMastery: (state, isPlayer) => {
    // إتقان العناصر (تفوق عنصري كامل)
    const target = isPlayer ? 'player' : 'bot';
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'all',
      value: 4,
      roundsLeft: state.totalRounds - state.currentRound,
      sourceAbility: 'ElementalMastery',
    };
    return { newEffects: [effect] };
  },
};
