import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';

export default function MultiplayerWaitingScreen() {
  const router = useRouter();
  const { state, leaveRoom } = useMultiplayer();
  
  // الانتقال لشاشة اختيار الجولات عند انضمام اللاعب الآخر
  useEffect(() => {
    if (state.opponentId && state.status === 'waiting') {
      // كلا اللاعبين موجودان، انتقل للمعركة
      setTimeout(() => {
        router.push('/screens/multiplayer-battle' as any);
      }, 1000);
    }
  }, [state.opponentId, state.status]);
  
  const handleShare = async () => {
    if (!state.roomId) return;
    
    try {
      await Share.share({
        message: `انضم لمباراتي في Card Clash!\nرمز الغرفة: ${state.roomId}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const handleLeave = () => {
    leaveRoom();
    router.back();
  };
  
  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>غرفة اللعب</Text>
          
          {/* Room Code */}
          <View style={styles.roomCodeContainer}>
            <Text style={styles.roomCodeLabel}>رمز الغرفة:</Text>
            <Text style={styles.roomCode}>{state.roomId}</Text>
          </View>
          
          {/* Waiting Status */}
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.waitingText}>
              {state.isHost
                ? 'في انتظار انضمام لاعب آخر...'
                : 'جاري الاتصال بالمضيف...'}
            </Text>
          </View>
          
          {/* Players Info */}
          <View style={styles.playersContainer}>
            <View style={styles.playerCard}>
              <Text style={styles.playerLabel}>أنت</Text>
              <Text style={styles.playerName}>{state.playerName || 'اللاعب 1'}</Text>
              <View style={styles.playerStatus}>
                <View style={styles.statusDotConnected} />
                <Text style={styles.statusText}>متصل</Text>
              </View>
            </View>
            
            <Text style={styles.vs}>VS</Text>
            
            <View style={styles.playerCard}>
              <Text style={styles.playerLabel}>الخصم</Text>
              <Text style={styles.playerName}>
                {state.opponentName || '...'}
              </Text>
              <View style={styles.playerStatus}>
                {state.opponentId ? (
                  <>
                    <View style={styles.statusDotConnected} />
                    <Text style={styles.statusText}>متصل</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>في الانتظار</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {state.isHost && (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
              >
                <Text style={styles.shareButtonText}>مشاركة رمز الغرفة</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeave}
            >
              <Text style={styles.leaveButtonText}>مغادرة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
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
  roomCodeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  roomCodeLabel: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 10,
  },
  roomCode: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 4,
  },
  waitingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  waitingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#FFD700',
    textAlign: 'center',
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  playerCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    minWidth: 140,
  },
  playerLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  playerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4444',
    marginRight: 6,
  },
  statusDotConnected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#44ff44',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#ccc',
  },
  vs: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buttonsContainer: {
    gap: 15,
  },
  shareButton: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  leaveButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.8)',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});
