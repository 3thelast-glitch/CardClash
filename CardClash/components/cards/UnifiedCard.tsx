import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Check,
  EyeOff,
  Shield,
  Sparkles,
  Sword,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import type { Card, CardRarity } from '@/lib/game/types';
import { getCardImage } from '@/lib/game/get-card-image';
import { getCardAbilityDisplayText } from '@/lib/game/card-ability-text';
import { useCardTapAnimation, useCardHoverScale } from '@/hooks/useCardAnimations';
import { RarityFrame } from './RarityFrame';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  FONT,
  RADIUS,
  RARITY_COLOR,
  SEMANTIC_COLOR,
  SPACE,
} from '@/components/ui/design-tokens';

export type UnifiedCardVariant =
  | 'thumbnail'
  | 'selection'
  | 'battle'
  | 'inspection'
  | 'ability'
  | 'faceDown';

export interface UnifiedCardProps {
  card?: Card;
  variant?: UnifiedCardVariant;
  selected?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  onPress?: () => void;
  selectionLabel?: string;
  style?: StyleProp<ViewStyle>;
  imageSource?: ImageSourcePropType | null;
  showAbility?: boolean;
}

const SIZE: Record<UnifiedCardVariant, { width: number; aspectRatio: number }> = {
  thumbnail: { width: 156, aspectRatio: 0.72 },
  selection: { width: 176, aspectRatio: 0.72 },
  battle: { width: 196, aspectRatio: 0.72 },
  inspection: { width: 310, aspectRatio: 0.72 },
  ability: { width: 210, aspectRatio: 0.72 },
  faceDown: { width: 176, aspectRatio: 0.72 },
};

export function UnifiedCard({
  card,
  variant = 'thumbnail',
  selected = false,
  disabled = false,
  interactive = true,
  onPress,
  selectionLabel,
  style,
  imageSource,
  showAbility = variant === 'inspection',
}: UnifiedCardProps) {
  const hidden = variant === 'faceDown' || !card;
  const rarity: CardRarity = hidden ? 'common' : (card.rarity ?? 'common');
  const tap = useCardTapAnimation();
  const hover = useCardHoverScale(selected);
  const resolvedImage = hidden
    ? null
    : imageSource === undefined
      ? getCardImage(card)
      : imageSource;
  const abilityText = hidden || !showAbility ? null : getCardAbilityDisplayText(card);

  const accessibilityLabel = hidden
    ? 'بطاقة خصم مخفية'
    : [
        card.nameAr,
        `الندرة ${rarity}`,
        `الهجوم ${card.attack}`,
        `الدفاع ${card.defense}`,
        abilityText ? `القدرة ${abilityText}` : null,
      ].filter(Boolean).join('، ');

  return (
    <Animated.View
      style={[
        { width: SIZE[variant].width, aspectRatio: SIZE[variant].aspectRatio },
        hover.animatedStyle,
        tap.animatedStyle,
        style,
      ]}
    >
      <Pressable
        disabled={disabled || !interactive}
        onPress={onPress}
        onPressIn={tap.onPressIn}
        onPressOut={tap.onPressOut}
        accessibilityRole={interactive ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected, disabled }}
        style={styles.pressable}
      >
        <RarityFrame rarity={rarity} selected={selected} style={styles.fill}>
          {hidden ? (
            <FaceDown />
          ) : (
            <View style={styles.face}>
              <View style={styles.art}>
                {resolvedImage ? (
                  <Image
                    source={resolvedImage}
                    resizeMode="cover"
                    style={StyleSheet.absoluteFill}
                    accessible={false}
                  />
                ) : (
                  <View style={styles.fallback}>
                    <Sparkles size={28} color={RARITY_COLOR[rarity]} />
                    <ThemedText type="caption">الصورة غير متاحة</ThemedText>
                  </View>
                )}
                <View pointerEvents="none" style={styles.artShade} />
                <View style={styles.rarityPill}>
                  <ThemedText type="caption" style={{ color: RARITY_COLOR[rarity] }}>
                    {rarity.toUpperCase()}
                  </ThemedText>
                </View>
                {selected && (
                  <View style={styles.selectedBadge}>
                    <Check size={14} color={SEMANTIC_COLOR.text.inverse} />
                  </View>
                )}
              </View>

              <View style={styles.copy}>
                <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.name}>
                  {card.nameAr}
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1} style={styles.nameEn} forceLtr>
                  {card.nameEn ?? card.name}
                </ThemedText>

                <View style={styles.stats}>
                  <Stat icon={<Sword size={14} color={SEMANTIC_COLOR.status.danger} />} value={card.attack} />
                  <Stat icon={<Shield size={14} color={SEMANTIC_COLOR.accent.secondary} />} value={card.defense} />
                </View>

                {abilityText && (
                  <View style={styles.ability}>
                    <Sparkles size={13} color={SEMANTIC_COLOR.accent.primary} />
                    <ThemedText type="caption" numberOfLines={variant === 'inspection' ? 5 : 2} style={styles.abilityText}>
                      {abilityText}
                    </ThemedText>
                  </View>
                )}
              </View>

              {selectionLabel && (
                <View style={styles.selectionLabel}>
                  <ThemedText type="label" style={styles.selectionLabelText}>
                    {selectionLabel}
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </RarityFrame>
      </Pressable>
    </Animated.View>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <View style={styles.stat}>
      {icon}
      <ThemedText type="numeric" style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

function FaceDown() {
  return (
    <View style={styles.back}>
      <View pointerEvents="none" style={styles.backRing} />
      <EyeOff size={28} color={SEMANTIC_COLOR.accent.primary} />
      <ThemedText type="label" style={styles.backTitle}>CARD CLASH</ThemedText>
      <ThemedText type="caption" style={styles.backSub}>بطاقة مخفية</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  fill: { flex: 1 },
  face: { flex: 1, backgroundColor: SEMANTIC_COLOR.surface.default },
  art: { flex: 1.35, position: 'relative', overflow: 'hidden' },
  artShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,13,22,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: SEMANTIC_COLOR.border.subtle,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SEMANTIC_COLOR.surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  rarityPill: {
    position: 'absolute',
    top: SPACE.sm,
    left: SPACE.sm,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(8,13,22,0.82)',
  },
  selectedBadge: {
    position: 'absolute',
    top: SPACE.sm,
    right: SPACE.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SEMANTIC_COLOR.accent.primary,
  },
  copy: {
    padding: SPACE.md,
    gap: SPACE.xs,
  },
  name: {
    fontSize: FONT.md,
    textAlign: 'right',
  },
  nameEn: {
    opacity: 0.72,
    textAlign: 'right',
  },
  stats: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: SPACE.xs,
  },
  stat: {
    flex: 1,
    minHeight: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(8,13,22,0.58)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
  },
  statValue: { fontSize: FONT.sm },
  ability: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.xs,
    marginTop: SPACE.xs,
    paddingTop: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: SEMANTIC_COLOR.border.subtle,
  },
  abilityText: { flex: 1, textAlign: 'right' },
  selectionLabel: {
    position: 'absolute',
    bottom: SPACE.sm,
    left: SPACE.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: SEMANTIC_COLOR.accent.primary,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
  },
  selectionLabelText: {
    color: SEMANTIC_COLOR.text.inverse,
    fontSize: FONT.xs,
  },
  back: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    backgroundColor: SEMANTIC_COLOR.background.arena,
  },
  backRing: {
    position: 'absolute',
    width: '72%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(57,230,208,0.26)',
  },
  backTitle: {
    color: SEMANTIC_COLOR.accent.primary,
    letterSpacing: 1.5,
  },
  backSub: { opacity: 0.72 },
});
