import { useEffect } from 'react';
import {
  Easing,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const ORIENTATION_TRANSITION_MS = 260;

/**
 * Gives layout changes caused by screen rotation a brief, subtle transition.
 * The layout transition moves panels to their new row/column positions, while
 * the opacity/scale transition prevents a jarring one-frame layout jump.
 */
export function useOrientationTransition(isLandscape: boolean, enabled = true) {
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!enabled) {
      progress.value = 1;
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, {
      duration: ORIENTATION_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [enabled, isLandscape, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.9, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.985, 1]) }],
  }));

  return {
    animatedStyle,
    layoutTransition: LinearTransition.duration(enabled ? ORIENTATION_TRANSITION_MS : 0)
      .easing(Easing.out(Easing.cubic)),
  };
}
