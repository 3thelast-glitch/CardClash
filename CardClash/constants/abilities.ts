/**
 * constants/abilities.ts
 * Centralised labels, emoji maps, and type lists used across the app.
 */

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
