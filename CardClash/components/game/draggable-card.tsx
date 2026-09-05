/**
 * DraggableCard — authoritative-state-safe drag presentation.
 *
 * Drop acceptance is intentionally not read synchronously from runOnJS.
 * The intended drop is dispatched once and the authoritative React state decides
 * whether the card remains, moves, or re-renders.
 */
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Card } from '@/lib/game/types';
import { CardItem } from './card-item';
import { ANIM_DURATION, SPRING } from '@/constants/animationConfig';
import { haptics } from '@/lib/feedback/haptics';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { SEMANTIC_COLOR } from '@/components/ui/design-tokens';

interface DraggableCardProps {
  card: Card;
  /**
   * Legacy boolean return is preserved for call-site compatibility but ignored.
   * Consumers should update authoritative state from this callback.
   */
  onDrop?: (x: number, y: number) => boolean | void;
  onDragStart?: () => void;
  isOverDropZone?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function DraggableCard({
  card,
  onDrop,
  onDragStart,
  isOverDropZone = false,
  size = 'medium',
  style,
  disabled = false,
  accessibilityLabel,
}: DraggableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(false);
  const lift = useSharedValue(0);
  const { reduceMotion } = useMotionPreferences();

  const notifyStart = () => {
    haptics.trigger('cardPickup');
    onDragStart?.();
  };

  const requestDrop = (x: number, y: number) => {
    onDrop?.(x, y);
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(5)
    .onStart(() => {
      dragging.value = true;
      lift.value = withTiming(reduceMotion ? 0 : 1, { duration: ANIM_DURATION.DRAG_IN });
      runOnJS(notifyStart)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      dragging.value = false;
      lift.value = withTiming(0, { duration: ANIM_DURATION.DRAG_OUT });

      if (onDrop) runOnJS(requestDrop)(event.absoluteX, event.absoluteY);

      // We do not guess acceptance on the UI thread. If authoritative state
      // removes/repositions the card, this instance disappears naturally.
      translateX.value = withSpring(0, SPRING.SNAP_BACK);
      translateY.value = withSpring(0, SPRING.SNAP_BACK);
    })
    .onFinalize(() => {
      if (dragging.value) dragging.value = false;
      lift.value = withTiming(0, { duration: ANIM_DURATION.DRAG_OUT });
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: 1 + lift.value * 0.015 },
    ],
    zIndex: lift.value > 0 ? 999 : 1,
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: lift.value * 0.28,
    transform: [{ scale: 1 + lift.value * 0.03 }],
  }));

  const dropHighlightStyle = useAnimatedStyle(() => ({
    opacity: isOverDropZone ? (reduceMotion ? 0.22 : 0.32) : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `بطاقة ${card.nameAr}`}
        accessibilityState={{ disabled }}
        style={[styles.wrapper, containerStyle, style]}
      >
        <Animated.View pointerEvents="none" style={[styles.shadowLayer, shadowStyle]} />
        <CardItem card={card} size={size} disabled={disabled} showStats />
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[StyleSheet.absoluteFillObject, styles.dropHighlight, dropHighlightStyle]}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: SEMANTIC_COLOR.accent.primary,
  },
  dropHighlight: {
    backgroundColor: SEMANTIC_COLOR.status.success,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: SEMANTIC_COLOR.status.success,
  },
});
