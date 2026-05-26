/**
 * LeaderboardScreen (number picker) — Redesigned: Professional, responsive, clean.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL, SHADOW } from '@/components/ui/design-tokens';

export default function LeaderboardScreen() {
  const router = useRouter();
  const { state } = useGame();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const totalRounds = state.totalRounds || 5;
  const numberOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const toggleNumber = (num: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num);
      if (prev.length < totalRounds) return [...prev, num];
      return prev;
    });
  };

  const handleRandomSelect = () => {
    const shuffled = [...numberOptions].sort(() => Math.random() - 0.5);
    setSelectedNumbers(shuffled.slice(0, totalRounds));
  };

  const handleContinue = () => {
    if (selectedNumbers.length === totalRounds) {
      router.push('/screens/card-selection' as any);
    }
  };

  const progress = selectedNumbers.length / totalRounds;

  // Pill size adapts to screen width — always 4 columns minimum
  const cols = isLandscape ? 10 : 5;
  const gap = SPACE.sm;
  const hPad = SPACE.lg * 2 + SPACE.xl * 2;
  const pillSize = Math.max(44, Math.min(64, (width - hPad - gap * (cols - 1)) / cols));

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/screens/rounds-config' as any)} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🎲 أرقامك المحظوظة</Text>
            <Text style={styles.subtitle}>اختر {totalRounds} أرقام لجولاتك</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <View style={[styles.progressBadge, selectedNumbers.length === totalRounds && styles.progressBadgeDone]}>
              <Text style={styles.progressBadgeText}>
                {selectedNumbers.length} / {totalRounds}
              </Text>
            </View>
          </View>

          {/* Numbers grid */}
          <View style={styles.panel}>
            <View style={[styles.numbersGrid, { gap }]}>
              {numberOptions.map((num) => {
                const isSelected = selectedNumbers.includes(num);
                const order = isSelected ? selectedNumbers.indexOf(num) + 1 : null;
                return (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.numPill,
                      isSelected && styles.numPillSelected,
                      { width: pillSize, height: pillSize, borderRadius: pillSize / 2 },
                    ]}
                    onPress={() => toggleNumber(num)}
                    activeOpacity={0.7}
                  >
                    {order !== null ? (
                      <Text style={[styles.numOrder, { fontSize: pillSize * 0.32 }]}>{order}</Text>
                    ) : (
                      <Text style={[styles.numText, isSelected && styles.numTextSelected, { fontSize: pillSize * 0.36 }]}>
                        {num}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selected order preview */}
          {selectedNumbers.length > 0 && (
            <View style={styles.orderPreview}>
              <Text style={styles.orderPreviewLabel}>ترتيب الجولات:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.orderChips}>
                {selectedNumbers.map((n, i) => (
                  <View key={i} style={styles.orderChip}>
                    <Text style={styles.orderChipText}>ج{i + 1}: {n}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.randomBtn} onPress={handleRandomSelect} activeOpacity={0.8}>
              <Text style={styles.randomBtnText}>🎲 عشوائي</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.continueBtn, selectedNumbers.length !== totalRounds && styles.continueBtnDisabled]}
              onPress={handleContinue}
              disabled={selectedNumbers.length !== totalRounds}
              activeOpacity={0.85}
            >
              <Text style={[styles.continueBtnText, selectedNumbers.length !== totalRounds && styles.continueBtnTextDisabled]}>
                التالي →
              </Text>
            </TouchableOpacity>
          </View>

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
  title: { fontSize: FONT.xxl, color: COLOR.gold, letterSpacing: 0.8, textAlign: 'center' },
  subtitle: { color: COLOR.textMuted, fontSize: FONT.base, textAlign: 'center' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
  },
  progressTrack: {
    flex: 1, height: 8, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(228,165,42,0.12)', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLOR.gold, borderRadius: RADIUS.full },
  progressBadge: {
    paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs,
    backgroundColor: 'rgba(228,165,42,0.1)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(228,165,42,0.3)',
    minWidth: 56,
    alignItems: 'center',
  },
  progressBadgeDone: { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: '#4ade80' },
  progressBadgeText: { color: COLOR.gold, fontSize: FONT.sm },

  panel: { ...GLASS_PANEL, padding: SPACE.xl },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  numPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(228,165,42,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACE.xs,
  },
  numPillSelected: {
    backgroundColor: '#14532d',
    borderColor: COLOR.green,
    ...SHADOW.card,
  },
  numText: { color: COLOR.textMuted, fontSize: FONT.base },
  numTextSelected: { color: COLOR.green },
  numOrder: { color: COLOR.green },

  orderPreview: {
    ...GLASS_PANEL,
    padding: SPACE.md,
    gap: SPACE.sm,
  },
  orderPreviewLabel: { color: COLOR.textMuted, fontSize: FONT.sm },
  orderChips: { gap: SPACE.xs, paddingVertical: SPACE.xs },
  orderChip: {
    paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
  },
  orderChipText: { color: COLOR.green, fontSize: FONT.sm },

  controls: { flexDirection: 'row', gap: SPACE.md },
  randomBtn: {
    flex: 1,
    paddingVertical: SPACE.lg,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    backgroundColor: 'rgba(228,165,42,0.1)',
    borderWidth: 1.5,
    borderColor: COLOR.goldDim,
  },
  randomBtnText: { color: COLOR.gold, fontSize: FONT.base },
  continueBtn: {
    flex: 2,
    backgroundColor: COLOR.gold,
    paddingVertical: SPACE.lg,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    ...SHADOW.gold,
  },
  continueBtnDisabled: { backgroundColor: 'rgba(228,165,42,0.2)', shadowOpacity: 0, elevation: 0 },
  continueBtnText: { fontSize: FONT.xl, color: '#1A0D1A' },
  continueBtnTextDisabled: { color: 'rgba(255,255,255,0.2)' },
});