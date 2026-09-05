import React, { useMemo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import type { Card, Side } from '@/lib/game/types';
import { UnifiedCard } from '@/components/cards/UnifiedCard';
import { CARD_DIMENSIONS } from '@/constants/game-config';
import { getEffectiveStats } from '@/lib/game/ui-helpers';
import { useGame } from '@/lib/game/game-context';

const SIZE_PRESETS = {
  small: {
    width: CARD_DIMENSIONS.small.width,
    height: CARD_DIMENSIONS.small.height,
  },
  medium: {
    width: CARD_DIMENSIONS.portrait.width,
    height: CARD_DIMENSIONS.portrait.height,
  },
  large: {
    width: 200,
    height: 300,
  },
} as const;

interface CardItemProps {
  card: Card;
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

/**
 * Backward-compatible game adapter. It computes accepted live combat stats and
 * delegates all visual work to UnifiedCard. No gameplay state is mutated here.
 */
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
  const { state } = useGame();
  const preset = SIZE_PRESETS[size];
  const width = customWidth ?? preset.width;
  const height = customHeight ?? preset.height;
  const effective = useMemo(() => {
    if (!state.activeEffects.length) {
      return { attack: card.attack, defense: card.defense };
    }
    return getEffectiveStats(
      card.attack,
      card.defense,
      state.activeEffects,
      cardSide,
      card.cardClass,
    );
  }, [card.attack, card.cardClass, card.defense, cardSide, state.activeEffects]);

  return (
    <UnifiedCard
      card={card}
      variant={size === 'small' ? 'thumbnail' : 'battle'}
      selected={isSelected}
      disabled={disabled}
      interactive={Boolean(onPress)}
      onPress={onPress}
      style={[{ width, height }, StyleSheet.flatten(style)]}
      effectiveAttack={effective.attack}
      effectiveDefense={effective.defense}
      playEntranceAnimation={playEntranceAnimation}
      entranceDelay={entranceDelay}
      mediaMode={size === 'small' ? 'static' : 'auto'}
      showAbility={false}
      showStats={showStats}
      presentationState={{ transformed: Boolean(card._rageActive || card.isRagedVersion) }}
    />
  );
}
