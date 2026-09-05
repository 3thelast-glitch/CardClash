import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ArrowLeft, Crown, Flame, Gauge, Leaf } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { LuxuryBackground } from '@/components/game/luxury-background';
import { ScreenContainer } from '@/components/screen-container';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ProButton } from '@/components/ui/ProButton';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { FONT, RADIUS, SEMANTIC_COLOR, SPACE, TOUCH_TARGET } from '@/components/ui/design-tokens';
import { useGame } from '@/lib/game/game-context';
import type { DifficultyLevel } from '@/lib/game/difficulty-types';

export type { DifficultyLevel };

const LEVELS: Array<{
  level: DifficultyLevel;
  label: string;
  description: string;
  accent: string;
  Icon: typeof Leaf;
}> = [
  { level: 1, label: 'سهل', description: 'اختيارات هادئة للتعرف على القواعد.', accent: SEMANTIC_COLOR.status.success, Icon: Leaf },
  { level: 2, label: 'متوسط', description: 'قرارات متوازنة وتحدٍ مناسب.', accent: SEMANTIC_COLOR.accent.secondary, Icon: Gauge },
  { level: 3, label: 'صعب', description: 'خصم يستغل الترتيب والقدرات بجدية.', accent: SEMANTIC_COLOR.status.warning, Icon: Flame },
  { level: 4, label: 'أسطوري', description: 'أعلى مستوى متاح في هذا النمط.', accent: SEMANTIC_COLOR.rarity.legendary, Icon: Crown },
];

export default function DifficultyScreen() {
  const router = useRouter();
  const { setDifficulty } = useGame();
  const [selected, setSelected] = useState<DifficultyLevel | null>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const continueToRules = () => {
    if (!selected) return;
    setDifficulty(selected);
    router.push('/screens/rounds-config' as any);
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            style={styles.back}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={SEMANTIC_COLOR.accent.primary} />
            <Text type="label" style={styles.backLabel}>رجوع</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text type="title" style={styles.title}>اختر مستوى المواجهة</Text>
            <Text style={styles.subtitle}>الصعوبة تغيّر قرارات البوت فقط؛ قواعد الكروت والقدرات تبقى كما هي.</Text>
          </View>

          <View style={[styles.grid, isLandscape && styles.gridLandscape]}>
            {LEVELS.map(({ level, label, description, accent, Icon }) => {
              const active = selected === level;
              return (
                <TouchableOpacity
                  key={level}
                  accessibilityRole="radio"
                  accessibilityLabel={`${label}. ${description}`}
                  accessibilityState={{ checked: active }}
                  activeOpacity={0.84}
                  onPress={() => setSelected(level)}
                  style={[styles.levelHitArea, isLandscape && styles.levelHitAreaLandscape]}
                >
                  <ObsidianPanel raised={active} accent={active} style={[styles.levelCard, active && { borderColor: accent }]}>
                    <View style={[styles.iconShell, { borderColor: `${accent}88`, backgroundColor: `${accent}16` }]}>
                      <Icon size={26} color={accent} />
                    </View>
                    <View style={styles.levelCopy}>
                      <View style={styles.levelTitleRow}>
                        <Text type="defaultSemiBold" style={[styles.levelTitle, active && { color: accent }]}>{label}</Text>
                        <Text forceLtr type="numeric" style={[styles.levelNumber, { color: accent }]}>{level}/4</Text>
                      </View>
                      <Text style={styles.levelDescription}>{description}</Text>
                    </View>
                    <View style={[styles.selectionMark, active && { borderColor: accent, backgroundColor: accent }]}>
                      {active && <View style={styles.selectionDot} />}
                    </View>
                  </ObsidianPanel>
                </TouchableOpacity>
              );
            })}
          </View>

          <ProButton
            fullWidth
            label={selected ? `متابعة — ${LEVELS.find(item => item.level === selected)?.label}` : 'اختر مستوى للمتابعة'}
            onPress={continueToRules}
            disabled={!selected}
            accessibilityHint="ينقلك إلى إعداد عدد الجولات والقدرات"
          />
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACE.xl, gap: SPACE.xl, backgroundColor: 'rgba(8,13,22,0.38)' },
  back: { minHeight: TOUCH_TARGET.default, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: SEMANTIC_COLOR.border.subtle, backgroundColor: 'rgba(19,30,47,0.72)' },
  backLabel: { color: SEMANTIC_COLOR.accent.primary },
  header: { alignItems: 'flex-end', gap: SPACE.sm, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { color: SEMANTIC_COLOR.text.primary, textAlign: 'right' },
  subtitle: { color: SEMANTIC_COLOR.text.secondary, textAlign: 'right', maxWidth: 620 },
  grid: { width: '100%', alignSelf: 'center', maxWidth: 980, gap: SPACE.md },
  gridLandscape: { flexDirection: 'row', alignItems: 'stretch' },
  levelHitArea: { width: '100%' },
  levelHitAreaLandscape: { flex: 1, minWidth: 0 },
  levelCard: { minHeight: 134, flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.md },
  iconShell: { width: 52, height: 52, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  levelCopy: { flex: 1, gap: SPACE.xs },
  levelTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
  levelTitle: { color: SEMANTIC_COLOR.text.primary, fontSize: FONT.lg, textAlign: 'right' },
  levelNumber: { fontSize: FONT.sm },
  levelDescription: { color: SEMANTIC_COLOR.text.secondary, fontSize: FONT.sm, textAlign: 'right' },
  selectionMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: SEMANTIC_COLOR.border.subtle, alignItems: 'center', justifyContent: 'center' },
  selectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SEMANTIC_COLOR.text.inverse },
});
