/**
 * AbilityActivationOverlay
 * ────────────────────────
 * Full-size ability card display that appears when an ability is activated.
 * Presents the ability as a premium card with artwork, rarity theming,
 * trigger badge, effect text, duration, and condition details.
 *
 * Usage:
 *   const { showAbilityCard } = useAbilityActivationOverlay();
 *   showAbilityCard({ abilityType: 'Protection', target: 'player' });
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ImageBackground, useWindowDimensions, ScrollView } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, withSequence,
  withRepeat, Easing,
} from 'react-native-reanimated';
import { AbilityType } from '@/lib/game/types';
import { ABILITY_DETAILS, CATEGORY_CONFIG, type AbilityCategory } from '@/lib/game/ability-details';
import { getAbilityNameOnly } from '@/lib/game/ability-names';
import { ABILITY_IMAGES } from '@/components/game/ability-card';

// ─── Payload ────────────────────────────────────────────────────────────────
export interface AbilityCardPayload {
  abilityType: AbilityType;
  target?: 'player' | 'bot' | 'all';
  /** Auto-dismiss after ms, default 3200 */
  duration?: number;
}

// ─── Category → visual theme (matches ability card rarity style) ────────────
const CATEGORY_THEMES: Record<AbilityCategory, {
  primary: string; glow: string; border: string; badgeBg: string;
  label: string; labelAr: string;
  borderWidth: number; shimmer: boolean; cornerOrnament: boolean;
}> = {
  buff: {
    primary: '#4ade80', glow: '#4ade80', border: 'rgba(74,222,128,0.55)',
    badgeBg: 'rgba(74,222,128,0.18)', label: 'BUFF', labelAr: 'تعزيز',
    borderWidth: 1.5, shimmer: false, cornerOrnament: false,
  },
  debuff: {
    primary: '#f87171', glow: '#f87171', border: 'rgba(248,113,113,0.55)',
    badgeBg: 'rgba(248,113,113,0.18)', label: 'DEBUFF', labelAr: 'إضعاف',
    borderWidth: 1.5, shimmer: false, cornerOrnament: false,
  },
  utility: {
    primary: '#60a5fa', glow: '#60a5fa', border: 'rgba(96,165,250,0.55)',
    badgeBg: 'rgba(96,165,250,0.18)', label: 'UTILITY', labelAr: 'أداة',
    borderWidth: 1.5, shimmer: false, cornerOrnament: false,
  },
  special: {
    primary: '#e879f9', glow: '#f0abfc', border: 'rgba(232,121,249,0.70)',
    badgeBg: 'rgba(232,121,249,0.20)', label: 'SPECIAL', labelAr: 'خاص',
    borderWidth: 2.5, shimmer: true, cornerOrnament: true,
  },
};

const TARGET_LABEL: Record<string, string> = {
  player: '👤 لاعب',
  bot: '🤖 بوت',
  all: '🔄 الكل',
};

// ─── Shimmer Sweep ──────────────────────────────────────────────────────────
function ShimmerSweep({ color, cardWidth }: { color: string; cardWidth: number }) {
  const translateX = useSharedValue(-cardWidth);
  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(cardWidth * 1.5, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(-cardWidth, { duration: 0 }),
      ), -1,
    );
  }, [cardWidth]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style, { overflow: 'hidden', zIndex: 8 }]}>
      <View style={[S.shimmerStreak, { shadowColor: color, borderRightColor: color + '60', borderLeftColor: color + '60' }]} />
    </Animated.View>
  );
}

// ─── Corner Ornament ────────────────────────────────────────────────────────
function CornerOrnament({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={[S.cornerDiamond, { borderColor: color + 'BB', width: size, height: size }]} />;
}

// ─── Hook (listener pattern — same as EffectToast) ──────────────────────────
const listeners: Array<(p: AbilityCardPayload) => void> = [];

export function useAbilityActivationOverlay() {
  const showAbilityCard = useCallback((payload: AbilityCardPayload) => {
    listeners.forEach(fn => fn(payload));
  }, []);
  return { showAbilityCard };
}

// ─── Component ──────────────────────────────────────────────────────────────
export function AbilityActivationOverlay() {
  const [current, setCurrent] = React.useState<(AbilityCardPayload & { id: number }) | null>(null);
  const counter = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: screenW, height: screenH } = useWindowDimensions();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.65);
  const overlayOpacity = useSharedValue(0);
  // Progress bar animation
  const progressWidth = useSharedValue(100);

  const dismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 320 });
    scale.value = withTiming(0.7, { duration: 320 });
    overlayOpacity.value = withTiming(0, { duration: 320 });
    setTimeout(() => setCurrent(null), 350);
  }, []);

  const show = useCallback((payload: AbilityCardPayload) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Reset
    opacity.value = 0;
    scale.value = 0.65;
    overlayOpacity.value = 0;
    progressWidth.value = 100;
    setCurrent({ ...payload, id: ++counter.current });
    // Animate in — card presentation feel
    overlayOpacity.value = withTiming(1, { duration: 200 });
    opacity.value = withDelay(80, withSpring(1, { damping: 12, stiffness: 160 }));
    scale.value = withDelay(80, withSpring(1, { damping: 13, stiffness: 140 }));
    // Progress bar countdown
    const dur = payload.duration ?? 3200;
    progressWidth.value = withTiming(0, { duration: dur, easing: Easing.linear });
    timerRef.current = setTimeout(dismiss, dur);
  }, [dismiss]);

  useEffect(() => {
    listeners.push(show);
    return () => {
      const idx = listeners.indexOf(show);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [show]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  if (!current) return null;

  const detail = ABILITY_DETAILS[current.abilityType];
  if (!detail) return null;

  const theme = CATEGORY_THEMES[detail.category];
  const catConfig = CATEGORY_CONFIG[detail.category];
  const abilityName = getAbilityNameOnly(current.abilityType);
  const targetLabel = current.target ? TARGET_LABEL[current.target] : null;

  // Artwork
  const formattedName = detail.nameEn.replaceAll(' ', '_') + '_Art';
  const imageSource = ABILITY_IMAGES[formattedName] || ABILITY_IMAGES['default'];

  // Card sizing — landscape-optimized and height-aware
  const overlayMaxH = screenH * 0.82;
  const CARD_H = Math.max(160, Math.min(300, overlayMaxH));
  const CARD_W = Math.round(CARD_H / 1.5);
  const scaleFactor = Math.min(1, CARD_H / 300);

  // Responsive styling variables
  const bottomBarHeight = Math.max(22, Math.round(36 * scaleFactor));
  const iconCircleSize = Math.max(16, Math.round(20 * scaleFactor));
  const iconTextSize = Math.max(8, Math.round(10 * scaleFactor));
  const nameEnSize = Math.max(7, Math.round(9 * scaleFactor));
  const nameArSize = Math.max(10, Math.round(14 * scaleFactor));
  const triggerTextSize = Math.max(7, Math.round(8 * scaleFactor));
  const dividerMargin = Math.max(2, Math.round(6 * scaleFactor));
  const descSize = Math.max(8, Math.round(9.5 * scaleFactor));
  const descLineHeight = Math.round(descSize * 1.3);
  const durationBadgePaddingV = Math.max(1, Math.round(1.5 * scaleFactor));
  const durationBadgePaddingH = Math.max(4, Math.round(6 * scaleFactor));
  const durationTextSize = Math.max(7, Math.round(8 * scaleFactor));
  const extraTextSize = Math.max(7.5, Math.round(8.5 * scaleFactor));
  const bottomLabelSize = Math.max(7, Math.round(8 * scaleFactor));
  const infoPaddingV = Math.max(3, Math.round(8 * scaleFactor));
  const infoPaddingH = Math.max(4, Math.round(12 * scaleFactor));
  const categoryTextSize = Math.max(6, Math.round(7.5 * scaleFactor));
  const categoryBadgePaddingV = Math.max(1, Math.round(2 * scaleFactor));
  const categoryBadgePaddingH = Math.max(4, Math.round(6 * scaleFactor));
  const cornerDiamondSize = Math.max(5, Math.round(8 * scaleFactor));
  const cornerPos = Math.max(4, Math.round(8 * scaleFactor));
  const badgeTop = Math.max(6, Math.round(10 * scaleFactor));

  // Dynamic flex ratios
  const artworkFlex = CARD_H < 200 ? 0.8 : 1.1;
  const infoFlex = CARD_H < 200 ? 1.2 : 1;

  return (
    <>
      {/* Dimmed backdrop */}
      <Animated.View style={[S.backdrop, bgStyle]} pointerEvents="none" />

      {/* Card */}
      <Animated.View
        style={[
          S.centerWrap,
          containerStyle,
        ]}
        pointerEvents="none"
      >
        <View style={[
          S.cardContainer,
          {
            width: CARD_W,
            height: CARD_H,
            borderColor: theme.border,
            borderWidth: theme.borderWidth,
            shadowColor: theme.glow,
            shadowOpacity: 0.6,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}>
          {/* Section 1: Artwork (Top portion) */}
          <View style={[S.artworkSection, { flex: artworkFlex }]}>
            <ImageBackground
              source={imageSource}
              style={StyleSheet.absoluteFill}
              imageStyle={S.artImage}
              resizeMode="cover"
            >
              <View style={[StyleSheet.absoluteFill, S.blackOverlay]} />
            </ImageBackground>

            {/* Shimmer */}
            {theme.shimmer && <ShimmerSweep color={theme.primary} cardWidth={CARD_W} />}

            {/* Category badge */}
            <View style={[
              S.categoryBadge,
              {
                backgroundColor: theme.badgeBg,
                borderColor: theme.border,
                paddingVertical: categoryBadgePaddingV,
                paddingHorizontal: categoryBadgePaddingH,
                borderRadius: Math.max(4, Math.round(8 * scaleFactor)),
                top: badgeTop,
                right: badgeTop,
              }
            ]}>
              <Text style={[S.categoryText, { color: theme.primary, fontSize: categoryTextSize }]}>
                {catConfig.emoji} {theme.labelAr}
              </Text>
            </View>

            {/* Target badge */}
            {targetLabel && (
              <View style={[
                S.targetBadge,
                {
                  borderColor: theme.primary + '44',
                  paddingVertical: categoryBadgePaddingV,
                  paddingHorizontal: categoryBadgePaddingH,
                  borderRadius: Math.max(4, Math.round(8 * scaleFactor)),
                  top: badgeTop,
                  left: badgeTop,
                }
              ]}>
                <Text style={[S.targetText, { fontSize: categoryTextSize }]}>{targetLabel}</Text>
              </View>
            )}
          </View>

          {/* Section 2: Info Section (Middle portion) */}
          <View style={[
            S.infoSection,
            {
              borderColor: theme.primary + '15',
              paddingVertical: infoPaddingV,
              paddingHorizontal: infoPaddingH,
              flex: infoFlex,
            }
          ]}>
            {/* Trigger badge */}
            <View style={[
              S.triggerBadge,
              {
                backgroundColor: theme.primary + '22',
                borderColor: theme.primary + '55',
                paddingVertical: categoryBadgePaddingV,
                paddingHorizontal: categoryBadgePaddingH,
                borderRadius: Math.max(3, Math.round(6 * scaleFactor)),
                marginBottom: Math.max(2, Math.round(4 * scaleFactor)),
              }
            ]}>
              <Text style={[S.triggerText, { color: theme.primary, fontSize: triggerTextSize }]}>
                {detail.triggerAr}
              </Text>
            </View>

            {/* Arabic name */}
            <Text
              style={[S.nameAr, { textShadowColor: theme.glow, fontSize: nameArSize }]}
              numberOfLines={1}
            >
              {abilityName}
            </Text>

            {/* English name */}
            <Text style={[S.nameEn, { fontSize: nameEnSize }]} numberOfLines={1}>
              {detail.nameEn}
            </Text>

            {/* Divider */}
            <View style={[S.divider, { backgroundColor: theme.primary + '44', marginVertical: dividerMargin }]} />

            <ScrollView
              style={S.descriptionScroll}
              contentContainerStyle={S.descriptionScrollContent}
              nestedScrollEnabled
            >
              {/* Effect description */}
              <Text style={[S.effectText, { fontSize: descSize, lineHeight: descLineHeight }]}>
                {detail.effectAr}
              </Text>

              {/* Duration */}
              <View style={[
                S.durationRow,
                {
                  gap: Math.max(2, Math.round(3 * scaleFactor)),
                  paddingHorizontal: durationBadgePaddingH,
                  paddingVertical: durationBadgePaddingV,
                  borderRadius: Math.max(3, Math.round(5 * scaleFactor)),
                  marginTop: Math.max(2, Math.round(4 * scaleFactor)),
                }
              ]}>
                <Text style={[S.durationLabel, { fontSize: durationTextSize }]}>⏱</Text>
                <Text style={[S.durationText, { fontSize: durationTextSize }]}>{detail.durationAr}</Text>
              </View>

              {/* Condition */}
              {detail.conditionAr && (
                <Text style={[S.conditionText, { fontSize: extraTextSize, marginTop: Math.max(2, Math.round(4 * scaleFactor)) }]}>
                  ⚙️ {detail.conditionAr}
                </Text>
              )}

              {/* Cooldown */}
              {detail.cooldownAr && (
                <Text style={[S.cooldownText, { fontSize: extraTextSize, marginTop: Math.max(1, Math.round(3 * scaleFactor)) }]}>
                  🔒 {detail.cooldownAr}
                </Text>
              )}
            </ScrollView>
          </View>

          {/* Section 3: Bottom Bar */}
          <View style={[S.bottomBar, { borderTopColor: theme.border, height: bottomBarHeight }]}>
            <View style={[
              S.iconCircle,
              {
                backgroundColor: theme.primary + '33',
                borderColor: theme.primary + '88',
                width: iconCircleSize,
                height: iconCircleSize,
                borderRadius: iconCircleSize / 2,
              }
            ]}>
              <Text style={{ fontSize: iconTextSize }}>{catConfig.emoji}</Text>
            </View>
            <View style={S.progressTrack}>
              <Animated.View style={[S.progressFill, { backgroundColor: theme.primary }, progressBarStyle]} />
            </View>
            <Text style={[S.bottomLabel, { color: theme.primary + 'CC', fontSize: bottomLabelSize }]}>
              {theme.label}
            </Text>
          </View>

          {/* Corner ornaments */}
          {theme.cornerOrnament && (
            <>
              <View style={{ position: 'absolute', top: cornerPos, left: cornerPos, zIndex: 18 }}>
                <CornerOrnament color={theme.primary} size={cornerDiamondSize} />
              </View>
              <View style={{ position: 'absolute', top: cornerPos, right: cornerPos, zIndex: 18 }}>
                <CornerOrnament color={theme.primary} size={cornerDiamondSize} />
              </View>
              <View style={{ position: 'absolute', bottom: bottomBarHeight + cornerPos - 2, left: cornerPos, zIndex: 18 }}>
                <CornerOrnament color={theme.primary} size={cornerDiamondSize} />
              </View>
              <View style={{ position: 'absolute', bottom: bottomBarHeight + cornerPos - 2, right: cornerPos, zIndex: 18 }}>
                <CornerOrnament color={theme.primary} size={cornerDiamondSize} />
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 998,
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#090d16',
    elevation: 24,
    flexDirection: 'column',
  },
  artworkSection: {
    flex: 1.1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  artImage: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  blackOverlay: {
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  shimmerStreak: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    transform: [{ skewX: '-18deg' }],
  },
  cornerTL: { position: 'absolute', top: 8, left: 8, zIndex: 18 },
  cornerTR: { position: 'absolute', top: 8, right: 8, zIndex: 18 },
  cornerBL: { position: 'absolute', bottom: 42, left: 8, zIndex: 18 },
  cornerBR: { position: 'absolute', bottom: 42, right: 8, zIndex: 18 },
  cornerDiamond: {
    width: 8,
    height: 8,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },

  // Category badge (top-right)
  categoryBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Target badge (top-left)
  targetBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  targetText: {
    fontSize: 7.5,
    color: '#e2e8f0',
    fontWeight: '600',
  },

  // Info section
  infoSection: {
    flex: 1,
    backgroundColor: 'rgba(10,15,30,0.92)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },

  // Trigger badge
  triggerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  triggerText: {
    fontSize: 8,
    fontWeight: '700',
  },

  // Names
  nameAr: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  nameEn: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 1,
    opacity: 0.8,
  },

  // Divider
  divider: {
    width: 24,
    height: 1,
    borderRadius: 0.5,
    marginVertical: 6,
  },

  descriptionScroll: {
    flex: 1,
    width: '100%',
  },
  descriptionScrollContent: {
    alignItems: 'center',
    paddingBottom: 4,
  },

  // Effect text
  effectText: {
    color: 'rgba(226,232,240,0.9)',
    fontSize: 9.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 13,
    writingDirection: 'rtl',
  },

  // Duration row
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  durationLabel: {
    fontSize: 8,
    color: '#94a3b8',
  },
  durationText: {
    fontSize: 8,
    color: '#94a3b8',
  },

  // Condition/cooldown
  conditionText: {
    color: '#fbbf24',
    fontSize: 8.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    writingDirection: 'rtl',
  },
  cooldownText: {
    color: '#f87171',
    fontSize: 8.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
    writingDirection: 'rtl',
  },

  // Bottom bar
  bottomBar: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060a12',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    gap: 6,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    opacity: 0.7,
  },
  bottomLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
