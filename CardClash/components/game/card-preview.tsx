import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Power, RefreshCw } from 'lucide-react-native';
import type { Card, CardRarity } from '@/lib/game/types';
import { UnifiedCard } from '@/components/cards/UnifiedCard';
import { SEMANTIC_COLOR, SPACE } from '@/components/ui/design-tokens';

interface CardPreviewProps {
  card: Card;
  onPress?: () => void;
  onInspect?: () => void;
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
  instanceKey?: string;
}

const RARITIES: CardRarity[] = ['common', 'rare', 'epic', 'legendary', 'special'];

export function CardPreview({
  card,
  onPress,
  onInspect,
  style,
  selected = false,
  instanceKey,
}: CardPreviewProps) {
  const [localRarity, setLocalRarity] = useState<CardRarity>(card.rarity ?? 'common');
  const [isActive, setIsActive] = useState(true);
  const previewCard = useMemo(() => ({ ...card, rarity: localRarity }), [card, localRarity]);

  const cycleRarity = () => {
    const index = RARITIES.indexOf(localRarity);
    setLocalRarity(RARITIES[(index + 1) % RARITIES.length]);
  };

  return (
    <View style={[styles.wrapper, style, !isActive && styles.inactive]}>
      <UnifiedCard
        card={previewCard}
        variant="thumbnail"
        selected={selected}
        disabled={!isActive}
        interactive={isActive}
        onPress={onPress}
        onInspect={onInspect}
        instanceKey={instanceKey ?? `preview:${card.id}`}
        mediaMode="static"
      />

      {__DEV__ && (
        <View pointerEvents="box-none" style={styles.devControls}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isActive ? 'تعطيل معاينة البطاقة' : 'تفعيل معاينة البطاقة'}
            onPress={() => setIsActive((value) => !value)}
            style={styles.devButton}
          >
            <Power size={14} color={isActive ? SEMANTIC_COLOR.text.primary : SEMANTIC_COLOR.status.danger} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="تبديل ندرة البطاقة للاختبار"
            onPress={cycleRarity}
            style={styles.devButton}
          >
            <RefreshCw size={14} color={SEMANTIC_COLOR.accent.secondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  inactive: { opacity: 0.48 },
  devControls: {
    position: 'absolute',
    top: SPACE.sm,
    left: SPACE.sm,
    right: SPACE.sm,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  devButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(8,13,22,0.90)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
