/**
 * Game Configuration Constants
 * Single source of truth for dimensions, timing, and animation parameters.
 */

import type { CardRarity } from '@/lib/game/types';

// ─── Card Dimensions ────────────────────────────────────────────────────────

export const CARD_DIMENSIONS = {
    portrait: {
        width: 160,
        height: 240,
    },
    portraitHover: {
        width: 170,
        height: 255,
    },
    landscape: {
        width: 200,
        height: 300,
    },
    small: {
        width: 90,
        height: 135,
    },
} as const;

// ─── 3D Shadow ───────────────────────────────────────────────────────────────

export const CARD_SHADOW = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 16,
    elevation: 12,
} as const;

// ─── Animation Timings (ms) ──────────────────────────────────────────────────

export const ANIMATION_TIMINGS = {
    /** Tap feedback spring duration */
    tap: 150,
    /** Card entrance slide-up + scale animation */
    summon: 400,
    /** Attack shake animation total duration */
    attack: 300,
    /** Drag drop-shadow increase transition */
    drag: 80,
    /** Glow pulse cycle half-period */
    glowPulse: 900,
    /** Damage number float + fade duration */
    damageFloat: 800,
    /** Health bar smooth transition */
    hpBar: 500,
    /** Win/lose cinematic overlay slide-in */
    cinematic: 350,
} as const;

// ─── Animation Values ────────────────────────────────────────────────────────

export const ANIMATION_VALUES = {
    /** Scale overshoot on tap */
    tapScale: 1.06,
    /** Rotation degrees on tap */
    tapRotation: 2,
    /** Summon scale peak before settling */
    summonPeak: 1.25,
    /** Shake displacement in px */
    shakeAmount: 8,
    /** Shadow radius during drag */
    dragShadowRadius: 30,
    /** Damage number rise distance in px */
    damageRise: 70,
} as const;

// ─── Rarity order (for sorting / display) ────────────────────────────────────

export const RARITY_ORDER: Record<CardRarity, number> = {
    common: 0,
    rare: 1,
    epic: 2,
    legendary: 3,
    special: 4,
} as const;

// ─── Health Bar Colors ────────────────────────────────────────────────────────

export const HP_BAR_COLORS = {
    full: '#22c55e',    // green-500
    half: '#eab308',    // yellow-500
    low: '#ef4444',     // red-500
    empty: '#1f2937',   // gray-800 (track)
} as const;

/** Returns the correct color based on fraction (0-1) */
export function hpBarColor(fraction: number): string {
    if (fraction > 0.6) return HP_BAR_COLORS.full;
    if (fraction > 0.3) return HP_BAR_COLORS.half;
    return HP_BAR_COLORS.low;
}
