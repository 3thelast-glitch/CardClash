import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import { useGame } from '@/lib/game/game-context';
import { Card } from '@/lib/game/types';

// حالات الجولة
type RoundPhase = 'selecting' | 'waiting' | 'revealing' | 'showing_result' | 'finished';

interface RoundState {
  phase: RoundPhase;
  playerCard: Card | null;
  opponentCard: Card | null;
  result: 'win' | 'lose' | 'draw' | null;
}

export default function MultiplayerBattleScreen() {
  const router = useRouter();
  const { state: mpState, revealCard } = useMultiplayer();
  const { state: gameState } = useGame();
  
  // حالة الجولة الحالية
  const [roundState, setRoundState] = useState<RoundState>({
    phase: 'selecting',
    playerCard: null,
    opponentCard: null,
    result: null,
  });
  
  // حالة المباراة
  const [currentRound, setCurrentRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  // المراجع لمنع تسرب الذاكرة
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundPhaseRef = useRef<RoundPhase>('selecting');
  
  const totalRounds = mpState.playerCards.length;
  
  // تنظيف المؤقتات عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // حساب الفائز
  const calculateRoundWinner = useCallback((p1Card: Card, p2Card: Card): 'win' | 'lose' | 'draw' => {
    if (p1Card.element === p2Card.element) {
      return p1Card.attack > p2Card.attack ? 'win' : p1Card.attack < p2Card.attack ? 'lose' : 'draw';
    }
    
    const elementAdvantage: Record<string, string> = {
      fire: 'nature',
      nature: 'water',
      water: 'fire',
    };
    
    if (elementAdvantage[p1Card.element] === p2Card.element) {
      return 'win';
    } else if (elementAdvantage[p2Card.element] === p1Card.element) {
      return 'lose';
    }
    
    return 'draw';
  }, []);
  
  // اختيار البطاقة
  const handleSelectCard = useCallback((card: Card) => {
    // تحديث الحالة
    setRoundState(prev => ({
      ...prev,
      phase: 'waiting',
      playerCard: card,
    }));
    roundPhaseRef.current = 'waiting';
    
    // إرسال البطاقة للخصم
    revealCard(currentRound, card);
  }, [currentRound, revealCard]);
  
  // محاكاة استقبال بطاقة الخصم (في التطبيق الحقيقي ستأتي من WebSocket)
  useEffect(() => {
    // إذا كان اللاعب قد اختار بطاقته والمرحلة "waiting"
    if (roundState.phase === 'waiting' && roundState.playerCard && !roundState.opponentCard) {
      // محاكاة تأخير الخصم (1-2 ثانية)
      const delay = 1000 + Math.random() * 1000;
      
      timeoutRef.current = setTimeout(() => {
        // اختيار بطاقة عشوائية من بطاقات الخصم
        const randomOpponentCard = mpState.opponentCards[currentRound];
        
        if (randomOpponentCard) {
          setRoundState(prev => ({
            ...prev,
            phase: 'revealing',
            opponentCard: randomOpponentCard,
          }));
          roundPhaseRef.current = 'revealing';
        }
      }, delay) as unknown as ReturnType<typeof setTimeout>;
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [roundState.phase, roundState.playerCard, roundState.opponentCard, currentRound, mpState.opponentCards]);
  
  // عرض النتيجة بعد كشف البطاقات
  useEffect(() => {
    if (roundState.phase === 'revealing' && roundState.playerCard && roundState.opponentCard) {
      // تأخير قصير لعرض البطاقات
      timeoutRef.current = setTimeout(() => {
        const result = calculateRoundWinner(roundState.playerCard!, roundState.opponentCard!);
        
        setRoundState(prev => ({
          ...prev,
          phase: 'showing_result',
          result,
        }));
        roundPhaseRef.current = 'showing_result';
        
        // تحديث النقاط
        if (result === 'win') {
          setPlayerScore(prev => prev + 1);
        } else if (result === 'lose') {
          setOpponentScore(prev => prev + 1);
        }
      }, 500) as unknown as ReturnType<typeof setTimeout>;
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [roundState.phase, roundState.playerCard, roundState.opponentCard, calculateRoundWinner]);
  
  // الانتقال للجولة التالية
  const handleNextRound = useCallback(() => {
    if (currentRound + 1 >= totalRounds) {
      // انهاء المباراة
      setGameOver(true);
    } else {
      // الانتقال للجولة التالية
      timeoutRef.current = setTimeout(() => {
        setCurrentRound(prev => prev + 1);
        setRoundState({
          phase: 'selecting',
          playerCard: null,
          opponentCard: null,
          result: null,
        });
        roundPhaseRef.current = 'selecting';
      }, 800) as unknown as ReturnType<typeof setTimeout>;
    }
  }, [currentRound, totalRounds]);
  
  // انهاء المباراة
  const handleFinishGame = useCallback(() => {
    router.push('/screens/multiplayer-results' as any);
  }, [router]);
  
  // شاشة النتائج النهائية
  if (gameOver) {
    const winner = playerScore > opponentScore ? 'you' : playerScore < opponentScore ? 'opponent' : 'draw';
    
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <LuxuryBackground>
          <View style={styles.container}>
            <Text style={styles.title}>انتهت المباراة!</Text>
            
            <View style={styles.finalScoreContainer}>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>أنت</Text>
                <Text style={styles.finalScore}>{playerScore}</Text>
              </View>
              
              <Text style={styles.vs}>-</Text>
              
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>{mpState.opponentName}</Text>
                <Text style={styles.finalScore}>{opponentScore}</Text>
              </View>
            </View>
            
            <Text style={[styles.resultText, winner === 'you' && styles.winText]}>
              {winner === 'you' ? '🎉 أنت الفائز! 🎉' : winner === 'draw' ? '🤝 تعادل! 🤝' : '😔 خسرت هذه المرة'}
            </Text>
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleFinishGame}
            >
              <Text style={styles.buttonText}>عرض النتائج</Text>
            </TouchableOpacity>
          </View>
        </LuxuryBackground>
      </ScreenContainer>
    );
  }
  
  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>
          {/* رأس المعركة */}
          <View style={styles.header}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>أنت</Text>
              <Text style={styles.playerScore}>{playerScore}</Text>
            </View>
            
            <View style={styles.roundInfo}>
              <Text style={styles.roundText}>الجولة {currentRound + 1}/{totalRounds}</Text>
            </View>
            
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{mpState.opponentName}</Text>
              <Text style={styles.playerScore}>{opponentScore}</Text>
            </View>
          </View>
          
          {/* عرض البطاقات */}
          <View style={styles.cardsContainer}>
            {/* بطاقة اللاعب */}
            <View style={styles.cardSide}>
              {roundState.playerCard ? (
                <View style={[styles.card, styles.selectedCard]}>
                  <Text style={styles.cardElement}>{roundState.playerCard.emoji}</Text>
                  <Text style={styles.cardPower}>{roundState.playerCard.attack}</Text>
                </View>
              ) : (
                <Text style={styles.waitingText}>في انتظار اختيارك...</Text>
              )}
            </View>
            
            {/* بطاقة الخصم */}
            <View style={styles.cardSide}>
              {roundState.opponentCard ? (
                <View style={[styles.card, styles.selectedCard]}>
                  <Text style={styles.cardElement}>{roundState.opponentCard.emoji}</Text>
                  <Text style={styles.cardPower}>{roundState.opponentCard.attack}</Text>
                </View>
              ) : roundState.phase === 'waiting' ? (
                <ActivityIndicator size="large" color="#FFD700" />
              ) : (
                <Text style={styles.waitingText}>في انتظار الخصم...</Text>
              )}
            </View>
          </View>
          
          {/* اختيار البطاقات */}
          {roundState.phase === 'selecting' && (
            <View style={styles.selectContainer}>
              <Text style={styles.selectLabel}>اختر بطاقتك:</Text>
              <View style={styles.cardsGrid}>
                {mpState.playerCards[currentRound] && (
                  <TouchableOpacity
                    style={styles.selectableCard}
                    onPress={() => handleSelectCard(mpState.playerCards[currentRound])}
                  >
                    <Text style={styles.cardElement}>{mpState.playerCards[currentRound].emoji}</Text>
                    <Text style={styles.cardPower}>{mpState.playerCards[currentRound].attack}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          
          {/* نتيجة الجولة */}
          {roundState.phase === 'showing_result' && roundState.result && (
            <View style={styles.resultContainer}>
              <Text style={[
                styles.roundResultText,
                roundState.result === 'win' && styles.winText,
                roundState.result === 'lose' && styles.loseText,
              ]}>
                {roundState.result === 'win' ? '✓ فزت بهذه الجولة!' : roundState.result === 'lose' ? '✗ خسرت هذه الجولة' : '= تعادل'}
              </Text>
              
              <TouchableOpacity
                style={styles.button}
                onPress={handleNextRound}
              >
                <Text style={styles.buttonText}>
                  {currentRound + 1 >= totalRounds ? 'انهاء المباراة' : 'الجولة التالية'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerInfo: {
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    color: '#FFD700',
    marginBottom: 5,
  },
  playerScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  roundInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  roundText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 30,
  },
  cardSide: {
    alignItems: 'center',
    minHeight: 150,
    justifyContent: 'center',
  },
  card: {
    width: 100,
    height: 140,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  cardElement: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  cardPower: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  waitingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  selectContainer: {
    marginVertical: 20,
  },
  selectLabel: {
    fontSize: 18,
    color: '#FFD700',
    marginBottom: 15,
    textAlign: 'center',
  },
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  selectableCard: {
    width: 80,
    height: 110,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  roundResultText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  winText: {
    color: '#44ff44',
  },
  loseText: {
    color: '#ff4444',
  },
  button: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 30,
  },
  finalScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 40,
  },
  scoreCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    minWidth: 120,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 10,
  },
  finalScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  vs: {
    fontSize: 28,
    color: '#FFD700',
    marginHorizontal: 20,
  },
  resultText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
});
