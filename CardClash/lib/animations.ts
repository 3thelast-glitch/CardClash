/**
 * Card Animation Hooks — Reanimated v3
 * Provides ready-to-use animated styles for all card interactions.
 */

import { useEffect } from 'react';
import {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    withRepeat,
    withDelay,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { ANIMATION_TIMINGS, ANIMATION_VALUES } from '@/constants/game-config';

// ─── Spring configs ───────────────────────────────────────────────────────────

const TAP_SPRING = {
    damping: 12,
    stiffness: 280,
    mass: 0.8,
} as const;

const SUMMON_SPRING = {
    damping: 14,
    stiffness: 200,
    mass: 1,
} as const;

// ─── Tap Animation ────────────────────────────────────────────────────────────

/**
 * Returns animated styles for a card tap (press-in / press-out).
 * Usage:
 *   const { animatedStyle, onPressIn, onPressOut } = useCardTapAnimation();
 *   <Animated.View style={animatedStyle} onTouchStart={onPressIn} onTouchEnd={onPressOut} />
 */
export function useCardTapAnimation() {
    const scale = useSharedValue(1);
    const rotate = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotate.value}deg` },
        ],
    }));

    const onPressIn = () => {
        scale.value = withSpring(ANIMATION_VALUES.tapScale, TAP_SPRING);
        rotate.value = withSpring(ANIMATION_VALUES.tapRotation, TAP_SPRING);
        if (Platform.OS !== 'web') {
            runOnJS(triggerHaptic)();
        }
    };

    const onPressOut = () => {
        scale.value = withSpring(1, TAP_SPRING);
        rotate.value = withSpring(0, TAP_SPRING);
    };

    return { animatedStyle, onPressIn, onPressOut };
}

function triggerHaptic() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
}

// ─── Summon Animation ─────────────────────────────────────────────────────────

/**
 * Battle summon: slide-up + scale(1.25 → 1), triggered by calling `play()`.
 */
export function useCardSummonAnimation(delayMs = 0) {
    const scale = useSharedValue(0);
    const translateY = useSharedValue(60);
    const opacity = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    const play = () => {
        const delay = delayMs;
        opacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
        translateY.value = withDelay(
            delay,
            withSpring(0, SUMMON_SPRING)
        );
        scale.value = withDelay(
            delay,
            withSequence(
                withTiming(ANIMATION_VALUES.summonPeak, { duration: ANIMATION_TIMINGS.summon * 0.4 }),
                withSpring(1, SUMMON_SPRING)
            )
        );
    };

    const reset = () => {
        scale.value = 0;
        translateY.value = 60;
        opacity.value = 0;
    };

    return { animatedStyle, play, reset };
}

// ─── Attack (Shake) Animation ─────────────────────────────────────────────────

/**
 * Attack shake animation: rapid left-right shake ending at rest.
 */
export function useCardAttackAnimation() {
    const translateX = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const shake = (onComplete?: () => void) => {
        const d = ANIMATION_VALUES.shakeAmount;
        const t = ANIMATION_TIMINGS.attack / 6;
        translateX.value = withSequence(
            withTiming(d, { duration: t }),
            withTiming(-d, { duration: t }),
            withTiming(d * 0.75, { duration: t }),
            withTiming(-d * 0.75, { duration: t }),
            withTiming(d * 0.4, { duration: t }),
            withTiming(0, { duration: t }, (finished) => {
                if (finished && onComplete) runOnJS(onComplete)();
            })
        );
    };

    return { animatedStyle, shake };
}

// ─── Glow Pulse Animation ─────────────────────────────────────────────────────

/**
 * Repeating opacity pulse for Epic/Legendary glow ring.
 */
export function useGlowPulseAnimation() {
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
                withTiming(0.5, { duration: 1800, easing: Easing.inOut(Easing.sin) })
            ),
            -1, // infinite
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return { animatedStyle };
}

// ─── Hover / Selected scale ───────────────────────────────────────────────────

/**
 * Expand card to hover dimensions when selected.
 */
export function useCardHoverAnimation(selected: boolean) {
    const scale = useSharedValue(1);

    scale.value = withSpring(selected ? 1.06 : 1, {
        damping: 15,
        stiffness: 200,
    });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return { animatedStyle };
}
