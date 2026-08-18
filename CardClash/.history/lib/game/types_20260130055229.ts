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
  weak: 0.75,   // -25% ضرر
  neutral: 1.0, // بدون تغيير
};

// خريطة التفوق العنصري
// fire > ice > earth > fire
export const ELEMENT_ADVANTAGES: Record<Element, Element[]> = {
  fire: ['ice'],      // النار قوية ضد الجليد
  ice: ['earth'],     // الجليد قوي ضد الأرض
  earth: ['fire'],    // الأرض قوية ضد النار
  water: [],          // الماء محايد
  lightning: [],      // البرق محايد
  wind: [],           // الريح محايدة
};

// خريطة الضعف العنصري
export const ELEMENT_WEAKNESSES: Record<Element, Element[]> = {
  fire: ['earth'],    // النار ضعيفة ضد الأرض
  ice: ['fire'],      // الجليد ضعيف ضد النار
  earth: ['ice'],     // الأرض ضعيفة ضد الجليد
  water: [],          // الماء محايد
  lightning: [],      // البرق محايد
  wind: [],           // الريح محايدة
};
