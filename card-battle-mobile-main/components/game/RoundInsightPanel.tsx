import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import type { RoundInsight, RoundInsightTone } from '@/lib/game/round-insights';

interface RoundInsightPanelProps {
  title: string;
  insights: RoundInsight[];
  testID?: string;
  /** يحدّ من حجم المعاينة عندما توضع بين الكروت في ساحة عمودية ضيقة. */
  compact?: boolean;
}

const toneColor: Record<RoundInsightTone, string> = {
  positive: '#4ade80',
  negative: '#f87171',
  neutral: '#B8D6D6',
  accent: '#39E6D0',
};

export function RoundInsightPanel({ title, insights, testID, compact = false }: RoundInsightPanelProps) {
  if (insights.length === 0) return null;

  const visibleInsights = insights.slice(0, compact ? 1 : 4);
  const accessibilityLabel = [title, ...visibleInsights.map((insight) => insight.text)].join('، ');

  return (
    <View
      testID={testID}
      style={[styles.panel, compact && styles.panelCompact]}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {visibleInsights.map((insight) => (
        <View key={insight.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: toneColor[insight.tone] }]} />
          <Text style={[styles.text, compact && styles.textCompact, { color: toneColor[insight.tone] }]} numberOfLines={compact ? 1 : 2}>
            {insight.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    backgroundColor: 'rgba(5, 18, 24, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(57, 230, 208, 0.22)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  panelCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 3,
  },
  title: {
    color: '#EAFBF7',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleCompact: { fontSize: 10 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
  },
  textCompact: { fontSize: 9 },
});
