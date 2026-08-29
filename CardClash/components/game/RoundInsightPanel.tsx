import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import type { RoundInsight, RoundInsightTone, RoundTimelineStep } from '@/lib/game/round-insights';

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

export function RoundTimelinePanel({ steps, testID, compact = false }: { steps: RoundTimelineStep[]; testID?: string; compact?: boolean }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  // الجوال يعرض ملخصاً ثابت الارتفاع؛ النص الكامل متاح في نافذة «التفاصيل».
  const compactLineCount = 1;

  if (steps.length === 0) return null;

  const timelineSteps = steps.slice(0, 3);

  return (
    <>
      <View testID={testID} style={[styles.panel, styles.timelinePanel, compact && styles.panelCompact]} accessible accessibilityLiveRegion="polite">
        <View style={styles.timelineHeader}>
          <Text style={[styles.title, compact && styles.titleCompact]}>⏱️ كيف حُسمت الجولة؟</Text>
          {compact && (
            <TouchableOpacity
              testID={`${testID ?? 'round-timeline'}-details-button`}
              style={styles.detailsButton}
              onPress={() => setIsDetailsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="فتح التفاصيل الكاملة لخط زمني الجولة"
              activeOpacity={0.76}
            >
              <Text style={styles.detailsButtonText}>التفاصيل</Text>
            </TouchableOpacity>
          )}
        </View>
      {timelineSteps.map((step, index) => (
        <View key={step.id} style={styles.timelineRow}>
          <View style={[styles.timelineIndex, { borderColor: toneColor[step.tone] }]}>
            <Text style={[styles.timelineIndexText, { color: toneColor[step.tone] }]}>{index + 1}</Text>
          </View>
          <View style={styles.timelineCopy}>
            <Text style={[styles.timelineLabel, { color: toneColor[step.tone] }]}>{step.label}</Text>
            <Text
              style={[styles.text, compact && styles.timelineTextCompact, { color: '#D9F0EC' }]}
              numberOfLines={compact ? compactLineCount : 3}
              ellipsizeMode="tail"
            >
              {step.text}
            </Text>
          </View>
        </View>
      ))}
      </View>

      <Modal
        visible={isDetailsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDetailsOpen(false)}
      >
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsSheet} accessibilityViewIsModal>
            <View style={styles.detailsSheetHeader}>
              <Text style={styles.detailsTitle}>تفاصيل حسم الجولة</Text>
              <TouchableOpacity
                onPress={() => setIsDetailsOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="إغلاق تفاصيل حسم الجولة"
                style={styles.detailsCloseButton}
              >
                <Text style={styles.detailsCloseText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
            {timelineSteps.map((step, index) => (
              <View key={step.id} style={styles.detailsStep}>
                <View style={[styles.timelineIndex, { borderColor: toneColor[step.tone] }]}>
                  <Text style={[styles.timelineIndexText, { color: toneColor[step.tone] }]}>{index + 1}</Text>
                </View>
                <View style={styles.timelineCopy}>
                  <Text style={[styles.timelineLabel, { color: toneColor[step.tone] }]}>{step.label}</Text>
                  <Text style={[styles.detailsBody, { color: '#EAFBF7' }]}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </>
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
  timelinePanel: { borderColor: 'rgba(228,165,42,0.32)', gap: 6 },
  timelineHeader: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  timelineRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 7 },
  timelineIndex: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  timelineIndexText: { fontSize: 10, fontWeight: '800' },
  timelineCopy: { flex: 1, minWidth: 0, flexShrink: 1, gap: 2 },
  timelineLabel: { fontSize: 10, fontWeight: '800', textAlign: 'right' },
  timelineTextCompact: { fontSize: 10, lineHeight: 14, flexShrink: 1 },
  detailsButton: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(57,230,208,0.42)', backgroundColor: 'rgba(57,230,208,0.10)' },
  detailsButtonText: { color: '#7FF7E5', fontSize: 9, fontWeight: '800' },
  detailsOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(2,8,12,0.76)' },
  detailsSheet: { width: '100%', maxWidth: 390, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(57,230,208,0.38)', backgroundColor: '#07151B', padding: 16, gap: 12 },
  detailsSheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  detailsTitle: { flex: 1, color: '#EAFBF7', fontSize: 15, fontWeight: '800', textAlign: 'right' },
  detailsCloseButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)' },
  detailsCloseText: { color: '#FDA4AF', fontSize: 11, fontWeight: '700' },
  detailsStep: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(191,250,242,0.10)' },
  detailsBody: { fontSize: 13, lineHeight: 20, textAlign: 'right' },
});
