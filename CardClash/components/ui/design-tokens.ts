import { RARITY_BASE_COLORS } from '../../lib/presentation/card-rarity-visuals';

/**
 * Obsidian Arcana design tokens.
 *
 * Semantic tokens are the source of truth. Legacy aliases remain so the
 * existing screens can migrate incrementally without changing gameplay code.
 * Rarity colors are derived from the typed card presentation registry.
 */
export const SEMANTIC_COLOR = {
  background: {
    base: '#080D16',
    arena: '#0B1422',
  },
  surface: {
    default: '#131E2F',
    raised: '#1B2A40',
  },
  border: {
    subtle: '#2B3D55',
    active: '#39E6D0',
  },
  accent: {
    primary: '#39E6D0',
    secondary: '#8DA4FF',
  },
  text: {
    primary: '#F3F6FC',
    secondary: '#B7C4D8',
    inverse: '#061318',
  },
  status: {
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#FB7185',
  },
  rarity: RARITY_BASE_COLORS,
} as const;

export const RARITY_COLOR = RARITY_BASE_COLORS;

/**
 * Compatibility palette. New code should prefer SEMANTIC_COLOR.
 * The misleading gold aliases intentionally point to teal until all legacy
 * consumers are migrated.
 */
export const COLOR = {
  bgDeep: SEMANTIC_COLOR.background.base,
  bgArena: SEMANTIC_COLOR.background.arena,
  bgCard: SEMANTIC_COLOR.surface.default,
  surfaceRaised: SEMANTIC_COLOR.surface.raised,
  borderSubtle: SEMANTIC_COLOR.border.subtle,
  primary: SEMANTIC_COLOR.accent.primary,
  secondary: SEMANTIC_COLOR.accent.secondary,
  gold: SEMANTIC_COLOR.accent.primary,
  goldAccent: '#9CFFF2',
  goldDim: 'rgba(57,230,208,0.32)',
  goldFill: 'rgba(57,230,208,0.12)',
  textPrimary: SEMANTIC_COLOR.text.primary,
  textMuted: SEMANTIC_COLOR.text.secondary,
  green: SEMANTIC_COLOR.status.success,
  amber: SEMANTIC_COLOR.status.warning,
  red: SEMANTIC_COLOR.status.danger,
  gray: '#6B7C93',
  white: '#FFFFFF',

  // Legacy elemental accents retained for old effects.
  fire: '#FF6B45',
  water: '#60A5FA',
  earth: '#4ADE80',
  light: SEMANTIC_COLOR.rarity.legendary,
  lightning: '#A78BFA',
  ice: '#67E8F9',
} as const;

export const SPACE = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 32,
  full: 999,
} as const;

export const FONT_FAMILY = {
  regular: 'NotoKufiArabic_400Regular',
  medium: 'NotoKufiArabic_600SemiBold',
  semibold: 'NotoKufiArabic_600SemiBold',
  bold: 'NotoKufiArabic_900Black',
  latin: 'RobotoCondensed_400Regular',
  latinBold: 'RobotoCondensed_700Bold',
  display: 'DG-Bold',
} as const;

export const FONT = {
  xs: 12,
  sm: 14,
  md: 16,
  base: 18,
  lg: 22,
  xl: 26,
  xxl: 30,
  hero: 36,
} as const;

export const LINE_HEIGHT = {
  xs: 18,
  sm: 22,
  md: 25,
  base: 28,
  lg: 34,
  xl: 40,
  hero: 48,
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  active: {
    shadowColor: SEMANTIC_COLOR.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  gold: {
    shadowColor: SEMANTIC_COLOR.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
} as const;

export const GLASS_PANEL = {
  backgroundColor: 'rgba(19,30,47,0.92)',
  borderRadius: RADIUS.lg,
  borderWidth: 1,
  borderColor: SEMANTIC_COLOR.border.subtle,
  ...SHADOW.card,
} as const;

export const TOUCH_TARGET = {
  compact: 44,
  default: 48,
  large: 52,
} as const;
