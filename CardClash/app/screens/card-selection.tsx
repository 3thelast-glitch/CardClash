import React, { useState, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Modal,
  FlatList, ScrollView, ActivityIndicator,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { useGame } from '@/lib/game/game-context';
import { useCards } from '@/lib/game/useCards';
import { getCardAbilityDisplayText } from '@/lib/game/card-ability-text';
import { Card, AbilityType } from '@/lib/game/types';
import { ALL_ABILITIES, NAME_TO_ABILITY_TYPE } from '@/lib/game/abilities';
import { getDisabledAbilityIds } from '@/lib/game/abilities-store';
import { AbilityCard, AbilityData } from '@/components/game/ability-card';
import { abilities as allAbilitiesData } from '@/data/abilities';
import { ProButton } from '@/components/ui/ProButton';
import { SPACE, RADIUS, FONT } from '@/components/ui/design-tokens';
import type { RarityWeights, RarityKey } from '@/lib/game/game-context';
import {
  useLandscapeLayout,
  useCardSize,
  GRID_COLUMNS,
  GRID_GAP,
  LAYOUT_PADDING,
} from '@/utils/layout';
import { doesRoundPickerNeedScroll, getRoundPickerLayout } from '@/utils/round-picker-layout';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import { useLanMultiplayer } from '@/lib/lan/lan-context';
import { shouldUseStaticCardMedia } from '@/lib/game/long-match-media';
import { getBotCards } from '@/lib/game/bot-ai';

// Multiplayer — يبقى الاستدعاء آمناً إذا لم يكن Provider موجوداً في سياق الاختبار.
function useSafeMultiplayer() {
  try { return useMultiplayer(); } catch { return null; }
}

// ── منطق الندرة ──────────────────────────────────────────────────────────────
function sampleCardsByRarity(cards: Card[], count: number, weights: RarityWeights): Card[] {
  if (cards.length === 0) return [];
  count = Math.min(count, cards.length);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const safeWeights = total > 0 ? weights : { common: 52, rare: 25, epic: 14, legendary: 7, special: 2 };

  const buckets: Record<RarityKey, Card[]> = {
    common:    cards.filter(c => (c.rarity ?? 'common') === 'common'),
    rare:      cards.filter(c => c.rarity === 'rare'),
    epic:      cards.filter(c => c.rarity === 'epic'),
    legendary: cards.filter(c => c.rarity === 'legendary'),
    special:   cards.filter(c => c.rarity === 'special'),
  };
  (Object.keys(buckets) as RarityKey[]).forEach(k => { buckets[k] = [...buckets[k]].sort(() => Math.random() - 0.5); });

  const usedIndices: Record<RarityKey, number> = { common: 0, rare: 0, epic: 0, legendary: 0, special: 0 };
  const result: Card[] = [];
  const rarityOrder: RarityKey[] = ['special', 'legendary', 'epic', 'rare', 'common'];

  for (let i = 0; i < count; i++) {
    const roll = Math.random() * (total > 0 ? total : 100);
    let cumulative = 0;
    let chosen: RarityKey = 'common';
    for (const key of (['common', 'rare', 'epic', 'legendary', 'special'] as RarityKey[])) {
      cumulative += safeWeights[key] ?? 0;
      if (roll < cumulative) { chosen = key; break; }
    }
    let picked: Card | undefined;
    for (const key of [chosen, ...rarityOrder.filter(k => k !== chosen)]) {
      if (usedIndices[key] < buckets[key].length) { picked = buckets[key][usedIndices[key]++]; break; }
    }
    if (picked) result.push(picked);
  }
  return result;
}

// ✅ Turin يجب أن يكون دائماً أول القائمة
function enforceTurinFirst(cards: Card[]): Card[] {
  const turinIdx = cards.findIndex(c => c.name === 'Turin');
  if (turinIdx <= 0) return cards; // ليس موجود أو موجود مسبقاً
  const result = [...cards];
  const [turin] = result.splice(turinIdx, 1);
  result.unshift(turin);
  return result;
}

function abilityTypeToNameEn(type: AbilityType): string {
  return type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}
function isAbilityInData(type: AbilityType): boolean {
  const nameEn = abilityTypeToNameEn(type);
  return allAbilitiesData.some(a => a.nameEn.toLowerCase() === nameEn.toLowerCase());
}
function resolveAbilityData(type: AbilityType): AbilityData {
  const nameEn = abilityTypeToNameEn(type);
  const found = allAbilitiesData.find(a => a.nameEn.toLowerCase() === nameEn.toLowerCase());
  if (found) return { id: found.id, nameEn: found.nameEn, nameAr: found.nameAr, description: found.description, icon: found.icon, rarity: found.rarity, isActive: found.isActive };
  return { id: type, nameEn, nameAr: type, description: '', icon: null, rarity: 'Common' };
}
function idsToAbilityTypes(ids: Set<number>): Set<AbilityType> {
  const result = new Set<AbilityType>();
  ids.forEach(id => {
    const found = allAbilitiesData.find(a => a.id === id);
    if (!found) return;
    const mapped = NAME_TO_ABILITY_TYPE[found.nameEn];
    if (mapped) { result.add(mapped); return; }
    const asType = found.nameEn.replace(/\s+/g, '') as AbilityType;
    if (ALL_ABILITIES.includes(asType)) result.add(asType);
  });
  return result;
}

interface CardRound { card: Card; round: number | null; }

// ───────────────────────────────────────────────────────────────────────
export default function CardSelectionScreen() {
  const router = useRouter();
  const { width, height, size, isLandscape } = useLandscapeLayout();

  const modalPadding = height < 400 ? 10 : 20;
  const modalGap = height < 400 ? 8 : 12;
  const modalHeaderMargin = height < 400 ? 8 : 16;
  // على الهاتف العمودي نعرض القدرات الثلاث معاً داخل صف واحد بدلاً من إخفاء الثالثة خلف السحب.
  const abilityMobileThreeAcross = !isLandscape && width < 520;
  const abilityPreviewHorizontal = false;
  const abilityModalWidth = Math.min(width - Math.max(12, modalPadding), 700);
  const abilityPreviewGap = abilityMobileThreeAcross ? 6 : modalGap;
  const abilityRailHorizontalPadding = Math.max(4, modalPadding / 2);
  const abilityModalInnerWidth = Math.max(0, abilityModalWidth - modalPadding * 2 - abilityRailHorizontalPadding * 2);
  const abilityPreviewCardW = abilityMobileThreeAcross
    ? Math.max(88, Math.floor((abilityModalInnerWidth - abilityPreviewGap * 2) / 3))
    : Math.round(Math.max(200, Math.min(300, Math.round(height * 0.52))) * (160 / 240));
  const abilityPreviewCardH = abilityMobileThreeAcross
    ? Math.round(abilityPreviewCardW * (330 / 220))
    : Math.max(200, Math.min(300, Math.round(height * 0.52)));

  const game = useGame();
  const { state, rarityWeights } = game;

  // ✅ استخراج الدوال بشكل آمن مع fallback صريح
  const setPlayerDeck = typeof game.setPlayerDeck === 'function' ? game.setPlayerDeck : null;
  const startBattle   = typeof game.startBattle   === 'function' ? game.startBattle   : null;

  const [cardRounds, setCardRounds] = useState<CardRound[]>([]);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
  const [isAbilitiesModalOpen, setIsAbilitiesModalOpen] = useState(false);
  const [assignedAbilities, setAssignedAbilities] = useState<AbilityType[]>([]);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [localStage, setLocalStage] = useState<'host' | 'handover' | 'guest'>('host');
  const [hostDeck, setHostDeck] = useState<Card[]>([]);
  const [hostAbilities, setHostAbilities] = useState<AbilityType[]>([]);
  const totalRounds = state.totalRounds || 5;
  const isLocalTwoPlayer = state.matchMode === 'local';

  const allCards = useCards();
  const numColumns = GRID_COLUMNS[size];
  const padding = LAYOUT_PADDING[size];
  const { cardW: gridCardW, cardH: gridCardH } = useCardSize('selection');
  const { cardW: modalCardW, cardH: modalCardH } = useCardSize('modal');
  const gridGap = GRID_GAP[size];
  const gridCellW = Math.floor((width - padding * 2 - gridGap * (numColumns - 1)) / numColumns);

  const {
    focusModalPadding,
    focusModalGap,
    focusModalWidth,
    stackRoundPicker,
    focusCardW,
    focusCardH,
    focusPickerW,
    roundPickerColumns,
    roundPickerGap,
    roundPickerChipW,
    roundPickerHeight,
  } = getRoundPickerLayout({ width, height, isLandscape, modalCardW, modalCardH });

  const mp = useSafeMultiplayer();
  const lan = useLanMultiplayer();
  const isOnlineMultiplayer = !!mp?.state?.roomId;
  const isLanMultiplayer = state.matchMode === 'lan' && lan.match.role !== null;
  const isMultiplayer = isOnlineMultiplayer || isLanMultiplayer;
  const isCompactMobile = !isLandscape && width < 520;
  const gridVideoCardCount = cardRounds.filter(({ card }) => !!card.videoUrl).length;
  const useStaticGridMedia = shouldUseStaticCardMedia(totalRounds, gridVideoCardCount);
  const opponentArrangementReady = isLanMultiplayer
    ? (lan.match.role === 'host' ? lan.match.guestReady : lan.match.hostReady)
    : (mp?.state?.opponentArrangementReady ?? false);
  const isRankedMatch = mp?.state?.isRankedMatch ?? false;
  const playerReady = isLanMultiplayer
    ? (lan.match.role === 'host' ? lan.match.hostReady : lan.match.guestReady)
    : (mp?.state?.isPlayerReady ?? false);

  useEffect(() => {
    getDisabledAbilityIds().then(disabledIds => {
      const disabledTypes = idsToAbilityTypes(disabledIds);
      const available = ALL_ABILITIES.filter(a => !disabledTypes.has(a) && isAbilityInData(a));
      const picked = [...available].sort(() => Math.random() - 0.5).slice(0, 3);
      const safeAllCards = Array.isArray(allCards) ? allCards : [];
      const sampled = sampleCardsByRarity(safeAllCards, totalRounds, rarityWeights);
      setCardRounds(sampled.map(card => ({ card, round: null })));
      setAssignedAbilities(picked);
    });
  }, [totalRounds, allCards, rarityWeights]);

  useEffect(() => {
    if (!isOnlineMultiplayer) return;
    if (mp?.state?.status === 'playing') {
      // المعركة الجماعية لها حالة WebSocket مستقلة وتستعيد BATTLE_START حتى إن وصلت قبل فتح الشاشة.
      router.replace('/screens/multiplayer-battle' as any);
    }
  }, [mp?.state?.status, isOnlineMultiplayer, router]);

  useEffect(() => {
    if (isOnlineMultiplayer && mp?.state?.lastError) setWaitingForOpponent(false);
  }, [isOnlineMultiplayer, mp?.state?.lastError]);

  useEffect(() => {
    if (isLanMultiplayer && lan.match.phase === 'playing') router.replace('/screens/lan-battle' as any);
  }, [isLanMultiplayer, lan.match.phase, router]);

  const handleRoundSelect = (round: number) => {
    if (focusedCardIndex !== null) {
      const updated = [...cardRounds];
      const prev = updated[focusedCardIndex].round;
      const existingIdx = updated.findIndex((cr, idx) => cr.round === round && idx !== focusedCardIndex);
      if (existingIdx !== -1) updated[existingIdx].round = prev;
      updated[focusedCardIndex].round = round;
      setCardRounds(updated);
      setFocusedCardIndex(null);
    }
  };

  const handleStartBattle = () => {
    const allAssigned = cardRounds.every(cr => cr.round !== null);
    if (!allAssigned) return;

    // ✅ حماية: تأكد أن الدوال موجودة قبل الاستدعاء
    if (!setPlayerDeck || !startBattle) {
      console.error('[CardSelection] game context functions not ready — setPlayerDeck:', setPlayerDeck, 'startBattle:', startBattle);
      return;
    }

    // رتّب حسب اختيار اللاعب
    const sortedByRound = [...cardRounds]
      .sort((a, b) => (a.round || 0) - (b.round || 0))
      .map(cr => cr.card);

    // ✅ إجبار Turin على أول القائمة بغض النظر عن اختيار اللاعب
    const sorted = enforceTurinFirst(sortedByRound);

    if (isLocalTwoPlayer && localStage === 'host') {
      setHostDeck(sorted);
      setHostAbilities(assignedAbilities);
      setLocalStage('handover');
    } else if (isLocalTwoPlayer && localStage === 'guest') {
      if (!hostDeck.length) return;
      startBattle(hostDeck, hostAbilities, sorted, assignedAbilities);
      router.push('/screens/battle' as any);
    } else if (isLanMultiplayer) {
      setPlayerDeck(sorted);
      lan.submitArrangement(sorted);
      setWaitingForOpponent(true);
    } else if (isMultiplayer && mp?.sendArrangementReady) {
      setPlayerDeck(sorted);
      setWaitingForOpponent(mp.sendArrangementReady(sorted));
    } else {
      // Solo: البوت يستخدم نفس نسب الندرة المضبوطة للاعب، من دون قراءة ترتيب كروت اللاعب.
      const botDeck = getBotCards(sorted.length, state.difficulty, undefined, rarityWeights);
      setPlayerDeck(sorted);
      startBattle(sorted, assignedAbilities, botDeck);
      router.push('/screens/battle' as any);
    }
  };

  const handleGuestTakeover = () => {
    getDisabledAbilityIds().then(disabledIds => {
      const disabledTypes = idsToAbilityTypes(disabledIds);
      const available = ALL_ABILITIES.filter(ability => !disabledTypes.has(ability) && isAbilityInData(ability));
      const guestAbilities = [...available].sort(() => Math.random() - 0.5).slice(0, 3);
      const guestCards = sampleCardsByRarity(allCards, totalRounds, rarityWeights);
      setCardRounds(guestCards.map(card => ({ card, round: null })));
      setAssignedAbilities(guestAbilities);
      setFocusedCardIndex(null);
      setLocalStage('guest');
    });
  };

  const handleShuffleCards = () => {
    const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);
    for (let i = rounds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
    }
    setCardRounds(prev => prev.map((item, index) => ({ ...item, round: rounds[index] ?? null })));
  };

  const allAssigned = cardRounds.every(cr => cr.round !== null);
  const selectedCardRound = focusedCardIndex !== null ? cardRounds[focusedCardIndex]?.round ?? null : null;
  const focusedCard = focusedCardIndex !== null ? cardRounds[focusedCardIndex]?.card : undefined;
  const focusedAbilityPreview = focusedCard ? getCardAbilityDisplayText(focusedCard) : undefined;
  const suggestedRound = selectedCardRound === null
    ? Array.from({ length: totalRounds }, (_, i) => i + 1).find(round => !cardRounds.some(cr => cr.round === round)) ?? null
    : null;

  const startBtnLabel = () => {
    if (!allAssigned) return `${cardRounds.filter(c => c.round).length} / ${totalRounds} مُعيّنة`;
    if (isLocalTwoPlayer && localStage === 'host') return '✓ تثبيت ترتيب المضيف';
    if (isLocalTwoPlayer && localStage === 'guest') return '⚔️ تثبيت ترتيب الضيف وبدء المعركة';
    if (!isMultiplayer) return 'ابدأ المعركة ⚔️';
    if (waitingForOpponent) return opponentArrangementReady ? '✅ كلاكم جاهز، تبدأ...' : '⏳ انتظار الخصم...';
    return '✅ جاهز — اضغط للبدء';
  };

  const renderCardItem = ({ item, index }: { item: CardRound; index: number }) => (
    <TouchableOpacity
      style={[styles.cardCell, { width: gridCellW }]}
      onPress={() => !waitingForOpponent && localStage !== 'handover' && setFocusedCardIndex(index)}
      activeOpacity={0.8}
    >
      <View style={styles.cardWrapper}>
        <LuxuryCharacterCardAnimated
          card={item.card}
          style={{ width: gridCardW, height: gridCardH }}
          selectionLabel={item.round !== null ? `ج ${item.round}` : undefined}
          mediaMode={useStaticGridMedia ? 'static' : 'auto'}
        />
      </View>
      <View style={[styles.assignmentHint, item.round !== null && styles.assignmentHintAssigned]}>
        <Text style={[styles.assignmentHintText, item.round !== null && styles.assignmentHintTextAssigned]}>
          {item.round !== null ? `✓ الجولة ${item.round}` : '◌ غير معيّن'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <View style={styles.bgWrapper}><LuxuryBackground /></View>

      <View style={styles.container}>
        <View style={[styles.topBar, isCompactMobile && styles.topBarCompact]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/screens/leaderboard' as any)} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>
          <View style={[styles.titleGroup, isCompactMobile && styles.titleGroupCompact]}>
            <Text style={[styles.title, isCompactMobile && styles.titleCompact]}>{isLocalTwoPlayer ? `رتّب بطاقات ${localStage === 'guest' ? 'الضيف' : 'المضيف'}` : 'رتّب بطاقاتك'}</Text>
            <Text style={styles.subtitle}>{cardRounds.filter(c => c.round).length} / {totalRounds} مُعيّنة</Text>
          </View>
          <View style={styles.rightActionGroup}>
            {isLocalTwoPlayer && localStage !== 'handover' && (
              <View style={[styles.mpBadge, localStage === 'guest' && styles.mpBadgeReady]}>
                <Text style={styles.mpBadgeText}>{localStage === 'host' ? '👑 دور المضيف' : '🤝 دور الضيف'}</Text>
              </View>
            )}
            {isMultiplayer && !isCompactMobile && (
              <View style={[styles.mpBadge, opponentArrangementReady && styles.mpBadgeReady]}>
                {opponentArrangementReady
                  ? <Text style={styles.mpBadgeText}>✅ الخصم جاهز</Text>
                  : <>
                      <ActivityIndicator size="small" color="#94a3b8" style={{ marginLeft: 4 }} />
                      <Text style={styles.mpBadgeText}>⏳ الخصم يرتّب</Text>
                    </>
                }
              </View>
            )}
            <TouchableOpacity style={styles.abilitiesBtn} onPress={() => setIsAbilitiesModalOpen(true)} activeOpacity={0.7}>
              <Text style={styles.abilitiesBtnText}>⚡ القدرات</Text>
              <View style={styles.abilitiesBadge}>
                <Text style={styles.abilitiesBadgeText}>{assignedAbilities.length}/3</Text>
              </View>
            </TouchableOpacity>
            {!isCompactMobile && <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffleCards} activeOpacity={0.7} disabled={waitingForOpponent}>
              <Text style={styles.shuffleBtnText}>🔀</Text>
            </TouchableOpacity>}
          </View>
        </View>

        <Modal visible={isLocalTwoPlayer && localStage === 'handover'} transparent animationType="fade" onRequestClose={() => undefined}>
          <View style={styles.localHandoverOverlay}>
            <View style={styles.localHandoverCard}>
              <Text style={styles.localHandoverKicker}>✓ تم تثبيت ترتيب المضيف</Text>
              <Text style={styles.localHandoverTitle}>مرّر الجهاز إلى الضيف</Text>
              <Text style={styles.localHandoverDesc}>لن تظهر كروت المضيف أو مواضع جولاته في مرحلة الضيف. اضغط فقط بعد أن يصبح الضيف أمام الشاشة.</Text>
              <ProButton label="أنا الضيف — ابدأ ترتيبي" onPress={handleGuestTakeover} variant="primary" />
            </View>
          </View>
        </Modal>

        {isMultiplayer && (
          <View style={[styles.readyPanel, isRankedMatch && styles.rankedReadyPanel]}>
            <View style={styles.readyPanelTitleRow}>
              <Text style={styles.readyPanelTitle}>{isRankedMatch ? '⚔️ تجهيز مباراة تنافسية' : '🎴 تجهيز مباراة جماعية'}</Text>
              {isRankedMatch && <Text style={styles.readyPanelRank}>ELO {mp?.state?.rankedProfile?.rating ?? 1000}</Text>}
            </View>
            <View style={styles.readyStepsRow}>
              <ReadyStep label="رتّب بطاقاتك" done={allAssigned} />
              <ReadyStep label="تأكيد تشكيلتك" done={playerReady} />
              <ReadyStep label="جاهزية الخصم" done={opponentArrangementReady} />
            </View>
          </View>
        )}

        <FlatList
          data={cardRounds}
          renderItem={renderCardItem}
          keyExtractor={(_, i) => i.toString()}
          key={numColumns}
          numColumns={numColumns}
          contentContainerStyle={[styles.gridContent, { paddingHorizontal: padding }]}
          columnWrapperStyle={numColumns > 1 ? [styles.columnWrapper, { gap: gridGap, marginBottom: gridGap }] : undefined}
          style={styles.grid}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.bottomBar}>
          {isCompactMobile && (
            <TouchableOpacity
              style={[styles.mobileShuffleBtn, waitingForOpponent && styles.mobileShuffleBtnDisabled]}
              onPress={handleShuffleCards}
              activeOpacity={0.75}
              disabled={waitingForOpponent}
            >
              <Text style={styles.mobileShuffleBtnText}>🔀 ترتيب الكروت عشوائياً</Text>
            </TouchableOpacity>
          )}
          {isOnlineMultiplayer && mp?.state?.lastError && (
            <View style={styles.multiplayerErrorBanner}>
              <Text style={styles.multiplayerErrorText}>{mp.state.lastError}</Text>
            </View>
          )}
          {isMultiplayer && waitingForOpponent && !opponentArrangementReady && (
            <View style={styles.waitingBanner}>
              <ActivityIndicator size="small" color="#d4af37" />
              <Text style={styles.waitingBannerText}>تم تثبيت تشكيلتك — انتظار الخصم ليؤكد بطاقاته...</Text>
            </View>
          )}
          {isMultiplayer && waitingForOpponent && opponentArrangementReady && (
            <View style={[styles.waitingBanner, styles.allReadyBanner]}>
              <Text style={styles.waitingBannerText}>✓ تم تأكيد التشكيلتين — جارٍ افتتاح المعركة</Text>
            </View>
          )}
          <ProButton
            label={startBtnLabel()}
            onPress={handleStartBattle}
            variant="primary"
            disabled={!allAssigned || waitingForOpponent}
          />
        </View>
      </View>

      {/* Modal: تحديد الجولة */}
      <Modal visible={focusedCardIndex !== null} transparent animationType="fade" onRequestClose={() => setFocusedCardIndex(null)}>
        <TouchableOpacity style={styles.focusModalOverlay} activeOpacity={1} onPress={() => setFocusedCardIndex(null)}>
          <TouchableOpacity
            testID="round-picker-modal"
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[
              styles.focusModalContent,
              { width: focusModalWidth, padding: focusModalPadding, gap: focusModalGap },
              stackRoundPicker && styles.focusModalContentStacked,
            ]}
          >
            {focusedCardIndex !== null && cardRounds[focusedCardIndex] && (
              <View style={[styles.focusCardColumn, { width: focusCardW }]}> 
                <LuxuryCharacterCardAnimated
                  card={cardRounds[focusedCardIndex].card}
                  style={{ width: focusCardW, height: focusCardH }}
                  isOpenedView={true}
                  selectionLabel={selectedCardRound !== null ? `ج ${selectedCardRound}` : 'اختر جولة'}
                />
              </View>
            )}
              <View style={[styles.roundPickerPanel, { width: focusPickerW }]}> 
                <View style={styles.roundPickerHeader}>
                <Text style={styles.roundPickerTitle}>اختر الجولة</Text>
                <Text style={styles.roundPickerSubtitle} numberOfLines={2}>
                  {suggestedRound !== null
                    ? `الاقتراح الذهبي: ج ${suggestedRound}`
                    : 'يمكن اختيار خانة مستخدمة لتبديل الترتيب'}
                  </Text>
                </View>
                {focusedAbilityPreview && (
                  <View style={styles.focusAbilityPreview}>
                    <Text style={styles.focusAbilityPreviewTitle}>✦ معاينة القدرة</Text>
                    <Text style={styles.focusAbilityPreviewText} numberOfLines={3}>{focusedAbilityPreview}</Text>
                  </View>
                )}
                <ScrollView
                testID="round-picker-grid"
                style={[styles.roundPickerScroll, { maxHeight: roundPickerHeight }]}
                contentContainerStyle={[styles.roundPickerGrid, { gap: roundPickerGap }]}
                showsVerticalScrollIndicator={doesRoundPickerNeedScroll(totalRounds, {
                  roundPickerColumns,
                  roundPickerGap,
                  roundPickerHeight,
                })}
              >
                {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => {
                  const alreadyUsed = cardRounds.some((cr, idx) => cr.round === round && idx !== focusedCardIndex);
                  const isCurrentRound = selectedCardRound === round;
                  const isSuggested = suggestedRound === round;
                  return (
                    <TouchableOpacity
                      key={round}
                      testID={`round-picker-round-${round}`}
                      style={[
                        styles.roundPickerButton,
                        { width: roundPickerChipW },
                        alreadyUsed && styles.roundPickerButtonUsed,
                        isCurrentRound && styles.roundPickerButtonActive,
                        isSuggested && styles.roundPickerButtonSuggested,
                      ]}
                      onPress={() => handleRoundSelect(round)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.roundPickerButtonText,
                        alreadyUsed && styles.roundPickerButtonTextUsed,
                        (isCurrentRound || isSuggested) && styles.roundPickerButtonTextActive,
                      ]}>ج {round}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal: القدرات */}
      <Modal visible={isAbilitiesModalOpen} transparent animationType="fade" onRequestClose={() => setIsAbilitiesModalOpen(false)}>
        <TouchableOpacity style={styles.abilitiesModalOverlay} activeOpacity={1} onPress={() => setIsAbilitiesModalOpen(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.abilitiesModalContent, { width: abilityModalWidth, padding: modalPadding, maxHeight: Math.max(280, height * 0.88) }]}
          >
            <View style={[styles.abilitiesModalHeader, { marginBottom: modalHeaderMargin }]}> 
              <Text style={styles.abilitiesModalTitle} numberOfLines={1}>قدراتك لهذه الجلسة ⚡</Text>
              <TouchableOpacity onPress={() => setIsAbilitiesModalOpen(false)} style={{ padding: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {abilityPreviewHorizontal && assignedAbilities.length > 1 && (
              <Text style={styles.abilitiesModalHint}>اسحب جانبياً لمشاهدة كل كروت القدرات</Text>
            )}
            <ScrollView
              horizontal={abilityPreviewHorizontal}
              style={[styles.abilitiesModalScroll, !abilityPreviewHorizontal && { maxHeight: Math.max(220, height * 0.62) }]}
              showsHorizontalScrollIndicator={abilityPreviewHorizontal && assignedAbilities.length > 1}
              showsVerticalScrollIndicator={!abilityPreviewHorizontal && assignedAbilities.length > 3}
              directionalLockEnabled={abilityPreviewHorizontal}
              contentContainerStyle={[
                styles.abilitiesModalRail,
                abilityPreviewHorizontal && styles.abilitiesModalRailHorizontal,
                { gap: abilityPreviewGap, paddingHorizontal: abilityRailHorizontalPadding, paddingVertical: Math.max(6, modalPadding / 2) },
              ]}
            >
              {assignedAbilities.length > 0 ? (
                assignedAbilities.map((abilityType, index) => {
                  const data = resolveAbilityData(abilityType);
                  return (
                    <AbilityCard
                      key={index}
                      ability={{ id: index, nameEn: data.nameEn, nameAr: data.nameAr, description: data.description, icon: data.icon, rarity: data.rarity ?? 'Common', isActive: true }}
                      showActionButtons={false}
                      style={{ width: abilityPreviewCardW, height: abilityPreviewCardH }}
                    />
                  );
                })
              ) : (
                <Text style={{ color: '#64748b', paddingHorizontal: 8, paddingVertical: 16 }}>لا توجد قدرات متاحة</Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

function ReadyStep({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.readyStep}>
      <View style={[styles.readyDot, done && styles.readyDotDone]}><Text style={styles.readyDotText}>{done ? '✓' : '•'}</Text></View>
      <Text style={[styles.readyStepText, done && styles.readyStepTextDone]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bgWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  container: { flex: 1, zIndex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, backgroundColor: 'rgba(5,5,10,0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.2)' },
  topBarCompact: { paddingHorizontal: SPACE.sm, gap: SPACE.xs },
  backBtn: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  titleGroup: { alignItems: 'center' },
  titleGroupCompact: { flex: 1, minWidth: 0 },
  title: { color: '#d4af37', fontSize: 18, fontWeight: '800' },
  titleCompact: { fontSize: 16 },
  subtitle: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  rightActionGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  mpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, backgroundColor: 'rgba(148,163,184,0.1)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)' },
  mpBadgeReady: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.4)' },
  mpBadgeText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  abilitiesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  abilitiesBtnText: { color: '#c084fc', fontSize: 13, fontWeight: '700' },
  abilitiesBadge: { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  abilitiesBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  shuffleBtn: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  shuffleBtnText: { fontSize: 18 },
  readyPanel: { marginHorizontal: SPACE.md, marginTop: SPACE.sm, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.28)', borderRadius: RADIUS.md, gap: SPACE.xs },
  rankedReadyPanel: { backgroundColor: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.36)' },
  readyPanelTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readyPanelTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: '800' },
  readyPanelRank: { color: '#d4af37', fontSize: 11, fontWeight: '800' },
  readyStepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readyStep: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  readyDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(148,163,184,0.2)', alignItems: 'center', justifyContent: 'center' },
  readyDotDone: { backgroundColor: 'rgba(74,222,128,0.25)' },
  readyDotText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  readyStepText: { color: '#94a3b8', fontSize: 10 },
  readyStepTextDone: { color: '#4ade80' },
  grid: { flex: 1 },
  gridContent: { paddingVertical: SPACE.md },
  columnWrapper: {},
  cardCell: { alignItems: 'center', justifyContent: 'flex-start' },
  cardWrapper: { position: 'relative' },
  assignmentHint: { marginTop: SPACE.xs, paddingHorizontal: SPACE.sm, paddingVertical: 3, borderRadius: RADIUS.pill, backgroundColor: 'rgba(5,10,18,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  assignmentHintAssigned: { backgroundColor: 'rgba(212,175,55,0.16)', borderColor: 'rgba(212,175,55,0.58)' },
  assignmentHintText: { color: '#cbd5e1', fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  assignmentHintTextAssigned: { color: '#fde68a' },
  focusAbilityPreview: { marginTop: SPACE.xs, marginBottom: SPACE.xs, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(212,175,55,0.42)', backgroundColor: 'rgba(212,175,55,0.09)' },
  focusAbilityPreviewTitle: { color: '#fde68a', fontSize: 10, fontWeight: '900', writingDirection: 'rtl' },
  focusAbilityPreviewText: { color: '#e2e8f0', fontSize: 10, lineHeight: 16, marginTop: 2, writingDirection: 'rtl' },
  bottomBar: { padding: SPACE.md, backgroundColor: 'rgba(5,5,10,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(212,175,55,0.2)', alignItems: 'center', gap: SPACE.sm },
  mobileShuffleBtn: { alignSelf: 'stretch', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(167,139,250,0.72)', backgroundColor: 'rgba(124,58,237,0.2)', paddingHorizontal: SPACE.md },
  mobileShuffleBtnDisabled: { opacity: 0.42 },
  mobileShuffleBtnText: { color: '#ddd6fe', fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  waitingBannerText: { color: '#d4af37', fontSize: 12, fontWeight: '700' },
  multiplayerErrorBanner: { alignSelf: 'stretch', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)', backgroundColor: 'rgba(127,29,29,0.28)', paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
  multiplayerErrorText: { color: '#fecaca', fontSize: 12, fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' },
  allReadyBanner: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.30)' },
  localHandoverOverlay: { flex: 1, backgroundColor: 'rgba(3,7,18,0.96)', alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  localHandoverCard: { width: '100%', maxWidth: 460, gap: SPACE.lg, padding: SPACE.xl, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(56,189,248,0.45)', backgroundColor: 'rgba(14,25,43,0.98)' },
  localHandoverKicker: { color: '#fde68a', fontSize: FONT.sm, textAlign: 'center', fontWeight: '800' },
  localHandoverTitle: { color: '#bae6fd', fontSize: FONT.xxl, textAlign: 'center', fontWeight: '900' },
  localHandoverDesc: { color: '#94a3b8', fontSize: FONT.base, textAlign: 'center', lineHeight: 22 },
  focusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  focusModalContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,10,20,0.97)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  focusModalContentStacked: { flexDirection: 'column' },
  focusCardColumn: { alignItems: 'center', justifyContent: 'center' },
  roundPickerPanel: { alignSelf: 'stretch', minWidth: 0, backgroundColor: 'rgba(2,6,23,0.62)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(148,163,184,0.22)', padding: 8 },
  roundPickerHeader: { marginBottom: 8, gap: 2 },
  roundPickerTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800', textAlign: 'right' },
  roundPickerSubtitle: { color: '#94a3b8', fontSize: 11, fontWeight: '600', textAlign: 'right', lineHeight: 16 },
  roundPickerScroll: { flexGrow: 0 },
  roundPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
  roundPickerButton: { height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  roundPickerButtonUsed: { borderColor: 'rgba(248,113,113,0.38)', backgroundColor: 'rgba(248,113,113,0.08)' },
  roundPickerButtonActive: { borderColor: '#d4af37', backgroundColor: 'rgba(212,175,55,0.22)' },
  roundPickerButtonSuggested: { borderColor: 'rgba(250,204,21,0.92)', backgroundColor: 'rgba(250,204,21,0.14)' },
  roundPickerButtonText: { color: '#e2e8f0', fontSize: 13, fontWeight: '800' },
  roundPickerButtonTextUsed: { color: '#fca5a5' },
  roundPickerButtonTextActive: { color: '#fde68a' },
  focusModalRightCol: { alignItems: 'center' },
  abilitiesModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  abilitiesModalContent: { width: '90%', maxWidth: 700, backgroundColor: 'rgba(5,10,22,0.98)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(168,85,247,0.38)', shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  abilitiesModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.2)', gap: 12 },
  abilitiesModalTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#f8fafc', writingDirection: 'rtl', textAlign: 'right' },
  abilitiesModalHint: { color: '#c4b5fd', fontSize: 11, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl', marginBottom: 3 },
  abilitiesModalScroll: { flexGrow: 0, width: '100%' },
  abilitiesModalRail: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center', width: '100%' },
  abilitiesModalRailHorizontal: { flexWrap: 'nowrap', justifyContent: 'flex-start', alignItems: 'flex-start' },
});
