import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Ban,
  Check,
  Clock3,
  Crosshair,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  Sword,
  Zap,
} from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Card, CardAlignment, CardRarity } from '@/lib/game/types';
import { getCardImage } from '@/lib/game/get-card-image';
import { getCardAbilityDisplayText } from '@/lib/game/card-ability-text';
import { CARD_ALIGNMENT_META, getCardAlignment } from '@/lib/game/card-alignment';
import { getCardRarityVisual } from '@/lib/presentation/card-rarity-visuals';
import {
  useCardPresentationMotion,
  type CardDrawOrigin,
} from '@/hooks/useCardAnimations';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { useSettings } from '@/lib/game/hooks/useSettings';
import { ANIM_DURATION } from '@/constants/animationConfig';
import { RarityFrame } from './RarityFrame';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  FONT,
  FONT_FAMILY,
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
  TOUCH_TARGET,
} from '@/components/ui/design-tokens';

export type UnifiedCardVariant =
  | 'thumbnail'
  | 'selection'
  | 'battle'
  | 'inspection'
  | 'ability'
  | 'faceDown';

export interface UnifiedCardPresentationState {
  playable?: boolean;
  pending?: boolean;
  targeted?: boolean;
  damaged?: boolean;
  revealed?: boolean;
  transformed?: boolean;
}

export interface UnifiedCardProps {
  card?: Card;
  variant?: UnifiedCardVariant;
  selected?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  onPress?: () => void;
  onInspect?: () => void;
  selectionLabel?: string;
  style?: StyleProp<ViewStyle>;
  imageSource?: ImageSourcePropType | null;
  showAbility?: boolean;
  effectiveAttack?: number;
  effectiveDefense?: number;
  presentationState?: UnifiedCardPresentationState;
  unavailableReason?: string;
  instanceKey?: string;
  playEntranceAnimation?: boolean;
  entranceDelay?: number;
  drawOrigin?: CardDrawOrigin;
  playAudio?: boolean;
  mediaMode?: 'auto' | 'static';
  slashEffect?: boolean;
}

const ALIGNMENT_MEDALLIONS: Record<CardAlignment, ImageSourcePropType> = {
  good: require('../../assets/icons/alignments/good-medallion.png'),
  evil: require('../../assets/icons/alignments/evil-medallion.png'),
  neutral: require('../../assets/icons/alignments/neutral-medallion.png'),
};

// Transparent silhouettes that should remain fully visible instead of cropped.
export const CARD_IMAGE_FIT_OVERRIDES: Record<string, 'cover' | 'contain'> = {
  ay_raikage: 'contain',
  bam: 'contain',
  trunks: 'contain',
  nelliel_tu: 'contain',
  emlyn_white: 'contain',
  riza_hawkeye: 'contain',
  leafa: 'contain',
  ebisu: 'contain',
  ino_yamanaka: 'contain',
  yosaku: 'contain',
  yonji: 'contain',
};

const VARIANT_BOUNDS: Record<
  UnifiedCardVariant,
  { min: number; max: number; viewportFraction: number }
> = {
  thumbnail: { min: 112, max: 168, viewportFraction: 0.36 },
  selection: { min: 132, max: 196, viewportFraction: 0.42 },
  battle: { min: 146, max: 230, viewportFraction: 0.48 },
  inspection: { min: 260, max: 460, viewportFraction: 0.88 },
  ability: { min: 170, max: 260, viewportFraction: 0.58 },
  faceDown: { min: 132, max: 210, viewportFraction: 0.44 },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function CardVideoSurface({
  source,
  contentFit,
  active,
  playAudio,
}: {
  source: string | number;
  contentFit: 'cover' | 'contain';
  active: boolean;
  playAudio: boolean;
}) {
  const player = useVideoPlayer(source as never, (instance) => {
    instance.loop = true;
    instance.muted = !playAudio;
    instance.volume = playAudio ? 0.82 : 0;
    if (active) instance.play();
  });

  useEffect(() => {
    player.loop = true;
    player.muted = !playAudio;
    player.volume = playAudio ? 0.82 : 0;
    if (active) player.play();
    else player.pause();
  }, [active, playAudio, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      nativeControls={false}
      surfaceType="textureView"
      useExoShutter={false}
    />
  );
}

function Artwork({
  card,
  imageSource,
  mediaMode,
  playAudio,
}: {
  card: Card;
  imageSource?: ImageSourcePropType | null;
  mediaMode: 'auto' | 'static';
  playAudio: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const { reduceMotion } = useMotionPreferences();
  const { settings } = useSettings();
  const rarity = card.rarity ?? 'common';
  const visual = getCardRarityVisual(rarity);
  const rawVideo = (card as Card & { videoUrl?: string | number }).videoUrl;
  const customImage = (card as Card & { customImage?: string }).customImage;
  const resolvedImage = imageSource === undefined ? getCardImage(card) : imageSource;
  const contentFit = customImage ? 'contain' : (CARD_IMAGE_FIT_OVERRIDES[card.id] ?? 'cover');
  const videoAllowed =
    mediaMode === 'auto' &&
    !reduceMotion &&
    settings.animationsEnabled &&
    appActive;
  const audioAllowed = playAudio && settings.soundEnabled && videoAllowed;

  useEffect(() => {
    setImageFailed(false);
  }, [card.id, imageSource]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  if (rawVideo && videoAllowed) {
    return (
      <CardVideoSurface
        source={rawVideo}
        contentFit={contentFit}
        active={videoAllowed}
        playAudio={audioAllowed}
      />
    );
  }

  const staticSource = customImage ? { uri: customImage } : resolvedImage;
  if (staticSource && !imageFailed) {
    return (
      <Image
        source={staticSource as never}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        transition={reduceMotion ? 0 : 140}
        onError={() => setImageFailed(true)}
        accessible={false}
      />
    );
  }

  return (
    <LinearGradient
      colors={visual.surfaceGradient}
      style={[StyleSheet.absoluteFill, styles.fallback]}
    >
      <Sparkles size={28} color={visual.color} />
      <ThemedText type="caption" style={styles.fallbackText}>
        الصورة غير متاحة
      </ThemedText>
    </LinearGradient>
  );
}

function RarityFlourish({ rarity, active }: { rarity: CardRarity; active: boolean }) {
  const progress = useSharedValue(0);
  const { reduceMotion } = useMotionPreferences();
  const visual = getCardRarityVisual(rarity);

  useEffect(() => {
    cancelAnimation(progress);
    if (!active || reduceMotion || visual.motion === 'quiet') {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: ANIM_DURATION.RARITY_REVEAL,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(progress);
  }, [active, progress, reduceMotion, visual.motion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.82 ? progress.value * 0.5 : (1 - progress.value) * 2.7,
    transform: [{ translateX: -160 + progress.value * 430 }, { rotate: '-18deg' }],
  }));

  if (!active || reduceMotion || visual.motion === 'quiet') return null;

  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.flourish, animatedStyle]}
    >
      <LinearGradient
        colors={['transparent', `${visual.color}66`, 'rgba(255,255,255,0.5)', `${visual.color}44`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.flourishGradient}
      />
    </Animated.View>
  );
}

function Stat({
  kind,
  base,
  effective,
  prominent,
}: {
  kind: 'attack' | 'defense';
  base: number;
  effective: number;
  prominent: boolean;
}) {
  const changed = base !== effective;
  const positive = effective > base;
  const Icon = kind === 'attack' ? Sword : Shield;
  const tint = kind === 'attack' ? SEMANTIC_COLOR.status.danger : SEMANTIC_COLOR.accent.secondary;
  const label = kind === 'attack' ? 'الهجوم' : 'الدفاع';

  return (
    <View
      style={[styles.stat, prominent && styles.statProminent]}
      accessibilityLabel={`${label} ${effective}${changed ? `، القيمة الأساسية ${base}` : ''}`}
    >
      <Icon size={prominent ? 18 : 14} color={tint} accessibilityElementsHidden />
      {changed ? (
        <ThemedText
          type="numeric"
          style={[
            styles.statValue,
            prominent && styles.statValueProminent,
            { color: positive ? SEMANTIC_COLOR.status.success : SEMANTIC_COLOR.status.danger },
          ]}
        >
          {effective}
        </ThemedText>
      ) : (
        <ThemedText type="numeric" style={[styles.statValue, prominent && styles.statValueProminent]}>
          {effective}
        </ThemedText>
      )}
      {changed ? (
        <ThemedText
          type="caption"
          forceLtr
          style={{ color: positive ? SEMANTIC_COLOR.status.success : SEMANTIC_COLOR.status.danger }}
        >
          {positive ? `+${effective - base}` : String(effective - base)}
        </ThemedText>
      ) : null}
    </View>
  );
}

function FaceDown() {
  return (
    <View style={styles.back}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(57,230,208,0.12)', 'rgba(8,13,22,0.06)', 'rgba(141,164,255,0.12)']}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.backRingOuter} />
      <View pointerEvents="none" style={styles.backRingInner} />
      <EyeOff size={30} color={SEMANTIC_COLOR.accent.primary} accessibilityElementsHidden />
      <ThemedText type="label" forceLtr style={styles.backTitle}>CARD CLASH</ThemedText>
      <ThemedText type="caption" style={styles.backSub}>بطاقة مخفية</ThemedText>
    </View>
  );
}

function StateBadges({
  state,
  unavailableReason,
}: {
  state: UnifiedCardPresentationState;
  unavailableReason?: string;
}) {
  return (
    <View pointerEvents="none" style={styles.stateBadges}>
      {state.pending ? (
        <View style={styles.stateChip}>
          <Clock3 size={12} color={SEMANTIC_COLOR.status.warning} />
          <ThemedText type="caption" style={{ color: SEMANTIC_COLOR.status.warning }}>بانتظار التأكيد</ThemedText>
        </View>
      ) : null}
      {state.targeted ? (
        <View style={styles.stateChip}>
          <Crosshair size={12} color={SEMANTIC_COLOR.status.danger} />
          <ThemedText type="caption" style={{ color: SEMANTIC_COLOR.status.danger }}>مستهدف</ThemedText>
        </View>
      ) : null}
      {state.transformed ? (
        <View style={styles.stateChip}>
          <Zap size={12} color={SEMANTIC_COLOR.rarity.special} />
          <ThemedText type="caption" style={{ color: SEMANTIC_COLOR.rarity.special }}>تحول</ThemedText>
        </View>
      ) : null}
      {unavailableReason ? (
        <View style={styles.stateChip}>
          <Ban size={12} color={SEMANTIC_COLOR.text.secondary} />
          <ThemedText type="caption" numberOfLines={2} style={styles.unavailableText}>{unavailableReason}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function UnifiedCardImpl({
  card,
  variant = 'thumbnail',
  selected = false,
  disabled = false,
  interactive = true,
  onPress,
  onInspect,
  selectionLabel,
  style,
  imageSource,
  showAbility = variant === 'inspection' || variant === 'ability',
  effectiveAttack,
  effectiveDefense,
  presentationState,
  unavailableReason,
  instanceKey,
  playEntranceAnimation = false,
  entranceDelay = 0,
  drawOrigin,
  playAudio = false,
  mediaMode = 'auto',
  slashEffect = false,
}: UnifiedCardProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const hidden = variant === 'faceDown' || !card;
  const rarity: CardRarity = hidden ? 'common' : (card.rarity ?? 'common');
  const visual = getCardRarityVisual(rarity);
  const bounds = VARIANT_BOUNDS[variant];
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const explicitWidth = typeof flattenedStyle.width === 'number' ? flattenedStyle.width : undefined;
  const fallbackWidth = clamp(viewportWidth * bounds.viewportFraction, bounds.min, bounds.max);
  const cardWidth = explicitWidth ?? fallbackWidth;
  const inspection = variant === 'inspection';
  const compact = variant === 'thumbnail' || cardWidth < 150;
  const battle = variant === 'battle';
  const state: UnifiedCardPresentationState = {
    transformed: card?._rageActive || card?.isRagedVersion,
    ...presentationState,
  };
  const attack = card ? (effectiveAttack ?? card.attack) : 0;
  const defense = card ? (effectiveDefense ?? card.defense) : 0;
  const abilityText = hidden || !showAbility || !card ? undefined : getCardAbilityDisplayText(card);
  const alignment = card ? getCardAlignment(card) : 'neutral';
  const alignmentMeta = CARD_ALIGNMENT_META[alignment];
  const effectiveInstanceKey = instanceKey ?? `${card?.id ?? 'hidden'}:${variant}`;
  const motion = useCardPresentationMotion({
    instanceKey: effectiveInstanceKey,
    selected,
    revealed: Boolean(state.revealed),
    playEntrance: playEntranceAnimation,
    entranceDelay,
    drawOrigin,
  });

  const accessibilityLabel = hidden
    ? 'بطاقة خصم مخفية'
    : [
        card.nameAr || card.name,
        `الندرة ${visual.labelAr}`,
        `الهجوم ${attack}`,
        `الدفاع ${defense}`,
        card.hp !== undefined ? `الصحة ${card.hp}` : null,
        abilityText && inspection ? `القدرة ${abilityText}` : null,
        unavailableReason ? `غير متاحة: ${unavailableReason}` : null,
      ].filter(Boolean).join('، ');

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'longpress' && onInspect) onInspect();
    if (event.nativeEvent.actionName === 'activate' && onPress && !disabled) onPress();
  };

  return (
    <Animated.View
      style={[
        styles.motionLayer,
        {
          width: cardWidth,
          maxWidth: '100%',
          aspectRatio: inspection ? undefined : 0.72,
          minHeight: inspection ? Math.max(390, cardWidth / 0.82) : undefined,
        },
        motion.animatedStyle,
        style,
      ]}
    >
      <Pressable
        disabled={disabled || !interactive || !onPress}
        onPress={onPress}
        onLongPress={onInspect}
        delayLongPress={420}
        onPressIn={motion.onPressIn}
        onPressOut={motion.onPressOut}
        accessibilityRole={interactive && (onPress || onInspect) ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={onInspect && !inspection ? 'اضغط مطولاً أو استخدم زر التفاصيل لفتح البطاقة كاملة' : undefined}
        accessibilityActions={onInspect ? [{ name: 'activate' }, { name: 'longpress', label: 'عرض التفاصيل' }] : undefined}
        onAccessibilityAction={onInspect ? handleAccessibilityAction : undefined}
        accessibilityState={{ selected, disabled, busy: Boolean(state.pending) }}
        style={styles.pressable}
      >
        <RarityFrame
          rarity={rarity}
          selected={selected}
          playable={state.playable}
          targeted={state.targeted}
          disabled={disabled}
          style={styles.fill}
        >
          {hidden ? (
            <FaceDown />
          ) : (
            <View style={[styles.face, disabled && styles.disabledFace]}>
              <View style={[styles.art, inspection && styles.artInspection]}>
                <Artwork
                  card={card}
                  imageSource={imageSource}
                  mediaMode={mediaMode}
                  playAudio={playAudio}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(8,13,22,0.02)', 'rgba(8,13,22,0.12)', 'rgba(8,13,22,0.92)']}
                  locations={[0, 0.58, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={styles.insetShade} />

                {slashEffect ? (
                  <View pointerEvents="none" style={styles.zoroSlashOverlay} accessibilityElementsHidden>
                    <View style={[styles.zoroSlashLine, styles.zoroSlashLineOne]} />
                    <View style={[styles.zoroSlashLine, styles.zoroSlashLineTwo]} />
                    <View style={styles.zoroSlashLabel}>
                      <ThemedText type="caption" style={styles.zoroSlashLabelText}>قطع زورو</ThemedText>
                    </View>
                  </View>
                ) : null}

                <View style={[styles.rarityPill, { backgroundColor: visual.badgeBackground, borderColor: visual.insetColor }]}>
                  <ThemedText type="caption" style={{ color: visual.color }}>
                    {visual.symbol} {visual.labelAr}
                  </ThemedText>
                </View>

                <View
                  style={[styles.alignmentBadge, { borderColor: alignmentMeta.borderColor, backgroundColor: alignmentMeta.backgroundColor }]}
                  accessibilityLabel={`تصنيف الكرت: ${alignmentMeta.label}`}
                >
                  <Image
                    source={ALIGNMENT_MEDALLIONS[alignment]}
                    style={styles.alignmentMedallion}
                    contentFit="contain"
                    accessible={false}
                  />
                </View>

                {selected ? (
                  <View style={styles.selectedBadge} accessibilityLabel="محدد">
                    <Check size={14} color={SEMANTIC_COLOR.text.inverse} />
                  </View>
                ) : null}

                {state.damaged ? <View pointerEvents="none" style={styles.damageEdge} /> : null}
                <RarityFlourish rarity={rarity} active={Boolean(state.revealed || selected)} />
              </View>

              <View style={[styles.copy, inspection && styles.copyInspection]}>
                <View style={styles.nameRow}>
                  <View style={styles.nameCopy}>
                    <ThemedText
                      type="defaultSemiBold"
                      numberOfLines={inspection ? undefined : compact ? 1 : 2}
                      style={[styles.name, inspection && styles.nameInspection]}
                    >
                      {card.nameAr || card.name}
                    </ThemedText>
                    {(inspection || !compact) && (card.nameEn ?? card.name) ? (
                      <ThemedText
                        type="caption"
                        numberOfLines={inspection ? 2 : 1}
                        style={styles.nameEn}
                        forceLtr
                      >
                        {card.nameEn ?? card.name}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>

                <View style={styles.stats}>
                  <Stat kind="attack" base={card.attack} effective={attack} prominent={battle || inspection} />
                  <Stat kind="defense" base={card.defense} effective={defense} prominent={battle || inspection} />
                  {inspection && card.hp !== undefined ? (
                    <View style={styles.hpStat} accessibilityLabel={`الصحة ${card.hp}`}>
                      <ThemedText type="caption" style={styles.hpLabel}>HP</ThemedText>
                      <ThemedText type="numeric" style={styles.statValueProminent}>{card.hp}</ThemedText>
                    </View>
                  ) : null}
                </View>

                {abilityText ? (
                  <View style={[styles.ability, inspection && styles.abilityInspection]}>
                    <Sparkles size={inspection ? 16 : 13} color={SEMANTIC_COLOR.accent.primary} accessibilityElementsHidden />
                    <ThemedText
                      type={inspection ? 'default' : 'caption'}
                      numberOfLines={inspection ? undefined : compact ? 1 : 2}
                      style={[styles.abilityText, inspection && styles.abilityTextInspection]}
                    >
                      {abilityText}
                    </ThemedText>
                  </View>
                ) : null}

                {selectionLabel ? (
                  <View style={styles.selectionLabel}>
                    <ThemedText type="label" style={styles.selectionLabelText}>{selectionLabel}</ThemedText>
                  </View>
                ) : null}

                <StateBadges state={state} unavailableReason={unavailableReason} />
              </View>
            </View>
          )}
        </RarityFrame>
      </Pressable>

      {!hidden && onInspect && !inspection ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`عرض تفاصيل ${card.nameAr || card.name}`}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onInspect();
          }}
          style={styles.inspectButton}
        >
          <Eye size={17} color={SEMANTIC_COLOR.text.primary} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export const UnifiedCard = memo(UnifiedCardImpl);

const styles = StyleSheet.create({
  motionLayer: {
    position: 'relative',
    alignSelf: 'center',
  },
  pressable: { flex: 1 },
  fill: { flex: 1 },
  face: {
    flex: 1,
    backgroundColor: SEMANTIC_COLOR.surface.default,
  },
  disabledFace: { opacity: 0.56 },
  art: {
    flex: 1.42,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  artInspection: {
    flex: undefined,
    height: 250,
  },
  insetShade: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(243,246,252,0.08)',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  fallbackText: { color: SEMANTIC_COLOR.text.secondary },
  rarityPill: {
    position: 'absolute',
    top: SPACE.sm,
    left: SPACE.sm,
    minHeight: 28,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  alignmentBadge: {
    position: 'absolute',
    top: SPACE.sm,
    right: SPACE.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignmentMedallion: { width: 27, height: 27 },
  selectedBadge: {
    position: 'absolute',
    top: 46,
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
    backgroundColor: 'rgba(8,13,22,0.30)',
  },
  copyInspection: {
    padding: SPACE.lg,
    gap: SPACE.md,
  },
  nameRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: SPACE.sm },
  nameCopy: { flex: 1 },
  name: {
    fontSize: FONT.md,
    lineHeight: 24,
    textAlign: 'right',
  },
  nameInspection: {
    fontSize: FONT.lg,
    lineHeight: 34,
  },
  nameEn: {
    marginTop: 2,
    opacity: 0.78,
    textAlign: 'right',
  },
  stats: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: SPACE.xs,
  },
  stat: {
    flex: 1,
    minHeight: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(8,13,22,0.72)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.xs,
  },
  statProminent: { minHeight: 46 },
  statValue: { fontSize: FONT.sm },
  statValueProminent: { fontSize: FONT.lg, lineHeight: 31 },
  hpStat: {
    flex: 1,
    minHeight: 46,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(8,13,22,0.72)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.status.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hpLabel: { color: SEMANTIC_COLOR.status.success, fontFamily: FONT_FAMILY.latinBold },
  ability: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.xs,
    marginTop: SPACE.xs,
    paddingTop: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: SEMANTIC_COLOR.border.subtle,
  },
  abilityInspection: {
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: 'rgba(57,230,208,0.22)',
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(57,230,208,0.055)',
  },
  abilityText: { flex: 1, textAlign: 'right' },
  abilityTextInspection: {
    fontSize: FONT.md,
    lineHeight: 27,
    color: SEMANTIC_COLOR.text.primary,
  },
  selectionLabel: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(57,230,208,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(57,230,208,0.42)',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
  },
  selectionLabelText: {
    color: SEMANTIC_COLOR.accent.primary,
    fontSize: FONT.xs,
  },
  stateBadges: { gap: SPACE.xs },
  stateChip: {
    minHeight: 28,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(8,13,22,0.56)',
  },
  unavailableText: { flex: 1, textAlign: 'right' },
  inspectButton: {
    position: 'absolute',
    bottom: SPACE.sm,
    right: SPACE.sm,
    width: TOUCH_TARGET.compact,
    height: TOUCH_TARGET.compact,
    borderRadius: TOUCH_TARGET.compact / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243,246,252,0.22)',
    backgroundColor: 'rgba(8,13,22,0.88)',
    zIndex: 20,
  },
  back: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    backgroundColor: SEMANTIC_COLOR.background.arena,
  },
  backRingOuter: {
    position: 'absolute',
    width: '72%',
    aspectRatio: 1,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(57,230,208,0.28)',
  },
  backRingInner: {
    position: 'absolute',
    width: '46%',
    aspectRatio: 1,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(141,164,255,0.24)',
    transform: [{ rotate: '45deg' }],
  },
  backTitle: { color: SEMANTIC_COLOR.accent.primary },
  backSub: { opacity: 0.72 },
  flourish: {
    position: 'absolute',
    top: '-12%',
    bottom: '-12%',
    width: 90,
  },
  flourishGradient: { flex: 1 },
  damageEdge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(251,113,133,0.62)',
  },
  zoroSlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 7,
    overflow: 'hidden',
  },
  zoroSlashLine: {
    position: 'absolute',
    left: '-12%',
    width: '124%',
    height: 3,
    backgroundColor: '#F8FAFC',
    shadowColor: SEMANTIC_COLOR.status.danger,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  zoroSlashLineOne: { top: '42%', transform: [{ rotate: '-18deg' }] },
  zoroSlashLineTwo: { top: '54%', transform: [{ rotate: '15deg' }] },
  zoroSlashLabel: {
    position: 'absolute',
    bottom: SPACE.sm,
    alignSelf: 'center',
    backgroundColor: 'rgba(8,13,22,0.88)',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.status.danger,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
  },
  zoroSlashLabelText: { color: SEMANTIC_COLOR.status.danger },
});
