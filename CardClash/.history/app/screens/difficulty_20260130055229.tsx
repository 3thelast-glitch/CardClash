import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { useGame } from '@/lib/game/game-context';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export default function DifficultyScreen() {
  const router = useRouter();
  const { setDifficulty } = useGame();
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);

  const difficulties = [
    {
      level: 'easy' as DifficultyLevel,
      title: 'سهل',
      description: 'البوت يختار بطاقات عشوائية',
      color: '#4ade80',
      icon: '😊',
    },
    {
      level: 'medium' as DifficultyLevel,
      title: 'متوسط',
      description: 'البوت يستخدم استراتيجية متوازنة',
      color: '#fbbf24',
      icon: '🤔',
    },
    {
      level: 'hard' as DifficultyLevel,
      title: 'صعب',
      description: 'البوت يستخدم استراتيجية متقدمة',
      color: '#f87171',
      icon: '😈',
    },
  ];

  const handleContinue = () => {
    if (selectedDifficulty) {
      setDifficulty(selectedDifficulty);
      router.push('/screens/rounds-config' as any);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <LuxuryBackground>
        <View style={styles.container}>
          {/* العنوان */}
          <View style={styles.header}>
            <Text style={styles.title}>اختر مستوى الصعوبة</Text>
            <Text style={styles.subtitle}>حدد مستوى تحدي المعركة</Text>
          </View>

          {/* خيارات الصعوبة */}
          <View style={styles.difficultiesContainer}>
            {difficulties.map((diff) => (
              <TouchableOpacity
                key={diff.level}
                style={[
                  styles.difficultyCard,
                  selectedDifficulty === diff.level && {
                    borderColor: diff.color,
                    borderWidth: 3,
                    backgroundColor: `${diff.color}20`,
                  },
                ]}
                onPress={() => setSelectedDifficulty(diff.level)}
                activeOpacity={0.8}
              >
                <Text style={styles.icon}>{diff.icon}</Text>
                <Text style={[styles.difficultyTitle, { color: diff.color }]}>{diff.title}</Text>
                <Text style={styles.difficultyDescription}>{diff.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* أزرار التحكم */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← رجوع</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.continueButton,
                !selectedDifficulty && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!selectedDifficulty}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  !selectedDifficulty && styles.continueButtonTextDisabled,
                ]}
              >
                التالي →
              </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  difficultiesContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  difficultyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  difficultyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  difficultyDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#d4af37',
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  continueButtonTextDisabled: {
    color: '#666',
  },
});
