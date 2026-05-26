import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Element, ELEMENT_EMOJI, ELEMENT_COLORS } from '@/lib/game/types';

interface ElementEffectProps {
  element: Element;
  isActive: boolean;
  position?: 'top' | 'bottom';
}

/**
 * مكون المؤثرات البصرية للعناصر
 * يعرض رسوم متحركة فريدة لكل عنصر عند الهجوم
 */
export function ElementEffect({ element, isActive, position = 'top' }: ElementEffectProps) {
  // قيم الرسوم المتحركة المشتركة
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const rotate = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // إعادة تعيين القيم
      opacity.value = 0;
      scale.value = 0.5;
      rotate.value = 0;
      translateY.value = 0;

      // تشغيل الرسوم المتحركة حسب نوع العنصر
      switch (element) {
        case 'fire':
          // تأثير النار: توهج وارتفاع
          opacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(400, withTiming(0, { duration: 300 }))
          );
          scale.value = withSequence(
            withTiming(1.2, { duration: 200, easing: Easing.out(Easing.cubic) }),
            withDelay(400, withTiming(1.5, { duration: 300, easing: Easing.in(Easing.cubic) }))
          );
          translateY.value = withSequence(
            withTiming(-10, { duration: 200 }),
            withDelay(400, withTiming(-40, { duration: 300 }))
          );
          break;

        case 'ice':
          // تأثير الجليد: تجمد مع بريق
          opacity.value = withSequence(
            withTiming(1, { duration: 150 }),
            withTiming(0.6, { duration: 150 }),
            withTiming(1, { duration: 150 }),
            withDelay(200, withTiming(0, { duration: 300 }))
          );
          scale.value = withSequence(
            withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
            withTiming(0.95, { duration: 150 }),
            withTiming(1.05, { duration: 150 }),
            withDelay(200, withTiming(1.3, { duration: 300 }))
          );
          break;

        case 'earth':
          // تأثير الأرض: ارتجاج
          opacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(400, withTiming(0, { duration: 300 }))
          );
          scale.value = withSequence(
            withTiming(1.1, { duration: 100 }),
            withTiming(0.95, { duration: 100 }),
            withTiming(1.1, { duration: 100 }),
            withTiming(0.95, { duration: 100 }),
            withDelay(200, withTiming(1.4, { duration: 300 }))
          );
          break;

        case 'lightning':
          // تأثير البرق: وميض سريع
          opacity.value = withSequence(
            withTiming(1, { duration: 80 }),
            withTiming(0.3, { duration: 80 }),
            withTiming(1, { duration: 80 }),
            withTiming(0.3, { duration: 80 }),
            withTiming(1, { duration: 80 }),
            withDelay(200, withTiming(0, { duration: 300 }))
          );
          scale.value = withSequence(
            withTiming(1.3, { duration: 80 }),
            withTiming(1, { duration: 80 }),
            withTiming(1.3, { duration: 80 }),
            withTiming(1, { duration: 80 }),
            withTiming(1.3, { duration: 80 }),
            withDelay(200, withTiming(1.5, { duration: 300 }))
          );
          rotate.value = withSequence(
            withTiming(10, { duration: 80 }),
            withTiming(-10, { duration: 80 }),
            withTiming(10, { duration: 80 }),
            withTiming(-10, { duration: 80 }),
            withTiming(0, { duration: 80 }),
            withDelay(200, withTiming(0, { duration: 300 }))
          );
          break;

        case 'water':
          // تأثير الماء: موجة
          opacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(400, withTiming(0, { duration: 300 }))
          );
          scale.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(400, withTiming(1.4, { duration: 300 }))
          );
          translateY.value = withSequence(
            withTiming(0, { duration: 100 }),
            withTiming(-8, { duration: 100 }),
            withTiming(0, { duration: 100 }),
            withDelay(200, withTiming(30, { duration: 300 }))
          );
          break;

        case 'wind':
          // تأثير الريح: دوران
          opacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(400, withTiming(0, { duration: 300 }))
          );
          scale.value = withSequence(
            withTiming(1.1, { duration: 200 }),
            withDelay(400, withTiming(1.5, { duration: 300 }))
          );
          rotate.value = withSequence(
            withTiming(360, { duration: 600, easing: Easing.linear })
          );
          break;
      }
    }
  }, [isActive, element]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotate.value}deg` },
      { translateY: translateY.value },
    ],
  }));

  const color = ELEMENT_COLORS[element];
  const emoji = ELEMENT_EMOJI[element];

  return (
    <Animated.View
      style={[
        styles.container,
        { top: position === 'top' ? 20 : undefined, bottom: position === 'bottom' ? 20 : undefined },
        animatedStyle,
      ]}
    >
      {/* الطبقة الخارجية - التوهج */}
      <View
        style={[
          styles.glow,
          {
            backgroundColor: color,
            opacity: 0.3,
          },
        ]}
      />

      {/* الطبقة الوسطى - الرمز */}
      <View style={[styles.emojiContainer, { borderColor: color }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* الجزيئات - للعناصر المختارة */}
      {(element === 'fire' || element === 'lightning' || element === 'water') && (
        <>
          <View
            style={[
              styles.particle,
              {
                backgroundColor: color,
                left: '20%',
                top: '30%',
              },
            ]}
          />
          <View
            style={[
              styles.particle,
              {
                backgroundColor: color,
                right: '20%',
                top: '40%',
              },
            ]}
          />
          <View
            style={[
              styles.particle,
              {
                backgroundColor: color,
                left: '30%',
                bottom: '20%',
              },
            ]}
          />
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    left: '50%',
    marginLeft: -60,
    zIndex: 10,
  },
  glow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 60,
    opacity: 0.3,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  emoji: {
    fontSize: 48,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
});
