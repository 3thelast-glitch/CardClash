/**
 * Card Gradient Definitions — Supercell Style
 *
 * Direction: Deep, saturated, dramatic.
 * Each rarity has a distinct identity — instantly recognizable.
 * Legendary feels dangerous. Epic feels powerful. Rare feels reliable.
 *
 * GRADIENT STRUCTURE (3 LinearGradient layers):
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ BASE  → full-card dark base, vertical, opacity 1.0              │
 *  │ MID   → diagonal color blend, opacity 0.70                      │
 *  │ TOP   → highlight shimmer on top 55%, opacity 0.35              │
 *  └──────────────────────────────────────────────────────────────┘
 */

import type { CardRarityName } from '@/types/card.types';

export interface CardGradientLayers {
  base: readonly [string, string, string];
  mid:  readonly [string, string, string];
  top:  readonly [string, string, string];
  flat: string;
}

// ─── Gradients ─────────────────────────────────────────────────
//
//  common    → steel blue. Solid. Grounded. No glow.
//  rare      → amber gold. Warm. Trustworthy.
//  epic      → deep violet. Mystical. Commanding.
//  legendary → crimson red. Dangerous. Elite.
//  special   → teal cyan. Prismatic. Ultra-rare.

export const CARD_GRADIENTS: Record<CardRarityName, CardGradientLayers> = {
  common: {
    flat: '#1e3358',
    base: ['#0a1628', '#1e3358', '#1a2d52'],
    mid:  ['#1e3a8a', '#1d4ed8', '#1e3358'],
    top:  ['#3b82f6', '#2563eb', 'transparent'],
  },
  rare: {
    flat: '#7c3000',
    base: ['#3d1500', '#7c3000', '#92400e'],
    mid:  ['#b45309', '#d97706', '#7c3000'],
    top:  ['#fbbf24', '#f59e0b', 'transparent'],
  },
  epic: {
    flat: '#3b0764',
    base: ['#1a0336', '#3b0764', '#4c1d95'],
    mid:  ['#6d28d9', '#7c3aed', '#3b0764'],
    top:  ['#c084fc', '#a855f7', 'transparent'],
  },
  legendary: {
    flat: '#7f0000',
    base: ['#3b0000', '#7f0000', '#991b1b'],
    mid:  ['#b91c1c', '#dc2626', '#7f0000'],
    top:  ['#ff6b6b', '#ef4444', 'transparent'],
  },
  special: {
    flat: '#003d52',
    base: ['#001520', '#003d52', '#0e7490'],
    mid:  ['#0891b2', '#06b6d4', '#003d52'],
    top:  ['#67e8f9', '#22d3ee', 'transparent'],
  },
} as const;

// ─── Borders ────────────────────────────────────────────────
export const CARD_BORDERS: Record<CardRarityName, string> = {
  common:    '#3b82f6', // steel blue
  rare:      '#f59e0b', // amber gold
  epic:      '#a855f7', // violet
  legendary: '#ef4444', // crimson
  special:   '#06b6d4', // teal
} as const;

// ─── Glows ──────────────────────────────────────────────────
export const CARD_GLOWS: Record<CardRarityName, string | null> = {
  common:    null,
  rare:      '#f59e0b',
  epic:      '#a855f7',
  legendary: '#ef4444',
  special:   '#06b6d4',
} as const;

// ─── Badge Colors ─────────────────────────────────────────
export const CARD_BADGE_COLORS: Record<CardRarityName, string> = {
  common:    '#3b82f6',
  rare:      '#f59e0b',
  epic:      '#a855f7',
  legendary: '#ef4444',
  special:   '#06b6d4',
} as const;

// ─── Rarity Labels ───────────────────────────────────────
export const CARD_RARITY_LABELS: Record<CardRarityName, { en: string; ar: string }> = {
  common:    { en: 'Common',    ar: 'عادي'    },
  rare:      { en: 'Rare',      ar: 'نادر'      },
  epic:      { en: 'Epic',      ar: 'ملحمي'      },
  legendary: { en: 'Legendary', ar: 'أسطوري' },
  special:   { en: 'Special',   ar: 'خاص'   },
} as const;

// ─── Shadow Config ───────────────────────────────────────
export interface CardShadowConfig {
  shadowRadius:  number;
  shadowOpacity: number;
}

export const CARD_SHADOWS: Record<CardRarityName, CardShadowConfig> = {
  common:    { shadowRadius: 6,  shadowOpacity: 0.30 },
  rare:      { shadowRadius: 12, shadowOpacity: 0.50 },
  epic:      { shadowRadius: 18, shadowOpacity: 0.65 },
  legendary: { shadowRadius: 26, shadowOpacity: 0.80 },
  special:   { shadowRadius: 30, shadowOpacity: 0.85 },
} as const;

// ─── Feature Flags ───────────────────────────────────────
export const CARD_HAS_GLOW: Record<CardRarityName, boolean> = {
  common:    false,
  rare:      false,
  epic:      true,
  legendary: true,
  special:   true,
} as const;

export const CARD_HAS_PARTICLES: Record<CardRarityName, boolean> = {
  common:    false,
  rare:      false,
  epic:      false,
  legendary: true,
  special:   true,
} as const;

// ─── Rarity Order ───────────────────────────────────────
export const RARITY_ORDER: Record<CardRarityName, number> = {
  common:    0,
  rare:      1,
  epic:      2,
  legendary: 3,
  special:   4,
} as const;

export function sortByRarity<T extends { rarity: CardRarityName }>(cards: T[]): T[] {
  return [...cards].sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);
}
