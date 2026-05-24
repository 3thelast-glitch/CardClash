/**
 * BattleScreen — Arena
 * Uses the real GameContext API:
 *   useGame() → { state, playRound, nextRound, useAbility, isGameOver,
 *                 currentPlayerCard, currentBotCard, lastRoundResult, expectedRoundResult }
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, FlatList, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, withSpring, FadeIn, FadeOut,
  SlideInLeft, SlideInRight,
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/lib/game/game-context';
import { useSFX } from '@/hooks/use-sfx';
import { CardData } from '@/types/card';
import { ExplosionEffect } from '@/components/game/explosion-effect';
import { ElementEffect } from '@/components/game/element-effect';
import {
  ELEMENT_EMOJI, ElementAdvantage,
  CLASS_LABELS, CLASS_LABELS_SHORT,
  STAT_LABELS, ELEMENT_LABELS, ALL_CLASSES, ALL_ELEMENTS,
} from '@/constants/abilities';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0d0d', surface: '#161616', card: '#1e1e1e', border: '#2a2a2a',
  primary: '#e63946', accent: '#f4a261', text: '#f1f1f1', muted: '#888',
  win: '#4caf50', lose: '#e63946', draw: '#f4a261',
  buff: '#4caf50', nerf: '#e63946',
};

// ─── Round progress bar ───────────────────────────────────────────────────────
function RoundBar({ current, total }: { current: number; total: number }) {
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withTiming(total > 0 ? current / total : 0, { duration: 400 });
  }, [current, total]);
  const barStyle = useAnimatedStyle(() => ({ width: `${filled.value * 100}%` as any }));
  return (
    <View style={rb.wrap}>
      <Animated.View style={[rb.fill, barStyle]} />
    </View>
  );
}
const rb = StyleSheet.create({
  wrap: { height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.primary, borderRadius: 2 },
});

// ─── Card Image ───────────────────────────────────────────────────────────────
function CardImg({ card, size = 90 }: { card: any; size?: number }) {
  const src = card?.imageUri ?? card?.imageUrl;
  if (!src) {
    return (
      <View style={[ci.placeholder, { width: size, height: size * 1.2 }]}>
        <Text style={ci.initial}>{(card?.nameAr ?? card?.name ?? '?')[0]}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      style={{ width: size, height: size * 1.2, borderRadius: 8 }}
      contentFit="cover"
    />
  );
}
const ci = StyleSheet.create({
  placeholder: { backgroundColor: '#2a2a2a', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  initial: { color: C.text, fontSize: 28, fontWeight: '800' },
});

// ─── Stat Row ─────────────────────────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={sr.row}>
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value}>{value}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  label: { color: C.muted, fontSize: 10 },
  value: { color: C.text, fontSize: 10, fontWeight: '700' },
});

// ─── Main BattleScreen ────────────────────────────────────────────────────────
export default function BattleScreen() {
  const {
    state,
    playRound,
    nextRound,
    useAbility,
    isGameOver,
    currentPlayerCard,
    currentBotCard,
    lastRoundResult,
    expectedRoundResult,
  } = useGame();

  const router = useRouter();
  const { playSound } = useSFX();

  const [showResult, setShowResult] = useState(false);
  const [roundResult, setRoundResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showPlayerEffect, setShowPlayerEffect] = useState(false);
  const [showBotEffect, setShowBotEffect] = useState(false);

  // animation values
  const playerScale = useSharedValue(1);
  const botScale = useSharedValue(1);
  const resultOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.7);

  // Navigate when game is over
  useEffect(() => {
    if (isGameOver) {
      router.replace('/screens/battle-results');
    }
  }, [isGameOver]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowResult(false);
        setShowExplosion(false);
        setShowPlayerEffect(false);
        setShowBotEffect(false);
      };
    }, [])
  );

  // Animate on card change
  useEffect(() => {
    if (currentPlayerCard) {
      playerScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  }, [currentPlayerCard?.id]);

  useEffect(() => {
    if (currentBotCard) {
      botScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  }, [currentBotCard?.id]);

  // React to lastRoundResult changes
  useEffect(() => {
    if (!lastRoundResult) return;
    const outcome = lastRoundResult.winner === 'player' ? 'win'
      : lastRoundResult.winner === 'bot' ? 'lose' : 'draw';

    setRoundResult(outcome);
    setShowResult(true);
    setShowPlayerEffect(true);
    setShowBotEffect(true);

    if (outcome === 'win') playSound('win');
    else if (outcome === 'lose') playSound('lose');
    else playSound('draw');

    resultOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(900, withTiming(0, { duration: 300 }))
    );
    resultScale.value = withSequence(
      withSpring(1, { damping: 8 }),
      withDelay(900, withTiming(0.7, { duration: 300 }))
    );

    const t = setTimeout(() => {
      setShowResult(false);
      setShowPlayerEffect(false);
      setShowBotEffect(false);
      nextRound();
    }, 1500);
    return () => clearTimeout(t);
  }, [state.roundResults.length]);

  const handleAttack = useCallback(() => {
    if (isGameOver) return;
    playRound();
    setShowExplosion(true);
    setTimeout(() => setShowExplosion(false), 800);

    playerScale.value = withSequence(
      withTiming(1.08, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    botScale.value = withSequence(
      withTiming(1.08, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
  }, [isGameOver, playRound]);

  const playerAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: playerScale.value }] }));
  const botAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: botScale.value }] }));
  const resultAnimStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }],
  }));

  // Expected outcome arrow
  const expectedOutcome = expectedRoundResult
    ? expectedRoundResult.winner === 'player' ? 'win'
      : expectedRoundResult.winner === 'bot' ? 'lose' : 'draw'
    : null;

  if (!currentPlayerCard || !currentBotCard) {
    return (
      <View style={S.centered}>
        <Text style={{ color: C.text }}>تحميل...</Text>
      </View>
    );
  }

  return (
    <View style={S.root}>
      {showExplosion && <ExplosionEffect />}

      {/* HUD */}
      <View style={S.hud}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={S.hudCenter}>
          <Text style={S.roundLabel}>جولة {state.currentRound + 1} / {state.totalRounds}</Text>
          <RoundBar current={state.currentRound} total={state.totalRounds} />
        </View>
        <View style={S.score}>
          <Text style={[S.scoreNum, { color: C.win }]}>{state.playerScore}</Text>
          <Text style={S.scoreSep}>–</Text>
          <Text style={[S.scoreNum, { color: C.lose }]}>{state.botScore}</Text>
        </View>
      </View>

      {/* Arena */}
      <View style={S.arena}>

        {/* PLAYER SIDE */}
        <Animated.View style={[S.side, playerAnimStyle]}>
          <Animated.View entering={SlideInLeft.duration(400)}>
            <CardImg card={currentPlayerCard} size={100} />
          </Animated.View>
          <Text style={S.cardName} numberOfLines={1}>
            {(currentPlayerCard as any).nameAr ?? currentPlayerCard.name}
          </Text>
          <StatRow label="هجوم" value={currentPlayerCard.attack} />
          <StatRow label="دفاع" value={currentPlayerCard.defense} />
          {showPlayerEffect && (
            <ElementEffect
              element={(currentPlayerCard as any).element ?? ''}
              advantage="neutral"
              side="player"
            />
          )}
        </Animated.View>

        {/* CENTER */}
        <View style={S.center}>
          {expectedOutcome && !showResult && (
            <View style={S.expectedWrap}>
              <Ionicons
                name={expectedOutcome === 'win' ? 'arrow-up' : expectedOutcome === 'lose' ? 'arrow-down' : 'remove'}
                size={18}
                color={expectedOutcome === 'win' ? C.win : expectedOutcome === 'lose' ? C.lose : C.draw}
              />
            </View>
          )}

          {showResult && roundResult && (
            <Animated.View style={[S.resultBadge, resultAnimStyle,
              { borderColor: roundResult === 'win' ? C.win : roundResult === 'lose' ? C.lose : C.draw }
            ]}>
              <Text style={[S.resultText, {
                color: roundResult === 'win' ? C.win : roundResult === 'lose' ? C.lose : C.draw,
              }]}>
                {roundResult === 'win' ? '🏆 فوز' : roundResult === 'lose' ? '💀 خسارة' : '🤝 تعادل'}
              </Text>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[S.attackBtn, isGameOver && S.attackBtnDisabled]}
            onPress={handleAttack}
            disabled={isGameOver}
            activeOpacity={0.75}
          >
            <LinearGradient colors={['#e63946', '#c1121f']} style={S.attackGrad}>
              <Ionicons name="flash" size={22} color="#fff" />
              <Text style={S.attackLabel}>هجوم</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* BOT SIDE */}
        <Animated.View style={[S.side, botAnimStyle]}>
          <Animated.View entering={SlideInRight.duration(400)}>
            <CardImg card={currentBotCard} size={100} />
          </Animated.View>
          <Text style={S.cardName} numberOfLines={1}>
            {(currentBotCard as any).nameAr ?? currentBotCard.name}
          </Text>
          <StatRow label="هجوم" value={currentBotCard.attack} />
          <StatRow label="دفاع" value={currentBotCard.defense} />
          {showBotEffect && (
            <ElementEffect
              element={(currentBotCard as any).element ?? ''}
              advantage="neutral"
              side="bot"
            />
          )}
        </Animated.View>
      </View>

      {/* Ability Buttons */}
      {(currentPlayerCard as any).abilities?.length > 0 && (
        <View style={S.abilitiesRow}>
          {((currentPlayerCard as any).abilities as any[]).map((ab: any, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={S.abilityBtn}
              onPress={() => useAbility(ab.type ?? ab.name, {}, true)}
            >
              <Text style={S.abilityBtnText} numberOfLines={1}>
                {ab.nameAr ?? ab.name ?? `قدرة ${idx + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  hud: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  hudCenter: { flex: 1 },
  roundLabel: { color: C.muted, fontSize: 11, marginBottom: 4 },
  score: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  scoreNum: { fontSize: 18, fontWeight: '800' },
  scoreSep: { color: C.muted, fontSize: 14 },
  arena: {
    flex: 1, flexDirection: 'row',
    paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4, gap: 4,
  },
  side: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: C.border,
  },
  cardName: { color: C.text, fontSize: 11, fontWeight: '700', textAlign: 'center', maxWidth: 120 },
  center: { width: 90, alignItems: 'center', justifyContent: 'center', gap: 12 },
  expectedWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  resultBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: C.bg, borderRadius: 10, borderWidth: 2, alignItems: 'center',
  },
  resultText: { fontSize: 13, fontWeight: '800' },
  attackBtn: { borderRadius: 12, overflow: 'hidden', width: 80 },
  attackBtnDisabled: { opacity: 0.4 },
  attackGrad: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  attackLabel: { color: '#fff', fontSize: 13, fontWeight: '800' },
  abilitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10, paddingBottom: 10 },
  abilityBtn: {
    backgroundColor: C.surface, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
  },
  abilityBtnText: { color: C.accent, fontSize: 11, fontWeight: '600' },
});
