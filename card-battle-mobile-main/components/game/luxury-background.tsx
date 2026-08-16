import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLOR } from '../ui/design-tokens';
import { useSettings } from '@/lib/game/hooks/useSettings';

// Floating orb — soft ambient glow
function FloatingOrb({
  x,
  y,
  size,
  color,
  delay,
  enabled,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  enabled: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      opacity.value = 0;
      translateY.value = 0;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay }),
        withTiming(0.18, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.08, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 3000 + delay, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8, { duration: 3000 + delay, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false
    );
  }, [delay, enabled]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

interface LuxuryBackgroundProps {
  children?: React.ReactNode;
}

export function LuxuryBackground({ children }: LuxuryBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const { settings } = useSettings();
  const orbs = [
    { x: 0.04 * width, y: 0.08 * height, size: 190, color: '#075E61', delay: 0 },
    { x: 0.72 * width, y: 0.04 * height, size: 220, color: '#0E7490', delay: 400 },
    { x: 0.36 * width, y: 0.62 * height, size: 250, color: '#0F766E', delay: 800 },
    { x: 0.84 * width, y: 0.72 * height, size: 150, color: '#8A651C', delay: 200 },
    { x: 0.08 * width, y: 0.8 * height, size: 140, color: '#164E63', delay: 600 },
  ];

  return (
    <View style={styles.root}>
      {/* Deep background */}
      <View style={styles.bg} />

      {/* Vault grid — deliberately understated behind functional UI */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      {/* Ambient orbs */}
      {settings.animationsEnabled && orbs.map((orb, i) => (
        <FloatingOrb key={i} {...orb} enabled={settings.animationsEnabled} />
      ))}

      {/* Top cyan vignette accent */}
      <View style={styles.topAccent} pointerEvents="none" />

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLOR.bgDeep,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Subtle repeating grid pattern via nested thin views is complex in RN;
    // use a semi-transparent overlay with a slight pattern tint instead
    backgroundColor: 'transparent',
    borderWidth: 0,
    opacity: 0.04,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLOR.gold,
    shadowColor: COLOR.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
  },
});
