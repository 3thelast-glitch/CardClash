/**
 * Enhanced CardItem — Rarity-driven design with 60fps animations.
 *
 * ✅ Fix: reads activeEffects directly from GameContext (useGame)
 *    so buff/debuff display updates live without manual prop passing.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Side } from '@/lib/game/types';
import { getRarityConfig } from '@/lib/game/card-rarity';
import { CARD_DIMENSIONS, CARD_SHADOW } from '@/constants/game-config';
import { useCardTapAnimation, useCardSummonAnimation } from '@/lib/animations';
import { RarityGlow } from './rarity-glow';
import { FireParticles } from '@/lib/particles';
import { getCardImage } from '@/lib/game/get-card-image';
import { getEffectiveStats } from '@/lib/game/ui-helpers';
import { useGame } from '@/lib/game/game-context';

// ─── Placeholder colors per rarity ───────────────────────────────────────────
const PLACEHOLDER_COLORS: Record<string, readonly [string, string, string]> = {
  common:    ['#1a1a2e', '#2d2d44', '#1a1a2e'],
  rare:      ['#1a1200', '#2d2000', '#1a1200'],
  epic:      ['#1a0030', '#2d0050', '#1a0030'],
  legendary: ['#1a1400', '#2d2400', '#1a1400'],
};

// ─── Size Presets ─────────────────────────────────────────────────────────────
const SIZE_PRESETS = {
  small: {
    width: CARD_DIMENSIONS.small.width,
    height: CARD_DIMENSIONS.small.height,
    nameFontSize: 8,
    statFontSize: 8,
    badgeFontSize: 6,
  },
  medium: {
    width: CARD_DIMENSIONS.portrait.width,
    height: CARD_DIMENSIONS.portrait.height,
    nameFontSize: 10,
    statFontSize: 10,
    badgeFontSize: 8,
  },
  large: {
    width: 200,
    height: 300,
    nameFontSize: 13,
    statFontSize: 12,
    badgeFontSize: 10,
  },
} as const;

// ─── Props ───────────────────────────────────────────────────────────────────
interface CardItemProps {
  card: Card;
  /**
   * جانب الكارت — يحدد أي التأثيرات تسري عليه.
   * ‘player’ = كارت اللاعب، ‘bot’ = كارت البوت.
   */
  cardSide?: Side;
  isSelected?: boolean;
  size?: keyof typeof SIZE_PRESETS;
  playEntranceAnimation?: boolean;
  entranceDelay?: number;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  showStats?: boolean;
  customWidth?: number;
  customHeight?: number;
}

// ─── VideoCard sub-component ───────────────────────────────────────────────────
function VideoCard({ source, style }: { source: any; style: object }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={style as any}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function CardItem({
  card,
  cardSide = 'player',
  isSelected = false,
  size = 'medium',
  playEntranceAnimation = false,
  entranceDelay = 0,
  onPress,
  style,
  disabled = false,
  showStats = true,
  customWidth,
  customHeight,
}: CardItemProps) {
  const preset    = SIZE_PRESETS[size];
  const rarity    = (card.rarity ?? 'common') as string;
  const rarityCfg = getRarityConfig(rarity);
  const width     = customWidth  ?? preset.width;
  const height    = customHeight ?? preset.height;

  // ✅ قراءة activeEffects مباشرةً من الـ context — يتحدّث فوريًا عند أي تغيير
  const { state } = useGame();
  const activeEffects = state.activeEffects;

  // ── حساب القيم الفعلية بعد تطبيق التأثيرات ──────────────────────────────
  const { attack: effectiveAttack, defense: effectiveDefense } =
    activeEffects.length > 0
      ? getEffectiveStats(card.attack, card.defense, activeEffects, cardSide)
      : { attack: card.attack, defense: card.defense };

  // ── Resolve image / video ──────────────────────────────────────────────────
  const cardImage         = getCardImage(card);
  const hasVideo          = !!(card as any).videoUrl;
  const hasImage          = !hasVideo && !!cardImage;
  const placeholderColors = PLACEHOLDER_COLORS[rarity] ?? PLACEHOLDER_COLORS.common;

  // ── Animations ──────────────────────────────────────────────────────────────
  const tap    = useCardTapAnimation();
  const summon = useCardSummonAnimation(entranceDelay);

  useEffect(() => {
    if (playEntranceAnimation) {
      summon.reset();
      summon.play();
    }
  }, [playEntranceAnimation, card.id]);

  const cardShadow: ViewStyle = {
    shadowColor:   rarityCfg.glowColor ?? CARD_SHADOW.shadowColor,
    shadowOffset:  CARD_SHADOW.shadowOffset,
    shadowOpacity: rarityCfg.shadowOpacity,
    shadowRadius:  rarityCfg.shadowRadius,
    elevation: isSelected ? 20 : 12,
  };

  const borderStyle: ViewStyle = {
    borderColor: isSelected ? '#ffffff' : rarityCfg.borderColor,
    borderWidth: isSelected ? rarityCfg.borderWidth + 1 : rarityCfg.borderWidth,
  };

  return (
    <Animated.View
      style={[
        styles.outerWrapper,
        { width, height },
        cardShadow,
        playEntranceAnimation ? summon.animatedStyle : undefined,
        style,
      ]}
    >
      {rarityCfg.hasPulsingGlow && (
        <RarityGlow
          color={rarityCfg.glowColor!}
          borderRadius={14}
          spread={size === 'small' ? 4 : 8}
          isLegendary={rarity === 'legendary'}
        />
      )}

      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : tap.onPressIn}
        onPressOut={disabled ? undefined : tap.onPressOut}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityLabel={`${card.nameAr} card`}
      >
        <Animated.View style={[styles.card, { width, height }, borderStyle]}>

          <View style={[styles.gradientBg, { backgroundColor: rarityCfg.gradient[0] }]} />
          <View style={[styles.gradientMid, { backgroundColor: rarityCfg.gradient[1], opacity: 0.75 }]} />
          <View style={[styles.gradientTop, { backgroundColor: rarityCfg.gradient[2], opacity: 0.4 }]} />

          {hasVideo ? (
            <VideoCard source={(card as any).videoUrl} style={styles.image} />
          ) : hasImage ? (
            <Image
              source={cardImage}
              style={styles.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <>
              <LinearGradient
                colors={placeholderColors}
                style={styles.imagePlaceholder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.noImageBadge} pointerEvents="none">
                <Text style={styles.noImageIcon}>🖼️</Text>
                <Text style={styles.noImageText}>لا توجد صورة</Text>
              </View>
            </>
          )}

          <Animated.View
            style={[StyleSheet.absoluteFillObject, tap.animatedStyle]}
            pointerEvents="none"
          />

          {/* ✅ Stats — تعرض القيم الفعلية مع ▲▼ تلقائيًا */}
          {showStats && (
            <View style={styles.statsOverlay}>
              <View style={styles.statsRow}>
                <StatBadge
                  icon="⚔️"
                  base={card.attack}
                  effective={effectiveAttack}
                  size={preset.statFontSize}
                />
                <StatBadge
                  icon="🛡️"
                  base={card.defense}
                  effective={effectiveDefense}
                  size={preset.statFontSize}
                />
              </View>
              <Text style={[styles.cardName, { fontSize: preset.nameFontSize }]} numberOfLines={1}>
                {card.nameAr}
              </Text>
            </View>
          )}

          <View style={styles.elementBadge}>
            <Text style={[styles.elementEmoji, { fontSize: preset.badgeFontSize + 2 }]}>
              {card.emoji}
            </Text>
          </View>

          <View style={[styles.rarityBadge, { backgroundColor: rarityCfg.badgeColor }]}>
            <Text style={[styles.rarityText, { fontSize: preset.badgeFontSize }]}>
              {rarity.charAt(0).toUpperCase()}
            </Text>
          </View>

          {card.cardEffects && card.cardEffects.length > 0 && (
            <View style={styles.effectsRow}>
              {card.cardEffects.slice(0, 3).map((effect) => (
                <Text key={effect} style={styles.effectIcon}>
                  {EFFECT_ICONS[effect]}
                </Text>
              ))}
            </View>
          )}

          {isSelected && <View style={styles.selectedOverlay} />}
        </Animated.View>
      </Pressable>

      {rarityCfg.hasParticles && !disabled && (
        <View
          style={[StyleSheet.absoluteFillObject, { borderRadius: 14, overflow: 'hidden' }]}
          pointerEvents="none"
        >
          <FireParticles width={width} height={height} />
        </View>
      )}
    </Animated.View>
  );
}

// ─── StatBadge ─────────────────────────────────────────────────────────────
function StatBadge({ icon, base, effective, size }: {
  icon: string;
  base: number;
  effective: number;
  size: number;
}) {
  const diff       = effective - base;
  const isModified = diff !== 0;
  const diffColor  = diff > 0 ? '#4ade80' : '#f87171';

  return (
    <View style={styles.statBadge}>
      <Text style={[styles.statIcon, { fontSize: size }]}>{icon}</Text>
      {isModified ? (
        <>
          <Text style={[styles.statValue, styles.statStruck, { fontSize: size - 1, color: 'rgba(255,255,255,0.35)' }]}>
            {base}
          </Text>
          <Text style={[styles.statValue, { fontSize: size, color: diffColor, fontWeight: '900' }]}>
            {effective}
          </Text>
          <Text style={[styles.statDiff, { fontSize: size - 2, color: diffColor }]}>
            {diff > 0 ? `▲+${diff}` : `▼${diff}`}
          </Text>
        </>
      ) : (
        <Text style={[styles.statValue, { fontSize: size }]}>{base}</Text>
      )}
    </View>
  );
}

// ─── Effect icon map ──────────────────────────────────────────────────────────
const EFFECT_ICONS: Record<string, string> = {
  taunt:         '🛡️',
  divine_shield: '✨',
  poison:        '☠️',
  stealth:       '👁️',
  charge:        '⚡',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outerWrapper:    { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  pressable:       { borderRadius: 14 },
  card:            { borderRadius: 14, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  gradientBg:      { ...StyleSheet.absoluteFillObject },
  gradientMid:     { position: 'absolute', top: '30%', left: 0, right: 0, bottom: 0 },
  gradientTop:     { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  image:           { width: '100%', height: '75%', position: 'absolute', top: 0 },
  imagePlaceholder:{ width: '100%', height: '75%', position: 'absolute', top: 0 },
  noImageBadge:    { position: 'absolute', top: '18%', left: 0, right: 0, alignItems: 'center', zIndex: 4 },
  noImageIcon:     { fontSize: 22, opacity: 0.35 },
  noImageText:     { fontSize: 7, color: 'rgba(255,255,255,0.25)', marginTop: 2 },
  statsOverlay:    { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.68)', borderBottomLeftRadius: 13, borderBottomRightRadius: 13 },
  statsRow:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 3 },
  statBadge:       { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statIcon:        { lineHeight: 14 },
  statValue:       { color: '#fff', fontWeight: '700', fontFamily: 'System' },
  statStruck:      { textDecorationLine: 'line-through', opacity: 0.5 },
  statDiff:        { fontWeight: '800', lineHeight: 13 },
  cardName:        { color: '#e5e7eb', textAlign: 'center', fontWeight: '600', letterSpacing: 0.3 },
  elementBadge:    { position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 4, paddingVertical: 2 },
  elementEmoji:    { lineHeight: 16 },
  rarityBadge:     { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rarityText:      { color: '#fff', fontWeight: '900', lineHeight: 12 },
  effectsRow:      { position: 'absolute', bottom: 52, right: 4, gap: 2, alignItems: 'center' },
  effectIcon:      { fontSize: 10 },
  selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 13 },
});
