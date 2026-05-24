/**
 * BattleScreen — Professional Arena
 *
 * Layout (landscape-only):
 *   [PLAYER SIDE] | [CENTER COMMAND] | [BOT SIDE]
 *
 * Changes:
 *  - Fixed all merge conflicts
 *  - Added ActiveEffectsBar (buffs/nerfs visible under HUD)
 *  - Smoother animations via react-native-reanimated
 *  - Round progress bar replaces old round counter
 *  - Effect chips now show descriptive Arabic labels
 *  - Added ExplosionEffect + ElementEffect visual overlays
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Pressable,
  Modal, FlatList, Platform
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, runOnJS, withSpring, interpolate, Extrapolation,
  FadeIn, FadeOut, SlideInLeft, SlideInRight
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/context/game-context';
import { useSFX } from '@/hooks/use-sfx';
import { CardData } from '@/types/card';
import { ExplosionEffect } from '@/components/game/explosion-effect';
import { ElementEffect } from '@/components/game/element-effect';
import {
  ELEMENT_EMOJI, ElementAdvantage,
  CLASS_LABELS, CLASS_LABELS_SHORT,
  STAT_LABELS, ELEMENT_LABELS, ALL_CLASSES, ALL_ELEMENTS
} from '@/constants/abilities';
import {
  getEffectiveStats,
  applyAbilityEffect,
} from '@/shared/rage-engine';

const advantageLabel = (a: ElementAdvantage) =>
  a === 'strong' ? 'قوي ضد' : a === 'weak' ? 'ضعيف ضد' : 'محايد';

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0d0d',
  surface: '#161616',
  card: '#1e1e1e',
  border: '#2a2a2a',
  primary: '#e63946',
  accent: '#f4a261',
  text: '#f1f1f1',
  muted: '#888',
  win: '#4caf50',
  lose: '#e63946',
  draw: '#f4a261',
  buff: '#4caf50',
  nerf: '#e63946',
};

// ─── Effect label builder ───────────────────────────────────────────────────
function getEffectLabel(effect: any): string {
  const d = effect.data as any;
  switch (effect.kind) {
    case 'statModifier': {
      const stat = STAT_LABELS[d?.stat] ?? d?.stat ?? '؟';
      const amount = d?.amount ?? 0;
      const sign = amount >= 0 ? '+' : '';
      const onlyClass: string | undefined = d?.onlyClass;
      const multiplier: boolean = !!d?.multiplier;
      if (multiplier) return `${stat} ×${amount > 0 ? amount : '½'}`;
      if (onlyClass) return `جميع ${CLASS_LABELS_SHORT[onlyClass] ?? onlyClass} ${sign}${amount}`;
      return `${stat} ${sign}${amount}`;
    }
    case 'protection': return '🛡 حماية';
    case 'fortify': return '🔩 تحصين';
    case 'halvePoints': return '½ تنصيف';
    case 'silenceAbilities': return '🔇 ختم قدرات';
    case 'doubleOrNothing': return '🎲 مضاعفة أو صفر';
    case 'forcedOutcome': return '🎯 نتيجة مضمونة';
    case 'starAdvantage': return '⭐ أفضلية نجوم';
    case 'sacrifice': return '🩸 تضحية';
    case 'greedBuff': return '💰 جشع';
    case 'lifesteal': return '🩸 سرقة صحة';
    case 'revengeBuff': return '😤 انتقام';
    case 'suicidePact': return '💀 اتفاقية انتحار';
    case 'compensationBuff': return '🎁 تعويض';
    case 'weakeningDebuff': return '📉 إضعاف';
    case 'explosionDebuff': return '💥 انفجار';
    case 'consecutiveLoss': return '🔄 خسائر متتالية';
    case 'shieldGuard': return '🛡 درع';
    case 'trap': return '🪤 فخ';
    case 'convertDebuffs': return '🔃 تحويل نيرف→بف';
    case 'doubleBuffs': return '✨ مضاعفة البفات';
    case 'conversion': return '🔄 تحويل بفات الخصم';
    case 'takeIt': return '↩️ إعادة النيرف';
    case 'deprivation': return '🚫 سلب بف';
    case 'pool': return '🌊 تصفير الجولة';
    case 'prediction': return '🔮 توقع';
    case 'turinPenalty': return '⚔️ تخسر نصف الجولات';
    default: return effect.kind ?? '؟';
  }
}

// ─── Round progress bar ──────────────────────────────────────────────────
function RoundBar({ current, total }: { current: number; total: number }) {
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withTiming(current / total, { duration: 400 });
  }, [current, total]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${filled.value * 100}%` as any,
  }));
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

// ─── ElementBadge ─────────────────────────────────────────────────────────
function ElementBadge({ element, advantage }: { element: string; advantage: ElementAdvantage }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [element, advantage]);
  if (!visible || !element || advantage === 'neutral') return null;
  const color = advantage === 'strong' ? C.win : C.lose;
  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={[eb.wrap, { borderColor: color }]}>
      <Text style={[eb.text, { color }]}>
        {ELEMENT_EMOJI[element as keyof typeof ELEMENT_EMOJI]} {advantageLabel(advantage)}
      </Text>
    </Animated.View>
  );
}
const eb = StyleSheet.create({
  wrap: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginTop: 4 },
  text: { fontSize: 9, fontWeight: '700' },
});

// ─── Active Effects Bar ─────────────────────────────────────────────────────
function ActiveEffectsBar({ effects, side }: { effects: any[]; side: 'player' | 'bot' }) {
  const mine = effects.filter(e => e.targetSide === side || e.targetSide === 'all');
  if (mine.length === 0) return null;
  return (
    <View style={eff.row}>
      {mine.map((e, i) => {
        const isBuff = e.isBuff !== false;
        const color = isBuff ? C.buff : C.nerf;
        const label = getEffectLabel(e);
        return (
          <View key={i} style={[eff.chip, { borderColor: color }]}>
            <Text style={[eff.label, { color }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
const eff = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  label: { fontSize: 9.5, letterSpacing: 0.2 },
});

// ─── Choice Modal ─────────────────────────────────────────────────────────
interface ChoiceModal {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  abilityType: string;
}
function ChoiceModalView({ modal, onSelect }: { modal: ChoiceModal; onSelect: (v: string) => void }) {
  if (!modal.visible) return null;
  return (
    <Modal transparent animationType="fade">
      <View style={cm.overlay}>
        <View style={cm.box}>
          <Text style={cm.title}>{modal.title}</Text>
          <FlatList
            data={modal.options}
            keyExtractor={o => o.value}
            renderItem={({ item: opt }) => (
              <Pressable style={cm.option} onPress={() => onSelect(opt.value)}>
                <Text style={cm.optionText}>{opt.label}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: C.surface, borderRadius: 12, padding: 16, width: '80%', maxHeight: '70%' },
  title: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  option: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  optionText: { color: C.text, fontSize: 13 },
});

// ─── Card Image ───────────────────────────────────────────────────────────
function CardImg({ card, size = 90 }: { card: CardData; size?: number }) {
  const src = card.imageUri ?? card.imageUrl;
  if (!src) {
    return (
      <View style={[ci.placeholder, { width: size, height: size * 1.2 }]}>
        <Text style={ci.initial}>{(card.nameAr ?? card.name ?? '?')[0]}</Text>
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

// ─── Stat Row ─────────────────────────────────────────────────────────────
function StatRow({ label, base, effective }: { label: string; base: number; effective: number }) {
  const diff = effective - base;
  const color = diff > 0 ? C.buff : diff < 0 ? C.nerf : C.muted;
  return (
    <View style={sr.row}>
      <Text style={sr.label}>{label}</Text>
      <Text style={[sr.value, { color }]}>
        {effective}{diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff})` : ''}
      </Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  label: { color: C.muted, fontSize: 10 },
  value: { fontSize: 10, fontWeight: '700' },
});

// ─── Main BattleScreen ────────────────────────────────────────────────────
export default function BattleScreen() {
  const { state, dispatch } = useGame();
  const router = useRouter();
  const { playSound } = useSFX();

  const [showResult, setShowResult] = useState(false);
  const [roundResult, setRoundResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [showPlayerEffect, setShowPlayerEffect] = useState(false);
  const [showBotEffect, setShowBotEffect] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [choiceModal, setChoiceModal] = useState<ChoiceModal>({
    visible: false, title: '', options: [], abilityType: ''
  });

  type PendingAbility = {
    cardId: string;
    abilityType: string;
    abilityIndex: number;
    side: 'player' | 'bot';
    options: { value: string; label: string }[];
    title: string;
  };
  const [pendingAbility, setPendingAbility] = useState<PendingAbility | null>(null);

  // animation values
  const playerScale = useSharedValue(1);
  const botScale = useSharedValue(1);
  const resultOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.7);

  useEffect(() => {
    if (state.battleStatus === 'finished') {
      router.replace('/screens/battle-results');
    }
  }, [state.battleStatus]);

  useEffect(() => {
    if (state.battleStatus === 'idle' && state.currentRound === 1) {
      dispatch({ type: 'START_BATTLE' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowResult(false);
        setShowPlayerEffect(false);
        setShowBotEffect(false);
        setShowExplosion(false);
      };
    }, [])
  );

  const displayPlayerCard = state.playerDeck[state.currentRound - 1];
  const displayBotCard = state.botDeck[state.currentRound - 1];

  useEffect(() => {
    if (displayPlayerCard?.id) {
      playerScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  }, [displayPlayerCard?.id]);

  useEffect(() => {
    if (displayBotCard?.id) {
      botScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  }, [displayBotCard?.id]);

  const handleAttack = useCallback(() => {
    if (state.battleStatus !== 'inProgress') return;
    dispatch({ type: 'PLAY_ROUND' });
    setShowExplosion(true);
    setTimeout(() => setShowExplosion(false), 800);

    // animate both cards
    playerScale.value = withSequence(
      withTiming(1.08, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    botScale.value = withSequence(
      withTiming(1.08, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
  }, [state.battleStatus, dispatch]);

  // Show round result overlay
  useEffect(() => {
    const results = state.roundResults;
    if (results.length === 0) return;
    const last = results[results.length - 1];
    if (last.round !== state.currentRound - 1) return;

    const outcome = last.winner === 'player' ? 'win'
      : last.winner === 'bot' ? 'lose' : 'draw';
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
    }, 1500);
    return () => clearTimeout(t);
  }, [state.roundResults.length]);

  // Handle ability choice triggers
  useEffect(() => {
    if (!state.pendingChoice) return;
    const { cardId, abilityType, abilityIndex, side } = state.pendingChoice;
    let title = '🎯 اختر خياراً';
    let options: { value: string; label: string }[] = [];

    if (abilityType === 'propaganda') {
      title = '🎙️ بروباغاندا — اختر فئة الخصم';
      options = ALL_CLASSES.map(c => ({ value: c, label: CLASS_LABELS[c] }));
    } else if (abilityType === 'addElement') {
      title = '🧪 إضافة عنصر — اختر العنصر';
      options = ALL_ELEMENTS.map(e => ({ value: e, label: ELEMENT_LABELS[e] }));
    } else if (abilityType === 'classSwitch') {
      title = '🔀 تبديل الفئة — اختر فئتك';
      options = ALL_CLASSES.map(c => ({ value: c, label: CLASS_LABELS[c] }));
    } else if (abilityType === 'steal') {
      const botPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.botCard.nameAr ?? r.botCard.name}` }));
      title = '🦅 سرقة — اختر كرت البوت';
      options = botPast;
    } else if (abilityType === 'revive') {
      const myPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.playerCard.nameAr ?? r.playerCard.name} (هج ${r.playerCard.attack} / دف ${r.playerCard.defense})` }));
      title = '💖 إحياء — اختر كرتك';
      options = myPast;
    } else if (abilityType === 'revival') {
      const myPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.playerCard.nameAr ?? r.playerCard.name} (هج ${Math.ceil(r.playerCard.attack / 2)} / دف ${Math.ceil(r.playerCard.defense / 2)})` }));
      title = '💖 إنعاش — اختر كرتك (بنصف طاقاته)';
      options = myPast;
    } else if (abilityType === 'stealAndBuff') {
      const botPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.botCard.nameAr ?? r.botCard.name} (هج ${r.botCard.attack} / دف ${r.botCard.defense})` }));
      title = '💎 سرقة وتقوية — اختر كرت البوت';
      options = botPast;
    } else if (abilityType === 'copyStats') {
      const botPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.botCard.nameAr ?? r.botCard.name} (هج ${r.botCard.attack} / دف ${r.botCard.defense})` }));
      title = '📋 نسخ إحصائيات — اختر كرت البوت';
      options = botPast;
    } else if (abilityType === 'buff') {
      const myPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.playerCard.nameAr ?? r.playerCard.name} (+${r.playerCard.attack} هج / +${r.playerCard.defense} دف)` }));
      title = '💪 تقوية كرت — اختر كرتك';
      options = myPast;
    } else if (abilityType === 'skipRound') {
      const totalRounds = state.playerDeck.length;
      const futureRounds = Array.from({ length: totalRounds - state.currentRound }, (_, i) => state.currentRound + i + 1);
      const options2 = futureRounds.map(r => ({ value: String(r), label: `جولة ${r}` }));
      title = '⏭️ تخطي جولة — اختر الجولة';
      options = options2;
    } else if (abilityType === 'roulette') {
      const possibleAttacks = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
        .map(v => ({ value: String(v), label: `هجوم: ${v}` }));
      title = '🎰 روليت — اختر قيمة الهجوم';
      options = possibleAttacks;
    }

    if (options.length > 0) {
      setPendingAbility({ cardId, abilityType, abilityIndex, side, options, title });
      setChoiceModal({ visible: true, title, options, abilityType });
    }
  }, [state.pendingChoice]);

  const handleChoiceSelect = useCallback((value: string) => {
    if (!pendingAbility) return;
    dispatch({
      type: 'RESOLVE_CHOICE',
      payload: {
        cardId: pendingAbility.cardId,
        abilityType: pendingAbility.abilityType,
        abilityIndex: pendingAbility.abilityIndex,
        side: pendingAbility.side,
        chosenValue: value,
      }
    });
    setChoiceModal({ visible: false, title: '', options: [], abilityType: '' });
    setPendingAbility(null);
  }, [pendingAbility, dispatch]);

  const playerAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: playerScale.value }] }));
  const botAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: botScale.value }] }));
  const resultAnimStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }],
  }));

  const playerEffective = displayPlayerCard
    ? getEffectiveStats(displayPlayerCard.attack, displayPlayerCard.defense, state.activeEffects, 'player')
    : null;
  const botEffective = displayBotCard
    ? getEffectiveStats(displayBotCard.attack, displayBotCard.defense, state.activeEffects, 'bot')
    : null;

  const isPlayerStronger = playerEffective && botEffective
    ? playerEffective.attack >= botEffective.attack
    : false;

  // Expected result indicator
  const expectedRoundResult = useMemo(() => {
    if (!displayPlayerCard || !displayBotCard || !playerEffective || !botEffective) return null;
    // Check Turin forced loss
    const hasTurin = state.playerDeck.some(c => c.name === 'Turin' || c.nameAr === 'Turin');
    const halfRounds = Math.floor(state.playerDeck.length / 2);
    if (hasTurin && state.currentRound <= halfRounds) return 'lose';
    if (playerEffective.attack > botEffective.attack) return 'win';
    if (playerEffective.attack < botEffective.attack) return 'lose';
    return 'draw';
  }, [displayPlayerCard, displayBotCard, playerEffective, botEffective, state.currentRound, state.playerDeck]);

  const playerElement = displayPlayerCard?.element;
  const playerAdvantage = state.elementAdvantages?.[playerElement ?? ''] ?? 'neutral';

  if (!displayPlayerCard || !displayBotCard) {
    return (
      <View style={S.centered}>
        <Text style={{ color: C.text }}>تحميل...</Text>
      </View>
    );
  }

  return (
    <View style={S.root}>
      {/* Explosion overlay */}
      {showExplosion && <ExplosionEffect />}

      {/* Choice Modal */}
      <ChoiceModalView modal={choiceModal} onSelect={handleChoiceSelect} />

      {/* ── HUD ────────────────────────────────────────────────────── */}
      <View style={S.hud}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={S.hudCenter}>
          <Text style={S.roundLabel}>جولة {state.currentRound} / {state.playerDeck.length}</Text>
          <RoundBar current={state.currentRound - 1} total={state.playerDeck.length} />
        </View>
        <View style={S.score}>
          <Text style={[S.scoreNum, { color: C.win }]}>{state.playerScore}</Text>
          <Text style={S.scoreSep}>–</Text>
          <Text style={[S.scoreNum, { color: C.lose }]}>{state.botScore}</Text>
        </View>
      </View>

      {/* ── Effects Bar ─────────────────────────────────────────────── */}
      {state.activeEffects.length > 0 && (
        <View style={S.effectsBar}>
          <View style={S.effectsBarSide}>
            <Text style={S.effectsBarLabel}>تأثيراتك</Text>
            <ActiveEffectsBar effects={state.activeEffects} side="player" />
          </View>
          <View style={S.effectsBarDivider} />
          <View style={S.effectsBarSide}>
            <Text style={S.effectsBarLabel}>تأثيرات البوت</Text>
            <ActiveEffectsBar effects={state.activeEffects} side="bot" />
          </View>
        </View>
      )}

      {/* ── Arena ───────────────────────────────────────────────────── */}
      <View style={S.arena}>

        {/* PLAYER SIDE */}
        <Animated.View style={[S.side, playerAnimStyle]}>
          <Animated.View entering={SlideInLeft.duration(400)}>
            <CardImg card={displayPlayerCard} size={100} />
          </Animated.View>
          <Text style={S.cardName} numberOfLines={1}>
            {displayPlayerCard.nameAr ?? displayPlayerCard.name}
          </Text>
          {playerEffective && (
            <>
              <StatRow label="هجوم" base={displayPlayerCard.attack} effective={playerEffective.attack} />
              <StatRow label="دفاع" base={displayPlayerCard.defense} effective={playerEffective.defense} />
            </>
          )}
          {playerElement && (
            <ElementBadge element={playerElement} advantage={playerAdvantage} />
          )}
          {showPlayerEffect && (
            <ElementEffect
              element={playerElement ?? ''}
              advantage={playerAdvantage}
              side="player"
            />
          )}
        </Animated.View>

        {/* CENTER */}
        <View style={S.center}>
          {/* Expected result arrow */}
          {expectedRoundResult && !showResult && (
            <View style={S.expectedWrap}>
              <Ionicons
                name={expectedRoundResult === 'win' ? 'arrow-up' : expectedRoundResult === 'lose' ? 'arrow-down' : 'remove'}
                size={18}
                color={expectedRoundResult === 'win' ? C.win : expectedRoundResult === 'lose' ? C.lose : C.draw}
              />
            </View>
          )}

          {/* Round result overlay */}
          {showResult && roundResult && (
            <Animated.View style={[S.resultBadge, resultAnimStyle,
              { borderColor: roundResult === 'win' ? C.win : roundResult === 'lose' ? C.lose : C.draw }
            ]}>
              <Text style={[S.resultText, {
                color: roundResult === 'win' ? C.win : roundResult === 'lose' ? C.lose : C.draw
              }]}>
                {roundResult === 'win' ? '🏆 فوز' : roundResult === 'lose' ? '💀 خسارة' : '🤝 تعادل'}
              </Text>
            </Animated.View>
          )}

          {/* Attack Button */}
          <TouchableOpacity
            style={[S.attackBtn, state.battleStatus !== 'inProgress' && S.attackBtnDisabled]}
            onPress={handleAttack}
            disabled={state.battleStatus !== 'inProgress'}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={['#e63946', '#c1121f']}
              style={S.attackGrad}
            >
              <Ionicons name="flash" size={22} color="#fff" />
              <Text style={S.attackLabel}>هجوم</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* BOT SIDE */}
        <Animated.View style={[S.side, botAnimStyle]}>
          <Animated.View entering={SlideInRight.duration(400)}>
            <CardImg card={displayBotCard} size={100} />
          </Animated.View>
          <Text style={S.cardName} numberOfLines={1}>
            {displayBotCard.nameAr ?? displayBotCard.name}
          </Text>
          {botEffective && (
            <>
              <StatRow label="هجوم" base={displayBotCard.attack} effective={botEffective.attack} />
              <StatRow label="دفاع" base={displayBotCard.defense} effective={botEffective.defense} />
            </>
          )}
          {showBotEffect && (
            <ElementEffect
              element={displayBotCard.element ?? ''}
              advantage="neutral"
              side="bot"
            />
          )}
        </Animated.View>
      </View>

      {/* ── Ability Buttons ─────────────────────────────────────────── */}
      {displayPlayerCard.abilities && displayPlayerCard.abilities.length > 0 && (
        <View style={S.abilitiesRow}>
          {displayPlayerCard.abilities.map((ab: any, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={S.abilityBtn}
              onPress={() => {
                dispatch({
                  type: 'USE_ABILITY',
                  payload: {
                    cardId: displayPlayerCard.id,
                    abilityIndex: idx,
                    side: 'player',
                  }
                });
              }}
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

// ─── Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  // HUD
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

  // Effects Bar
  effectsBar: {
    flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  effectsBarSide: { flex: 1 },
  effectsBarDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 8 },
  effectsBarLabel: { color: C.muted, fontSize: 9, marginBottom: 4 },

  // Arena
  arena: {
    flex: 1, flexDirection: 'row',
    paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4,
    gap: 4,
  },
  side: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: C.border,
  },
  cardName: {
    color: C.text, fontSize: 11, fontWeight: '700',
    textAlign: 'center', maxWidth: 120,
  },

  // Center
  center: {
    width: 90, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  expectedWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  resultBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: C.bg, borderRadius: 10, borderWidth: 2,
    alignItems: 'center',
  },
  resultText: { fontSize: 13, fontWeight: '800' },

  // Attack button
  attackBtn: { borderRadius: 12, overflow: 'hidden', width: 80 },
  attackBtnDisabled: { opacity: 0.4 },
  attackGrad: {
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  attackLabel: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Abilities
  abilitiesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 10, paddingBottom: 10,
  },
  abilityBtn: {
    backgroundColor: C.surface, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
  },
  abilityBtnText: { color: C.accent, fontSize: 11, fontWeight: '600' },
});
