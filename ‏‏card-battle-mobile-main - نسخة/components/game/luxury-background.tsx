import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLOR } from '../ui/design-tokens';

const { width: SW, height: SH } = Dimensions.get('window');

// Floating orb — soft ambient glow
function FloatingOrb({
  x,
  y,
  size,
  color,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
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
  }, []);

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

const ORBS = [
  { x: 0.05 * SW, y: 0.1 * SH, size: 180, color: '#6B21A8', delay: 0 },
  { x: 0.7 * SW, y: 0.05 * SH, size: 220, color: '#1D4ED8', delay: 400 },
  { x: 0.4 * SW, y: 0.6 * SH, size: 260, color: '#7C3AED', delay: 800 },
  { x: 0.82 * SW, y: 0.72 * SH, size: 160, color: '#B45309', delay: 200 },
  { x: 0.1 * SW, y: 0.78 * SH, size: 140, color: '#065F46', delay: 600 },
];

interface LuxuryBackgroundProps {
  children?: React.ReactNode;
}

export function LuxuryBackground({ children }: LuxuryBackgroundProps) {
  return (
    <View style={styles.root}>
      {/* Deep background */}
      <View style={styles.bg} />

      {/* Grid lines — subtle purple grid */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      {/* Ambient orbs */}
      {ORBS.map((orb, i) => (
        <FloatingOrb key={i} {...orb} />
      ))}

      {/* Top gold vignette accent */}
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
    backgroundColor: '#E4A52A',
    shadowColor: '#E4A52A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
  },
});
