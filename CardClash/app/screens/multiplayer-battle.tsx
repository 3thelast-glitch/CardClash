import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Handshake,
  Home,
  RotateCcw,
  ShieldAlert,
  Skull,
  Trophy,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LuxuryCharacterCardAnimated } from '@/components/game/luxury-character-card-animated';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { BattleHUD } from '@/components/game/BattleHUD';
import { RoundTimelinePanel } from '@/components/game/RoundInsightPanel';
import { ObsidianPanel } from '@/components/ui/ObsidianPanel';
import { ProButton } from '@/components/ui/ProButton';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  RADIUS,
  SEMANTIC_COLOR,
  SPACE,
} from '@/components/ui/design-tokens';
import { useBattleLayout } from '@/utils/layout';
import { useOrientationTransition } from '@/utils/orientation-transition';
import { mpClient, type MPMessage } from '@/lib/multiplayer/websocket-client';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import { useSettings } from '@/lib/game/hooks/useSettings';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { PresentationEventGate } from '@/lib/presentation/presentation-events';
import { haptics } from '@/lib/feedback/haptics';
import type { RoundTimelineStep } from '@/lib/game/round-insights';

type MPBattlePhase =
  | 'waiting_start'
  | 'selection'
  | 'waiting_opponent'
  | 'result'
  | 'game_over';

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
    hudPadding,
    isCompact,
    isLandscape,
  } = useBattleLayout();
  const { settings } = useSettings();
  const { reduceMotion } = useMotionPreferences();
  const { animatedStyle: orientationStyle, layoutTransition } = useOrientationTransition(
    isLandscape,
    settings.animationsEnabled && !reduceMotion,
  );
  const params = useLocalSearchParams<{
    roomId: string;
    playerId: string;
    playerName: string;
    opponentName: string;
  }>();

  const [phase, setPhase] = useState<MPBattlePhase>('waiting_start');
  const [myCards, setMyCards] = useState<any[]>([]);
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
  const revealedRounds = useRef(new Set<number>());
  const presentationGate = useRef(new PresentationEventGate());
  const playerId = multiplayer.state.playerId || params.playerId;

  const myCardAnim = useSharedValue(1);
  const oppCardAnim = useSharedValue(1);
  const resultOpacity = useSharedValue(0);
  const myStyle = useAnimatedStyle(() => ({ transform: [{ scale: myCardAnim.value }] }));
  const oppStyle = useAnimatedStyle(() => ({ transform: [{ scale: oppCardAnim.value }] }));
  const resultStyle = useAnimatedStyle(() => ({ opacity: resultOpacity.value }));

  const enterCards = useCallback(() => {
    if (reduceMotion) {
      myCardAnim.value = 1;
      oppCardAnim.value = 1;
      resultOpacity.value = 0;
      return;
    }
    myCardAnim.value = 0.94;
    oppCardAnim.value = 0.94;
    resultOpacity.value = 0;
    myCardAnim.value = withDelay(60, withTiming(1, { duration: 260 }));
    oppCardAnim.value = withDelay(160, withTiming(1, { duration: 260 }));
  }, [myCardAnim, oppCardAnim, reduceMotion, resultOpacity]);

  const hydrateBattle = useCallback((payload: {
    position: 'player1' | 'player2';
    you: { id: string; cards?: any[] };
    opponent: { id: string };
    totalRounds: number;
    p1Score: number;
    p2Score: number;
    turnPlayerId?: string | null;
  }) => {
    const iAmP1 = payload.position === 'player1';
    isAdvancingRound.current = false;
    presentationGate.current.reset(multiplayer.state.roomId ?? params.roomId ?? 'multiplayer');
    revealedRounds.current.clear();
    setIsPlayer1(iAmP1);
    setMyCards(payload.you.cards ?? []);
    setTotalRounds(payload.totalRounds);
    setMyScore(iAmP1 ? payload.p1Score : payload.p2Score);
    setOppScore(iAmP1 ? payload.p2Score : payload.p1Score);
    setTurnPlayerId(payload.turnPlayerId ?? (iAmP1 ? payload.you.id : payload.opponent.id));
    setCurrentRound(0);
    setEndBattleClicked(false);
    setDisconnected(false);
    setPhase('selection');
    enterCards();
  }, [enterCards, multiplayer.state.roomId, params.roomId]);

  useEffect(() => {
    if (
      multiplayer.state.status !== 'playing' ||
      !multiplayer.state.totalRounds ||
      !multiplayer.state.playerCards.length
    ) return;

    const iAmP1 = multiplayer.state.isHost;
    hydrateBattle({
      position: iAmP1 ? 'player1' : 'player2',
      you: {
        id: multiplayer.state.playerId,
        cards: multiplayer.state.playerCards,
      },
      opponent: { id: multiplayer.state.opponentId ?? 'opponent' },
      totalRounds: multiplayer.state.totalRounds,
      p1Score: iAmP1 ? multiplayer.state.playerScore : multiplayer.state.opponentScore,
      p2Score: iAmP1 ? multiplayer.state.opponentScore : multiplayer.state.playerScore,
      turnPlayerId: iAmP1 ? multiplayer.state.playerId : multiplayer.state.opponentId,
    });
  }, [
    hydrateBattle,
    multiplayer.state.isHost,
    multiplayer.state.opponentId,
    multiplayer.state.opponentScore,
    multiplayer.state.playerCards,
    multiplayer.state.playerId,
    multiplayer.state.playerScore,
    multiplayer.state.status,
    multiplayer.state.totalRounds,
  ]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(mpClient.on('BATTLE_START', (message: MPMessage) => {
      hydrateBattle(message.payload);
    }));

    unsubs.push(mpClient.on('TURN_CHANGED', (message: MPMessage) => {
      setTurnPlayerId(message.payload?.turnPlayerId ?? null);
    }));

    unsubs.push(mpClient.on('OPPONENT_CARD_REVEALED', () => {
      setOppCardRevealed(true);
    }));

    unsubs.push(mpClient.on('ROUND_RESULT', (message: MPMessage) => {
      const result = message.payload;
      isAdvancingRound.current = false;

      const myWin =
        (isPlayer1 && result.winner === 'player1') ||
        (!isPlayer1 && result.winner === 'player2');
      const p1WinState =
        result.winner === 'player1' ? 'win' : result.winner === 'player2' ? 'lose' : 'draw';
      const p2WinState =
        result.winner === 'player2' ? 'win' : result.winner === 'player1' ? 'lose' : 'draw';

      const p1Card = result.p1Card ? { ...result.p1Card, winState: p1WinState } : undefined;
      const p2Card = result.p2Card ? { ...result.p2Card, winState: p2WinState } : undefined;

      if (result.nextOwnCard && Number.isInteger(result.roundIndex)) {
        setMyCards((cards) => {
          const next = [...cards];
          next[result.roundIndex + 1] = result.nextOwnCard;
          return next;
        });
      }

      setLastResult({ ...result, p1Card, p2Card, myWin });
      setMyScore(isPlayer1 ? result.p1Score : result.p2Score);
      setOppScore(isPlayer1 ? result.p2Score : result.p1Score);
      setPhase('result');
      setOppCardRevealed(false);

      const sessionId = multiplayer.state.roomId ?? params.roomId ?? 'multiplayer';
      const firstPresentation = presentationGate.current.accept({
        id: `round-${result.roundIndex}-result`,
        sessionId,
        kind: 'round-result',
      });
      resultOpacity.value = firstPresentation && !reduceMotion
        ? withTiming(1, { duration: 280 })
        : 1;

      if (firstPresentation) {
        haptics.trigger(myWin ? 'acceptedPlacement' : result.winner === 'draw' ? 'selection' : 'attackImpact');
      }
    }));

    unsubs.push(mpClient.on('GAME_OVER', (message: MPMessage) => {
      setGameOver(message.payload);
      setPhase((current) => current === 'result' ? current : 'game_over');
    }));

    unsubs.push(mpClient.on('OPPONENT_DISCONNECTED', () => {
      setDisconnected(true);
    }));

    unsubs.push(mpClient.on('OPPONENT_RECONNECTED', () => {
      setDisconnected(false);
    }));

    unsubs.push(mpClient.on('OPPONENT_LEFT_PERMANENTLY', () => {
      Alert.alert('الخصم غادر', 'غادر خصمك المباراة.', [
        { text: 'الرئيسية', onPress: () => router.replace('/screens/splash' as any) },
      ]);
    }));

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [
    hydrateBattle,
    isPlayer1,
    multiplayer.state.roomId,
    params.roomId,
    reduceMotion,
    resultOpacity,
    router,
  ]);

  useEffect(() => {
    if (gameOver && endBattleClicked) setPhase('game_over');
  }, [endBattleClicked, gameOver]);

  const myCurrentCard = myCards[currentRound];

  const handleReveal = useCallback(() => {
    if (
      !myCurrentCard ||
      turnPlayerId !== playerId ||
      phase !== 'selection' ||
      revealedRounds.current.has(currentRound)
    ) return;

    const sent = mpClient.revealCard(currentRound, myCurrentCard.id);
    if (!sent) return;

    revealedRounds.current.add(currentRound);
    setPhase('waiting_opponent');
  }, [currentRound, myCurrentCard, phase, playerId, turnPlayerId]);

  const handleNext = useCallback(() => {
    if (
      isAdvancingRound.current ||
      phase !== 'result' ||
      currentRound >= totalRounds - 1
    ) return;

    isAdvancingRound.current = true;
    setCurrentRound((round) => round + 1);
    setLastResult(null);
    setPhase('selection');
    enterCards();
  }, [currentRound, enterCards, phase, totalRounds]);

  const handleEndBattle = useCallback(() => {
    setEndBattleClicked(true);
    if (gameOver) {
      setPhase('game_over');
      return;
    }
    Alert.alert(
      'في انتظار النتيجة',
      'تم حسم الجولة محلياً في العرض، وننتظر النتيجة النهائية الموثوقة من الخادم.',
    );
  }, [gameOver]);

  const timelineSteps = useMemo<RoundTimelineStep[]>(() => {
    if (!lastResult?.timeline) return [];
    const before = isPlayer1
      ? { player: lastResult.timeline.before.p1, bot: lastResult.timeline.before.p2 }
      : { player: lastResult.timeline.before.p2, bot: lastResult.timeline.before.p1 };
    const after = isPlayer1
      ? { player: lastResult.timeline.after.p1, bot: lastResult.timeline.after.p2 }
      : { player: lastResult.timeline.after.p2, bot: lastResult.timeline.after.p1 };
    const won = lastResult.myWin;
    const reason =
      lastResult.winner === 'draw'
        ? 'تعادل الكرتان بعد مقارنة الهجوم والدفاع.'
        : lastResult.advantage === 'faction'
          ? 'أفضلية الفصيلة دعمت الكرت الفائز قبل المقارنة النهائية.'
          : won
            ? 'تفوق كرتك بعد تطبيق التأثيرات حسم الجولة.'
            : 'تفوق كرت الخصم بعد تطبيق التأثيرات حسم الجولة.';

    return [
      {
        id: 'web-before',
        label: 'قبل التأثير',
        tone: 'neutral',
        text: `أنت: ${before.player.attack}/${before.player.defense} — الخصم: ${before.bot.attack}/${before.bot.defense}`,
      },
      {
        id: 'web-after',
        label: 'بعد التأثير',
        tone: 'accent',
        text: `أنت: ${after.player.attack}/${after.player.defense} — الخصم: ${after.bot.attack}/${after.bot.defense}`,
      },
      {
        id: 'web-reason',
        label: 'سبب النتيجة',
        tone: won ? 'positive' : lastResult.winner === 'draw' ? 'neutral' : 'negative',
        text: reason,
      },
    ];
  }, [isPlayer1, lastResult]);

  if (phase === 'game_over' && gameOver) {
    const iWon =
      (isPlayer1 && gameOver.winner === 'player1') ||
      (!isPlayer1 && gameOver.winner === 'player2');
    const draw = gameOver.winner === 'draw';
    const Icon = draw ? Handshake : iWon ? Trophy : Skull;

    return (
      <View style={styles.root}>
        <View style={StyleSheet.absoluteFill}><LuxuryBackground /></View>
        <View style={styles.resultScreen}>
          <ObsidianPanel accent style={styles.resultPanel}>
            <Icon
              size={54}
              color={
                draw
                  ? SEMANTIC_COLOR.status.warning
                  : iWon
                    ? SEMANTIC_COLOR.status.success
                    : SEMANTIC_COLOR.status.danger
              }
            />
            <ThemedText
              type="display"
              style={{
                color: draw
                  ? SEMANTIC_COLOR.status.warning
                  : iWon
                    ? SEMANTIC_COLOR.status.success
                    : SEMANTIC_COLOR.status.danger,
              }}
            >
              {draw ? 'تعادل' : iWon ? 'انتصار' : 'هزيمة'}
            </ThemedText>
            <ThemedText type="numeric" style={styles.finalScore}>
              {myScore} : {oppScore}
            </ThemedText>
            <ProButton
              label="الرئيسية"
              fullWidth
              onPress={() => router.replace('/screens/splash' as any)}
              icon={<Home size={18} color={SEMANTIC_COLOR.text.inverse} />}
              hapticEvent={iWon ? 'victory' : 'defeat'}
            />
          </ObsidianPanel>
        </View>
      </View>
    );
  }

  const myCard =
    phase === 'result' && lastResult
      ? (isPlayer1 ? lastResult.p1Card : lastResult.p2Card)
      : myCurrentCard;
  const opponentCard =
    phase === 'result' && lastResult
      ? (isPlayer1 ? lastResult.p2Card : lastResult.p1Card)
      : null;

  const myTurn = phase === 'selection' && turnPlayerId === playerId;

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={StyleSheet.absoluteFill}><LuxuryBackground /></View>

      <View
        style={[
          styles.hudWrap,
          {
            paddingLeft: Math.max(insets.left, hudPadding),
            paddingRight: Math.max(insets.right, hudPadding),
          },
        ]}
      >
        <BattleHUD
          playerScore={myScore}
          botScore={oppScore}
          maxScore={Math.max(totalRounds, myScore, oppScore, 1)}
          currentRound={currentRound}
          totalRounds={Math.max(totalRounds, 1)}
          turn={
            phase === 'selection'
              ? turnPlayerId === playerId ? 'player' : 'bot'
              : 'none'
          }
          playerLabel={params.playerName || 'أنت'}
          opponentLabel={params.opponentName || 'الخصم'}
        />
      </View>

      <Animated.View
        testID="multiplayer-battle-arena"
        layout={layoutTransition}
        style={[
          styles.arena,
          orientationStyle,
          {
            paddingLeft: Math.max(insets.left, arenaPadding),
            paddingRight: Math.max(insets.right, arenaPadding),
            paddingTop: isCompact ? SPACE.sm : SPACE.md,
            paddingBottom: isLandscape ? 0 : Math.max(SPACE.xs, arenaGap / 2),
            gap: arenaGap,
            flexDirection: isLandscape ? 'row' : 'column',
          },
        ]}
      >
        <View
          testID="multiplayer-player-panel"
          style={[styles.cardZone, !isLandscape && styles.cardZonePortrait]}
        >
          <ThemedText type="caption">{params.playerName || 'أنت'}</ThemedText>
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
            <HiddenCard width={cardWidth} height={cardHeight} label="بطاقتك غير متاحة" />
          )}
        </View>

        <View
          testID="multiplayer-command-panel"
          style={[
            styles.command,
            !isLandscape && styles.commandPortrait,
            { width: centerWidth, gap: Math.max(SPACE.sm, arenaGap) },
          ]}
        >
          <ThemedText type="numeric" style={styles.vs}>VS</ThemedText>

          {phase === 'result' && lastResult && (
            <>
              <Animated.View
                style={[
                  styles.resultBadge,
                  {
                    borderColor: lastResult.myWin
                      ? SEMANTIC_COLOR.status.success
                      : lastResult.winner === 'draw'
                        ? SEMANTIC_COLOR.status.warning
                        : SEMANTIC_COLOR.status.danger,
                  },
                  resultStyle,
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{
                    color: lastResult.myWin
                      ? SEMANTIC_COLOR.status.success
                      : lastResult.winner === 'draw'
                        ? SEMANTIC_COLOR.status.warning
                        : SEMANTIC_COLOR.status.danger,
                  }}
                >
                  {lastResult.myWin ? 'فزت بالجولة' : lastResult.winner === 'draw' ? 'تعادل' : 'خسرت الجولة'}
                </ThemedText>
              </Animated.View>
              <RoundTimelinePanel
                testID="web-round-result-timeline"
                steps={timelineSteps}
                compact={!isLandscape}
              />
              {lastResult.personalInsight ? (
                <ThemedText type="caption" style={styles.insight}>
                  {lastResult.personalInsight}
                </ThemedText>
              ) : null}
            </>
          )}

          {phase === 'selection' && myTurn && (
            <ProButton
              label="اكشف كرتك"
              onPress={handleReveal}
              style={{ width: actionButtonWidth, minHeight: actionButtonHeight }}
              fullWidth
              hapticEvent="cardPickup"
            />
          )}

          {phase === 'selection' && !myTurn && (
            <StatePill label="دور الخصم أولاً" />
          )}

          {phase === 'waiting_opponent' && (
            <StatePill label={oppCardRevealed ? 'تم كشف كرت الخصم — ننتظر النتيجة' : 'تم إرسال كرتك — ننتظر الخصم'} />
          )}

          {phase === 'result' && currentRound < totalRounds - 1 && (
            <ProButton
              label="الجولة التالية"
              variant="secondary"
              onPress={handleNext}
              style={{ width: actionButtonWidth, minHeight: actionButtonHeight }}
              fullWidth
              icon={<RotateCcw size={17} color="#DCE4FF" />}
            />
          )}

          {phase === 'result' && currentRound === totalRounds - 1 && (
            <ProButton
              label="إنهاء المعركة"
              variant="ghost"
              onPress={handleEndBattle}
              style={{ width: actionButtonWidth, minHeight: actionButtonHeight }}
              fullWidth
            />
          )}
        </View>

        <View
          testID="multiplayer-bot-panel"
          style={[styles.cardZone, !isLandscape && styles.cardZonePortrait]}
        >
          <ThemedText type="caption">{params.opponentName || 'الخصم'}</ThemedText>
          {opponentCard ? (
            <Animated.View style={oppStyle}>
              <LuxuryCharacterCardAnimated
                card={opponentCard}
                style={{ width: cardWidth, height: cardHeight }}
                winnerState={phase === 'result' && opponentCard?.winState === 'win' ? 'winner' : null}
              />
            </Animated.View>
          ) : (
            <HiddenCard
              width={cardWidth}
              height={cardHeight}
              label={oppCardRevealed ? 'كشف الخصم بطاقته' : 'بطاقة الخصم مخفية'}
              acknowledged={oppCardRevealed}
            />
          )}
        </View>
      </Animated.View>

      {disconnected && (
        <View style={styles.reconnectOverlay} accessibilityLiveRegion="assertive">
          <ObsidianPanel raised style={styles.reconnectPanel}>
            <ShieldAlert size={28} color={SEMANTIC_COLOR.status.warning} />
            <ThemedText type="defaultSemiBold">انقطع اتصال الخصم</ThemedText>
            <ThemedText type="subtitle" style={styles.centerText}>
              تم إيقاف مدخلات جديدة في العرض حتى يعود الخصم أو تنتهي مهلة الخادم.
              حالة المباراة الموثوقة محفوظة على الخادم.
            </ThemedText>
          </ObsidianPanel>
        </View>
      )}
    </View>
  );
}

function HiddenCard({
  width,
  height,
  label,
  acknowledged = false,
}: {
  width: number;
  height: number;
  label: string;
  acknowledged?: boolean;
}) {
  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.hiddenCard,
        { width, height },
        acknowledged && styles.hiddenCardAcknowledged,
      ]}
    >
      <ThemedText type="display" style={styles.hiddenMark}>
        {acknowledged ? '✓' : '?'}
      </ThemedText>
      <ThemedText type="caption" style={styles.centerText}>{label}</ThemedText>
    </View>
  );
}

function StatePill({ label }: { label: string }) {
  return (
    <View style={styles.statePill} accessibilityLiveRegion="polite">
      <ThemedText type="label" style={styles.centerText}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SEMANTIC_COLOR.background.arena },
  hudWrap: { paddingTop: SPACE.xs, paddingHorizontal: SPACE.sm },
  arena: {
    flex: 1,
    alignItems: 'center',
  },
  cardZone: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(11,20,34,0.70)',
  },
  cardZonePortrait: {
    height: undefined,
    minHeight: 0,
    paddingVertical: SPACE.sm,
  },
  command: { alignItems: 'center', zIndex: 20 },
  commandPortrait: { minHeight: 82 },
  vs: { color: SEMANTIC_COLOR.accent.primary, fontSize: 24 },
  resultBadge: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(8,13,22,0.78)',
  },
  insight: {
    maxWidth: 260,
    color: '#D8CCFF',
    textAlign: 'center',
    lineHeight: 18,
  },
  hiddenCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(19,30,47,0.64)',
  },
  hiddenCardAcknowledged: {
    borderColor: 'rgba(251,191,36,0.50)',
  },
  hiddenMark: {
    color: SEMANTIC_COLOR.text.secondary,
    fontSize: 42,
  },
  statePill: {
    width: '100%',
    minHeight: 48,
    padding: SPACE.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: SEMANTIC_COLOR.border.subtle,
    backgroundColor: 'rgba(19,30,47,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reconnectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,13,22,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.xl,
    zIndex: 100,
  },
  reconnectPanel: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    gap: SPACE.md,
    borderColor: 'rgba(251,191,36,0.54)',
  },
  centerText: { textAlign: 'center' },
  resultScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.xl,
  },
  resultPanel: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    gap: SPACE.lg,
  },
  finalScore: {
    color: SEMANTIC_COLOR.text.primary,
    fontSize: 34,
  },
});
