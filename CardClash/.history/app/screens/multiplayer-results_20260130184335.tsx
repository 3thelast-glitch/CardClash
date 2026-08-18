import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';
import { useGame } from '@/lib/game/game-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MultiplayerResultsScreen() {
  const router = useRouter();
  const { state: mpState, leaveRoom } = useMultiplayer();
  const { state: gameState } = useGame();
  
  // حفظ نتائج المباراة
  useEffect(() => {
    saveMatchResult();
  }, []);
  
  const saveMatchResult = async () => {
    try {
      const matchResult = {
        id: `mp_${Date.now()}`,
        type: 'multiplayer',
        opponent: mpState.opponentName,
        playerScore: mpState.playerScore,
        opponentScore: mpState.opponentScore,
        winner: mpState.playerScore > mpState.opponentScore ? 'player' : mpState.playerScore < mpState.opponentScore ? 'opponent' : 'draw',
        totalRounds: mpState.playerCards.length,
        timestamp: new Date().toISOString(),
      };
      
      // حفظ في AsyncStorage
      const key = '@multiplayer_matches';
      const existing = await AsyncStorage.getItem(key);
      const matches = existing ? JSON.parse(existing) : [];
      matches.push(matchResult);
      await AsyncStorage.setItem(key, JSON.stringify(matches));
      
      console.log('Match result saved:', matchResult);
    } catch (error) {
      console.error('Error saving match result:', error);
    }
  };
  
  const handlePlayAgain = () => {
    leaveRoom();
    router.push('/screens/multiplayer-lobby' as any);
  };
  
  const handleHome = () => {
    leaveRoom();
    router.push('/(tabs)' as any);
  };
  
  const winner = mpState.playerScore > mpState.opponentScore 
    ? 'player' 
    : mpState.playerScore < mpState.opponentScore 
    ? 'opponent' 
    : 'draw';
  
  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Title */}
          <Text style={styles.title}>نتائج المباراة</Text>
          
          {/* Final Result */}
          <View style={styles.resultContainer}>
            <View style={styles.playerResult}>
              <Text style={styles.playerName}>أنت</Text>
              <Text style={[styles.score, winner === 'player' && styles.winnerScore]}>
                {mpState.playerScore}
              </Text>
              {winner === 'player' && <Text style={styles.winnerBadge}>🏆 الفائز 🏆</Text>}
            </View>
            
            <Text style={styles.vs}>VS</Text>
            
            <View style={styles.playerResult}>
              <Text style={styles.playerName}>{mpState.opponentName}</Text>
              <Text style={[styles.score, winner === 'opponent' && styles.winnerScore]}>
                {mpState.opponentScore}
              </Text>
              {winner === 'opponent' && <Text style={styles.winnerBadge}>🏆 الفائز 🏆</Text>}
            </View>
          </View>
          
          {/* Result Message */}
          <View style={styles.messageContainer}>
            {winner === 'player' && (
              <>
                <Text style={[styles.message, styles.winMessage]}>🎉 مبروك! أنت الفائز! 🎉</Text>
                <Text style={styles.subtitle}>لقد لعبت بشكل رائع!</Text>
              </>
            )}
            {winner === 'opponent' && (
              <>
                <Text style={[styles.message, styles.loseMessage]}>😔 للأسف خسرت هذه المرة</Text>
                <Text style={styles.subtitle}>حاول مرة أخرى!</Text>
              </>
            )}
            {winner === 'draw' && (
              <>
                <Text style={[styles.message, styles.drawMessage]}>🤝 تعادل! 🤝</Text>
                <Text style={styles.subtitle}>مباراة متوازنة!</Text>
              </>
            )}
          </View>
          
          {/* Match Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>إحصائيات المباراة</Text>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>عدد الجولات:</Text>
              <Text style={styles.statValue}>{mpState.playerCards.length}</Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>نوع المباراة:</Text>
              <Text style={styles.statValue}>لعب جماعي</Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>الوقت:</Text>
              <Text style={styles.statValue}>{new Date().toLocaleTimeString('ar-SA')}</Text>
            </View>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePlayAgain}
            >
              <Text style={styles.buttonText}>العب مرة أخرى</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleHome}
            >
              <Text style={styles.secondaryButtonText}>الرئيسية</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  resultContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 30,
  },
  playerResult: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    minWidth: 130,
  },
  playerName: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 10,
  },
  score: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  winnerScore: {
    color: '#44ff44',
    textShadowColor: '#44ff44',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  winnerBadge: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
    marginTop: 10,
  },
  vs: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  messageContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  message: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  winMessage: {
    color: '#44ff44',
  },
  loseMessage: {
    color: '#ff8844',
  },
  drawMessage: {
    color: '#FFD700',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 15,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  statLabel: {
    fontSize: 16,
    color: '#ccc',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buttonsContainer: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
