/**
 * RarityGlow — animated border glow ring for Epic & Legendary cards.
 * Uses Reanimated v3 withRepeat for infinite pulsing.
 */

import React from 'react';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { useGlowPulseAnimation } from '@/lib/animations';

interface RarityGlowProps {
    color: string;
    borderRadius: number;
    /** Larger = wider glow ring around the card */
    spread?: number;
    /** When true, applies heavier glow for Legendary-tier cards */
    isLegendary?: boolean;
}

export function RarityGlow({ color, borderRadius, spread = 8, isLegendary = false }: RarityGlowProps) {
    const { animatedStyle } = useGlowPulseAnimation();

    return (
        <Animated.View
            style={[
                styles.glow,
                {
                    borderColor: color,
                    borderRadius: borderRadius + spread,
                    borderWidth: isLegendary ? 3 : 2,
                    shadowColor: color,
                    shadowRadius: isLegendary ? 20 : 10,
                    shadowOpacity: isLegendary ? 1 : 0.7,
                    top: -spread,
                    left: -spread,
                    right: -spread,
                    bottom: -spread,
                },
                animatedStyle,
            ]}
            pointerEvents="none"
        />
    );
}

const styles = StyleSheet.create({
    glow: {
        position: 'absolute',
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
    },
});
