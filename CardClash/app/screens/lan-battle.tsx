import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';
import { useLanMultiplayer } from '@/lib/lan/lan-context';
import { isLanGameOver } from '@/lib/lan/lan-match-engine';
import { ABILITY_DETAILS, CATEGORY_CONFIG } from '@/lib/game/ability-details';
import { determineRoundWinner } from '@/lib/game/cards-data-exports';
import { useBattleLayout } from '@/utils/layout';

function getRoundExplanation(result: NonNullable<ReturnType<typeof useLanMultiplayer>['match']['lastResult']>): string {
  if (result.winner === 'draw') return 'تعادل الكرتان: لم تمنح العناصر أفضلية فاصلة وتساوت نتيجة المقارنة بعد تطبيق التأثيرات.';
  const winner = result.winner === 'host' ? result.hostCard : result.guestCard;
  const loser = result.winner === 'host' ? result.guestCard : result.hostCard;
  if (result.advantage === 'element') return `فاز ${winner.name} بأفضلية العنصر على ${loser.name} قبل مقارنة الهجوم والدفاع.`;
  const winnerNet = Math.max(0, (winner.attack ?? 0) - (loser.defense ?? 0));
  const loserNet = Math.max(0, (loser.attack ?? 0) - (winner.defense ?? 0));
  return `فاز ${winner.name}: قوة الهجوم بعد دفاع الخصم ${winnerNet} مقابل ${loserNet} للكرت الآخر، بعد تطبيق القدرات والتأثيرات.`;
}

function getDynamicAudioWinner(match: ReturnType<typeof useLanMultiplayer>['match']): 'host' | 'guest' | null {
  if (match.phase === 'result' && match.lastResult) return match.lastResult.winner === 'draw' ? null : match.lastResult.winner;
  if (match.phase !== 'playing') return null;
  const hostCard = match.hostDeck[match.currentRound];
  const guestCard = match.guestDeck[match.currentRound];
  if (!hostCard || !guestCard) return null;

  const round = match.currentRound + 1;
  const effects = match.activeEffects.filter(effect => effect.createdAtRound <= round && (effect.expiresAtRound === undefined || round <= effect.expiresAtRound) && (effect.charges === undefined || effect.charges > 0));
  const decisive = effects
    .filter(effect => ['absoluteDominance', 'forcedOutcome', 'starAdvantage'].includes(effect.kind))
    .filter(effect => !(effect.data as { appliesToRound?: number } | undefined)?.appliesToRound || (effect.data as { appliesToRound?: number }).appliesToRound === round)
    .sort((left, right) => right.priority - left.priority)[0];
  if (decisive) {
    if (decisive.kind === 'forcedOutcome' && (decisive.data as { outcome?: string } | undefined)?.outcome === 'draw') return null;
    return decisive.sourceSide === 'player' ? 'host' : 'guest';
  }

  const hostEffects = effects.filter(effect => effect.targetSide === 'player' || effect.targetSide === 'all');
  const guestEffects = effects.filter(effect => effect.targetSide === 'bot' || effect.targetSide === 'all');
  const predicted = determineRoundWinner(hostCard, guestCard, hostEffects, guestEffects, match.abilitiesEnabled).winner;
  return predicted === 'player' ? 'host' : predicted === 'bot' ? 'guest' : null;
}

/** ساحة Wi‑Fi تتبع ترتيب اللعب الفردي: الخصم في الأعلى، الأمر والنتيجة في الوسط، وكرت اللاعب في الأسفل. */
export default function LanBattleScreen() {
  const router = useRouter();
  const { state: connectionState, match, revealCurrentCard, useAbility, confirmNextRound, finishMatch, leave } = useLanMultiplayer();
  const [isAbilitiesOpen, setIsAbilitiesOpen] = useState(false);
  const { cardWidth, cardHeight, arenaPadding, arenaGap, centerWidth, actionButtonWidth, actionButtonHeight, isCompact, isLandscape } = useBattleLayout();
  const isHost = match.role === 'host';
  const myName = isHost ? match.hostName : match.guestName;
  const opponentName = isHost ? match.guestName : match.hostName;
  const myScore = isHost ? match.hostScore : match.guestScore;
  const opponentScore = isHost ? match.guestScore : match.hostScore;
  const myCard = (isHost ? match.hostDeck : match.guestDeck)[match.currentRound];
  const opponentCard = (isHost ? match.guestDeck : match.hostDeck)[match.currentRound];
  const iRevealed = isHost ? match.hostRevealed : match.guestRevealed;
  const opponentRevealed = isHost ? match.guestRevealed : match.hostRevealed;
  const iNextReady = isHost ? match.hostNextReady : match.guestNextReady;
  const opponentNextReady = isHost ? match.guestNextReady : match.hostNextReady;
  const myAbilities = isHost ? match.hostAbilities : match.guestAbilities;
  const result = match.lastResult;
  const gameOver = !!result && isLanGameOver(result, match.totalRounds);
  const iWonRound = result?.winner === (isHost ? 'host' : 'guest');
  const resultExplanation = result ? getRoundExplanation(result) : null;
  const audioWinner = getDynamicAudioWinner(match);
  const myCardAudio = audioWinner === (isHost ? 'host' : 'guest');
  const opponentCardAudio = audioWinner === (isHost ? 'guest' : 'host');

  useEffect(() => {
    if (match.phase === 'idle') router.replace('/screens/game-mode' as any);
  }, [match.phase, router]);

  if (!match.role) return null;

  const exit = () => {
    leave();
    router.replace('/screens/game-mode' as any);
  };

  if (match.phase === 'finished') {
    const finalWinner = match.hostScore === match.guestScore ? 'draw' : match.hostScore > match.guestScore ? 'host' : 'guest';
    const iWon = finalWinner === (isHost ? 'host' : 'guest');
    return <View style={styles.root}><StatusBar hidden /><LuxuryBackground />
      <View style={styles.finalBox}>
        <Text style={styles.finalIcon}>{finalWinner === 'draw' ? '🤝' : iWon ? '🏆' : '🛡️'}</Text>
        <Text style={[styles.finalTitle, { color: finalWinner === 'draw' ? '#facc15' : iWon ? '#86efac' : '#fca5a5' }]}>{finalWinner === 'draw' ? 'تعادل!' : iWon ? 'فزت بالمباراة!' : 'فاز الخصم'}</Text>
        <Text style={styles.finalScore}>{myName} {myScore} — {opponentScore} {opponentName}</Text>
        <Text style={styles.finalHint}>تمت مزامنة النتيجة عبر الشبكة المحلية.</Text>
        <TouchableOpacity style={[styles.actionButton, styles.homeButton]} onPress={exit}><Text style={styles.actionText}>العودة لأنماط اللعب</Text></TouchableOpacity>
      </View>
    </View>;
  }

  const action = () => {
    if (match.phase === 'playing') revealCurrentCard();
    else if (match.phase === 'result' && result) {
      if (gameOver) finishMatch();
      else confirmNextRound();
    }
  };

  const canAct = match.phase === 'playing'
    ? !iRevealed
    : match.phase === 'result' && (gameOver ? isHost : !iNextReady);
  const actionLabel = match.phase === 'playing'
    ? iRevealed ? 'تم التأكيد — انتظار الخصم' : '⚔️ تأكيد المواجهة'
    : gameOver ? 'إظهار النتيجة النهائية'
    : iNextReady ? 'تم التأكيد — انتظار الخصم' : '▶ جاهز للجولة التالية';
  const roundLabel = result
    ? (result.winner === 'draw' ? '🤝 تعادل الجولة' : iWonRound ? '🏆 فزت بالجولة' : '🏆 فاز الخصم بالجولة')
    : iRevealed && !opponentRevealed ? 'تم تأكيد كرتك — انتظار الخصم'
    : opponentRevealed && !iRevealed ? 'الخصم جاهز — أكد المواجهة'
    : 'أكد كرتك لبدء المواجهة';
  const nextHint = match.phase === 'result' && !gameOver
    ? iNextReady && opponentNextReady ? 'يتم فتح الجولة التالية…' : iNextReady ? 'بانتظار تأكيد الخصم للجولة التالية' : opponentNextReady ? 'الخصم جاهز — اضغط للمتابعة' : 'يجب أن يؤكد الطرفان للانتقال'
    : null;

  return <View style={styles.root}>
    <StatusBar hidden />
    <View style={styles.background}><LuxuryBackground /></View>
    <View style={styles.hud}>
      <View style={styles.hudSide}><Text style={styles.myScore}>{myScore}</Text><Text style={styles.myName}>{myName || 'أنت'}</Text></View>
      <View style={styles.hudCenter}><Text style={styles.lanBadge}>📡 Wi‑Fi محلي</Text><Text style={styles.round}>الجولة {Math.min(match.currentRound + 1, match.totalRounds)} / {match.totalRounds}</Text></View>
      <View style={[styles.hudSide, styles.hudSideRight]}><Text style={styles.opponentScore}>{opponentScore}</Text><Text style={styles.opponentName}>{opponentName || 'الخصم'}</Text></View>
    </View>

    <View style={[styles.arena, { flexDirection: isLandscape ? 'row' : 'column-reverse', paddingHorizontal: arenaPadding, gap: arenaGap }]}>
      <View style={[styles.cardPanel, !isLandscape && styles.cardPanelPortrait]}>
        <Text style={styles.myName}>{myName || 'أنت'}</Text>
        {myCard ? <LuxuryCharacterCardAnimated card={myCard} style={{ width: cardWidth, height: cardHeight }} isOpenedView={iRevealed || match.phase === 'result'} playAudio={myCardAudio} winnerState={result?.winner === (isHost ? 'host' : 'guest') ? 'winner' : null} /> : <View style={[styles.hiddenCard, { width: cardWidth, height: cardHeight }]}><Text style={styles.hiddenMark}>?</Text></View>}
      </View>

      <View style={[styles.centerPanel, { width: isLandscape ? centerWidth : undefined, minHeight: isLandscape ? undefined : 94, gap: Math.max(6, arenaGap) }]}>
        <Text style={[styles.vs, { fontSize: isCompact ? 20 : 28 }]}>⚔️</Text>
        <Text style={[styles.status, result && (iWonRound ? styles.statusWin : result.winner === 'draw' ? styles.statusDraw : styles.statusLoss)]}>{roundLabel}</Text>
        {resultExplanation && <View style={styles.resultExplanation}><Text style={styles.resultExplanationTitle}>📋 معاينة النتيجة — كيف حُسمت الجولة؟</Text><Text style={styles.resultExplanationText}>{resultExplanation}</Text></View>}
        {nextHint && <Text style={styles.nextHint}>{nextHint}</Text>}
        {match.phase === 'playing' && match.abilitiesEnabled && (
          <TouchableOpacity
            disabled={iRevealed || myAbilities.every(ability => ability.used)}
            style={[styles.abilityButton, (iRevealed || myAbilities.every(ability => ability.used)) && styles.disabledButton]}
            onPress={() => setIsAbilitiesOpen(true)}
          >
            <Text style={styles.abilityButtonText}>✨ قدراتي {myAbilities.filter(ability => !ability.used).length}/{myAbilities.length}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity disabled={!canAct} style={[styles.actionButton, { width: actionButtonWidth, minHeight: actionButtonHeight }, !canAct && styles.disabledButton, match.phase === 'result' && styles.nextButton]} onPress={action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
        {match.phase === 'result' && gameOver && !isHost && <Text style={styles.hostControls}>المضيف يعرض النتيجة النهائية</Text>}
      </View>

      <View style={[styles.cardPanel, !isLandscape && styles.cardPanelPortrait]}>
        <Text style={styles.opponentName}>{opponentName || 'الخصم'}</Text>
        {opponentCard ? <LuxuryCharacterCardAnimated card={opponentCard} style={{ width: cardWidth, height: cardHeight }} isOpenedView={opponentRevealed || match.phase === 'result'} playAudio={opponentCardAudio} winnerState={result?.winner === (isHost ? 'guest' : 'host') ? 'winner' : null} /> : <View style={[styles.hiddenCard, { width: cardWidth, height: cardHeight }]}><Text style={styles.hiddenMark}>?</Text></View>}
      </View>
    </View>
    <Modal visible={isAbilitiesOpen} transparent animationType="fade" onRequestClose={() => setIsAbilitiesOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.abilitiesModal}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>✨ قدرات {myName || 'اللاعب'}</Text><TouchableOpacity onPress={() => setIsAbilitiesOpen(false)}><Text style={styles.closeText}>إغلاق</Text></TouchableOpacity></View>
          <Text style={styles.modalHint}>اختر قدرة واحدة قبل تأكيد المواجهة. تستخدم كل قدرة مرة واحدة وتُزامن للطرفين.</Text>
          <ScrollView contentContainerStyle={styles.abilityList} showsVerticalScrollIndicator={false}>
            {myAbilities.map((ability, index) => {
              const detail = ABILITY_DETAILS[ability.type];
              const category = CATEGORY_CONFIG[detail.category];
              return <TouchableOpacity
                key={`${ability.type}-${index}`}
                disabled={ability.used || iRevealed}
                style={[styles.abilityCard, { borderColor: category.color }, (ability.used || iRevealed) && styles.abilityCardUsed]}
                onPress={() => { useAbility(ability.type); setIsAbilitiesOpen(false); }}
              >
                <Text style={[styles.abilityName, { color: category.color }]}>{category.emoji} {detail.nameAr}</Text>
                <Text style={styles.abilityDescription}>{detail.effectAr}</Text>
                <Text style={styles.abilityState}>{ability.used ? 'اُستخدمت' : 'اضغط للاستخدام'}</Text>
              </TouchableOpacity>;
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
    {connectionState !== 'connected' && <View style={styles.disconnectBar}><Text style={styles.disconnectText}>انقطع الاتصال المحلي. ارجع وأنشئ الغرفة من جديد.</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLOR.bgDeep }, background: { ...StyleSheet.absoluteFillObject, opacity: 0.96 },
  hud: { minHeight: 66, paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(8,6,18,0.88)', borderBottomWidth: 1, borderBottomColor: 'rgba(167,139,250,0.35)' },
  hudSide: { flex: 1, gap: 2 }, hudSideRight: { alignItems: 'flex-end' }, hudCenter: { alignItems: 'center', gap: 2 }, lanBadge: { color: '#c4b5fd', fontSize: FONT.xs, fontWeight: '900' }, round: { color: '#e5e7eb', fontSize: FONT.sm, fontWeight: '800' }, myScore: { color: '#86efac', fontSize: FONT.xxl, fontWeight: '900' }, opponentScore: { color: '#fca5a5', fontSize: FONT.xxl, fontWeight: '900' }, myName: { color: '#86efac', fontSize: FONT.sm, fontWeight: '800', textAlign: 'right' }, opponentName: { color: '#fca5a5', fontSize: FONT.sm, fontWeight: '800', textAlign: 'left' },
  arena: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.sm }, cardPanel: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, minHeight: 0 }, cardPanelPortrait: { flex: 0, width: '100%' }, centerPanel: { alignItems: 'center', justifyContent: 'center' }, vs: { color: COLOR.gold }, status: { color: '#cbd5e1', fontSize: FONT.xs, textAlign: 'center', maxWidth: 220, lineHeight: 18 }, statusWin: { color: '#86efac' }, statusDraw: { color: '#facc15' }, statusLoss: { color: '#fca5a5' }, nextHint: { color: '#c4b5fd', fontSize: 10, textAlign: 'center', maxWidth: 220, lineHeight: 15 },
  hiddenCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.82)', borderRadius: RADIUS.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(167,139,250,0.55)' }, hiddenMark: { color: '#a78bfa', fontSize: 48, fontWeight: '900' },
  actionButton: { borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,222,128,0.14)', borderWidth: 1.5, borderColor: '#4ade80', paddingHorizontal: SPACE.md }, abilityButton: { minHeight: 34, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.14)', borderWidth: 1, borderColor: '#a78bfa', paddingHorizontal: SPACE.md }, abilityButtonText: { color: '#ddd6fe', fontSize: 10, fontWeight: '900' }, nextButton: { backgroundColor: 'rgba(96,165,250,0.14)', borderColor: '#60a5fa' }, disabledButton: { backgroundColor: 'rgba(71,85,105,0.28)', borderColor: '#475569' }, actionText: { color: '#f8fafc', fontSize: FONT.xs, fontWeight: '900', textAlign: 'center' }, hostControls: { color: '#94a3b8', fontSize: 10, textAlign: 'center' }, resultExplanation: { width: '100%', maxWidth: 270, backgroundColor: 'rgba(15,23,42,0.9)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.5)', borderRadius: RADIUS.md, padding: SPACE.sm, gap: 3 }, resultExplanationTitle: { color: '#fde68a', fontSize: 10, fontWeight: '900', textAlign: 'right' }, resultExplanationText: { color: '#e2e8f0', fontSize: 10, lineHeight: 15, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.84)', justifyContent: 'center', padding: SPACE.lg }, abilitiesModal: { maxHeight: '78%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(167,139,250,0.65)', borderRadius: RADIUS.lg, padding: SPACE.md, gap: SPACE.sm }, modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { color: '#f8fafc', fontWeight: '900', fontSize: FONT.md }, closeText: { color: '#c4b5fd', fontWeight: '800', fontSize: FONT.xs }, modalHint: { color: '#cbd5e1', fontSize: 11, lineHeight: 17, textAlign: 'right' }, abilityList: { gap: SPACE.sm }, abilityCard: { borderWidth: 1, borderRadius: RADIUS.md, backgroundColor: 'rgba(15,23,42,0.94)', padding: SPACE.sm, gap: 4 }, abilityCardUsed: { opacity: 0.45 }, abilityName: { fontSize: FONT.sm, fontWeight: '900', textAlign: 'right' }, abilityDescription: { color: '#e2e8f0', fontSize: 11, textAlign: 'right', lineHeight: 17 }, abilityState: { color: '#94a3b8', fontSize: 10, textAlign: 'right' },
  disconnectBar: { paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, backgroundColor: 'rgba(127,29,29,0.92)', alignItems: 'center' }, disconnectText: { color: '#fecaca', fontSize: FONT.xs, textAlign: 'center' },
  finalBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xl, gap: SPACE.md }, finalIcon: { fontSize: 68 }, finalTitle: { fontSize: FONT.xxl, fontWeight: '900', textAlign: 'center' }, finalScore: { color: '#e2e8f0', fontSize: FONT.md, textAlign: 'center', lineHeight: 26 }, finalHint: { color: '#c4b5fd', fontSize: FONT.xs, textAlign: 'center' }, homeButton: { width: 210, minHeight: 48, borderColor: COLOR.gold, backgroundColor: 'rgba(228,165,42,0.16)', marginTop: SPACE.md },
});
