import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

import { ScreenContainer } from '@/components/screen-container';
import { useGame } from '@/lib/game/game-context';
import { RoundResult } from '@/lib/game/types';

export default function ResultsScreen() {
  const router = useRouter();
  const { state, resetGame } = useGame();

  // تحديد الفائز
  const winner = state.playerScore > state.botScore 
    ? 'player' 
    : state.botScore > state.playerScore 
      ? 'bot' 
      : 'draw';

  // قيم الرسوم المتحركة
  const trophyScale = useSharedValue(0);
  const resultOpacity = useSharedValue(0);
  const scoreOpacity = useSharedValue(0);

  useEffect(() => {
    // تشغيل الرسوم المتحركة
    trophyScale.value = withSequence(
      withTiming(1.2, { duration: 400 }),
      withTiming(1, { duration: 200 })
    );
    resultOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
    scoreOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

    // اهتزاز حسب النتيجة
    if (Platform.OS !== 'web') {
      setTimeout(() => {
        if (winner === 'player') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (winner === 'bot') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }, 500);
    }
  }, [winner]);

  const handlePlayAgain = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    resetGame();
    router.replace('/');
  };

  const handleBackToMenu = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    resetGame();
    router.replace('/');
  };

  // الحصول على رسالة النتيجة
  const getResultMessage = () => {
    switch (winner) {
      case 'player':
        return 'أنت الفائز! 🎉';
      case 'bot':
        return 'البوت يفوز 😢';
      default:
        return 'تعادل! 🤝';
    }
  };

  const getResultEmoji = () => {
    switch (winner) {
      case 'player':
        return '🏆';
      case 'bot':
        return '😔';
      default:
        return '🤝';
    }
  };

  const getResultColor = () => {
    switch (winner) {
      case 'player':
        return '#4ade80';
      case 'bot':
        return '#f87171';
      default:
        return '#fbbf24';
    }
  };

  // أنماط الرسوم المتحركة
  const trophyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));

  const resultAnimatedStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
  }));

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
  }));

  // عرض ملخص الجولة
  const renderRoundSummary = ({ item }: { item: RoundResult }) => {
    const roundWinnerColor = 
      item.winner === 'player' ? '#4ade80' : 
      item.winner === 'bot' ? '#f87171' : '#fbbf24';
    
    const roundWinnerIcon = 
      item.winner === 'player' ? '✓' : 
      item.winner === 'bot' ? '✗' : '=';

    return (
      <View style={styles.roundItem}>
        <View style={styles.roundNumber}>
          <Text style={styles.roundNumberText}>{item.round}</Text>
        </View>
        <View style={styles.roundCards}>
          <Text style={styles.roundCardText}>
            {item.playerCard.emoji} {item.playerCard.nameAr}
          </Text>
          <Text style={styles.vsText}>vs</Text>
          <Text style={styles.roundCardText}>
            {item.botCard.emoji} {item.botCard.nameAr}
          </Text>
        </View>
        <View style={[styles.roundResult, { backgroundColor: roundWinnerColor + '30' }]}>
          <Text style={[styles.roundResultText, { color: roundWinnerColor }]}>
            {roundWinnerIcon}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* الكأس */}
        <Animated.View style={[styles.trophyContainer, trophyAnimatedStyle]}>
          <Text style={styles.trophyEmoji}>{getResultEmoji()}</Text>
        </Animated.View>

        {/* رسالة النتيجة */}
        <Animated.View style={[styles.resultContainer, resultAnimatedStyle]}>
          <Text style={[styles.resultText, { color: getResultColor() }]}>
            {getResultMessage()}
          </Text>
        </Animated.View>

        {/* النتيجة النهائية */}
        <Animated.View style={[styles.scoreContainer, scoreAnimatedStyle]}>
          <View style={styles.finalScore}>
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
        </Animated.View>

        {/* ملخص الجولات */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>ملخص الجولات</Text>
          <FlatList
            data={state.roundResults}
            renderItem={renderRoundSummary}
            keyExtractor={(item) => `round-${item.round}`}
            style={styles.summaryList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* الأزرار */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={handlePlayAgain}
            style={styles.playAgainButton}
            activeOpacity={0.8}
          >
            <Text style={styles.playAgainButtonText}>🔄 إعادة اللعب</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleBackToMenu}
            style={styles.menuButton}
            activeOpacity={0.8}
          >
            <Text style={styles.menuButtonText}>🏠 القائمة الرئيسية</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  trophyContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  trophyEmoji: {
    fontSize: 80,
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resultText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  finalScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 24,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreSeparator: {
    fontSize: 32,
    color: '#a0a0a0',
  },
  summaryContainer: {
    flex: 1,
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#eaeaea',
    marginBottom: 12,
  },
  summaryList: {
    flex: 1,
  },
  roundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  roundNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roundNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#eaeaea',
  },
  roundCards: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundCardText: {
    fontSize: 12,
    color: '#a0a0a0',
    flex: 1,
  },
  vsText: {
    fontSize: 10,
    color: '#888',
  },
  roundResult: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  roundResultText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonsContainer: {
    gap: 12,
    marginTop: 16,
  },
  playAgainButton: {
    backgroundColor: '#e94560',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  playAgainButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#eaeaea',
  },
});
