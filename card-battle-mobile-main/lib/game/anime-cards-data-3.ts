import type { Card } from '@/lib/game/types';

// ══════════════════════════════════════════════════════════
// كروت إضافية — Batch 3
// ══════════════════════════════════════════════════════════

export const ANIME_CARDS_3: Card[] = [

  // ════════════════════════════════════════════════════
  // Demon Slayer (new)
  // ════════════════════════════════════════════════════
  {
    id: 'tanjiro_kamado',
    name: 'Tanjiro Kamado',
    nameAr: 'تانجيرو كامادو',
    attack: 16, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'water',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },
  {
    id: 'zenitsu_agatsuma',
    name: 'Zenitsu Agatsuma',
    nameAr: 'زينيتسو أغاتسوما',
    attack: 15, defense: 13,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'lightning',
  },
  {
    id: 'inosuke_hashibira',
    name: 'Inosuke Hashibira',
    nameAr: 'إينوسوكي هاشيبيرا',
    attack: 15, defense: 14,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },
  {
    id: 'mitsuri_kanroji',
    name: 'Mitsuri Kanroji',
    nameAr: 'ميتسوري كانروجي',
    attack: 16, defense: 15,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'fire',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },
  {
    id: 'shinobu_kocho',
    name: 'Shinobu Kocho',
    nameAr: 'شينوبو كوتشو',
    attack: 14, defense: 14,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Attack on Titan (new)
  // ════════════════════════════════════════════════════
  {
    id: 'mikasa_ackerman',
    name: 'Mikasa Ackerman',
    nameAr: 'ميكاسا أكرمان',
    attack: 17, defense: 15,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },
  {
    id: 'sasha_braus',
    name: 'Sasha Braus',
    nameAr: 'ساشا براوس',
    attack: 12, defense: 10,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'rare', stars: 3,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Bleach (new)
  // ════════════════════════════════════════════════════
  {
    id: 'rukia_kuchiki',
    name: 'Rukia Kuchiki',
    nameAr: 'روكيا كوتشيكي',
    attack: 14, defense: 14,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'ice',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'ice',
  },

  // ════════════════════════════════════════════════════
  // Fullmetal Alchemist
  // ════════════════════════════════════════════════════
  {
    id: 'edward_elric',
    name: 'Edward Elric',
    nameAr: 'إدوارد إلريك',
    attack: 15, defense: 13,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'earth',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },
  {
    id: 'alphonse_elric',
    name: 'Alphonse Elric',
    nameAr: 'ألفونس إلريك',
    attack: 14, defense: 16,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'earth',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },
  {
    id: 'olivier_armstrong',
    name: 'Olivier Armstrong',
    nameAr: 'أوليفييه أرمسترونغ',
    attack: 16, defense: 15,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'ice',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'ice',
  },
  {
    id: 'barry_the_chopper',
    name: 'Barry the Chopper',
    nameAr: 'باري ذا تشوبر',
    attack: 13, defense: 11,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'earth',
    tags: ['sword'], emoji: '⚔️',
    rarity: 'rare', stars: 3,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Claymore
  // ════════════════════════════════════════════════════
  {
    id: 'clare',
    name: 'Clare',
    nameAr: 'كلير',
    attack: 16, defense: 14,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Tokyo Ghoul
  // ════════════════════════════════════════════════════
  {
    id: 'kishou_arima',
    name: 'Kishou Arima',
    nameAr: 'كيشو أريما',
    attack: 18, defense: 16,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Bloodborne
  // ════════════════════════════════════════════════════
  {
    id: 'gehrman',
    name: 'Gehrman',
    nameAr: 'جيرمان',
    attack: 18, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },
  {
    id: 'lady_maria',
    name: 'Lady Maria',
    nameAr: 'ليدي ماريا',
    attack: 18, defense: 15,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'fire',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },
  {
    id: 'laurence',
    name: 'Laurence',
    nameAr: 'لورانس',
    attack: 17, defense: 15,
    gender: 'male',
    race: 'monster', cardClass: 'swordsman', element: 'fire',
    tags: ['sword'], emoji: '👹',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },

  // ════════════════════════════════════════════════════
  // Sword Art Online (new)
  // ════════════════════════════════════════════════════
  {
    id: 'alice_zuberg',
    name: 'Alice Zuberg',
    nameAr: 'أليس زوبيرغ',
    attack: 16, defense: 16,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'lightning',
  },

  // ════════════════════════════════════════════════════
  // Tolkien
  // ════════════════════════════════════════════════════
  {
    id: 'feanor',
    name: 'Fëanor',
    nameAr: 'فيانور',
    attack: 17, defense: 15,
    gender: 'male',
    race: 'elf', cardClass: 'swordsman', element: 'fire',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },

  // ════════════════════════════════════════════════════
  // Berserk (new)
  // ════════════════════════════════════════════════════
  {
    id: 'eileen_the_crow',
    name: 'Eileen the Crow',
    nameAr: 'إيلين الغراب',
    attack: 16, defense: 14,
    gender: 'female',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

];
