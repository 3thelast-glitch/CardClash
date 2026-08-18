// أنواع البطاقات والإحصائيات

export type Race = 'human' | 'elf' | 'orc' | 'dragon' | 'demon' | 'undead';

export type CardClass = 'warrior' | 'knight' | 'mage' | 'archer' | 'berserker' | 'paladin';

export type Element = 'fire' | 'ice' | 'water' | 'earth' | 'lightning' | 'wind';

export type Tag = 'sword' | 'shield' | 'magic' | 'bow' | 'crown';

export interface Card {
  id: string;
  name: string;
  nameAr: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  race: Race;
  cardClass: CardClass;
  element: Element;
  tags: Tag[];
  emoji: string;
  videoUrl?: string; // رابط الفيديو للقدرة الخاصة
}

export type AbilityType =
  | 'LogicalEncounter' // مصادفة منطقية (توقع نتيجة دورين قادمين)
  | 'Recall' // استدعاء (كرت سابق لك بدون خاصية)
  | 'Protection' // حماية (تحمي نفسك من خسارة نقطة صحة)
  | 'Arise' // أرايز (استدعي كرت من كروت خصمك)
  | 'Reinforcement' // التدعيم (في حال الفوز +1 دفاع لكل الكروت لك)
  | 'Wipe' // المسح (امسح اي تأثيرات عليك فاللعبة)
  | 'Purge' // التطهير (نظف كل التأثيرات فاللعبة)
  | 'HalvePoints' // تنصيف النقاط (خصم نقاط الكرت للنصف)
  | 'Seal' // الختم (اختم قدرة لمدة 5 جولات)
  | 'DoubleOrNothing' // دبل أو نثنق (قبل الراوند)
  | 'StarSuperiority' // تفوق النجوم (كل كروتك تتفوق بالنجوم على الخصم)
  | 'Reduction' // التقليص (-2 لكل عناصر الخصم)
  | 'Sacrifice' // تضحية (تشيل خاصية خصم في حال الخسارة)
  | 'Popularity' // الشعبية (اغلب الشات يختار رقم راوند تفوز فيه)
  | 'Eclipse' // الخسوف (هجوم خصمك 0 بدون البفات)
  | 'CancelAbility' // الغاء خاصية (ألغِ قدرة الخصم)
  | 'Revive' // إنعاش (كرت سابق لك بنصف طاقاته مع الخاصية)
  | 'Shambles' // شامبلز (بدل الطاقات بدون الخاصيات)
  | 'ConsecutiveLossBuff' // تعزيز الخسارة (خسارة جولتين +1 هجوم ودفاع)
  | 'Lifesteal' // سرقة الحياة (مع الفوز ترجع نقطة صحة)
  | 'Revenge' // الانتقام (في حال الخسارة +1 هجوم لكل الكروت لك)
  | 'Suicide' // الانتحار (مع الخسارة ينقص الخصم نقطة)
  | 'Disaster' // النكبة (بدل كرت الخصم بكرت سابق له)
  | 'Compensation' // التعويض (في حال الخسارة +1 دفاع لكل الكروت لك)
  | 'Weakening' // الإضعاف (في حال الخسارة -1 هجوم للخصم)
  | 'Misdirection' // التضليل (دبل كل النيرفات على الخصم)
  | 'StealAbility' // سرقة الخاصية (اسرق قدرة من الخصم)
  | 'Rescue' // الإنقاذ (تعطي دفاع الكرت الحالي للكرت القادم)
  | 'Trap' // الفخ (قبل الراوند)
  | 'ConvertDebuffsToBuffs' // تحويل السلبيات (حول النيرفات عليك لبفات)
  | 'Sniping' // القنص (اختار راوند معين لقنص الخصم)
  | 'Merge' // الدمج (ادمج كرتك مع كرتك السابق بدون خاصية)
  | 'DoubleNextCards' // المضاعفة (ضاعف نقاط كرتين من الدور القادم)
  | 'Deprivation' // السلب (اسلب الخصم من البفات)
  | 'Greed' // الجشع (في حال الفوز +1 هجوم لكل الكروت لك)
  | 'Dilemma' // الوهقة (بدل كرت الخصم بكرت سابق لك)
  | 'Subhan' // الصبحان (توقع هجوم الكرت القادم للخصم)
  | 'Propaganda' // بروباغاندا (اختار فئة واحدة للخصم -2 هجوم ودفاع)
  | 'DoubleYourBuffs' // مضاعفة البفات (دبل البفات لك)
  | 'Avatar' // أفاتار (+2 لكل العناصر لك)
  | 'Penetration' // الاختراق (نقاط دفاع الخصم 0)
  | 'Pool' // المسبح (اغراق كرت الخصم وبقاء تأثير كرتك)
  | 'Conversion' // التحويل (حول بفات الخصم لنيرفات)
  | 'Shield' // الدرع (حماية من الخسارة والخاصية)
  | 'SwapClass' // تبديل الفئة (بدل فئة واحدة من عندك مع فئة من خصمك)
  | 'TakeIt' // خذها وأنا بو مبارك (اعطي النيرفات للخصم)
  | 'Skip' // تخطي (يسكب الدور بدون اي تأثير عاللعب)
  | 'AddElement' // إضافة عنصر (اضف عنصر لأي كرت)
  | 'Explosion' // الانفجار (في حال الخسارة -1 دفاع لكل كروت الخصم)
  | 'DoublePoints' // مضاعفة النقاط (دبل النقاط قبل الراوند)
  | 'ElementalMastery'; // إتقان العناصر (تفوق عنصري كامل)

export interface ActiveEffect {
  type: 'buff' | 'debuff' | 'seal';
  target: 'player' | 'bot' | 'all';
  stat: 'attack' | 'defense' | 'hp' | 'all' | 'ability';
  value: number; // قيمة التأثير (للهجوم والدفاع)
  roundsLeft: number; // عدد الجولات المتبقية
  sourceAbility: AbilityType; // القدرة التي سببت التأثير
}

export interface GameState {
  playerDeck: Card[];
  botDeck: Card[];
  currentRound: number;
  totalRounds: number;
  playerScore: number;
  botScore: number;
  roundResults: RoundResult[];
  difficulty: 'easy' | 'medium' | 'hard';
  activeEffects: ActiveEffect[]; // قائمة التأثيرات النشطة
  playerAbilities: AbilityState[]; // القدرات الممنوحة للاعب
  botAbilities: AbilityState[]; // القدرات الممنوحة للبوت
  usedAbilities: AbilityType[]; // القدرات التي تم استخدامها بالفعل
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

// ثوابت الإحصائيات
export const RACE_EMOJI: Record<Race, string> = {
  human: '👤',
  elf: '🧝',
  orc: '👹',
  dragon: '🐉',
  demon: '😈',
  undead: '💀',
};

export const CLASS_EMOJI: Record<CardClass, string> = {
  warrior: '⚔️',
  knight: '🛡️',
  mage: '🔮',
  archer: '🏹',
  berserker: '🗡️',
  paladin: '💪',
};

export const ELEMENT_EMOJI: Record<Element, string> = {
  fire: '🔥',
  ice: '❄️',
  water: '💧',
  earth: '🌍',
  lightning: '⚡',
  wind: '💨',
};

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ef4444',
  ice: '#38bdf8',
  water: '#3b82f6',
  earth: '#a3e635',
  lightning: '#facc15',
  wind: '#a78bfa',
};

// نظام تأثيرات العناصر
// النار > الجليد > الأرض > النار (دورة)
export type ElementAdvantage = 'strong' | 'weak' | 'neutral';

// مضاعف الضرر عند التفوق العنصري
export const ELEMENT_MULTIPLIER = {
  strong: 1.25, // +25% ضرر
  weak: 0.75, // -25% ضرر
  neutral: 1.0, // بدون تغيير
};

// خريطة التفوق العنصري
// fire > ice > earth > fire
export const ELEMENT_ADVANTAGES: Record<Element, Element[]> = {
  fire: ['ice'], // النار قوية ضد الجليد
  ice: ['earth'], // الجليد قوي ضد الأرض
  earth: ['fire'], // الأرض قوية ضد النار
  water: [], // الماء محايد
  lightning: [], // البرق محايد
  wind: [], // الريح محايدة
};

// خريطة الضعف العنصري
export const ELEMENT_WEAKNESSES: Record<Element, Element[]> = {
  fire: ['earth'], // النار ضعيفة ضد الأرض
  ice: ['fire'], // الجليد ضعيف ضد النار
  earth: ['ice'], // الأرض ضعيفة ضد الجليد
  water: [], // الماء محايد
  lightning: [], // البرق محايد
  wind: [], // الريح محايدة
};
