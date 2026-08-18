import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';

export default function RoundsConfigScreen() {
  const router = useRouter();
  const { setTotalRounds } = useGame();
  const [rounds, setRounds] = useState(5);
  const [withAbility, setWithAbility] = useState(false);

  const roundOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container}>
          {/* العنوان */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>اختيار عدد الجولات</Text>
            <Text style={styles.selectedRounds}>الجولات المختارة: {rounds}</Text>
          </View>

          {/* خيارات الجولات - شبكة دائرية */}
          <View style={styles.roundsContainer}>
            {roundOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.roundButton,
                  rounds === option && styles.roundButtonActive,
                ]}
                onPress={() => setRounds(option)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roundButtonText,
                    rounds === option && styles.roundButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* خيار القدرات */}
          <View style={styles.abilityContainer}>
            <Text style={styles.abilityLabel}>هل تريد تفعيل القدرات الخاصة؟</Text>
            <View style={styles.abilityButtonsContainer}>
              <TouchableOpacity
                style={[styles.abilityButton, withAbility && styles.abilityButtonActive]}
                onPress={() => setWithAbility(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.abilityButtonText,
                    withAbility && styles.abilityButtonTextActive,
                  ]}
                >
                  نعم
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.abilityButton, !withAbility && styles.abilityButtonActive]}
                onPress={() => setWithAbility(false)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.abilityButtonText,
                    !withAbility && styles.abilityButtonTextActive,
                  ]}
                >
                  لا
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* أزرار التحكم */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/screens/game-mode' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← رجوع</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                setTotalRounds(rounds);
                router.push('/screens/leaderboard' as any);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>التالي →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LuxuryBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectedRounds: {
    fontSize: 16,
    color: '#a0a0a0',
  },
  roundsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 24,
    maxWidth: '100%',
  },
  roundButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#444',
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundButtonActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  roundButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#aaa',
  },
  roundButtonTextActive: {
    color: '#1a1a1a',
  },
  abilityContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 32,
  },
  abilityLabel: {
    fontSize: 18,
    color: '#d4af37',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  abilityButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  abilityButton: {
    backgroundColor: '#444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#666',
  },
  abilityButtonActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  abilityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#aaa',
  },
  abilityButtonTextActive: {
    color: '#1a1a1a',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    marginTop: 32,
  },
  backButton: {
    backgroundColor: '#666',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  startButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});
