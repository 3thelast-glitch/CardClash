import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bot,
  FlaskConical,
  Library,
  Radio,
  Users,
  Wifi,
} from 'lucide-react-native';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  FONT,
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
  TOUCH_TARGET,
} from '@/components/ui/design-tokens';
import { getVisibleMenuItems, isDeveloperBuild } from '@/lib/build-variant';
import { useGame } from '@/lib/game/game-context';

type ModeItem = {
  key: string;
  title: string;
  subtitle: string;
  route: string;
  matchMode: 'solo' | 'local' | 'lan';
  accent: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  developerOnly?: boolean;
};

const MODES: ModeItem[] = [
  {
    key: 'solo',
    title: 'ضد الذكاء الاصطناعي',
    subtitle: 'اختر الصعوبة وابدأ مباراة فردية.',
    route: '/screens/difficulty',
    matchMode: 'solo',
    accent: SEMANTIC_COLOR.accent.primary,
    icon: Bot,
  },
  {
    key: 'local',
    title: 'جهاز واحد',
    subtitle: 'رتّبا التشكيلتين بالتناوب على الهاتف نفسه.',
    route: '/screens/rounds-config',
    matchMode: 'local',
    accent: SEMANTIC_COLOR.status.success,
    icon: Users,
  },
  {
    key: 'online',
    title: 'أونلاين',
    subtitle: 'مطابقة تنافسية أو غرفة خاصة مع صديق.',
    route: '/screens/multiplayer-lobby',
    matchMode: 'solo',
    accent: SEMANTIC_COLOR.accent.secondary,
    icon: Wifi,
  },
  {
    key: 'lan',
    title: 'Wi‑Fi محلي',
    subtitle: 'اتصال مباشر بين جهازين على الشبكة المحلية.',
    route: '/screens/local-lan',
    matchMode: 'lan',
    accent: '#C084FC',
    icon: Radio,
  },
  {
    key: 'collection',
    title: 'المجموعة',
    subtitle: 'استعراض مكتبة الكروت ومحتوى المطوّر.',
    route: '/screens/collection',
    matchMode: 'solo',
    accent: SEMANTIC_COLOR.status.warning,
    icon: Library,
    developerOnly: true,
  },
];

export default function GameModeScreen() {
  const router = useRouter();
  const { setMatchMode } = useGame();
  const { width } = useWindowDimensions();
  const isDeveloper = isDeveloperBuild(Constants.expoConfig?.extra);
  const visibleModes = getVisibleMenuItems(MODES, Constants.expoConfig?.extra) as ModeItem[];
  const twoColumns = width >= 720;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={SEMANTIC_COLOR.accent.primary} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <ThemedText type="title">اختر نمط اللعب</ThemedText>
              <ThemedText type="subtitle">كل الأنماط الحالية محفوظة كما هي.</ThemedText>
            </View>
          </View>

          <View style={[styles.grid, twoColumns && styles.gridWide]}>
            {visibleModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <TouchableOpacity
                  key={mode.key}
                  accessibilityRole="button"
                  accessibilityLabel={mode.title}
                  accessibilityHint={mode.subtitle}
                  activeOpacity={0.84}
                  style={[styles.modeTouch, twoColumns && styles.modeTouchWide]}
                  onPress={() => {
                    setMatchMode(mode.matchMode);
                    router.push(mode.route as any);
                  }}
                >
                  <ObsidianPanel
                    style={styles.modeCard}
                    accent={mode.key === 'solo'}
                  >
                    <View style={[styles.modeIcon, { borderColor: `${mode.accent}66`, backgroundColor: `${mode.accent}12` }]}>
                      <Icon size={24} color={mode.accent} />
                    </View>
                    <View style={styles.modeCopy}>
                      <ThemedText type="defaultSemiBold" style={styles.modeTitle}>
                        {mode.title}
                      </ThemedText>
                      <ThemedText type="caption" style={styles.modeSubtitle}>
                        {mode.subtitle}
                      </ThemedText>
                    </View>
                    <View style={[styles.modeRail, { backgroundColor: mode.accent }]} />
                  </ObsidianPanel>
                </TouchableOpacity>
              );
            })}
          </View>

          {isDeveloper && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="البيئة التجريبية"
              onPress={() => router.push('/screens/sandbox' as any)}
              style={styles.sandboxTouch}
            >
              <ObsidianPanel style={styles.sandbox}>
                <FlaskConical size={22} color={SEMANTIC_COLOR.status.success} />
                <View style={styles.sandboxCopy}>
                  <ThemedText type="defaultSemiBold">البيئة التجريبية</ThemedText>
                  <ThemedText type="caption">
                    اختبر القدرات وسيناريوهات المعركة ضمن نسخة المطوّر فقط.
                  </ThemedText>
                </View>
              </ObsidianPanel>
            </TouchableOpacity>
          )}
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    padding: SPACE.lg,
    paddingBottom: SPACE.xxxl,
    gap: SPACE.xl,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  backButton: {
    width: TOUCH_TARGET.default,
    height: TOUCH_TARGET.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(19,30,47,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, alignItems: 'flex-end' },
  grid: { gap: SPACE.md },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  modeTouch: { width: '100%' },
  modeTouchWide: { width: '48%', flexGrow: 1 },
  modeCard: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
  },
  modeIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCopy: { flex: 1, alignItems: 'flex-end', gap: SPACE.xs },
  modeTitle: { fontSize: FONT.base, textAlign: 'right' },
  modeSubtitle: { textAlign: 'right' },
  modeRail: { width: 4, alignSelf: 'stretch', borderRadius: RADIUS.full },
  sandboxTouch: { width: '100%' },
  sandbox: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  sandboxCopy: { flex: 1, alignItems: 'flex-end', gap: SPACE.xs },
});
