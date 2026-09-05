import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CardRarity } from '@/lib/game/types';
import {
  RADIUS,
  RARITY_COLOR,
  SEMANTIC_COLOR,
} from '@/components/ui/design-tokens';

const GRADIENTS: Record<CardRarity, readonly [string, string]> = {
  common: ['rgba(168,180,199,0.90)', 'rgba(72,88,111,0.78)'],
  rare: ['rgba(96,165,250,0.96)', 'rgba(37,99,235,0.72)'],
  epic: ['rgba(192,132,252,0.98)', 'rgba(126,34,206,0.74)'],
  legendary: ['rgba(244,201,106,1)', 'rgba(180,120,36,0.78)'],
  special: ['rgba(240,171,252,0.98)', 'rgba(168,85,247,0.72)'],
};

export function RarityFrame({
  rarity = 'common',
  selected = false,
  children,
  style,
}: {
  rarity?: CardRarity;
  selected?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.outer, { borderColor: RARITY_COLOR[rarity] }, selected && styles.selected, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={GRADIENTS[rarity]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rim}
      >
        <View style={styles.inner}>{children}</View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'visible',
  },
  selected: {
    borderColor: SEMANTIC_COLOR.accent.primary,
    borderWidth: 2,
    shadowColor: SEMANTIC_COLOR.accent.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 7,
  },
  rim: {
    padding: 2,
    borderRadius: RADIUS.lg,
  },
  inner: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: RADIUS.lg - 3,
    backgroundColor: SEMANTIC_COLOR.surface.default,
  },
});
