/**
 * ExplosionEffect
 * Visual burst overlay shown briefly when an attack is triggered.
 * Uses react-native-reanimated for a scale + fade animation.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

export function ExplosionEffect() {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.6, { damping: 6, stiffness: 200 }),
      withTiming(2.2, { duration: 300 })
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 500 })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={S.overlay} pointerEvents="none">
      <Animated.View style={[S.burst, animStyle]}>
        {/* Concentric rings */}
        {[80, 120, 160].map((size, i) => (
          <View
            key={i}
            style={[
              S.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: i === 0 ? '#ff4444' : i === 1 ? '#ff8c00' : '#ffd700',
                opacity: 1 - i * 0.25,
              },
            ]}
          />
        ))}
        {/* Core flash */}
        <View style={S.core} />
      </Animated.View>
    </View>
  );
}

const S = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  burst: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  core: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5',
  },
});
