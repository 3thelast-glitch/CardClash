/**
 * constants/abilities.ts
 * Centralised labels, emoji maps, and type lists used across the app.
 */

// ─── Element advantage type ───────────────────────────────────────────────────
export type ElementAdvantage = 'strong' | 'weak' | 'neutral';

// ─── Element emoji map ────────────────────────────────────────────────────────
export const ELEMENT_EMOJI: Record<string, string> = {
  fire:      '🔥',
  water:     '💧',
  earth:     '🌍',
  wind:      '🌪️',
  lightning: '⚡',
  ice:       '❄️',
  light:     '✨',
  dark:      '🌑',
  nature:    '🌿',
  metal:     '⚙️',
  void:      '🕳️',
  spirit:    '👻',
};

// ─── Element labels (Arabic) ──────────────────────────────────────────────────
export const ELEMENT_LABELS: Record<string, string> = {
  fire:      '🔥 نار',
  water:     '💧 ماء',
  earth:     '🌍 أرض',
  wind:      '🌪️ ريح',
  lightning: '⚡ برق',
  ice:       '❄️ جليد',
  light:     '✨ نور',
  dark:      '🌑 ظلام',
  nature:    '🌿 طبيعة',
  metal:     '⚙️ معدن',
  void:      '🕳️ فراغ',
  spirit:    '👻 روح',
};

export const ALL_ELEMENTS = Object.keys(ELEMENT_LABELS);

// ─── Card class labels (Arabic) ───────────────────────────────────────────────
export const CLASS_LABELS: Record<string, string> = {
  swordsman:  '⚔️ سياف',
  mage:       '🧙 ساحر',
  archer:     '🏹 رامي',
  warrior:    '🛡️ محارب',
  assassin:   '🗡️ مُغتال',
  healer:     '💚 مُعالج',
  tank:       '🏰 دبابة',
  beast:      '🐉 وحش',
  summoner:   '📜 مُستدعي',
  ninja:      '🥷 نينجا',
  hunter:     '🎯 صياد',
  human:      '🧑 إنسان',
  female:     '👩 أنثى',
  demon:      '😈 شيطان',
  angel:      '😇 ملاك',
  robot:      '🤖 روبوت',
  pirate:     '🏴‍☠️ قرصان',
  noble:      '👑 نبيل',
};

export const CLASS_LABELS_SHORT: Record<string, string> = {
  swordsman:  'سياف',
  mage:       'ساحر',
  archer:     'رامي',
  warrior:    'محارب',
  assassin:   'مُغتال',
  healer:     'مُعالج',
  tank:       'دبابة',
  beast:      'وحش',
  summoner:   'مُستدعي',
  ninja:      'نينجا',
  hunter:     'صياد',
  human:      'إنسان',
  female:     'أنثى',
  demon:      'شيطان',
  angel:      'ملاك',
  robot:      'روبوت',
  pirate:     'قرصان',
  noble:      'نبيل',
};

export const ALL_CLASSES = Object.keys(CLASS_LABELS);

// ─── Stat labels (Arabic) ─────────────────────────────────────────────────────
export const STAT_LABELS: Record<string, string> = {
  attack:  'هجوم',
  defense: 'دفاع',
  hp:      'صحة',
  speed:   'سرعة',
  stars:   'نجوم',
  power:   'قوة',
};
