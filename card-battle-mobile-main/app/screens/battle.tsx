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
 *  - ✅ Fix: force 'row' flexDirection in arena (ignore portrait mode)
 *  - ✅ Refactor: removed old classes (warrior/knight/mage/archer/berserker/paladin)
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
  getRemainingRounds,
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

// ✅ الفصائل المعتمدة فقط (حسب الفلتر)
const ALL_CLASSES: CardClass[] = ['swordsman', 'fighter', 'guardian', 'healer'];
const CLASS_LABELS: Record<CardClass, string> = {
  swordsman: '🤺 سياف',
  fighter:   '🥊 مقاتل',
  guardian:  '🤖 والي',
  healer:    '⚕️ طبيب',
  warrior:   '⚔️ محارب',
  knight:    '🛡️ فارس',
  mage:      '🧙 ساحر',
  archer:    '🏹 رامي',
  berserker: '🔥 هائج',
  paladin:   '⛪ مدافع',
};
const CLASS_LABELS_SHORT: Record<string, string> = {
  swordsman: 'السيافين',
  fighter:   'المقاتلين',
  guardian:  'الولاة',
  healer:    'الأطباء',
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

  // ✅ Fix: الـ arena دائماً row بغض النظر عن وضع الشاشة
  // cardWidth يحسب بناءً على أكبر بُعد (max) حتى تظهر الكروت بحجم مناسب
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  const cardWidth = Math.min(longSide * CARD_WIDTH_FACTOR[size] * 0.88, (shortSide * 0.54) / 1.5);
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
    if (currentPlayerCard?.id && currentPlayerCard.rageMode?.oncePer === 'match') {
      rageState.current.activatedThisMatch.add(currentPlayerCard.id);
    }
    setRageEvent(null);
  }, [state.playerDeck, state.currentRound, setPlayerDeck, currentPlayerCard]);

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
    ? getEffectiveStats(displayPlayerCard.attack, displayPlayerCard.defense, state.activeEffects, 'player', displayPlayerCard.cardClass)
    : { attack: 0, defense: 0 };
 
  const botEffective = displayBotCard
    ? getEffectiveStats(displayBotCard.attack, displayBotCard.defense, state.activeEffects, 'bot', displayBotCard.cardClass)
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

          {/* ══ ARENA — دائماً row بغض النظر عن portrait/landscape ══ */}
          <View style={[S.arena, { flexDirection: 'row', paddingHorizontal: LAYOUT_PADDING[size] }]}>

            {/* PLAYER PANEL */}
            <View style={S.playerPanel}>
              <Text style={S.panelLabel}>لاعب</Text>
              <Animated.View style={playerStyle}>
                <LuxuryCharacterCardAnimated
                  card={displayPlayerCard}
                  style={{ width: cardWidth, height: cardHeight }}
                  effectiveAttack={playerEffective.attack}
                  effectiveDefense={playerEffective.defense}
                  isWinner={phase === 'result' && displayPlayerCard?.winState === 'win'}
                />
              </Animated.View>
              {showPlayerEffect && (
                <ElementEffect element={displayPlayerCard.element} isActive position="bottom" />
              )}
              {activeDamageNumbers.filter(n => n.side === 'player').map(n => (
                <DamageNumber key={n.id} value={n.value} variant={n.variant} onComplete={() => removeDmg(n.id)} />
              ))}
              <AdvantageChip
                advantage={lastRoundResult?.playerElementAdvantage ?? 'neutral'}
                element={displayPlayerCard.element}
              />
              <ActiveEffectsBar effects={state.activeEffects} side="player" />
            </View>

            {/* CENTER PANEL */}
            <View style={S.centerPanel}>
              <Animated.View style={vsStyle}>
                <Text style={S.vsText}>⚔️</Text>
              </Animated.View>

              {phase === 'result' && lastRoundResult && (
                <Animated.View style={[S.resultChip, resultStyle]}>
                  <Text style={[
                    S.resultText,
                    lastRoundResult.winner === 'player' ? S.resultWin
                    : lastRoundResult.winner === 'bot' ? S.resultLose
                    : S.resultDraw,
                  ]}>
                    {lastRoundResult.winner === 'player' ? '🏆 فزت'
                      : lastRoundResult.winner === 'bot' ? '💀 خسرت'
                      : '🤝 تعادل'}
                  </Text>
                </Animated.View>
              )}

              {phase === 'action' && (
                <View style={S.actionButtons}>
                  {/* Ability button */}
                  <TouchableOpacity
                    style={[S.abilityBtn, state.playerAbilities.every(a => a.used) && S.abilityBtnDisabled]}
                    onPress={() => setIsAbilitiesModalOpen(true)}
                    disabled={state.playerAbilities.every(a => a.used)}
                    activeOpacity={0.8}
                  >
                    <Text style={S.abilityBtnText}>✨ قدرة</Text>
                  </TouchableOpacity>

                  {/* Attack button */}
                  <TouchableOpacity style={S.attackBtn} onPress={handleExecuteAttack} activeOpacity={0.85}>
                    <Text style={S.attackBtnText}>⚔️ هجوم</Text>
                  </TouchableOpacity>

                  {canRageNow && (
                    <TouchableOpacity
                      style={S.rageBtn}
                      onPress={() => {
                        const tempState = { activatedThisMatch: new Set(rageState.current.activatedThisMatch) };
                        const rageCard = applyRageToCard(currentPlayerCard!, tempState);
                        const re = buildRageTriggerEvent(currentPlayerCard!, rageCard);
                        if (re) setRageEvent(re);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={S.rageBtnText}>🔥 RAGE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {phase === 'result' && !isGameOver && (
                <TouchableOpacity style={S.nextBtn} onPress={handleNextRound} activeOpacity={0.85}>
                  <Text style={S.nextBtnText}>التالي ▶</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* BOT PANEL */}
            <View style={S.botPanel}>
              <Text style={[S.panelLabel, { textAlign: 'right' }]}>بوت</Text>
              <Animated.View style={botStyle}>
                <LuxuryCharacterCardAnimated
                  card={displayBotCard}
                  style={{ width: cardWidth, height: cardHeight }}
                  effectiveAttack={botEffective.attack}
                  effectiveDefense={botEffective.defense}
                  isWinner={phase === 'result' && displayBotCard?.winState === 'win'}
                />
              </Animated.View>
              {showBotEffect && (
                <ElementEffect element={displayBotCard.element} isActive position="top" />
              )}
              {activeDamageNumbers.filter(n => n.side === 'bot').map(n => (
                <DamageNumber key={n.id} value={n.value} variant={n.variant} onComplete={() => removeDmg(n.id)} />
              ))}
              <AdvantageChip
                advantage={lastRoundResult?.botElementAdvantage ?? 'neutral'}
                element={displayBotCard.element}
              />
              <ActiveEffectsBar effects={state.activeEffects} side="bot" />
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* ── History Modal ── */}
      <Modal visible={isHistoryModalOpen} transparent animationType="fade" onRequestClose={() => setIsHistoryModalOpen(false)}>
        <TouchableOpacity style={cm.overlay} activeOpacity={1} onPress={() => setIsHistoryModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[cm.box, { width: 340 }]}>
            <Text style={cm.title}>📜 سجل الجولات</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {roundHistory.length === 0 ? (
                <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 16 }}>لا توجد جولات مكتملة بعد</Text>
              ) : roundHistory.map((h, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: '#cbd5e1', fontSize: 12 }}>ج{h.round}: {h.playerCard.nameAr ?? h.playerCard.name}</Text>
                  <Text style={{ color: '#cbd5e1', fontSize: 12 }}>vs {h.botCard.nameAr ?? h.botCard.name}</Text>
                  <Text style={{ color: h.winner === 'player' ? '#4ade80' : h.winner === 'bot' ? '#f87171' : '#fbbf24', fontSize: 12 }}>
                    {h.winner === 'player' ? '✓' : h.winner === 'bot' ? '✗' : '='}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={cm.cancel} onPress={() => setIsHistoryModalOpen(false)}>
              <Text style={cm.cancelText}>إغلاق</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Abilities Modal ── */}
      <Modal visible={isAbilitiesModalOpen} transparent animationType="slide" onRequestClose={() => setIsAbilitiesModalOpen(false)}>
        <TouchableOpacity style={cm.overlay} activeOpacity={1} onPress={() => setIsAbilitiesModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[cm.box, { width: 340, maxHeight: '80%' }]}>
            <Text style={cm.title}>✨ قدراتك</Text>
            <ScrollView contentContainerStyle={{ gap: 8, padding: 4 }}>
              {state.playerAbilities.map((ab, i) => (
                <TouchableOpacity
                  key={i}
                  style={[cm.option, ab.used && { opacity: 0.4 }]}
                  onPress={() => {
                    if (ab.used) return;
                    if (CHOICE_ABILITIES.includes(ab.type)) {
                      openChoiceModal(ab.type);
                    } else if (['LogicalEncounter', 'Eclipse', 'Trap', 'Pool'].includes(ab.type)) {
                      setPredictionAbilityType(ab.type as any);
                      setShowPredictionModal(true);
                      setIsAbilitiesModalOpen(false);
                    } else if (['Popularity', 'Rescue', 'Penetration'].includes(ab.type)) {
                      setPopularityAbilityType(ab.type as any);
                      setShowPopularityModal(true);
                      setIsAbilitiesModalOpen(false);
                    } else {
                      useAbility(ab.type, {});
                      setIsAbilitiesModalOpen(false);
                      hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  disabled={ab.used}
                  activeOpacity={0.8}
                >
                  <Text style={[cm.optionText, ab.used && { color: '#64748b' }]}>
                    {ab.used ? '✓ ' : ''}{getAbilityNameAr(ab.type)}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                    {getAbilityDescription(ab.type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={cm.cancel} onPress={() => setIsAbilitiesModalOpen(false)}>
              <Text style={cm.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Choice Modal ── */}
      <ChoiceModal
        visible={choiceModal.visible}
        title={choiceModal.title}
        options={choiceModal.options}
        onSelect={handleChoiceSelect}
        onCancel={() => setChoiceModal(p => ({ ...p, visible: false }))}
      />

      {/* ── Prediction Modal ── */}
      <PredictionModal
        visible={showPredictionModal}
        upcomingRounds={upcomingRounds}
        selections={predictionSelections}
        onSelect={(r: number, v: 'win' | 'loss') => setPredictionSelections(p => ({ ...p, [r]: v }))}
        onConfirm={handleConfirmPrediction}
        onCancel={() => { setShowPredictionModal(false); setPredictionSelections({}); }}
        onRequestClose={() => { setShowPredictionModal(false); setPredictionSelections({}); }}
        isConfirmDisabled={!predictionComplete}
      />

      {/* ── Popularity Modal ── */}
      <PopularityModal
        visible={showPopularityModal}
        remainingRounds={remainingRounds}
        selectedRound={selectedPopularityRound}
        onSelect={setSelectedPopularityRound}
        onCancel={() => { setShowPopularityModal(false); setSelectedPopularityRound(null); }}
        onRequestClose={() => { setShowPopularityModal(false); setSelectedPopularityRound(null); }}
        onConfirm={handleConfirmPopularity}
        isConfirmDisabled={selectedPopularityRound === null}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080d1a' },
  bgWrap: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  normalRoot: { flex: 1 },
  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 99, pointerEvents: 'none' },
  screen: { flex: 1, flexDirection: 'column', paddingTop: SPACE.sm, paddingBottom: SPACE.sm, zIndex: 1 },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText: { color: COLOR.gold, fontSize: FONT.lg },

  topHud: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, paddingBottom: SPACE.sm, gap: SPACE.sm },
  hudSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  hudSideRight: { flexDirection: 'row-reverse' },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  hudInfo: { flex: 1, gap: 3 },
  hudName: { fontSize: FONT.xs, fontWeight: '700', letterSpacing: 0.5 },
  hudScore: { fontSize: FONT.xl, fontWeight: '900', minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] } as any,
  hudCenter: { flex: 1.2, alignItems: 'center', gap: 3 },
  hudRound: { color: COLOR.gold, fontSize: FONT.xs, fontWeight: '700', letterSpacing: 0.4 },
  historyBtn: { paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  historyBtnText: { color: '#94a3b8', fontSize: FONT.xs - 1 },

  effectsBar: { flexDirection: 'row', paddingHorizontal: SPACE.lg, paddingBottom: SPACE.xs, gap: SPACE.sm },
  effectsBarSide: { flex: 1 },
  effectsBarDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  effectsBarLabel: { color: '#64748b', fontSize: 9, letterSpacing: 0.3 },

  arena: { flex: 1, gap: SPACE.sm },
  playerPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.xs },
  botPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.xs },
  centerPanel: { width: 90, alignItems: 'center', justifyContent: 'center', gap: SPACE.md },
  panelLabel: { color: '#64748b', fontSize: FONT.xs, letterSpacing: 0.5 },

  vsText: { fontSize: 28, opacity: 0.85 },
  resultChip: { backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  resultText: { fontSize: FONT.sm, fontWeight: '700', textAlign: 'center' },
  resultWin: { color: '#4ade80' },
  resultLose: { color: '#f87171' },
  resultDraw: { color: '#fbbf24' },

  actionButtons: { gap: SPACE.sm, alignItems: 'center' },
  abilityBtn: { backgroundColor: 'rgba(139,92,246,0.25)', borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.5)' },
  abilityBtnDisabled: { opacity: 0.35 },
  abilityBtnText: { color: '#c4b5fd', fontSize: FONT.xs, fontWeight: '700' },
  attackBtn: { backgroundColor: 'rgba(239,68,68,0.25)', borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.6)' },
  attackBtnText: { color: '#fca5a5', fontSize: FONT.sm, fontWeight: '800', letterSpacing: 0.5 },
  rageBtn: { backgroundColor: 'rgba(251,146,60,0.3)', borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderWidth: 1, borderColor: 'rgba(251,146,60,0.7)' },
  rageBtnText: { color: '#fed7aa', fontSize: FONT.xs, fontWeight: '800', letterSpacing: 1 },
  nextBtn: { backgroundColor: 'rgba(228,165,42,0.2)', borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderWidth: 1, borderColor: 'rgba(228,165,42,0.5)' },
  nextBtnText: { color: COLOR.gold, fontSize: FONT.sm, fontWeight: '700' },
});
