import React from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { COLOR, SPACE, RADIUS, FONT, SHADOW, GLASS_PANEL, FONT_FAMILY } from '@/components/ui/design-tokens';

const MODES = [
  {
    icon: '⚔️',
    title: 'لعب فردي',
    subtitle: 'العب ضد الذكاء الاصطناعي',
    route: '/screens/difficulty' as const,
    accentColor: '#E4A52A',
  },
  {
    icon: '🌐',
    title: 'لعب أونلاين',
    subtitle: 'واجه لاعبين حقيقيين',
    route: '/screens/multiplayer-lobby' as const,
    accentColor: '#60A5FA',
  },
  {
    icon: '📚',
    title: 'المجموعة',
    subtitle: 'استعرض كروتك',
    route: '/screens/collection' as const,
    accentColor: '#4ADE80',
  },
];

export default function GameModeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={[styles.container, isLandscape && { paddingTop: SPACE.md, paddingBottom: SPACE.md }]}>
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, isLandscape && { marginBottom: SPACE.sm }]}
            onPress={() => router.push('/screens/splash' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>

          {/* Title */}
          <View style={[styles.header, isLandscape && { marginBottom: SPACE.md }]}>
            <Text style={[styles.title, isLandscape && { fontSize: FONT.xl }]}>اختر نمط اللعب</Text>
            <Text style={[styles.subtitle, isLandscape && { fontSize: FONT.sm, marginTop: 0 }]}>كيف تريد أن تلعب؟</Text>
          </View>

          {/* Mode cards grid */}
          <View style={[styles.modeGrid, { flexDirection: isLandscape ? 'row' : 'column' }]}>
            {MODES.map((mode) => (
              <TouchableOpacity
                key={mode.route}
                style={[
                  styles.modeCard,
                  { flex: 1, width: isLandscape ? undefined : '100%', marginBottom: isLandscape ? 0 : SPACE.sm }
                ]}
                onPress={() => router.push(mode.route as any)}
                activeOpacity={0.8}
              >
                {/* Accent top bar */}
                <View style={[styles.cardTopAccent, { backgroundColor: mode.accentColor, marginBottom: isLandscape ? SPACE.md : SPACE.sm }]} />

                <View style={[isLandscape ? {} : { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: SPACE.md, justifyContent: 'space-between' }]}>
                  <Text style={[styles.modeIcon, isLandscape ? {} : { fontSize: 32, marginBottom: 0, marginRight: SPACE.md }]}>{mode.icon}</Text>

                  <View style={[isLandscape ? { alignItems: 'center' } : { flex: 1, alignItems: 'flex-start' }]}>
                    <Text style={[styles.modeTitle, { color: mode.accentColor }, isLandscape && { fontSize: FONT.lg }]}>
                      {mode.title}
                    </Text>
                    <Text style={[styles.modeSubtitle, isLandscape && { fontSize: FONT.xs, marginBottom: SPACE.md }, !isLandscape && { marginBottom: 0, textAlign: 'left' }]}>{mode.subtitle}</Text>
                  </View>

                  {/* Bottom arrow */}
                  <View style={[styles.cardArrow, { borderColor: mode.accentColor + '50' }, !isLandscape && { transform: [{ scale: 0.8 }] }]}>
                    <Text style={[styles.cardArrowText, { color: mode.accentColor }]}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── زر البيئة التجريبية ── */}
          <TouchableOpacity
            style={styles.sandboxBtn}
            onPress={() => router.push('/screens/sandbox' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.sandboxIcon}>🧪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sandboxTitle}>البيئة التجريبية</Text>
              <Text style={styles.sandboxSub}>حاكي المعارك واختبر القدرات بدون لعب</Text>
            </View>
            <Text style={styles.sandboxArrow}>→</Text>
          </TouchableOpacity>

        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.xxl,
  },

  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(228,165,42,0.3)',
    marginBottom: SPACE.xl,
  },
  backBtnText: {
    color: COLOR.gold,
    fontSize: FONT.md,
  },

  header: {
    alignItems: 'center',
    marginBottom: SPACE.xxl,
  },
  title: {
    fontSize: FONT.hero,
    color: COLOR.gold,
    letterSpacing: 1,
    textShadowColor: 'rgba(228,165,42,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  subtitle: {
    fontSize: FONT.base,
    color: COLOR.textMuted,
    marginTop: SPACE.xs,
  },

  modeGrid: {
    flex: 1,
    gap: SPACE.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modeCard: {
    ...GLASS_PANEL,
    paddingTop: 0,
    paddingBottom: SPACE.md,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    maxWidth: 400,
  },

  cardTopAccent: {
    width: '100%',
    height: 4,
    marginBottom: SPACE.xl,
  },

  modeIcon: {
    fontSize: 44,
    marginBottom: SPACE.md,
  },

  modeTitle: {
    fontSize: FONT.xl,
    textAlign: 'center',
    marginBottom: SPACE.xs,
  },

  modeSubtitle: {
    fontSize: FONT.sm,
    color: COLOR.textMuted,
    textAlign: 'center',
    marginBottom: SPACE.xl,
  },

  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardArrowText: {
    fontSize: FONT.lg,
  },

  // ── sandbox button ──
  sandboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.md,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(134,239,172,0.35)',
    backgroundColor: 'rgba(134,239,172,0.07)',
    shadowColor: '#4ade80',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  sandboxIcon:  { fontSize: 28 },
  sandboxTitle: { fontSize: FONT.md, fontWeight: '800', color: '#4ade80' },
  sandboxSub:   { fontSize: FONT.xs, color: COLOR.textMuted, marginTop: 2 },
  sandboxArrow: { fontSize: FONT.lg, color: '#4ade80' },
});
