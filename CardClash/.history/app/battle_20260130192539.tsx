import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, ScrollView } from 'react-native';
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
import { getAbilityNameAr } from '@/lib/game/ability-names';

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
    useAbility,
  } = useGame();

  const [phase, setPhase] = useState<BattlePhase>('showing');
  const [showResult, setShowResult] = useState(false);
  const [showPlayerEffect, setShowPlayerEffect] = useState(false);
  const [showBotEffect, setShowBotEffect] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const playerCardScale = useSharedValue(0);
  const botCardScale = useSharedValue(0);
  const vsOpacity = useSharedValue(0);
  const resultOpacity = useSharedValue(0);

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
      <ScreenContainer>
        <LuxuryBackground />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <LuxuryBackground />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.roundText}>
            الجولة {showResult ? lastRoundResult?.round : state.currentRound + 1}/{state.totalRounds}
          </Text>
          <View style={styles.scoreBoard}>
            <Text style={[styles.score, { color: '#4ade80' }]}>
              {state.playerScore}
            </Text>
            <Text style={styles.scoreSeparator}>-</Text>
            <Text style={[styles.score, { color: '#f87171' }]}>
              {state.botScore}
            </Text>
          </View>
        </View>

        {/* Battle Area */}
        <View style={styles.battleArea}>
          {/* Bot Card */}
          <View style={styles.cardSection}>
            <Text style={styles.playerLabel}>🤖 البوت</Text>
            <Animated.View style={[styles.cardWrapper, botCardAnimatedStyle]}>
              {showBotEffect && displayBotCard && (
                <ElementEffect element={displayBotCard.element} />
              )}
              <CardItem card={displayBotCard} />
            </Animated.View>
            {showResult && lastRoundResult && (
              <View style={styles.damageContainer}>
                <Text style={styles.damageText}>
                  الضرر: {lastRoundResult.botDamage}
                </Text>
                {lastRoundResult.botElementAdvantage !== 'neutral' && (
                  <Text style={[styles.advantageText, { color: getAdvantageColor(lastRoundResult.botElementAdvantage) }]}>
                    {ELEMENT_EMOJI[lastRoundResult.botCard.element]} {getAdvantageText(lastRoundResult.botElementAdvantage)}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* VS Indicator */}
          <Animated.View style={[styles.vsContainer, vsAnimatedStyle]}>
            <Text style={styles.vsText}>⚔️ VS ⚔️</Text>
          </Animated.View>

          {/* Player Card */}
          <View style={styles.cardSection}>
            <Animated.View style={[styles.cardWrapper, playerCardAnimatedStyle]}>
              {showPlayerEffect && displayPlayerCard && (
                <ElementEffect element={displayPlayerCard.element} />
              )}
              <CardItem card={displayPlayerCard} />
            </Animated.View>
            {showResult && lastRoundResult && (
              <View style={styles.damageContainer}>
                <Text style={styles.damageText}>
                  الضرر: {lastRoundResult.playerDamage}
                </Text>
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

        {/* Round Result */}
        {showResult && (
          <Animated.View style={[styles.resultContainer, resultAnimatedStyle]}>
            <Text style={[styles.resultText, { color: getResultColor() }]}>
              {getResultMessage()}
            </Text>
          </Animated.View>
        )}

        {/* Ability Buttons */}
        {phase !== "waiting" && (
          <View style={styles.abilitiesContainer}>
            {state.playerAbilities.map((ability, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.abilityButton,
                  ability.used && styles.abilityButtonDisabled
                ]}
                onPress={() => {
                  if (!ability.used) {
                    useAbility(ability.type);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }
                }}
                disabled={ability.used}
                activeOpacity={0.8}
              >
                <Text style={styles.abilityButtonText}>
                  {ability.used ? "\u2717 " : "\u2713 "}
                  {getAbilityNameAr(ability.type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Control Buttons */}
        {phase === 'waiting' && (
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => setShowHistoryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.historyButtonText}>📋 السجل</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextRound}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {isGameOver ? '🏆 عرض النتائج' : '➡️ الجولة التالية'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Battle History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>سجل البطاقات</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Text style={styles.historyModalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyScroll}>
              {state.roundResults.map((result) => (
                <View key={result.round} style={styles.historyRoundItem}>
                  <Text style={styles.historyRoundNumber}>
                    الجولة {result.round}
                  </Text>
                  <View style={styles.historyCardsRow}>
                    <View style={styles.historyCardSection}>
                      <Text style={styles.historyCardLabel}>👤 أنت</Text>
                      <Text style={styles.historyCardName}>
                        {result.playerCard.nameAr}
                      </Text>
                      <Text style={styles.historyCardStats}>
                        الضرر: {result.playerDamage}
                      </Text>
                    </View>
                    <View style={styles.historyVS}>
                      <Text style={styles.historyVSText}>VS</Text>
                    </View>
                    <View style={styles.historyCardSection}>
                      <Text style={styles.historyCardLabel}>🤖 البوت</Text>
                      <Text style={styles.historyCardName}>
                        {result.botCard.nameAr}
                      </Text>
                      <Text style={styles.historyCardStats}>
                        الضرر: {result.botDamage}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.historyWinner,
                      {
                        color:
                          result.winner === "player"
                            ? "#4ade80"
                            : result.winner === "bot"
                            ? "#f87171"
                            : "#fbbf24",
                      },
                    ]}
                  >
                    {result.winner === "player" ? "✓ أنت الفائز" : result.winner === "bot" ? "✗ البوت يفوز" : "= تعادل"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  historyButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  historyModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderTopColor: '#d4af37',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  historyModalCloseButton: {
    fontSize: 24,
    color: '#a0a0a0',
  },
  historyScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyRoundItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d4af37',
  },
  historyRoundNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 8,
  },
  historyCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCardSection: {
    flex: 1,
    alignItems: 'center',
  },
  historyCardLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  historyCardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 4,
  },
  historyCardStats: {
    fontSize: 11,
    color: '#888',
  },
  historyVS: {
    marginHorizontal: 8,
  },
  historyVSText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  historyWinner: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  abilitiesContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  abilityButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  abilityButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  abilityButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
});
