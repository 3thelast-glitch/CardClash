/**
 * RoundResultBanner — Banner صغير يظهر نتيجة كل جولة (win / lose / draw)
 * يعوض getResultMessage + getResultColor المتفرقتين في battle.tsx
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import type { RoundResult } from '@/lib/game/types';

type Winner = 'player' | 'bot' | 'draw';

const RESULT_CONFIG: Record<Winner, { message: string; color: string }> = {
  player: { message: '\u{1F389} \u0623\u0646\u062a \u0627\u0644\u0641\u0627\u0626\u0632!', color: '#4ade80' },
  bot:    { message: '\u{1F622} \u0627\u0644\u0628\u0648\u062a \u064a\u0641\u0648\u0632!',  color: '#f87171' },
  draw:   { message: '\u{1F91D} \u062a\u0639\u0627\u062f\u0644\u0627\u064b!',               color: '#fbbf24' },
};

interface RoundResultBannerProps {
  lastRoundResult: RoundResult | null;
  visible: boolean;
}

export const RoundResultBanner = memo(function RoundResultBanner({
  lastRoundResult,
  visible,
}: RoundResultBannerProps) {
  if (!visible || !lastRoundResult) return null;

  const cfg = RESULT_CONFIG[lastRoundResult.winner];

  return (
    <Animated.View style={[styles.banner, { borderColor: cfg.color }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.message}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  banner: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '800',
  },
});
