import React from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL } from '@/components/ui/design-tokens';

const COLLECTION_CATEGORIES = [
  {
    id: 'cards',
    icon: '🃏',
    title: 'الكروت',
    subtitle: 'استعرض كروت اللعب الخاصة بك',
    route: '/screens/cards-gallery' as const,
    accentColor: '#3B82F6', // Blue
  },
  {
    id: 'abilities',
    icon: '⚡',
    title: 'القدرات',
    subtitle: 'استعرض قدرات البطاقات والمهارات',
    route: '/screens/abilities' as const, // Placeholder or actual route if created later
    accentColor: '#D946EF', // Magenta
  },
];

export default function CollectionScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const handleCategoryPress = (route: any) => {
    // Basic navigation, can add alerts for unhandled routes if needed
    router.push(route);
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={[styles.container, isLandscape && { paddingTop: SPACE.md, paddingBottom: SPACE.md }]}>
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, isLandscape && { marginBottom: SPACE.sm }]}
            onPress={() => router.push('/screens/game-mode' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>

          {/* Title */}
          <View style={[styles.header, isLandscape && { marginBottom: SPACE.md }]}>
            <Text style={[styles.title, isLandscape && { fontSize: FONT.xl }]}>استعراض المجموعة</Text>
            <Text style={[styles.subtitle, isLandscape && { fontSize: FONT.sm, marginTop: 0 }]}>اختر القسم لعرض مقتنياتك</Text>
          </View>

          {/* Category boxes grid */}
          <View style={[styles.grid, { flexDirection: isLandscape ? 'row' : 'column' }]}>
            {COLLECTION_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.card,
                  { flex: 1, width: isLandscape ? undefined : '100%', marginBottom: isLandscape ? 0 : SPACE.sm }
                ]}
                onPress={() => handleCategoryPress(category.route)}
                activeOpacity={0.8}
              >
                {/* Accent top bar */}
                <View style={[styles.cardTopAccent, { backgroundColor: category.accentColor, marginBottom: isLandscape ? SPACE.md : SPACE.sm }]} />

                <View style={[isLandscape ? {} : { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: SPACE.md, justifyContent: 'space-between' }]}>
                  <Text style={[styles.icon, isLandscape ? {} : { fontSize: 32, marginBottom: 0, marginRight: SPACE.md }]}>{category.icon}</Text>

                  <View style={[isLandscape ? { alignItems: 'center' } : { flex: 1, alignItems: 'flex-start' }]}>
                    <Text style={[styles.cardTitle, { color: category.accentColor }, isLandscape && { fontSize: FONT.lg }]}>
                      {category.title}
                    </Text>
                    <Text style={[styles.cardSubtitle, isLandscape && { fontSize: FONT.xs, marginBottom: SPACE.md }, !isLandscape && { marginBottom: 0, textAlign: 'left' }]}>{category.subtitle}</Text>
                  </View>

                  {/* Bottom arrow */}
                  <View style={[styles.cardArrow, { borderColor: category.accentColor + '50' }, !isLandscape && { transform: [{ scale: 0.8 }] }]}>
                    <Text style={[styles.cardArrowText, { color: category.accentColor }]}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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

  grid: {
    flex: 1,
    gap: SPACE.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    ...GLASS_PANEL,
    paddingTop: 0,
    paddingBottom: SPACE.md,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    maxWidth: 400, // Limit width on tablets
  },

  cardTopAccent: {
    width: '100%',
    height: 4,
    marginBottom: SPACE.xl,
  },

  icon: {
    fontSize: 44,
    marginBottom: SPACE.md,
  },

  cardTitle: {
    fontSize: FONT.xl,
    textAlign: 'center',
    marginBottom: SPACE.xs,
  },

  cardSubtitle: {
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
});
