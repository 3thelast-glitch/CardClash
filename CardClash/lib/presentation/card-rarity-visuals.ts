import type { CardRarity } from '../game/types';

export type RarityOrnament = 'steel' | 'sapphire' | 'amethyst' | 'crown' | 'prism';
export type RarityMotionPolicy = 'quiet' | 'focus' | 'reveal';

export interface CardRarityVisual {
  readonly id: CardRarity;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly symbol: string;
  readonly color: string;
  readonly rimGradient: readonly [string, string, string];
  readonly insetColor: string;
  readonly surfaceGradient: readonly [string, string];
  readonly badgeBackground: string;
  readonly borderWidth: number;
  readonly glowColor?: string;
  readonly shadowOpacity: number;
  readonly shadowRadius: number;
  readonly ornament: RarityOrnament;
  readonly motion: RarityMotionPolicy;
}

/**
 * Canonical rarity presentation for character and ability cards.
 * Gameplay code owns rarity identity; this module only owns presentation.
 */
export const CARD_RARITY_VISUALS = {
  common: {
    id: 'common',
    labelAr: 'عادي',
    labelEn: 'COMMON',
    symbol: '◆',
    color: '#A8B4C7',
    rimGradient: ['#D5DCE7', '#A8B4C7', '#536176'],
    insetColor: 'rgba(213,220,231,0.28)',
    surfaceGradient: ['#182437', '#0E1725'],
    badgeBackground: 'rgba(8,13,22,0.82)',
    borderWidth: 1,
    shadowOpacity: 0.24,
    shadowRadius: 9,
    ornament: 'steel',
    motion: 'quiet',
  },
  rare: {
    id: 'rare',
    labelAr: 'نادر',
    labelEn: 'RARE',
    symbol: '◇',
    color: '#60A5FA',
    rimGradient: ['#B8D9FF', '#60A5FA', '#1D4ED8'],
    insetColor: 'rgba(96,165,250,0.34)',
    surfaceGradient: ['#142A48', '#0B182A'],
    badgeBackground: 'rgba(8,23,42,0.86)',
    borderWidth: 1.5,
    glowColor: '#60A5FA',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    ornament: 'sapphire',
    motion: 'quiet',
  },
  epic: {
    id: 'epic',
    labelAr: 'ملحمي',
    labelEn: 'EPIC',
    symbol: '✦',
    color: '#C084FC',
    rimGradient: ['#E9D5FF', '#C084FC', '#7E22CE'],
    insetColor: 'rgba(192,132,252,0.38)',
    surfaceGradient: ['#2B1746', '#130D23'],
    badgeBackground: 'rgba(28,13,48,0.88)',
    borderWidth: 2,
    glowColor: '#C084FC',
    shadowOpacity: 0.38,
    shadowRadius: 15,
    ornament: 'amethyst',
    motion: 'focus',
  },
  legendary: {
    id: 'legendary',
    labelAr: 'أسطوري',
    labelEn: 'LEGENDARY',
    symbol: '♛',
    color: '#F4C96A',
    rimGradient: ['#FFF0B0', '#F4C96A', '#9A651F'],
    insetColor: 'rgba(244,201,106,0.42)',
    surfaceGradient: ['#2C210D', '#100D08'],
    badgeBackground: 'rgba(32,23,5,0.90)',
    borderWidth: 2.5,
    glowColor: '#F4C96A',
    shadowOpacity: 0.44,
    shadowRadius: 18,
    ornament: 'crown',
    motion: 'reveal',
  },
  special: {
    id: 'special',
    labelAr: 'خاص',
    labelEn: 'SPECIAL',
    symbol: '◈',
    color: '#F0ABFC',
    rimGradient: ['#FAE8FF', '#F0ABFC', '#8B5CF6'],
    insetColor: 'rgba(240,171,252,0.38)',
    surfaceGradient: ['#291A34', '#0F0B17'],
    badgeBackground: 'rgba(32,13,40,0.90)',
    borderWidth: 2.5,
    glowColor: '#F0ABFC',
    shadowOpacity: 0.42,
    shadowRadius: 18,
    ornament: 'prism',
    motion: 'reveal',
  },
} as const satisfies Record<CardRarity, CardRarityVisual>;

export const RARITY_BASE_COLORS = {
  common: CARD_RARITY_VISUALS.common.color,
  rare: CARD_RARITY_VISUALS.rare.color,
  epic: CARD_RARITY_VISUALS.epic.color,
  legendary: CARD_RARITY_VISUALS.legendary.color,
  special: CARD_RARITY_VISUALS.special.color,
} as const satisfies Record<CardRarity, string>;

export function getCardRarityVisual(rarity?: CardRarity): CardRarityVisual {
  return CARD_RARITY_VISUALS[rarity ?? 'common'];
}
