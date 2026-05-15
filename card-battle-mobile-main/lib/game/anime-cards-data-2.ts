import type { Card } from '@/lib/game/types';

// ══════════════════════════════════════════════════════════
// كروت إضافية — Batch 2
// ══════════════════════════════════════════════════════════

export const ANIME_CARDS_2: Card[] = [

  // ════════════════════════════════════════════════════
  // Dark Souls
  // ════════════════════════════════════════════════════
  {
    id: 'ornstein',
    name: 'Ornstein',
    nameAr: 'أورنشتاين',
    attack: 17, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'lightning',
  },
  {
    id: 'gwyn',
    name: 'Gwyn',
    nameAr: 'غوين',
    attack: 18, defense: 16,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'lightning',
  },
  {
    id: 'artorias',
    name: 'Artorias',
    nameAr: 'أرتورياس',
    attack: 18, defense: 16,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },
  {
    id: 'smough',
    name: 'Smough',
    nameAr: 'سموغ',
    attack: 16, defense: 18,
    gender: 'male',
    race: 'human', cardClass: 'fighter', element: 'earth',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Overlord
  // ════════════════════════════════════════════════════
  {
    id: 'lich_general',
    name: 'Ainz Ooal Gown',
    nameAr: 'آينز أوال غاون',
    attack: 19, defense: 17,
    gender: 'male',
    race: 'monster', cardClass: 'fighter', element: 'ice',
    tags: ['magic'], emoji: '👹',
    rarity: 'legendary', stars: 5,
    animationPreset: 'ice',
  },
  {
    id: 'pandoras_actor',
    name: "Pandora's Actor",
    nameAr: 'ممثل باندورا',
    attack: 16, defense: 15,
    gender: 'male',
    race: 'monster', cardClass: 'fighter', element: 'wind',
    tags: ['magic'], emoji: '👹',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // The Witcher
  // ════════════════════════════════════════════════════
  {
    id: 'regis',
    name: 'Regis',
    nameAr: 'ريجيس',
    attack: 15, defense: 14,
    gender: 'male',
    race: 'demon', cardClass: 'fighter', element: 'ice',
    tags: ['sword'], emoji: '😈',
    rarity: 'epic', stars: 4,
    animationPreset: 'ice',
  },
  {
    id: 'gaunter_o_dimm',
    name: "Gaunter O'Dimm",
    nameAr: 'غونثر أو ديم',
    attack: 17, defense: 17,
    gender: 'male',
    race: 'demon', cardClass: 'fighter', element: 'ice',
    tags: ['magic'], emoji: '😈',
    rarity: 'legendary', stars: 5,
    animationPreset: 'ice',
  },

  // ════════════════════════════════════════════════════
  // Vinland Saga
  // ════════════════════════════════════════════════════
  {
    id: 'floki',
    name: 'Floki',
    nameAr: 'فلوكي',
    attack: 14, defense: 12,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },
  {
    id: 'askeladd',
    name: 'Askeladd',
    nameAr: 'أسكيلاد',
    attack: 16, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },
  {
    id: 'thorfinn',
    name: 'Thorfinn',
    nameAr: 'ثورفين',
    attack: 17, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },
  {
    id: 'thorkell',
    name: 'Thorkell',
    nameAr: 'ثوركيل',
    attack: 18, defense: 14,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Gurren Lagann
  // ════════════════════════════════════════════════════
  {
    id: 'kamina',
    name: 'Kamina',
    nameAr: 'كامينا',
    attack: 16, defense: 14,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'fire',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },
  {
    id: 'lordgenome',
    name: 'Lordgenome',
    nameAr: 'لورد غينوم',
    attack: 17, defense: 16,
    gender: 'male',
    race: 'human', cardClass: 'fighter', element: 'fire',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },

  // ════════════════════════════════════════════════════
  // Neon Genesis Evangelion
  // ════════════════════════════════════════════════════
  {
    id: 'kaworu_nagisa',
    name: 'Kaworu Nagisa',
    nameAr: 'كاورو ناغيسا',
    attack: 15, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'fighter', element: 'wind',
    tags: ['magic'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Mega Man
  // ════════════════════════════════════════════════════
  {
    id: 'dr_cossack',
    name: 'Dr. Cossack',
    nameAr: 'د. كوساك',
    attack: 10, defense: 10,
    gender: 'male',
    race: 'robot', cardClass: 'fighter', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '🤖',
    rarity: 'epic', stars: 4,
    animationPreset: 'lightning',
  },
  {
    id: 'mega_man',
    name: 'Mega Man',
    nameAr: 'ميغا مان',
    attack: 15, defense: 14,
    gender: 'male',
    race: 'robot', cardClass: 'fighter', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '🤖',
    rarity: 'epic', stars: 4,
    animationPreset: 'lightning',
  },
  {
    id: 'bass',
    name: 'Bass',
    nameAr: 'باس',
    attack: 16, defense: 13,
    gender: 'male',
    race: 'robot', cardClass: 'fighter', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '🤖',
    rarity: 'epic', stars: 4,
    animationPreset: 'lightning',
  },
  {
    id: 'zero',
    name: 'Zero',
    nameAr: 'زيرو',
    attack: 17, defense: 15,
    gender: 'male',
    race: 'robot', cardClass: 'swordsman', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '🤖',
    rarity: 'legendary', stars: 5,
    animationPreset: 'lightning',
  },
  {
    id: 'sigma',
    name: 'Sigma',
    nameAr: 'سيغما',
    attack: 17, defense: 16,
    gender: 'male',
    race: 'robot', cardClass: 'swordsman', element: 'lightning',
    tags: ['sword'], emoji: '🤖',
    rarity: 'legendary', stars: 5,
    animationPreset: 'lightning',
  },

  // ════════════════════════════════════════════════════
  // Berserk
  // ════════════════════════════════════════════════════
  {
    id: 'zodd',
    name: 'Zodd',
    nameAr: 'زود',
    attack: 18, defense: 15,
    gender: 'male',
    race: 'monster', cardClass: 'swordsman', element: 'fire',
    tags: ['sword'], emoji: '👹',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },
  {
    id: 'guts',
    name: 'Guts',
    nameAr: 'غاتس',
    attack: 19, defense: 16,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'fire',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },
  {
    id: 'griffith',
    name: 'Griffith',
    nameAr: 'غريفث',
    attack: 17, defense: 17,
    gender: 'male',
    race: 'demon', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '😈',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Tolkien / Turin Turambar
  // ════════════════════════════════════════════════════
  {
    id: 'Turin_Turambar',
    name: 'Turin Turambar',
    nameAr: 'تورين تورامبار',
    attack: 17, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Monster Hunter
  // ════════════════════════════════════════════════════
  {
    id: 'the_hunter',
    name: 'The Hunter',
    nameAr: 'الصياد',
    attack: 17, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },
  {
    id: 'fatalis',
    name: 'Fatalis',
    nameAr: 'فاتاليس',
    attack: 20, defense: 17,
    gender: 'male',
    race: 'dragon', cardClass: 'fighter', element: 'fire',
    tags: ['magic'], emoji: '🐉',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },

  // ════════════════════════════════════════════════════
  // Death (Personification)
  // ════════════════════════════════════════════════════
  {
    id: 'death',
    name: 'Death',
    nameAr: 'الموت',
    attack: 20, defense: 18,
    gender: 'unknown',
    race: 'monster', cardClass: 'swordsman', element: 'ice',
    tags: ['magic'], emoji: '💀',
    rarity: 'legendary', stars: 5,
    animationPreset: 'shadow',
  },

  // ════════════════════════════════════════════════════
  // Blue Exorcist
  // ════════════════════════════════════════════════════
  {
    id: 'rin_okumura',
    name: 'Rin Okumura',
    nameAr: 'رين أوكومورا',
    attack: 16, defense: 15,
    gender: 'male',
    race: 'demon', cardClass: 'swordsman', element: 'fire',
    tags: ['sword'], emoji: '😈',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },
  {
    id: 'amaimon',
    name: 'Amaimon',
    nameAr: 'عمايمون',
    attack: 15, defense: 14,
    gender: 'male',
    race: 'demon', cardClass: 'fighter', element: 'earth',
    tags: ['sword'], emoji: '😈',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Re:Zero
  // ════════════════════════════════════════════════════
  {
    id: 'subaru_natsuki',
    name: 'Subaru Natsuki',
    nameAr: 'سوبارو ناتسوكي',
    attack: 10, defense: 8,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'rare', stars: 3,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Legend of Zelda
  // ════════════════════════════════════════════════════
  {
    id: 'ganondorf',
    name: 'Ganondorf',
    nameAr: 'غانوندورف',
    attack: 18, defense: 17,
    gender: 'male',
    race: 'monster', cardClass: 'fighter', element: 'fire',
    tags: ['magic'], emoji: '👹',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },

  // ════════════════════════════════════════════════════
  // Sword Art Online
  // ════════════════════════════════════════════════════
  {
    id: 'eugeo',
    name: 'Eugeo',
    nameAr: 'يوجيو',
    attack: 15, defense: 15,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'ice',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'ice',
  },
  {
    id: 'heathcliff_kayaba',
    name: 'Heathcliff (Kayaba)',
    nameAr: 'هيثكليف (كايابا)',
    attack: 17, defense: 17,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'lightning',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'lightning',
  },
  {
    id: 'rundelhaus',
    name: 'Rundelhaus',
    nameAr: 'روندلهاوس',
    attack: 13, defense: 11,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'fire',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'fire',
  },
  {
    id: 'nyanta',
    name: 'Nyanta',
    nameAr: 'نيانتا',
    attack: 14, defense: 13,
    gender: 'male',
    race: 'monster', cardClass: 'swordsman', element: 'wind',
    tags: ['sword', 'shield'], emoji: '👹',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Skyrim / Elder Scrolls
  // ════════════════════════════════════════════════════
  {
    id: 'paarthurnax',
    name: 'Paarthurnax',
    nameAr: 'بارثورناكس',
    attack: 18, defense: 16,
    gender: 'male',
    race: 'dragon', cardClass: 'fighter', element: 'wind',
    tags: ['magic'], emoji: '🐉',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },
  {
    id: 'alduin',
    name: 'Alduin',
    nameAr: 'ألدوين',
    attack: 20, defense: 17,
    gender: 'male',
    race: 'dragon', cardClass: 'fighter', element: 'fire',
    tags: ['magic'], emoji: '🐉',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },

  // ════════════════════════════════════════════════════
  // Fairy Tail
  // ════════════════════════════════════════════════════
  {
    id: 'igneel',
    name: 'Igneel',
    nameAr: 'إيغنيل',
    attack: 20, defense: 17,
    gender: 'male',
    race: 'dragon', cardClass: 'fighter', element: 'fire',
    tags: ['magic'], emoji: '🐉',
    rarity: 'legendary', stars: 5,
    animationPreset: 'fire',
  },
  {
    id: 'acnologia',
    name: 'Acnologia',
    nameAr: 'أكنولوجيا',
    attack: 20, defense: 18,
    gender: 'male',
    race: 'dragon', cardClass: 'fighter', element: 'lightning',
    tags: ['magic'], emoji: '🐉',
    rarity: 'legendary', stars: 5,
    animationPreset: 'lightning',
  },

  // ════════════════════════════════════════════════════
  // Iliad / Troy
  // ════════════════════════════════════════════════════
  {
    id: 'hector',
    name: 'Hector',
    nameAr: 'هيكتور',
    attack: 16, defense: 16,
    gender: 'male',
    race: 'human', cardClass: 'fighter', element: 'earth',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'legendary', stars: 5,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Binding of Isaac
  // ════════════════════════════════════════════════════
  {
    id: 'isaac',
    name: 'Isaac',
    nameAr: 'إسحاق',
    attack: 13, defense: 11,
    gender: 'male',
    race: 'human', cardClass: 'fighter', element: 'wind',
    tags: ['sword', 'shield'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'default',
  },

  // ════════════════════════════════════════════════════
  // Castlevania / Hellsing
  // ════════════════════════════════════════════════════
  {
    id: 'alucard',
    name: 'Alucard',
    nameAr: 'ألوكارد',
    attack: 18, defense: 16,
    gender: 'male',
    race: 'demon', cardClass: 'swordsman', element: 'ice',
    tags: ['sword'], emoji: '😈',
    rarity: 'legendary', stars: 5,
    animationPreset: 'ice',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    nameAr: 'دراكولا',
    attack: 19, defense: 16,
    gender: 'male',
    race: 'demon', cardClass: 'swordsman', element: 'ice',
    tags: ['magic'], emoji: '😈',
    rarity: 'legendary', stars: 5,
    animationPreset: 'ice',
  },

  // ════════════════════════════════════════════════════
  // Denji (re-entry if missing)
  // ════════════════════════════════════════════════════
  {
    id: 'denji_cs',
    name: 'Denji (CS)',
    nameAr: 'دينجي',
    attack: 16, defense: 14,
    gender: 'male',
    race: 'human', cardClass: 'swordsman', element: 'fire',
    tags: ['sword'], emoji: '⚔️',
    rarity: 'epic', stars: 4,
    animationPreset: 'fire',
  },

];
