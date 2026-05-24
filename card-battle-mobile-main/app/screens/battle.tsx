/**
 * BattleScreen — Professional Arena
 *
 * Layout (landscape-only):
 *   [PLAYER SIDE] | [CENTER COMMAND] | [BOT SIDE]
 *
 * Changes:
 *  - Fixed all merge conflicts
 *  - Added ActiveEffectsBar (buffs/nerfs visible under HUD)
 *  - Added choice modals for: Propaganda, AddElement, SwapClass, Dilemma
 *  - Added choice modals for: Recall, Revive, Arise, Disaster, Merge
 *  - Added choice modals for: Sniping, Subhan
 *  - Direct execution for: CancelAbility, Trap, DoubleOrNothing, Sacrifice, Pool, Skip
 *  - Effect chips now show descriptive Arabic labels
 *  - Bot AI wired: decideBotAbility + buildBotAbilityData + updateBotMemory
 *  - ✅ Fix #3: pass botAbilities to updateBotMemory
 *  - ✅ Step 1: import useSettings + BATTLE_TIMINGS
 *  - ✅ Step 2: wrap all Haptics calls with settings.vibration guard
 *  - ✅ Step 3: guard spawnDmg with settings.showDamageNumbers
 *  - ✅ Step 4: replace hardcoded delays with BATTLE_TIMINGS
 *  - ✅ Removed edit mode / 🎨 أدوات التحرير
 *  - ✅ Fix: startBattle loop guard (prevent infinite loading freeze)
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Platform,
  Modal, ScrollView,
  useWindowDimensions, Alert,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, withSequence,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { StatusBar } from 'expo-status-bar';
import { ElementEffect } from '@/components/game/element-effect';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { DamageNumber, DamageNumberVariant } from '@/components/game/damage-number';
import { BattleResultOverlay } from '@/components/game/BattleResultOverlay';
import { useLandscapeLayout, LAYOUT_PADDING, CARD_WIDTH_FACTOR } from '@/utils/layout';
import { useGame } from '@/lib/game/game-context';
import { ELEMENT_EMOJI, ElementAdvantage, Element, CardClass } from '@/lib/game/types';
import { getAbilityNameAr, getAbilityDescription } from '@/lib/game/ability-names';
import { AbilityCard } from '@/components/game/ability-card';
import PredictionModal from '@/components/modals/PredictionModal';
import PopularityModal from '@/components/modals/PopularityModal';
import {
  buildPredictionSummary, getRemainingRounds,
  getUpcomingPredictionRounds, isPredictionComplete,
  getEffectiveStats,
} from '@/lib/game/ui-helpers';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL, SHADOW } from '@/components/ui/design-tokens';
import {
  decideBotAbility, updateBotMemory, resetBotMemory,
} from '@/lib/game/bot-ai';
import { getCardsWithEdits } from '@/lib/game/useCards';
import type { DifficultyLevel } from '@/app/screens/difficulty';
// ✅ Step 1: settings hook + timings
import { useSettings, BATTLE_TIMINGS } from '@/lib/game/hooks/useSettings';
// 🔥 Rage Mode
import { shouldTriggerRage, applyRageToCard, buildRageTriggerEvent, buildRageState } from '@/lib/game/rage-engine';
import { RageModeOverlay } from '@/components/game/rage-mode-overlay';

type BattlePhase = 'selection' | 'action' | 'combat' | 'result' | 'waiting';

// ─── Helpers ───────────────────────────────────────────────────────────────
const advantageColor = (a: ElementAdvantage) =>
  a === 'strong' ? '#4ade80' : a === 'weak' ? '#f87171' : '#a0a0a0';
const advantageLabel = (a: ElementAdvantage) =>
  a === 'strong' ? '⬆️ قوي' : a === 'weak' ? '⬇️ ضعيف' : '';

const ALL_ELEMENTS: Element[] = ['fire', 'water', 'earth', 'lightning', 'wind'];
const ELEMENT_LABELS: Record<Element, string> = {
  fire: '🔥 نار', water: '💧 ماء',
  earth: '🌍 أرض', lightning: '⚡ برق', wind: '💨 ريح',
};
const ALL_CLASSES: CardClass[] = ['warrior', 'knight', 'mage', 'archer', 'berserker', 'paladin'];
const CLASS_LABELS: Record<CardClass, string> = {
  warrior: '⚔️ محارب', knight: '🛡️ فارس', mage: '🔮 ساحر',
  archer: '🏹 رامي', berserker: '🗡️ بيرسركر', paladin: '💪 بالادين',
};
const CLASS_LABELS_SHORT: Record<string, string> = {
  warrior: 'المحاربين', knight: 'الفرسان', mage: 'السحرة',
  archer: 'الرماة', berserker: 'البيرسركر', paladin: 'البالادين',
};
const STAT_LABELS: Record<string, string> = {
  attack: 'هجوم', defense: 'دفاع', all: 'الكل', hp: 'صحة',
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
    case 'turinPenalty': return '⚠️ تخسر نصف الجولات';
    case 'prediction': return '🔮 توقع';
    default: return effect.kind ?? '؟';
  }
}

// ─── Round progress bar ──────────────────────────────────────────────────
function RoundBar({ current, total }: { current: number; total: number }) {
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withTiming((current / total) * 100, { duration: 400 });
  }, [current]);
  const barStyle = useAnimatedStyle(() => ({ width: `${filled.value}%` as any }));
  return (
    <View style={rb.track}>
      <Animated.View style={[rb.fill, barStyle]} />
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            rb.tick,
            { left: `${((i + 1) / total) * 100}%` as any },
            i < current && rb.tickDone,
          ]}
        />
      ))}
    </View>
  );
}
const rb = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'visible', position: 'relative' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: COLOR.gold, borderRadius: 3 },
  tick: { position: 'absolute', top: -2, width: 2, height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1, marginLeft: -1 },
  tickDone: { backgroundColor: 'rgba(228,165,42,0.6)' },
});

// ─── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score, maxScore, color, reverse = false }: { score: number; maxScore: number; color: string; reverse?: boolean }) {
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withSpring(maxScore > 0 ? (score / maxScore) * 100 : 0, { damping: 14 });
  }, [score]);
  const barStyle = useAnimatedStyle(() => ({ width: `${filled.value}%` as any }));
  return (
    <View style={[sb.track, reverse && { flexDirection: 'row-reverse' }]}>
      <Animated.View style={[sb.fill, { backgroundColor: color }, reverse && sb.fillRight, barStyle]} />
    </View>
  );
}
const sb = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, position: 'absolute', left: 0 },
  fillRight: { left: undefined, right: 0 },
});

// ─── Advantage chip ─────────────────────────────────────────────────────────
function AdvantageChip({ advantage, element }: { advantage: ElementAdvantage; element: string }) {
  if (advantage === 'neutral') return null;
  const c = advantageColor(advantage);
  return (
    <View style={[ac.chip, { borderColor: c + '55', backgroundColor: c + '14' }]}>
      <Text style={[ac.text, { color: c }]}>
        {ELEMENT_EMOJI[element as keyof typeof ELEMENT_EMOJI]} {advantageLabel(advantage)}
      </Text>
    </View>
  );
}
const ac = StyleSheet.create({
  chip: { paddingHorizontal: SPACE.md, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1, alignSelf: 'center', marginTop: SPACE.sm },
  text: { fontSize: FONT.xs - 2, letterSpacing: 0.4 },
});

// ─── Active Effects Bar ─────────────────────────────────────────────────────
function ActiveEffectsBar({ effects, side }: { effects: any[]; side: 'player' | 'bot' }) {
  const mine = effects.filter(e => e.targetSide === side || e.targetSide === 'all');
  if (!mine.length) return null;
  const BUFF_KINDS = new Set(['greedBuff', 'lifesteal', 'revengeBuff', 'compensationBuff', 'consecutiveLoss', 'shieldGuard', 'doubleBuffs', 'protection', 'fortify', 'starAdvantage']);
  return (
    <View style={eff.row}>
      {mine.map((e, i) => {
        let isBuff = BUFF_KINDS.has(e.kind);
        let isDebuff = false;
        if (e.kind === 'statModifier') {
          const amount = (e.data as any)?.amount ?? 0;
          if (amount > 0) isBuff = true;
          else if (amount < 0) isDebuff = true;
        } else if (['weakeningDebuff', 'explosionDebuff', 'silenceAbilities', 'suicidePact', 'halvePoints'].includes(e.kind)) {
          isDebuff = true;
        }
        const color = isBuff ? '#4ade80' : isDebuff ? '#f87171' : '#fbbf24';
        const roundsLeft = e.expiresAtRound !== undefined ? Math.max(0, e.expiresAtRound - (e.createdAtRound ?? 0)) : null;
        const label = getEffectLabel(e);
        return (
          <View key={i} style={[eff.chip, { borderColor: color + '66', backgroundColor: color + '18' }]}>
            <Text style={[eff.label, { color }]}>{label}</Text>
            {roundsLeft !== null && roundsLeft > 0 && (
              <View style={[eff.badge, { backgroundColor: color + '33' }]}>
                <Text style={[eff.badgeText, { color }]}>{roundsLeft}ج</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
const eff = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  label: { fontSize: 9.5, letterSpacing: 0.2 },
  badge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5, minWidth: 16, alignItems: 'center' },
  badgeText: { fontSize: 8, fontVariant: ['tabular-nums'] } as any,
});

// ─── Choice Modal (generic list picker) ───────────────────────────────────
function ChoiceModal({
  visible, title, options, onSelect, onCancel,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={cm.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={cm.box}>
          <Text style={cm.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8, padding: 4 }}>
            {options.map(opt => (
              <TouchableOpacity key={opt.value} style={cm.option} onPress={() => onSelect(opt.value)} activeOpacity={0.8}>
                <Text style={cm.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={cm.cancel} onPress={onCancel}>
            <Text style={cm.cancelText}>إلغاء</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  box: { width: 300, backgroundColor: 'rgba(12,18,36,0.98)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(228,165,42,0.3)', padding: SPACE.xl },
  title: { color: COLOR.gold, fontSize: FONT.base, textAlign: 'center', marginBottom: SPACE.lg },
  option: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, padding: SPACE.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  optionText: { color: '#f1f5f9', fontSize: FONT.sm, textAlign: 'center' },
  cancel: { marginTop: SPACE.lg, alignItems: 'center', padding: SPACE.sm },
  cancelText: { color: '#f87171', fontSize: FONT.sm },
});

// ────────────────────────── MAIN SCREEN ──────────────────────────
export default function BattleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape, size } = useLandscapeLayout();

  // ✅ Step 1: تهيئة الـ hook — جاهز للربط في الخطوات القادمة
  const { settings } = useSettings();

  // ✅ Step 2: helper يحترم إعداد الاهتزاز
  const hapticImpact = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== 'web' && settings.vibration) Haptics.impactAsync(style);
  }, [settings.vibration]);

  const hapticNotification = useCallback((type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS !== 'web' && settings.vibration) Haptics.notificationAsync(type);
  }, [settings.vibration]);

  const isPortrait = height > width;
  // Dynamic scaling instead of fixed maxes
  const cardWidth = isPortrait ? (width * 0.44) : Math.min(width * CARD_WIDTH_FACTOR[size] * 0.88, (height * 0.54) / 1.5);
  const cardHeight = cardWidth * (320 / 220);

  const {
    state, playRound, isGameOver, currentPlayerCard, currentBotCard,
    lastRoundResult, expectedRoundResult, useAbility,
    resetGame, nextRound, startBattle, setPlayerDeck, syncDecks,
  } = useGame();

  const [phase, setPhase] = useState<BattlePhase>('selection');
  const [showResult, setShowResult] = useState(false);
  const [showPlayerEffect, setShowPlayerEffect] = useState(false);
  const [showBotEffect, setShowBotEffect] = useState(false);
  const [roundHistory, setRoundHistory] = useState<any[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAbilitiesModalOpen, setIsAbilitiesModalOpen] = useState(false);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [predictionSelections, setPredictionSelections] = useState<Record<number, 'win' | 'loss'>>({});
  const [predictionAbilityType, setPredictionAbilityType] = useState<'LogicalEncounter' | 'Eclipse' | 'Trap' | 'Pool'>('LogicalEncounter');
  const [popularityAbilityType, setPopularityAbilityType] = useState<'Popularity' | 'Rescue' | 'Penetration'>('Popularity');
  const [showPopularityModal, setShowPopularityModal] = useState(false);
  const [selectedPopularityRound, setSelectedPopularityRound] = useState<number | null>(null);
  const [activeDamageNumbers, setActiveDamageNumbers] = useState<{ id: string; side: 'player' | 'bot'; value: number; variant: DamageNumberVariant }[]>([]);
  // 🔥 Rage Mode
  const [rageEvent, setRageEvent] = useState<ReturnType<typeof buildRageTriggerEvent> | null>(null);
  const [rageScoreBonus, setRageScoreBonus] = useState(0);
  const rageState = useRef(buildRageState());

  // ── Choice modal state ──
  const [choiceModal, setChoiceModal] = useState<{
    visible: boolean;
    title: string;
    options: { value: string; label: string }[];
    abilityType: string;
    extraData?: any;
  }>({ visible: false, title: '', options: [], abilityType: '' });

  // ── Transition Lock & Timers ──
  const isTransitioning = useRef(false);
  const nextRoundTimeout = useRef<NodeJS.Timeout | null>(null);

  // ✅ FIX: guard against startBattle being called more than once
  const battleStarted = useRef(false);

  // تهيئة الصوت ليعمل حتى لو كان الهاتف صامتاً (iOS)
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    return () => {
      if (nextRoundTimeout.current) clearTimeout(nextRoundTimeout.current);
    };
  }, []);

  // animations
  const playerAnim = useSharedValue(0);
  const botAnim = useSharedValue(0);
  const vsOpacity = useSharedValue(0);
  const resultOp = useSharedValue(0);
  const flashAnim = useSharedValue(0);

  const playerStyle = useAnimatedStyle(() => ({ transform: [{ scale: playerAnim.value }] }));
  const botStyle = useAnimatedStyle(() => ({ transform: [{ scale: botAnim.value }] }));
  const vsStyle = useAnimatedStyle(() => ({ opacity: vsOpacity.value }));
  const resultStyle = useAnimatedStyle(() => ({ opacity: resultOp.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashAnim.value }));

  // إعادة تعيين ذاكرة البوت عند بداية كل لعبة جديدة
  useEffect(() => {
    resetBotMemory();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // مزامنة التعديلات المحفوظة (من شاشة المجموعة) مع الكروت الحالية في المعركة
      getCardsWithEdits().then(mergedCards => {
        let pChanged = false;
        let bChanged = false;

        const newPlayerDeck = state.playerDeck.map(pc => {
          if (pc.isRagedVersion || (pc as any)._rageActive) return pc;
          const updated = mergedCards.find(mc => mc.id === pc.id);
          if (updated && (updated.attack !== pc.attack || updated.defense !== pc.defense || JSON.stringify(updated.rageMode) !== JSON.stringify(pc.rageMode) || updated.isRagedVersion !== pc.isRagedVersion || updated.videoUrl !== pc.videoUrl)) {
            pChanged = true;
            return { ...pc, ...updated };
          }
          return pc;
        });

        const newBotDeck = state.botDeck.map(bc => {
          if (bc.isRagedVersion || (bc as any)._rageActive) return bc;
          const updated = mergedCards.find(mc => mc.id === bc.id);
          if (updated && (updated.attack !== bc.attack || updated.defense !== bc.defense || JSON.stringify(updated.rageMode) !== JSON.stringify(bc.rageMode) || updated.isRagedVersion !== bc.isRagedVersion || updated.videoUrl !== bc.videoUrl)) {
            bChanged = true;
            return { ...bc, ...updated };
          }
          return bc;
        });

        if (pChanged || bChanged) {
          syncDecks(newPlayerDeck, newBotDeck);
        }
      });
    }, [state.playerDeck, state.botDeck, syncDecks])
  );

  // ✅ FIX: استدعاء startBattle مرة واحدة فقط عند الدخول للشاشة
  // السبب: الكود القديم كان يعيد استدعاء startBattle كلما كانت currentPlayerCard = null
  // مما يسبب حلقة لانهائية (startBattle → reset state → null → startBattle ...)
  useEffect(() => {
    if (!battleStarted.current && state.totalRounds > 0 && state.playerDeck.length > 0 && !currentPlayerCard && !currentBotCard) {
      battleStarted.current = true;
      startBattle(state.playerDeck);
    }
  }, []);

  useEffect(() => {
    if (currentPlayerCard && currentBotCard && phase === 'selection') {
      playerAnim.value = 0; botAnim.value = 0; vsOpacity.value = 0; resultOp.value = 0;
      setShowResult(false); setShowPlayerEffect(false); setShowBotEffect(false);
      playerAnim.value = withDelay(80, withTiming(1, { duration: 280 }));
      botAnim.value = withDelay(240, withTiming(1, { duration: 280 }));
      vsOpacity.value = withDelay(440, withTiming(1, { duration: 200 }));
      // ✅ Step 4: استخدام BATTLE_TIMINGS بدل الرقم الثابت 720
      setTimeout(() => setPhase('action'), BATTLE_TIMINGS.cardEntrance);
    }
  }, [currentPlayerCard, currentBotCard, phase, state.currentRound]);

  // ── Bot AI: يقرر ويستخدم قدرته قبل الهجوم ──────────────────────────────
  const runBotAbility = useCallback(() => {
    if (!currentPlayerCard) return;
    const difficulty = (state.difficulty ?? 3) as DifficultyLevel;
    if (difficulty <= 2) return;

    const decision = decideBotAbility(
      state.botAbilities,
      currentPlayerCard,
      state,
      difficulty,
    );

    if (decision.useAbility && decision.abilityType) {
      useAbility(decision.abilityType, decision.abilityData ?? {}, false);
    }
  }, [currentPlayerCard, state, useAbility]);

  // 🔥 Rage Mode: تحديث الكرت الحالي في الملعب قبل الهجوم
  const handleRageActivate = useCallback((rageCard: any) => {
    const newDeck = [...state.playerDeck];
    newDeck[state.currentRound] = rageCard;
    setPlayerDeck(newDeck);
    setRageEvent(null);
  }, [state.playerDeck, state.currentRound, setPlayerDeck]);

  const handleExecuteAttack = useCallback(() => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    try {
      hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
      flashAnim.value = withSequence(withTiming(0.35, { duration: 60 }), withTiming(0, { duration: 300 }));
      setPhase('combat');
      setShowPlayerEffect(true);
      setShowBotEffect(true);

      runBotAbility();

      playRound();
      setPredictionSelections({});
      setShowPredictionModal(false);
    } catch (error) {
      console.error('Error during attack execution:', error);
      isTransitioning.current = false;
    } finally {
      if (nextRoundTimeout.current) clearTimeout(nextRoundTimeout.current);
      nextRoundTimeout.current = setTimeout(() => {
        setShowPlayerEffect(false);
        setShowBotEffect(false);
        setPhase('result');
        isTransitioning.current = false;
      }, BATTLE_TIMINGS.combatDuration) as unknown as NodeJS.Timeout;
    }
  }, [playRound, runBotAbility, hapticImpact]);

  const handleNextRound = useCallback(() => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    if (isGameOver) {
      router.push('/screens/battle-results' as any);
    } else {
      setPhase('selection');
      nextRound();
    }
  }, [isGameOver, router, nextRound, hapticImpact]);

  const handleConfirmPrediction = useCallback(() => {
    useAbility(predictionAbilityType, { predictions: predictionSelections });
    setShowPredictionModal(false); setPredictionSelections({});
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  }, [predictionAbilityType, predictionSelections, useAbility, hapticImpact]);

  const handleConfirmPopularity = useCallback(() => {
    if (selectedPopularityRound === null) return;
    useAbility(popularityAbilityType, { round: selectedPopularityRound });
    setShowPopularityModal(false); setSelectedPopularityRound(null);
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  }, [popularityAbilityType, selectedPopularityRound, useAbility, hapticImpact]);

  // ── Choice modal handlers ────────────────────────────────────────────────
  const openChoiceModal = useCallback((abilityType: string) => {

    if (abilityType === 'Propaganda') {
      setChoiceModal({ visible: true, title: '🎙️ بروباغاندا — اختر فئة الخصم', options: ALL_CLASSES.map(c => ({ value: c, label: CLASS_LABELS[c] })), abilityType });

    } else if (abilityType === 'AddElement') {
      setChoiceModal({ visible: true, title: '🧪 إضافة عنصر — اختر العنصر', options: ALL_ELEMENTS.map(e => ({ value: e, label: ELEMENT_LABELS[e] })), abilityType });

    } else if (abilityType === 'SwapClass') {
      setChoiceModal({ visible: true, title: '🔀 تبديل الفئة — اختر فئتك', options: ALL_CLASSES.map(c => ({ value: c, label: CLASS_LABELS[c] })), abilityType });

    } else if (abilityType === 'Dilemma') {
      const botPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.botCard.nameAr ?? r.botCard.name}` }));
      if (!botPast.length) { Alert.alert('لا يوجد كروت سابقة للخصم بعد'); return; }
      setChoiceModal({ visible: true, title: '🌀 الوهقة — اختر كرت الخصم السابق', options: botPast, abilityType });

    } else if (abilityType === 'Recall') {
      const myPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.playerCard.nameAr ?? r.playerCard.name} (هج ${r.playerCard.attack} / دف ${r.playerCard.defense})` }));
      if (!myPast.length) { Alert.alert('لا يوجد كروت سابقة لك بعد'); return; }
      setChoiceModal({ visible: true, title: '🔄 استدعاء — اختر كرتك السابق', options: myPast, abilityType });

    } else if (abilityType === 'Revive') {
      const myPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.playerCard.nameAr ?? r.playerCard.name} (هج ${Math.ceil(r.playerCard.attack / 2)} / دف ${Math.ceil(r.playerCard.defense / 2)})` }));
      if (!myPast.length) { Alert.alert('لا يوجد كروت سابقة لك بعد'); return; }
      setChoiceModal({ visible: true, title: '💖 إنعاش — اختر كرتك (بنصف طاقاته)', options: myPast, abilityType });

    } else if (abilityType === 'Arise') {
      const botPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.botCard.nameAr ?? r.botCard.name} (هج ${r.botCard.attack} / دف ${r.botCard.defense})` }));
      if (!botPast.length) { Alert.alert('لا يوجد كروت سابقة للخصم بعد'); return; }
      setChoiceModal({ visible: true, title: '👻 أرايز — اختر كرت الخصم السابق يصير كرتك', options: botPast, abilityType });

    } else if (abilityType === 'Disaster') {
      const botPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.botCard.nameAr ?? r.botCard.name} (هج ${r.botCard.attack} / دف ${r.botCard.defense})` }));
      if (!botPast.length) { Alert.alert('لا يوجد كروت سابقة للخصم بعد'); return; }
      setChoiceModal({ visible: true, title: '💣 النكبة — اختر كرت سابق للخصم', options: botPast, abilityType });

    } else if (abilityType === 'Merge') {
      const myPast = state.roundResults.map((r, i) => ({ value: String(i), label: `جولة ${r.round}: ${r.playerCard.nameAr ?? r.playerCard.name} (+${r.playerCard.attack} هج / +${r.playerCard.defense} دف)` }));
      if (!myPast.length) { Alert.alert('لا يوجد كروت سابقة لك بعد'); return; }
      setChoiceModal({ visible: true, title: '🔗 الدمج — اختر الكرت السابق تضيف طاقاته لكرتك', options: myPast, abilityType });

    } else if (abilityType === 'Sniping') {
      const futureRounds = Array.from(
        { length: state.totalRounds - state.currentRound - 1 },
        (_, i) => state.currentRound + i + 2
      );
      if (!futureRounds.length) { Alert.alert('لا توجد جولات قادمة للقنص'); return; }
      const options = futureRounds.map(r => ({ value: String(r), label: `جولة ${r}` }));
      setChoiceModal({ visible: true, title: '🎯 القناص — اختر الجولة التي ستفوز فيها', options, abilityType });

    } else if (abilityType === 'Subhan') {
      const currentBotAttack = state.botDeck[state.currentRound]?.attack ?? 0;
      const guessOptions = Array.from({ length: 15 }, (_, i) => currentBotAttack - 7 + i)
        .filter(v => v > 0)
        .map(v => ({ value: String(v), label: `هجوم: ${v}` }));
      setChoiceModal({ visible: true, title: '🔮 سبحان — خمّن هجوم كرت الخصم (±3)', options: guessOptions, abilityType });
    }
  }, [state.roundResults, state.currentRound, state.totalRounds, state.botDeck]);

  const handleChoiceSelect = useCallback((value: string) => {
    const { abilityType } = choiceModal;
    setChoiceModal(p => ({ ...p, visible: false }));

    const roundIndexAbilities = ['Dilemma', 'Disaster', 'Recall', 'Revive', 'Arise', 'Merge'];
    if (roundIndexAbilities.includes(abilityType)) {
      useAbility(abilityType as any, { roundIndex: Number(value) });
    } else if (abilityType === 'SwapClass') {
      useAbility(abilityType as any, { myClass: value, oppClass: value });
    } else if (abilityType === 'Sniping') {
      useAbility(abilityType as any, { round: Number(value) });
    } else if (abilityType === 'Subhan') {
      useAbility(abilityType as any, { guessedAttack: Number(value) });
    } else {
      useAbility(abilityType as any, { selection: value, targetClass: value, element: value });
    }

    setIsAbilitiesModalOpen(false);
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  }, [choiceModal, useAbility, hapticImpact]);

  // ── تحديث ذاكرة البوت بعد كل جولة ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'result' || !lastRoundResult) return;

    if (isTransitioning.current) return;
    isTransitioning.current = true;

    try {
      updateBotMemory(lastRoundResult, undefined, state.botAbilities);

      setRoundHistory(prev => {
        if (prev.some(h => h.round === lastRoundResult.round)) return prev;
        return [...prev, { round: lastRoundResult.round, playerCard: lastRoundResult.playerCard, botCard: lastRoundResult.botCard, winner: lastRoundResult.winner }];
      });

      // ✅ Step 3: إظهار أرقام الضرر فقط إذا كان الإعداد مفعّلاً
      if (settings.showDamageNumbers) {
        if (lastRoundResult.botDamage > 0) spawnDmg('bot', lastRoundResult.botDamage, lastRoundResult.playerElementAdvantage === 'strong' ? 'critical' : 'damage');
        if (lastRoundResult.playerDamage > 0) spawnDmg('player', lastRoundResult.playerDamage, lastRoundResult.botElementAdvantage === 'strong' ? 'critical' : 'damage');
      }
    } catch (error) {
      console.error('Error processing round result:', error);
      isTransitioning.current = false;
    } finally {
      if (isGameOver) {
        setShowResult(true); resultOp.value = withTiming(1, { duration: 300 });
        if (lastRoundResult.winner === 'player') hapticNotification(Haptics.NotificationFeedbackType.Success);
        else if (lastRoundResult.winner === 'bot') hapticNotification(Haptics.NotificationFeedbackType.Error);
        else hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
        setPhase('waiting');
        isTransitioning.current = false;
      } else {
        hapticImpact(Haptics.ImpactFeedbackStyle.Light);
        if (nextRoundTimeout.current) clearTimeout(nextRoundTimeout.current);
        nextRoundTimeout.current = setTimeout(() => {
          setPhase('selection');
          nextRound();
          isTransitioning.current = false;
        }, BATTLE_TIMINGS.autoNextRound) as unknown as NodeJS.Timeout;
      }
    }
  }, [phase, lastRoundResult, isGameOver, settings.showDamageNumbers]);

  const spawnDmg = useCallback((side: 'player' | 'bot', value: number, variant: DamageNumberVariant) => {
    const id = `${Date.now()}-${Math.random()}`;
    setActiveDamageNumbers(p => [...p, { id, side, value, variant }]);
  }, []);
  const removeDmg = useCallback((id: string) => setActiveDamageNumbers(p => p.filter(n => n.id !== id)), []);

  const roundNumber = state.currentRound + 1;
  const upcomingRounds = useMemo(() => getUpcomingPredictionRounds(roundNumber, state.totalRounds), [roundNumber, state.totalRounds]);
  const remainingRounds = useMemo(() => getRemainingRounds(roundNumber, state.totalRounds), [roundNumber, state.totalRounds]);
  const predictionComplete = useMemo(() => isPredictionComplete(upcomingRounds, predictionSelections), [upcomingRounds, predictionSelections]);

  const fallbackPlayerCard = currentPlayerCard || lastRoundResult?.playerCard;
  const fallbackBotCard = currentBotCard || lastRoundResult?.botCard;

  const displayPlayerCard = showResult && lastRoundResult ? lastRoundResult.playerCard : fallbackPlayerCard;
  const displayBotCard = showResult && lastRoundResult ? lastRoundResult.botCard : fallbackBotCard;

  const playerEffective = displayPlayerCard
    ? getEffectiveStats(displayPlayerCard.attack, displayPlayerCard.defense, state.activeEffects, 'player')
    : { attack: 0, defense: 0 };

  const botEffective = displayBotCard
    ? getEffectiveStats(displayBotCard.attack, displayBotCard.defense, state.activeEffects, 'bot')
    : { attack: 0, defense: 0 };

  const isPlayerStronger = playerEffective.attack >= botEffective.attack;
  const playerWonThisRound = !!lastRoundResult && lastRoundResult.winner === 'player';
  const maxScore = state.totalRounds;

  const isExpectedLoss = expectedRoundResult?.winner === 'bot';
  const canRageNow = isExpectedLoss && !!currentPlayerCard && shouldTriggerRage(currentPlayerCard, rageState.current);

  const CHOICE_ABILITIES = ['Propaganda', 'AddElement', 'SwapClass', 'Dilemma', 'Recall', 'Revive', 'Arise', 'Disaster', 'Merge', 'Sniping', 'Subhan'];
  const DIRECT_ABILITIES = ['CancelAbility', 'Trap', 'DoubleOrNothing', 'Sacrifice', 'Pool', 'Skip'];

  if (!displayPlayerCard || !displayBotCard) {
    return (<View style={S.root}><View style={S.loadWrap}><Text style={S.loadText}>جاري تحميل الساحة...</Text></View></View>);
  }

  return (
    <View style={S.root}>
      <StatusBar hidden />
      <View style={S.bgWrap}><LuxuryBackground /></View>
      <Animated.View style={[S.flashOverlay, flashStyle]} pointerEvents="none" />

      <SafeAreaView style={S.normalRoot}>
        <BattleResultOverlay
          visible={showResult && phase === 'waiting'}
          winner={state.playerScore > state.botScore ? 'player' : state.botScore > state.playerScore ? 'bot' : 'draw'}
          playerScore={state.playerScore} botScore={state.botScore}
          onPlayAgain={() => { resetGame(); router.replace('/screens/rounds-config' as any); }}
          onHome={() => router.replace('/screens/splash' as any)}
        />

        {/* 🔥 Rage Mode Overlay */}
        <RageModeOverlay
          event={rageEvent}
          onDismiss={() => setRageEvent(null)}
          onConfirm={(rageCard: any) => handleRageActivate(rageCard)}
        />

        <View style={[S.screen, { paddingLeft: Math.max(insets.left, 8), paddingRight: Math.max(insets.right, 8) }]}>

          {/* ══ TOP HUD ══ */}
          <View style={S.topHud}>
            <View style={S.hudSide}>
              <View style={[S.avatar, { borderColor: '#4ade80' }]}><Text style={{ fontSize: 18 }}>👤</Text></View>
              <View style={S.hudInfo}>
                <Text style={[S.hudName, { color: '#4ade80' }]}>لاعب</Text>
                <ScoreBar score={state.playerScore} maxScore={maxScore} color="#4ade80" />
              </View>
              <Text style={[S.hudScore, { color: '#4ade80' }]}>{state.playerScore}</Text>
            </View>
            <View style={S.hudCenter}>
              <Text style={S.hudRound}>جولة {state.currentRound + 1} / {state.totalRounds}</Text>
              <RoundBar current={state.currentRound} total={state.totalRounds} />
              <TouchableOpacity style={S.historyBtn} onPress={() => setIsHistoryModalOpen(true)} activeOpacity={0.75}>
                <Text style={S.historyBtnText}>سجل ↗️</Text>
              </TouchableOpacity>
            </View>
            <View style={[S.hudSide, S.hudSideRight]}>
              <Text style={[S.hudScore, { color: '#f87171' }]}>{state.botScore}</Text>
              <View style={S.hudInfo}>
                <Text style={[S.hudName, { color: '#f87171', textAlign: 'right' }]}>بوت</Text>
                <ScoreBar score={state.botScore} maxScore={maxScore} color="#f87171" reverse />
              </View>
              <View style={[S.avatar, { borderColor: '#f87171' }]}><Text style={{ fontSize: 18 }}>🤖</Text></View>
            </View>
          </View>

          {/* ══ ACTIVE EFFECTS BAR ══ */}
          {state.activeEffects.length > 0 && (
            <View style={S.effectsBar}>
              <View style={S.effectsBarSide}>
                <Text style={S.effectsBarLabel}>تأثيراتك</Text>
                <ActiveEffectsBar effects={state.activeEffects} side="player" />
              </View>
              <View style={S.effectsBarDivider} />
              <View style={[S.effectsBarSide, { alignItems: 'flex-end' }]}>
                <Text style={[S.effectsBarLabel, { textAlign: 'right' }]}>تأثيرات البوت</Text>
                <ActiveEffectsBar effects={state.activeEffects} side="bot" />
              </View>
            </View>
          )}

          {/* ══ ARENA ══ */}
          <View style={[S.arena, { flexDirection: isPortrait ? 'column-reverse' : 'row' }]}>

            {/* PLAYER PANEL */}
            <View style={S.playerPanel}>
              <Text style={S.panelLabel}>لاعب</Text>
              <Animated.View style={playerStyle}>
                <LuxuryCharacterCardAnimated
                  card={displayPlayerCard}
                  style={{ width: cardWidth, height: cardHeight }}
                  effectiveAttack={playerEffective.attack}
                  effectiveDefense={playerEffective.defense}
                  isOpenedView={playerWonThisRound}
                  playAudio={isPlayerStronger}
                />
                {showPlayerEffect && <ElementEffect element={displayPlayerCard.element} isActive />}
              </Animated.View>
              {activeDamageNumbers.filter(n => n.side === 'player').map(n => (
                <DamageNumber key={n.id} value={n.value} variant={n.variant} x={40} y={-20} onComplete={() => removeDmg(n.id)} />
              ))}
              {showResult && lastRoundResult && (
                <AdvantageChip advantage={lastRoundResult.playerElementAdvantage} element={lastRoundResult.playerCard.element} />
              )}
            </View>

            {/* CENTER COLUMN */}
            <View style={S.centerCol}>
              <Animated.View style={[S.vsBadge, vsStyle]}>
                <Text style={S.vsIcon}>⚔️</Text>
                <Text style={S.vsText}>VS</Text>
              </Animated.View>

              {phase === 'action' && expectedRoundResult && (
                <Animated.View style={[S.previewChip, vsStyle, {
                  borderColor: expectedRoundResult.winner === 'player' ? '#4ade8055' : expectedRoundResult.winner === 'bot' ? '#f8717155' : '#fbbf2455',
                  backgroundColor: expectedRoundResult.winner === 'player' ? 'rgba(74,222,128,0.08)' : expectedRoundResult.winner === 'bot' ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
                }]}>
                  <Text style={[S.previewChipText, { color: expectedRoundResult.winner === 'player' ? '#4ade80' : expectedRoundResult.winner === 'bot' ? '#f87171' : '#fbbf24' }]}>
                    {expectedRoundResult.winner === 'player' ? '👤 متوقع: فوزك' : expectedRoundResult.winner === 'bot' ? '💀 متوقع: خسارتك' : '🤝 متوقع: تعادل'}
                  </Text>
                </Animated.View>
              )}

              {(phase === 'result' || phase === 'waiting') && lastRoundResult && (
                <View style={[S.resultBadge, {
                  borderColor: lastRoundResult.winner === 'player' ? '#4ade80' : lastRoundResult.winner === 'bot' ? '#f87171' : '#fbbf24',
                  backgroundColor: lastRoundResult.winner === 'player' ? 'rgba(74,222,128,0.12)' : lastRoundResult.winner === 'bot' ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)',
                }]}>
                  <Text style={[S.resultBadgeText, { color: lastRoundResult.winner === 'player' ? '#4ade80' : lastRoundResult.winner === 'bot' ? '#f87171' : '#fbbf24' }]}>
                    {lastRoundResult.winner === 'player' ? '🏆 فزت! 🔥' : lastRoundResult.winner === 'bot' ? '💀 خسرت' : '🤝 تعادل'}
                  </Text>
                </View>
              )}

              <View style={S.ctaStack}>
                {phase === 'action' ? (
                  <TouchableOpacity style={[S.ctaBtn, S.ctaBtnAttack]} onPress={handleExecuteAttack} activeOpacity={0.85}>
                    <Text style={S.ctaBtnIcon}>⚔️</Text><Text style={S.ctaBtnText}>هجوم!</Text>
                  </TouchableOpacity>
                ) : phase === 'waiting' ? (
                  <TouchableOpacity style={[S.ctaBtn, S.ctaBtnNext]} onPress={handleNextRound} activeOpacity={0.85}>
                    <Text style={S.ctaBtnIcon}>{isGameOver ? '🏁' : '▶️'}</Text><Text style={S.ctaBtnText}>{isGameOver ? 'إنهاء' : 'التالي'}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[S.ctaBtn, S.ctaBtnDisabled]}>
                    <Text style={S.ctaBtnText}>{phase === 'combat' ? '⚔️ معركة...' : '⌛ جاري...'}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[S.ctaBtn, S.ctaBtnAbilities, phase !== 'action' && S.ctaBtnDisabled]}
                  onPress={() => phase === 'action' && setIsAbilitiesModalOpen(true)}
                  activeOpacity={0.8}
                  disabled={phase !== 'action'}
                >
                  <Text style={S.ctaBtnIcon}>⚡</Text><Text style={S.ctaBtnText}>قدرات</Text>
                </TouchableOpacity>

                {/* 🔥 زر الغضب — قرار استراتيجي بناءً على التوقع */}
                {canRageNow && phase === 'action' && (
                  <TouchableOpacity
                    style={[S.ctaBtn, S.ctaBtnRage]}
                    onPress={() => {
                      if (!currentPlayerCard) return;
                      const rageCard = applyRageToCard(currentPlayerCard, rageState.current);
                      const event = buildRageTriggerEvent(currentPlayerCard, rageCard);
                      setRageEvent(event);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={S.ctaBtnIcon}>😡</Text>
                    <Text style={S.ctaBtnText}>غضب!</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* BOT PANEL */}
            <View style={S.botPanel}>
              <Text style={S.panelLabel}>بوت</Text>
              <Animated.View style={[botStyle, { transform: [{ scale: 0.95 }] }]}>
                <LuxuryCharacterCardAnimated
                  card={displayBotCard}
                  style={{ width: cardWidth, height: cardHeight }}
                  effectiveAttack={botEffective.attack}
                  effectiveDefense={botEffective.defense}
                  playAudio={!isPlayerStronger}
                />
                {showBotEffect && <ElementEffect element={displayBotCard.element} isActive />}
              </Animated.View>
              {activeDamageNumbers.filter(n => n.side === 'bot').map(n => (
                <DamageNumber key={n.id} value={n.value} variant={n.variant} x={40} y={-20} onComplete={() => removeDmg(n.id)} />
              ))}
              {showResult && lastRoundResult && (
                <AdvantageChip advantage={lastRoundResult.botElementAdvantage} element={lastRoundResult.botCard.element} />
              )}
              <View style={S.botStatus}>
                <Text style={S.botStatusText}>{phase === 'action' ? '🤖 ينتظر...' : phase === 'combat' ? '⚔️ يقاتل!' : '🤖 جاهز'}</Text>
              </View>
            </View>

          </View>
        </View>
      </SafeAreaView>

      {/* ── MODALS ── */}

      {/* Abilities modal */}
      <Modal visible={isAbilitiesModalOpen} transparent animationType="fade" onRequestClose={() => setIsAbilitiesModalOpen(false)}>
        <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={() => setIsAbilitiesModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={S.abilitiesModal}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>⚡ القدرات المتاحة</Text>
              <TouchableOpacity onPress={() => setIsAbilitiesModalOpen(false)} style={S.modalClose}>
                <Text style={S.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {state.playerAbilities.length === 0 ? (
              <Text style={S.emptyText}>لا توجد قدرات متاحة</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.sm }}
              >
                {state.playerAbilities.map((ability, i) => {
                  const isSealed = state.activeEffects.some(ef =>
                    ef.kind === 'silenceAbilities' &&
                    (ef.targetSide === 'player' || ef.targetSide === 'all') &&
                    ef.createdAtRound <= roundNumber &&
                    (ef.expiresAtRound === undefined || roundNumber <= ef.expiresAtRound)
                  );
                  const canUse = !ability.used && phase === 'action' && !isSealed;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        if (!canUse) { if (isSealed) Alert.alert('القدرات مختومة', 'لا يمكنك تفعيل القدرات خلال مدة الختم.'); return; }

                        if (['LogicalEncounter', 'Eclipse', 'Trap', 'Pool'].includes(ability.type)) {
                          if (!upcomingRounds.length) return;
                          setPredictionSelections({}); setPredictionAbilityType(ability.type as any);
                          setIsAbilitiesModalOpen(false); setShowPredictionModal(true); return;
                        }
                        if (['Popularity', 'Rescue', 'Penetration'].includes(ability.type)) {
                          if (!remainingRounds.length) return;
                          setSelectedPopularityRound(null); setPopularityAbilityType(ability.type as any);
                          setIsAbilitiesModalOpen(false); setShowPopularityModal(true); return;
                        }
                        if (CHOICE_ABILITIES.includes(ability.type)) {
                          setIsAbilitiesModalOpen(false);
                          openChoiceModal(ability.type);
                          return;
                        }
                        useAbility(ability.type); setIsAbilitiesModalOpen(false);
                        hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      disabled={!canUse}
                      activeOpacity={0.85}
                      style={{ opacity: canUse ? 1 : 0.4, transform: [{ scale: 0.85 }] }}
                    >
                      <AbilityCard
                        ability={{
                          id: i,
                          nameEn: ability.type,
                          nameAr: getAbilityNameAr(ability.type).split('(')[0].trim(),
                          description: getAbilityDescription(ability.type),
                          icon: null,
                          rarity: 'Rare',
                          isActive: canUse,
                        }}
                        showActionButtons={false}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Choice modal */}
      <ChoiceModal
        visible={choiceModal.visible}
        title={choiceModal.title}
        options={choiceModal.options}
        onSelect={handleChoiceSelect}
        onCancel={() => setChoiceModal(p => ({ ...p, visible: false }))}
      />

      <PredictionModal
        visible={showPredictionModal}
        upcomingRounds={upcomingRounds}
        selections={predictionSelections}
        onSelect={(r: number, o: 'win' | 'loss') => setPredictionSelections(p => ({ ...p, [r]: o }))}
        onCancel={() => { setShowPredictionModal(false); setPredictionSelections({}); }}
        onRequestClose={() => setShowPredictionModal(false)}
        onConfirm={handleConfirmPrediction}
        isConfirmDisabled={!predictionComplete}
      />
      <PopularityModal
        visible={showPopularityModal}
        remainingRounds={remainingRounds}
        selectedRound={selectedPopularityRound}
        onSelect={(r: number) => setSelectedPopularityRound(r)}
        onCancel={() => { setShowPopularityModal(false); setSelectedPopularityRound(null); }}
        onRequestClose={() => setShowPopularityModal(false)}
        onConfirm={handleConfirmPopularity}
        isConfirmDisabled={selectedPopularityRound === null}
      />

      {/* History modal */}
      <Modal visible={isHistoryModalOpen} transparent animationType="slide" onRequestClose={() => setIsHistoryModalOpen(false)}>
        <View style={S.modalOverlay}>
          <View style={S.historyModal}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>📜 سجل الجولات</Text>
              <TouchableOpacity onPress={() => setIsHistoryModalOpen(false)} style={S.modalClose}>
                <Text style={S.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flexShrink: 1 }}>
              {roundHistory.length === 0 ? (
                <Text style={S.emptyText}>لا يوجد سجل بعد</Text>
              ) : (
                roundHistory.map((item, idx) => {
                  const c = item.winner === 'player' ? '#4ade80' : item.winner === 'bot' ? '#f87171' : '#fbbf24';
                  const l = item.winner === 'player' ? '🏆 فاز اللاعب' : item.winner === 'bot' ? '🤖 فاز البوت' : '🤝 تعادل';
                  return (
                    <View key={idx} style={[S.historyRow, { borderLeftColor: c }]}>
                      <View style={S.historyCardWrap}>
                        {item.winner === 'player' && <Text style={S.crown}>👑</Text>}
                        <LuxuryCharacterCardAnimated card={item.playerCard} style={{ width: 72, height: 100 }} />
                      </View>
                      <View style={S.historyCenter}>
                        <Text style={S.historyRound}>جولة {item.round}</Text>
                        <Text style={[S.historyResult, { color: c }]}>{l}</Text>
                      </View>
                      <View style={S.historyCardWrap}>
                        {item.winner === 'bot' && <Text style={S.crown}>👑</Text>}
                        <LuxuryCharacterCardAnimated card={item.botCard} style={{ width: 72, height: 100 }} />
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────── STYLES ───────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080612' },
  bgWrap: { position: 'absolute', inset: 0, zIndex: 0 },
  flashOverlay: { position: 'absolute', inset: 0, zIndex: 5, backgroundColor: '#fff', pointerEvents: 'none' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText: { fontSize: FONT.xl, color: COLOR.textMuted },
  normalRoot: { flex: 1 },
  screen: { flex: 1, flexDirection: 'column', paddingBottom: 8, justifyContent: 'space-between' },
  topHud: { height: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, backgroundColor: 'rgba(8,6,18,0.82)', borderBottomWidth: 1, borderBottomColor: 'rgba(228,165,42,0.18)', gap: SPACE.sm },
  hudSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  hudSideRight: { justifyContent: 'flex-end' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hudInfo: { flex: 1, gap: 4 },
  hudName: { fontSize: FONT.xs, letterSpacing: 0.5 },
  hudScore: { fontSize: FONT.xxl, fontVariant: ['tabular-nums'] } as any,
  hudCenter: { width: 160, alignItems: 'center', gap: SPACE.xs },
  hudRound: { color: '#e2e8f0', fontSize: FONT.sm, letterSpacing: 0.4 },
  historyBtn: { paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.full, backgroundColor: 'rgba(228,165,42,0.1)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.25)' },
  historyBtnText: { color: COLOR.gold, fontSize: FONT.xs - 2 },
  effectsBar: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACE.lg, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.28)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: SPACE.sm, minHeight: 32 },
  effectsBarSide: { flex: 1, alignItems: 'flex-start' },
  effectsBarDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)' },
  effectsBarLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 0.5, marginBottom: 2 },
  arena: { flex: 1, justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: SPACE.lg, gap: SPACE.xl, position: 'relative' },
  playerPanel: { alignItems: 'center', justifyContent: 'center', zIndex: 2, paddingVertical: SPACE.md },
  botPanel: { alignItems: 'center', justifyContent: 'center', zIndex: 1, paddingVertical: SPACE.md },
  panelLabel: { color: COLOR.textMuted, fontSize: FONT.xs - 2, letterSpacing: 1, textTransform: 'uppercase' },
  botStatus: { marginTop: SPACE.xs, paddingHorizontal: SPACE.md, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  botStatusText: { color: '#94a3b8', fontSize: FONT.xs - 2 },
  centerCol: { width: 152, alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, zIndex: 20 },
  vsBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(8,6,18,0.9)', borderWidth: 2, borderColor: 'rgba(228,165,42,0.7)', alignItems: 'center', justifyContent: 'center', ...SHADOW.gold },
  vsIcon: { fontSize: 18 },
  vsText: { fontSize: FONT.sm, color: COLOR.gold, letterSpacing: 1 },
  previewChip: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderRadius: RADIUS.full, borderWidth: 1, alignItems: 'center' },
  previewChipText: { fontSize: FONT.xs - 2, textAlign: 'center' },
  resultBadge: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center' },
  resultBadgeText: { fontSize: FONT.base, letterSpacing: 0.5 },
  ctaStack: { gap: SPACE.sm, width: '100%', alignItems: 'center' },
  ctaBtn: { width: 140, height: 48, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.4)' },
  ctaBtnAttack: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: '#4ade80', shadowColor: '#4ade80', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, elevation: 6 },
  ctaBtnNext: { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: '#60a5fa', shadowColor: '#60a5fa', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4 },
  ctaBtnRage: { backgroundColor: 'rgba(249,115,22,0.18)', borderColor: '#f97316', shadowColor: '#f97316', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  ctaBtnAbilities: { backgroundColor: 'rgba(168,85,247,0.12)', borderColor: '#a855f7', shadowColor: '#a855f7', shadowOpacity: 0.45, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4 },
  ctaBtnDisabled: { backgroundColor: 'rgba(71,85,105,0.2)', borderColor: '#475569', shadowOpacity: 0 },
  ctaBtnIcon: { fontSize: 16 },
  ctaBtnText: { color: '#f1f5f9', fontSize: FONT.sm, letterSpacing: 0.3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  abilitiesModal: { width: '92%', maxWidth: 820, backgroundColor: 'rgba(12,18,36,0.97)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(51,65,85,0.7)', padding: SPACE.xl, paddingBottom: SPACE.lg },
  historyModal: { backgroundColor: 'rgba(18,14,28,0.97)', borderRadius: RADIUS.lg, width: '90%', maxHeight: '82%', padding: SPACE.xl, borderWidth: 1, borderColor: '#1e293b' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', paddingBottom: SPACE.md },
  modalTitle: { color: '#f8fafc', fontSize: FONT.xl },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: 16 },
  modalCloseText: { color: '#f87171', fontSize: 18 },
  emptyText: { color: '#64748b', textAlign: 'center', marginVertical: SPACE.xxl, fontSize: FONT.base },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 3, paddingLeft: SPACE.lg, paddingVertical: SPACE.md, marginBottom: SPACE.lg, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.md, gap: SPACE.lg },
  historyCardWrap: { alignItems: 'center', position: 'relative' },
  crown: { fontSize: 20, position: 'absolute', top: -20, alignSelf: 'center', zIndex: 10 },
  historyCenter: { flex: 1, alignItems: 'center', gap: SPACE.xs },
  historyRound: { color: COLOR.gold, fontSize: FONT.sm },
  historyResult: { fontSize: FONT.base },
});
