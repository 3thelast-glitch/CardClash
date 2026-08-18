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
        return '🤝 تعادلاً!';
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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* ✅ الخلفية */}
      <View style={styles.backgroundWrapper}>
        <LuxuryBackground />
      </View>

      {/* ✅ المحتوى الرئيسي */}
      <View style={styles.container}>
        
        {/* ✅ Header - الجولة والنتيجة */}
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

        {/* ✅ Battle Area - تصميم أفقي (اليسار واليمين) */}
        <View style={styles.battleAreaHorizontal}>
          
          {/* ✅ الجانب الأيسر - اللاعب */}
          <View style={styles.sideSection}>
            <Text style={styles.playerLabelLarge}>👤 أنت</Text>
            <Animated.View style={[styles.cardWrapperLarge, playerCardAnimatedStyle]}>
              <CardItem card={displayPlayerCard} size="large" />
              {showPlayerEffect && displayPlayerCard && (
                <ElementEffect element={displayPlayerCard.element} style={styles.elementEffect} />
              )}
            </Animated.View>
            
            {showResult && lastRoundResult && (
              <View style={styles.damageContainerLarge}>
                <Text style={styles.damageTextLarge}>الضرر: {lastRoundResult.playerDamage}</Text>
                {lastRoundResult.playerElementAdvantage !== 'neutral' && (
                  <Text style={[styles.advantageTextLarge, { color: getAdvantageColor(lastRoundResult.playerElementAdvantage) }]}>
                    {ELEMENT_EMOJI[lastRoundResult.playerCard.element]} {getAdvantageText(lastRoundResult.playerElementAdvantage)}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ✅ الوسط - VS والنتيجة */}
          <View style={styles.centerSection}>
            <Animated.View style={[styles.vsContainerLarge, vsAnimatedStyle]}>
              <Text style={styles.vsTextLarge}>⚔️</Text>
              <Text style={styles.vsTextLarge}>VS</Text>
              <Text style={styles.vsTextLarge}>⚔️</Text>
            </Animated.View>

            {showResult && (
              <Animated.View style={[styles.resultContainerCenter, resultAnimatedStyle]}>
                <Text style={[styles.resultTextLarge, { color: getResultColor() }]}>
                  {getResultMessage()}
                </Text>
              </Animated.View>
            )}
          </View>

          {/* ✅ الجانب الأيمن - البوت */}
          <View style={styles.sideSection}>
            <Text style={styles.playerLabelLarge}>🤖 البوت</Text>
            <Animated.View style={[styles.cardWrapperLarge, botCardAnimatedStyle]}>
              <CardItem card={displayBotCard} size="large" />
              {showBotEffect && displayBotCard && (
                <ElementEffect element={displayBotCard.element} style={styles.elementEffect} />
              )}
            </Animated.View>
            
            {showResult && lastRoundResult && (
              <View style={styles.damageContainerLarge}>
                <Text style={styles.damageTextLarge}>الضرر: {lastRoundResult.botDamage}</Text>
                {lastRoundResult.botElementAdvantage !== 'neutral' && (
                  <Text style={[styles.advantageTextLarge, { color: getAdvantageColor(lastRoundResult.botElementAdvantage) }]}>
                    {ELEMENT_EMOJI[lastRoundResult.botCard.element]} {getAdvantageText(lastRoundResult.botElementAdvantage)}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ✅ Spacer */}
        <View style={{ flex: 1 }} />

        {/* ✅ Ability Buttons - القدرات في الأسفل */}
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
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }
              }}
              disabled={ability.used}
              activeOpacity={0.8}
            >
              <Text style={styles.abilityButtonText}>
                {ability.used ? '✗ ' : '✓ '}
                {getAbilityNameAr(ability.type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ✅ Control Buttons - في الأسفل */}
        {phase === 'waiting' && (
          <View style={styles.bottomControls}>
            {/* زر السجل على اليسار */}
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => setShowHistoryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.historyButtonText}>📋 السجل</Text>
            </TouchableOpacity>

            {/* زر الجولة التالية - شريط كبير */}
            <TouchableOpacity
              style={styles.nextButtonLarge}
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
                  <Text style={styles.historyRoundNumber}>الجولة {result.round}</Text>

                  <View style={styles.historyCardsRow}>
                    <View style={styles.historyCardSection}>
                      <Text style={styles.historyCardLabel}>👤 أنت</Text>
                      <Text style={styles.historyCardName}>{result.playerCard.nameAr}</Text>
                      <Text style={styles.historyCardStats}>الضرر: {result.playerDamage}</Text>
                    </View>

                    <View style={styles.historyVS}>
                      <Text style={styles.historyVSText}>VS</Text>
                    </View>

                    <View style={styles.historyCardSection}>
                      <Text style={styles.historyCardLabel}>🤖 البوت</Text>
                      <Text style={styles.historyCardName}>{result.botCard.nameAr}</Text>
                      <Text style={styles.historyCardStats}>الضرر: {result.botDamage}</Text>
                    </View>
                  </View>

                  <Text 
                    style={[
                      styles.historyWinner, 
                      { color: result.winner === 'player' ? '#4ade80' : result.winner === 'bot' ? '#f87171' : '#fbbf24' }
                    ]}
                  >
                    {result.winner === 'player' ? '✓ أنت الفائز' : result.winner === 'bot' ? '✗ البوت يفوز' : '= تعادل'}
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
  backgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  container: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    zIndex: 1,
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
    zIndex: 10,
  },

  roundText: {
    fontSize: 18,
    color: '#d4af37',
    marginBottom: 8,
    fontWeight: 'bold',
  },

  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  score: {
    fontSize: 32,
    fontWeight: 'bold',
  },

  scoreSeparator: {
    fontSize: 28,
    color: '#a0a0a0',
  },

  // ✅ تصميم أفقي - اليسار واليمين
  battleAreaHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    zIndex: 10,
    paddingVertical: 20,
  },

  // ✅ الجوانب (اليسار واليمين)
  sideSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ✅ الوسط (VS والنتيجة)
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  playerLabelLarge: {
    fontSize: 16,
    color: '#d4af37',
    marginBottom: 12,
    fontWeight: 'bold',
  },

  cardWrapperLarge: {
    position: 'relative',
    zIndex: 10,
    transform: [{ scale: 1.2 }], // ✅ البطاقات أكبر
  },

  elementEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  damageContainerLarge: {
    alignItems: 'center',
    marginTop: 16,
  },

  damageTextLarge: {
    fontSize: 16,
    color: '#e94560',
    fontWeight: 'bold',
  },

  advantageTextLarge: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
  },

  vsContainerLarge: {
    alignItems: 'center',
  },

  vsTextLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
    marginVertical: 4,
  },

  resultContainerCenter: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },

  resultTextLarge: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  // ✅ القدرات في الأسفل - 3 أزرار أفقية
  abilitiesContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    zIndex: 10,
  },

  abilityButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
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

  // ✅ الأزرار في الأسفل
  bottomControls: {
    paddingTop: 12,
    zIndex: 10,
  },

  historyButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },

  historyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },

  // ✅ زر كبير
  nextButtonLarge: {
    backgroundColor: '#d4af37',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },

  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  // Modal styles
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
});
