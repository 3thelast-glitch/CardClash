/**
 * SandboxScreen — أداة اختبار حرة
 *
 * مطابق بصرياً لـ battle.tsx 100% (HUD + Arena + styles)
 * الفرق: جولة واحدة أو متعددة يختارها المستخدم
 *
 * ميزات:
 *  - SessionConfigBar: اختيار عدد الجولات (1–10)
 *  - اللاعب يختار كرته وقدرته يدوياً + البوت أيضاً
 *  - SessionResultCard بعد انتهاء كل الجولات
 *  - HistoryModal يعرض كل جولة بكرتيها ونتيجتها
 *  - إعادة الجولة / جولة جديدة / إعادة الجلسة
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  Modal, ScrollView, FlatList, TextInput,
  Image, useWindowDimensions,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, withSequence,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { COLOR, SPACE, RADIUS, FONT, SHADOW } from '@/components/ui/design-tokens';
import { ALL_CARDS, determineRoundWinner } from '@/lib/game/cards-data-exports';
import {
  Card, AbilityType, Race, RACE_EMOJI,
} from '@/lib/game/types';
import { getCardImage } from '@/lib/game/get-card-image';
import { getAbilityNameAr, getAbilityDescription } from '@/lib/game/ability-names';

// ─── الكروت والقدرات ────────────────────────────────────────────────────────
const CARDS = ALL_CARDS;

const ALL_ABILITIES: AbilityType[] = [
  'LogicalEncounter','Recall','Protection','Arise','Reinforcement','Wipe','Purge',
  'HalvePoints','Seal','DoubleOrNothing','StarSuperiority','Reduction','Sacrifice',
  'Popularity','Eclipse','CancelAbility','Revive','ConsecutiveLossBuff','Lifesteal',
  'Revenge','Suicide','Disaster','Compensation','Weakening','Misdirection','StealAbility',
  'Rescue','Trap','ConvertDebuffsToBuffs','Sniping','Merge','DoubleNextCards','Deprivation',
  'Greed','Dilemma','Propaganda','DoubleYourBuffs','Avatar','Penetration','Pool',
  'Conversion','Shield','SwapClass','TakeIt','Skip','Explosion','DoublePoints',
];

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af', rare: '#60a5fa', epic: '#c084fc',
  legendary: '#fbbf24', special: '#e879f9',
};

const EMPTY: Card = {
  id: '', name: '', nameAr: '', attack: 10, defense: 5,
  race: 'human', cardClass: 'warrior', element: 'fire', rarity: 'common', stars: 1,
};

// ─── Round progress bar (نسخة من battle.tsx) ──────────────────────────────
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
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'visible', position: 'relative' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: COLOR.gold, borderRadius: 3 },
  tick: { position: 'absolute', top: -2, width: 2, height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1, marginLeft: -1 },
  tickDone: { backgroundColor: 'rgba(228,165,42,0.6)' },
});

// ─── Score bar (نسخة من battle.tsx) ───────────────────────────────────────
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
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, position: 'absolute', left: 0 },
  fillRight: { left: undefined, right: 0 },
});

// ─── Faction tab data ──────────────────────────────────────────────────────
const FACTION_TABS: { key: Race | 'all'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'human', label: '👤 بشر' },
  { key: 'elf', label: '🧝 ألف' },
  { key: 'orc', label: '👹 أورك' },
  { key: 'dragon', label: '🐉 تنين' },
  { key: 'demon', label: '😈 شيطان' },
  { key: 'undead', label: '💀 ميت' },
  { key: 'monster', label: '👾 وحش' },
  { key: 'robot', label: '🤖 روبوت' },
];

// ─── CardPickerModal ───────────────────────────────────────────────────────
function CardPickerModal({ visible, onClose, onSelect, side, selectedId }: {
  visible: boolean; onClose: () => void; onSelect: (c: Card) => void;
  side: 'player' | 'bot'; selectedId: string;
}) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Race | 'all'>('all');

  const filtered = useMemo(() =>
    CARDS.filter(c => {
      if (activeTab !== 'all' && c.race !== activeTab) return false;
      if (!search) return true;
      return c.nameAr?.includes(search) || c.name.toLowerCase().includes(search.toLowerCase());
    }),
    [search, activeTab]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <View style={S.cardPickerSheet}>
          {/* Header */}
          <View style={S.modalHeader}>
            <Text style={S.modalTitle}>
              {side === 'player' ? '👤' : '🤖'} 🃏 اختر كرت
            </Text>
            <TouchableOpacity onPress={onClose} style={S.modalClose}>
              <Text style={S.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Faction tab bar */}
          <View style={S.tabBar}>
            {FACTION_TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[S.tabItem, activeTab === tab.key && S.tabItemActive]}
                onPress={() => { setActiveTab(tab.key); setSearch(''); }}
                activeOpacity={0.8}
              >
                <Text style={[S.tabText, activeTab === tab.key && S.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search bar with clear button */}
          <View style={{ position: 'relative' }}>
            <TextInput
              style={S.searchInput}
              placeholder="ابحث عن كرت..."
              placeholderTextColor="#475569"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity
                style={S.searchClearBtn}
                onPress={() => setSearch('')}
                activeOpacity={0.7}
              >
                <Text style={S.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Grid */}
          <FlatList
            data={filtered}
            keyExtractor={c => c.id}
            numColumns={3}
            contentContainerStyle={{ padding: SPACE.sm, gap: SPACE.xs }}
            columnWrapperStyle={{ gap: SPACE.xs }}
            renderItem={({ item }) => {
              const rc = RARITY_COLORS[item.rarity ?? 'common'];
              const factionColor = '#A78BFA';
              const img = getCardImage(item);
              const isSelected = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={[
                    S.thumbCard,
                    { borderColor: rc + '88' },
                    isSelected && S.thumbSelected,
                  ]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.8}
                >
                  {isSelected && <Text style={S.thumbCheck}>✓</Text>}
                  {img
                    ? <Image source={img} style={S.thumbImg} resizeMode="cover" />
                    : <View style={[S.thumbPlaceholder, { backgroundColor: factionColor + '18' }]}>
                        <Text style={{ fontSize: 28 }}>{item.emoji || RACE_EMOJI[item.race] || '🃏'}</Text>
                      </View>
                  }
                  <Text style={[S.thumbName, { color: rc }]} numberOfLines={2}>
                    {item.nameAr || item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── AbilitiesModal ───────────────────────────────────────────────────────
function AbilitiesModal({ visible, current, onClose, onSelect, cardName }: {
  visible: boolean;
  current: AbilityType | undefined;
  onClose: () => void;
  onSelect: (ab: AbilityType | undefined) => void;
  cardName: string;
}) {
  const [pending, setPending] = useState<AbilityType | undefined | '__none__'>(undefined);

  // Sync pending with current when modal opens
  useEffect(() => {
    if (visible) setPending(current === undefined ? '__none__' : current);
  }, [visible, current]);

  const handleConfirm = useCallback(() => {
    onSelect(pending === '__none__' ? undefined : (pending as AbilityType));
    onClose();
  }, [pending, onSelect, onClose]);

  const starsForIndex = (i: number) => {
    if (i < 10) return '⭐';
    if (i < 25) return '⭐⭐';
    return '⭐⭐⭐';
  };

  const headerTitle = cardName
    ? `⚡ القدرات — ${cardName}`
    : '⚡ اختر كرت أولاً';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={S.abilitiesModal}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
        >
          {/* Header */}
          <View style={S.modalHeader}>
            <Text style={S.modalTitle} numberOfLines={1}>{headerTitle}</Text>
            <TouchableOpacity onPress={onClose} style={S.modalClose}>
              <Text style={S.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Ability list */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* بدون قدرة */}
            <TouchableOpacity
              style={[
                S.abilityRow,
                pending === '__none__' ? S.abilityRowActive : S.abilityRowInactive,
              ]}
              onPress={() => setPending('__none__')}
              activeOpacity={0.85}
            >
              <View style={S.abilityRowLeft}>
                <Text style={{ fontSize: 16 }}>⊘</Text>
              </View>
              <View style={S.abilityRowCenter}>
                <Text style={S.abilityRowName}>بدون قدرة</Text>
                <Text style={S.abilityRowDesc} numberOfLines={1}>لا تستخدم أي قدرة</Text>
              </View>
              {pending === '__none__' && <Text style={S.abilityRowCheck}>✓</Text>}
            </TouchableOpacity>

            {ALL_ABILITIES.map((ab, i) => {
              const isActive = pending === ab;
              return (
                <TouchableOpacity
                  key={ab}
                  style={[
                    S.abilityRow,
                    isActive ? S.abilityRowActive : S.abilityRowInactive,
                  ]}
                  onPress={() => setPending(ab)}
                  activeOpacity={0.85}
                >
                  <View style={S.abilityRowLeft}>
                    <Text style={{ fontSize: 10 }}>{starsForIndex(i)}</Text>
                  </View>
                  <View style={S.abilityRowCenter}>
                    <Text style={S.abilityRowName}>
                      {getAbilityNameAr(ab).split('(')[0].trim()}
                    </Text>
                    <Text style={S.abilityRowDesc} numberOfLines={1}>
                      {getAbilityDescription(ab)}
                    </Text>
                  </View>
                  {isActive && <Text style={S.abilityRowCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Confirm button */}
          <TouchableOpacity
            style={[S.confirmBtn, pending === undefined && S.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={pending === undefined}
            activeOpacity={0.85}
          >
            <Text style={S.confirmBtnText}>✅ تأكيد</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────
type SandboxPhase = 'idle' | 'combat' | 'result' | 'sessionOver';

interface RoundRecord {
  round: number;
  playerCard: Card;
  botCard: Card;
  winner: string;
  playerDmg: number;
  botDmg: number;
  log: string[];
}

// ────────────────────────── MAIN SCREEN ──────────────────────────
export default function SandboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 520;
  const arenaCardStyle = {
    width: isCompactPhone ? 112 : 150,
    height: isCompactPhone ? 157 : 210,
  };

  // ── الكروت والقدرات ──
  const [playerCard, setPlayerCard] = useState<Card>(EMPTY);
  const [botCard, setBotCard] = useState<Card>(EMPTY);
  const [playerAbility, setPlayerAbility] = useState<AbilityType | undefined>(undefined);
  const [botAbility, setBotAbility] = useState<AbilityType | undefined>(undefined);

  // ── إعداد الجلسة ──
  const [totalRounds, setTotalRounds] = useState(1);
  const [sessionStarted, setSessionStarted] = useState(false);

  // ── تقدم الجلسة ──
  const [currentRound, setCurrentRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [roundHistory, setRoundHistory] = useState<RoundRecord[]>([]);

  // ── مرحلة الجولة ──
  const [phase, setPhase] = useState<SandboxPhase>('idle');
  const [lastResult, setLastResult] = useState<{ winner: string; playerDmg: number; botDmg: number; log: string[] } | null>(null);

  // ── modals ──
  const [pickingPlayer, setPickingPlayer] = useState(false);
  const [pickingBot, setPickingBot] = useState(false);
  const [abPlayer, setAbPlayer] = useState(false);
  const [abBot, setAbBot] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ── animations (نفس battle.tsx) ──
  const playerAnim = useSharedValue(0);
  const botAnim = useSharedValue(0);
  const vsOpacity = useSharedValue(0);
  const flashAnim = useSharedValue(0);

  const playerAnimStyle = useAnimatedStyle(() => ({
    opacity: playerAnim.value,
    transform: [{ translateX: (1 - playerAnim.value) * -40 }],
  }));
  const botAnimStyle = useAnimatedStyle(() => ({
    opacity: botAnim.value,
    transform: [{ translateX: (1 - botAnim.value) * 40 }],
  }));
  const vsAnimStyle = useAnimatedStyle(() => ({ opacity: vsOpacity.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashAnim.value }));

  // ── Helper: تشغيل الأنيميشن ──
  const triggerEntrance = useCallback(() => {
    playerAnim.value = 0; botAnim.value = 0; vsOpacity.value = 0;
    playerAnim.value = withDelay(80, withTiming(1, { duration: 280 }));
    botAnim.value = withDelay(240, withTiming(1, { duration: 280 }));
    vsOpacity.value = withDelay(440, withTiming(1, { duration: 200 }));
  }, []);

  // عند تغيير الكرت شغّل الأنيميشن
  useEffect(() => {
    if (playerCard.id || botCard.id) triggerEntrance();
  }, [playerCard.id, botCard.id]);

  // ── Helper: تصفير الكروت والقدرات ──
  const resetCardChoices = useCallback(() => {
    setPlayerCard(EMPTY);
    setBotCard(EMPTY);
    setPlayerAbility(undefined);
    setBotAbility(undefined);
    triggerEntrance();
  }, [triggerEntrance]);

  // ── Logic: بدء الجلسة ──
  const startSession = useCallback(() => {
    setSessionStarted(true);
    setCurrentRound(0);
    setPlayerScore(0);
    setBotScore(0);
    setRoundHistory([]);
    setPhase('idle');
    setLastResult(null);
    resetCardChoices();
  }, [resetCardChoices]);

  // ── Logic: تشغيل المحاكاة ──
  const runSim = useCallback(() => {
    if (!playerCard.id || !botCard.id) return;
    flashAnim.value = withSequence(
      withTiming(0.35, { duration: 60 }),
      withTiming(0, { duration: 300 }),
    );
    setPhase('combat');
    setTimeout(() => {
      const res = determineRoundWinner(playerCard, botCard, [], []);
      const log: string[] = [];

      if (res.playerFactionAdvantage !== 'neutral')
        log.push(`${RACE_EMOJI[playerCard.race]} أفضلية فصيلية للاعب: ${res.playerFactionAdvantage === 'strong' ? 'قوية ⬆️' : 'ضعيفة ⬇️'}`);
      if (res.botFactionAdvantage !== 'neutral')
        log.push(`${RACE_EMOJI[botCard.race]} أفضلية فصيلية للبوت: ${res.botFactionAdvantage === 'strong' ? 'قوية ⬆️' : 'ضعيفة ⬇️'}`);

      log.push(`⚔️ ضرر اللاعب: ${res.playerBaseDamage} → صافي: ${res.playerDamage}`);
      log.push(`🤖 ضرر البوت:  ${res.botBaseDamage} → صافي: ${res.botDamage}`);

      if (playerAbility) log.push(`⚡ قدرة اللاعب: ${getAbilityNameAr(playerAbility).split('(')[0].trim()}`);
      if (botAbility) log.push(`⚡ قدرة البوت:  ${getAbilityNameAr(botAbility).split('(')[0].trim()}`);

      const resultData = {
        winner: res.winner,
        playerDmg: res.playerDamage,
        botDmg: res.botDamage,
        log,
      };

      setLastResult(resultData);

      if (res.winner === 'player') setPlayerScore(prev => prev + 1);
      else if (res.winner === 'bot') setBotScore(prev => prev + 1);

      setRoundHistory(prev => [...prev, {
        round: currentRound + 1,
        playerCard,
        botCard,
        ...resultData,
      }]);

      setPhase('result');
    }, 700);
  }, [playerCard, botCard, playerAbility, botAbility, currentRound]);

  // ── Logic: جولة جديدة ──
  const nextRound = useCallback(() => {
    const nextIdx = currentRound + 1;
    if (nextIdx >= totalRounds) {
      setPhase('sessionOver');
    } else {
      setCurrentRound(nextIdx);
      setPhase('idle');
      setLastResult(null);
      resetCardChoices();
    }
  }, [currentRound, totalRounds, resetCardChoices]);

  // ── Logic: إعادة الجولة (نفس الكروت) ──
  const repeatRound = useCallback(() => {
    setPhase('idle');
    setLastResult(null);
    // نعيد المحاكاة بعد إطار واحد حتى تتحدث الحالة
    setTimeout(() => {
      if (playerCard.id && botCard.id) {
        flashAnim.value = withSequence(
          withTiming(0.35, { duration: 60 }),
          withTiming(0, { duration: 300 }),
        );
        setPhase('combat');
        setTimeout(() => {
          const res = determineRoundWinner(playerCard, botCard, [], []);
          const log: string[] = [];

          if (res.playerFactionAdvantage !== 'neutral')
            log.push(`${RACE_EMOJI[playerCard.race]} أفضلية فصيلية للاعب: ${res.playerFactionAdvantage === 'strong' ? 'قوية ⬆️' : 'ضعيفة ⬇️'}`);
          if (res.botFactionAdvantage !== 'neutral')
            log.push(`${RACE_EMOJI[botCard.race]} أفضلية فصيلية للبوت: ${res.botFactionAdvantage === 'strong' ? 'قوية ⬆️' : 'ضعيفة ⬇️'}`);

          log.push(`⚔️ ضرر اللاعب: ${res.playerBaseDamage} → صافي: ${res.playerDamage}`);
          log.push(`🤖 ضرر البوت:  ${res.botBaseDamage} → صافي: ${res.botDamage}`);

          if (playerAbility) log.push(`⚡ قدرة اللاعب: ${getAbilityNameAr(playerAbility).split('(')[0].trim()}`);
          if (botAbility) log.push(`⚡ قدرة البوت:  ${getAbilityNameAr(botAbility).split('(')[0].trim()}`);

          const resultData = { winner: res.winner, playerDmg: res.playerDamage, botDmg: res.botDamage, log };
          setLastResult(resultData);

          if (res.winner === 'player') setPlayerScore(prev => prev + 1);
          else if (res.winner === 'bot') setBotScore(prev => prev + 1);

          setRoundHistory(prev => [...prev, {
            round: currentRound + 1,
            playerCard,
            botCard,
            ...resultData,
          }]);

          setPhase('result');
        }, 700);
      }
    }, 50);
  }, [playerCard, botCard, playerAbility, botAbility, currentRound]);

  // ── Logic: إعادة الجلسة ──
  const resetSession = useCallback(() => {
    setSessionStarted(false);
    setCurrentRound(0);
    setPlayerScore(0);
    setBotScore(0);
    setRoundHistory([]);
    setPhase('idle');
    setLastResult(null);
    resetCardChoices();
  }, [resetCardChoices]);

  // ── Derived ──
  const canSim = playerCard.id !== '' && botCard.id !== '' && sessionStarted;
  const maxScore = totalRounds;

  const playerAbilityName = playerAbility ? getAbilityNameAr(playerAbility).split('(')[0].trim() : null;
  const botAbilityName = botAbility ? getAbilityNameAr(botAbility).split('(')[0].trim() : null;

  // ── Session result ──
  const sessionWinner = playerScore > botScore ? 'player' : botScore > playerScore ? 'bot' : 'draw';
  const sessionResultColor = sessionWinner === 'player' ? '#4ade80' : sessionWinner === 'bot' ? '#f87171' : '#fbbf24';
  const sessionResultEmoji = sessionWinner === 'player' ? '🏆' : sessionWinner === 'bot' ? '💀' : '🤝';
  const sessionResultText = sessionWinner === 'player' ? 'فوز!' : sessionWinner === 'bot' ? 'خسارة' : 'تعادل';

  // ── Round result colors ──
  const roundResultColor = lastResult?.winner === 'player' ? '#4ade80' : lastResult?.winner === 'bot' ? '#f87171' : '#fbbf24';
  const roundResultLabel = lastResult?.winner === 'player' ? '🏆 فاز اللاعب' : lastResult?.winner === 'bot' ? '🤖 فاز البوت' : '🤝 تعادل';

  return (
    <View style={S.root}>
      <StatusBar hidden />
      <View style={S.bgWrap}><LuxuryBackground /></View>
      <Animated.View style={[S.flashOverlay, flashStyle]} pointerEvents="none" />

      <SafeAreaView style={S.normalRoot}>
        <View style={[S.screen, { paddingLeft: Math.max(insets.left, 8), paddingRight: Math.max(insets.right, 8) }]}>

          {/* ══ TOP HUD ══ */}
          <View style={[S.topHud, isCompactPhone && S.topHudCompact]}>
            {/* LEFT: اللاعب */}
            <View style={[S.hudSide, isCompactPhone && S.hudSideCompact]}>
              <View style={[S.avatar, { borderColor: '#4ade80' }]}><Text style={{ fontSize: 18 }}>👤</Text></View>
              <View style={[S.hudInfo, isCompactPhone && S.hudInfoCompact]}>
                <Text style={[S.hudName, { color: '#4ade80' }]}>لاعب</Text>
                <ScoreBar score={playerScore} maxScore={maxScore} color="#4ade80" />
              </View>
              <Text style={[S.hudScore, { color: '#4ade80' }]}>{playerScore}</Text>
            </View>
            {/* CENTER */}
            <View style={[S.hudCenter, isCompactPhone && S.hudCenterCompact]}>
              <Text style={S.hudRound}>جولة {currentRound + 1} / {totalRounds}</Text>
              <RoundBar current={currentRound} total={totalRounds} />
              <TouchableOpacity style={S.historyBtn} onPress={() => setIsHistoryOpen(true)} activeOpacity={0.75}>
                <Text style={S.historyBtnText}>سجل ↗️</Text>
              </TouchableOpacity>
            </View>
            {/* RIGHT: البوت */}
            <View style={[S.hudSide, S.hudSideRight, isCompactPhone && S.hudSideCompact]}>
              <Text style={[S.hudScore, { color: '#f87171' }]}>{botScore}</Text>
              <View style={[S.hudInfo, isCompactPhone && S.hudInfoCompact]}>
                <Text style={[S.hudName, { color: '#f87171', textAlign: 'right' }]}>بوت</Text>
                <ScoreBar score={botScore} maxScore={maxScore} color="#f87171" reverse />
              </View>
              <View style={[S.avatar, { borderColor: '#f87171' }]}><Text style={{ fontSize: 18 }}>🤖</Text></View>
            </View>
          </View>

          {/* ══ SESSION CONFIG BAR (يختفي بعد بدء الجلسة) ══ */}
          {!sessionStarted ? (
            <View style={[S.configBar, isCompactPhone && S.configBarCompact]}>
              <Text style={{ color: COLOR.textMuted, fontSize: FONT.xs }}>عدد الجولات:</Text>
              <TouchableOpacity
                style={S.configCounterBtn}
                onPress={() => setTotalRounds(prev => Math.max(1, prev - 1))}
                activeOpacity={0.7}
              >
                <Text style={{ color: COLOR.gold, fontSize: FONT.base, lineHeight: 20 }}>−</Text>
              </TouchableOpacity>
              <Text style={S.configCount}>{totalRounds}</Text>
              <TouchableOpacity
                style={S.configCounterBtn}
                onPress={() => setTotalRounds(prev => Math.min(10, prev + 1))}
                activeOpacity={0.7}
              >
                <Text style={{ color: COLOR.gold, fontSize: FONT.base, lineHeight: 20 }}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.ctaBtn, S.ctaBtnAttack, { height: 34, paddingHorizontal: isCompactPhone ? SPACE.sm : SPACE.md, width: 'auto' }]}
                onPress={startSession}
                activeOpacity={0.85}
              >
                <Text style={S.ctaBtnIcon}>▶️</Text>
                <Text style={[S.ctaBtnText, { color: '#4ade80' }]}>ابدأ الجلسة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={S.effectsBar}>
              <View style={S.effectsBarSide}>
                <Text style={S.effectsBarLabel}>الجلسة نشطة</Text>
              </View>
              <View style={S.effectsBarDivider} />
              <View style={[S.effectsBarSide, { alignItems: 'flex-end' }]}>
                <Text style={[S.effectsBarLabel, { textAlign: 'right' }]}>
                  {currentRound + 1} / {totalRounds} جولات
                </Text>
              </View>
            </View>
          )}

          {/* ══ ARENA ══ */}
          <View style={[S.arena, isCompactPhone && S.arenaCompact]}>

            {/* PLAYER PANEL */}
            <View style={[S.playerPanel, isCompactPhone && S.playerPanelCompact]}>
              <Text style={S.panelLabel}>لاعب</Text>
              <TouchableOpacity onPress={() => setPickingPlayer(true)} activeOpacity={0.9}>
                <Animated.View style={playerAnimStyle}>
                  <LuxuryCharacterCardAnimated
                    card={playerCard.id ? playerCard : { ...EMPTY, nameAr: 'اختر كرت', name: 'Pick Card' }}
                    style={arenaCardStyle}
                  />
                </Animated.View>
              </TouchableOpacity>
              {playerCard.id
                ? <Text style={[S.specialAbility, { color: RARITY_COLORS[playerCard.rarity ?? 'common'] }]}>
                    {playerCard.nameAr || playerCard.name}
                  </Text>
                : <Text style={S.pickHint}>اضغط لاختيار الكرت</Text>
              }
            </View>

            {/* CENTER COLUMN */}
            <View style={[S.centerCol, isCompactPhone && S.centerColCompact]}>
              {/* VS Badge */}
              <Animated.View style={[S.vsBadge, isCompactPhone && S.vsBadgeCompact, vsAnimStyle]}>
                <Text style={S.vsIcon}>⚔️</Text>
                <Text style={S.vsText}>VS</Text>
              </Animated.View>

              {/* نتيجة الجولة الأخيرة */}
              {lastResult && phase !== 'sessionOver' && (
                <View style={[S.resultBadge, {
                  borderColor: roundResultColor + '88',
                  backgroundColor: roundResultColor + '18',
                }]}>
                  <Text style={[S.resultBadgeText, { color: roundResultColor }]}>{roundResultLabel}</Text>
                </View>
              )}

              {/* SessionResultCard — يظهر عند انتهاء كل الجولات */}
              {phase === 'sessionOver' && (
                <View style={[S.sessionResultCard, {
                  borderColor: sessionResultColor + '88',
                }]}>
                  <Text style={S.sessionResultEmoji}>{sessionResultEmoji}</Text>
                  <Text style={[S.sessionResultText, { color: sessionResultColor }]}>{sessionResultText}</Text>
                  <Text style={S.sessionResultSub}>اللاعب {playerScore} — البوت {botScore}</Text>
                  <TouchableOpacity
                    style={[S.sessionSmallBtn, { borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.12)' }]}
                    onPress={resetSession}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 12 }}>🔄</Text>
                    <Text style={[S.ctaBtnText, { fontSize: FONT.xs }]}>إعادة الجلسة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.sessionSmallBtn, { borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.12)' }]}
                    onPress={() => { resetSession(); }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 12 }}>⚙️</Text>
                    <Text style={[S.ctaBtnText, { fontSize: FONT.xs }]}>تغيير الجولات</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* CTA Stack */}
              <View style={S.ctaStack}>
                {/* هجوم */}
                {phase === 'idle' && (
                  <TouchableOpacity
                    style={[S.ctaBtn, canSim ? S.ctaBtnAttack : S.ctaBtnDisabled, isCompactPhone && S.ctaBtnCompact]}
                    onPress={runSim}
                    disabled={!canSim}
                    activeOpacity={0.85}
                  >
                    <Text style={S.ctaBtnIcon}>⚔️</Text>
                    <Text numberOfLines={1} style={[S.ctaBtnText, canSim && { color: '#4ade80' }, isCompactPhone && S.ctaBtnTextCompact]}>هجوم!</Text>
                  </TouchableOpacity>
                )}

                {/* معركة */}
                {phase === 'combat' && (
                  <View style={[S.ctaBtn, S.ctaBtnDisabled]}>
                    <Text style={S.ctaBtnText}>⚔️ معركة...</Text>
                  </View>
                )}

                {/* قدرات اللاعب */}
                {phase === 'idle' && (
                  <TouchableOpacity
                    style={[S.ctaBtn, S.ctaBtnAbilities, isCompactPhone && S.ctaBtnCompact]}
                    onPress={() => setAbPlayer(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={S.ctaBtnIcon}>⚡</Text>
                    <Text numberOfLines={1} style={[S.ctaBtnText, { color: '#a855f7' }, isCompactPhone && S.ctaBtnTextCompact]}>
                      {playerAbilityName ?? 'قدرة اللاعب'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* بعد النتيجة: إعادة / جولة جديدة */}
                {phase === 'result' && (
                  <>
                    <TouchableOpacity
                      style={[S.ctaBtn, S.ctaBtnNext, isCompactPhone && S.ctaBtnCompact]}
                      onPress={repeatRound}
                      activeOpacity={0.85}
                    >
                      <Text style={S.ctaBtnIcon}>🔄</Text>
                      <Text numberOfLines={1} style={[S.ctaBtnText, { color: '#60a5fa' }, isCompactPhone && S.ctaBtnTextCompact]}>إعادة الجولة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[S.ctaBtn, S.ctaBtnAttack, isCompactPhone && S.ctaBtnCompact]}
                      onPress={nextRound}
                      activeOpacity={0.85}
                    >
                      <Text style={S.ctaBtnIcon}>▶️</Text>
                      <Text numberOfLines={1} style={[S.ctaBtnText, { color: '#4ade80' }, isCompactPhone && S.ctaBtnTextCompact]}>جولة جديدة</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* سجل نتيجة الجولة الحالية */}
              {lastResult && phase !== 'sessionOver' && (
                <ScrollView style={S.logScroll} contentContainerStyle={{ gap: 4 }}>
                  {lastResult.log.map((l, i) => (
                    <Text key={i} style={S.logLine}>{l}</Text>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* BOT PANEL */}
            <View style={[S.botPanel, isCompactPhone && S.playerPanelCompact]}>
              <Text style={S.panelLabel}>بوت</Text>
              <TouchableOpacity onPress={() => setPickingBot(true)} activeOpacity={0.9}>
                <Animated.View style={botAnimStyle}>
                  <LuxuryCharacterCardAnimated
                    card={botCard.id ? botCard : { ...EMPTY, nameAr: 'اختر كرت', name: 'Pick Card' }}
                    style={arenaCardStyle}
                  />
                </Animated.View>
              </TouchableOpacity>
              {botCard.id
                ? <Text style={[S.specialAbility, { color: RARITY_COLORS[botCard.rarity ?? 'common'] }]}>
                    {botCard.nameAr || botCard.name}
                  </Text>
                : <Text style={S.pickHint}>اضغط لاختيار الكرت</Text>
              }
              {/* قدرة البوت */}
              <TouchableOpacity
                style={[S.ctaBtn, S.ctaBtnAbilities, { marginTop: SPACE.xs, width: 'auto', height: 36 }]}
                onPress={() => setAbBot(true)}
                activeOpacity={0.85}
              >
                <Text style={S.ctaBtnIcon}>⚡</Text>
                <Text style={[S.ctaBtnText, { color: '#a855f7', fontSize: FONT.xs }]}>
                  {botAbilityName ?? 'قدرة البوت'}
                </Text>
              </TouchableOpacity>
              <View style={S.botStatus}>
                <Text style={S.botStatusText}>
                  {phase === 'combat' ? '⚡ يهاجم...' : phase === 'result' ? '⏸ ينتظر' : '⏳ ينتظر...'}
                </Text>
              </View>
            </View>
          </View>

          {/* زر رجوع */}
          <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={S.backTxt}>← رجوع</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ══ Modals ══ */}
      <CardPickerModal
        visible={pickingPlayer}
        onClose={() => setPickingPlayer(false)}
        onSelect={c => { setPlayerCard(c); }}
        side="player"
        selectedId={playerCard.id}
      />
      <CardPickerModal
        visible={pickingBot}
        onClose={() => setPickingBot(false)}
        onSelect={c => { setBotCard(c); }}
        side="bot"
        selectedId={botCard.id}
      />
      <AbilitiesModal
        visible={abPlayer}
        current={playerAbility}
        onClose={() => setAbPlayer(false)}
        onSelect={setPlayerAbility}
        cardName={playerCard.id ? (playerCard.nameAr || playerCard.name) : ''}
      />
      <AbilitiesModal
        visible={abBot}
        current={botAbility}
        onClose={() => setAbBot(false)}
        onSelect={setBotAbility}
        cardName={botCard.id ? (botCard.nameAr || botCard.name) : ''}
      />

      {/* ── History Modal ── */}
      <Modal visible={isHistoryOpen} transparent animationType="slide" onRequestClose={() => setIsHistoryOpen(false)}>
        <View style={S.modalOverlay}>
          <View style={S.historyModal}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>📜 سجل الجلسة</Text>
              <TouchableOpacity onPress={() => setIsHistoryOpen(false)} style={S.modalClose}>
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
  // ── من battle.tsx (كما هي بدون تعديل) ──
  root: { flex: 1, backgroundColor: '#080612', overflow: 'hidden' },
  bgWrap: { position: 'absolute', inset: 0, zIndex: 0 },
  flashOverlay: { position: 'absolute', inset: 0, zIndex: 5, backgroundColor: '#fff', pointerEvents: 'none' },
  normalRoot: { flex: 1 },
  screen: { flex: 1, flexDirection: 'column', paddingBottom: 8, justifyContent: 'space-between' },

  // HUD
  topHud: { height: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, backgroundColor: 'rgba(8,6,18,0.82)', borderBottomWidth: 1, borderBottomColor: 'rgba(228,165,42,0.18)', gap: SPACE.sm },
  topHudCompact: { paddingHorizontal: SPACE.xs, gap: 2 },
  hudSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  hudSideCompact: { gap: 3, minWidth: 0 },
  hudSideRight: { justifyContent: 'flex-end' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hudInfo: { flex: 1, gap: 4 },
  hudInfoCompact: { minWidth: 0 },
  hudName: { fontSize: FONT.xs, letterSpacing: 0.5 },
  hudScore: { fontSize: FONT.xxl, fontVariant: ['tabular-nums'] } as any,
  hudCenter: { width: 160, alignItems: 'center', gap: SPACE.xs },
  hudCenterCompact: { width: 110 },
  hudRound: { color: '#e2e8f0', fontSize: FONT.sm, letterSpacing: 0.4 },
  historyBtn: { paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.full, backgroundColor: 'rgba(228,165,42,0.1)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.25)' },
  historyBtnText: { color: COLOR.gold, fontSize: FONT.xs - 2 },

  // Effects bar
  effectsBar: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACE.lg, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.28)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: SPACE.sm, minHeight: 32 },
  effectsBarSide: { flex: 1, alignItems: 'flex-start' },
  effectsBarDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)' },
  effectsBarLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 0.5, marginBottom: 2 },

  // Arena
  arena: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: SPACE.lg, gap: SPACE.xl, position: 'relative' },
  arenaCompact: { paddingHorizontal: SPACE.xs, gap: SPACE.xs, justifyContent: 'space-between' },
  playerPanel: { alignItems: 'center', justifyContent: 'center', zIndex: 2, paddingVertical: SPACE.md },
  playerPanelCompact: { paddingVertical: SPACE.xs, maxWidth: 114 },
  botPanel: { alignItems: 'center', justifyContent: 'center', zIndex: 1, paddingVertical: SPACE.md },
  panelLabel: { color: COLOR.textMuted, fontSize: FONT.xs - 2, letterSpacing: 1, textTransform: 'uppercase' },
  botStatus: { marginTop: SPACE.xs, paddingHorizontal: SPACE.md, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  botStatusText: { color: '#94a3b8', fontSize: FONT.xs - 2 },

  // Center column
  centerCol: { width: 152, alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, zIndex: 20 },
  centerColCompact: { width: 64, gap: SPACE.xs },
  vsBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(8,6,18,0.9)', borderWidth: 2, borderColor: 'rgba(228,165,42,0.7)', alignItems: 'center', justifyContent: 'center', ...SHADOW.gold },
  vsBadgeCompact: { width: 46, height: 46, borderRadius: 23 },
  vsIcon: { fontSize: 18 },
  vsText: { fontSize: FONT.sm, color: COLOR.gold, letterSpacing: 1 },
  resultBadge: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center' },
  resultBadgeText: { fontSize: FONT.base, letterSpacing: 0.5 },

  // CTA
  ctaStack: { gap: SPACE.sm, width: '100%', alignItems: 'center' },
  ctaBtn: { width: 140, height: 48, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.4)' },
  ctaBtnCompact: { width: 62, height: 42, gap: 2, paddingHorizontal: 3 },
  ctaBtnAttack: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: '#4ade80', shadowColor: '#4ade80', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, elevation: 6 },
  ctaBtnNext: { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: '#60a5fa', shadowColor: '#60a5fa', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4 },
  ctaBtnAbilities: { backgroundColor: 'rgba(168,85,247,0.12)', borderColor: '#a855f7', shadowColor: '#a855f7', shadowOpacity: 0.45, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4 },
  ctaBtnDisabled: { backgroundColor: 'rgba(71,85,105,0.2)', borderColor: '#475569', shadowOpacity: 0 },
  ctaBtnIcon: { fontSize: 16 },
  ctaBtnText: { color: '#f1f5f9', fontSize: FONT.sm, letterSpacing: 0.3 },
  ctaBtnTextCompact: { fontSize: 8, flexShrink: 1, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  abilitiesModal: { width: 340, maxHeight: '75%', backgroundColor: 'rgba(12,18,36,0.97)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(51,65,85,0.7)', padding: SPACE.xl, paddingBottom: SPACE.sm },
  historyModal: { backgroundColor: 'rgba(18,14,28,0.97)', borderRadius: RADIUS.lg, width: '90%', maxHeight: '82%', padding: SPACE.xl, borderWidth: 1, borderColor: '#1e293b' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', paddingBottom: SPACE.md },
  modalTitle: { color: '#f8fafc', fontSize: FONT.lg, flex: 1 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: 16 },
  modalCloseText: { color: '#f87171', fontSize: 18 },
  emptyText: { color: '#64748b', textAlign: 'center', marginVertical: SPACE.xxl, fontSize: FONT.base },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 3, paddingLeft: SPACE.lg, paddingVertical: SPACE.md, marginBottom: SPACE.lg, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.md, gap: SPACE.lg },
  historyCardWrap: { alignItems: 'center', position: 'relative' },
  crown: { fontSize: 20, position: 'absolute', top: -20, alignSelf: 'center', zIndex: 10 },
  historyCenter: { flex: 1, alignItems: 'center', gap: SPACE.xs },
  historyRound: { color: COLOR.gold, fontSize: FONT.sm },
  historyResult: { fontSize: FONT.base },

  // ── جديدة لـ sandbox فقط ──
  configBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.lg, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.28)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: SPACE.lg, minHeight: 32 },
  configBarCompact: { paddingHorizontal: SPACE.xs, gap: SPACE.sm },
  configCounterBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(228,165,42,0.15)', borderWidth: 1, borderColor: COLOR.gold, alignItems: 'center', justifyContent: 'center' },
  configCount: { color: COLOR.gold, fontSize: FONT.xl, minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] } as any,

  sessionResultCard: { width: 160, borderRadius: RADIUS.lg, borderWidth: 2, padding: SPACE.md, alignItems: 'center', gap: SPACE.sm, backgroundColor: 'rgba(8,6,18,0.96)' },
  sessionResultEmoji: { fontSize: 32 },
  sessionResultText: { fontSize: FONT.lg, letterSpacing: 0.4 },
  sessionResultSub: { fontSize: FONT.sm, color: COLOR.textMuted },
  sessionSmallBtn: { height: 34, paddingHorizontal: SPACE.md, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, borderWidth: 1.5 },

  cardPickerSheet: { backgroundColor: '#080612', borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, maxHeight: '82%', borderWidth: 1, borderColor: 'rgba(228,165,42,0.2)' },
  searchInput: { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: FONT.sm, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
  searchClearBtn: { position: 'absolute', right: SPACE.md + 10, top: 0, bottom: SPACE.sm, justifyContent: 'center' },
  searchClearText: { color: COLOR.textMuted, fontSize: 14 },
  thumbCard: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', minHeight: 130 },
  thumbSelected: { borderWidth: 2, borderColor: COLOR.gold },
  thumbCheck: { position: 'absolute', top: 4, right: 4, color: COLOR.gold, fontSize: 12, fontWeight: '800', zIndex: 10 },
  thumbImg: { width: '100%', height: 95 },
  thumbPlaceholder: { width: '100%', height: 95, alignItems: 'center', justifyContent: 'center' },
  thumbName: { fontSize: 10, fontWeight: '700', textAlign: 'center', padding: 4, lineHeight: 14 },

  // Tab bar
  tabBar: { flexDirection: 'row', paddingHorizontal: SPACE.md, gap: SPACE.xs, marginBottom: SPACE.sm, flexWrap: 'wrap' },
  tabItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabItemActive: { backgroundColor: COLOR.gold, borderColor: COLOR.gold },
  tabText: { fontSize: FONT.xs, color: COLOR.textMuted },
  tabTextActive: { color: '#000', fontWeight: '700' },

  // Ability rows
  abilityRow: { flexDirection: 'row', alignItems: 'center', height: 64, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: SPACE.xs },
  abilityRowActive: { borderColor: COLOR.gold + '88', backgroundColor: 'rgba(228,165,42,0.08)' },
  abilityRowInactive: { borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.03)' },
  abilityRowLeft: { width: 36, alignItems: 'center' },
  abilityRowCenter: { flex: 1, marginHorizontal: SPACE.sm },
  abilityRowName: { fontSize: FONT.sm, fontWeight: '700', color: '#fff' },
  abilityRowDesc: { fontSize: 9, color: COLOR.textMuted },
  abilityRowCheck: { color: COLOR.gold, fontSize: FONT.lg, fontWeight: '800' },

  // Confirm button
  confirmBtn: { height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLOR.gold, backgroundColor: 'rgba(228,165,42,0.15)', marginHorizontal: SPACE.md, marginTop: SPACE.sm, marginBottom: SPACE.md },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: COLOR.gold, fontSize: FONT.sm, fontWeight: '700', letterSpacing: 0.5 },
  logScroll: { maxHeight: 80, width: '100%' },
  logLine: { fontSize: 9, color: '#94a3b8', textAlign: 'center' },
  pickHint: { color: '#475569', fontSize: FONT.xs, textAlign: 'center', marginTop: SPACE.xs },
  specialAbility: { fontSize: FONT.xs, textAlign: 'center', marginTop: SPACE.xs, maxWidth: 150 },
  backBtn: { alignSelf: 'center', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xs, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: SPACE.xs },
  backTxt: { color: COLOR.textMuted, fontSize: FONT.xs },
});
