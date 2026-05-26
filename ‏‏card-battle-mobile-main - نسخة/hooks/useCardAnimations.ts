/**
 * useCardAnimations — Reanimated v4 animation hooks for card interactions.
 */

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
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { ANIM_DURATION, ANIM_VALUES, SPRING } from '@/constants/animationConfig';

// ─── Tap ──────────────────────────────────────────────────────────────────────

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
        scale.value = withSpring(ANIM_VALUES.TAP_SCALE, SPRING.TAP);
        rotate.value = withSpring(ANIM_VALUES.TAP_ROTATE, SPRING.TAP);
        if (Platform.OS !== 'web') runOnJS(fireHaptic)('light');
    };

    const onPressOut = () => {
        scale.value = withSpring(1, SPRING.TAP);
        rotate.value = withSpring(0, SPRING.TAP);
    };

    return { animatedStyle, onPressIn, onPressOut };
}

// ─── Summon ───────────────────────────────────────────────────────────────────

export function useCardSummonAnimation(delayMs = 0) {
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    const play = () => {
        opacity.value = withDelay(delayMs, withTiming(1, { duration: 120 }));
        translateY.value = withDelay(delayMs, withSpring(0, SPRING.SUMMON));
        scale.value = withDelay(
            delayMs,
            withSequence(
                withTiming(ANIM_VALUES.SUMMON_PEAK, { duration: ANIM_DURATION.SUMMON * 0.4 }),
                withSpring(1, SPRING.SUMMON)
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

// ─── Attack Shake ─────────────────────────────────────────────────────────────

export function useCardAttackAnimation() {
    const translateX = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const shake = (onDone?: () => void) => {
        const d = ANIM_VALUES.SHAKE;
        const t = ANIM_DURATION.ATTACK / 6;
        if (Platform.OS !== 'web') runOnJS(fireHaptic)('medium');

        translateX.value = withSequence(
            withTiming(d, { duration: t }),
            withTiming(-d, { duration: t }),
            withTiming(d * 0.7, { duration: t }),
            withTiming(-d * 0.7, { duration: t }),
            withTiming(d * 0.3, { duration: t }),
            withTiming(0, { duration: t }, (finished) => {
                if (finished && onDone) runOnJS(onDone)();
            })
        );
    };

    return { animatedStyle, shake };
}

// ─── Glow Pulse ───────────────────────────────────────────────────────────────

export function useGlowPulse() {
    const opacity = useSharedValue(0.5);
    const scale = useSharedValue(1);

    opacity.value = withRepeat(
        withSequence(
            withTiming(1, { duration: ANIM_DURATION.GLOW_PULSE }),
            withTiming(0.4, { duration: ANIM_DURATION.GLOW_PULSE })
        ),
        -1,
        false
    );

    scale.value = withRepeat(
        withSequence(
            withTiming(ANIM_VALUES.GLOW_SCALE_PEAK, { duration: ANIM_DURATION.GLOW_PULSE }),
            withTiming(ANIM_VALUES.GLOW_SCALE_TROUGH, { duration: ANIM_DURATION.GLOW_PULSE })
        ),
        -1,
        false
    );

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return { animatedStyle };
}

// ─── Hover Scale ──────────────────────────────────────────────────────────────

export function useCardHoverScale(selected: boolean) {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withSpring(selected ? ANIM_VALUES.HOVER_SCALE : 1, SPRING.HOVER);
    }, [selected]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return { animatedStyle };
}

// ─── Damage Number ────────────────────────────────────────────────────────────

export function useDamageNumberAnim(onComplete?: () => void) {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.4);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    const play = (startY = 0, isCritical = false) => {
        const rise = ANIM_VALUES.DAMAGE_RISE;
        const dur = ANIM_DURATION.DAMAGE_FLOAT;

        scale.value = withSequence(
            withTiming(isCritical ? 1.6 : 1.25, { duration: 120, easing: Easing.out(Easing.back(2)) }),
            withTiming(1.0, { duration: 80 })
        );

        translateY.value = withTiming(startY - rise, {
            duration: dur * 0.7,
            easing: Easing.out(Easing.quad),
        });

        opacity.value = withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(0, { duration: dur * 0.4, easing: Easing.in(Easing.quad) }, (finished) => {
                if (finished && onComplete) runOnJS(onComplete)();
            })
        );
    };

    return { animatedStyle, play };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function fireHaptic(style: 'light' | 'medium' | 'heavy') {
    const map = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(map[style]).catch(() => { });
}
