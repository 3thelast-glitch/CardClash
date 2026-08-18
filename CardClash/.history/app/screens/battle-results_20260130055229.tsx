import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';
import { updateStatsAfterMatch } from '@/lib/stats/storage';

export default function BattleResultsScreen() {
  const router = useRouter();
  const { state } = useGame();

  const playerWins = state.playerScore;
  const botWins = state.botScore;
  const isPlayerWinner = playerWins > botWins;

  useEffect(() => {
    // حفظ الإحصائيات بعد انتهاء المباراة
    const saveStats = async () => {
      if (state.playerDeck.length > 0) {
        const elementsUsed = state.playerDeck.map(card => card.element);
        await updateStatsAfterMatch(
          state.playerScore,
          state.botScore,
          state.totalRounds,
          elementsUsed,
          state.difficulty
        );
      }
    };
    saveStats();
  }, []);

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container}>
          {/* النتيجة النهائية */}
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>كروت الجولات السابقة</Text>
            <View style={styles.scoreContainer}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>أنت</Text>
                <Text style={[styles.finalScore, { color: '#4ade80' }]}>{playerWins}</Text>
              </View>
              <Text style={styles.vs}>VS</Text>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>البوت</Text>
                <Text style={[styles.finalScore, { color: '#f87171' }]}>{botWins}</Text>
              </View>
            </View>

            <Text style={[styles.winner, { color: isPlayerWinner ? '#4ade80' : '#f87171' }]}>
              {isPlayerWinner ? '🎉 أنت الفائز!' : '😢 البوت يفوز!'}
            </Text>
          </View>

          {/* سجل الجولات */}
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>سجل الجولات</Text>
            {state.roundResults && state.roundResults.length > 0 ? (
              state.roundResults.map((round: any, index: number) => (
                <View key={index} style={styles.roundItem}>
                  <View style={styles.roundHeader}>
                    <Text style={styles.roundNumber}>الجولة {index + 1}</Text>
                    <Text
                      style={[
                        styles.roundWinner,
                        {
                          color:
                            round.winner === 'player'
                              ? '#4ade80'
                              : round.winner === 'bot'
                              ? '#f87171'
                              : '#fbbf24',
                        },
                      ]}
                    >
                      {round.winner === 'player'
                        ? '✓ أنت'
                        : round.winner === 'bot'
                        ? '✗ البوت'
                        : '= تعادل'}
                    </Text>
                  </View>
                  <View style={styles.roundDetails}>
                    <View style={styles.cardDetail}>
                      <Text style={styles.cardName}>{round.playerCard.nameAr}</Text>
                      <Text style={styles.cardDamage}>
                        {round.playerDamage} ضرر
                        {round.playerElementAdvantage !== 'neutral' &&
                          ` (${round.playerElementAdvantage === 'strong' ? '+25%' : '-25%'})`}
                      </Text>
                    </View>
                    <Text style={styles.vs}>vs</Text>
                    <View style={styles.cardDetail}>
                      <Text style={styles.cardName}>{round.botCard.nameAr}</Text>
                      <Text style={styles.cardDamage}>
                        {round.botDamage} ضرر
                        {round.botElementAdvantage !== 'neutral' &&
                          ` (${round.botElementAdvantage === 'strong' ? '+25%' : '-25%'})`}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noHistory}>لا توجد جولات</Text>
            )}
          </View>

          {/* أزرار التحكم */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/screens/splash' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.homeButtonText}>🏠 الرئيسية</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={() => router.push('/screens/card-selection' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.playAgainButtonText}>🎮 لعب مرة أخرى</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  finalScore: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  vs: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  winner: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  historyContainer: {
    marginBottom: 24,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 12,
  },
  roundItem: {
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d4af37',
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roundNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  roundWinner: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roundDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDetail: {
    flex: 1,
  },
  cardName: {
    fontSize: 12,
    color: '#eee',
    fontWeight: 'bold',
  },
  cardDamage: {
    fontSize: 11,
    color: '#a0a0a0',
    marginTop: 2,
  },
  noHistory: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    paddingVertical: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 24,
  },
  homeButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flex: 1,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  playAgainButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flex: 1,
  },
  playAgainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
});
