/**
 * HealthBar — animated HP bar with color shift and update pulse.
 *
 * Color: green (>60%) → yellow (30-60%) → red (<30%)
 * Transitions smoothly with Reanimated withTiming.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withSpring,
    interpolateColor,
    Easing,
} from 'react-native-reanimated';
import { ANIMATION_TIMINGS, HP_BAR_COLORS, hpBarColor } from '@/constants/game-config';

// ─── Props ────────────────────────────────────────────────────────────────────

interface HealthBarProps {
    current: number;
    max: number;
    label?: string;
    /** Bar orientation */
    direction?: 'ltr' | 'rtl';
    /** Total bar width in dp */
    width?: number;
    height?: number;
    showLabel?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HealthBar({
    current,
    max,
    label,
    direction = 'ltr',
    width = 120,
    height = 18,
    showLabel = true,
}: HealthBarProps) {
    const fraction = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

    // Animated fill width (0 → width)
    const fillWidth = useSharedValue(fraction * width);
    // Pulse opacity for the flash effect when HP changes
    const pulseOpacity = useSharedValue(0);
    // Color progress: 0=red, 0.5=yellow, 1=green
    const colorProgress = useSharedValue(fraction);

    useEffect(() => {
        const targetW = fraction * width;

        fillWidth.value = withTiming(targetW, {
            duration: ANIMATION_TIMINGS.hpBar,
            easing: Easing.out(Easing.quad),
        });

        colorProgress.value = withTiming(fraction, {
            duration: ANIMATION_TIMINGS.hpBar,
        });

        // Flash pulse on HP change
        pulseOpacity.value = withSequence(
            withTiming(0.6, { duration: 80 }),
            withTiming(0, { duration: 300 })
        );
    }, [current, fraction, width]);

    const fillStyle = useAnimatedStyle(() => {
        const bg = interpolateColor(
            colorProgress.value,
            [0, 0.3, 0.6, 1],
            [HP_BAR_COLORS.low, HP_BAR_COLORS.half, HP_BAR_COLORS.full, HP_BAR_COLORS.full]
        );

        return {
            width: fillWidth.value,
            backgroundColor: bg,
        };
    });

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    return (
        <View style={[styles.container, { width }]}>
            {showLabel && label && (
                <Text style={styles.label}>{label}</Text>
            )}

            <View style={[styles.track, { width, height, borderRadius: height / 2 }]}>
                {/* Fill bar */}
                <Animated.View
                    style={[
                        styles.fill,
                        { height, borderRadius: height / 2 },
                        direction === 'rtl' ? { right: 0 } : { left: 0 },
                        fillStyle,
                    ]}
                />

                {/* Flash pulse overlay */}
                <Animated.View
                    style={[
                        StyleSheet.absoluteFillObject,
                        { borderRadius: height / 2, backgroundColor: '#ffffff' },
                        pulseStyle,
                    ]}
                />

                {/* HP text inside bar */}
                <View style={[styles.hpTextWrapper, { top: -2 }]}>
                    <Text style={[styles.hpText, { fontSize: Math.max(14, height * 0.95) }]}>
                        {current}/{max}
                    </Text>
                </View>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
    },
    label: {
        color: '#9ca3af',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 3,
        letterSpacing: 0.5,
    },
    track: {
        backgroundColor: HP_BAR_COLORS.empty,
        overflow: 'hidden',
        position: 'relative',
    },
    fill: {
        position: 'absolute',
        top: 0,
        bottom: 0,
    },
    hpTextWrapper: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hpText: {
        color: '#fff',
        fontWeight: '800',
        opacity: 0.9,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
