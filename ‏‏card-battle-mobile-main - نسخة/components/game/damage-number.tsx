/**
 * DamageNumber — floating animated damage / heal indicator.
 *
 * Floats upward 70px and fades out over ~800ms.
 * Red for damage, green for healing, gold for critical.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import { ANIMATION_TIMINGS, ANIMATION_VALUES } from '@/constants/game-config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DamageNumberVariant = 'damage' | 'heal' | 'critical' | 'blocked';

const VARIANT_COLOR: Record<DamageNumberVariant, string> = {
    damage: '#ef4444',
    heal: '#22c55e',
    critical: '#f59e0b',
    blocked: '#6b7280',
};

const VARIANT_PREFIX: Record<DamageNumberVariant, string> = {
    damage: '-',
    heal: '+',
    critical: '-',
    blocked: '✦',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface DamageNumberProps {
    value: number;
    variant?: DamageNumberVariant;
    /** Horizontal offset from center */
    x?: number;
    /** Vertical start offset from center */
    y?: number;
    onComplete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DamageNumber({
    value,
    variant = 'damage',
    x = 0,
    y = 0,
    onComplete,
}: DamageNumberProps) {
    const translateY = useSharedValue(y);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.4);

    const color = VARIANT_COLOR[variant];
    const prefix = variant !== 'blocked' ? VARIANT_PREFIX[variant] : '';
    const label = variant === 'blocked' ? '✦ Blocked' : `${prefix}${value}`;
    const isCritical = variant === 'critical';

    useEffect(() => {
        const riseDuration = ANIMATION_TIMINGS.damageFloat * 0.7;
        const fadeDuration = ANIMATION_TIMINGS.damageFloat * 0.4;
        const riseAmount = ANIMATION_VALUES.damageRise;

        // Pop in
        scale.value = withSequence(
            withTiming(isCritical ? 1.5 : 1.2, { duration: 120, easing: Easing.out(Easing.back(2)) }),
            withTiming(1.0, { duration: 80 })
        );

        // Rise
        translateY.value = withTiming(
            y - riseAmount,
            { duration: riseDuration, easing: Easing.out(Easing.quad) }
        );

        // Fade in then out
        opacity.value = withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(
                0,
                {
                    duration: fadeDuration,
                    easing: Easing.in(Easing.quad),
                },
                (finished) => {
                    if (finished && onComplete) runOnJS(onComplete)();
                }
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.container,
                { left: x - 30 },
                animatedStyle,
            ]}
            pointerEvents="none"
        >
            <Text
                style={[
                    styles.text,
                    {
                        color,
                        fontSize: isCritical ? 54 : variant === 'blocked' ? 24 : 42,
                    },
                ]}
            >
                {label}
            </Text>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: 100,
        alignItems: 'center',
        zIndex: 999,
    },
    text: {
        fontWeight: '900',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        letterSpacing: -0.5,
    },
});
