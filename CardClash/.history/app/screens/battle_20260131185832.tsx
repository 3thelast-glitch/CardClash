import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, ScrollView, PanResponder, Animated as RNAnimated } from 'react-native';
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

// ✅ Component قابل للتحريك والتكبير
const DraggableResizable = ({ children, id, initialX = 0, initialY = 0, initialScale = 1, onUpdate }: any) => {
  const pan = useRef(new RNAnimated.ValueXY({ x: initialX, y: initialY })).current;
  const [scale, setScale] = useState(initialScale);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: RNAnimated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        if (onUpdate) {
          onUpdate(id, {
            x: (pan.x as any)._value,
            y: (pan.y as any)._value,
            scale,
          });
        }
      },
    })
  ).current;

  return (
    <RNAnimated.View
      style={[
        {
          position: 'absolute',
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.draggableContainer}>
        {children}
        
        {/* أزرار التحكم */}
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={styles.scaleButton}
            onPress={(e) => {
              e.stopPropagation();
              const newScale = Math.max(0.3, scale - 0.1);
              setScale(newScale);
              if (onUpdate) onUpdate(id, { x: (pan.x as any)._value, y: (pan.y as any)._value, scale: newScale });
            }}
          >
            <Text style={styles.scaleButtonText}>−</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.scaleButton}
            onPress={(e) => {
              e.stopPropagation();
              const newScale = Math.min(3, scale + 0.1);
              setScale(newScale);
              if (onUpdate) onUpdate(id, { x: (pan.x as any)._value, y: (pan.y as any)._value, scale: newScale });
            }}
          >
            <Text style={styles.scaleButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>⋮⋮</Text>
        </View>
      </View>
    </RNAnimated.View>
  );
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

  // ✅ وضع التعديل الحر
  const [editMode, setEditMode] = useState(false);
  
  // ✅ مواقع وأحجام العناصر
  const [elements, setElements] = useState({
    playerCard: { x: -150, y: 150, scale: 1 },
    botCard: { x: 150, y: 150, scale: 1 },
    vs: { x: 0, y: 150, scale: 1 },
    score: { x: 0, y: -200, scale: 1 },
    round: { x: 0, y: -250, scale: 1 },
    result: { x: 0, y: 250, scale: 1 },
    abilities: { x: -300, y: 0, scale: 1 },
  });

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

  const updateElement = (id: string, data: any) => {
    setElements((prev) => ({
      ...prev,
      [id]: data,
    }));
  };

  const resetLayout = () => {
    setElements({
      playerCard: { x: -150, y: 150, scale: 1 },
      botCard: { x: 150, y: 150, scale: 1 },
      vs: { x: 0, y: 150, scale: 1 },
      score: { x: 0, y: -200, scale: 1 },
      round: { x: 0, y: -250, scale: 1 },
      result: { x: 0, y: 250, scale: 1 },
      abilities: { x: -300, y: 0, scale: 1 },
    });
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

      {/* ✅ أزرار التحكم الرئيسية */}
      <View style={styles.mainControls}>
        <TouchableOpacity
          style={[styles.editModeButton, editMode && styles.editModeButtonActive]}
          onPress={() => setEditMode(!editMode)}
        >
          <Text style={styles.editModeButtonText}>
            {editMode ? '✓ حفظ' : '✏️ تعديل'}
          </Text>
        </TouchableOpacity>

        {editMode && (
          <TouchableOpacity style={styles.resetLayoutButton} onPress={resetLayout}>
            <Text style={styles.resetLayoutButtonText}>🔄 إعادة ضبط</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ✅ المحتوى */}
      <View style={styles.battleContainer} pointerEvents={editMode ? 'auto' : 'box-none'}>
        
        {editMode ? (
          // ✅ وضع التعديل - كل شيء قابل للسحب
          <>
            {/* بطاقة اللاعب */}
            <DraggableResizable
              id="playerCard"
              initialX={elements.playerCard.x}
              initialY={elements.playerCard.y}
              initialScale={elements.playerCard.scale}
              onUpdate={updateElement}
            >
              <View>
                <Text style={styles.elementLabel}>👤 أنت</Text>
                <View style={{ transform: [{ scale: 0.8 }] }}>
                  <CardItem card={displayPlayerCard} size="large" />
                </View>
              </View>
            </DraggableResizable>

            {/* بطاقة البوت */}
            <DraggableResizable
              id="botCard"
              initialX={elements.botCard.x}
              initialY={elements.botCard.y}
              initialScale={elements.botCard.scale}
              onUpdate={updateElement}
            >
              <View>
                <Text style={styles.elementLabel}>🤖 البوت</Text>
                <View style={{ transform: [{ scale: 0.8 }] }}>
                  <CardItem card={displayBotCard} size="large" />
                </View>
              </View>
            </DraggableResizable>

            {/* VS */}
            <DraggableResizable
              id="vs"
              initialX={elements.vs.x}
              initialY={elements.vs.y}
              initialScale={elements.vs.scale}
              onUpdate={updateElement}
            >
              <View style={styles.vsEditBox}>
                <Text style={styles.vsEditText}>⚔️ VS ⚔️</Text>
              </View>
            </DraggableResizable>

            {/* النقاط */}
            <DraggableResizable
              id="score"
              initialX={elements.score.x}
              initialY={elements.score.y}
              initialScale={elements.score.scale}
              onUpdate={updateElement}
            >
              <View style={styles.scoreEditBox}>
                <Text style={styles.scoreEditText}>
                  {state.playerScore} - {state.botScore}
                </Text>
              </View>
            </DraggableResizable>

            {/* الجولة */}
            <DraggableResizable
              id="round"
              initialX={elements.round.x}
              initialY={elements.round.y}
              initialScale={elements.round.scale}
              onUpdate={updateElement}
            >
              <View style={styles.roundEditBox}>
                <Text style={styles.roundEditText}>
                  الجولة {state.currentRound + 1}/{state.totalRounds}
                </Text>
              </View>
            </DraggableResizable>

            {/* القدرات */}
            <DraggableResizable
              id="abilities"
              initialX={elements.abilities.x}
              initialY={elements.abilities.y}
              initialScale={elements.abilities.scale}
              onUpdate={updateElement}
            >
              <View style={styles.abilitiesEditBox}>
                <Text style={styles.abilitiesEditTitle}>قدرات اللعب</Text>
                {state.playerAbilities.map((ability, index) => (
                  <View key={index} style={styles.abilityEditItem}>
                    <Text style={styles.abilityEditText}>
                      {ability.used ? '✗' : '✓'} {getAbilityNameAr(ability.type)}
                    </Text>
                  </View>
                ))}
              </View>
            </DraggableResizable>

            {showResult && (
              <DraggableResizable
                id="result"
                initialX={elements.result.x}
                initialY={elements.result.y}
                initialScale={elements.result.scale}
                onUpdate={updateElement}
              >
                <View style={styles.resultEditBox}>
                  <Text style={[styles.resultEditText, { color: getResultColor() }]}>
                    {getResultMessage()}
                  </Text>
                </View>
              </DraggableResizable>
            )}
          </>
        ) : (
          // ✅ وضع اللعب العادي - استخدام المواقع المحفوظة
          <View style={styles.normalPlayContainer}>
            
            {/* بطاقة اللاعب */}
            <View style={[
              styles.absolutePosition,
              {
                left: '50%',
                top: '50%',
                marginLeft: elements.playerCard.x,
                marginTop: elements.playerCard.y,
                transform: [{ scale: elements.playerCard.scale }],
              }
            ]}>
              <Text style={styles.playerLabel}>👤 أنت</Text>
              <Animated.View style={playerCardAnimatedStyle}>
                <CardItem card={displayPlayerCard} size="large" />
                {showPlayerEffect && displayPlayerCard && (
                  <ElementEffect element={displayPlayerCard.element} style={styles.elementEffect} />
                )}
              </Animated.View>
            </View>

            {/* بطاقة البوت */}
            <View style={[
              styles.absolutePosition,
              {
                left: '50%',
                top: '50%',
                marginLeft: elements.botCard.x,
                marginTop: elements.botCard.y,
                transform: [{ scale: elements.botCard.scale }],
              }
            ]}>
              <Text style={styles.playerLabel}>🤖 البوت</Text>
              <Animated.View style={botCardAnimatedStyle}>
                <CardItem card={displayBotCard} size="large" />
                {showBotEffect && displayBotCard && (
                  <ElementEffect element={displayBotCard.element} style={styles.elementEffect} />
                )}
              </Animated.View>
            </View>

            {/* VS */}
            <Animated.View style={[
              styles.absolutePosition,
              vsAnimatedStyle,
              {
                left: '50%',
                top: '50%',
                marginLeft: elements.vs.x,
                marginTop: elements.vs.y,
                transform: [{ scale: elements.vs.scale }],
              }
            ]}>
              <Text style={styles.vsText}>⚔️ VS ⚔️</Text>
            </Animated.View>

            {/* النقاط */}
            <View style={[
              styles.absolutePosition,
              {
                left: '50%',
                top: '50%',
                marginLeft: elements.score.x,
                marginTop: elements.score.y,
                transform: [{ scale: elements.score.scale }],
              }
            ]}>
              <View style={styles.scoreBoard}>
                <Text style={[styles.score, { color: '#4ade80' }]}>{state.playerScore}</Text>
                <Text style={styles.scoreSeparator}>-</Text>
                <Text style={[styles.score, { color: '#f87171' }]}>{state.botScore}</Text>
              </View>
            </View>

            {/* الجولة */}
            <View style={[
              styles.absolutePosition,
              {
                left: '50%',
                top: '50%',
                marginLeft: elements.round.x,
                marginTop: elements.round.y,
                transform: [{ scale: elements.round.scale }],
              }
            ]}>
              <Text style={styles.roundText}>
                الجولة {showResult ? lastRoundResult?.round : state.currentRound + 1}/{state.totalRounds}
              </Text>
            </View>

            {/* القدرات */}
            <View style={[
              styles.absolutePosition,
              {
                left: '50%',
                top: '50%',
                marginLeft: elements.abilities.x,
                marginTop: elements.abilities.y,
                transform: [{ scale: elements.abilities.scale }],
              }
            ]}>
              <View style={styles.abilitiesSidebar}>
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
            </View>

            {/* النتيجة */}
            {showResult && (
              <Animated.View style={[
                styles.absolutePosition,
                resultAnimatedStyle,
                {
                  left: '50%',
                  top: '50%',
                  marginLeft: elements.result.x,
                  marginTop: elements.result.y,
                  transform: [{ scale: elements.result.scale }],
                }
              ]}>
                <View style={styles.resultContainer}>
                  <Text style={[styles.resultText, { color: getResultColor() }]}>
                    {getResultMessage()}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* الأزرار */}
            {phase === 'waiting' && (
              <View style={styles.bottomControlsFixed}>
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
        )}
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

  mainControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 200,
    flexDirection: 'row',
    gap: 10,
  },

  editModeButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },

  editModeButtonActive: {
    backgroundColor: '#4ade80',
  },

  editModeButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },

  resetLayoutButton: {
    backgroundColor: '#f87171',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },

  resetLayoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  battleContainer: {
    flex: 1,
    zIndex: 1,
  },

  draggableContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d4af37',
    borderStyle: 'dashed',
    padding: 8,
  },

  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },

  scaleButton: {
    backgroundColor: '#d4af37',
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scaleButtonText: {
    color: '#1a1a1a',
    fontSize: 20,
    fontWeight: 'bold',
  },

  dragHandle: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#4ade80',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  dragHandleText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },

  elementLabel: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },

  vsEditBox: {
    padding: 16,
  },

  vsEditText: {
    color: '#e94560',
    fontSize: 28,
    fontWeight: 'bold',
  },

  scoreEditBox: {
    padding: 12,
  },

  scoreEditText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  roundEditBox: {
    padding: 12,
  },

  roundEditText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: 'bold',
  },

  abilitiesEditBox: {
    padding: 12,
    gap: 8,
  },

  abilitiesEditTitle: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },

  abilityEditItem: {
    backgroundColor: '#d4af37',
    padding: 8,
    borderRadius: 12,
  },

  abilityEditText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  resultEditBox: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },

  resultEditText: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  normalPlayContainer: {
    flex: 1,
  },

  absolutePosition: {
    position: 'absolute',
    alignItems: 'center',
  },

  playerLabel: {
    fontSize: 14,
    color: '#d4af37',
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  elementEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  vsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
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

  roundText: {
    fontSize: 18,
    color: '#d4af37',
    fontWeight: 'bold',
  },

  abilitiesSidebar: {
    gap: 12,
    padding: 8,
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
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
    minWidth: 120,
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

  resultContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },

  resultText: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  bottomControlsFixed: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 100,
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 18,
    color: '#a0a0a0',
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
