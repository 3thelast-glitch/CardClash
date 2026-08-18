import { Card, AbilityType, ActiveEffect, GameState } from './types';

// قائمة بجميع القدرات المتاحة
export const ALL_ABILITIES: AbilityType[] = [
  'LogicalEncounter', // مصادفة منطقية
  'Recall', // استدعاء
  'Protection', // حماية
  'Arise', // أرايز
  'Reinforcement', // التدعيم
  'Wipe', // المسح
  'Purge', // التطهير
  'HalvePoints', // خصم نقاط الكرت للنصف
  'Seal', // الختم
  'DoubleOrNothing', // دبل أور نثنق
  'StarSuperiority', // كل كروتك تتفوق بالنجوم على الخصم
  'Reduction', // التقليص
  'Sacrifice', // تضحية
  'Popularity', // الشعبية
  'Eclipse', // الخسف
  'CancelAbility', // الغاء خاصية
  'Revive', // إنعاش
  'Shambles', // شامبلز
  'ConsecutiveLossBuff', // في حال خسارة جولتين متتاليتين
  'Lifesteal', // اللايف ستيل
  'Revenge', // الانتقام
  'Suicide', // الانتحار
  'Disaster', // النكبة
  'Compensation', // التعويض
  'Weakening', // الإضعاف
  'Misdirection', // التضليل
  'StealAbility', // سرقة الخاصية
  'Rescue', // الانقاذ
  'Trap', // الفخ
  'ConvertDebuffsToBuffs', // حول النيرفات عليك لبفات
  'Sniping', // القنص
  'Merge', // الدمج
  'DoubleNextCards', // المضاعفة
  'Deprivation', // السلب
  'Greed', // الجشع
  'Dilemma', // الوهقه
  'Subhan', // الصبحان
  'Propaganda', // بروباغاندا
  'DoubleYourBuffs', // دبل البفات لك
  'Avatar', // افاتار
  'Penetration', // الاختراق
  'Pool', // المسبح
  'Conversion', // التحويل
  'Shield', // الدرع
  'SwapClass', // بدل فئة واحده من عندك مع فئة واحده من خصمك
  'TakeIt', // خذها وانا بو مبارك
  'Skip', // سكب
  'AddElement', // اضافة عنصر لأي كرت
  'Explosion', // الانفجار
  'DoublePoints', // دبل النقاط
  'ElementalMastery', // إتقان العناصر
];

// دالة لاختيار عدد محدد من القدرات العشوائية وغير المكررة
export function getRandomAbilities(count: number): AbilityType[] {
  const shuffled = [...ALL_ABILITIES].sort(() => Math.random() - 0.5);
  // نضمن عدم تكرار القدرات
  const uniqueAbilities = Array.from(new Set(shuffled));
  return uniqueAbilities.slice(0, count);
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
    // خصم نقاط الكرت للنصف
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
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
    // التقليص: -2 لكل عناصر الخصم
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
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
    // الخسف: هجوم خصمك 0 بدون البفات
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
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
    // افاتار: +2 لكل العناصر لك
    // يتم تطبيق هذا التأثير على الكرت الحالي
    return { newEffects: [] };
  },
  Penetration: (state, isPlayer) => {
    // الاختراق: نقاط دفاع الخصم 0
    // يتم تطبيق هذا التأثير على الكرت الحالي للخصم
    return { newEffects: [] };
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
export function executeAbility(
  card: Card,
  opponentCard: Card,
  state: GameState,
  isPlayer: boolean,
): AbilityExecutionResult {
  // هذه الدالة لم تعد تستخدم لأن القدرات أصبحت يدوية
  return { newEffects: [] };
}

// دالة تنفيذ القدرة اليدوية
export function executeManualAbility(
  abilityType: AbilityType,
  state: GameState,
  isPlayer: boolean,
): AbilityExecutionResult {
  const executor = abilityExecutors[abilityType];
  if (!executor) {
    console.warn(`No executor found for manual ability: ${abilityType} - abilities.ts:378`);
    return { newEffects: [] };
  }

  // التحقق من الختم (Seal)
  const sealEffect = state.activeEffects.find(
    (e) => e.type === 'seal' && e.target === (isPlayer ? 'player' : 'bot') && e.stat === 'ability'
  );

  if (sealEffect) {
    console.log(`Ability ${abilityType} is sealed for ${isPlayer ? 'player' : 'bot'} - abilities.ts:388`);
    return { newEffects: [] };
  }

  return executor(state, isPlayer);
}
