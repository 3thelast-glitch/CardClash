import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';

export default function LeaderboardScreen() {
  const router = useRouter();
  const { state } = useGame();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const totalRounds = state.totalRounds || 5;
  const numberOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  const toggleNumber = (num: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      } else if (prev.length < totalRounds) {
        return [...prev, num];
      }
      return prev;
    });
  };

  const handleContinue = () => {
    if (selectedNumbers.length === totalRounds) {
      router.push('/screens/card-selection' as any);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <ScrollView contentContainerStyle={styles.container}>
          {/* العنوان */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>اختر {totalRounds} أرقام</Text>
            <Text style={styles.subtitle}>
              {selectedNumbers.length}/{totalRounds}
            </Text>
          </View>

          {/* شبكة الأرقام */}
          <View style={styles.numbersGrid}>
            {numberOptions.map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.numberButton,
                  selectedNumbers.includes(num) && styles.numberButtonSelected,
                ]}
                onPress={() => toggleNumber(num)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.numberText,
                    selectedNumbers.includes(num) && styles.numberTextSelected,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* أزرار التحكم */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/screens/rounds-config' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← رجوع</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                selectedNumbers.length !== totalRounds && styles.startButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={selectedNumbers.length !== totalRounds}
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
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 24,
    maxWidth: '100%',
  },
  numberButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  numberButtonSelected: {
    backgroundColor: '#90ee90',
    borderColor: '#90ee90',
  },
  numberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  numberTextSelected: {
    color: '#000',
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
  startButtonDisabled: {
    backgroundColor: '#888',
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});
