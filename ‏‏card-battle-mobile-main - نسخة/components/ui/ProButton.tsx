import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  COLOR,
  RADIUS,
  SPACE,
  FONT,
  SHADOW,
  FONT_FAMILY,
} from "./design-tokens";

export type ProButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ProButtonProps {
  label: string;
  onPress: () => void;
  variant?: ProButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function ProButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  labelStyle,
}: ProButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 80 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  const btnStyles = [
    styles.base,
    fullWidth && styles.fullWidth,
    variant === "primary" && styles.primary,
    variant === "secondary" && styles.secondary,
    variant === "danger" && styles.danger,
    variant === "ghost" && styles.ghost,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.label,
    variant === "primary" && styles.labelPrimary,
    variant === "secondary" && styles.labelSecondary,
    variant === "danger" && styles.labelDanger,
    variant === "ghost" && styles.labelGhost,
    disabled && styles.labelDisabled,
    labelStyle,
  ];

  return (
    <Animated.View style={[animatedStyle, fullWidth && { width: "100%" }]}>
      <TouchableOpacity
        style={btnStyles}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "primary" ? "#1a0d1a" : COLOR.gold}
          />
        ) : (
          <Text style={textStyles}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 32,
    paddingHorizontal: SPACE.xl,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "85%",
    maxWidth: 380,
    alignSelf: "center",
  },
  fullWidth: {
    width: "100%",
  },

  // Variants
  primary: {
    backgroundColor: COLOR.gold,
    borderWidth: 1.5,
    borderColor: COLOR.goldAccent,
    ...SHADOW.gold,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLOR.gold,
  },
  danger: {
    backgroundColor: COLOR.red,
    ...SHADOW.card,
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  disabled: {
    opacity: 0.38,
    ...SHADOW.none,
  },

  // Labels
  label: {
    fontSize: FONT.base,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.5,
    textAlign: "center",
    flexWrap: "wrap",
  },
  labelPrimary: {
    color: "#1A0D1A",
    textShadowColor: "rgba(255,255,255,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontWeight: "900",
  },
  labelSecondary: { color: COLOR.gold },
  labelDanger: { color: COLOR.white },
  labelGhost: { color: COLOR.textPrimary },
  labelDisabled: { color: "rgba(255,255,255,0.35)" },
});
