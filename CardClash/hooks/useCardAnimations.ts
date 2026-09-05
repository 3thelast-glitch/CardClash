import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ANIM_DURATION, ANIM_VALUES, SPRING } from '@/constants/animationConfig';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { haptics } from '@/lib/feedback/haptics';

export interface CardDrawOrigin {
  x: number;
  y: number;
}

export interface CardPresentationMotionOptions {
  instanceKey: string;
  selected?: boolean;
  playEntrance?: boolean;
  entranceDelay?: number;
  drawOrigin?: CardDrawOrigin;
}

/**
 * One owner for press, selection and draw transforms. Flip owns a separate
 * nested layer through useCardFlipAnimation, so native transform arrays never
 * compete on the same view.
 */
export function useCardPresentationMotion({
  instanceKey,
  selected = false,
  playEntrance = false,
  entranceDelay = 0,
  drawOrigin,
}: CardPresentationMotionOptions) {
  const pressed = useSharedValue(0);
  const selectedProgress = useSharedValue(selected ? 1 : 0);
  const entranceProgress = useSharedValue(playEntrance ? 0 : 1);
  const originX = useSharedValue(drawOrigin?.x ?? 0);
  const originY = useSharedValue(drawOrigin?.y ?? 18);
  const { reduceMotion } = useMotionPreferences();

  useEffect(() => {
    cancelAnimation(pressed);
    cancelAnimation(selectedProgress);
    cancelAnimation(entranceProgress);

    pressed.value = 0;
    selectedProgress.value = selected ? 1 : 0;
    originX.value = drawOrigin?.x ?? 0;
    originY.value = drawOrigin?.y ?? 18;

    if (reduceMotion) {
      entranceProgress.value = 1;
      return;
    }

    entranceProgress.value = playEntrance ? 0 : 1;
    if (playEntrance) {
      entranceProgress.value = withDelay(
        entranceDelay,
        withTiming(1, {
          duration: ANIM_DURATION.DEAL,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [
    drawOrigin?.x,
    drawOrigin?.y,
    entranceDelay,
    entranceProgress,
    instanceKey,
    originX,
    originY,
    playEntrance,
    pressed,
    reduceMotion,
    selected,
    selectedProgress,
  ]);

  useEffect(() => {
    if (reduceMotion) {
      selectedProgress.value = selected ? 1 : 0;
      return;
    }
    selectedProgress.value = withSpring(selected ? 1 : 0, SPRING.HOVER);
  }, [reduceMotion, selected, selectedProgress]);

  const onPressIn = () => {
    haptics.trigger('selection');
    pressed.value = reduceMotion
      ? 0
      : withTiming(1, { duration: ANIM_DURATION.PRESS_IN });
  };

  const onPressOut = () => {
    pressed.value = reduceMotion
      ? 0
      : withTiming(0, { duration: ANIM_DURATION.PRESS_OUT });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const entrance = entranceProgress.value;
    const selectedT = selectedProgress.value;
    const pressedScale = interpolate(
      pressed.value,
      [0, 1],
      [1, ANIM_VALUES.TAP_SCALE],
    );
    const selectedScale = interpolate(
      selectedT,
      [0, 1],
      [1, ANIM_VALUES.SELECT_SCALE],
    );
    const translateX = (1 - entrance) * originX.value;
    const translateY =
      (1 - entrance) * originY.value + selectedT * ANIM_VALUES.SELECT_LIFT;

    return {
      opacity: reduceMotion ? 1 : entrance,
      transform: [
        { translateX },
        { translateY },
        { scale: pressedScale * selectedScale },
      ],
    };
  });

  return { animatedStyle, onPressIn, onPressOut };
}

export interface CardFlipAnimationOptions {
  instanceKey: string;
  playFlip?: boolean;
  delayMs?: number;
}

/**
 * Correct two-sided Y flip. At progress 0 only the neutral back faces the
 * viewer; at progress 1 only the front faces the viewer. Reduced motion jumps
 * directly to the accepted front state.
 */
export function useCardFlipAnimation({
  instanceKey,
  playFlip = false,
  delayMs = 0,
}: CardFlipAnimationOptions) {
  const progress = useSharedValue(1);
  const { reduceMotion } = useMotionPreferences();

  useEffect(() => {
    cancelAnimation(progress);
    if (!playFlip || reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: ANIM_DURATION.FLIP,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
    return () => cancelAnimation(progress);
  }, [delayMs, instanceKey, playFlip, progress, reduceMotion]);

  const frontStyle = useAnimatedStyle(() => ({
    backfaceVisibility: 'hidden' as const,
    transform: [
      { perspective: ANIM_VALUES.REVEAL_PERSPECTIVE },
      { rotateY: `${180 - progress.value * 180}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    backfaceVisibility: 'hidden' as const,
    transform: [
      { perspective: ANIM_VALUES.REVEAL_PERSPECTIVE },
      { rotateY: `${-progress.value * 180}deg` },
    ],
  }));

  return { frontStyle, backStyle };
}

export function useCardTapAnimation() {
  const scale = useSharedValue(1);
  const { reduceMotion } = useMotionPreferences();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    haptics.trigger('selection');
    if (!reduceMotion) {
      scale.value = withTiming(ANIM_VALUES.TAP_SCALE, {
        duration: ANIM_DURATION.PRESS_IN,
      });
    }
  };

  const onPressOut = () => {
    scale.value = reduceMotion
      ? 1
      : withTiming(1, { duration: ANIM_DURATION.PRESS_OUT });
  };

  return { animatedStyle, onPressIn, onPressOut };
}

export function useCardSummonAnimation(delayMs = 0) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const { reduceMotion } = useMotionPreferences();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const play = () => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      return;
    }
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 120 }));
    translateY.value = withDelay(delayMs, withSpring(0, SPRING.SUMMON));
    scale.value = withDelay(
      delayMs,
      withSequence(
        withTiming(ANIM_VALUES.SUMMON_PEAK, {
          duration: ANIM_DURATION.SUMMON * 0.4,
        }),
        withSpring(1, SPRING.SUMMON),
      ),
    );
  };

  const reset = () => {
    opacity.value = reduceMotion ? 1 : 0;
    translateY.value = reduceMotion ? 0 : 34;
    scale.value = reduceMotion ? 1 : 0.96;
  };

  return { animatedStyle, play, reset };
}

export function useCardAttackAnimation() {
  const translateX = useSharedValue(0);
  const { reduceMotion } = useMotionPreferences();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const shake = (onDone?: () => void) => {
    haptics.trigger('attackImpact');
    if (reduceMotion) {
      translateX.value = 0;
      onDone?.();
      return;
    }
    const d = ANIM_VALUES.SHAKE;
    const t = ANIM_DURATION.ATTACK / 6;
    translateX.value = withSequence(
      withTiming(d, { duration: t }),
      withTiming(-d, { duration: t }),
      withTiming(d * 0.65, { duration: t }),
      withTiming(-d * 0.65, { duration: t }),
      withTiming(d * 0.25, { duration: t }),
      withTiming(0, { duration: t }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
  };

  return { animatedStyle, shake };
}

export function useGlowPulse(active = true) {
  const opacity = useSharedValue(0.48);
  const scale = useSharedValue(1);
  const { reduceMotion } = useMotionPreferences();

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);

    if (!active || reduceMotion) {
      opacity.value = active ? 0.62 : 0;
      scale.value = 1;
      return;
    }

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.78, { duration: ANIM_DURATION.GLOW_PULSE }),
        withTiming(0.38, { duration: ANIM_DURATION.GLOW_PULSE }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(ANIM_VALUES.GLOW_SCALE_PEAK, {
          duration: ANIM_DURATION.GLOW_PULSE,
        }),
        withTiming(ANIM_VALUES.GLOW_SCALE_TROUGH, {
          duration: ANIM_DURATION.GLOW_PULSE,
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [active, opacity, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle };
}

export function useCardHoverScale(selected: boolean) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const { reduceMotion } = useMotionPreferences();

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      lift.value = 0;
      return;
    }
    scale.value = withSpring(
      selected ? ANIM_VALUES.SELECT_SCALE : 1,
      SPRING.HOVER,
    );
    lift.value = withSpring(
      selected ? ANIM_VALUES.SELECT_LIFT : 0,
      SPRING.HOVER,
    );
  }, [lift, reduceMotion, scale, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));

  return { animatedStyle };
}

export function useDamageNumberAnim(onComplete?: () => void) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const { reduceMotion } = useMotionPreferences();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const play = (startY = 0, isCritical = false) => {
    if (reduceMotion) {
      translateY.value = startY;
      scale.value = 1;
      opacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 180 }),
      );
      onComplete?.();
      return;
    }

    scale.value = withSequence(
      withTiming(isCritical ? 1.35 : 1.15, {
        duration: 120,
        easing: Easing.out(Easing.back(1.7)),
      }),
      withTiming(1, { duration: 90 }),
    );
    translateY.value = withTiming(startY - ANIM_VALUES.DAMAGE_RISE, {
      duration: ANIM_DURATION.DAMAGE_FLOAT,
      easing: Easing.out(Easing.quad),
    });
    opacity.value = withSequence(
      withTiming(1, { duration: 90 }),
      withDelay(
        220,
        withTiming(0, { duration: 260 }, (finished) => {
          if (finished && onComplete) runOnJS(onComplete)();
        }),
      ),
    );
  };

  return { animatedStyle, play };
}
