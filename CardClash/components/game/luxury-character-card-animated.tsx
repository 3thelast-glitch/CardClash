import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import type { Card } from '@/lib/game/types';
import {
  CARD_IMAGE_FIT_OVERRIDES,
  UnifiedCard,
  type UnifiedCardVariant,
} from '@/components/cards/UnifiedCard';

export { CARD_IMAGE_FIT_OVERRIDES };

interface Props {
  card: Card;
  style?: ViewStyle;
  imageOffsetY?: number;
  fitInsideBorder?: boolean;
  isOpenedView?: boolean;
  effectiveAttack?: number;
  effectiveDefense?: number;
  playAudio?: boolean;
  winnerState?: 'winner' | 'leading' | null;
  selectionLabel?: string;
  slashEffect?: boolean;
  mediaMode?: 'auto' | 'static';
}

/**
 * Compatibility adapter for the renderer historically used by collection,
 * selection, solo battle, LAN battle and WebSocket multiplayer.
 *
 * Keeping this public API lets those screens adopt the unified premium card
 * without moving game/network responsibilities into presentation code.
 */
export function LuxuryCharacterCardAnimated({
  card,
  style,
  isOpenedView = false,
  effectiveAttack,
  effectiveDefense,
  playAudio = false,
  winnerState = null,
  selectionLabel,
  slashEffect = false,
  mediaMode = 'auto',
}: Props) {
  const flattened = StyleSheet.flatten(style) ?? {};
  const explicitWidth = typeof flattened.width === 'number' ? flattened.width : undefined;
  const compact = explicitWidth !== undefined && explicitWidth < 156;
  const variant: UnifiedCardVariant = isOpenedView
    ? 'inspection'
    : selectionLabel
      ? 'selection'
      : compact
        ? 'thumbnail'
        : 'battle';
  const contextualLabel = selectionLabel
    ?? (winnerState === 'winner' ? 'الفائز' : winnerState === 'leading' ? 'متقدم' : undefined);

  return (
    <UnifiedCard
      card={card}
      variant={variant}
      interactive={false}
      style={style}
      effectiveAttack={effectiveAttack}
      effectiveDefense={effectiveDefense}
      selectionLabel={contextualLabel}
      showAbility={isOpenedView || !compact}
      playAudio={playAudio}
      mediaMode={mediaMode}
      slashEffect={slashEffect}
      presentationState={{
        damaged: card.winState === 'lose',
        transformed: Boolean(card._rageActive || card.isRagedVersion),
        revealed: winnerState === 'winner',
      }}
    />
  );
}
