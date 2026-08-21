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
import { useBattleLayout } from '@/utils/layout';
import { useOrientationTransition } from '@/utils/orientation-transition';
import { mpClient, MPMessage } from '@/lib/multiplayer/websocket-client';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import { useSettings } from '@/lib/game/hooks/useSettings';
import { COLOR, SPACE, RADIUS, FONT } from '@/components/ui/design-tokens';

type MPBattlePhase =
  | 'waiting_start'     // ننتظر BATTLE_START
  | 'selection'         // اختيار الكرت
  | 'waiting_opponent'  // أرسلنا كرتنا، ننتظر الخصم
  | 'result'            // نتيجة الجولة
  | 'game_over';        // نهاية

export default function MultiplayerBattleScreen() {
  const router = useRouter();
  const multiplayer = useMultiplayer();
  const insets = useSafeAreaInsets();
  const {
    cardWidth,
    cardHeight,
    arenaPadding,
    arenaGap,
    centerWidth,
    actionButtonWidth,
    actionButtonHeight,
    hudPadding,
    isCompact,
    isLandscape,
  } = useBattleLayout();
  const { settings } = useSettings();
  const { animatedStyle: orientationStyle, layoutTransition } = useOrientationTransition(
    isLandscape,
    settings.animationsEnabled,
  );
  const params = useLocalSearchParams<{
    roomId: string;
    playerId: string;
    playerName: string;
    opponentName: string;
  }>();


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
  const [endBattleClicked, setEndBattleClicked] = useState(false);
  const [turnPlayerId, setTurnPlayerId] = useState<string | null>(null);
  const isAdvancingRound = useRef(false);
  const playerId = multiplayer.state.playerId || params.playerId;

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

  const hydrateBattle = useCallback((payload: {
    player1: { id: string; cards?: any[] };
    player2: { id: string; cards?: any[] };
    totalRounds: number;
    p1Score: number;
    p2Score: number;
    turnPlayerId?: string | null;
  }) => {
    const iAmP1 = payload.player1.id === playerId;
    isAdvancingRound.current = false;
    setIsPlayer1(iAmP1);
    setMyCards(iAmP1 ? payload.player1.cards ?? [] : payload.player2.cards ?? []);
    setOpponentCards(iAmP1 ? payload.player2.cards ?? [] : payload.player1.cards ?? []);
    setTotalRounds(payload.totalRounds);
    setMyScore(iAmP1 ? payload.p1Score : payload.p2Score);
    setOppScore(iAmP1 ? payload.p2Score : payload.p1Score);
    setTurnPlayerId(payload.turnPlayerId ?? payload.player1.id);
    setCurrentRound(0);
    setEndBattleClicked(false);
    setPhase('selection');
    enterCards();
  }, [enterCards, playerId]);

  // إذا وصل BATTLE_START قبل تثبيت شاشة الساحة، تُستعاد الحالة من MultiplayerProvider بدلاً من ضياع الرسالة.
  useEffect(() => {
    if (multiplayer.state.status !== 'playing' || !multiplayer.state.totalRounds || !multiplayer.state.playerCards.length || !multiplayer.state.opponentCards.length) return;
    const p1IsMe = multiplayer.state.isHost;
    hydrateBattle({
      player1: {
        id: p1IsMe ? multiplayer.state.playerId : multiplayer.state.opponentId ?? 'opponent',
        cards: p1IsMe ? multiplayer.state.playerCards : multiplayer.state.opponentCards,
      },
      player2: {
        id: p1IsMe ? multiplayer.state.opponentId ?? 'opponent' : multiplayer.state.playerId,
        cards: p1IsMe ? multiplayer.state.opponentCards : multiplayer.state.playerCards,
      },
      totalRounds: multiplayer.state.totalRounds,
      p1Score: p1IsMe ? multiplayer.state.playerScore : multiplayer.state.opponentScore,
      p2Score: p1IsMe ? multiplayer.state.opponentScore : multiplayer.state.playerScore,
      turnPlayerId: multiplayer.state.isHost ? multiplayer.state.playerId : multiplayer.state.opponentId,
    });
  }, [hydrateBattle, multiplayer.state.isHost, multiplayer.state.opponentCards, multiplayer.state.opponentId, multiplayer.state.opponentScore, multiplayer.state.playerCards, multiplayer.state.playerId, multiplayer.state.playerScore, multiplayer.state.status, multiplayer.state.totalRounds]);

  // ─── WebSocket listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(mpClient.on('BATTLE_START', (msg: MPMessage) => {
      hydrateBattle(msg.payload);
    }));

    unsubs.push(mpClient.on('TURN_CHANGED', (msg: MPMessage) => {
      setTurnPlayerId(msg.payload?.turnPlayerId ?? null);
    }));

    unsubs.push(mpClient.on('OPPONENT_CARD_REVEALED', () => {
      setOppCardRevealed(true);
    }));

    unsubs.push(mpClient.on('ROUND_RESULT', (msg: MPMessage) => {
      const r = msg.payload;
      isAdvancingRound.current = false;
      const myWin = (isPlayer1 && r.winner === 'player1') || (!isPlayer1 && r.winner === 'player2');
      
      const p1WinState = r.winner === 'player1' ? 'win' : r.winner === 'player2' ? 'lose' : 'draw';
      const p2WinState = r.winner === 'player2' ? 'win' : r.winner === 'player1' ? 'lose' : 'draw';

      const p1Card = r.p1Card ? { ...r.p1Card, winState: p1WinState } : undefined;
      const p2Card = r.p2Card ? { ...r.p2Card, winState: p2WinState } : undefined;

      setLastResult({
        ...r,
        p1Card,
        p2Card,
        myWin,
      });
      setMyScore(isPlayer1 ? r.p1Score : r.p2Score);
      setOppScore(isPlayer1 ? r.p2Score : r.p1Score);
      resultOp.value = withTiming(1, { duration: 300 });
      setPhase('result');
      setOppCardRevealed(false);
    }));

    unsubs.push(mpClient.on('GAME_OVER', (msg: MPMessage) => {
      setGameOver(msg.payload);
      setPhase(curr => {
        if (curr === 'result') {
          return curr;
        }
        return 'game_over';
      });
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
  }, [hydrateBattle, isPlayer1, router]);

  useEffect(() => {
    if (gameOver && endBattleClicked) {
      setPhase('game_over');
    }
  }, [gameOver, endBattleClicked]);

  const handleEndMPBattle = useCallback(() => {
    setEndBattleClicked(true);
    if (gameOver) {
      setPhase('game_over');
    } else {
      Alert.alert('⌛ في انتظار نتيجة المعركة', 'ننتظر استلام النتيجة النهائية من السيرفر...');
    }
  }, [gameOver]);

  // ─── الكرت الحالي ────────────────────────────────────────────────────────────
  const myCurrentCard = myCards[currentRound];
  const oppCurrentCard = opponentCards[currentRound];

  // ─── كشف كرتي ────────────────────────────────────────────────────────────────
  const handleReveal = useCallback(() => {
    if (!myCurrentCard || turnPlayerId !== playerId) return;
    mpClient.revealCard(playerId, currentRound, myCurrentCard);
    setPhase('waiting_opponent');
  }, [myCurrentCard, playerId, currentRound, turnPlayerId]);

  // ─── التالي ──────────────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (isAdvancingRound.current || phase !== 'result' || currentRound >= totalRounds - 1) return;
    isAdvancingRound.current = true;
    setCurrentRound(r => r + 1);
    setLastResult(null);
    setPhase('selection');
    enterCards();
  }, [currentRound, enterCards, phase, totalRounds]);


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
      <View style={[S.hud, { paddingLeft: Math.max(insets.left, hudPadding), paddingRight: Math.max(insets.right, hudPadding), height: isCompact ? 52 : 60 }]}>
        <View style={S.hudSide}>
          <Text style={[S.hudName, { color: '#4ade80' }]}>{params.playerName}</Text>
          <Text style={[S.hudScore, { color: '#4ade80' }]}>{myScore}</Text>
        </View>
        <View style={[S.hudCenter, isLandscape ? { width: centerWidth } : S.hudCenterPortrait]}>
          <Text style={S.hudRound}>جولة {currentRound + 1} / {totalRounds}</Text>
          {phase === 'waiting_start' && <Text style={S.waitText}>⌛ انتظار...</Text>}
        </View>
        <View style={[S.hudSide, { alignItems: 'flex-end' }]}>
          <Text style={[S.hudScore, { color: '#f87171' }]}>{oppScore}</Text>
          <Text style={[S.hudName, { color: '#f87171', textAlign: 'right' }]}>{params.opponentName}</Text>
        </View>
      </View>

      {/* Arena */}
      <Animated.View
        testID="multiplayer-battle-arena"
        layout={layoutTransition}
        style={[
          S.arena,
          orientationStyle,
          {
            paddingLeft: Math.max(insets.left, arenaPadding),
            paddingRight: Math.max(insets.right, arenaPadding),
            paddingTop: isCompact ? 8 : SPACE.md,
            paddingBottom: isLandscape ? 0 : Math.max(4, arenaGap / 2),
            gap: arenaGap,
            flexDirection: isLandscape ? 'row' : 'column',
          },
        ]}
      >

        {/* My Card */}
        <View testID="multiplayer-player-panel" style={[S.panel, !isLandscape && S.panelPortrait]}>
          <Text style={S.panelLabel}>{params.playerName}</Text>
          {myCard ? (
            <Animated.View style={myStyle}>
              <LuxuryCharacterCardAnimated
                card={myCard}
                style={{ width: cardWidth, height: cardHeight }}
                isOpenedView={phase === 'result' && lastResult?.myWin}
                winnerState={phase === 'result' && myCard?.winState === 'win' ? 'winner' : null}
              />
            </Animated.View>
          ) : (
            <View style={[S.emptyCard, { width: cardWidth, height: cardHeight }]}>
              <Text style={S.emptyCardText}>?</Text>
            </View>
          )}
        </View>

        {/* Center */}
        <View testID="multiplayer-command-panel" style={[
          S.center,
          !isLandscape && S.centerPortrait,
          { width: centerWidth, gap: Math.max(6, arenaGap) },
        ]}>
          <Text style={[S.vsIcon, { fontSize: isCompact ? 20 : 28 }]}>⚔️</Text>

          {/* Result badge */}
          {phase === 'result' && lastResult && (
            <>
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
              {lastResult.personalInsight && <Text style={S.personalInsight}>{lastResult.personalInsight}</Text>}
            </>
          )}

          {/* CTA */}
          {phase === 'selection' && turnPlayerId === params.playerId && (
            <TouchableOpacity style={[S.btn, S.btnAttack, { width: actionButtonWidth, minHeight: actionButtonHeight, paddingHorizontal: isCompact ? 4 : SPACE.sm }]} onPress={handleReveal} activeOpacity={0.85}>
              <Text style={S.btnIcon}>⚔️</Text>
              <Text style={S.btnText}>اكشف كرتك</Text>
            </TouchableOpacity>
          )}
          {phase === 'selection' && turnPlayerId !== params.playerId && (
            <View style={[S.btn, S.btnWait, { width: actionButtonWidth, minHeight: actionButtonHeight, paddingHorizontal: isCompact ? 4 : SPACE.sm }]}> 
              <Text style={S.btnText}>⌛ دور الخصم أولاً...</Text>
            </View>
          )}
          {phase === 'waiting_opponent' && (
            <View style={[S.btn, S.btnWait, { width: actionButtonWidth, minHeight: actionButtonHeight, paddingHorizontal: isCompact ? 4 : SPACE.sm }]}>
              <Text style={S.btnText}>⌛ ننتظر الخصم...</Text>
            </View>
          )}
          {phase === 'result' && currentRound < totalRounds - 1 && (
            <TouchableOpacity style={[S.btn, S.btnNext, { width: actionButtonWidth, minHeight: actionButtonHeight, paddingHorizontal: isCompact ? 4 : SPACE.sm }]} onPress={handleNext} activeOpacity={0.85}>
              <Text style={S.btnText}>▶️ التالي</Text>
            </TouchableOpacity>
          )}
          {phase === 'result' && currentRound === totalRounds - 1 && (
            <TouchableOpacity style={[S.btn, S.btnEndBattle, { width: actionButtonWidth, minHeight: actionButtonHeight, paddingHorizontal: isCompact ? 4 : SPACE.sm }]} onPress={handleEndMPBattle} activeOpacity={0.85}>
              <Text style={S.btnText}>🏁 إنهاء المعركة</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Opponent Card */}
        <View testID="multiplayer-bot-panel" style={[S.panel, !isLandscape && S.panelPortrait]}>
          <Text style={[S.panelLabel, { color: '#f87171' }]}>{params.opponentName}</Text>
          {oppCard ? (
            <Animated.View style={oppStyle}>
              <LuxuryCharacterCardAnimated
                card={oppCard}
                style={{ width: cardWidth, height: cardHeight }}
                winnerState={phase === 'result' && oppCard?.winState === 'win' ? 'winner' : null}
              />
            </Animated.View>
          ) : (
            <View style={[S.emptyCard, { width: cardWidth, height: cardHeight }]}>
              <Text style={[S.emptyCardText, { color: oppCardRevealed ? '#fbbf24' : '#475569' }]}>
                {oppCardRevealed ? '✓' : '?'}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

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
  hudCenter: { alignItems: 'center' },
  hudCenterPortrait: { flex: 0.75 },
  hudName: { fontSize: FONT.xs, letterSpacing: 0.4 },
  hudScore: { fontSize: FONT.xxl, fontVariant: ['tabular-nums'] } as any,
  hudRound: { color: '#e2e8f0', fontSize: FONT.sm },
  waitText: { color: '#fbbf24', fontSize: FONT.xs },
  arena: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, gap: SPACE.sm },
  panel: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,26,10,0.4)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', borderRadius: RADIUS.lg, paddingVertical: SPACE.lg, height: '100%', gap: SPACE.sm },
  panelPortrait: { height: undefined, minHeight: 0, paddingVertical: SPACE.sm },
  panelLabel: { color: '#4ade80', fontSize: FONT.xs - 2, letterSpacing: 1 },
  emptyCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyCardText: { fontSize: 48, color: '#475569' },
  center: { alignItems: 'center', zIndex: 20 },
  centerPortrait: { minHeight: 76 },
  vsIcon: { fontSize: 28 },
  resultBadge: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center' },
  resultText: { fontSize: FONT.base, letterSpacing: 0.5 },
  personalInsight: { maxWidth: 250, color: '#c4b5fd', fontSize: FONT.xs, textAlign: 'center', lineHeight: 18 },
  btn: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: SPACE.xs, borderRadius: RADIUS.pill, paddingVertical: 7, paddingHorizontal: SPACE.sm, borderWidth: 1.5 },
  btnAttack: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: '#4ade80' },
  btnNext: { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: '#60a5fa' },
  btnEndBattle: { backgroundColor: 'rgba(228,165,42,0.12)', borderColor: COLOR.gold },
  btnWait: { backgroundColor: 'rgba(71,85,105,0.2)', borderColor: '#475569' },
  btnHome: { backgroundColor: 'rgba(228,165,42,0.12)', borderColor: COLOR.gold, marginTop: SPACE.lg },
  btnIcon: { fontSize: 16 },
  btnText: { color: '#f1f5f9', fontSize: FONT.sm, textAlign: 'center', flexShrink: 1 },
  disconnectBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,113,113,0.15)', padding: SPACE.md, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(248,113,113,0.3)' },
  disconnectText: { color: '#f87171', fontSize: FONT.sm },
  gameOverBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.lg },
  gameOverIcon: { fontSize: 72 },
  gameOverTitle: { fontSize: FONT.xxl + 8, letterSpacing: 1 },
  gameOverScore: { fontSize: FONT.xxl, color: '#e2e8f0', letterSpacing: 4 },
});
