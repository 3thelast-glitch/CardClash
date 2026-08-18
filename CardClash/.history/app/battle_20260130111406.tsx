import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

import { ScreenContainer } from '@/components/screen-container';
import { CardItem } from '@/components/game/card-item';
import { ElementEffect } from '@/components/game/element-effect';
import { useGame } from '@/lib/game/game-context';
import { ELEMENT_EMOJI, ElementAdvantage } from '@/lib/game/types';

type BattlePhase = 'showing' | 'fighting' | 'result' | 'waiting';

// دالة للحصول على لون التأثير العنصري
const getAdvantageColor = (advantage: ElementAdvantage): string => {
  switch (advantage) {
    case 'strong':
      return '#4ade80'; // أخضر - قوي
    case 'weak':
      return '#f87171'; // أحمر - ضعيف
    default:
      return '#a0a0a0'; // رمادي - محايد
  }
};

// دالة للحصول على نص التأثير العنصري
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

  // قيم الرسوم المتحركة
  const playerCardScale = useSharedValue(0);
  const botCardScale = useSharedValue(0);
  const vsOpacity = useSharedValue(0);
  const resultOpacity = useSharedValue(0);

  // تشغيل الرسوم المتحركة عند بدء الجولة
  useEffect(() => {
    if (currentPlayerCard && currentBotCard && phase === 'showing') {
      // إعادة تعيين القيم
      playerCardScale.value = 0;
      botCardScale.value = 0;
      vsOpacity.value = 0;
      resultOpacity.value = 0;
      setShowResult(false);
      setShowPlayerEffect(false);
      setShowBotEffect(false);

      // تحريك البطاقات
      playerCardScale.value = withDelay(100, withTiming(1, { duration: 300 }));
      botCardScale.value = withDelay(300, withTiming(1, { duration: 300 }));
      vsOpacity.value = withDelay(500, withTiming(1, { duration: 200 }));

      // الانتقال لمرحلة القتال
      setTimeout(() => {
        setPhase('fighting');
      }, 800);
    }
  }, [currentPlayerCard, currentBotCard, phase, state.currentRound]);

  // تشغيل حساب النتيجة والمؤثرات البصرية
  useEffect(() => {
    if (phase === 'fighting') {
      // تشغيل المؤثرات البصرية
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

  // عرض النتيجة
  useEffect(() => {
    if (phase === 'result' && lastRoundResult) {
      setShowResult(true);
      resultOpacity.value = withTiming(1, { duration: 300 });

      // اهتزاز حسب النتيجة
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

  // الانتقال للجولة التالية أو النتائج
  const handleNextRound = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isGameOver) {
      router.push('/results' as any);
    } else {
      setPhase('showing');
    }
  }, [isGameOver, router]);

  // أنماط الرسوم المتحركة
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

  // الحصول على رسالة النتيجة
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

  // البطاقة الحالية للعرض
  const displayPlayerCard = showResult && lastRoundResult 
    ? lastRoundResult.playerCard 
    : currentPlayerCard;
  const displayBotCard = showResult && lastRoundResult 
    ? lastRoundResult.botCard 
    : currentBotCard;

  if (!displayPlayerCard || !displayBotCard) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* الرأس */}
        <View style={styles.header}>
          <View style={styles.roundInfo}>
            <Text style={styles.roundText}>
              الجولة {showResult ? lastRoundResult?.round : state.currentRound + 1}/{state.totalRounds}
            </Text>
          </View>
          <View style={styles.scoreBoard}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>أنت</Text>
              <Text style={[styles.scoreValue, { color: '#4ade80' }]}>
                {state.playerScore}
              </Text>
            </View>
            <Text style={styles.scoreSeparator}>-</Text>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>البوت</Text>
              <Text style={[styles.scoreValue, { color: '#f87171' }]}>
                {state.botScore}
              </Text>
            </View>
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
                <View style={styles.damageInfo}>
                  <Text style={styles.damageText}>
                    الضرر: {lastRoundResult.botDamage}
                  </Text>
                  {lastRoundResult.botBaseDamage !== lastRoundResult.botDamage && (
                    <Text style={styles.baseDamageText}>
                      (أساسي: {lastRoundResult.botBaseDamage})
                    </Text>
                  )}
                </View>
                {lastRoundResult.botElementAdvantage !== 'neutral' && (
                  <View style={[
                    styles.advantageBadge, 
                    { backgroundColor: getAdvantageColor(lastRoundResult.botElementAdvantage) + '30' }
                  ]}>
                    <Text style={[
                      styles.advantageText, 
                      { color: getAdvantageColor(lastRoundResult.botElementAdvantage) }
                    ]}>
                      {ELEMENT_EMOJI[lastRoundResult.botCard.element]} {getAdvantageText(lastRoundResult.botElementAdvantage)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* VS */}
          <Animated.View style={[styles.vsContainer, vsAnimatedStyle]}>
            <Text style={styles.vsText}>⚔️ VS ⚔️</Text>
            {/* عرض العناصر المتقابلة */}
            <View style={styles.elementsRow}>
              <Text style={styles.elementText}>
                {ELEMENT_EMOJI[displayPlayerCard.element]}
              </Text>
              <Text style={styles.elementVs}>vs</Text>
              <Text style={styles.elementText}>
                {ELEMENT_EMOJI[displayBotCard.element]}
              </Text>
            </View>
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
                <View style={styles.damageInfo}>
                  <Text style={styles.damageText}>
                    الضرر: {lastRoundResult.playerDamage}
                  </Text>
                  {lastRoundResult.playerBaseDamage !== lastRoundResult.playerDamage && (
                    <Text style={styles.baseDamageText}>
                      (أساسي: {lastRoundResult.playerBaseDamage})
                    </Text>
                  )}
                </View>
                {lastRoundResult.playerElementAdvantage !== 'neutral' && (
                  <View style={[
                    styles.advantageBadge, 
                    { backgroundColor: getAdvantageColor(lastRoundResult.playerElementAdvantage) + '30' }
                  ]}>
                    <Text style={[
                      styles.advantageText, 
                      { color: getAdvantageColor(lastRoundResult.playerElementAdvantage) }
                    ]}>
                      {ELEMENT_EMOJI[lastRoundResult.playerCard.element]} {getAdvantageText(lastRoundResult.playerElementAdvantage)}
                    </Text>
                  </View>
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
            onPress={handleNextRound}
            style={styles.nextButton}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {isGameOver ? '🏆 عرض النتائج' : '➡️ الجولة التالية'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    marginBottom: 16,
  },
  roundInfo: {
    backgroundColor: '#16213e',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  roundText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#eaeaea',
  },
  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 16,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreSeparator: {
    fontSize: 24,
    color: '#a0a0a0',
  },
  battleArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardSection: {
    alignItems: 'center',
  },
  cardWrapper: {
    position: 'relative',
  },
  playerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a0a0a0',
    marginVertical: 8,
  },
  damageContainer: {
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  damageInfo: {
    backgroundColor: '#0f0f1a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  damageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e94560',
  },
  baseDamageText: {
    fontSize: 12,
    color: '#888',
  },
  advantageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  advantageText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  vsContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e94560',
  },
  elementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  elementText: {
    fontSize: 20,
  },
  elementVs: {
    fontSize: 12,
    color: '#888',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#e94560',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
