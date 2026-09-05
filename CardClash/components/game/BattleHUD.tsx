import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ANIM_DURATION, HP_COLORS } from '@/constants/animationConfig';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  FONT,
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
} from '@/components/ui/design-tokens';

interface HpBarProps {
  current: number;
  max: number;
  label: string;
  width?: number;
  height?: number;
  direction?: 'ltr' | 'rtl';
}

function HpBar({ current, max, label, width = 132, height = 12, direction = 'ltr' }: HpBarProps) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const fillWidth = useSharedValue(fraction * width);
  const colorProgress = useSharedValue(fraction);
  const pulseOpacity = useSharedValue(0);
  const { reduceMotion } = useMotionPreferences();

  useEffect(() => {
    if (reduceMotion) {
      fillWidth.value = fraction * width;
      colorProgress.value = fraction;
      pulseOpacity.value = 0;
      return;
    }
    fillWidth.value = withTiming(fraction * width, {
      duration: ANIM_DURATION.HP_BAR,
      easing: Easing.out(Easing.quad),
    });
    colorProgress.value = withTiming(fraction, { duration: ANIM_DURATION.HP_BAR });
    pulseOpacity.value = withSequence(
      withTiming(0.24, { duration: 80 }),
      withTiming(0, { duration: 220 }),
    );
  }, [colorProgress, fillWidth, fraction, pulseOpacity, reduceMotion, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: fillWidth.value,
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 0.3, 0.6, 1],
      [HP_COLORS.LOW, HP_COLORS.HALF, HP_COLORS.FULL, HP_COLORS.FULL],
    ),
  }));

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  return (
    <View
      style={[styles.hpBarWrapper, { width }]}
      accessibilityLabel={`${label}: ${current} من ${max}`}
    >
      <ThemedText type="caption" style={styles.hpLabel}>{label}</ThemedText>
      <View style={[styles.hpTrack, { width, height, borderRadius: height / 2 }]}> 
        <Animated.View
          style={[
            styles.hpFill,
            { height, borderRadius: height / 2 },
            direction === 'rtl' ? { right: 0 } : { left: 0 },
            fillStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFillObject, styles.flash, { borderRadius: height / 2 }, pulseStyle]}
        />
        <View style={styles.hpTextWrap}>
          <ThemedText type="numeric" style={[styles.hpText, { fontSize: Math.max(9, height * 0.72) }]}>
            {current}/{max}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function ScoreDisplay({ playerScore, botScore }: { playerScore: number; botScore: number }) {
  return (
    <View style={styles.scoreWrapper} accessibilityLabel={`النتيجة ${playerScore} مقابل ${botScore}`}>
      <ThemedText type="numeric" style={[styles.scoreNum, { color: SEMANTIC_COLOR.status.success }]}>
        {playerScore}
      </ThemedText>
      <ThemedText type="numeric" style={styles.scoreSep}>:</ThemedText>
      <ThemedText type="numeric" style={[styles.scoreNum, { color: SEMANTIC_COLOR.status.danger }]}>
        {botScore}
      </ThemedText>
    </View>
  );
}

function RoundDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dotsRow} accessibilityLabel={`الجولة ${Math.min(current + 1, total)} من ${total}`}>
      {Array.from({ length: Math.min(total, 10) }).map((_, index) => (
        <View
          key={`round-${index}`}
          accessibilityElementsHidden
          style={[
            styles.dot,
            index < current
              ? styles.dotDone
              : index === current
                ? styles.dotCurrent
                : styles.dotFuture,
          ]}
        />
      ))}
    </View>
  );
}

interface BattleHUDProps {
  playerScore: number;
  botScore: number;
  maxScore: number;
  currentRound: number;
  totalRounds: number;
  turn?: 'player' | 'bot' | 'none';
  playerLabel?: string;
  opponentLabel?: string;
}

export function BattleHUD({
  playerScore,
  botScore,
  maxScore,
  currentRound,
  totalRounds,
  turn = 'none',
  playerLabel = 'أنت',
  opponentLabel = 'الخصم',
}: BattleHUDProps) {
  return (
    <View style={styles.container}>
      <HpBar current={playerScore} max={maxScore} label={playerLabel} />
      <View style={styles.centerCol}>
        <ThemedText type="caption">
          جولة {Math.min(currentRound + 1, totalRounds)} / {totalRounds}
        </ThemedText>
        <ScoreDisplay playerScore={playerScore} botScore={botScore} />
        <RoundDots current={currentRound} total={totalRounds} />
        {turn !== 'none' && (
          <View
            style={[
              styles.turnBadge,
              turn === 'player' ? styles.turnPlayer : styles.turnOpponent,
            ]}
            accessibilityLiveRegion="polite"
          >
            <ThemedText
              type="label"
              style={turn === 'player' ? styles.turnPlayerText : styles.turnOpponentText}
            >
              {turn === 'player' ? 'دورك الآن' : 'دور الخصم'}
            </ThemedText>
          </View>
        )}
      </View>
      <HpBar current={botScore} max={maxScore} label={opponentLabel} direction="rtl" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    backgroundColor: 'rgba(11,20,34,0.92)',
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    borderRadius: RADIUS.lg,
    gap: SPACE.sm,
  },
  hpBarWrapper: { alignItems: 'flex-start', gap: SPACE.xs },
  hpLabel: { color: SEMANTIC_COLOR.text.secondary },
  hpTrack: {
    backgroundColor: HP_COLORS.TRACK,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  hpFill: { position: 'absolute', top: 0, bottom: 0 },
  flash: { backgroundColor: '#FFFFFF' },
  hpTextWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  hpText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.70)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  centerCol: { alignItems: 'center', gap: SPACE.xs, flex: 1 },
  scoreWrapper: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  scoreNum: { fontSize: FONT.xl },
  scoreSep: { color: SEMANTIC_COLOR.text.secondary, fontSize: FONT.lg },
  dotsRow: { flexDirection: 'row', gap: SPACE.xs, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotDone: { backgroundColor: SEMANTIC_COLOR.status.success },
  dotCurrent: { backgroundColor: SEMANTIC_COLOR.accent.primary, width: 9, height: 9, borderRadius: 5 },
  dotFuture: { backgroundColor: SEMANTIC_COLOR.border.subtle },
  turnBadge: {
    minHeight: 28,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  turnPlayer: {
    borderColor: 'rgba(57,230,208,0.55)',
    backgroundColor: 'rgba(57,230,208,0.10)',
  },
  turnOpponent: {
    borderColor: 'rgba(141,164,255,0.52)',
    backgroundColor: 'rgba(141,164,255,0.10)',
  },
  turnPlayerText: { color: SEMANTIC_COLOR.accent.primary, fontSize: FONT.xs },
  turnOpponentText: { color: '#C9D4FF', fontSize: FONT.xs },
});
