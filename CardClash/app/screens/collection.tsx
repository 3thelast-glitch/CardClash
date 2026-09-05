import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { ArrowLeft, Image as ImageIcon, Layers3, Wrench, Zap } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { LuxuryBackground } from '@/components/game/luxury-background';
import { ScreenContainer } from '@/components/screen-container';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { FONT, RADIUS, SEMANTIC_COLOR, SPACE, TOUCH_TARGET } from '@/components/ui/design-tokens';
import { isDeveloperBuild } from '@/lib/build-variant';

const CATEGORIES = [
  { id: 'cards', title: 'الكروت', subtitle: 'استعرض المحتوى والصور والإحصاءات.', route: '/screens/cards-gallery', accent: SEMANTIC_COLOR.rarity.rare, Icon: ImageIcon },
  { id: 'card-system', title: 'مختبر نظام البطاقات', subtitle: 'عاين الندرة والحالات والمقاسات والوجه المخفي في مكان واحد.', route: '/screens/card-system-preview', accent: SEMANTIC_COLOR.accent.secondary, Icon: Layers3 },
  { id: 'abilities', title: 'القدرات', subtitle: 'راجع بطاقات القدرات ووصف كل تأثير.', route: '/screens/abilities', accent: SEMANTIC_COLOR.rarity.epic, Icon: Zap },
  { id: 'admin', title: 'إدارة المحتوى', subtitle: 'أدوات المطور لإضافة وتصدير المحتوى.', route: '/screens/content-admin', accent: SEMANTIC_COLOR.accent.primary, Icon: Wrench },
] as const;

export default function CollectionScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  if (!isDeveloperBuild(Constants.expoConfig?.extra)) {
    return <Redirect href="/screens/game-mode" />;
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="رجوع" style={styles.back} onPress={() => router.push('/screens/game-mode' as any)}>
            <ArrowLeft size={20} color={SEMANTIC_COLOR.accent.primary} />
            <Text type="label" style={styles.backText}>رجوع</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text type="title" style={styles.title}>مكتبة المطور</Text>
            <Text style={styles.subtitle}>محتوى اللعبة وأدوات الإدارة — متاحة فقط في نسخة Developer.</Text>
          </View>

          <View style={[styles.grid, isLandscape && styles.gridLandscape]}>
            {CATEGORIES.map(({ id, title, subtitle, route, accent, Icon }) => (
              <TouchableOpacity
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`${title}. ${subtitle}`}
                activeOpacity={0.84}
                onPress={() => router.push(route as any)}
                style={[styles.hitArea, isLandscape && styles.hitAreaLandscape]}
              >
                <ObsidianPanel raised style={styles.card}>
                  <View style={[styles.icon, { borderColor: `${accent}80`, backgroundColor: `${accent}14` }]}>
                    <Icon size={28} color={accent} />
                  </View>
                  <View style={styles.copy}>
                    <Text type="defaultSemiBold" style={[styles.cardTitle, { color: accent }]}>{title}</Text>
                    <Text style={styles.cardSubtitle}>{subtitle}</Text>
                  </View>
                  <View style={[styles.arrowShell, { borderColor: `${accent}66` }]}>
                    <ArrowLeft size={18} color={accent} />
                  </View>
                </ObsidianPanel>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACE.xl, gap: SPACE.xl, backgroundColor: 'rgba(8,13,22,0.34)' },
  back: { minHeight: TOUCH_TARGET.default, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: SEMANTIC_COLOR.border.subtle, backgroundColor: 'rgba(19,30,47,0.72)' },
  backText: { color: SEMANTIC_COLOR.accent.primary },
  header: { width: '100%', maxWidth: 760, alignSelf: 'center', alignItems: 'flex-end', gap: SPACE.sm },
  title: { color: SEMANTIC_COLOR.text.primary, textAlign: 'right' },
  subtitle: { color: SEMANTIC_COLOR.text.secondary, textAlign: 'right' },
  grid: { flex: 1, width: '100%', maxWidth: 1180, alignSelf: 'center', gap: SPACE.md, justifyContent: 'center' },
  gridLandscape: { flexDirection: 'row', alignItems: 'stretch' },
  hitArea: { width: '100%' },
  hitAreaLandscape: { flex: 1 },
  card: { minHeight: 150, flexDirection: 'row-reverse', alignItems: 'center', gap: SPACE.md },
  icon: { width: 58, height: 58, borderRadius: RADIUS.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: SPACE.xs },
  cardTitle: { fontSize: FONT.lg, textAlign: 'right' },
  cardSubtitle: { color: SEMANTIC_COLOR.text.secondary, fontSize: FONT.sm, textAlign: 'right' },
  arrowShell: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
