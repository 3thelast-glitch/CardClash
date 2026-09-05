import React, { useMemo } from 'react';
import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { ArrowLeft, EyeOff, Layers3 } from 'lucide-react-native';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { UnifiedCard, type UnifiedCardVariant } from '@/components/cards/UnifiedCard';
import { AbilityCard } from '@/components/game/ability-card';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ScreenContainer } from '@/components/screen-container';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import {
  FONT,
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
  TOUCH_TARGET,
} from '@/components/ui/design-tokens';
import { abilities as allAbilitiesData } from '@/data/abilities';
import { isDeveloperBuild } from '@/lib/build-variant';
import type { CardRarity } from '@/lib/game/types';
import { useCards } from '@/lib/game/useCards';
import { getCardRarityVisual } from '@/lib/presentation/card-rarity-visuals';

const RARITIES: CardRarity[] = ['common', 'rare', 'epic', 'legendary', 'special'];
const VARIANTS: Exclude<UnifiedCardVariant, 'faceDown'>[] = [
  'thumbnail',
  'selection',
  'battle',
  'inspection',
];

export default function CardSystemPreviewScreen() {
  const router = useRouter();
  const cards = useCards();
  const { width } = useWindowDimensions();
  const compact = width < 700;

  const raritySamples = useMemo(
    () => RARITIES.map((rarity) => ({
      rarity,
      card: cards.find((card) => (card.rarity ?? 'common') === rarity),
    })),
    [cards],
  );
  const primaryCard = raritySamples.find((entry) => entry.card)?.card;

  if (!isDeveloperBuild(Constants.expoConfig?.extra)) {
    return <Redirect href="/screens/game-mode" />;
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="رجوع إلى مكتبة المطور"
              onPress={() => router.push('/screens/collection' as any)}
              style={styles.back}
            >
              <ArrowLeft size={20} color={SEMANTIC_COLOR.accent.primary} />
              <Text type="label" style={styles.backText}>رجوع</Text>
            </TouchableOpacity>
            <View style={styles.titleGroup}>
              <Text type="title" style={styles.title}>مختبر نظام البطاقات</Text>
              <Text style={styles.subtitle}>
                معاينة Developer فقط للندرة، الحالات، المقاسات، الإخفاء، والقدرات من دون تعديل حالة اللعب.
              </Text>
            </View>
          </View>

          <PreviewSection
            title="الندرات الخمس"
            subtitle="كل عينة تستخدم بطاقة حقيقية من مجموعة المشروع؛ لا يتم إنشاء بيانات لعب بديلة."
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {raritySamples.map(({ rarity, card }) => {
                const visual = getCardRarityVisual(rarity);
                return (
                  <View key={rarity} style={styles.sampleColumn}>
                    <View style={[styles.rarityLabel, { borderColor: visual.color }]}>
                      <Text type="label" style={{ color: visual.color }}>
                        {visual.symbol} {visual.labelAr}
                      </Text>
                    </View>
                    {card ? (
                      <UnifiedCard
                        card={card}
                        variant="selection"
                        interactive={false}
                        mediaMode="static"
                        style={styles.rarityCard}
                      />
                    ) : (
                      <View style={styles.missingCard}>
                        <Layers3 size={26} color={visual.color} />
                        <Text type="caption" style={styles.missingText}>لا توجد عينة في البيانات الحالية</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </PreviewSection>

          {primaryCard ? (
            <>
              <PreviewSection
                title="Variants متجاوبة"
                subtitle="نفس البطاقة عبر thumbnail / selection / battle / inspection، والحاوية الخارجية تتحكم في العرض."
              >
                <View style={[styles.variantGrid, compact && styles.variantGridCompact]}>
                  {VARIANTS.map((variant) => (
                    <View key={variant} style={styles.variantCell}>
                      <Text type="caption" forceLtr style={styles.codeLabel}>{variant}</Text>
                      <UnifiedCard
                        card={primaryCard}
                        variant={variant}
                        interactive={false}
                        mediaMode="static"
                        showAbility={variant === 'inspection'}
                        style={variant === 'inspection' ? styles.inspectCard : styles.variantCard}
                      />
                    </View>
                  ))}
                </View>
              </PreviewSection>

              <PreviewSection
                title="حالات التفاعل مستقلة عن الندرة"
                subtitle="الـrarity frame يبقى ثابتاً بينما selected / playable / targeted / pending / transformed تظهر كطبقات حالة منفصلة."
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  <StateSample label="selected">
                    <UnifiedCard card={primaryCard} variant="selection" selected interactive={false} mediaMode="static" style={styles.stateCard} />
                  </StateSample>
                  <StateSample label="playable">
                    <UnifiedCard card={primaryCard} variant="selection" interactive={false} mediaMode="static" presentationState={{ playable: true }} style={styles.stateCard} />
                  </StateSample>
                  <StateSample label="targeted">
                    <UnifiedCard card={primaryCard} variant="selection" interactive={false} mediaMode="static" presentationState={{ targeted: true }} style={styles.stateCard} />
                  </StateSample>
                  <StateSample label="pending">
                    <UnifiedCard card={primaryCard} variant="selection" interactive={false} mediaMode="static" presentationState={{ pending: true }} style={styles.stateCard} />
                  </StateSample>
                  <StateSample label="transformed">
                    <UnifiedCard card={primaryCard} variant="selection" interactive={false} mediaMode="static" presentationState={{ transformed: true }} style={styles.stateCard} />
                  </StateSample>
                </ScrollView>
              </PreviewSection>
            </>
          ) : null}

          <PreviewSection
            title="Face-down آمن"
            subtitle="الوجه الخلفي لا يحتاج Card object، لذلك لا يمر اسم أو rarity أو stats أو ability إلى شجرة العرض المخفية."
          >
            <View style={styles.faceDownRow}>
              <UnifiedCard variant="faceDown" interactive={false} style={styles.faceDownCard} />
              <View style={styles.faceDownCopy}>
                <EyeOff size={28} color={SEMANTIC_COLOR.accent.primary} />
                <Text type="defaultSemiBold" style={styles.title}>لا بيانات خاصة في الـprops</Text>
                <Text style={styles.subtitle}>يُستخدم هذا المسار عندما لا تكون هوية بطاقة الخصم معلنة بعد.</Text>
              </View>
            </View>
          </PreviewSection>

          <PreviewSection
            title="بطاقات القدرات"
            subtitle="AbilityCard يستخدم نفس مصدر الندرة، مع presentation adapter مستقل عن تنفيذ القدرة داخل المحرك."
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {RARITIES.map((rarity) => {
                const ability = allAbilitiesData.find(
                  (item) => item.rarity.toLowerCase() === rarity,
                );
                if (!ability) return null;
                return (
                  <View key={rarity} style={styles.sampleColumn}>
                    <Text type="caption" forceLtr style={styles.codeLabel}>{rarity}</Text>
                    <AbilityCard
                      ability={{
                        id: ability.id,
                        nameEn: ability.nameEn,
                        nameAr: ability.nameAr,
                        description: ability.description,
                        descriptionWarning: ability.descriptionWarning,
                        icon: ability.icon,
                        rarity: ability.rarity,
                        isActive: ability.isActive,
                      }}
                      showActionButtons={false}
                      style={styles.abilityCard}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </PreviewSection>
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

function PreviewSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <ObsidianPanel raised style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text type="defaultSemiBold" style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </ObsidianPanel>
  );
}

function StateSample({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.sampleColumn}>
      <Text type="caption" forceLtr style={styles.codeLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: SPACE.xl,
    paddingBottom: SPACE.xxxl,
    gap: SPACE.xl,
    backgroundColor: 'rgba(8,13,22,0.38)',
  },
  topBar: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    gap: SPACE.lg,
  },
  back: {
    minHeight: TOUCH_TARGET.default,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(19,30,47,0.76)',
  },
  backText: { color: SEMANTIC_COLOR.accent.primary },
  titleGroup: { alignItems: 'flex-end', gap: SPACE.sm },
  title: { textAlign: 'right', color: SEMANTIC_COLOR.text.primary },
  subtitle: { textAlign: 'right', color: SEMANTIC_COLOR.text.secondary },
  section: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    gap: SPACE.lg,
    overflow: 'visible',
  },
  sectionHeader: { alignItems: 'flex-end', gap: SPACE.xs },
  sectionTitle: { fontSize: FONT.lg, textAlign: 'right' },
  sectionSubtitle: { color: SEMANTIC_COLOR.text.secondary, textAlign: 'right' },
  rail: {
    gap: SPACE.lg,
    paddingHorizontal: SPACE.xs,
    paddingVertical: SPACE.md,
    alignItems: 'flex-start',
  },
  sampleColumn: { alignItems: 'center', gap: SPACE.sm },
  rarityLabel: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
    backgroundColor: 'rgba(8,13,22,0.76)',
  },
  rarityCard: { width: 176 },
  missingCard: {
    width: 176,
    aspectRatio: 0.72,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    backgroundColor: SEMANTIC_COLOR.surface.default,
  },
  missingText: { width: 130, textAlign: 'center' },
  variantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xl,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  variantGridCompact: { flexDirection: 'column', alignItems: 'center' },
  variantCell: { alignItems: 'center', gap: SPACE.sm, maxWidth: 330 },
  codeLabel: { color: SEMANTIC_COLOR.accent.secondary },
  variantCard: { width: 188 },
  inspectCard: { width: 300 },
  stateCard: { width: 170 },
  faceDownRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xl,
  },
  faceDownCard: { width: 176 },
  faceDownCopy: { width: 280, alignItems: 'flex-end', gap: SPACE.sm },
  abilityCard: { width: 190, height: 285 },
});
