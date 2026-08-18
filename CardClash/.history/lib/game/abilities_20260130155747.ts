import { Card, AbilityType, ActiveEffect, GameState } from './types';

// قائمة بجميع القدرات المتاحة
export const ALL_ABILITIES: AbilityType[] = [
  'LogicalEncounter', 'Recall', 'Protection', 'Arise', 'Reinforcement', 'Wipe', 'Purge', 'HalvePoints', 'Seal', 'DoubleOrNothing', 'StarSuperiority', 'Reduction', 'Sacrifice', 'Popularity', 'Eclipse', 'CancelAbility', 'Revive', 'Shambles', 'ConsecutiveLossBuff', 'Lifesteal', 'Revenge', 'Suicide', 'Disaster', 'Compensation', 'Weakening', 'Misdirection', 'StealAbility', 'Rescue', 'Trap', 'ConvertDebuffsToBuffs', 'Sniping', 'Merge', 'DoubleNextCards', 'Deprivation', 'Greed', 'Dilemma', 'Subhan', 'Propaganda', 'DoubleYourBuffs', 'Avatar', 'Penetration', 'Pool', 'Conversion', 'Shield', 'SwapClass', 'TakeIt', 'Skip', 'AddElement', 'Explosion', 'DoublePoints', 'ElementalMastery'
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
  newPlayerScore?: number;
  newBotScore?: number;
  // لتنفيذ قدرات مثل Recall و Arise
  playerDeckChange?: { index: number, newCard: Card };
  botDeckChange?: { index: number, newCard: Card };
}

export type AbilityExecutor = (
  state: GameState,
  isPlayer: boolean, // هل اللاعب هو من يستخدم القدرة؟
) => AbilityExecutionResult;

// خريطة لتخزين دوال تنفيذ القدرات
export const abilityExecutors: Record<AbilityType, AbilityExecutor> = {
  // القدرات التي تتطلب منطق أكثر تعقيداً أو تفاعلاً
  LogicalEncounter: (state, isPlayer) => {
    // مصادفة منطقية: توقع نتيجة دورين قادمين، إذا صح التوقع تحصل على نقطتي صحة
    // هذه القدرة تتطلب واجهة مستخدم للتوقع، لذا المنطق هنا هو لتطبيق النتيجة
    // نفترض أن التوقع يتم قبل استدعاء هذه الدالة
    // سنضيف منطق التوقع لاحقاً في GameContext
    return { newEffects: [] };
  },
  Recall: (state, isPlayer) => {
    // استدعاء: إرجاع كرت سابق لك بدون خاصية
    // تتطلب واجهة مستخدم لاختيار الكرت
    return { newEffects: [] };
  },
  Protection: (state, isPlayer) => {
    // حماية: منع خسارة نقطة صحة في هذه الجولة
    const target = isPlayer ? 'player' : 'bot';
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'hp',
      value: 1, // زيادة نقطة صحة مؤقتة
      roundsLeft: 1,
      sourceAbility: 'Protection',
    };
    return { newEffects: [effect] };
  },
  Arise: (state, isPlayer) => {
    // أرايز: استدعاء كرت من كروت الخصم إلى صفك
    // تتطلب واجهة مستخدم لاختيار الكرت
    return { newEffects: [] };
  },
  Reinforcement: (state, isPlayer) => {
    // التدعيم: عند الفوز تحصل كل كروتك على +1 دفاع
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Wipe: (state, isPlayer) => {
    // المسح: إزالة جميع التأثيرات عنك
    // يتم تطبيق هذا الإجراء مباشرة في GameContext
    return { newEffects: [] };
  },
  Purge: (state, isPlayer) => {
    // التطهير: إزالة جميع التأثيرات من الجميع
    // يتم تطبيق هذا الإجراء مباشرة في GameContext
    return { newEffects: [] };
  },
  HalvePoints: (state, isPlayer) => {
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'attack',
      value: 0.5, // سيتم التعامل مع هذا كنسبة مئوية
      roundsLeft: 1,
      sourceAbility: 'HalvePoints',
    };
    return { newEffects: [effect] };
  },
  Seal: (state, isPlayer) => {
    // الختم: تعطيل قدرة خصم لمدة خمس جولات
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
  DoubleOrNothing: (state, isPlayer) => {
    // دبل أور نثنق: إذا فزت +1 صحة، وإذا خسرت -2 صحة
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  StarSuperiority: (state, isPlayer) => {
    // كل كروتك تتفوق بالنجوم على الخصم
    // يتم تطبيق هذا التأثير على جميع الكروت المتبقية
    return { newEffects: [] };
  },
  Reduction: (state, isPlayer) => {
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'all-stats',
      value: -2,
      roundsLeft: 1,
      sourceAbility: 'Reduction',
    };
    return { newEffects: [effect] };
  },
  Sacrifice: (state, isPlayer) => {
    // تضحية: عند الخسارة تزال خاصية من خصمك
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Popularity: (state, isPlayer) => {
    // الشعبية: اختيار الجمهور لراوند تفوز فيه بدون تأثير كروت
    // تتطلب واجهة مستخدم لاختيار الجولة
    return { newEffects: [] };
  },
  Eclipse: (state, isPlayer) => {
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'attack',
      value: -Infinity, // القيمة -Infinity تعني أن الهجوم سيصبح 0
      roundsLeft: 1,
      sourceAbility: 'Eclipse',
    };
    return { newEffects: [effect] };
  },
  CancelAbility: (state, isPlayer) => {
    // الغاء خاصية
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  Revive: (state, isPlayer) => {
    // إنعاش: كرت سابق لك بنصف طاقاته مع الخاصية
    // تتطلب واجهة مستخدم لاختيار الكرت
    return { newEffects: [] };
  },
  Shambles: (state, isPlayer) => {
    // شامبلز: بدل الطاقات بدون الخاصيات
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  ConsecutiveLossBuff: (state, isPlayer) => {
    // في حال خسارة جولتين متتاليتين تاخذ +1 هجوم و دفاع
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Lifesteal: (state, isPlayer) => {
    // اللايف ستيل: مع الفوز ترجع نقطة صحة
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Revenge: (state, isPlayer) => {
    // الانتقام: في حال الخسارة +1 هجوم لكل الكروت لك
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Suicide: (state, isPlayer) => {
    // الانتحار: مع الخسارة ينقص الخصم نقطة
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Disaster: (state, isPlayer) => {
    // النكبة: بدل كرت الخصم بكرت سابق له
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  Compensation: (state, isPlayer) => {
    // التعويض: في حال الخسارة +1 دفاع لكل الكروت لك
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Weakening: (state, isPlayer) => {
    // الإضعاف: في حال الخسارة -1 هجوم للخصم
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Misdirection: (state, isPlayer) => {
    // التضليل: دبل كل النيرفات على الخصم
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  StealAbility: (state, isPlayer) => {
    // سرقة الخاصية
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  Rescue: (state, isPlayer) => {
    // الانقاذ: تعطي دفاع الكرت الحالي للكرت القادم
    // يتم تطبيق هذا التأثير على الكرت القادم
    return { newEffects: [] };
  },
  Trap: (state, isPlayer) => {
    // الفخ: قبل الراوند
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  ConvertDebuffsToBuffs: (state, isPlayer) => {
    // حول النيرفات عليك لبفات
    // يتم تطبيق هذا الإجراء مباشرة في GameContext
    return { newEffects: [] };
  },
  Sniping: (state, isPlayer) => {
    // القنص: اختار راوند معين لقنص الخصم
    // تتطلب واجهة مستخدم لاختيار الجولة
    return { newEffects: [] };
  },
  Merge: (state, isPlayer) => {
    // الدمج: ادمج كرتك مع كرتك السابق بدون خاصية
    // يتم تطبيق هذا التأثير على الكرت الحالي
    return { newEffects: [] };
  },
  DoubleNextCards: (state, isPlayer) => {
    // المضاعفة: ضاعف نقاط كرتين من الدور القادم
    // يتم تطبيق هذا التأثير على الكرتين القادمين
    return { newEffects: [] };
  },
  Deprivation: (state, isPlayer) => {
    // السلب: اسلب الخصم من البفات
    // يتم تطبيق هذا الإجراء مباشرة في GameContext
    return { newEffects: [] };
  },
  Greed: (state, isPlayer) => {
    // الجشع: في حال الفوز +1 هجوم لكل الكروت لك
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  Dilemma: (state, isPlayer) => {
    // الوهقه: بدل كرت الخصم بكرت سابق لك
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  Subhan: (state, isPlayer) => {
    // الصبحان: توقع هجوم الكرت القادم للخصم +5 او اقل , اذا توقعك صحيح تفوز
    // تتطلب واجهة مستخدم للتوقع
    return { newEffects: [] };
  },
  Propaganda: (state, isPlayer) => {
    // بروباغاندا: اختار فئة واحدة للخصم بدون العناصر -2 هجوم و دفاع
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  DoubleYourBuffs: (state, isPlayer) => {
    // دبل البفات لك
    // يتم تطبيق هذا الإجراء مباشرة في GameContext
    return { newEffects: [] };
  },
  Avatar: (state, isPlayer) => {
    const target = isPlayer ? 'player' : 'bot';
    const effect: ActiveEffect = {
      type: 'buff',
      target: target,
      stat: 'all-stats',
      value: 2,
      roundsLeft: 1,
      sourceAbility: 'Avatar',
    };
    return { newEffects: [effect] };
  },
  Penetration: (state, isPlayer) => {
    const target = isPlayer ? 'bot' : 'player';
    const effect: ActiveEffect = {
      type: 'debuff',
      target: target,
      stat: 'defense',
      value: -Infinity, // القيمة -Infinity تعني أن الدفاع سيصبح 0
      roundsLeft: 1,
      sourceAbility: 'Penetration',
    };
    return { newEffects: [effect] };
  },
  Pool: (state, isPlayer) => {
    // المسبح: اغراق كرت الخصم وبقاء تأثير كرتك
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
  },
  Conversion: (state, isPlayer) => {
    // التحويل: حول بفات الخصم لنيرفات
    // يتم تطبيق هذا الإجراء مباشرة في GameContext
    return { newEffects: [] };
  },
  Shield: (state, isPlayer) => {
    // الدرع: حماية من الخسارة و الخاصية
    // يتم تطبيق هذا التأثير على الكرت الحالي
    return { newEffects: [] };
  },
  SwapClass: (state, isPlayer) => {
    // بدل فئة واحده من عندك مع فئة واحده من خصمك
    // يتم تطبيق هذا التأثير على الكرت الحالي
    return { newEffects: [] };
  },
  TakeIt: (state, isPlayer) => {
    // خذها وانا بو مبارك: اعطي النيرفات للخصم
    // يتم تطبيق هذا الإجراء مباشرة في GameContext
    return { newEffects: [] };
  },
  Skip: (state, isPlayer) => {
    // سكب: يسكب الدور بدون اي تأثير عاللعب
    // يتم تطبيق هذا الإجراء مباشرة في GameContext
    return { newEffects: [] };
  },
  AddElement: (state, isPlayer) => {
    // اضافة عنصر لأي كرت
    // يتم تطبيق هذا التأثير على الكرت الحالي
    return { newEffects: [] };
  },
  Explosion: (state, isPlayer) => {
    // الانفجار: في حال الخسارة -1 دفاع لكل كروت الخصم
    // يتم تطبيق هذا التأثير بعد الجولة
    return { newEffects: [] };
  },
  DoublePoints: (state, isPlayer) => {
    // دبل النقاط: قبل الراوند
    // يتم تطبيق هذا التأثير على الكرت الحالي
    return { newEffects: [] };
  },
  ElementalMastery: (state, isPlayer) => {
    // إتقان العناصر
    return { newEffects: [] };
  },
};

// دالة تنفيذ القدرة لم تعد تستخدم، سيتم استبدالها بدالة executeManualAbility


// دالة تنفيذ القدرة اليدوية

