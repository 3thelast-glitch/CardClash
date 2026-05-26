/**
 * Card Rarity System
 * Drives all visual and animation configuration per rarity tier.
 */

import type { CardRarity } from './types';

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
    /** Whether to render the pulsing glow ring */
    hasPulsingGlow: boolean;
    /** Whether to render fire particles overlay */
    hasParticles: boolean;
    /** Label text */
    label: string;
    /** Display colour for the badge pill */
    badgeColor: string;
}

export const RARITY_CONFIG: Record<CardRarity, RarityConfig> = {
    common: {
        gradient: ['#312e81', '#4338ca', '#4f46e5'],
        borderColor: '#4F46E5',
        borderWidth: 2,
        glowColor: undefined,
        shadowRadius: 8,
        shadowOpacity: 0.35,
        hasPulsingGlow: false,
        hasParticles: false,
        label: 'Common',
        badgeColor: '#6366f1',
    },
    rare: {
        gradient: ['#78350f', '#d97706', '#f59e0b'],
        borderColor: '#F59E0B',
        borderWidth: 2.5,
        glowColor: '#fbbf24',
        shadowRadius: 14,
        shadowOpacity: 0.5,
        hasPulsingGlow: false,
        hasParticles: false,
        label: 'Rare',
        badgeColor: '#f59e0b',
    },
    epic: {
        gradient: ['#4c1d95', '#7c3aed', '#8B5CF6'],
        borderColor: '#8B5CF6',
        borderWidth: 3,
        glowColor: '#8B5CF6',
        shadowRadius: 18,
        shadowOpacity: 0.6,
        hasPulsingGlow: true,
        hasParticles: false,
        label: 'Epic',
        badgeColor: '#8b5cf6',
    },
    legendary: {
        gradient: ['#7f1d1d', '#b91c1c', '#EF4444'],
        borderColor: '#EF4444',
        borderWidth: 3.5,
        glowColor: '#ef4444',
        shadowRadius: 24,
        shadowOpacity: 0.7,
        hasPulsingGlow: true,
        hasParticles: true,
        label: 'Legendary',
        badgeColor: '#ef4444',
    },
    special: {
        gradient: ['#0f172a', '#831843', '#f0abfc'],
        borderColor: '#f0abfc',
        borderWidth: 4,
        glowColor: '#e879f9',
        shadowRadius: 32,
        shadowOpacity: 0.85,
        hasPulsingGlow: true,
        hasParticles: true,
        label: 'Special',
        badgeColor: '#e879f9',
    },
} as const;

/** Resolve rarity with a safe fallback */
export function getRarityConfig(rarity?: CardRarity): RarityConfig {
    return RARITY_CONFIG[rarity ?? 'common'];
}

/** Resolve rarity directly from star count */
export function getRarityFromStars(stars?: number): CardRarity {
    if (!stars || stars <= 2) return 'common';
    if (stars === 3) return 'rare';
    if (stars === 4) return 'epic';
    return 'legendary';
}

