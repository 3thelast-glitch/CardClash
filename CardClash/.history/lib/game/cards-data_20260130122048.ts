import { Card, Element, ElementAdvantage, ELEMENT_ADVANTAGES, ELEMENT_WEAKNESSES, ELEMENT_MULTIPLIER } from './types';

export const ALL_CARDS: Card[] = [
  // البشر
  {
    id: 'human-warrior',
    name: 'Human Warrior',
    nameAr: 'المحارب البشري',
    hp: 100,
    attack: 28,
    defense: 18,
    speed: 12,
    race: 'human',
    cardClass: 'warrior',
    element: 'fire',
    tags: ['sword'],
    emoji: '⚔️',
  },
  {
    id: 'human-knight',
    name: 'Human Knight',
    nameAr: 'الفارس البشري',
    hp: 120,
    attack: 25,
    defense: 25,
    speed: 10,
    race: 'human',
    cardClass: 'knight',
    element: 'earth',
    tags: ['sword', 'shield'],
    emoji: '🛡️',
  },
  // الجن
  {
    id: 'elf-archer',
    name: 'Elf Archer',
    nameAr: 'الرامي الجني',
    hp: 80,
    attack: 32,
    defense: 12,
    speed: 18,
    race: 'elf',
    cardClass: 'archer',
    element: 'wind',
    tags: ['bow'],
    emoji: '🏹',
  },
  {
    id: 'elf-mage',
    name: 'Elf Mage',
    nameAr: 'الساحر الجني',
    hp: 70,
    attack: 20,
    defense: 10,
    speed: 16,
    race: 'elf',
    cardClass: 'mage',
    element: 'lightning',
    tags: ['magic'],
    emoji: '🔮',
  },
  // الأورك
  {
    id: 'orc-berserker',
    name: 'Orc Berserker',
    nameAr: 'البيرسركر الأورك',
    hp: 110,
    attack: 35,
    defense: 10,
    speed: 8,
    race: 'orc',
    cardClass: 'berserker',
    element: 'fire',
    tags: ['sword'],
    emoji: '🗡️',
  },
  {
    id: 'orc-warrior',
    name: 'Orc Warrior',
    nameAr: 'المحارب الأورك',
    hp: 130,
    attack: 30,
    defense: 15,
    speed: 7,
    race: 'orc',
    cardClass: 'warrior',
    element: 'earth',
    tags: ['sword', 'shield'],
    emoji: '⚔️',
  },
  // التنانين
  {
    id: 'dragon-mage',
    name: 'Dragon Mage',
    nameAr: 'ساحر التنين',
    hp: 90,
    attack: 38,
    defense: 14,
    speed: 14,
    race: 'dragon',
    cardClass: 'mage',
    element: 'fire',
    tags: ['magic', 'crown'],
    emoji: '🐉',
  },
  {
    id: 'dragon-knight',
    name: 'Dragon Knight',
    nameAr: 'فارس التنين',
    hp: 140,
    attack: 28,
    defense: 28,
    speed: 12,
    race: 'dragon',
    cardClass: 'knight',
    element: 'fire',
    tags: ['sword', 'shield', 'crown'],
    emoji: '🐲',
  },
  // الشياطين
  {
    id: 'demon-berserker',
    name: 'Demon Berserker',
    nameAr: 'البيرسركر الشيطاني',
    hp: 85,
    attack: 40,
    defense: 8,
    speed: 15,
    race: 'demon',
    cardClass: 'berserker',
    element: 'fire',
    tags: ['sword'],
    emoji: '😈',
  },
  {
    id: 'demon-mage',
    name: 'Demon Mage',
    nameAr: 'الساحر الشيطاني',
    hp: 75,
    attack: 36,
    defense: 6,
    speed: 17,
    race: 'demon',
    cardClass: 'mage',
    element: 'lightning',
    tags: ['magic'],
    emoji: '👿',
  },
  // الموتى الأحياء
  {
    id: 'undead-knight',
    name: 'Undead Knight',
    nameAr: 'الفارس الميت',
    hp: 150,
    attack: 22,
    defense: 30,
    speed: 5,
    race: 'undead',
    cardClass: 'knight',
    element: 'ice',
    tags: ['sword', 'shield'],
    emoji: '💀',
  },
  {
    id: 'undead-paladin',
    name: 'Undead Paladin',
    nameAr: 'البالادين الميت',
    hp: 120,
    attack: 25,
    defense: 22,
    speed: 9,
    race: 'undead',
    cardClass: 'paladin',
    element: 'ice',
    tags: ['sword', 'shield', 'magic'],
    emoji: '👻',
  },
];

// دالة للحصول على بطاقات عشوائية للبوت
export function getRandomCards(count: number): Card[] {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// دالة لحساب الضرر الأساسي
export function calculateBaseDamage(attacker: Card, defender: Card): number {
  const damage = attacker.attack - defender.defense;
  return Math.max(0, damage);
}

// دالة لتحديد التفوق العنصري
export function getElementAdvantage(attackerElement: Element, defenderElement: Element): ElementAdvantage {
  // التحقق من التفوق
  if (ELEMENT_ADVANTAGES[attackerElement]?.includes(defenderElement)) {
    return 'strong';
  }
  // التحقق من الضعف
  if (ELEMENT_WEAKNESSES[attackerElement]?.includes(defenderElement)) {
    return 'weak';
  }
  return 'neutral';
}

// دالة لحساب الضرر مع تأثير العناصر
export function applyActiveEffects(card: Card, effects: ActiveEffect[] = []): Card {
  let modifiedCard = { ...card };

  if (!effects || effects.length === 0) {
    return modifiedCard;
  }

  effects.forEach(effect => {
    if (effect.stat === 'attack') {
      modifiedCard.attack += effect.value;
    } else if (effect.stat === 'defense') {
      modifiedCard.defense += effect.value;
    } else if (effect.stat === 'hp') {
      modifiedCard.hp += effect.value;
    }
    // يمكن إضافة منطق لـ 'all' و 'ability' لاحقاً
  });

  // التأكد من أن القيم لا تقل عن الصفر
  modifiedCard.attack = Math.max(0, modifiedCard.attack);
  modifiedCard.defense = Math.max(0, modifiedCard.defense);
  modifiedCard.hp = Math.max(0, modifiedCard.hp);

  return modifiedCard;
}

export function calculateDamage(attacker: Card, defender: Card): { damage: number; baseDamage: number; advantage: ElementAdvantage } {
  const baseDamage = calculateBaseDamage(attacker, defender);
  const advantage = getElementAdvantage(attacker.element, defender.element);
  const multiplier = ELEMENT_MULTIPLIER[advantage];
  const damage = Math.round(baseDamage * multiplier);
  
  return { damage, baseDamage, advantage };
}

// دالة لتحديد الفائز في الجولة
export function determineRoundWinner(
  playerCard: Card,
  botCard: Card,
  playerEffects: ActiveEffect[], // التأثيرات النشطة على اللاعب
  botEffects: ActiveEffect[] // التأثيرات النشطة على البوت
): { 
  winner: 'player' | 'bot' | 'draw'; 
  playerDamage: number; 
  botDamage: number;
  playerBaseDamage: number;
  botBaseDamage: number;
  playerElementAdvantage: ElementAdvantage;
  botElementAdvantage: ElementAdvantage;
} {
  // تطبيق التأثيرات على البطاقات الحالية
  const modifiedPlayerCard = applyActiveEffects(playerCard, playerEffects);
  const modifiedBotCard = applyActiveEffects(botCard, botEffects);

  // الضرر الذي يسببه اللاعب للبوت
  const playerResult = calculateDamage(modifiedPlayerCard, modifiedBotCard);
  // الضرر الذي يسببه البوت للاعب
  const botResult = calculateDamage(modifiedBotCard, modifiedPlayerCard);

  let winner: 'player' | 'bot' | 'draw';
  if (playerResult.damage > botResult.damage) {
    winner = 'player';
  } else if (botResult.damage > playerResult.damage) {
    winner = 'bot';
  } else {
    winner = 'draw';
  }

  return { 
    winner, 
    playerDamage: playerResult.damage, 
    botDamage: botResult.damage,
    playerBaseDamage: playerResult.baseDamage,
    botBaseDamage: botResult.baseDamage,
    playerElementAdvantage: playerResult.advantage,
    botElementAdvantage: botResult.advantage,
  };
}
