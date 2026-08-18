import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { COLOR, FONT, RADIUS, SPACE } from '@/components/ui/design-tokens';
import { useLanMultiplayer } from '@/lib/lan/lan-context';
import { isLanGameOver } from '@/lib/lan/lan-match-engine';
import { useBattleLayout } from '@/utils/layout';

export default function LanBattleScreen() {
  const router = useRouter();
  const { state: connectionState, match, revealCurrentCard, advanceRound, finishMatch, leave } = useLanMultiplayer();
  const { cardWidth, cardHeight, arenaPadding, arenaGap, centerWidth, actionButtonWidth, actionButtonHeight, isCompact, isLandscape } = useBattleLayout();
  const role = match.role;
  const isHost = role === 'host';
  const myName = isHost ? match.hostName : match.guestName;
  const opponentName = isHost ? match.guestName : match.hostName;
  const myScore = isHost ? match.hostScore : match.guestScore;
  const opponentScore = isHost ? match.guestScore : match.hostScore;
  const myCard = (isHost ? match.hostDeck : match.guestDeck)[match.currentRound];
  const opponentCard = (isHost ? match.guestDeck : match.hostDeck)[match.currentRound];
  const iRevealed = isHost ? match.hostRevealed : match.guestRevealed;
  const opponentRevealed = isHost ? match.guestRevealed : match.hostRevealed;
  const result = match.lastResult;
  const gameOver = !!result && isLanGameOver(result, match.totalRounds);
  const iWonRound = result?.winner === (isHost ? 'host' : 'guest');

  useEffect(() => {
    if (match.phase !== 'idle') return;
    router.replace('/screens/game-mode' as any);
  }, [match.phase, router]);

  const exit = () => {
    leave();
    router.replace('/screens/game-mode' as any);
  };

  if (!role) return null;

  if (match.phase === 'finished') {
    const finalWinner = match.hostScore === match.guestScore ? 'draw' : match.hostScore > match.guestScore ? 'host' : 'guest';
    const iWon = finalWinner === (isHost ? 'host' : 'guest');
    return (
      <View style={styles.root}>
        <StatusBar hidden />
        <LuxuryBackground />
        <View style={styles.finalBox}>
          <Text style={styles.finalIcon}>{finalWinner === 'draw' ? '🤝' : iWon ? '🏆' : '🛡️'}</Text>
          <Text style={[styles.finalTitle, { color: finalWinner === 'draw' ? '#facc15' : iWon ? '#86efac' : '#fca5a5' }]}>{finalWinner === 'draw' ? 'تعادل!' : iWon ? 'فزت بالمباراة!' : 'فاز الخصم'}</Text>
          <Text style={styles.finalScore}>{myName} {myScore} — {opponentScore} {opponentName}</Text>
          <Text style={styles.finalHint}>تمت مزامنة النتيجة عبر الشبكة المحلية.</Text>
          <TouchableOpacity style={[styles.actionButton, styles.homeButton]} onPress={exit}><Text style={styles.actionText}>العودة لأنماط اللعب</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const action = () => {
    if (match.phase === 'playing') {
      revealCurrentCard();
    } else if (match.phase === 'result' && result) {
      if (gameOver) finishMatch();
      else advanceRound();
    }
  };

  const canAct = match.phase === 'playing'
    ? !iRevealed
    : match.phase === 'result' && isHost;
  const actionLabel = match.phase === 'playing'
    ? iRevealed ? 'تم كشف كرتك — انتظار الخصم' : 'اكشف كرتك'
    : gameOver ? 'إظهار النتيجة النهائية' : 'ابدأ الجولة التالية';
  const roundLabel = result
    ? (result.winner === 'draw' ? 'تعادل' : iWonRound ? 'فزت بالجولة' : 'فاز الخصم بالجولة')
    : iRevealed && !opponentRevealed ? 'تم كشف كرتك — انتظار الخصم'
    : opponentRevealed && !iRevealed ? 'الخصم جاهز — اكشف كرتك'
    : 'اكشف كرتك عند الجاهزية';

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={styles.background}><LuxuryBackground /></View>
      <View style={styles.hud}>
        <View style={styles.hudSide}><Text style={styles.score}>{opponentScore}</Text><Text style={styles.opponentName}>{opponentName || 'الضيف'}</Text></View>
        <View style={styles.hudCenter}><Text style={styles.lanBadge}>📡 Wi‑Fi محلي</Text><Text style={styles.round}>الجولة {Math.min(match.currentRound + 1, match.totalRounds)} / {match.totalRounds}</Text></View>
        <View style={[styles.hudSide, styles.myHud]}><Text style={styles.score}>{myScore}</Text><Text style={styles.myName}>{myName || 'أنت'}</Text></View>
      </View>

      <View style={[styles.arena, { flexDirection: isLandscape ? 'row' : 'column', paddingHorizontal: arenaPadding, gap: arenaGap }]}>
        <View style={[styles.cardPanel, !isLandscape && styles.cardPanelPortrait]}>
          <Text style={styles.opponentName}>{opponentName || 'الخصم'}</Text>
          {opponentCard && (match.phase === 'result' || opponentRevealed) ? (
            <LuxuryCharacterCardAnimated card={opponentCard} style={{ width: cardWidth, height: cardHeight }} winnerState={result?.winner === (isHost ? 'guest' : 'host') ? 'winner' : null} />
          ) : <View style={[styles.hiddenCard, { width: cardWidth, height: cardHeight }]}><Text style={styles.hiddenMark}>?</Text></View>}
        </View>

        <View style={[styles.centerPanel, { width: isLandscape ? centerWidth : undefined, minHeight: isLandscape ? undefined : 90, gap: Math.max(6, arenaGap) }]}>
          <Text style={[styles.vs, { fontSize: isCompact ? 20 : 28 }]}>⚔️</Text>
          <Text style={[styles.status, result && (iWonRound ? styles.statusWin : result.winner === 'draw' ? styles.statusDraw : styles.statusLoss)]}>{roundLabel}</Text>
          <TouchableOpacity disabled={!canAct} style={[styles.actionButton, { width: actionButtonWidth, minHeight: actionButtonHeight }, !canAct && styles.disabledButton, match.phase === 'result' && styles.nextButton]} onPress={action}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
          {match.phase === 'result' && !isHost && <Text style={styles.hostControls}>المضيف يفتح الجولة التالية</Text>}
        </View>

        <View style={[styles.cardPanel, !isLandscape && styles.cardPanelPortrait]}>
          <Text style={styles.myName}>{myName || 'أنت'}</Text>
          {myCard ? <LuxuryCharacterCardAnimated card={myCard} style={{ width: cardWidth, height: cardHeight }} isOpenedView={iRevealed || match.phase === 'result'} winnerState={result?.winner === (isHost ? 'host' : 'guest') ? 'winner' : null} /> : <View style={[styles.hiddenCard, { width: cardWidth, height: cardHeight }]}><Text style={styles.hiddenMark}>?</Text></View>}
        </View>
      </View>

      {connectionState !== 'connected' && <View style={styles.disconnectBar}><Text style={styles.disconnectText}>انقطع الاتصال المحلي. ارجع وأنشئ الغرفة من جديد.</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLOR.bgDeep },
  background: { ...StyleSheet.absoluteFillObject, opacity: 0.96 },
  hud: { minHeight: 66, paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(8,6,18,0.88)', borderBottomWidth: 1, borderBottomColor: 'rgba(167,139,250,0.35)' },
  hudSide: { flex: 1, gap: 2 }, myHud: { alignItems: 'flex-end' }, hudCenter: { alignItems: 'center', gap: 2 }, lanBadge: { color: '#c4b5fd', fontSize: FONT.xs, fontWeight: '900' }, round: { color: '#e5e7eb', fontSize: FONT.sm, fontWeight: '800' }, score: { color: '#f6e3a4', fontSize: FONT.xxl, fontWeight: '900' }, myName: { color: '#86efac', fontSize: FONT.sm, fontWeight: '800', textAlign: 'right' }, opponentName: { color: '#fca5a5', fontSize: FONT.sm, fontWeight: '800', textAlign: 'left' },
  arena: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.sm }, cardPanel: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, minHeight: 0 }, cardPanelPortrait: { flex: 0, width: '100%' }, centerPanel: { alignItems: 'center', justifyContent: 'center' }, vs: { color: COLOR.gold }, status: { color: '#cbd5e1', fontSize: FONT.xs, textAlign: 'center', maxWidth: 180, lineHeight: 18 }, statusWin: { color: '#86efac' }, statusDraw: { color: '#facc15' }, statusLoss: { color: '#fca5a5' },
  hiddenCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.82)', borderRadius: RADIUS.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(167,139,250,0.55)' }, hiddenMark: { color: '#a78bfa', fontSize: 48, fontWeight: '900' },
  actionButton: { borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,222,128,0.14)', borderWidth: 1.5, borderColor: '#4ade80', paddingHorizontal: SPACE.md }, nextButton: { backgroundColor: 'rgba(96,165,250,0.14)', borderColor: '#60a5fa' }, disabledButton: { backgroundColor: 'rgba(71,85,105,0.28)', borderColor: '#475569' }, actionText: { color: '#f8fafc', fontSize: FONT.xs, fontWeight: '900', textAlign: 'center' }, hostControls: { color: '#94a3b8', fontSize: 10, textAlign: 'center' },
  disconnectBar: { paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, backgroundColor: 'rgba(127,29,29,0.92)', alignItems: 'center' }, disconnectText: { color: '#fecaca', fontSize: FONT.xs, textAlign: 'center' },
  finalBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xl, gap: SPACE.md }, finalIcon: { fontSize: 68 }, finalTitle: { fontSize: FONT.xxl, fontWeight: '900', textAlign: 'center' }, finalScore: { color: '#e2e8f0', fontSize: FONT.md, textAlign: 'center', lineHeight: 26 }, finalHint: { color: '#c4b5fd', fontSize: FONT.xs, textAlign: 'center' }, homeButton: { width: 210, minHeight: 48, borderColor: COLOR.gold, backgroundColor: 'rgba(228,165,42,0.16)', marginTop: SPACE.md },
});
