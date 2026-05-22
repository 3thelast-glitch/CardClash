/**
 * DifficultyScreen — 4 levels only.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL, SHADOW } from '@/components/ui/design-tokens';

export type DifficultyLevel = 1 | 2 | 3 | 4;

const LEVELS: {
  level: DifficultyLevel;
  label: string;
  emoji: string;
  desc: string;
  color: string;
}[] = [
  { level: 1, label: 'سهل',    emoji: '🌱', desc: 'للمبتدئين',           color: '#4ade80' },
  { level: 2, label: 'متوسط',  emoji: '⚡', desc: 'تحدٍّ معقول',         color: '#60a5fa' },
  { level: 3, label: 'صعب',    emoji: '🔥', desc: 'يتطلب استراتيجية',    color: '#fb923c' },
  { level: 4, label: 'أسطوري', emoji: '👑', desc: 'أعلى مستوى ممكن',     color: COLOR.gold },
];

export default function DifficultyScreen() {
  const router = useRouter();
  const { setDifficulty } = useGame();
  const [selected, setSelected] = useState<DifficultyLevel | null>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const handleContinue = () => {
    if (!selected) return;
    setDifficulty(selected);
    router.push('/screens/rounds-config' as any);
  };

  const levelsContent = (
    <View style={[styles.levelsGrid, isLandscape && styles.levelsGridLandscape]}>
      {LEVELS.map((lvl) => {
        const active = selected === lvl.level;
        return (
          <TouchableOpacity
            key={lvl.level}
            style={[
              styles.levelCard,
              active && { borderColor: lvl.color, backgroundColor: lvl.color + '18', ...SHADOW.card },
              isLandscape && styles.levelCardLandscape,
            ]}
            onPress={() => setSelected(lvl.level)}
            activeOpacity={0.75}
          >
            {active && <View style={[styles.activeBar, { backgroundColor: lvl.color }]} />}

            <Text style={styles.levelEmoji}>{lvl.emoji}</Text>
            <Text style={[styles.levelLabel, active && { color: lvl.color }]}>{lvl.label}</Text>
            <Text style={styles.levelDesc}>{lvl.desc}</Text>

            {/* Stars — max 4 */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4].map((i) => (
                <Text key={i} style={{ fontSize: 12, color: i <= lvl.level ? lvl.color : 'rgba(255,255,255,0.12)' }}>
                  ★
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>اختر المستوى</Text>
            <Text style={styles.subtitle}>كلما زاد المستوى كلما صعبت المواجهة</Text>
          </View>

          {levelsContent}

          {selected && (
            <View style={styles.selectedHint}>
              <Text style={styles.selectedHintText}>
                {LEVELS.find(l => l.level === selected)?.emoji}{' '}
                اخترت: {LEVELS.find(l => l.level === selected)?.label}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <Text style={[styles.continueBtnText, !selected && styles.continueBtnTextDisabled]}>
              التالي →
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.xxl + SPACE.xl,
    gap: SPACE.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(228,165,42,0.3)',
  },
  backBtnText: { color: COLOR.gold, fontSize: FONT.md },
  header: { alignItems: 'center', gap: SPACE.xs },
  title: { fontSize: FONT.hero, color: COLOR.gold, letterSpacing: 1, textAlign: 'center' },
  subtitle: { color: COLOR.textMuted, fontSize: FONT.sm, textAlign: 'center' },
  levelsGrid: { gap: SPACE.md },
  levelsGridLandscape: { flexDirection: 'row', flexWrap: 'nowrap' },
  levelCard: {
    flex: 1,
    ...GLASS_PANEL,
    padding: SPACE.lg,
    alignItems: 'center',
    gap: SPACE.xs,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  levelCardLandscape: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingVertical: SPACE.xl,
    minWidth: 0,
  },
  activeBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    borderTopLeftRadius: RADIUS.md,
    borderBottomLeftRadius: RADIUS.md,
  },
  levelEmoji: { fontSize: 28, marginRight: SPACE.md },
  levelLabel: { fontSize: FONT.lg, color: COLOR.textPrimary, flex: 1 },
  levelDesc: { fontSize: FONT.xs, color: COLOR.textMuted, flex: 1 },
  starsRow: { flexDirection: 'row', gap: 2 },
  selectedHint: {
    alignItems: 'center',
    paddingVertical: SPACE.sm,
    backgroundColor: 'rgba(228,165,42,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(228,165,42,0.25)',
  },
  selectedHintText: { color: COLOR.gold, fontSize: FONT.md },
  continueBtn: {
    backgroundColor: COLOR.gold,
    paddingVertical: SPACE.lg,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    ...SHADOW.gold,
  },
  continueBtnDisabled: { backgroundColor: 'rgba(228,165,42,0.2)', shadowOpacity: 0, elevation: 0 },
  continueBtnText: { fontSize: FONT.xl, color: '#1A0D1A' },
  continueBtnTextDisabled: { color: 'rgba(255,255,255,0.25)' },
});
