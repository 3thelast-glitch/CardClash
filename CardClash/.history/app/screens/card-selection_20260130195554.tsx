import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { LuxuryBackground } from '@/components/game/luxury-background';
import { CardItem } from '@/components/game/card-item';
import { useGame } from '@/lib/game/game-context';
import { ALL_CARDS } from '@/lib/game/cards-data';
import { Card } from '@/lib/game/types';
import { ALL_ABILITIES } from '@/lib/game/abilities';
import { getAbilityNameAr } from '@/lib/game/ability-names'; // ✅ إضافة هذا

interface CardRound {
  card: Card;
  round: number | null;
}

export default function CardSelectionScreen() {
  const router = useRouter();
  const { state, setPlayerDeck, startBattle } = useGame();
  const [cardRounds, setCardRounds] = useState<CardRound[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const totalRounds = state.totalRounds || 5;

  // Create random list of cards on load
  useEffect(() => {
    const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    const initialCards = shuffled.slice(0, totalRounds).map((card) => ({
      card,
      round: null,
    }));
    setCardRounds(initialCards);
  }, [totalRounds]);

  const handleCardPress = (index: number) => {
    setSelectedCardIndex(index);
    setShowRoundModal(true);
  };

  const handleRoundSelect = (round: number) => {
    if (selectedCardIndex !== null) {
      const updated = [...cardRounds];
      updated[selectedCardIndex].round = round;
      setCardRounds(updated);
      setShowRoundModal(false);
    }
  };

  const handleStartBattle = () => {
    // Verify all cards have assigned rounds
    const allAssigned = cardRounds.every((cr) => cr.round !== null);
    if (allAssigned) {
      // Sort cards by rounds
      const sortedCards = [...cardRounds]
        .sort((a, b) => (a.round || 0) - (b.round || 0))
        .map((cr) => cr.card);
      setPlayerDeck(sortedCards);
      startBattle(sortedCards);
      router.push('/screens/battle' as any);
    }
  };

  const renderCardItem = ({ item, index }: { item: CardRound; index: number }) => (
    <TouchableOpacity
      style={styles.cardItemContainer}
      onPress={() => handleCardPress(index)}
      activeOpacity={0.8}
    >
      <View style={styles.cardWrapper}>
        {item.round !== null && (
          <View style={styles.roundBadge}>
            <Text style={styles.roundBadgeText}>الجولة {item.round}</Text>
          </View>
        )}
        <CardItem card={item.card} size="medium" />
      </View>
      <Text style={styles.cardName}>{item.card.nameAr}</Text>
    </TouchableOpacity>
  );

  const allAssigned = cardRounds.every((cr) => cr.round !== null);

  return (
    <ScreenContainer>
      <LuxuryBackground />
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>رتب بطاقاتك</Text>
          <Text style={styles.subtitle}>اختر جولة لكل بطاقة</Text>
        </View>

        {/* Available Abilities */}
        {state.playerAbilities && state.playerAbilities.length > 0 && (
          <View style={styles.abilitiesContainer}>
            <Text style={styles.abilitiesTitle}>قدراتك الخاصة:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.abilitiesList}>
              {state.playerAbilities.map((ability, index) => (
                <View key={index} style={styles.abilityBadge}>
                  <Text style={styles.abilityBadgeText}>
                    {getAbilityNameAr(ability.type)} {/* ✅ التصليح هنا */}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Cards List */}
        <FlatList
          data={cardRounds}
          renderItem={renderCardItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          scrollEnabled={true}
          style={styles.cardsList}
          contentContainerStyle={styles.cardsContent}
        />

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/screens/leaderboard' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>← رجوع</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.startButton, !allAssigned && styles.startButtonDisabled]}
            onPress={handleStartBattle}
            disabled={!allAssigned}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>ابدأ المعركة →</Text>
          </TouchableOpacity>
        </View>

        {/* Round Selection Modal */}
        <Modal
          visible={showRoundModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRoundModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>اختر رقم الجولة</Text>
              <ScrollView style={styles.roundsScroll}>
                {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
                  <TouchableOpacity
                    key={round}
                    style={styles.roundOption}
                    onPress={() => handleRoundSelect(round)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roundOptionText}>الجولة {round}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowRoundModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseButtonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  subtitle: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  abilitiesContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#d4af37',
  },
  abilitiesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 8,
  },
  abilitiesList: {
    maxHeight: 40,
  },
  abilityBadge: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    justifyContent: 'center',
  },
  abilityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  cardsList: {
    flex: 1,
    marginHorizontal: 8,
  },
  cardsContent: {
    paddingVertical: 8,
  },
  cardItemContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  roundBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#d4af37',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  roundBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  cardName: {
    fontSize: 11,
    color: '#eee',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 16,
    textAlign: 'center',
  },
  roundsScroll: {
    maxHeight: 300,
  },
  roundOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  roundOptionText: {
    fontSize: 16,
    color: '#eee',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: '#666',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});
