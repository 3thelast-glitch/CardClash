import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { haptics, type HapticEvent } from '@/lib/feedback/haptics';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import {
  FONT,
  FONT_FAMILY,
  RADIUS,
  SEMANTIC_COLOR,
  SHADOW,
  SPACE,
  TOUCH_TARGET,
} from './design-tokens';
import { ThemedText } from './ThemedText';

export type ProButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ProButtonProps {
  label: string;
  onPress: () => void;
  variant?: ProButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  icon?: ReactNode;
  accessibilityHint?: string;
  hapticEvent?: HapticEvent | false;
  testID?: string;
}

export function ProButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  labelStyle,
  icon,
  accessibilityHint,
  hapticEvent = 'selection',
  testID,
}: ProButtonProps) {
  const scale = useSharedValue(1);
  const { reduceMotion } = useMotionPreferences();
  const unavailable = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const setPressed = (pressed: boolean) => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withTiming(pressed ? 0.975 : 1, {
      duration: pressed ? 100 : 130,
    });
  };

  const handlePress = () => {
    if (unavailable) return;
    if (hapticEvent) haptics.trigger(hapticEvent);
    onPress();
  };

  return (
    <Animated.View
      style={[
        animatedStyle,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: unavailable, busy: loading }}
        disabled={unavailable}
        onPress={handlePress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={({ pressed }) => [
          styles.base,
          variants[variant],
          fullWidth && styles.fullWidth,
          unavailable && styles.disabled,
          pressed && !reduceMotion && styles.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? SEMANTIC_COLOR.text.inverse : SEMANTIC_COLOR.accent.primary}
          />
        ) : (
          <>
            {icon}
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.label,
                labelVariants[variant],
                unavailable && styles.labelDisabled,
                labelStyle,
              ]}
            >
              {label}
            </ThemedText>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_TARGET.large,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.xl,
    paddingVertical: SPACE.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.sm,
    alignSelf: 'center',
  },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.94 },
  disabled: { opacity: 0.42, ...SHADOW.none },
  label: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: FONT.md,
    textAlign: 'center',
  },
  labelDisabled: { color: 'rgba(243,246,252,0.58)' },
});

const variants = StyleSheet.create({
  primary: {
    backgroundColor: SEMANTIC_COLOR.accent.primary,
    borderWidth: 1,
    borderColor: '#8FFFF0',
    ...SHADOW.active,
  },
  secondary: {
    backgroundColor: 'rgba(141,164,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(141,164,255,0.70)',
  },
  danger: {
    backgroundColor: 'rgba(251,113,133,0.14)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.status.danger,
  },
  ghost: {
    backgroundColor: 'rgba(19,30,47,0.66)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
  },
});

const labelVariants = StyleSheet.create({
  primary: { color: SEMANTIC_COLOR.text.inverse },
  secondary: { color: '#DCE4FF' },
  danger: { color: '#FFDCE2' },
  ghost: { color: SEMANTIC_COLOR.text.primary },
});
