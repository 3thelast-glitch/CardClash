/**
 * MultiplayerWaitingScreen
 * Shows the animated room code + player status.
 * When opponent joins → navigate to card-selection → then battle.
 */

import React, { useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Share, ActivityIndicator, Pressable } from 'react-native';
import { ThemedText as Text } from '@/components/ui/ThemedText';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useMultiplayer } from '@/lib/multiplayer/multiplayer-context';

// Pulsing online indicator
function PulsingDot({ connected }: { connected: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (connected) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 600 }),
          withTiming(1.00, { duration: 600 })
        ),
        -1
      );
    } else {
      scale.value = 1;
    }
  }, [connected]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.dot, { backgroundColor: connected ? '#4ade80' : '#6b7280' }, style]} />
  );
}

export default function MultiplayerWaitingScreen() {
  const router = useRouter();
  const { state, setPlayerReady, leaveRoom } = useMultiplayer();

  // When opponent joins + status becomes 'playing' → go to card selection
  useEffect(() => {
    if (state.status === 'playing') {
      router.push('/screens/card-selection' as any);
    }
  }, [state.status]);

  // If host and both players present but still in 'waiting', auto-mark ready
  // (card selection screen handles setPlayerCards + setPlayerReady)

  const handleShare = useCallback(async () => {
    if (!state.roomId) return;
    try {
      await Share.share({
        message: `انضم لمباراتي في Card Clash!\nرمز الغرفة: ${state.roomId}`,
      });
    } catch { }
  }, [state.roomId]);

  const handleCopy = useCallback(async () => {
    if (!state.roomId) return;
    try {
      await Share.share({ message: state.roomId });
    } catch { }
  }, [state.roomId]);

  const handleLeave = useCallback(() => {
    leaveRoom();
    router.back();
  }, [leaveRoom, router]);

  const roomCode = state.roomId ?? '------';

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>

          {/* Title */}
          <Text style={styles.title}>🎮 غرفة اللعب</Text>

          {/* Room Code Card */}
          {state.isHost && (
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>رمز الغرفة — شاركه مع صديقك</Text>
              {/* Letter-by-letter display */}
              <View style={styles.codeLetters}>
                {roomCode.split('').map((ch, i) => (
                  <View key={i} style={styles.codeLetter}>
                    <Text style={styles.codeLetterText}>{ch}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.codeActions}>
                <Pressable style={styles.codeBtn} onPress={handleCopy}>
                  <Text style={styles.codeBtnText}>📋 نسخ</Text>
                </Pressable>
                <Pressable style={styles.codeBtn} onPress={handleShare}>
                  <Text style={styles.codeBtnText}>📤 مشاركة</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Waiting spinner */}
          {!state.opponentId && (
            <View style={styles.waitingRow}>
              <ActivityIndicator color="#d4af37" />
              <Text style={styles.waitingText}>
                {state.isHost ? 'في انتظار خصم...' : 'جاري الاتصال...'}
              </Text>
            </View>
          )}

          {/* Players Panel */}
          <View style={styles.playersRow}>
            {/* You */}
            <View style={styles.playerBox}>
              <Text style={styles.playerRole}>أنت</Text>
              <Text style={styles.playerNameText}>{state.playerName || 'لاعب'}</Text>
              <View style={styles.statusRow}>
                <PulsingDot connected />
                <Text style={styles.statusLabel}>متصل</Text>
              </View>
            </View>

            <Text style={styles.vs}>⚔️</Text>

            {/* Opponent */}
            <View style={styles.playerBox}>
              <Text style={styles.playerRole}>الخصم</Text>
              <Text style={styles.playerNameText}>
                {state.opponentName ?? '???'}
              </Text>
              <View style={styles.statusRow}>
                <PulsingDot connected={!!state.opponentId} />
                <Text style={styles.statusLabel}>
                  {state.opponentId ? 'متصل ✓' : 'في الانتظار'}
                </Text>
              </View>
            </View>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Leave */}
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <Text style={styles.leaveBtnText}>🚪 مغادرة الغرفة</Text>
          </TouchableOpacity>

        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const GOLD = '#d4af37';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 20 },

  title: {
    fontSize: 34, fontWeight: '900', color: GOLD, textAlign: 'center',
    textShadowColor: 'rgba(212,175,55,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
    flexWrap: 'wrap',
  },

  codeCard: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 18, borderWidth: 2,
    borderColor: GOLD + '44', padding: 18, alignItems: 'center', gap: 12,
  },
  codeLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600', textAlign: 'center', flexWrap: 'wrap' },
  codeLetters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  codeLetter: {
    width: 38, height: 48, borderRadius: 8, borderWidth: 2, borderColor: GOLD + '66',
    backgroundColor: 'rgba(212,175,55,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  codeLetterText: { color: GOLD, fontSize: 20, fontWeight: '900', letterSpacing: 0 },
  codeActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  codeBtn: {
    backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 10, borderWidth: 1,
    borderColor: GOLD + '33', paddingHorizontal: 16, paddingVertical: 8,
  },
  codeBtnText: { color: GOLD, fontSize: 13, fontWeight: '700' },

  waitingRow: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  waitingText: { color: GOLD, fontSize: 14, fontWeight: '600', textAlign: 'center', flexWrap: 'wrap' },

  playersRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)',
  },
  playerBox: { alignItems: 'center', gap: 6 },
  playerRole: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  playerNameText: { color: '#e5e7eb', fontSize: 16, fontWeight: '800', maxWidth: 110, textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  statusLabel: { color: '#9ca3af', fontSize: 11 },
  vs: { fontSize: 28 },

  leaveBtn: {
    borderWidth: 1.5, borderColor: '#ef4444' + '66', borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  leaveBtnText: { color: '#f87171', fontSize: 14, fontWeight: '700' },
});
