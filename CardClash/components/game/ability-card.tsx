import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Power, RefreshCw, Sparkles } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { AbilityType, CardRarity } from '@/lib/game/types';
import {
  MANUAL_ABILITY_PRESENTATION,
  getAbilityPresentation,
} from '@/lib/game/ability-presentation';
import { getCardRarityVisual } from '@/lib/presentation/card-rarity-visuals';
import { RarityFrame } from '@/components/cards/RarityFrame';
import { ThemedText } from '@/components/ui/ThemedText';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { haptics } from '@/lib/feedback/haptics';
import {
  FONT,
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
  TOUCH_TARGET,
} from '@/components/ui/design-tokens';

export interface AbilityData {
  id: string | number;
  nameEn: string;
  nameAr: string;
  description: string;
  descriptionWarning?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  rarity: string;
  imageUrl?: string;
  isActive?: boolean;
  /** Optional canonical identity. Existing data is adapted by name when absent. */
  abilityType?: AbilityType;
}

interface Props {
  ability: AbilityData;
  showActionButtons?: boolean;
  onToggleDisabled?: (nowDisabled: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

// Static registry; never construct require() paths dynamically.
export const ABILITY_IMAGES: Record<string, ImageSourcePropType> = {
  default: require('../../assets/abilities/Add_Element_Art.png'),
  Add_Element_Art: require('../../assets/abilities/Add_Element_Art.png'),
  Arise_Art: require('../../assets/abilities/Arise_Art.png'),
  Avatar_Art: require('../../assets/abilities/Avatar_Art.png'),
  Cancel_Ability_Art: require('../../assets/abilities/Cancel_Ability_Art.png'),
  Compensation_Art: require('../../assets/abilities/Compensation_Art.png'),
  Consecutive_Loss_Buff_Art: require('../../assets/abilities/Consecutive_Loss_Buff_Art.png'),
  Conversion_Art: require('../../assets/abilities/Conversion_Art.png'),
  Convert_Debuffs_Art: require('../../assets/abilities/Convert_Debuffs_Art.png'),
  'Deprivation_(Ability)_Art': require('../../assets/abilities/Deprivation_(Ability)_Art.png'),
  Deprivation_Art: require('../../assets/abilities/Deprivation_(Ability)_Art.png'),
  Dilemma_Art: require('../../assets/abilities/Dilemma_Art.png'),
  Disaster_Art: require('../../assets/abilities/Disaster_Art.png'),
  Double_Or_Nothing_Art: require('../../assets/abilities/Double Or Nothing_Art.png'),
  Double_Points_Art: require('../../assets/abilities/Double Points_Art.png'),
  Double_Your_Buffs_Art: require('../../assets/abilities/Double Your Buffs_Art.png'),
  Double_Next_Cards_Art: require('../../assets/abilities/Double_Next_Cards_Art.png'),
  Eclipse_Art: require('../../assets/abilities/Eclipse_Art.png'),
  Elemental_Mastery_Art: require('../../assets/abilities/Elemental Mastery_Art.png'),
  Explosion_Art: require('../../assets/abilities/Explosion_Art.png'),
  Change_Faction_Art: require('../../assets/abilities/Swap Class_Art.png'),
  Faction_Mastery_Art: require('../../assets/abilities/Elemental Mastery_Art.png'),
  Greed_Art: require('../../assets/abilities/Greed_Art.png'),
  Halve_Points_Art: require('../../assets/abilities/Halve_Points_Art.png.png'),
  LOGICAL_ENCOUNTER_Art: require('../../assets/abilities/LOGICAL ENCOUNTER_Art.png'),
  Logical_Encounter_Art: require('../../assets/abilities/LOGICAL ENCOUNTER_Art.png'),
  Lifesteal_Art: require('../../assets/abilities/Lifesteal_Art.png'),
  Merge_Art: require('../../assets/abilities/Merge_Art.png'),
  Misdirection_Art: require('../../assets/abilities/Misdirection_Art.png'),
  Penetration_Art: require('../../assets/abilities/Penetration_Art.png'),
  Popularity_Art: require('../../assets/abilities/Popularity_Art.png'),
  Pool_Art: require('../../assets/abilities/Pool_Art.png'),
  Propaganda_Art: require('../../assets/abilities/Propaganda_Art.png'),
  Protection_Art: require('../../assets/abilities/Protection_Art.png'),
  Purge_Art: require('../../assets/abilities/Purge_Art.png'),
  Recall_Art: require('../../assets/abilities/Recall_Art.png'),
  Reduction_Art: require('../../assets/abilities/Reduction_Art.png'),
  Shambles_Art: require('../../assets/abilities/Shambles_Art.png'),
  Swap_Class_Art: require('../../assets/abilities/Swap Class_Art.png'),
  Phantom_Blade_Art: require('../../assets/abilities/Phantom Blade_Art.png'),
  Infinity_Loop_Art: require('../../assets/abilities/Infinity Loop_Art.png'),
  Absolute_Dominance_Art: require('../../assets/abilities/Absolute Dominance_Art.png'),
  Reinforcement_Art: require('../../assets/abilities/Reinforcement_Art.png'),
  Rescue_Art: require('../../assets/abilities/Rescue_Art.png'),
  Revenge_Art: require('../../assets/abilities/Revenge_Art.png'),
  Revive_Art: require('../../assets/abilities/Revive_Art.png'),
  Sacrifice_Art: require('../../assets/abilities/Sacrifice_Art.png'),
  Seal_Art: require('../../assets/abilities/Seal_Art.png'),
  Shield_Art: require('../../assets/abilities/Shield_Art.png'),
  Skip_Art: require('../../assets/abilities/Skip_Art.png'),
  Sniping_Art: require('../../assets/abilities/Sniping_Art.png'),
  Star_Superiority_Art: require('../../assets/abilities/Star Superiority_Art.png'),
  Steal_Ability_Art: require('../../assets/abilities/Steal Ability_Art.png'),
  Subhan_Art: require('../../assets/abilities/Subhan_Art.png'),
  Suicide_Art: require('../../assets/abilities/Suicide_Art.png'),
  Take_It_Art: require('../../assets/abilities/Take It_Art.png'),
  Trap_Art: require('../../assets/abilities/Trap_Art.png'),
  Weakening_Art: require('../../assets/abilities/Weakening_Art.png'),
  Wipe_Art: require('../../assets/abilities/Wipe_Art.png'),
  Nothing_Happened_Art: require('../../assets/abilities/Nothing_Happened_Art.png'),
};

const ABILITY_VIDEOS: Record<string, number> = {
  Nothing_Happened_Art: require('../../assets/abilities/Nothing_Happened_Art.mp4'),
};

const RARITY_BY_LABEL: Record<string, CardRarity> = {
  common: 'common',
  rare: 'rare',
  epic: 'epic',
  legendary: 'legendary',
  special: 'special',
};

const MANUAL_NAME_LOOKUP = new Map<string, AbilityType>(
  (Object.keys(MANUAL_ABILITY_PRESENTATION) as AbilityType[]).map((id) => [
    id.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(),
    id,
  ]),
);

function resolveAbilityType(ability: AbilityData): AbilityType | undefined {
  if (ability.abilityType) return ability.abilityType;
  return MANUAL_NAME_LOOKUP.get(ability.nameEn.trim().toLowerCase());
}

function artKey(nameEn: string) {
  const direct = nameEn.replaceAll(' ', '_') + '_Art';
  if (ABILITY_IMAGES[direct] || ABILITY_VIDEOS[direct]) return direct;
  if (nameEn.toLowerCase() === 'logical encounter') return 'Logical_Encounter_Art';
  return direct;
}

function AbilityArtworkVideo({ source, playAudio = false }: { source: number; playAudio?: boolean }) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = !playAudio;
    instance.play();
  });

  useEffect(() => {
    player.muted = !playAudio;
    player.volume = playAudio ? 0.82 : 0;
  }, [playAudio, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

function RevealSweep({ color, active }: { color: string; active: boolean }) {
  const progress = useSharedValue(0);
  const { reduceMotion } = useMotionPreferences();

  useEffect(() => {
    cancelAnimation(progress);
    if (!active || reduceMotion) {
      progress.value = 0;
      return;
    }
    progress.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(progress);
  }, [active, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.8 ? progress.value * 0.48 : (1 - progress.value) * 2.4,
    transform: [{ translateX: -120 + progress.value * 390 }, { rotate: '-16deg' }],
  }));

  if (!active || reduceMotion) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden style={[styles.sweep, style]}>
      <LinearGradient colors={['transparent', `${color}66`, 'rgba(255,255,255,0.52)', 'transparent']} style={styles.sweepFill} />
    </Animated.View>
  );
}

function AbilityCardImpl({ ability, showActionButtons = true, onToggleDisabled, style }: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const [localRarity, setLocalRarity] = useState<CardRarity>(
    RARITY_BY_LABEL[ability.rarity.toLowerCase()] ?? 'common',
  );
  const [isDisabled, setIsDisabled] = useState(ability.isActive === false);
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const explicitWidth = typeof flattenedStyle.width === 'number' ? flattenedStyle.width : undefined;
  const explicitHeight = typeof flattenedStyle.height === 'number' ? flattenedStyle.height : undefined;
  const width = explicitWidth ?? Math.max(168, Math.min(260, viewportWidth * 0.56));
  const height = explicitHeight ?? Math.round(width / 0.72);
  const compact = height < 270 || width < 178;
  const visual = getCardRarityVisual(localRarity);
  const canonicalType = resolveAbilityType(ability);
  const presentation = useMemo(
    () => getAbilityPresentation(canonicalType ?? String(ability.id)),
    [ability.id, canonicalType],
  );
  const Icon = ability.icon;
  const key = artKey(ability.nameEn);
  const videoSource = ABILITY_VIDEOS[key];
  const imageSource = ability.imageUrl
    ? { uri: ability.imageUrl }
    : (ABILITY_IMAGES[key] ?? ABILITY_IMAGES.default);

  useEffect(() => {
    setIsDisabled(ability.isActive === false);
  }, [ability.isActive]);

  useEffect(() => {
    setLocalRarity(RARITY_BY_LABEL[ability.rarity.toLowerCase()] ?? 'common');
  }, [ability.rarity]);

  const cycleRarity = () => {
    const order: CardRarity[] = ['common', 'rare', 'epic', 'legendary', 'special'];
    setLocalRarity((current) => order[(order.indexOf(current) + 1) % order.length]);
    haptics.trigger('selection');
  };

  const handleTogglePower = () => {
    const next = !isDisabled;
    setIsDisabled(next);
    haptics.trigger(next ? 'invalid' : 'selection');
    onToggleDisabled?.(next);
  };

  return (
    <View style={[styles.wrapper, { width, height }, style, isDisabled && styles.disabled]}>
      <RarityFrame rarity={localRarity} disabled={isDisabled} style={styles.fill}>
        <View style={styles.face} accessibilityLabel={`${ability.nameAr}. ${ability.description}`}>
          <View style={styles.artwork}>
            {videoSource ? (
              <AbilityArtworkVideo source={videoSource} playAudio={false} />
            ) : (
              <Image source={imageSource} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false} />
            )}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(8,13,22,0.02)', 'rgba(8,13,22,0.16)', 'rgba(8,13,22,0.94)']}
              locations={[0, 0.56, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.rarityChip, { borderColor: visual.insetColor, backgroundColor: visual.badgeBackground }]}>
              <ThemedText type="caption" style={{ color: visual.color }}>{visual.symbol} {visual.labelAr}</ThemedText>
            </View>
            <View style={[styles.familyChip, { borderColor: `${presentation.effectColor}66` }]}>
              <Icon size={compact ? 14 : 17} color={presentation.effectColor} />
            </View>
            <RevealSweep color={visual.color} active={visual.motion === 'reveal'} />
          </View>

          <View style={[styles.info, compact && styles.infoCompact]}>
            <ThemedText type="defaultSemiBold" numberOfLines={compact ? 1 : 2} style={[styles.nameAr, compact && styles.nameArCompact]}>
              {ability.nameAr}
            </ThemedText>
            {!compact ? (
              <ThemedText forceLtr type="caption" numberOfLines={1} style={styles.nameEn}>{ability.nameEn}</ThemedText>
            ) : null}
            <View style={[styles.divider, { backgroundColor: `${presentation.effectColor}55` }]} />
            <View style={styles.descriptionRow}>
              <Sparkles size={compact ? 12 : 14} color={presentation.effectColor} />
              <ThemedText
                type={compact ? 'caption' : 'default'}
                numberOfLines={compact ? 3 : undefined}
                style={[styles.description, !compact && styles.descriptionFull]}
              >
                {ability.description}
              </ThemedText>
            </View>
            {ability.descriptionWarning ? (
              <ThemedText
                type="caption"
                numberOfLines={compact ? 1 : undefined}
                style={styles.warning}
              >
                {ability.descriptionWarning}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </RarityFrame>

      {showActionButtons ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="تبديل ندرة المعاينة" onPress={cycleRarity} style={styles.actionButton}>
            <RefreshCw size={16} color={SEMANTIC_COLOR.accent.secondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isDisabled ? 'تفعيل القدرة' : 'تعطيل القدرة'}
            onPress={handleTogglePower}
            style={styles.actionButton}
          >
            <Power size={16} color={isDisabled ? SEMANTIC_COLOR.status.danger : SEMANTIC_COLOR.status.success} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const AbilityCard = memo(AbilityCardImpl);

const styles = StyleSheet.create({
  wrapper: { position: 'relative', alignSelf: 'center' },
  fill: { flex: 1 },
  disabled: { opacity: 0.58 },
  face: { flex: 1, backgroundColor: SEMANTIC_COLOR.surface.default },
  artwork: { flex: 1.18, minHeight: 0, position: 'relative', overflow: 'hidden' },
  rarityChip: {
    position: 'absolute', top: SPACE.sm, left: SPACE.sm,
    minHeight: 27, justifyContent: 'center', paddingHorizontal: SPACE.sm,
    borderWidth: 1, borderRadius: RADIUS.pill,
  },
  familyChip: {
    position: 'absolute', top: SPACE.sm, right: SPACE.sm,
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    backgroundColor: 'rgba(8,13,22,0.82)', alignItems: 'center', justifyContent: 'center',
  },
  info: { padding: SPACE.md, gap: SPACE.xs, backgroundColor: 'rgba(8,13,22,0.36)' },
  infoCompact: { padding: SPACE.sm, gap: 2 },
  nameAr: { fontSize: FONT.md, lineHeight: 26, textAlign: 'right' },
  nameArCompact: { fontSize: FONT.sm, lineHeight: 22 },
  nameEn: { opacity: 0.75, textAlign: 'right' },
  divider: { height: 1, marginVertical: SPACE.xs },
  descriptionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.xs },
  description: { flex: 1, textAlign: 'right' },
  descriptionFull: { fontSize: FONT.sm, lineHeight: 24, color: SEMANTIC_COLOR.text.primary },
  warning: { color: SEMANTIC_COLOR.status.warning, textAlign: 'right' },
  actions: {
    position: 'absolute', bottom: SPACE.sm, left: SPACE.sm, right: SPACE.sm,
    flexDirection: 'row', justifyContent: 'space-between', zIndex: 20,
  },
  actionButton: {
    width: TOUCH_TARGET.compact, height: TOUCH_TARGET.compact,
    borderRadius: TOUCH_TARGET.compact / 2, borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(8,13,22,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  sweep: { position: 'absolute', top: '-15%', bottom: '-15%', width: 74 },
  sweepFill: { flex: 1 },
});
