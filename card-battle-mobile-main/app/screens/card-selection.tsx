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
import { RotateHintScreen } from '@/components/game/RotateHintScreen';
import { useGame } from '@/lib/game/game-context';
import { useCards } from '@/lib/game/useCards';
import { Card, AbilityType } from '@/lib/game/types';
import { ALL_ABILITIES, NAME_TO_ABILITY_TYPE } from '@/lib/game/abilities';
import { getDisabledAbilityIds } from '@/lib/game/abilities-store';
import { AbilityCard, AbilityData } from '@/components/game/ability-card';
import { abilities as allAbilitiesData } from '@/data/abilities';
import { ProButton } from '@/components/ui/ProButton';
import { SPACE, RADIUS } from '@/components/ui/design-tokens';
import type { RarityWeights, RarityKey } from '@/lib/game/game-context';
import {
  useLandscapeLayout,
  useCardSize,
  GRID_COLUMNS,
  LAYOUT_PADDING,
} from '@/utils/layout';

// Multiplayer — آمن حتى لو الـ provider غير موجود
let useMultiplayer: (() => any) | null = null;
try { useMultiplayer = require('@/lib/multiplayer/multiplayer-context').useMultiplayer; } catch {}
function useSafeMultiplayer() {
  try { return useMultiplayer?.() ?? null; } catch { return null; }
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
  const { width, height, isLandscape, size } = useLandscapeLayout();

  // Dynamic scaling parameters for the abilities modal in card selection:
  const selModalH = height * 0.95 - 100;
  const selCardH = Math.max(140, Math.min(240, selModalH));
  const selCardW = Math.round(selCardH * (160 / 240));

  const modalPadding = height < 400 ? 10 : 20;
  const modalGap = height < 400 ? 8 : 12;
  const modalHeaderMargin = height < 400 ? 8 : 16;

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
  const totalRounds = state.totalRounds || 5;

  const allCards = useCards();
  const numColumns = GRID_COLUMNS[size];
  const padding = LAYOUT_PADDING[size];
  const { cardW: gridCardW, cardH: gridCardH } = useCardSize('selection');
  const { cardW: modalCardW, cardH: modalCardH } = useCardSize('modal');

  const mp = useSafeMultiplayer();
  const isMultiplayer = !!mp?.state?.roomId;
  const opponentArrangementReady = mp?.state?.opponentArrangementReady ?? false;
  const isRankedMatch = mp?.state?.isRankedMatch ?? false;
  const playerReady = mp?.state?.isPlayerReady ?? false;

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
    if (!isMultiplayer) return;
    if (mp?.state?.status === 'playing') {
      router.push('/screens/battle' as any);
    }
  }, [mp?.state?.status, isMultiplayer]);

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

    if (isMultiplayer && mp?.sendArrangementReady) {
      setPlayerDeck(sorted);
      mp.sendArrangementReady(sorted);
      setWaitingForOpponent(true);
    } else {
      setPlayerDeck(sorted);
      startBattle(sorted, assignedAbilities);
      router.push('/screens/battle' as any);
    }
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

  if (!isLandscape) return <RotateHintScreen />;

  const startBtnLabel = () => {
    if (!allAssigned) return `${cardRounds.filter(c => c.round).length} / ${totalRounds} مُعيّنة`;
    if (!isMultiplayer) return 'ابدأ المعركة ⚔️';
    if (waitingForOpponent) return opponentArrangementReady ? '✅ كلاكم جاهز، تبدأ...' : '⏳ انتظار الخصم...';
    return '✅ جاهز — اضغط للبدء';
  };

  const renderCardItem = ({ item, index }: { item: CardRound; index: number }) => (
    <TouchableOpacity
      style={[styles.cardCell, { width: (width - padding * 2 - SPACE.md * (numColumns - 1)) / numColumns }]}
      onPress={() => !waitingForOpponent && setFocusedCardIndex(index)}
      activeOpacity={0.8}
    >
      <View style={styles.cardWrapper}>
        <LuxuryCharacterCardAnimated
          card={item.card}
          style={{ width: gridCardW, height: gridCardH }}
        />
        {item.round !== null ? (
          <View style={styles.roundOverlay}>
            <View style={styles.roundBadge}>
              <Text style={styles.roundBadgeText}>الجولة {item.round}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.unassignedOverlay}>
            <Text style={styles.unassignedText}>انقر للتعيين</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <View style={styles.bgWrapper}><LuxuryBackground /></View>

      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/screens/leaderboard' as any)} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← رجوع</Text>
          </TouchableOpacity>
          <View style={styles.titleGroup}>
            <Text style={styles.title}>رتّب بطاقاتك</Text>
            <Text style={styles.subtitle}>{cardRounds.filter(c => c.round).length} / {totalRounds} مُعيّنة</Text>
          </View>
          <View style={styles.rightActionGroup}>
            {isMultiplayer && (
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
            <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffleCards} activeOpacity={0.7} disabled={waitingForOpponent}>
              <Text style={styles.shuffleBtnText}>🔀</Text>
            </TouchableOpacity>
          </View>
        </View>

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
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          style={styles.grid}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.bottomBar}>
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
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={styles.focusModalContentRow}>
            <View style={styles.focusModalLeftCol}>
              {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => {
                const alreadyUsed = cardRounds.some((cr, idx) => cr.round === round && idx !== focusedCardIndex);
                return (
                  <TouchableOpacity key={round} style={[styles.focusRoundBtn, alreadyUsed && styles.focusRoundBtnUsed]} onPress={() => handleRoundSelect(round)} activeOpacity={0.7}>
                    <View style={[
                      styles.focusRoundBadge,
                      alreadyUsed && styles.focusRoundBadgeUsed,
                      focusedCardIndex !== null && cardRounds[focusedCardIndex]?.round === round && styles.focusRoundBadgeActive,
                    ]}>
                      <Text style={[styles.focusRoundText, alreadyUsed && styles.focusRoundTextUsed]}>ج {round}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {focusedCardIndex !== null && cardRounds[focusedCardIndex] && (
              <View style={styles.focusModalRightCol}>
                <LuxuryCharacterCardAnimated
                  card={cardRounds[focusedCardIndex].card}
                  style={{ width: modalCardW, height: modalCardH }}
                  isOpenedView={true}
                />
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal: القدرات */}
      <Modal visible={isAbilitiesModalOpen} transparent animationType="fade" onRequestClose={() => setIsAbilitiesModalOpen(false)}>
        <TouchableOpacity style={styles.abilitiesModalOverlay} activeOpacity={1} onPress={() => setIsAbilitiesModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={[styles.abilitiesModalContent, { padding: modalPadding }]}>
            <View style={[styles.abilitiesModalHeader, { marginBottom: modalHeaderMargin }]}>
              <Text style={styles.abilitiesModalTitle}>قدراتك لهذه الجلسة ⚡</Text>
              <TouchableOpacity onPress={() => setIsAbilitiesModalOpen(false)} style={{ padding: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: modalGap, paddingHorizontal: 8, paddingVertical: 8 }}>
              {assignedAbilities.length > 0 ? (
                assignedAbilities.map((abilityType, index) => {
                  const data = resolveAbilityData(abilityType);
                  return (
                    <AbilityCard
                      key={index}
                      ability={{ id: index, nameEn: data.nameEn, nameAr: data.nameAr, description: data.description, icon: data.icon, rarity: data.rarity ?? 'Common', isActive: true }}
                      showActionButtons={false}
                      style={{ width: selCardW, height: selCardH }}
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
  backBtn: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  titleGroup: { alignItems: 'center' },
  title: { color: '#d4af37', fontSize: 18, fontWeight: '800' },
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
  columnWrapper: { gap: SPACE.md, marginBottom: SPACE.md },
  cardCell: { alignItems: 'center' },
  cardWrapper: { position: 'relative' },
  roundOverlay: { position: 'absolute', top: 6, left: 6, right: 6, alignItems: 'center' },
  roundBadge: { backgroundColor: 'rgba(212,175,55,0.9)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  roundBadgeText: { color: '#1a1a1a', fontSize: 11, fontWeight: '800' },
  unassignedOverlay: { position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center' },
  unassignedText: { color: '#fff', fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  bottomBar: { padding: SPACE.md, backgroundColor: 'rgba(5,5,10,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(212,175,55,0.2)', alignItems: 'center', gap: SPACE.sm },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  waitingBannerText: { color: '#d4af37', fontSize: 12, fontWeight: '700' },
  allReadyBanner: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.30)' },
  focusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  focusModalContentRow: { flexDirection: 'row', alignItems: 'center', gap: 24, backgroundColor: 'rgba(10,10,20,0.97)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  focusModalLeftCol: { gap: 10 },
  focusRoundBtn: { alignItems: 'center' },
  focusRoundBtnUsed: { opacity: 0.5 },
  focusRoundBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', minWidth: 90, alignItems: 'center' },
  focusRoundBadgeUsed: { borderColor: 'rgba(248,113,113,0.4)', backgroundColor: 'rgba(248,113,113,0.08)' },
  focusRoundBadgeActive: { borderColor: '#d4af37', backgroundColor: 'rgba(212,175,55,0.2)' },
  focusRoundText: { color: '#e2e8f0', fontSize: 14, fontWeight: '700' },
  focusRoundTextUsed: { color: '#f87171' },
  focusModalRightCol: { alignItems: 'center' },
  abilitiesModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  abilitiesModalContent: { width: '90%', maxWidth: 700, backgroundColor: 'rgba(10,15,30,0.97)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(51,65,85,0.8)' },
  abilitiesModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  abilitiesModalTitle: { fontSize: 16, fontWeight: '800', color: '#f8fafc' },
});
