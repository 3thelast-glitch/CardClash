/**
 * Card rarity helpers.
 *
 * The visual source of truth lives in lib/presentation/card-rarity-visuals.ts.
 * This module keeps the legacy RarityConfig API for existing consumers while
 * preventing a second palette from drifting away from the design system.
 */
import type { CardRarity } from './types';
import {
  CARD_RARITY_VISUALS,
  getCardRarityVisual,
  type CardRarityVisual,
} from '@/lib/presentation/card-rarity-visuals';

export interface RarityConfig {
  /** Gradient color stops for card background */
  gradient: readonly [string, string, string];
  /** Primary border color */
  borderColor: string;
  /** Border width in dp */
  borderWidth: number;
  /** Glow / shadow color (undefined = no glow) */
  glowColor: string | undefined;
  /** Shadow radius for 3D depth */
  shadowRadius: number;
  /** Shadow opacity for 3D depth */
  shadowOpacity: number;
  /** Whether a focused/revealed card may render a short rim flourish */
  hasPulsingGlow: boolean;
  /** Kept for compatibility. Continuous per-card particles are disabled. */
  hasParticles: boolean;
  /** Arabic rarity label */
  label: string;
  /** Display colour for the badge pill */
  badgeColor: string;
  /** Full typed visual record for new consumers. */
  visual: CardRarityVisual;
}

function legacyAdapter(rarity: CardRarity): RarityConfig {
  const visual = CARD_RARITY_VISUALS[rarity];
  return {
    gradient: visual.rimGradient,
    borderColor: visual.color,
    borderWidth: visual.borderWidth,
    glowColor: visual.glowColor,
    shadowRadius: visual.shadowRadius,
    shadowOpacity: visual.shadowOpacity,
    hasPulsingGlow: visual.motion !== 'quiet',
    hasParticles: false,
    label: visual.labelAr,
    badgeColor: visual.color,
    visual,
  };
}

export const RARITY_CONFIG = {
  common: legacyAdapter('common'),
  rare: legacyAdapter('rare'),
  epic: legacyAdapter('epic'),
  legendary: legacyAdapter('legendary'),
  special: legacyAdapter('special'),
} as const satisfies Record<CardRarity, RarityConfig>;

/** Resolve rarity with a safe fallback. */
export function getRarityConfig(rarity?: CardRarity): RarityConfig {
  return RARITY_CONFIG[rarity ?? 'common'];
}

export { getCardRarityVisual };

/** Resolve rarity directly from star count. */
export function getRarityFromStars(stars?: number): CardRarity {
  if (!stars || stars <= 2) return 'common';
  if (stars === 3) return 'rare';
  if (stars === 4) return 'epic';
  return 'legendary';
}
