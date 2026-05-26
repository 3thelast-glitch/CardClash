/**
 * MultiplayerBattleScreen
 * معركة أونلاين — لاعب ضد لاعب عبر WebSocket
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
} from 'react-native-reanimated';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { ElementEffect } from '@/components/game/element-effect';
import { RotateHintScreen } from '@/components/game/RotateHintScreen';
import { useLandscapeLayout, CARD_WIDTH_FACTOR } from '@/utils/layout';
import { mpClient, MPMessage } from '@/lib/multiplayer/websocket-client';
import { useGame } from '@/lib/game/game-context';
import { COLOR, SPACE, RADIUS, FONT, SHADOW } from '@/components/ui/design-tokens';

type MPBattlePhase =
  | 'waiting_start'     // ننتظر BATTLE_START
  | 'selection'         // اختيار الكرت
  | 'waiting_opponent'  // أرسلنا كرتنا، ننتظر الخصم
  | 'result'            // نتيجة الجولة
  | 'game_over';        // نهاية

export default function MultiplayerBattleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape, size } = useLandscapeLayout();
  const params = useLocalSearchParams<{
    roomId: string;
    playerId: string;
    playerName: string;
    opponentName: string;
  }>();

  const { currentPlayerCard } = useGame();

  const maxH = height * 0.54;
  const cardWidth = Math.min(width * CARD_WIDTH_FACTOR[size] * 0.88, maxH / 1.5);
  const cardHeight = cardWidth * 1.5;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<MPBattlePhase>('waiting_start');
  const [myCards, setMyCards] = useState<any[]>([]);
  const [opponentCards, setOpponentCards] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [myScore, setMyScore] = useState(3);
  const [oppScore, setOppScore] = useState(3);
  const [lastResult, setLastResult] = useState<any>(null);
  const [gameOver, setGameOver] = useState<any>(null);
  const [oppCardRevealed, setOppCardRevealed] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [isPlayer1, setIsPlayer1] = useState(true);

  // ─── Animations ─────────────────────────────────────────────────────────────
  const myCardAnim = useSharedValue(0);
  const oppCardAnim = useSharedValue(0);
  const resultOp = useSharedValue(0);
  const myStyle = useAnimatedStyle(() => ({ transform: [{ scale: myCardAnim.value }] }));
  const oppStyle = useAnimatedStyle(() => ({ transform: [{ scale: oppCardAnim.value }] }));
  const resultStyle = useAnimatedStyle(() => ({ opacity: resultOp.value }));

  const enterCards = useCallback(() => {
    myCardAnim.value = 0; oppCardAnim.value = 0; resultOp.value = 0;
    myCardAnim.value = withDelay(80, withTiming(1, { duration: 280 }));
    oppCardAnim.value = withDelay(240, withTiming(1, { duration: 280 }));
  }, []);

  // ─── WebSocket listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(mpClient.on('BATTLE_START', (msg: MPMessage) => {
      const { player1, player2, totalRounds: tr, p1Score, p2Score } = msg.payload;
      const iAmP1 = player1.id === params.playerId;
      setIsPlayer1(iAmP1);
      setMyCards(iAmP1 ? player1.cards : player2.cards);
      setOpponentCards(iAmP1 ? player2.cards : player1.cards);
      setTotalRounds(tr);
      setMyScore(iAmP1 ? p1Score : p2Score);
      setOppScore(iAmP1 ? p2Score : p1Score);
      setCurrentRound(0);
      setPhase('selection');
      enterCards();
    }));

    unsubs.push(mpClient.on('OPPONENT_CARD_REVEALED', () => {
      setOppCardRevealed(true);
    }));

    unsubs.push(mpClient.on('ROUND_RESULT', (msg: MPMessage) => {
      const r = msg.payload;
      const myWin = (isPlayer1 && r.winner === 'player1') || (!isPlayer1 && r.winner === 'player2');
      setLastResult({ ...r, myWin });
      setMyScore(isPlayer1 ? r.p1Score : r.p2Score);
      setOppScore(isPlayer1 ? r.p2Score : r.p1Score);
      resultOp.value = withTiming(1, { duration: 300 });
      setPhase('result');
      setOppCardRevealed(false);
    }));

    unsubs.push(mpClient.on('GAME_OVER', (msg: MPMessage) => {
      setGameOver(msg.payload);
      setPhase('game_over');
    }));

    unsubs.push(mpClient.on('OPPONENT_DISCONNECTED', () => {
      setDisconnected(true);
      Alert.alert('⚠️ الخصم انقطع', 'الخصم فقد الاتصال — 30 ثانية للعودة');
    }));

    unsubs.push(mpClient.on('OPPONENT_LEFT_PERMANENTLY', () => {
      Alert.alert('🏳️ الخصم انسحب', 'فزت بالمباراة!', [
        { text: 'حسناً', onPress: () => router.replace('/screens/splash' as any) },
      ]);
    }));

    return () => unsubs.forEach(u => u());
  }, [params.playerId, isPlayer1, enterCards]);

  // ─── الكرت الحالي ────────────────────────────────────────────────────────────
  const myCurrentCard = myCards[currentRound];
  const oppCurrentCard = opponentCards[currentRound];

  // ─── كشف كرتي ────────────────────────────────────────────────────────────────
  const handleReveal = useCallback(() => {
    if (!myCurrentCard) return;
    mpClient.revealCard(params.playerId, currentRound, myCurrentCard);
    setPhase('waiting_opponent');
  }, [myCurrentCard, params.playerId, currentRound]);

  // ─── التالي ──────────────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    setCurrentRound(r => r + 1);
    setLastResult(null);
    setPhase('selection');
    enterCards();
  }, [enterCards]);

  if (!isLandscape) return <RotateHintScreen />;

  // ─── Game Over ───────────────────────────────────────────────────────────────
  if (phase === 'game_over' && gameOver) {
    const iWon = (isPlayer1 && gameOver.winner === 'player1') ||
                 (!isPlayer1 && gameOver.winner === 'player2');
    const isDraw = gameOver.winner === 'draw';
    return (
      <View style={S.root}>
        <LuxuryBackground />
        <View style={S.gameOverBox}>
          <Text style={S.gameOverIcon}>{isDraw ? '🤝' : iWon ? '🏆' : '💀'}</Text>
          <Text style={[S.gameOverTitle, { color: isDraw ? '#fbbf24' : iWon ? '#4ade80' : '#f87171' }]}>
            {isDraw ? 'تعادل!' : iWon ? 'فزت!' : 'خسرت!'}
          </Text>
          <Text style={S.gameOverScore}>
            {myScore} — {oppScore}
          </Text>
          <TouchableOpacity style={[S.btn, S.btnHome]} onPress={() => router.replace('/screens/splash' as any)}>
            <Text style={S.btnText}>🏠 الرئيسية</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const myCard = phase === 'result' && lastResult ? (isPlayer1 ? lastResult.p1Card : lastResult.p2Card) : myCurrentCard;
  const oppCard = phase === 'result' && lastResult ? (isPlayer1 ? lastResult.p2Card : lastResult.p1Card) : (oppCardRevealed ? oppCurrentCard : null);

  return (
    <View style={S.root}>
      <StatusBar hidden />
      <View style={S.bg}><LuxuryBackground /></View>

      {/* HUD */}
      <View style={[S.hud, { paddingLeft: Math.max(insets.left, 8), paddingRight: Math.max(insets.right, 8) }]}>
        <View style={S.hudSide}>
          <Text style={[S.hudName, { color: '#4ade80' }]}>{params.playerName}</Text>
          <Text style={[S.hudScore, { color: '#4ade80' }]}>{myScore}</Text>
        </View>
        <View style={S.hudCenter}>
          <Text style={S.hudRound}>جولة {currentRound + 1} / {totalRounds}</Text>
          {phase === 'waiting_start' && <Text style={S.waitText}>⌛ انتظار...</Text>}
        </View>
        <View style={[S.hudSide, { alignItems: 'flex-end' }]}>
          <Text style={[S.hudScore, { color: '#f87171' }]}>{oppScore}</Text>
          <Text style={[S.hudName, { color: '#f87171', textAlign: 'right' }]}>{params.opponentName}</Text>
        </View>
      </View>

      {/* Arena */}
      <View style={[S.arena, { paddingLeft: Math.max(insets.left, 8), paddingRight: Math.max(insets.right, 8) }]}>

        {/* My Card */}
        <View style={S.panel}>
          <Text style={S.panelLabel}>{params.playerName}</Text>
          {myCard ? (
            <Animated.View style={myStyle}>
              <LuxuryCharacterCardAnimated
                card={myCard}
                style={{ width: cardWidth, height: cardHeight }}
                isOpenedView={phase === 'result' && lastResult?.myWin}
              />
              {phase === 'result' && <ElementEffect element={myCard.element} isActive />}
            </Animated.View>
          ) : (
            <View style={[S.emptyCard, { width: cardWidth, height: cardHeight }]}>
              <Text style={S.emptyCardText}>?</Text>
            </View>
          )}
        </View>

        {/* Center */}
        <View style={S.center}>
          <Text style={S.vsIcon}>⚔️</Text>

          {/* Result badge */}
          {phase === 'result' && lastResult && (
            <Animated.View style={[S.resultBadge, resultStyle, {
              borderColor: lastResult.myWin ? '#4ade80' : lastResult.winner === 'draw' ? '#fbbf24' : '#f87171',
              backgroundColor: lastResult.myWin ? 'rgba(74,222,128,0.12)' : lastResult.winner === 'draw' ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.12)',
            }]}>
              <Text style={[S.resultText, {
                color: lastResult.myWin ? '#4ade80' : lastResult.winner === 'draw' ? '#fbbf24' : '#f87171',
              }]}>
                {lastResult.myWin ? '🏆 فزت!' : lastResult.winner === 'draw' ? '🤝 تعادل' : '💀 خسرت'}
              </Text>
            </Animated.View>
          )}

          {/* CTA */}
          {phase === 'selection' && (
            <TouchableOpacity style={[S.btn, S.btnAttack]} onPress={handleReveal} activeOpacity={0.85}>
              <Text style={S.btnIcon}>⚔️</Text>
              <Text style={S.btnText}>اكشف كرتك</Text>
            </TouchableOpacity>
          )}
          {phase === 'waiting_opponent' && (
            <View style={[S.btn, S.btnWait]}>
              <Text style={S.btnText}>⌛ ننتظر الخصم...</Text>
            </View>
          )}
          {phase === 'result' && (
            <TouchableOpacity style={[S.btn, S.btnNext]} onPress={handleNext} activeOpacity={0.85}>
              <Text style={S.btnText}>▶️ التالي</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Opponent Card */}
        <View style={S.panel}>
          <Text style={[S.panelLabel, { color: '#f87171' }]}>{params.opponentName}</Text>
          {oppCard ? (
            <Animated.View style={oppStyle}>
              <LuxuryCharacterCardAnimated
                card={oppCard}
                style={{ width: cardWidth, height: cardHeight }}

              />
              {phase === 'result' && <ElementEffect element={oppCard.element} isActive />}
            </Animated.View>
          ) : (
            <View style={[S.emptyCard, { width: cardWidth, height: cardHeight }]}>
              <Text style={[S.emptyCardText, { color: oppCardRevealed ? '#fbbf24' : '#475569' }]}>
                {oppCardRevealed ? '✓' : '?'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Disconnect warning */}
      {disconnected && (
        <View style={S.disconnectBar}>
          <Text style={S.disconnectText}>⚠️ الخصم انقطع — ينتظر عودته...</Text>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080612' },
  bg: { position: 'absolute', inset: 0 },
  hud: { height: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(8,6,18,0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(228,165,42,0.18)', paddingHorizontal: SPACE.lg, gap: SPACE.sm },
  hudSide: { flex: 1, gap: 2 },
  hudCenter: { width: 140, alignItems: 'center' },
  hudName: { fontSize: FONT.xs, letterSpacing: 0.4 },
  hudScore: { fontSize: FONT.xxl, fontVariant: ['tabular-nums'] } as any,
  hudRound: { color: '#e2e8f0', fontSize: FONT.sm },
  waitText: { color: '#fbbf24', fontSize: FONT.xs },
  arena: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, gap: SPACE.sm },
  panel: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,26,10,0.4)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', borderRadius: RADIUS.lg, paddingVertical: SPACE.lg, height: '100%', gap: SPACE.sm },
  panelLabel: { color: '#4ade80', fontSize: FONT.xs - 2, letterSpacing: 1 },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyCardText: { fontSize: 48, color: '#475569' },
  center: { width: 148, alignItems: 'center', gap: SPACE.md, zIndex: 20 },
  vsIcon: { fontSize: 28 },
  resultBadge: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center' },
  resultText: { fontSize: FONT.base, letterSpacing: 0.5 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: SPACE.xl, borderWidth: 1.5 },
  btnAttack: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: '#4ade80' },
  btnNext: { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: '#60a5fa' },
  btnWait: { backgroundColor: 'rgba(71,85,105,0.2)', borderColor: '#475569' },
  btnHome: { backgroundColor: 'rgba(228,165,42,0.12)', borderColor: COLOR.gold, marginTop: SPACE.lg },
  btnIcon: { fontSize: 16 },
  btnText: { color: '#f1f5f9', fontSize: FONT.sm },
  disconnectBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,113,113,0.15)', padding: SPACE.md, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(248,113,113,0.3)' },
  disconnectText: { color: '#f87171', fontSize: FONT.sm },
  gameOverBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.lg },
  gameOverIcon: { fontSize: 72 },
  gameOverTitle: { fontSize: FONT.xxl + 8, letterSpacing: 1 },
  gameOverScore: { fontSize: FONT.xxl, color: '#e2e8f0', letterSpacing: 4 },
});
