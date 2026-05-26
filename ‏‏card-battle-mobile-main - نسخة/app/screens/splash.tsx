/**
 * SplashScreen — Redesigned: Professional, clean, fully responsive.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring,
  withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { loadStats } from '@/lib/stats/storage';
import { PlayerStats } from '@/lib/stats/types';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL, SHADOW } from '@/components/ui/design-tokens';

// ─── Animated entrance wrapper ────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const op = useSharedValue(0);
  const y = useSharedValue(20);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 400 }));
    y.value = withDelay(delay, withSpring(0, { damping: 16 }));
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: y.value }] }));
  return <Animated.View style={s}>{children}</Animated.View>;
}

// ─── Pulsing CTA ─────────────────────────────────────────────────────────────
function PulsingPlay({ onPress, label }: { onPress: () => void; label: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.00, { duration: 850, easing: Easing.inOut(Easing.sin) })
      ), -1, false
    );
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[s, { width: '100%' }]}>
      <TouchableOpacity style={styles.primaryBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.primaryBtnIcon}>⚔️</Text>
        <Text style={styles.primaryBtnText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ num, label, color }: { num: string | number; label: string; color: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statNum, { color }]}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Nav button ───────────────────────────────────────────────────────────────
function NavBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navBtn} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.navIcon}>{icon}</Text>
      <Text style={styles.navLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SplashScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [stats, setStats] = useState<PlayerStats | null>(null);
  useEffect(() => { loadStats().then(setStats); }, []);

  const totalMatches = stats?.totalMatches ?? 0;
  const totalWins = stats?.totalWins ?? 0;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const streak = stats?.currentWinStreak ?? 0;

  // ─ Left panel (portrait: top)
  const heroPanel = (
    <FadeIn delay={0}>
      <View style={styles.heroPanel}>
        <Text style={styles.logoIcon}>🃏</Text>
        <Text style={styles.logoTitle}>Card Clash</Text>
        <Text style={styles.logoTagline}>المواجهة الأسطورية للكروت</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 سلسلة {streak} انتصارات!</Text>
          </View>
        )}
      </View>
    </FadeIn>
  );

  // ─ Right / bottom content
  const content = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, isLandscape && { paddingTop: SPACE.lg }]}
    >
      {/* Stats strip */}
      <FadeIn delay={120}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>📊 إحصائياتك</Text>
          <View style={styles.statsRow}>
            <StatPill num={totalWins} label="انتصارات" color={COLOR.green} />
            <View style={styles.divider} />
            <StatPill num={`${winRate}%`} label="معدل الفوز" color={COLOR.amber} />
            <View style={styles.divider} />
            <StatPill num={totalMatches} label="مباريات" color={COLOR.gold} />
            <View style={styles.divider} />
            <StatPill num={stats?.bestWinStreak ?? 0} label="أفضل سلسلة" color="#fb923c" />
          </View>
        </View>
      </FadeIn>

      {/* Solo CTA */}
      <FadeIn delay={240}>
        <PulsingPlay
          onPress={() => router.push('/screens/game-mode' as any)}
          label="ابدأ المواجهة"
        />
      </FadeIn>

      {/* ─── Multiplayer Button ─────────────────────────────────────────── */}
      <FadeIn delay={320}>
        <TouchableOpacity
          style={styles.multiplayerBtn}
          onPress={() => router.push('/screens/multiplayer-lobby' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.multiplayerBtnIcon}>🌐</Text>
          <View style={styles.multiplayerBtnTextWrap}>
            <Text style={styles.multiplayerBtnTitle}>العب أونلاين</Text>
            <Text style={styles.multiplayerBtnSub}>تحدَّ صديقك في الوقت الحقيقي</Text>
          </View>
          <Text style={styles.multiplayerArrow}>›</Text>
        </TouchableOpacity>
      </FadeIn>
      {/* ──────────────────────────────────────────────────────────────────── */}

      {/* Nav grid */}
      <FadeIn delay={400}>
        <View style={styles.navRow}>
          <NavBtn icon="📊" label="الإحصائيات" onPress={() => router.push('/screens/stats' as any)} />
          <NavBtn icon="🃏" label="المجموعة" onPress={() => router.push('/screens/cards-gallery' as any)} />
          <NavBtn icon="⚙️" label="الإعدادات" onPress={() => router.push('/screens/settings' as any)} />
        </View>
      </FadeIn>

      <Text style={styles.version}>Card Clash v2.0</Text>
    </ScrollView>
  );

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        {isLandscape ? (
          <View style={styles.landscapeRoot}>
            <View style={styles.landscapeLeft}>{heroPanel}</View>
            <View style={styles.landscapeRight}>{content}</View>
          </View>
        ) : (
          <View style={styles.portraitRoot}>
            {heroPanel}
            <View style={{ flex: 1 }}>{content}</View>
          </View>
        )}
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // ─ Layout
  landscapeRoot: { flex: 1, flexDirection: 'row' },
  landscapeLeft: {
    width: '36%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(228,165,42,0.12)',
    paddingHorizontal: SPACE.xl,
  },
  landscapeRight: { flex: 1, paddingHorizontal: SPACE.xl },
  portraitRoot: { flex: 1, paddingHorizontal: SPACE.lg },
  scrollContent: {
    gap: SPACE.lg,
    paddingBottom: SPACE.xxl + SPACE.xl,
    paddingTop: SPACE.md,
  },

  // ─ Hero
  heroPanel: { alignItems: 'center', gap: SPACE.sm },
  logoIcon: { fontSize: 56 },
  logoTitle: {
    fontSize: FONT.hero,
    color: COLOR.gold,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(228,165,42,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  logoTagline: {
    color: COLOR.textMuted,
    fontSize: FONT.sm,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  streakBadge: {
    marginTop: SPACE.xs,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.xs,
    backgroundColor: 'rgba(251,146,60,0.15)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.4)',
  },
  streakText: { color: '#fb923c', fontSize: FONT.sm },

  // ─ Panel
  panel: {
    ...GLASS_PANEL,
    padding: SPACE.lg,
  },
  panelTitle: {
    color: COLOR.gold,
    fontSize: FONT.sm,
    letterSpacing: 0.4,
    marginBottom: SPACE.md,
  },

  // ─ Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(228,165,42,0.15)',
  },
  statPill: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: FONT.xl },
  statLabel: { color: COLOR.textMuted, fontSize: FONT.xs - 2, marginTop: 2 },

  // ─ Primary CTA
  primaryBtn: {
    backgroundColor: COLOR.gold,
    paddingVertical: SPACE.lg,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACE.sm,
    ...SHADOW.gold,
  },
  primaryBtnIcon: { fontSize: 22 },
  primaryBtnText: {
    color: '#1A0D1A',
    fontSize: FONT.xl,
    letterSpacing: 0.5,
  },

  // ─ Multiplayer Button
  multiplayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    backgroundColor: 'rgba(96,165,250,0.08)',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(96,165,250,0.35)',
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.xl,
  },
  multiplayerBtnIcon: { fontSize: 26 },
  multiplayerBtnTextWrap: { flex: 1, gap: 2 },
  multiplayerBtnTitle: {
    color: '#93c5fd',
    fontSize: FONT.base,
    letterSpacing: 0.3,
  },
  multiplayerBtnSub: {
    color: '#475569',
    fontSize: FONT.xs,
  },
  multiplayerArrow: {
    color: '#60a5fa',
    fontSize: 28,
    lineHeight: 32,
  },

  // ─ Nav grid
  navRow: {
    flexDirection: 'row',
    gap: SPACE.md,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACE.md,
    backgroundColor: 'rgba(228,165,42,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(228,165,42,0.25)',
    gap: SPACE.xs,
  },
  navIcon: { fontSize: 22 },
  navLabel: { color: COLOR.gold, fontSize: FONT.xs },

  version: {
    color: 'rgba(255,255,255,0.12)',
    fontSize: FONT.xs - 2,
    textAlign: 'center',
    letterSpacing: 0.4,
    paddingBottom: SPACE.md,
  },
});
