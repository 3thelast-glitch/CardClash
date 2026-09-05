import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CardRarity } from '@/lib/game/types';
import { getCardRarityVisual } from '@/lib/presentation/card-rarity-visuals';
import { RADIUS, SEMANTIC_COLOR } from '@/components/ui/design-tokens';

export interface RarityFrameProps {
  rarity?: CardRarity;
  selected?: boolean;
  targeted?: boolean;
  playable?: boolean;
  disabled?: boolean;
  /** Let children define height, used by full inspection/rules content. */
  contentSized?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}

/**
 * Outer effects deliberately live outside the clipped content surface.
 * Selection/targeting are interaction states and never replace rarity colour.
 */
export function RarityFrame({
  rarity = 'common',
  selected = false,
  targeted = false,
  playable = false,
  disabled = false,
  contentSized = false,
  children,
  style,
  innerStyle,
}: RarityFrameProps) {
  const visual = getCardRarityVisual(rarity);
  const interactionColor = targeted
    ? SEMANTIC_COLOR.status.danger
    : playable || selected
      ? SEMANTIC_COLOR.accent.primary
      : undefined;

  return (
    <View
      style={[
        styles.outer,
        !contentSized && styles.fill,
        {
          borderColor: visual.color,
          shadowColor: visual.glowColor ?? '#000000',
          shadowOpacity: disabled ? 0.1 : visual.shadowOpacity,
          shadowRadius: disabled ? 3 : visual.shadowRadius,
          elevation: disabled ? 1 : Math.max(3, Math.round(visual.shadowRadius / 2)),
        },
        style,
      ]}
    >
      {interactionColor ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.interactionHalo, { borderColor: interactionColor }]}
        />
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={visual.rimGradient}
        locations={[0, 0.52, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={[styles.rim, !contentSized && styles.fill, { padding: visual.borderWidth + 1 }]}
      >
        <View
          style={[
            styles.inset,
            !contentSized && styles.fill,
            { borderColor: visual.insetColor },
          ]}
        >
          <LinearGradient
            colors={visual.surfaceGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.inner, !contentSized && styles.fill, innerStyle]}
          >
            {children}
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  outer: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 7 },
  },
  interactionHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.lg + 3,
    borderWidth: 2,
    transform: [{ scale: 1.025 }],
  },
  rim: { borderRadius: RADIUS.lg },
  inset: {
    borderRadius: RADIUS.lg - 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    overflow: 'hidden',
    borderRadius: RADIUS.lg - 4,
  },
});
