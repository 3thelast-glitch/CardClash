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
  Alert,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { DamageNumber, DamageNumberVariant } from '@/components/game/damage-number';
import { BattleResultOverlay } from '@/components/game/BattleResultOverlay';
import { useBattleLayout } from '@/utils/layout';
import { useOrientationTransition } from '@/utils/orientation-transition';
import { useGame } from '@/lib/game/game-context';
import { RACE_EMOJI, RACE_LABELS, FactionAdvantage, Race, CardClass, AbilityType, RoundResult, Side } from '@/lib/game/types';
import { getAbilityNameAr, getAbilityNameOnly, getAbilityDescription } from '@/lib/game/ability-names';
import { withEffectSource } from '@/lib/game/effect-labels';
import { AbilityCard } from '@/components/game/ability-card';
import { abilities as ALL_ABILITIES } from '@/data/abilities';
import { EffectToast, useEffectToast } from '@/components/game/EffectToast';
import { AbilityActivationOverlay } from '@/components/game/AbilityActivationOverlay';
import { ABILITY_DETAILS, CATEGORY_CONFIG } from '@/lib/game/ability-details';
import PredictionModal from '@/components/modals/PredictionModal';
import PopularityModal from '@/components/modals/PopularityModal';
import {
  getRemainingRounds,
  getUpcomingPredictionRounds, isPredictionComplete,
  getEffectiveStats,
  getDirectCharacterStatReasons,
  doesEffectApplyToCard,
  shouldPlayRoundCardAudio,
} from '@/lib/game/ui-helpers';
import { COLOR, SPACE, RADIUS, FONT } from '@/components/ui/design-tokens';
import {
  decideBotAbility, updateBotMemory, resetBotMemory,
} from '@/lib/game/bot-ai';
import { getCardsWithEdits } from '@/lib/game/useCards';
import { getCardImage } from '@/lib/game/get-card-image';
import type { DifficultyLevel } from '@/app/screens/difficulty';
// ✅ Step 1: settings hook + timings
import { useSettings, BATTLE_TIMINGS } from '@/lib/game/hooks/useSettings';
import { useSFX } from '@/hooks/use-sfx';
// 🔥 Rage Mode
import { shouldTriggerRage, applyRageToCard, buildRageTriggerEvent, buildRageState } from '@/lib/game/rage-engine';
import { RageModeOverlay } from '@/components/game/rage-mode-overlay';
import { RoundInsightPanel, RoundTimelinePanel } from '@/components/game/RoundInsightPanel';
import { buildRoundEventLog, buildRoundTimeline, getActiveEffectPreview } from '@/lib/game/round-insights';
import { isDeveloperBuild } from '@/lib/build-variant';

type BattlePhase = 'selection' | 'action' | 'combat' | 'result' | 'waiting';

// ─── Helpers ───────────────────────────────────────────────────────────────
const advantageColor = (a: FactionAdvantage) =>
  a === 'strong' ? '#4ade80' : a === 'weak' ? '#f87171' : '#a0a0a0';
const advantageLabel = (a: FactionAdvantage) =>
  a === 'strong' ? '⬆️ قوي' : a === 'weak' ? '⬇️ ضعيف' : '';

const ALL_FACTIONS: Race[] = ['human', 'elf', 'orc', 'dragon', 'demon', 'undead', 'monster', 'robot'];

function buildAbilityCardData(abilityType: AbilityType, isActive = true) {
  const match = ALL_ABILITIES.find(
    ability => ability.nameEn.replace(/\s+/g, '').toLowerCase() === abilityType.replace(/\s+/g, '').toLowerCase()
  );
  return {
    id: abilityType,
    nameEn: match?.nameEn ?? getAbilityNameOnly(abilityType),
    nameAr: match?.nameAr ?? getAbilityNameAr(abilityType),
    description: match?.description ?? getAbilityDescription(abilityType),
    descriptionWarning: match?.descriptionWarning,
    rarity: match?.rarity ?? 'Common',
    icon: match?.icon,
    isActive,
  };
}

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
  const withSource = (label: string) => withEffectSource(effect, label);
  switch (effect.kind) {
    case 'statModifier': {
      const stat = STAT_LABELS[d?.stat] ?? d?.stat ?? '؟';
      const amount = d?.amount ?? 0;
      const sign = amount >= 0 ? '+' : '';
      const onlyClass: string | undefined = d?.onlyClass;
      const multiplier: boolean = !!d?.multiplier;
      if (multiplier) return withSource(`${stat} ×${amount > 0 ? amount : '½'}`);
      if (onlyClass) return withSource(`جميع ${CLASS_LABELS_SHORT[onlyClass] ?? onlyClass} ${sign}${amount}`);
      return withSource(`${stat} ${sign}${amount}`);
    }
    case 'protection': return withSource('🛡 حماية');
    case 'fortify': return withSource('🔩 تحصين');
    case 'halvePoints': return withSource('½ تنصيف');
    case 'silenceAbilities': return withSource('🔇 ختم قدرات');
    case 'doubleOrNothing': return withSource('🎲 مضاعفة أو صفر');
    case 'forcedOutcome': return withSource('🎯 نتيجة مضمونة');
    case 'starAdvantage': return withSource('⭐ أفضلية نجوم');
    case 'sacrifice': return withSource('🩸 تضحية');
    case 'greedBuff': return withSource('💰 جشع');
    case 'lifesteal': return withSource('🩸 سرقة صحة');
    case 'revengeBuff': return withSource('😤 انتقام');
    case 'suicidePact': return withSource('💀 اتفاقية انتحار');
    case 'compensationBuff': return withSource('🎁 تعويض');
    case 'weakeningDebuff': return withSource('📉 إضعاف');
    case 'explosionDebuff': return withSource('💥 انفجار');
    case 'consecutiveLoss': return withSource('🔄 خسائر متتالية');
    case 'shieldGuard': return withSource('🛡 درع');
    case 'trap': return withSource('🪤 فخ');
    case 'convertDebuffs': return withSource('🔃 تحويل نيرف→بف');
    case 'doubleBuffs': return withSource('✨ مضاعفة البفات');
    case 'conversion': return withSource('🔄 تحويل بفات الخصم');
    case 'takeIt': return withSource('↩️ إعادة النيرف');
    case 'deprivation': return withSource('🚫 سلب بف');
    case 'pool': return withSource('🌊 تصفير الجولة');
    case 'turinPenalty': return withSource('⚠️ تخسر نصف الجولات');
    case 'prediction': return withSource('🔮 توقع');
    default: return withSource(effect.kind ?? '؟');
  }
}

// ─── Round progress bar ──────────────────────────────────────────────────
function RoundBar({ current, total }: { current: number; total: number }) {
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withTiming((current / total) * 100, { duration: 400 });
  }, [current, total, filled]);
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
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(203,221,221,0.10)', overflow: 'visible', position: 'relative' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: COLOR.gold, borderRadius: 3 },
  tick: { position: 'absolute', top: -2, width: 2, height: 10, backgroundColor: 'rgba(203,221,221,0.18)', borderRadius: 1, marginLeft: -1 },
  tickDone: { backgroundColor: 'rgba(57,230,208,0.68)' },
});

// ─── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score, maxScore, color, reverse = false }: { score: number; maxScore: number; color: string; reverse?: boolean }) {
  const filled = useSharedValue(0);
  useEffect(() => {
    filled.value = withSpring(maxScore > 0 ? (score / maxScore) * 100 : 0, { damping: 14 });
  }, [filled, maxScore, score]);
  const barStyle = useAnimatedStyle(() => ({ width: `${filled.value}%` as any }));
  return (
    <View style={[sb.track, reverse && { flexDirection: 'row-reverse' }]}>
      <Animated.View style={[sb.fill, { backgroundColor: color }, reverse && sb.fillRight, barStyle]} />
    </View>
  );
}
const sb = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(203,221,221,0.11)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, position: 'absolute', left: 0 },
  fillRight: { left: undefined, right: 0 },
});

// ─── Advantage chip ─────────────────────────────────────────────────────────
function AdvantageChip({ advantage, faction }: { advantage: FactionAdvantage; faction: Race }) {
  if (advantage === 'neutral') return null;
  const c = advantageColor(advantage);
  return (
    <View style={[ac.chip, { borderColor: c + '55', backgroundColor: c + '14' }]}>
      <Text style={[ac.text, { color: c }]}>
        {RACE_EMOJI[faction]} {advantageLabel(advantage)}
      </Text>
    </View>
  );
}
const ac = StyleSheet.create({
  chip: { paddingHorizontal: SPACE.md, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1, alignSelf: 'center', marginTop: SPACE.sm },
  text: { fontSize: FONT.xs - 2, letterSpacing: 0.4 },
});

// ─── Active Effects Bar ─────────────────────────────────────────────────────
function ActiveEffectsBar({ effects, side, card, opponentCard, ownScore, opponentScore, compact = false, roundNumber }: { effects: any[]; side: 'player' | 'bot'; card?: any; opponentCard?: any; ownScore?: number; opponentScore?: number; compact?: boolean; roundNumber?: number }) {
  const mine = effects.filter(e => (e.targetSide === side || e.targetSide === 'all') && doesEffectApplyToCard(e, card, ownScore, opponentScore));
  const directReasons = getDirectCharacterStatReasons(
    card,
    opponentCard,
    { ownScore, opponentScore },
    { ownScore: opponentScore, opponentScore: ownScore },
  );
  if (!mine.length && !directReasons.length) return null;
  const BUFF_KINDS = new Set(['greedBuff', 'lifesteal', 'revengeBuff', 'compensationBuff', 'consecutiveLoss', 'shieldGuard', 'doubleBuffs', 'protection', 'fortify', 'starAdvantage']);
  return (
    <View testID={`active-effects-${side}`} style={[eff.row, compact && eff.sideColumn]}>
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
        const roundsLeft = e.expiresAtRound !== undefined ? Math.max(0, e.expiresAtRound - (roundNumber ?? e.createdAtRound ?? 0) + 1) : null;
        const label = getEffectLabel(e);
        return (
          <View key={i} style={[eff.chip, compact && eff.sideChip, { borderColor: color + '66', backgroundColor: color + '18' }]}>
            <Text numberOfLines={compact ? 2 : 1} style={[eff.label, compact && eff.sideLabel, { color }]}>{label}</Text>
            {roundsLeft !== null && roundsLeft > 0 && (
              <View style={[eff.badge, { backgroundColor: color + '33' }]}>
                <Text style={[eff.badgeText, { color }]}>{roundsLeft}ج</Text>
              </View>
            )}
          </View>
        );
      })}
      {directReasons.map((reason, index) => {
        const isBuff = reason.amount > 0;
        const color = isBuff ? '#4ade80' : '#f87171';
        const stat = reason.stat === 'attack' ? 'هجوم' : 'دفاع';
        return (
          <View key={`character-${reason.stat}-${index}`} style={[eff.chip, compact && eff.sideChip, { borderColor: color + '66', backgroundColor: color + '18' }]}>
            <Text numberOfLines={compact ? 2 : 1} style={[eff.label, compact && eff.sideLabel, { color }]}>{`${reason.label}: ${stat} ${reason.amount > 0 ? '+' : ''}${reason.amount}`}</Text>
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
  sideColumn: { width: 76, flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch', gap: 5, marginTop: 0 },
  sideChip: { minHeight: 27, justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 3, gap: 2 },
  sideLabel: { flex: 1, fontSize: 8.5, lineHeight: 11, textAlign: 'center', writingDirection: 'rtl' },
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
  overlay: { flex: 1, backgroundColor: 'rgba(2,8,12,0.86)', justifyContent: 'center', alignItems: 'center' },
  box: { width: '88%', maxWidth: 340, backgroundColor: 'rgba(7,20,27,0.98)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(57,230,208,0.28)', padding: SPACE.xl },
  title: { color: COLOR.gold, fontSize: FONT.base, textAlign: 'center', marginBottom: SPACE.lg },
  option: { backgroundColor: 'rgba(57,230,208,0.06)', borderRadius: RADIUS.md, padding: SPACE.md, borderWidth: 1, borderColor: 'rgba(57,230,208,0.16)' },
  optionText: { color: COLOR.textPrimary, fontSize: FONT.sm, textAlign: 'center' },
  cancel: { marginTop: SPACE.lg, alignItems: 'center', padding: SPACE.sm },
  cancelText: { color: '#f87171', fontSize: FONT.sm },
});

// ────────────────────────── MAIN SCREEN ──────────────────────────
export default function BattleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    height,
    arenaPadding,
    arenaGap,
    centerWidth,
    actionButtonWidth,
    actionButtonHeight,
    cardWidth,
    cardHeight,
    hudPadding,
    isCompact,
    isLandscape,
  } = useBattleLayout();

  // Dynamic scaling parameters for the abilities modal:
  const modalAvailableH = height * 0.95 - 100; // safe area margin for modal padding, title, cancel button
  const modalAbilityCardH = Math.max(140, Math.min(240, modalAvailableH));
  const modalAbilityCardW = Math.round(modalAbilityCardH * (160 / 240));

  const modalPadding = height < 400 ? 10 : 16;
  const modalGap = height < 400 ? 8 : 16;
  const modalTitleMargin = height < 400 ? 6 : 16;
  const modalCancelMargin = height < 400 ? 6 : 16;
  const portraitCommandWidth = Math.min(cardWidth, 340);
  const commandButtonWidth = isLandscape
    ? actionButtonWidth
    : Math.max(104, Math.floor((portraitCommandWidth - Math.max(8, arenaGap)) / 2));

  // ✅ Step 1: تهيئة الـ hook — جاهز للربط في الخطوات القادمة
  const { settings } = useSettings();
  const { playAbility, playNextRound } = useSFX(settings.soundEnabled);
  const { animatedStyle: orientationStyle, layoutTransition } = useOrientationTransition(
    isLandscape,
    settings.animationsEnabled,
  );
  const { showToast } = useEffectToast();

  // ✅ Step 2: helper يحترم إعداد الاهتزاز
  const hapticImpact = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== 'web' && settings.vibration) Haptics.impactAsync(style);
  }, [settings.vibration]);

  const hapticNotification = useCallback((type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS !== 'web' && settings.vibration) Haptics.notificationAsync(type);
  }, [settings.vibration]);

  // تبقى الساحة في صف واحد، لكن عرض البطاقات والعمود الأوسط محسوبان من المساحة المتاحة فعلياً.
  // يمنع ذلك تجاوز العرض في الشاشات العمودية والنوافذ الضيقة.

  const {
    state, playRound, isGameOver, currentPlayerCard, currentBotCard,
    lastRoundResult, expectedRoundResult, useAbility: activateAbility,
    resetGame, nextRound, startBattle, setPlayerDeck, syncDecks, grantDeveloperNothingHappened,
  } = useGame();

  const [phase, setPhase] = useState<BattlePhase>('selection');
  const [isBattleFinished, setIsBattleFinished] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showPlayerEffect, setShowPlayerEffect] = useState(false);
  const [showBotEffect, setShowBotEffect] = useState(false);
  const [roundHistory, setRoundHistory] = useState<RoundResult[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUsedAbilitiesModalOpen, setIsUsedAbilitiesModalOpen] = useState(false);
  const [isAbilitiesModalOpen, setIsAbilitiesModalOpen] = useState(false);
  const [abilityOwnerSide, setAbilityOwnerSide] = useState<Side>('player');
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [predictionSelections, setPredictionSelections] = useState<Record<number, 'win' | 'loss'>>({});
  const [predictionAbilityType, setPredictionAbilityType] = useState<'LogicalEncounter' | 'Eclipse' | 'Trap' | 'Pool'>('LogicalEncounter');
  const [popularityAbilityType, setPopularityAbilityType] = useState<'Popularity' | 'Rescue' | 'Penetration'>('Popularity');
  const [showPopularityModal, setShowPopularityModal] = useState(false);
  const [selectedPopularityRound, setSelectedPopularityRound] = useState<number | null>(null);
  const [activeDamageNumbers, setActiveDamageNumbers] = useState<{ id: string; side: 'player' | 'bot'; value: number; variant: DamageNumberVariant }[]>([]);
  // 🔥 Rage Mode
  const [rageEvent, setRageEvent] = useState<ReturnType<typeof buildRageTriggerEvent> | null>(null);
  const rageState = useRef(buildRageState());

  // ── Choice modal state ──
  const [choiceModal, setChoiceModal] = useState<{
    visible: boolean;
    title: string;
    options: { value: string; label: string }[];
    abilityType: string;
    ownerSide: Side;
    extraData?: unknown;
  }>({ visible: false, title: '', options: [], abilityType: '', ownerSide: 'player' });

  // ── Transition Lock & Timers ──
  const isTransitioning = useRef(false);
  const isAdvancingRound = useRef(false);
  const nextRoundTimeout = useRef<NodeJS.Timeout | null>(null);
  const entranceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ FIX: guard against startBattle being called more than once
  const battleStarted = useRef(false);
  const isLocalTwoPlayer = state.matchMode === 'local';
  const isDeveloperVariant = isDeveloperBuild(Constants.expoConfig?.extra);
  const playerLabel = isLocalTwoPlayer ? 'المضيف' : 'لاعب';
  const opponentLabel = isLocalTwoPlayer ? 'الضيف' : 'بوت';
  const activeRoundNumber = state.currentRound + 1;
  const hasZoroCutForSide = useCallback((side: Side) => state.activeEffects.some(effect => {
    const data = effect.data as { zoroCut?: boolean } | undefined;
    return effect.kind === 'forcedOutcome'
      && effect.sourceSide === side
      && data?.zoroCut === true
      && effect.createdAtRound <= activeRoundNumber
      && (effect.expiresAtRound === undefined || activeRoundNumber <= effect.expiresAtRound);
  }), [activeRoundNumber, state.activeEffects]);
  const playerZoroCutActive = hasZoroCutForSide('player');
  const botZoroCutActive = hasZoroCutForSide('bot');
  const usedLocalAbilities = useMemo(() => {
    if (!isLocalTwoPlayer) return [];
    return [
      ...state.playerAbilities.filter(ability => ability.used).map((ability, index) => ({
        id: `host-${ability.type}-${index}`,
        owner: 'المضيف',
        ownerColor: '#4ade80',
        ability: buildAbilityCardData(ability.type),
      })),
      ...state.botAbilities.filter(ability => ability.used).map((ability, index) => ({
        id: `guest-${ability.type}-${index}`,
        owner: 'الضيف',
        ownerColor: '#60a5fa',
        ability: buildAbilityCardData(ability.type),
      })),
    ];
  }, [isLocalTwoPlayer, state.playerAbilities, state.botAbilities]);
  const handleDeveloperAbilityGrant = useCallback(() => {
    const replacedAbility = grantDeveloperNothingHappened();
    if (replacedAbility) hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
  }, [grantDeveloperNothingHappened, hapticImpact]);

  // تهيئة الصوت ليعمل حتى لو كان الهاتف صامتاً (iOS)
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    return () => {
      if (nextRoundTimeout.current) clearTimeout(nextRoundTimeout.current);
      if (entranceTimeout.current) clearTimeout(entranceTimeout.current);
    };
  }, []);

  // animations
  const playerAnim = useSharedValue(1);
  const botAnim = useSharedValue(1);
  const vsOpacity = useSharedValue(1);
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

  // إذا فتحت الشاشة قبل اكتمال dispatch من شاشة الترتيب، نعيد تهيئة المعركة
  // عند وصول التشكيل بدلاً من البقاء في ساحة بلا كروت أو بحركة دخول عند الصفر.
  useEffect(() => {
    if (!battleStarted.current && state.totalRounds > 0 && state.playerDeck.length > 0 && !currentPlayerCard && !currentBotCard) {
      battleStarted.current = true;
      startBattle(state.playerDeck);
    }
  }, [currentBotCard, currentPlayerCard, startBattle, state.playerDeck, state.totalRounds]);

  useEffect(() => {
    if (currentPlayerCard && currentBotCard && phase === 'selection') {
      isAdvancingRound.current = false;
      isTransitioning.current = false;
      playerAnim.value = 0; botAnim.value = 0; vsOpacity.value = 0; resultOp.value = 0;
      setShowResult(false); setShowPlayerEffect(false); setShowBotEffect(false);
      setIsBattleFinished(false);
      playerAnim.value = withDelay(80, withTiming(1, { duration: 280 }));
      botAnim.value = withDelay(240, withTiming(1, { duration: 280 }));
      vsOpacity.value = withDelay(440, withTiming(1, { duration: 200 }));
      if (entranceTimeout.current) clearTimeout(entranceTimeout.current);
      entranceTimeout.current = setTimeout(() => {
        setPhase('action');
        entranceTimeout.current = null;
      }, BATTLE_TIMINGS.cardEntrance);
    }
  }, [currentPlayerCard, currentBotCard, phase, state.currentRound]);

  // ── Bot AI: يقرر ويستخدم قدرته قبل الهجوم ──────────────────────────────
  const runBotAbility = useCallback(() => {
    if (isLocalTwoPlayer) return;
    if (!currentPlayerCard) return;
    const difficulty = (state.difficulty ?? 3) as DifficultyLevel;
    // السهل فقط لا يستخدم القدرات؛ بقية المستويات تتصرف مثل اللاعب قبل الهجوم.
    if (difficulty <= 1) return;

    const decision = decideBotAbility(
      state.botAbilities,
      currentPlayerCard,
      state,
      difficulty,
    );

    if (decision.useAbility && decision.abilityType) {
      activateAbility(decision.abilityType, decision.abilityData ?? {}, false);
      // لا نشغّل نغمة قدرة البوت هنا؛ هذا المسار يبدأ فقط بعد ضغط الهجوم.
      // يبقى صوت كرت الفائز هو الصوت القتالي الوحيد بعد الحسم.
    }
  }, [currentPlayerCard, state, activateAbility, isLocalTwoPlayer]);

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

  const handleEndBattle = useCallback(() => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('waiting');
    setIsBattleFinished(true);
    setShowResult(true);
    resultOp.value = withTiming(1, { duration: 300 });
  }, [hapticImpact]);

  const handleNextRound = useCallback(() => {
    if (isAdvancingRound.current) return;
    isAdvancingRound.current = true;
    if (nextRoundTimeout.current) {
      clearTimeout(nextRoundTimeout.current);
      nextRoundTimeout.current = null;
    }
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    const isFinalRound = state.currentRound >= Math.max(0, state.totalRounds - 1);
    if (isGameOver || isFinalRound) {
      handleEndBattle();
    } else {
      playNextRound();
      setPhase('selection');
      nextRound(state.currentRound);
      isTransitioning.current = false;
    }
  }, [isGameOver, state.currentRound, state.totalRounds, nextRound, hapticImpact, playNextRound, handleEndBattle]);

  const handleConfirmPrediction = useCallback(() => {
    activateAbility(predictionAbilityType, { predictions: predictionSelections }, abilityOwnerSide === 'player');
    playAbility();
    setShowPredictionModal(false); setPredictionSelections({});
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  }, [predictionAbilityType, predictionSelections, activateAbility, hapticImpact, playAbility, abilityOwnerSide]);

  const handleConfirmPopularity = useCallback(() => {
    if (selectedPopularityRound === null) return;
    activateAbility(popularityAbilityType, { round: selectedPopularityRound }, abilityOwnerSide === 'player');
    playAbility();
    setShowPopularityModal(false); setSelectedPopularityRound(null);
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  }, [popularityAbilityType, selectedPopularityRound, activateAbility, hapticImpact, playAbility, abilityOwnerSide]);

  // ── Choice modal handlers ────────────────────────────────────────────────
  const openChoiceModal = useCallback((abilityType: string) => {
    const isHostAbility = abilityOwnerSide === 'player';
    const ownPast = state.roundResults.map((r, i) => {
      const card = isHostAbility ? r.playerCard : r.botCard;
      return { value: String(i), label: `جولة ${r.round}: ${card.nameAr ?? card.name}` };
    });
    const opponentPast = state.roundResults.map((r, i) => {
      const card = isHostAbility ? r.botCard : r.playerCard;
      return { value: String(i), label: `جولة ${r.round}: ${card.nameAr ?? card.name}` };
    });

    if (abilityType === 'Propaganda') {
    setChoiceModal({ visible: true, title: '🎙️ بروباغاندا — اختر فئة الخصم', options: ALL_CLASSES.map(c => ({ value: c, label: CLASS_LABELS[c] })), abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'AddElement') {
      setChoiceModal({ visible: true, title: '👥 تغيير الفصيلة — اختر الفصيلة', options: ALL_FACTIONS.map(faction => ({ value: faction, label: `${RACE_EMOJI[faction]} ${RACE_LABELS[faction]}` })), abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'SwapClass') {
      setChoiceModal({ visible: true, title: '🔀 تبديل الفئة — اختر فئتك', options: ALL_CLASSES.map(c => ({ value: c, label: CLASS_LABELS[c] })), abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'Dilemma') {
      if (!opponentPast.length) { Alert.alert('لا يوجد كروت سابقة للخصم بعد'); return; }
      setChoiceModal({ visible: true, title: '🌀 الوهقة — اختر كرت الخصم السابق', options: opponentPast, abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'Recall') {
      if (!ownPast.length) { Alert.alert('لا يوجد كروت سابقة لك بعد'); return; }
      setChoiceModal({ visible: true, title: '🔄 استدعاء — اختر كرتك السابق', options: ownPast, abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'Revive') {
      if (!ownPast.length) { Alert.alert('لا يوجد كروت سابقة لك بعد'); return; }
      setChoiceModal({ visible: true, title: '💖 إنعاش — اختر كرتك (بنصف طاقاته)', options: ownPast, abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'Arise') {
      if (!opponentPast.length) { Alert.alert('لا يوجد كروت سابقة للخصم بعد'); return; }
      setChoiceModal({ visible: true, title: '👻 أرايز — اختر كرت الخصم السابق يصير كرتك', options: opponentPast, abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'Disaster') {
      if (!opponentPast.length) { Alert.alert('لا يوجد كروت سابقة للخصم بعد'); return; }
      setChoiceModal({ visible: true, title: '💣 النكبة — اختر كرت سابق للخصم', options: opponentPast, abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'Merge') {
      if (!ownPast.length) { Alert.alert('لا يوجد كروت سابقة لك بعد'); return; }
      setChoiceModal({ visible: true, title: '🔗 الدمج — اختر الكرت السابق تضيف طاقاته لكرتك', options: ownPast, abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'Sniping') {
      const futureRounds = Array.from(
        { length: state.totalRounds - state.currentRound - 1 },
        (_, i) => state.currentRound + i + 2
      );
      if (!futureRounds.length) { Alert.alert('لا توجد جولات قادمة للقنص'); return; }
      const options = futureRounds.map(r => ({ value: String(r), label: `جولة ${r}` }));
      setChoiceModal({ visible: true, title: '🎯 القناص — اختر الجولة التي ستفوز فيها', options, abilityType, ownerSide: abilityOwnerSide });

    } else if (abilityType === 'Subhan') {
      const currentBotAttack = (isHostAbility ? state.botDeck : state.playerDeck)[state.currentRound]?.attack ?? 0;
      const guessOptions = Array.from({ length: 15 }, (_, i) => currentBotAttack - 7 + i)
        .filter(v => v > 0)
        .map(v => ({ value: String(v), label: `هجوم: ${v}` }));
      setChoiceModal({ visible: true, title: '🔮 سبحان — خمّن هجوم كرت الخصم (±3)', options: guessOptions, abilityType, ownerSide: abilityOwnerSide });
    }
  }, [state.roundResults, state.currentRound, state.totalRounds, state.botDeck, abilityOwnerSide]);

  const handleChoiceSelect = useCallback((value: string) => {
    const { abilityType, ownerSide } = choiceModal;
    setChoiceModal(p => ({ ...p, visible: false }));

    const roundIndexAbilities = ['Dilemma', 'Disaster', 'Recall', 'Revive', 'Arise', 'Merge'];
    if (roundIndexAbilities.includes(abilityType)) {
      activateAbility(abilityType as any, { roundIndex: Number(value) }, ownerSide === 'player');
    } else if (abilityType === 'SwapClass') {
      activateAbility(abilityType as any, { myClass: value, oppClass: value }, ownerSide === 'player');
    } else if (abilityType === 'Sniping') {
      activateAbility(abilityType as any, { round: Number(value) }, ownerSide === 'player');
    } else if (abilityType === 'Subhan') {
      activateAbility(abilityType as any, { guessedAttack: Number(value) }, ownerSide === 'player');
    } else {
      activateAbility(abilityType as any, { selection: value, targetClass: value, faction: value }, ownerSide === 'player');
    }

    setIsAbilitiesModalOpen(false);
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    playAbility();
  }, [choiceModal, activateAbility, hapticImpact, playAbility]);

  // ── تحديث ذاكرة البوت بعد كل جولة ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'result' || !lastRoundResult) return;

    if (isTransitioning.current) return;
    isTransitioning.current = true;

    try {
      if (!isLocalTwoPlayer) updateBotMemory(lastRoundResult, undefined, state.botAbilities);

      // Show toasts for passive effects that triggered this round
      try {
        const roundNumber = lastRoundResult.round;
        state.activeEffects.forEach(effect => {
          if (effect.createdAtRound === roundNumber) {
            const prefix = effect.id.split('-')[0]; // e.g., "Greed"
            if (['Greed', 'Reinforcement', 'Revenge', 'Compensation', 'Weakening', 'Explosion', 'ConsecutiveLossBuff'].includes(prefix)) {
              const detail = ABILITY_DETAILS[prefix as AbilityType];
              const catConfig = detail ? CATEGORY_CONFIG[detail.category] : null;
              if (detail) {
                showToast({
                  title: `${catConfig?.emoji ?? '✨'} تفعيل: ${getAbilityNameOnly(prefix as AbilityType)}`,
                  subtitle: detail.effectAr,
                  target: effect.targetSide === 'player' ? 'player' : effect.targetSide === 'bot' ? 'bot' : 'all',
                  kind: detail.category === 'buff' ? 'buff' : detail.category === 'debuff' ? 'debuff' : 'info',
                  duration: 2800,
                });
              }
            }
          }
        });
      } catch (e) {
        console.warn('Error displaying passive toasts:', e);
      }

      setRoundHistory(prev => {
        if (prev.some(h => h.round === lastRoundResult.round)) return prev;
        return [...prev, lastRoundResult];
      });

      if (settings.showDamageNumbers) {
        if (lastRoundResult.botDamage > 0) spawnDmg('bot', lastRoundResult.botDamage, lastRoundResult.playerFactionAdvantage === 'strong' ? 'critical' : 'damage');
        if (lastRoundResult.playerDamage > 0) spawnDmg('player', lastRoundResult.playerDamage, lastRoundResult.botFactionAdvantage === 'strong' ? 'critical' : 'damage');
      }
    } catch (error) {
      console.error('Error processing round result:', error);
      isTransitioning.current = false;
    } finally {
      const winnerCard = lastRoundResult.winner === 'player'
        ? lastRoundResult.playerCard
        : lastRoundResult.winner === 'bot'
          ? lastRoundResult.botCard
          : null;
      // لا نضيف أي مؤثر صوتي عند نتيجة الهجوم؛ صوت فيديو الكرت الأقوى يبدأ قبل الهجوم فقط.

      const isFinalRound = lastRoundResult.round >= state.totalRounds;
      if (isGameOver || isFinalRound) {
        if (lastRoundResult.winner === 'player') hapticNotification(Haptics.NotificationFeedbackType.Success);
        else if (lastRoundResult.winner === 'bot') hapticNotification(Haptics.NotificationFeedbackType.Error);
        else hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
        if (nextRoundTimeout.current) clearTimeout(nextRoundTimeout.current);
        nextRoundTimeout.current = setTimeout(() => {
          handleEndBattle();
          nextRoundTimeout.current = null;
          isTransitioning.current = false;
        }, BATTLE_TIMINGS.autoNextRound) as unknown as NodeJS.Timeout;
      } else {
        hapticImpact(Haptics.ImpactFeedbackStyle.Light);
        if (nextRoundTimeout.current) clearTimeout(nextRoundTimeout.current);
        nextRoundTimeout.current = setTimeout(() => {
          if (isAdvancingRound.current) return;
          isAdvancingRound.current = true;
          setPhase('selection');
          nextRound(state.currentRound);
          nextRoundTimeout.current = null;
          isTransitioning.current = false;
        }, BATTLE_TIMINGS.autoNextRound) as unknown as NodeJS.Timeout;
      }
    }
  }, [phase, lastRoundResult, isGameOver, settings.showDamageNumbers, isLocalTwoPlayer, state.botAbilities, state.currentRound, state.totalRounds, nextRound, handleEndBattle]);

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
    ? getEffectiveStats(
      displayPlayerCard.attack, displayPlayerCard.defense, state.activeEffects, 'player', displayPlayerCard.cardClass, displayBotCard, displayPlayerCard,
      { ownScore: state.playerScore, opponentScore: state.botScore },
      { ownScore: state.botScore, opponentScore: state.playerScore },
    )
    : { attack: 0, defense: 0 };

  const botEffective = displayBotCard
    ? getEffectiveStats(
      displayBotCard.attack, displayBotCard.defense, state.activeEffects, 'bot', displayBotCard.cardClass, displayPlayerCard, displayBotCard,
      { ownScore: state.botScore, opponentScore: state.playerScore },
      { ownScore: state.playerScore, opponentScore: state.botScore },
    )
    : { attack: 0, defense: 0 };

  const computedWinner = useMemo(() => {
    if (phase === 'result' && lastRoundResult) {
      return lastRoundResult.winner;
    }
    return expectedRoundResult?.winner ?? 'draw';
  }, [phase, lastRoundResult, expectedRoundResult]);
  const turinPenaltyAudioWinner = useMemo(() => {
    const activePenalty = state.activeEffects.find(effect => {
      if (effect.kind !== 'turinPenalty') return false;
      const appliesToRound = (effect.data as { appliesToRound?: number } | undefined)?.appliesToRound;
      return appliesToRound === state.currentRound + 1;
    });
    if (!activePenalty) return null;
    return activePenalty.targetSide === 'player' ? 'bot' : activePenalty.targetSide === 'bot' ? 'player' : null;
  }, [state.activeEffects, state.currentRound]);
  // بعد اكتمال دخول الكروت تظهر نتيجة القوة المتوقعة؛ أي قدرة تغيّر الفائز تبدّل مصدر الصوت فوراً قبل الهجوم.
  const isRoundAudioActive = phase === 'action' || phase === 'combat' || (phase === 'result' && !!lastRoundResult);
  const audioWinner = turinPenaltyAudioWinner ?? computedWinner;
  const playerWinnerVideoAudio = settings.soundEnabled && shouldPlayRoundCardAudio(displayPlayerCard, isRoundAudioActive, audioWinner === 'player');
  const botWinnerVideoAudio = settings.soundEnabled && shouldPlayRoundCardAudio(displayBotCard, isRoundAudioActive, audioWinner === 'bot');


  const previewInsights = useMemo(() => {
    if (!expectedRoundResult || phase !== 'action') return [];
    const roundNumber = state.currentRound + 1;
    return [
      ...getActiveEffectPreview(state.activeEffects, 'player', roundNumber),
      ...getActiveEffectPreview(state.activeEffects, 'bot', roundNumber),
      ...buildRoundEventLog(expectedRoundResult),
    ];
  }, [expectedRoundResult, phase, state.activeEffects, state.currentRound]);

  const lastRoundInsights = useMemo(
    () => (lastRoundResult ? buildRoundEventLog(lastRoundResult) : []),
    [lastRoundResult],
  );
  const lastRoundTimeline = useMemo(
    () => (lastRoundResult ? buildRoundTimeline(lastRoundResult) : []),
    [lastRoundResult],
  );

  // حد الصحة ثابت خلال المباراة ويزداد فقط عند اكتساب صحة تتجاوز الحد السابق.
  const maxScore = Math.max(state.totalRounds, state.playerMaxHealth, state.botMaxHealth);

  const isExpectedLoss = expectedRoundResult?.winner === 'bot';
  const canRageNow = isExpectedLoss && !!currentPlayerCard && shouldTriggerRage(currentPlayerCard, rageState.current);
  const isFinalRoundResult = !!lastRoundResult && lastRoundResult.round >= state.totalRounds;

  const CHOICE_ABILITIES = ['Propaganda', 'AddElement', 'SwapClass', 'Dilemma', 'Recall', 'Revive', 'Arise', 'Disaster', 'Merge', 'Sniping', 'Subhan'];

  if (!displayPlayerCard || !displayBotCard) {
    return (<View style={S.root}><View style={S.loadWrap}><Text style={S.loadText}>جاري تحميل الساحة...</Text></View></View>);
  }

  return (
    <View style={S.root}>
      <StatusBar hidden />
      <View style={S.bgWrap}><LuxuryBackground /></View>
      <EffectToast />
      <AbilityActivationOverlay />
      <Animated.View style={[S.flashOverlay, flashStyle]} pointerEvents="none" />

      <SafeAreaView style={S.normalRoot}>
        <BattleResultOverlay
          visible={showResult && phase === 'waiting' && isBattleFinished}
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
          <View style={[S.topHud, { paddingHorizontal: hudPadding }]}>
            <View style={S.hudSide}>
              {isDeveloperVariant ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="منح كرت لا شيء لا شيء حدث للمطوّر"
                  testID="developer-nothing-happened-shortcut"
                  style={[S.avatar, S.developerAvatar, { borderColor: '#e879f9' }]}
                  onPress={handleDeveloperAbilityGrant}
                  activeOpacity={0.78}
                >
                  <Text style={{ fontSize: 18 }}>👤</Text>
                </TouchableOpacity>
              ) : <View style={[S.avatar, { borderColor: '#4ade80' }]}><Text style={{ fontSize: 18 }}>👤</Text></View>}
              <View style={S.hudInfo}>
                <Text style={[S.hudName, { color: '#4ade80' }]}>{playerLabel}</Text>
                <ScoreBar score={state.playerScore} maxScore={maxScore} color="#4ade80" />
              </View>
              <Text style={[S.hudScore, { color: '#4ade80' }]}>{state.playerScore}</Text>
            </View>
            <View style={S.hudCenter}>
              <Text style={S.hudRound}>جولة {state.currentRound + 1} / {state.totalRounds}</Text>
              <RoundBar current={state.currentRound} total={state.totalRounds} />
              <View style={S.hudHistoryRow}>
                <TouchableOpacity style={S.historyBtn} onPress={() => setIsHistoryModalOpen(true)} activeOpacity={0.75}>
                  <Text style={S.historyBtnText}>سجل الجولة ↗️</Text>
                </TouchableOpacity>
                {isLocalTwoPlayer && (
                  <TouchableOpacity style={[S.historyBtn, S.abilityHistoryBtn]} onPress={() => setIsUsedAbilitiesModalOpen(true)} activeOpacity={0.75}>
                    <Text style={S.historyBtnText}>⚡ كروت القدرات</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={[S.hudSide, S.hudSideRight]}>
              <Text style={[S.hudScore, { color: '#f87171' }]}>{state.botScore}</Text>
              <View style={S.hudInfo}>
                <Text style={[S.hudName, { color: '#f87171', textAlign: 'right' }]}>{opponentLabel}</Text>
                <ScoreBar score={state.botScore} maxScore={maxScore} color="#f87171" reverse />
              </View>
              <View style={[S.avatar, { borderColor: '#f87171' }]}><Text style={{ fontSize: 18 }}>{isLocalTwoPlayer ? '🤝' : '🤖'}</Text></View>
            </View>
          </View>

          {/* ══ ARENA — في الوضع العمودي: البوت ← الأوامر ← اللاعب ══ */}
          <Animated.View
            testID="battle-arena"
            layout={layoutTransition}
            style={[
              S.arena,
              orientationStyle,
              {
                paddingHorizontal: arenaPadding,
                paddingVertical: isLandscape ? 0 : Math.max(4, arenaGap / 2),
                gap: arenaGap,
                flexDirection: isLandscape ? 'row' : 'column-reverse',
              },
            ]}
          >

            {/* PLAYER PANEL */}
            <View testID="battle-player-panel" style={[S.playerPanel, !isLandscape && S.panelPortrait]}>
              <Text style={S.panelLabel}>{playerLabel}</Text>
              <View style={S.cardWithSideEffects}>
                <ActiveEffectsBar effects={state.activeEffects} side="player" card={displayPlayerCard} opponentCard={displayBotCard} ownScore={state.playerScore} opponentScore={state.botScore} compact roundNumber={activeRoundNumber} />
                <Animated.View style={playerStyle}>
                  <LuxuryCharacterCardAnimated
                    card={displayPlayerCard}
                    style={{ width: cardWidth, height: cardHeight }}
                    isOpenedView={playerWinnerVideoAudio}
                    playAudio={playerWinnerVideoAudio}
                    effectiveAttack={playerEffective.attack}
                    effectiveDefense={playerEffective.defense}
                    slashEffect={botZoroCutActive}
                    winnerState={
                      computedWinner === 'player'
                        ? (phase === 'result' ? 'winner' : 'leading')
                        : null
                    }
                  />
                </Animated.View>
              </View>
              {activeDamageNumbers.filter(n => n.side === 'player').map(n => (
                <DamageNumber key={n.id} value={n.value} variant={n.variant} onComplete={() => removeDmg(n.id)} />
              ))}
              <AdvantageChip
                advantage={lastRoundResult?.playerFactionAdvantage ?? 'neutral'}
                faction={displayPlayerCard.race}
              />
            </View>

            {/* CENTER PANEL */}
            <View testID="battle-command-panel" style={[
              S.centerPanel,
              !isLandscape && S.centerPanelPortrait,
              {
                width: isLandscape ? centerWidth : portraitCommandWidth,
                gap: Math.max(6, arenaGap),
              },
            ]}>
              <Animated.View style={vsStyle}>
                <Text style={[S.vsText, { fontSize: isCompact ? 20 : 28 }]}>⚔️</Text>
              </Animated.View>

              {phase === 'action' && expectedRoundResult && (
                <RoundInsightPanel
                  testID="round-preview"
                  title="🔎 معاينة الجولة"
                  insights={previewInsights}
                  compact={!isLandscape}
                />
              )}

              {phase === 'result' && lastRoundResult && (
                <Animated.View style={[S.resultChip, resultStyle]}>
                  <Text style={[
                    S.resultText,
                    lastRoundResult.winner === 'player' ? S.resultWin
                    : lastRoundResult.winner === 'bot' ? S.resultLose
                    : S.resultDraw,
                  ]}>
                    {lastRoundResult.winner === 'player' ? (isLocalTwoPlayer ? '🏆 فاز المضيف' : '🏆 فزت')
                      : lastRoundResult.winner === 'bot' ? (isLocalTwoPlayer ? '🏆 فاز الضيف' : '💀 خسرت')
                      : '🤝 تعادل'}
                  </Text>
                </Animated.View>
              )}

              {phase === 'result' && lastRoundResult && (
                <RoundTimelinePanel
                  testID="round-result-timeline"
                  steps={lastRoundTimeline}
                  compact={!isLandscape}
                />
              )}

              {phase === 'result' && lastRoundResult && (
                <RoundInsightPanel
                  testID="round-event-log"
                  title={`📝 أحداث الجولة ${lastRoundResult.round}`}
                  insights={lastRoundInsights}
                  compact={!isLandscape}
                />
              )}

              {phase === 'action' && (
                <View style={[
                  S.actionButtons,
                  !isLandscape && S.actionButtonsPortrait,
                  { gap: Math.max(6, arenaGap) },
                ]}>
                  {/* Ability button */}
                  <TouchableOpacity
                    style={[S.abilityBtn, { width: commandButtonWidth, height: actionButtonHeight }, state.playerAbilities.every(a => a.used) && S.abilityBtnDisabled]}
                    onPress={() => { setAbilityOwnerSide('player'); setIsAbilitiesModalOpen(true); }}
                    disabled={state.playerAbilities.every(a => a.used)}
                    activeOpacity={0.8}
                  >
                    <Text style={S.abilityBtnText}>{isLocalTwoPlayer ? '✨ قدرة المضيف' : '✨ قدرة'}</Text>
                  </TouchableOpacity>

                  {isLocalTwoPlayer && (
                    <TouchableOpacity
                      style={[S.abilityBtn, S.guestAbilityBtn, { width: commandButtonWidth, height: actionButtonHeight }, state.botAbilities.every(a => a.used) && S.abilityBtnDisabled]}
                      onPress={() => { setAbilityOwnerSide('bot'); setIsAbilitiesModalOpen(true); }}
                      disabled={state.botAbilities.every(a => a.used)}
                      activeOpacity={0.8}
                    >
                      <Text style={S.abilityBtnText}>✨ قدرة الضيف</Text>
                    </TouchableOpacity>
                  )}

                  {/* Attack button */}
                  <TouchableOpacity style={[S.attackBtn, { width: commandButtonWidth, height: actionButtonHeight }]} onPress={handleExecuteAttack} activeOpacity={0.85}>
                    <Text style={S.attackBtnText}>⚔️ هجوم</Text>
                  </TouchableOpacity>

                  {canRageNow && (
                    <TouchableOpacity
                      style={[S.rageBtn, { width: commandButtonWidth, height: actionButtonHeight }]}
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

              {phase === 'result' && !isGameOver && !isFinalRoundResult && (
                <TouchableOpacity style={[S.nextBtn, { width: actionButtonWidth, height: actionButtonHeight }]} onPress={handleNextRound} activeOpacity={0.85}>
                  <Text style={S.nextBtnText}>التالي ▶</Text>
                </TouchableOpacity>
              )}

              {phase === 'result' && (isGameOver || isFinalRoundResult) && (
                <TouchableOpacity style={[S.endBattleBtn, { width: actionButtonWidth, height: actionButtonHeight }]} onPress={handleEndBattle} activeOpacity={0.85}>
                  <Text style={S.endBattleBtnText}>إنهاء المعركة 🏁</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* BOT PANEL */}
            <View testID="battle-bot-panel" style={[S.botPanel, !isLandscape && S.panelPortrait]}>
              <Text style={[S.panelLabel, { textAlign: 'right' }]}>{opponentLabel}</Text>
              <View style={S.cardWithSideEffects}>
                <Animated.View style={botStyle}>
                  <LuxuryCharacterCardAnimated
                    card={displayBotCard}
                    style={{ width: cardWidth, height: cardHeight }}
                    isOpenedView={botWinnerVideoAudio}
                    playAudio={botWinnerVideoAudio}
                    effectiveAttack={botEffective.attack}
                    effectiveDefense={botEffective.defense}
                    slashEffect={playerZoroCutActive}
                    winnerState={
                      computedWinner === 'bot'
                        ? (phase === 'result' ? 'winner' : 'leading')
                        : null
                    }
                  />
                </Animated.View>
                <ActiveEffectsBar effects={state.activeEffects} side="bot" card={displayBotCard} opponentCard={displayPlayerCard} ownScore={state.botScore} opponentScore={state.playerScore} compact roundNumber={activeRoundNumber} />
              </View>
              {activeDamageNumbers.filter(n => n.side === 'bot').map(n => (
                <DamageNumber key={n.id} value={n.value} variant={n.variant} onComplete={() => removeDmg(n.id)} />
              ))}
              <AdvantageChip
                advantage={lastRoundResult?.botFactionAdvantage ?? 'neutral'}
                faction={displayBotCard.race}
              />
            </View>
          </Animated.View>
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
                <View key={i} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: '#e2e8f0', fontSize: 12, textAlign: 'right', marginBottom: 5 }}>
                    ج{h.round}: {h.playerCard.nameAr ?? h.playerCard.name} ضد {h.botCard.nameAr ?? h.botCard.name}
                  </Text>
                  <RoundInsightPanel title="تفاصيل الجولة" insights={buildRoundEventLog(h)} />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={cm.cancel} onPress={() => setIsHistoryModalOpen(false)}>
              <Text style={cm.cancelText}>إغلاق</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Used abilities history — local two-player only ── */}
      <Modal visible={isUsedAbilitiesModalOpen} transparent animationType="slide" onRequestClose={() => setIsUsedAbilitiesModalOpen(false)}>
        <TouchableOpacity style={cm.overlay} activeOpacity={1} onPress={() => setIsUsedAbilitiesModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[S.abilitiesBox, { padding: modalPadding }]}>
            <Text style={[cm.title, { marginBottom: modalTitleMargin }]}>⚡ كروت القدرات المستخدمة</Text>
            <Text style={S.usedAbilityHint}>يمكن الرجوع هنا إلى كروت المضيف والضيف التي فُعّلت في هذه المباراة.</Text>
            {usedLocalAbilities.length === 0 ? (
              <Text style={S.emptyAbilityHistory}>لا توجد كروت قدرات مستخدمة بعد</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.usedAbilitiesScroll}>
                {usedLocalAbilities.map(entry => (
                  <View key={entry.id} style={S.usedAbilityEntry}>
                    <Text style={[S.usedAbilityOwner, { color: entry.ownerColor }]}>استعملها {entry.owner}</Text>
                    <AbilityCard ability={entry.ability} showActionButtons={false} style={{ width: modalAbilityCardW, height: modalAbilityCardH }} />
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[cm.cancel, { marginTop: modalCancelMargin }]} onPress={() => setIsUsedAbilitiesModalOpen(false)}>
              <Text style={cm.cancelText}>إغلاق</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Abilities Modal ── */}
      <Modal visible={isAbilitiesModalOpen} transparent animationType="slide" onRequestClose={() => setIsAbilitiesModalOpen(false)}>
        <TouchableOpacity style={cm.overlay} activeOpacity={1} onPress={() => setIsAbilitiesModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[S.abilitiesBox, { padding: modalPadding }]}>
            <Text style={[cm.title, { marginBottom: modalTitleMargin }]}>✨ قدرات {abilityOwnerSide === 'player' ? playerLabel : opponentLabel}</Text>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', gap: modalGap, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' }}
            >
              {(abilityOwnerSide === 'player' ? state.playerAbilities : state.botAbilities).map((ab, i) => {
                const abilityData = buildAbilityCardData(ab.type, !ab.used);

                return (
                  <TouchableOpacity
                    key={i}
                    style={{ opacity: ab.used ? 0.45 : 1 }}
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
                        activateAbility(ab.type, {}, abilityOwnerSide === 'player');
                        setIsAbilitiesModalOpen(false);
                        hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                        playAbility();
                      }
                    }}
                    disabled={ab.used}
                    activeOpacity={0.8}
                  >
                    <AbilityCard
                      ability={abilityData}
                      showActionButtons={false}
                      style={{ width: modalAbilityCardW, height: modalAbilityCardH }}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[cm.cancel, { marginTop: modalCancelMargin }]} onPress={() => setIsAbilitiesModalOpen(false)}>
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
  root: { flex: 1, backgroundColor: COLOR.bgDeep },
  bgWrap: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  normalRoot: { flex: 1 },
  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 99, pointerEvents: 'none' },
  screen: { flex: 1, flexDirection: 'column', paddingTop: SPACE.sm, paddingBottom: SPACE.sm, zIndex: 1 },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText: { color: COLOR.gold, fontSize: FONT.lg },

  topHud: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, gap: SPACE.sm, backgroundColor: 'rgba(7,20,27,0.78)', borderBottomWidth: 1, borderBottomColor: 'rgba(57,230,208,0.14)' },
  hudSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  hudSideRight: { flexDirection: 'row-reverse' },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, backgroundColor: 'rgba(7,20,27,0.88)', alignItems: 'center', justifyContent: 'center' },
  developerAvatar: { borderStyle: 'dashed', backgroundColor: 'rgba(232,121,249,0.16)' },
  hudInfo: { flex: 1, gap: 3 },
  hudName: { fontSize: FONT.xs, fontWeight: '700', letterSpacing: 0.5 },
  hudScore: { fontSize: FONT.xl, fontWeight: '900', minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] } as any,
  hudCenter: { flex: 1.2, alignItems: 'center', gap: 3 },
  hudRound: { color: COLOR.gold, fontSize: FONT.xs, fontWeight: '700', letterSpacing: 0.4 },
  hudHistoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  historyBtn: { paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.sm, backgroundColor: 'rgba(57,230,208,0.08)', borderWidth: 1, borderColor: 'rgba(57,230,208,0.20)' },
  historyBtnText: { color: '#BFFAF2', fontSize: FONT.xs - 1 },
  abilityHistoryBtn: { backgroundColor: 'rgba(232,121,249,0.12)', borderColor: 'rgba(232,121,249,0.35)' },

  arena: { flex: 1, gap: SPACE.sm },
  playerPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.xs },
  botPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.xs },
  cardWithSideEffects: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%' },
  // الوضع العمودي يوزع البوت أعلى شريط الأوامر واللاعب أسفله.
  panelPortrait: { minHeight: 0 },
  centerPanel: { width: 120, alignItems: 'center', justifyContent: 'center', gap: SPACE.md },
  centerPanelPortrait: { minHeight: 0, maxHeight: 156, flexGrow: 0, flexShrink: 1, gap: 6, alignSelf: 'center' },
  panelLabel: { color: 'rgba(191,250,242,0.72)', fontSize: FONT.xs, letterSpacing: 0.5 },

  vsText: { fontSize: 28, opacity: 0.85 },
  resultChip: { backgroundColor: 'rgba(5,15,20,0.88)', borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderWidth: 1, borderColor: 'rgba(57,230,208,0.22)' },
  resultText: { fontSize: FONT.sm, fontWeight: '700', textAlign: 'center' },
  resultWin: { color: '#4ade80' },
  resultLose: { color: '#f87171' },
  resultDraw: { color: '#fbbf24' },

  actionButtons: { gap: SPACE.sm, alignItems: 'center', width: '100%' },
  actionButtonsPortrait: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', gap: 8 },
  abilityBtn: { 
    width: 110, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(57,230,208,0.14)',
    borderRadius: RADIUS.md, 
    borderWidth: 1.5, 
    borderColor: 'rgba(57,230,208,0.54)',
    shadowColor: COLOR.gold,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  abilityBtnDisabled: { opacity: 0.35 },
  guestAbilityBtn: { backgroundColor: 'rgba(251,113,133,0.14)', borderColor: 'rgba(251,113,133,0.54)' },
  abilityBtnText: { color: '#BFFAF2', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  attackBtn: { 
    width: 110, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(251,113,133,0.16)',
    borderRadius: RADIUS.md, 
    borderWidth: 1.5, 
    borderColor: 'rgba(251,113,133,0.62)',
    shadowColor: '#FB7185',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  attackBtnText: { color: '#FFE4E6', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  rageBtn: { 
    width: 110, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(251,146,60,0.22)', 
    borderRadius: RADIUS.md, 
    borderWidth: 1.5, 
    borderColor: 'rgba(251,146,60,0.7)',
    shadowColor: '#fb923c',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  rageBtnText: { color: '#fed7aa', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  nextBtn: { 
    width: 110, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(57,230,208,0.16)',
    borderRadius: RADIUS.md, 
    borderWidth: 1.5, 
    borderColor: 'rgba(57,230,208,0.52)',
    shadowColor: COLOR.gold,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  nextBtnText: { color: COLOR.gold, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  endBattleBtn: { 
    width: 110, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(57,230,208,0.22)',
    borderRadius: RADIUS.md, 
    borderWidth: 1.5, 
    borderColor: COLOR.gold,
    shadowColor: COLOR.gold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  endBattleBtnText: { color: COLOR.gold, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  abilitiesBox: {
    width: '90%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: 'rgba(7,20,27,0.98)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(57,230,208,0.30)',
    padding: 16,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  usedAbilityHint: { color: '#94a3b8', fontSize: 11, textAlign: 'center', writingDirection: 'rtl', marginBottom: 8 },
  emptyAbilityHistory: { color: '#94a3b8', textAlign: 'center', paddingVertical: 24, writingDirection: 'rtl' },
  usedAbilitiesScroll: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-start' },
  usedAbilityEntry: { alignItems: 'center', gap: 6 },
  usedAbilityOwner: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
});
