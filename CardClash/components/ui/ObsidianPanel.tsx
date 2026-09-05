import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  RADIUS,
  SEMANTIC_COLOR,
  SHADOW,
  SPACE,
} from './design-tokens';

export function ObsidianPanel({
  children,
  style,
  raised = false,
  accent = false,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
  accent?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.shell,
        raised && styles.raised,
        accent && styles.accent,
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          raised
            ? ['rgba(27,42,64,0.96)', 'rgba(19,30,47,0.96)']
            : ['rgba(19,30,47,0.94)', 'rgba(11,20,34,0.94)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    position: 'relative',
    padding: SPACE.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    ...SHADOW.card,
  },
  raised: {
    borderColor: '#38506E',
  },
  accent: {
    borderColor: 'rgba(57,230,208,0.52)',
  },
});
