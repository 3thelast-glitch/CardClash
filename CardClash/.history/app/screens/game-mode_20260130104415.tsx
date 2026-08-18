import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';

export default function GameModeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>
          {/* العنوان */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>اختر نمط اللعب</Text>
          </View>

          {/* الأزرار */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.modeButton}
              onPress={() => router.push('/screens/difficulty' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Single</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modeButton}
              onPress={() => router.push('/screens/multiplayer-lobby' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Online</Text>
            </TouchableOpacity>
          </View>

          {/* زر الرجوع */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/screens/splash' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>← رجوع</Text>
          </TouchableOpacity>
        </View>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  titleContainer: {
    marginTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
  },
  modeButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 64,
    paddingVertical: 18,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#666',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
