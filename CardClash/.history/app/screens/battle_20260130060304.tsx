import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
} from 'react-native-reanimated';

import { ScreenContainer } from '@/components/screen-container';
import { CardItem } from '@/components/game/card-item';
import { ElementEffect } from '@/components/game/element-effect';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';
import { ELEMENT_EMOJI, ElementAdvantage } from '@/lib/game/types';

type BattlePhase = 'showing' | 'fighting' | 'result' | 'waiting';

const getAdvantageColor = (advantage: ElementAdvantage): string => {
  switch (advantage) {
    case 'strong':
      return '#4ade80';
    case 'weak':
      return '#f87171';
    default:
      return '#a0a0a0';
  }
};

const getAdvantageText = (advantage: ElementAdvantage): string => {
  switch (advantage) {
    case 'strong':
      return '⬆️ قوي';
    case 'weak':
      return '⬇️ ضعيف';
    default:
      return '';
  }
};

export default function BattleScreen() {
  const router = useRouter();
  const { 
    state, 
    playRound, 
    isGameOver, 
    currentPlayerCard, 
    currentBotCard,
    lastRoundResult,
  } = useGame();

  const [phase, setPhase] = useState<BattlePhase>('showing');
  const [showResult, setShowResult] = useState(false);
  const [showPlayerEffect, setShowPlayerEffect] = useState(false);
  const [showBotEffect, setShowBotEffect] = useState(false);

  const playerCardScale = useSharedValue(0);
  const botCardScale = useSharedValue(0);
  const vsOpacity = useSharedValue(0);
  const resultOpacity = useSharedValue(0);

  // ✅ إضافة: إعادة توجيه إذا البطاقات غير موجودة
  useEffect(() => {
    if (!currentPlayerCard || !currentBotCard) {
      const timer = setTimeout(() => {
        router.replace('/screens/card-selection' as any);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayerCard, currentBotCard, router]);

  useEffect(() => {
    if (currentPlayerCard && currentBotCard && phase === 'showing') {
      playerCardScale.value = 0;
      botCardScale.value = 0;
      vsOpacity.value = 0;
      resultOpacity.value = 0;
      setShowResult(false);
      setShowPlayerEffect(false);
      setShowBotEffect(false);

      playerCardScale.value = withDelay(100, withTiming(1, { duration: 300 }));
      botCardScale.value = withDelay(300, withTiming(1, { duration: 300 }));
      vsOpacity.value = withDelay(500, withTiming(1, { duration: 200 }));

      setTimeout(() => {
        setPhase('fighting');
      }, 800);
    }
  }, [currentPlayerCard, currentBotCard, phase, state.currentRound]);

  useEffect(() => {
    if (phase === 'fighting') {
      setShowPlayerEffect(true);
      setShowBotEffect(true);

      setTimeout(() => {
        playRound();
        setPhase('result');
        setShowPlayerEffect(false);
        setShowBotEffect(false);
      }, 700);
    }
  }, [phase, playRound]);

  useEffect(() => {
    if (phase === 'result' && lastRoundResult) {
      setShowResult(true);
      resultOpacity.value = withTiming(1, { duration: 300 });

      if (Platform.OS !== 'web') {
        if (lastRoundResult.winner === 'player') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (lastRoundResult.winner === 'bot') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }

      setPhase('waiting');
    }
  }, [phase, lastRoundResult, resultOpacity]);

  const handleNextRound = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isGameOver) {
      router.push('/screens/battle-results' as any);
    } else {
      setPhase('showing');
    }
  }, [isGameOver, router]);

  const playerCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playerCardScale.value }],
  }));

  const botCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: botCardScale.value }],
  }));

  const vsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: vsOpacity.value,
  }));

  const resultAnimatedStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
  }));

  const getResultMessage = () => {
    if (!lastRoundResult) return '';
    switch (lastRoundResult.winner) {
      case 'player':
        return '🎉 أنت الفائز!';
      case 'bot':
        return '😢 البوت يفوز!';
      default:
        return '🤝 تعادل!';
    }
  };

  const getResultColor = () => {
    if (!lastRoundResult) return '#a0a0a0';
    switch (lastRoundResult.winner) {
      case 'player':
        return '#4ade80';
      case 'bot':
        return '#f87171';
      default:
        return '#fbbf24';
    }
  };

  const displayPlayerCard = showResult && lastRoundResult 
    ? lastRoundResult.playerCard 
    : currentPlayerCard;
  const displayBotCard = showResult && lastRoundResult 
    ? lastRoundResult.botCard 
    : currentBotCard;

  if (!displayPlayerCard || !displayBotCard) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <LuxuryBackground>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>جاري التحميل...</Text>
            <Text style={[styles.loadingText, { fontSize: 14, marginTop: 8 }]}>
              سيتم إعادة التوجيه إلى اختيار البطاقات...
            </Text>
          </View>
        </LuxuryBackground>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>
          {/* الرأس */}
          <View style={styles.header}>
            <Text style={styles.roundText}>
              الجولة {showResult ? lastRoundResult?.round : state.currentRound + 1}/{state.totalRounds}
            </Text>
            <View style={styles.scoreBoard}>
              <Text style={[styles.score, { color: '#4ade80' }]}>{state.playerScore}</Text>
              <Text style={styles.scoreSeparator}>-</Text>
              <Text style={[styles.score, { color: '#f87171' }]}>{state.botScore}</Text>
            </View>
          </View>

          {/* منطقة المعركة */}
          <View style={styles.battleArea}>
            {/* بطاقة البوت */}
            <View style={styles.cardSection}>
              <Text style={styles.playerLabel}>🤖 البوت</Text>
              <View style={styles.cardWrapper}>
                <Animated.View style={botCardAnimatedStyle}>
                  <CardItem card={displayBotCard} size="large" />
                </Animated.View>
                {showBotEffect && displayBotCard && (
                  <ElementEffect element={displayBotCard.element} isActive={showBotEffect} position="top" />
                )}
              </View>
              {showResult && lastRoundResult && (
                <View style={styles.damageContainer}>
                  <Text style={styles.damageText}>الضرر: {lastRoundResult.botDamage}</Text>
                  {lastRoundResult.botElementAdvantage !== 'neutral' && (
                    <Text style={[styles.advantageText, { color: getAdvantageColor(lastRoundResult.botElementAdvantage) }]}>
                      {ELEMENT_EMOJI[lastRoundResult.botCard.element]} {getAdvantageText(lastRoundResult.botElementAdvantage)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* VS */}
            <Animated.View style={[styles.vsContainer, vsAnimatedStyle]}>
              <Text style={styles.vsText}>⚔️ VS ⚔️</Text>
            </Animated.View>

            {/* بطاقة اللاعب */}
            <View style={styles.cardSection}>
              <View style={styles.cardWrapper}>
                <Animated.View style={playerCardAnimatedStyle}>
                  <CardItem card={displayPlayerCard} size="large" />
                </Animated.View>
                {showPlayerEffect && displayPlayerCard && (
                  <ElementEffect element={displayPlayerCard.element} isActive={showPlayerEffect} position="bottom" />
                )}
              </View>
              {showResult && lastRoundResult && (
                <View style={styles.damageContainer}>
                  <Text style={styles.damageText}>الضرر: {lastRoundResult.playerDamage}</Text>
                  {lastRoundResult.playerElementAdvantage !== 'neutral' && (
                    <Text style={[styles.advantageText, { color: getAdvantageColor(lastRoundResult.playerElementAdvantage) }]}>
                      {ELEMENT_EMOJI[lastRoundResult.playerCard.element]} {getAdvantageText(lastRoundResult.playerElementAdvantage)}
                    </Text>
                  )}
                </View>
              )}
              <Text style={styles.playerLabel}>👤 أنت</Text>
            </View>
          </View>

          {/* نتيجة الجولة */}
          {showResult && (
            <Animated.View style={[styles.resultContainer, resultAnimatedStyle]}>
              <Text style={[styles.resultText, { color: getResultColor() }]}>
                {getResultMessage()}
              </Text>
            </Animated.View>
          )}

          {/* زر الجولة التالية */}
          {phase === 'waiting' && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextRound}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {isGameOver ? '🏆 عرض النتائج' : '➡️ الجولة التالية'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#a0a0a0',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  roundText: {
    fontSize: 14,
    color: '#d4af37',
    marginBottom: 8,
  },
  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreSeparator: {
    fontSize: 20,
    color: '#a0a0a0',
  },
  battleArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSection: {
    alignItems: 'center',
  },
  cardWrapper: {
    position: 'relative',
  },
  playerLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginVertical: 6,
  },
  damageContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  damageText: {
    fontSize: 12,
    color: '#e94560',
    fontWeight: 'bold',
  },
  advantageText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  vsContainer: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e94560',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resultText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#d4af37',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});
