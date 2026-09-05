import React from 'react';
import { I18nManager, StyleSheet, Text, type TextProps } from 'react-native';
import {
  FONT,
  FONT_FAMILY,
  LINE_HEIGHT,
  SEMANTIC_COLOR,
} from './design-tokens';

export type ThemedTextRole =
  | 'default'
  | 'title'
  | 'display'
  | 'defaultSemiBold'
  | 'subtitle'
  | 'label'
  | 'caption'
  | 'numeric'
  | 'link';

export interface ThemedTextProps extends TextProps {
  className?: string;
  type?: ThemedTextRole;
  /**
   * Use for technical identifiers such as room codes. It keeps the visual
   * ordering predictable even inside Arabic layouts.
   */
  forceLtr?: boolean;
}

export function ThemedText({
  className,
  style,
  type = 'default',
  forceLtr = false,
  allowFontScaling = true,
  ...rest
}: ThemedTextProps) {
  return (
    <Text
      className={className}
      allowFontScaling={allowFontScaling}
      style={[
        styles.base,
        roleStyles[type],
        forceLtr && styles.ltr,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: SEMANTIC_COLOR.text.primary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT.md,
    lineHeight: LINE_HEIGHT.md,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'auto',
  },
  ltr: {
    writingDirection: 'ltr',
    fontFamily: FONT_FAMILY.latin,
  },
});

const roleStyles = StyleSheet.create({
  default: {},
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT.xl,
    lineHeight: LINE_HEIGHT.xl,
  },
  display: {
    fontFamily: FONT_FAMILY.display,
    fontSize: FONT.hero,
    lineHeight: LINE_HEIGHT.hero,
    letterSpacing: 0.4,
  },
  defaultSemiBold: {
    fontFamily: FONT_FAMILY.semibold,
  },
  subtitle: {
    color: SEMANTIC_COLOR.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT.sm,
    lineHeight: LINE_HEIGHT.sm,
  },
  label: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: FONT.sm,
    lineHeight: LINE_HEIGHT.sm,
  },
  caption: {
    color: SEMANTIC_COLOR.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT.xs,
    lineHeight: LINE_HEIGHT.xs,
  },
  numeric: {
    fontFamily: FONT_FAMILY.latinBold,
    fontSize: FONT.base,
    lineHeight: LINE_HEIGHT.base,
    fontVariant: ['tabular-nums'],
    writingDirection: 'ltr',
  },
  link: {
    color: SEMANTIC_COLOR.accent.primary,
    fontFamily: FONT_FAMILY.semibold,
  },
});

export default ThemedText;
