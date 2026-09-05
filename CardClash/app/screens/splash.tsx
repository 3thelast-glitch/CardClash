import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  BookOpen,
  Library,
  Settings,
  Wifi,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ProButton } from '@/components/ui/ProButton';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  FONT,
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
} from '@/components/ui/design-tokens';
import { isDeveloperBuild } from '@/lib/build-variant';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { loadStats } from '@/lib/stats/storage';
import type { PlayerStats } from '@/lib/stats/types';

function Entrance({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const { reduceMotion } = useMotionPreferences();

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 300 }));
  }, [delay, opacity, reduceMotion, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function SplashScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isDeveloper = isDeveloperBuild(Constants.expoConfig?.extra);
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    let active = true;
    loadStats().then((value) => { if (active) setStats(value); });
    return () => { active = false; };
  }, []);

  const totalMatches = stats?.totalMatches ?? 0;
  const totalWins = stats?.totalWins ?? 0;
  const winRate = totalMatches ? Math.round((totalWins / totalMatches) * 100) : 0;
  const version = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '—';

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={[styles.root, isLandscape && styles.rootLandscape]}>
          <Entrance>
            <View style={[styles.hero, isLandscape && styles.heroLandscape]}>
              <View style={styles.artShell}>
                <View pointerEvents="none" style={styles.heroHalo} />
                <Image
                  source={require('../../assets/images/splash-icon.png')}
                  resizeMode="contain"
                  style={styles.heroArt}
                  accessibilityLabel="شعار Card Clash"
                />
              </View>
              <ThemedText type="display" style={styles.logo} forceLtr>
                CARD CLASH
              </ThemedText>
              <ThemedText type="subtitle" style={styles.tagline}>
                مبارزات بطاقات 1 ضد 1 — قرار واضح، تأثير محسوب
              </ThemedText>
            </View>
          </Entrance>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            <Entrance delay={80}>
              <ObsidianPanel accent style={styles.playPanel}>
                <ThemedText type="title" style={styles.playTitle}>ابدأ المواجهة</ThemedText>
                <ThemedText type="subtitle" style={styles.playCopy}>
                  اختر النمط المناسب ثم جهّز جولاتك.
                </ThemedText>
                <ProButton
                  testID="primary-play-action"
                  label="العب الآن"
                  fullWidth
                  onPress={() => router.push('/screens/game-mode' as any)}
                  accessibilityHint="يفتح أنماط اللعب المتاحة"
                />
              </ObsidianPanel>
            </Entrance>

            <Entrance delay={140}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="اللعب أونلاين"
                onPress={() => router.push('/screens/multiplayer-lobby' as any)}
                style={styles.onlineCard}
              >
                <View style={styles.onlineIcon}>
                  <Wifi size={22} color={SEMANTIC_COLOR.accent.secondary} />
                </View>
                <View style={styles.onlineCopy}>
                  <ThemedText type="defaultSemiBold">اللعب أونلاين</ThemedText>
                  <ThemedText type="caption">مطابقة تنافسية أو غرفة خاصة برمز</ThemedText>
                </View>
              </TouchableOpacity>
            </Entrance>

            <Entrance delay={200}>
              <View style={styles.quickRow}>
                <QuickAction
                  icon={<BarChart3 size={20} color={SEMANTIC_COLOR.status.success} />}
                  label="الإحصائيات"
                  onPress={() => router.push('/screens/stats' as any)}
                />
                {isDeveloper && (
                  <QuickAction
                    icon={<Library size={20} color="#C084FC" />}
                    label="المجموعة"
                    onPress={() => router.push('/screens/cards-gallery' as any)}
                  />
                )}
                <QuickAction
                  icon={<Settings size={20} color={SEMANTIC_COLOR.accent.primary} />}
                  label="الإعدادات"
                  onPress={() => router.push('/screens/settings' as any)}
                />
                <QuickAction
                  icon={<BookOpen size={20} color={SEMANTIC_COLOR.status.warning} />}
                  label="كيف تلعب؟"
                  testID="how-to-play-link"
                  onPress={() => router.push('/screens/how-to-play' as any)}
                />
              </View>
            </Entrance>

            <Entrance delay={250}>
              <ObsidianPanel style={styles.statsPanel}>
                <Metric value={totalWins} label="انتصارات" />
                <Metric value={`${winRate}%`} label="معدل الفوز" />
                <Metric value={totalMatches} label="مباريات" />
                <Metric value={stats?.bestWinStreak ?? 0} label="أفضل سلسلة" />
              </ObsidianPanel>
            </Entrance>

            <ThemedText type="caption" style={styles.version} forceLtr>
              Card Clash v{version}
            </ThemedText>
          </ScrollView>
        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.quickAction}
    >
      {icon}
      <ThemedText type="caption" style={styles.quickLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="numeric" style={styles.metricValue}>{value}</ThemedText>
      <ThemedText type="caption">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    padding: SPACE.lg,
  },
  rootLandscape: { flexDirection: 'row', alignItems: 'stretch', gap: SPACE.xl },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    paddingVertical: SPACE.lg,
  },
  heroLandscape: { width: '38%', paddingHorizontal: SPACE.xl },
  artShell: {
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroHalo: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: 'rgba(57,230,208,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(57,230,208,0.18)',
  },
  heroArt: { width: 144, height: 144 },
  logo: {
    color: SEMANTIC_COLOR.text.primary,
    fontSize: FONT.hero,
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  tagline: { textAlign: 'center', maxWidth: 420 },
  content: { flex: 1 },
  contentInner: {
    gap: SPACE.md,
    paddingVertical: SPACE.lg,
    paddingBottom: SPACE.xxxl,
  },
  playPanel: { gap: SPACE.sm },
  playTitle: { textAlign: 'right' },
  playCopy: { textAlign: 'right', marginBottom: SPACE.sm },
  onlineCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(141,164,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(141,164,255,0.38)',
  },
  onlineIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(141,164,255,0.10)',
  },
  onlineCopy: { flex: 1, alignItems: 'flex-end' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  quickAction: {
    minWidth: 108,
    minHeight: 66,
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(19,30,47,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    padding: SPACE.sm,
  },
  quickLabel: { textAlign: 'center' },
  statsPanel: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  metric: { minWidth: 94, flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { color: SEMANTIC_COLOR.accent.primary, fontSize: FONT.lg },
  version: { textAlign: 'center', marginTop: SPACE.sm },
});
