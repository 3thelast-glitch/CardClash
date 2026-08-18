import { AbilityType } from './types';

// خريطة لترجمة أسماء القدرات للعربية مع الوصف الكامل
export const ABILITY_NAMES_AR: Record<AbilityType, string> = {
  LogicalEncounter: 'مصادفة منطقية (توقع نتيجة دورين قادمين)',
  Recall: 'استدعاء (كرت سابق لك بدون خاصية)',
  Protection: 'حماية (تحمي نفسك من خسارة نقطة صحة)',
  Arise: 'أرايز (استدعي كرت من كروت خصمك)',
  Reinforcement: 'التدعيم (في حال الفوز +1 دفاع لكل الكروت لك)',
  Wipe: 'المسح (امسح اي تأثيرات عليك فاللعبة)',
  Purge: 'التطهير (نظف كل التأثيرات فاللعبة)',
  HalvePoints: 'تنصيف النقاط (خصم نقاط الكرت للنصف)',
  Seal: 'الختم (اختم قدرة لمدة 5 جولات)',
  DoubleOrNothing: 'دبل أو نثنق (قبل الراوند)',
  StarSuperiority: 'تفوق النجوم (كل كروتك تتفوق بالنجوم على الخصم)',
  Reduction: 'التقليص (-2 لكل عناصر الخصم)',
  Sacrifice: 'تضحية (تشيل خاصية خصم في حال الخسارة)',
  Popularity: 'الشعبية (اغلب الشات يختار رقم راوند تفوز فيه)',
  Eclipse: 'الخسوف (هجوم خصمك 0 بدون البفات)',
  CancelAbility: 'إلغاء الخاصية (ألغِ قدرة الخصم)',
  Revive: 'إنعاش (كرت سابق لك بنصف طاقاته مع الخاصية)',
  Shambles: 'شامبلز (بدل الطاقات بدون الخاصيات)',
  ConsecutiveLossBuff: 'تعزيز الخسارة (خسارة جولتين +1 هجوم ودفاع)',
  Lifesteal: 'سرقة الحياة (مع الفوز ترجع نقطة صحة)',
  Revenge: 'الانتقام (في حال الخسارة +1 هجوم لكل الكروت لك)',
  Suicide: 'الانتحار (مع الخسارة ينقص الخصم نقطة)',
  Disaster: 'النكبة (بدل كرت الخصم بكرت سابق له)',
  Compensation: 'التعويض (في حال الخسارة +1 دفاع لكل الكروت لك)',
  Weakening: 'الإضعاف (في حال الخسارة -1 هجوم للخصم)',
  Misdirection: 'التضليل (دبل كل النيرفات على الخصم)',
  StealAbility: 'سرقة الخاصية (اسرق قدرة من الخصم)',
  Rescue: 'الإنقاذ (تعطي دفاع الكرت الحالي للكرت القادم)',
  Trap: 'الفخ (قبل الراوند)',
  ConvertDebuffsToBuffs: 'تحويل السلبيات (حول النيرفات عليك لبفات)',
  Sniping: 'القنص (اختار راوند معين لقنص الخصم)',
  Merge: 'الدمج (ادمج كرتك مع كرتك السابق بدون خاصية)',
  DoubleNextCards: 'المضاعفة (ضاعف نقاط كرتين من الدور القادم)',
  Deprivation: 'السلب (اسلب الخصم من البفات)',
  Greed: 'الجشع (في حال الفوز +1 هجوم لكل الكروت لك)',
  Dilemma: 'الوهقة (بدل كرت الخصم بكرت سابق لك)',
  Subhan: 'الصبحان (توقع هجوم الكرت القادم للخصم)',
  Propaganda: 'بروباغاندا (اختار فئة واحدة للخصم -2 هجوم ودفاع)',
  DoubleYourBuffs: 'مضاعفة البفات (دبل البفات لك)',
  Avatar: 'أفاتار (+2 لكل العناصر لك)',
  Penetration: 'الاختراق (نقاط دفاع الخصم 0)',
  Pool: 'المسبح (اغراق كرت الخصم وبقاء تأثير كرتك)',
  Conversion: 'التحويل (حول بفات الخصم لنيرفات)',
  Shield: 'الدرع (حماية من الخسارة والخاصية)',
  SwapClass: 'تبديل الفئة (بدل فئة واحدة من عندك مع فئة من خصمك)',
  TakeIt: 'خذها وأنا بو مبارك (اعطي النيرفات للخصم)',
  Skip: 'تخطي (يسكب الدور بدون اي تأثير عاللعب)',
  AddElement: 'إضافة عنصر (اضف عنصر لأي كرت)',
  Explosion: 'الانفجار (في حال الخسارة -1 دفاع لكل كروت الخصم)',
  DoublePoints: 'مضاعفة النقاط (دبل النقاط قبل الراوند)',
  ElementalMastery: 'إتقان العناصر (تفوق عنصري كامل)',
};

// دالة للحصول على اسم القدرة بالعربية مع الوصف (الكامل)
export function getAbilityNameAr(abilityType: AbilityType): string {
  return ABILITY_NAMES_AR[abilityType] || abilityType;
}

// دالة للحصول على الاسم فقط (بدون الوصف)
export function getAbilityNameOnly(abilityType: AbilityType): string {
  const fullName = ABILITY_NAMES_AR[abilityType] || abilityType;
  return fullName.split('(')[0].trim();
}

// دالة للحصول على الوصف فقط
export function getAbilityDescription(abilityType: AbilityType): string {
  const fullName = ABILITY_NAMES_AR[abilityType] || '';
  const match = fullName.match(/\((.*)\)/);
  return match ? match[1] : '';
}
