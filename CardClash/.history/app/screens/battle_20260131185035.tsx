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

  // ✅ تحكم شامل في كل عنصر
  const [cardScale, setCardScale] = useState(1.1);
  const [cardsGap, setCardsGap] = useState(40);
  const [vsSize, setVsSize] = useState(28);
  const [scoreSize, setScoreSize] = useState(32);
  const [roundTextSize, setRoundTextSize] = useState(18);
  const [abilitiesWidth, setAbilitiesWidth] = useState(140);
  const [damageTextSize, setDamageTextSize] = useState(14);
  const [resultTextSize, setResultTextSize] = useState(22);
  const [playerLabelSize, setPlayerLabelSize] = useState(14);
  const [showControls, setShowControls] = useState(true);

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

  // ✅ دالة إعادة تعيين كل شيء
  const resetAll = () => {
    setCardScale(1.1);
    setCardsGap(40);
    setVsSize(28);
    setScoreSize(32);
    setRoundTextSize(18);
    setAbilitiesWidth(140);
    setDamageTextSize(14);
    setResultTextSize(22);
    setPlayerLabelSize(14);
  };

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

      {/* ✅ لوحة التحكم الشاملة */}
      {showControls && (
        <ScrollView style={styles.controlPanel} showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.toggleControlsButton}
            onPress={() => setShowControls(false)}
          >
            <Text style={styles.toggleControlsText}>✕ إخفاء</Text>
          </TouchableOpacity>

          <Text style={styles.controlSectionTitle}>🎴 البطاقات</Text>
          
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>حجم البطاقات: {cardScale.toFixed(2)}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setCardScale(Math.max(0.5, cardScale - 0.1))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setCardScale(Math.min(2, cardScale + 0.1))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>المسافة بين البطاقات: {cardsGap}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setCardsGap(Math.max(10, cardsGap - 10))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setCardsGap(Math.min(200, cardsGap + 10))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.controlSectionTitle}>👤 النصوص</Text>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>حجم اسم اللاعب: {playerLabelSize}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setPlayerLabelSize(Math.max(8, playerLabelSize - 2))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setPlayerLabelSize(Math.min(30, playerLabelSize + 2))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>حجم الضرر: {damageTextSize}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setDamageTextSize(Math.max(8, damageTextSize - 2))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setDamageTextSize(Math.min(30, damageTextSize + 2))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.controlSectionTitle}>⚔️ VS والنتيجة</Text>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>حجم VS: {vsSize}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setVsSize(Math.max(12, vsSize - 4))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setVsSize(Math.min(60, vsSize + 4))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>حجم النتيجة: {resultTextSize}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setResultTextSize(Math.max(12, resultTextSize - 2))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setResultTextSize(Math.min(40, resultTextSize + 2))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.controlSectionTitle}>📊 المعلومات</Text>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>حجم النقاط: {scoreSize}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setScoreSize(Math.max(16, scoreSize - 4))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setScoreSize(Math.min(60, scoreSize + 4))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>حجم نص الجولة: {roundTextSize}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setRoundTextSize(Math.max(10, roundTextSize - 2))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setRoundTextSize(Math.min(30, roundTextSize + 2))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.controlSectionTitle}>🎮 القدرات</Text>

          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>عرض القدرات: {abilitiesWidth}</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity style={styles.controlButton} onPress={() => setAbilitiesWidth(Math.max(80, abilitiesWidth - 10))}>
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={() => setAbilitiesWidth(Math.min(250, abilitiesWidth + 10))}>
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={resetAll}>
            <Text style={styles.resetButtonText}>🔄 إعادة تعيين الكل</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {!showControls && (
        <TouchableOpacity 
          style={styles.showControlsButton}
          onPress={() => setShowControls(true)}
        >
          <Text style={styles.showControlsText}>⚙️</Text>
        </TouchableOpacity>
      )}

      {/* ✅ Layout رئيسي */}
      <View style={styles.mainLayout}>
        
        {/* ✅ القدرات على اليسار */}
        <View style={[styles.abilitiesSidebar, { width: abilitiesWidth }]}>
          <Text style={styles.abilitiesTitle}>قدرات اللعب</Text>
          {state.playerAbilities.map((ability, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.abilityButtonVertical,
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
              <Text style={styles.abilityButtonTextVertical}>
                {ability.used ? '✗ ' : '✓ '}
                {getAbilityNameAr(ability.type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ✅ المنطقة الوسطى */}
        <View style={styles.centerArea}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.roundText, { fontSize: roundTextSize }]}>
              الجولة {showResult ? lastRoundResult?.round : state.currentRound + 1}/{state.totalRounds}
            </Text>
            <View style={styles.scoreBoard}>
              <Text style={[styles.score, { fontSize: scoreSize, color: '#4ade80' }]}>{state.playerScore}</Text>
              <Text style={[styles.scoreSeparator, { fontSize: scoreSize - 4 }]}>-</Text>
              <Text style={[styles.score, { fontSize: scoreSize, color: '#f87171' }]}>{state.botScore}</Text>
            </View>
          </View>

          {/* ✅ Battle Area */}
          <View style={[styles.battleAreaCompact, { gap: cardsGap }]}>
            
            {/* بطاقة اللاعب */}
            <View style={styles.cardSectionCompact}>
              <Text style={[styles.playerLabelCompact, { fontSize: playerLabelSize }]}>👤 أنت</Text>
              <Animated.View style={[
                styles.cardWrapperCompact, 
                playerCardAnimatedStyle,
                { transform: [{ scale: cardScale }] }
              ]}>
                <CardItem card={displayPlayerCard} size="large" />
                {showPlayerEffect && displayPlayerCard && (
                  <ElementEffect element={displayPlayerCard.element} style={styles.elementEffect} />
                )}
              </Animated.View>
              
              {showResult && lastRoundResult && (
                <View style={styles.damageContainerCompact}>
                  <Text style={[styles.damageTextCompact, { fontSize: damageTextSize }]}>
                    الضرر: {lastRoundResult.playerDamage}
                  </Text>
                  {lastRoundResult.playerElementAdvantage !== 'neutral' && (
                    <Text style={[styles.advantageTextCompact, { fontSize: damageTextSize - 2, color: getAdvantageColor(lastRoundResult.playerElementAdvantage) }]}>
                      {ELEMENT_EMOJI[lastRoundResult.playerCard.element]} {getAdvantageText(lastRoundResult.playerElementAdvantage)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* VS */}
            <Animated.View style={[styles.vsContainerCompact, vsAnimatedStyle]}>
              <Text style={[styles.vsTextCompact, { fontSize: vsSize }]}>⚔️</Text>
              <Text style={[styles.vsTextCompact, { fontSize: vsSize }]}>VS</Text>
              <Text style={[styles.vsTextCompact, { fontSize: vsSize }]}>⚔️</Text>
            </Animated.View>

            {/* بطاقة البوت */}
            <View style={styles.cardSectionCompact}>
              <Text style={[styles.playerLabelCompact, { fontSize: playerLabelSize }]}>🤖 البوت</Text>
              <Animated.View style={[
                styles.cardWrapperCompact, 
                botCardAnimatedStyle,
                { transform: [{ scale: cardScale }] }
              ]}>
                <CardItem card={displayBotCard} size="large" />
                {showBotEffect && displayBotCard && (
                  <ElementEffect element={displayBotCard.element} style={styles.elementEffect} />
                )}
              </Animated.View>
              
              {showResult && lastRoundResult && (
                <View style={styles.damageContainerCompact}>
                  <Text style={[styles.damageTextCompact, { fontSize: damageTextSize }]}>
                    الضرر: {lastRoundResult.botDamage}
                  </Text>
                  {lastRoundResult.botElementAdvantage !== 'neutral' && (
                    <Text style={[styles.advantageTextCompact, { fontSize: damageTextSize - 2, color: getAdvantageColor(lastRoundResult.botElementAdvantage) }]}>
                      {ELEMENT_EMOJI[lastRoundResult.botCard.element]} {getAdvantageText(lastRoundResult.botElementAdvantage)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* النتيجة */}
          {showResult && (
            <Animated.View style={[styles.resultContainerCenter, resultAnimatedStyle]}>
              <Text style={[styles.resultTextCenter, { fontSize: resultTextSize, color: getResultColor() }]}>
                {getResultMessage()}
              </Text>
            </Animated.View>
          )}

          <View style={{ flex: 1 }} />

          {/* ✅ الأزرار */}
          {phase === 'waiting' && (
            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => setShowHistoryModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.historyButtonText}>📋 السجل</Text>
              </TouchableOpacity>

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
      </View>

      {/* Modal */}
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
                  <Text style={[styles.historyWinner, { color: result.winner === 'player' ? '#4ade80' : result.winner === 'bot' ? '#f87171' : '#fbbf24' }]}>
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

  controlPanel: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderRadius: 16,
    padding: 12,
    zIndex: 100,
    borderWidth: 2,
    borderColor: '#d4af37',
    maxWidth: 220,
    maxHeight: '90%',
  },

  toggleControlsButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },

  toggleControlsText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: 'bold',
  },

  controlSectionTitle: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
    paddingBottom: 4,
  },

  controlGroup: {
    marginBottom: 12,
  },

  controlLabel: {
    color: '#fff',
    fontSize: 10,
    marginBottom: 6,
  },

  controlButtons: {
    flexDirection: 'row',
    gap: 6,
  },

  controlButton: {
    backgroundColor: '#d4af37',
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  controlButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },

  resetButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  resetButtonText: {
    color: '#1a1a1a',
    fontSize: 11,
    fontWeight: 'bold',
  },

  showControlsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#d4af37',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  showControlsText: {
    fontSize: 24,
  },

  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 1,
  },

  abilitiesSidebar: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },

  abilitiesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 8,
  },

  abilityButtonVertical: {
    backgroundColor: '#d4af37',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },

  abilityButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },

  abilityButtonTextVertical: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },

  centerArea: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    fontWeight: 'bold',
  },

  scoreSeparator: {
    color: '#a0a0a0',
  },

  battleAreaCompact: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingVertical: 20,
  },

  cardSectionCompact: {
    alignItems: 'center',
  },

  playerLabelCompact: {
    color: '#d4af37',
    marginBottom: 8,
    fontWeight: 'bold',
  },

  cardWrapperCompact: {
    position: 'relative',
    zIndex: 10,
  },

  elementEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  damageContainerCompact: {
    alignItems: 'center',
    marginTop: 12,
  },

  damageTextCompact: {
    color: '#e94560',
    fontWeight: 'bold',
  },

  advantageTextCompact: {
    fontWeight: 'bold',
    marginTop: 4,
  },

  vsContainerCompact: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  vsTextCompact: {
    fontWeight: 'bold',
    color: '#e94560',
    marginVertical: 2,
  },

  resultContainerCenter: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },

  resultTextCenter: {
    fontWeight: 'bold',
  },

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
