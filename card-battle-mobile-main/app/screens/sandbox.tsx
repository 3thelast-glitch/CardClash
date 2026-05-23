/**
 * SandboxScreen — نفس تصميم battle.tsx 100%
 * الفرق الوحيد: اللاعب يختار الكرت والقدرة يدويًا بدل التسلسل
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  Modal, ScrollView, FlatList, TextInput,
  Image, Alert,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, withSequence,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { AbilityCard } from '@/components/game/ability-card';
import { COLOR, SPACE, RADIUS, FONT, GLASS_PANEL, SHADOW } from '@/components/ui/design-tokens';
import { ALL_CARDS, determineRoundWinner } from '@/lib/game/cards-data-exports';
import {
  Card, AbilityType, Element, CardClass,
  ELEMENT_EMOJI, ELEMENT_COLORS,
} from '@/lib/game/types';
import { getCardImage } from '@/lib/game/get-card-image';
import { getAbilityNameAr, getAbilityDescription } from '@/lib/game/ability-names';

// ─── الكروت المتاحة من قاعدة البيانات ─────────────────────────────────────
const CARDS = ALL_CARDS;

// ─── كل القدرات ───────────────────────────────────────────────────────────
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
  useEffect(() => { filled.value = withTiming((current / total) * 100, { duration: 400 }); }, [current]);
  const barStyle = useAnimatedStyle(() => ({ width: `${filled.value}%` as any }));
  return (
    <View style={rb.track}>
      <Animated.View style={[rb.fill, barStyle]} />
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[rb.tick, { left: `${((i + 1) / total) * 100}%` as any }, i < current && rb.tickDone]} />
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
  useEffect(() => { filled.value = withSpring(maxScore > 0 ? (score / maxScore) * 100 : 0, { damping: 14 }); }, [score]);
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

// ─── CardPickerModal ───────────────────────────────────────────────────────
function CardPickerModal({ visible, onClose, onSelect }: {
  visible: boolean; onClose: () => void; onSelect: (c: Card) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() =>
    CARDS.filter(c => c.nameAr?.includes(search) || c.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <View style={S.cardPickerSheet}>
          <View style={S.modalHeader}>
            <Text style={S.modalTitle}>🃏 اختر كرت</Text>
            <TouchableOpacity onPress={onClose} style={S.modalClose}><Text style={S.modalCloseText}>✕</Text></TouchableOpacity>
          </View>
          <TextInput
            style={S.searchInput}
            placeholder="بحث..."
            placeholderTextColor="#475569"
            value={search}
            onChangeText={setSearch}
          />
          <FlatList
            data={filtered}
            keyExtractor={c => c.id}
            numColumns={3}
            contentContainerStyle={{ padding: SPACE.sm, gap: SPACE.xs }}
            columnWrapperStyle={{ gap: SPACE.xs }}
            renderItem={({ item }) => {
              const rc = RARITY_COLORS[item.rarity ?? 'common'];
              const img = getCardImage(item);
              return (
                <TouchableOpacity
                  style={[S.thumbCard, { borderColor: rc + '88' }]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.8}
                >
                  {img
                    ? <Image source={img} style={S.thumbImg} resizeMode="cover" />
                    : <View style={[S.thumbPlaceholder, { backgroundColor: rc + '18' }]}>
                        <Text style={{ fontSize: 28 }}>{ELEMENT_EMOJI[item.element] ?? '🃏'}</Text>
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

// ─── AbilitiesModal (مطابق لـ battle.tsx) ─────────────────────────────────
function AbilitiesModal({ visible, current, onClose, onSelect }: {
  visible: boolean;
  current: AbilityType | undefined;
  onClose: () => void;
  onSelect: (ab: AbilityType | undefined) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={S.abilitiesModal} activeOpacity={1}>
          <View style={S.modalHeader}>
            <Text style={S.modalTitle}>⚡ اختر قدرة</Text>
            <TouchableOpacity onPress={onClose} style={S.modalClose}>
              <Text style={S.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* بدون قدرة */}
            <TouchableOpacity
              style={[S.abilityItemWrap, !current && S.abilityItemActive]}
              onPress={() => { onSelect(undefined); onClose(); }}
              activeOpacity={0.85}
            >
              <AbilityCard
                ability={{
                  id: -1,
                  nameEn: 'None',
                  nameAr: '❌ بدون قدرة',
                  description: 'لا تستخدم أي قدرة',
                  icon: null,
                  rarity: 'Common',
                  isActive: true,
                }}
                showActionButtons={false}
              />
            </TouchableOpacity>
            {ALL_ABILITIES.map((ab, i) => (
              <TouchableOpacity
                key={ab}
                style={[S.abilityItemWrap, current === ab && S.abilityItemActive]}
                onPress={() => { onSelect(ab); onClose(); }}
                activeOpacity={0.85}
              >
                <AbilityCard
                  ability={{
                    id: i,
                    nameEn: ab,
                    nameAr: getAbilityNameAr(ab).split('(')[0].trim(),
                    description: getAbilityDescription(ab),
                    icon: null,
                    rarity: 'Rare',
                    isActive: true,
                  }}
                  showActionButtons={false}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── SandboxScreen ─────────────────────────────────────────────────────────
export default function SandboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // كروت
  const [playerCard, setPlayerCard] = useState<Card>(EMPTY);
  const [botCard,    setBotCard]    = useState<Card>(EMPTY);
  // قدرات
  const [playerAbility, setPlayerAbility] = useState<AbilityType | undefined>(undefined);
  const [botAbility,    setBotAbility]    = useState<AbilityType | undefined>(undefined);
  // modals
  const [pickingPlayer,  setPickingPlayer]  = useState(false);
  const [pickingBot,     setPickingBot]     = useState(false);
  const [abPlayer,       setAbPlayer]       = useState(false);
  const [abBot,          setAbBot]          = useState(false);
  // نتيجة
  const [result, setResult] = useState<null | { winner: string; playerDmg: number; botDmg: number; log: string[] }>(null);
  const [phase,  setPhase]  = useState<'idle' | 'combat' | 'result'>('idle');

  // Animations — نفس battle.tsx
  const playerAnim = useSharedValue(0);
  const botAnim    = useSharedValue(0);
  const vsOpacity  = useSharedValue(0);
  const flashAnim  = useSharedValue(0);

  const playerAnimStyle = useAnimatedStyle(() => ({
    opacity: playerAnim.value,
    transform: [{ translateX: (1 - playerAnim.value) * -40 }],
  }));
  const botAnimStyle = useAnimatedStyle(() => ({
    opacity: botAnim.value,
    transform: [{ translateX: (1 - botAnim.value) * 40 }],
  }));
  const vsAnimStyle = useAnimatedStyle(() => ({ opacity: vsOpacity.value }));
  const flashStyle  = useAnimatedStyle(() => ({ opacity: flashAnim.value }));

  const triggerEntrance = useCallback(() => {
    playerAnim.value = 0; botAnim.value = 0; vsOpacity.value = 0;
    playerAnim.value = withDelay(80,  withTiming(1, { duration: 280 }));
    botAnim.value    = withDelay(240, withTiming(1, { duration: 280 }));
    vsOpacity.value  = withDelay(440, withTiming(1, { duration: 200 }));
  }, []);

  // عند تغيير الكرت شغّل الأنيميشن
  useEffect(() => {
    if (playerCard.id || botCard.id) triggerEntrance();
  }, [playerCard.id, botCard.id]);

  const canSim = playerCard.id !== '' && botCard.id !== '';

  const runSim = useCallback(() => {
    if (!canSim) return;
    flashAnim.value = withSequence(withTiming(0.35, { duration: 60 }), withTiming(0, { duration: 300 }));
    setPhase('combat');
    setTimeout(() => {
      const res = determineRoundWinner(playerCard, botCard, [], []);
      const log: string[] = [];

      if (res.playerElementAdvantage !== 'neutral')
        log.push(`${ELEMENT_EMOJI[playerCard.element]} تفوق عنصري للاعب: ${res.playerElementAdvantage === 'strong' ? 'قوي ⬆️' : 'ضعيف ⬇️'}`);
      if (res.botElementAdvantage !== 'neutral')
        log.push(`${ELEMENT_EMOJI[botCard.element]} تفوق عنصري للبوت: ${res.botElementAdvantage === 'strong' ? 'قوي ⬆️' : 'ضعيف ⬇️'}`);

      log.push(`⚔️ ضرر اللاعب: ${res.playerBaseDamage} → صافي: ${res.playerDamage}`);
      log.push(`🤖 ضرر البوت:  ${res.botBaseDamage} → صافي: ${res.botDamage}`);

      if (playerAbility) log.push(`⚡ قدرة اللاعب: ${getAbilityNameAr(playerAbility).split('(')[0].trim()}`);
      if (botAbility)    log.push(`⚡ قدرة البوت:  ${getAbilityNameAr(botAbility).split('(')[0].trim()}`);

      setResult({
        winner: res.winner,
        playerDmg: res.playerDamage,
        botDmg: res.botDamage,
        log,
      });
      setPhase('result');
    }, 700);
  }, [canSim, playerCard, botCard, playerAbility, botAbility]);

  const resetSim = () => { setResult(null); setPhase('idle'); triggerEntrance(); };

  // ─── HUD colors ──────────────────────────────────────────────────────────
  const playerScore = result ? (result.winner === 'player' ? 1 : 0) : 0;
  const botScore    = result ? (result.winner === 'bot'    ? 1 : 0) : 0;
  const playerHp = 5 - botScore;
  const botHp    = 5 - playerScore;
  const TOTAL = 5;

  // ─── نتيجة المعركة ────────────────────────────────────────────────────────
  const resultColor  = result?.winner === 'player' ? '#4ade80' : result?.winner === 'bot' ? '#f87171' : '#fbbf24';
  const resultLabel  = result?.winner === 'player' ? '🏆 فاز اللاعب' : result?.winner === 'bot' ? '🤖 فاز البوت' : '🤝 تعادل';

  const playerAbilityName = playerAbility ? getAbilityNameAr(playerAbility).split('(')[0].trim() : null;
  const botAbilityName    = botAbility    ? getAbilityNameAr(botAbility).split('(')[0].trim()    : null;

  return (
    <View style={S.root}>
      <StatusBar style="light" />

      {/* خلفية */}
      <View style={S.bgWrap}>
        <LuxuryBackground />
      </View>

      {/* Flash overlay */}
      <Animated.View style={[S.flashOverlay, flashStyle]} pointerEvents="none" />

      <View style={[S.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>

        {/* ══ TOP HUD (مطابق battle.tsx) ══════════════════════════════════ */}
        <View style={S.topHud}>
          {/* اللاعب */}
          <View style={S.hudSide}>
            <View style={[S.avatar, { borderColor: '#4ade80' }]}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
            <View style={S.hudInfo}>
              <Text style={[S.hudName, { color: COLOR.textMuted }]}>لاعب</Text>
              <ScoreBar score={playerHp} maxScore={TOTAL} color="#4ade80" />
            </View>
            <Text style={[S.hudScore, { color: '#4ade80' }]}>{playerHp}</Text>
          </View>

          {/* المركز */}
          <View style={S.hudCenter}>
            <Text style={S.hudRound}>جولة 1 / {TOTAL}</Text>
            <RoundBar current={result ? 1 : 0} total={TOTAL} />
            <TouchableOpacity style={S.historyBtn}>
              <Text style={S.historyBtnText}>سجل</Text>
            </TouchableOpacity>
          </View>

          {/* البوت */}
          <View style={[S.hudSide, S.hudSideRight]}>
            <Text style={[S.hudScore, { color: '#f87171' }]}>{botHp}</Text>
            <View style={S.hudInfo}>
              <Text style={[S.hudName, { color: COLOR.textMuted, textAlign: 'right' }]}>بوت</Text>
              <ScoreBar score={botHp} maxScore={TOTAL} color="#f87171" reverse />
            </View>
            <View style={[S.avatar, { borderColor: '#f87171' }]}>
              <Text style={{ fontSize: 18 }}>🤖</Text>
            </View>
          </View>
        </View>

        {/* ══ ARENA ════════════════════════════════════════════════════════ */}
        <View style={S.arena}>

          {/* كرت اللاعب */}
          <View style={S.playerPanel}>
            <Text style={S.panelLabel}>لاعب</Text>
            <TouchableOpacity onPress={() => setPickingPlayer(true)} activeOpacity={0.9}>
              <Animated.View style={playerAnimStyle}>
                <LuxuryCharacterCardAnimated
                  card={playerCard.id ? playerCard : { ...EMPTY, nameAr: 'اختر كرت', name: 'Pick Card' }}
                  style={S.cardSize}
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

          {/* العمود الأوسط */}
          <View style={S.centerCol}>
            <Animated.View style={[S.vsBadge, vsAnimStyle]}>
              <Text style={S.vsIcon}>⚔️</Text>
              <Text style={S.vsText}>VS</Text>
            </Animated.View>

            {/* نتيجة الجولة */}
            {result && (
              <View style={[S.resultBadge, { borderColor: resultColor + '88', backgroundColor: resultColor + '18' }]}>
                <Text style={[S.resultBadgeText, { color: resultColor }]}>{resultLabel}</Text>
              </View>
            )}

            {/* ─── CTA Buttons (مطابق battle.tsx) ─── */}
            <View style={S.ctaStack}>
              {phase !== 'result' ? (
                <>
                  {/* هجوم */}
                  <TouchableOpacity
                    style={[S.ctaBtn, canSim ? S.ctaBtnAttack : S.ctaBtnDisabled]}
                    onPress={runSim}
                    disabled={!canSim || phase === 'combat'}
                    activeOpacity={0.85}
                  >
                    <Text style={S.ctaBtnIcon}>⚔️</Text>
                    <Text style={[S.ctaBtnText, canSim && { color: '#4ade80' }]}>هجوم!</Text>
                  </TouchableOpacity>

                  {/* قدرات اللاعب */}
                  <TouchableOpacity
                    style={[S.ctaBtn, S.ctaBtnAbilities]}
                    onPress={() => setAbPlayer(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={S.ctaBtnIcon}>⚡</Text>
                    <Text style={[S.ctaBtnText, { color: '#a855f7' }]}>
                      {playerAbilityName ?? 'قدرات'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* التالي / إعادة */
                <TouchableOpacity
                  style={[S.ctaBtn, S.ctaBtnNext]}
                  onPress={resetSim}
                  activeOpacity={0.85}
                >
                  <Text style={S.ctaBtnIcon}>🔄</Text>
                  <Text style={[S.ctaBtnText, { color: '#60a5fa' }]}>إعادة</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* سجل نتيجة */}
            {result && (
              <ScrollView style={S.logScroll} contentContainerStyle={{ gap: 4 }}>
                {result.log.map((l, i) => (
                  <Text key={i} style={S.logLine}>{l}</Text>
                ))}
              </ScrollView>
            )}
          </View>

          {/* كرت البوت */}
          <View style={S.botPanel}>
            <Text style={S.panelLabel}>بوت</Text>
            <TouchableOpacity onPress={() => setPickingBot(true)} activeOpacity={0.9}>
              <Animated.View style={botAnimStyle}>
                <LuxuryCharacterCardAnimated
                  card={botCard.id ? botCard : { ...EMPTY, nameAr: 'اختر كرت', name: 'Pick Card' }}
                  style={S.cardSize}
                />
              </Animated.View>
            </TouchableOpacity>
            {botCard.id
              ? <>
                  <Text style={[S.specialAbility, { color: RARITY_COLORS[botCard.rarity ?? 'common'] }]}>
                    {botCard.nameAr || botCard.name}
                  </Text>
                  <View style={S.botStatus}>
                    <Text style={S.botStatusText}>
                      {phase === 'combat' ? '⚡ يهاجم...' : phase === 'result' ? '⏸ ينتظر' : '⏳ ينتظر...'}
                    </Text>
                  </View>
                </>
              : <>
                  <Text style={S.pickHint}>اضغط لاختيار الكرت</Text>
                  {/* قدرة البوت */}
                  <TouchableOpacity style={[S.ctaBtn, S.ctaBtnAbilities, { marginTop: SPACE.xs, width: 'auto', height: 36 }]} onPress={() => setAbBot(true)} activeOpacity={0.85}>
                    <Text style={S.ctaBtnIcon}>⚡</Text>
                    <Text style={[S.ctaBtnText, { color: '#a855f7', fontSize: FONT.xs }]}>
                      {botAbilityName ?? 'قدرة البوت'}
                    </Text>
                  </TouchableOpacity>
                </>
            }
            {botCard.id && (
              <TouchableOpacity style={[S.ctaBtn, S.ctaBtnAbilities, { marginTop: SPACE.xs, width: 'auto', height: 36 }]} onPress={() => setAbBot(true)} activeOpacity={0.85}>
                <Text style={S.ctaBtnIcon}>⚡</Text>
                <Text style={[S.ctaBtnText, { color: '#a855f7', fontSize: FONT.xs }]}>
                  {botAbilityName ?? 'قدرة البوت'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* زر رجوع */}
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={S.backTxt}>← رجوع</Text>
        </TouchableOpacity>
      </View>

      {/* ══ Modals ══════════════════════════════════════════════════════════ */}
      <CardPickerModal
        visible={pickingPlayer}
        onClose={() => setPickingPlayer(false)}
        onSelect={c => { setPlayerCard(c); resetSim(); }}
      />
      <CardPickerModal
        visible={pickingBot}
        onClose={() => setPickingBot(false)}
        onSelect={c => { setBotCard(c); resetSim(); }}
      />
      <AbilitiesModal
        visible={abPlayer}
        current={playerAbility}
        onClose={() => setAbPlayer(false)}
        onSelect={setPlayerAbility}
      />
      <AbilitiesModal
        visible={abBot}
        current={botAbility}
        onClose={() => setAbBot(false)}
        onSelect={setBotAbility}
      />
    </View>
  );
}

// ──────────────────── STYLES (نسخة مطابقة من battle.tsx) ──────────────────
const S = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#080612' },
  bgWrap:         { position: 'absolute', inset: 0, zIndex: 0 },
  flashOverlay:   { position: 'absolute', inset: 0, zIndex: 5, backgroundColor: '#fff', pointerEvents: 'none' },
  screen:         { flex: 1, flexDirection: 'column', justifyContent: 'space-between' },

  // HUD
  topHud:         { height: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, backgroundColor: 'rgba(8,6,18,0.82)', borderBottomWidth: 1, borderBottomColor: 'rgba(228,165,42,0.18)', gap: SPACE.sm },
  hudSide:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  hudSideRight:   { justifyContent: 'flex-end' },
  avatar:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hudInfo:        { flex: 1, gap: 4 },
  hudName:        { fontSize: FONT.xs, letterSpacing: 0.5 },
  hudScore:       { fontSize: FONT.xxl, fontVariant: ['tabular-nums'] } as any,
  hudCenter:      { width: 160, alignItems: 'center', gap: SPACE.xs },
  hudRound:       { color: '#e2e8f0', fontSize: FONT.sm, letterSpacing: 0.4 },
  historyBtn:     { paddingHorizontal: SPACE.sm, paddingVertical: 2, borderRadius: RADIUS.full, backgroundColor: 'rgba(228,165,42,0.1)', borderWidth: 1, borderColor: 'rgba(228,165,42,0.25)' },
  historyBtnText: { color: COLOR.gold, fontSize: FONT.xs - 2 },

  // Arena
  arena:          { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: SPACE.lg, gap: SPACE.xl, position: 'relative' },
  playerPanel:    { alignItems: 'center', justifyContent: 'center', zIndex: 2, paddingVertical: SPACE.md },
  botPanel:       { alignItems: 'center', justifyContent: 'center', zIndex: 1, paddingVertical: SPACE.md },
  panelLabel:     { color: COLOR.textMuted, fontSize: FONT.xs - 2, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACE.xs },
  cardSize:       { width: 150, height: 210 },
  specialAbility: { fontSize: FONT.xs, textAlign: 'center', marginTop: SPACE.xs, maxWidth: 150 },
  pickHint:       { color: '#475569', fontSize: FONT.xs, textAlign: 'center', marginTop: SPACE.xs },
  botStatus:      { marginTop: SPACE.xs, paddingHorizontal: SPACE.md, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  botStatusText:  { color: '#94a3b8', fontSize: FONT.xs - 2 },

  // Center column
  centerCol:      { width: 152, alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, zIndex: 20 },
  vsBadge:        { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(8,6,18,0.9)', borderWidth: 2, borderColor: 'rgba(228,165,42,0.7)', alignItems: 'center', justifyContent: 'center', ...SHADOW.gold },
  vsIcon:         { fontSize: 18 },
  vsText:         { fontSize: FONT.sm, color: COLOR.gold, letterSpacing: 1 },
  resultBadge:    { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center' },
  resultBadgeText:{ fontSize: FONT.base, letterSpacing: 0.5 },
  ctaStack:       { gap: SPACE.sm, width: '100%', alignItems: 'center' },
  ctaBtn:         { width: 140, height: 48, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.4)' },
  ctaBtnAttack:   { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: '#4ade80', shadowColor: '#4ade80', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, elevation: 6 },
  ctaBtnNext:     { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: '#60a5fa', shadowColor: '#60a5fa', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4 },
  ctaBtnAbilities:{ backgroundColor: 'rgba(168,85,247,0.12)', borderColor: '#a855f7', shadowColor: '#a855f7', shadowOpacity: 0.45, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4 },
  ctaBtnDisabled: { backgroundColor: 'rgba(71,85,105,0.2)', borderColor: '#475569', shadowOpacity: 0 },
  ctaBtnIcon:     { fontSize: 16 },
  ctaBtnText:     { color: '#f1f5f9', fontSize: FONT.sm, letterSpacing: 0.3 },

  // Log
  logScroll:      { maxHeight: 120, width: '100%' },
  logLine:        { fontSize: 10, color: '#94a3b8', textAlign: 'center' },

  // Back
  backBtn:        { alignSelf: 'center', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xs, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: SPACE.xs },
  backTxt:        { color: COLOR.textMuted, fontSize: FONT.xs },

  // Modals
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  cardPickerSheet:  { backgroundColor: '#080612', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '88%', borderWidth: 1, borderColor: 'rgba(228,165,42,0.2)' },
  abilitiesModal:   { width: '92%', maxWidth: 820, maxHeight: '80%', backgroundColor: 'rgba(12,18,36,0.97)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(51,65,85,0.7)', padding: SPACE.xl, paddingBottom: SPACE.lg, alignSelf: 'center' },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACE.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  modalTitle:       { fontSize: FONT.lg, color: COLOR.gold, fontWeight: '800' },
  modalClose:       { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  modalCloseText:   { color: '#fff', fontSize: 20, fontWeight: '300', lineHeight: 22 },
  searchInput:      { margin: SPACE.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: FONT.sm, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
  thumbCard:        { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', minHeight: 120 },
  thumbImg:         { width: '100%', height: 85 },
  thumbPlaceholder: { width: '100%', height: 85, alignItems: 'center', justifyContent: 'center' },
  thumbName:        { fontSize: 9, fontWeight: '700', textAlign: 'center', padding: 4, lineHeight: 13 },
  abilityItemWrap:  { marginBottom: SPACE.xs, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' },
  abilityItemActive:{ borderColor: 'rgba(228,165,42,0.5)', backgroundColor: 'rgba(228,165,42,0.06)' },
});
