import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import { useGame } from '@/lib/game/game-context';
import { Card } from '@/lib/game/types';

export default function MultiplayerBattleScreen() {
  const router = useRouter();
  const { state: mpState, revealCard } = useMultiplayer();
  const { state: gameState } = useGame();
  
  const [currentRound, setCurrentRound] = useState(0);
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [opponentCard, setOpponentCard] = useState<Card | null>(null);
  const [roundResult, setRoundResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  const totalRounds = mpState.playerCards.length;
  
  // معالجة الرسائل من الخصم
  useEffect(() => {
    // يتم معالجة الرسائل في multiplayer-context
  }, []);
  
  const calculateRoundWinner = (p1Card: Card, p2Card: Card): 'win' | 'lose' | 'draw' => {
    // نفس منطق حساب الفائز من اللعبة العادية
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
  };
  
  const handleSelectCard = (card: Card) => {
    if (playerCard) return; // بطاقة مختارة بالفعل
    
    setPlayerCard(card);
    setIsWaitingForOpponent(true);
    
    // إرسال البطاقة المختارة للخصم
    revealCard(currentRound, card);
  };
  
  const handleNextRound = () => {
    if (!playerCard || !opponentCard) return;
    
    const result = calculateRoundWinner(playerCard, opponentCard);
    setRoundResult(result);
    
    // تحديث النقاط
    let newPlayerScore = playerScore;
    let newOpponentScore = opponentScore;
    
    if (result === 'win') {
      newPlayerScore += 1;
    } else if (result === 'lose') {
      newOpponentScore += 1;
    }
    
    setPlayerScore(newPlayerScore);
    setOpponentScore(newOpponentScore);
    
    // الانتقال للجولة التالية أو انهاء اللعبة
    if (currentRound + 1 >= totalRounds) {
      setGameOver(true);
    } else {
      setTimeout(() => {
        setCurrentRound(currentRound + 1);
        setPlayerCard(null);
        setOpponentCard(null);
        setRoundResult(null);
        setIsWaitingForOpponent(false);
      }, 2000);
    }
  };
  
  const handleFinishGame = () => {
    router.push('/screens/multiplayer-results' as any);
  };
  
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
              {playerCard ? (
                <View style={[styles.card, styles.selectedCard]}>
                  <Text style={styles.cardElement}>{playerCard.emoji}</Text>
                  <Text style={styles.cardPower}>{playerCard.attack}</Text>
                </View>
              ) : (
                <Text style={styles.waitingText}>في انتظار اختيارك...</Text>
              )}
            </View>
            
            {/* بطاقة الخصم */}
            <View style={styles.cardSide}>
              {opponentCard ? (
                <View style={[styles.card, styles.selectedCard]}>
                  <Text style={styles.cardElement}>{opponentCard.emoji}</Text>
                  <Text style={styles.cardPower}>{opponentCard.attack}</Text>
                </View>
              ) : isWaitingForOpponent ? (
                <ActivityIndicator size="large" color="#FFD700" />
              ) : (
                <Text style={styles.waitingText}>في انتظار الخصم...</Text>
              )}
            </View>
          </View>
          
          {/* اختيار البطاقات */}
          {!playerCard && (
            <View style={styles.selectContainer}>
              <Text style={styles.selectLabel}>اختر بطاقتك:</Text>
              <View style={styles.cardsGrid}>
                {mpState.playerCards.slice(currentRound * 1, currentRound * 1 + 1).map((card, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.selectableCard}
                    onPress={() => handleSelectCard(card)}
                  >
                    <Text style={styles.cardElement}>{card.emoji}</Text>
                    <Text style={styles.cardPower}>{card.attack}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          {/* نتيجة الجولة */}
          {roundResult && (
            <View style={styles.resultContainer}>
              <Text style={[
                styles.roundResultText,
                roundResult === 'win' && styles.winText,
                roundResult === 'lose' && styles.loseText,
              ]}>
                {roundResult === 'win' ? '✓ فزت بهذه الجولة!' : roundResult === 'lose' ? '✗ خسرت هذه الجولة' : '= تعادل'}
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
