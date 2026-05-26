/**
 * ThemedText
 * ──────────
 * Lightweight wrapper around React Native <Text> that is compatible with
 * both NativeWind (className prop) and standard style prop.
 *
 * Drop-in replacement for the old Expo scaffold ThemedText that was removed.
 * Exported as both named export and aliased default to satisfy all import styles.
 */
import React from 'react';
import { Text, TextProps } from 'react-native';

export interface ThemedTextProps extends TextProps {
  /** NativeWind / Tailwind class string (passed through as-is via cssInterop) */
  className?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
}

export function ThemedText({ className, style, type: _type, ...rest }: ThemedTextProps) {
  return <Text className={className} style={style} {...rest} />;
}

export default ThemedText;
