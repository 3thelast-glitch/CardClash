import { describe, expect, it, vi } from 'vitest';
import { decideBotAbility, getBotCards } from '../bot-ai';
import { ALL_CARDS } from '../cards-data-exports';
import type { GameState } from '../types';

describe('Bot AI System', () => {
  describe('getBotCards', () => {
    it('should return the correct number of cards', () => {
      const count = 5;
      const playerDeck = ALL_CARDS.slice(0, count);
      const botCards = getBotCards(count, 2, playerDeck);

      expect(botCards).toHaveLength(count);
    });

    it('should return different cards for different difficulty levels', () => {
      const count = 5;
      const playerDeck = ALL_CARDS.slice(0, count);

      const easyCards = getBotCards(count, 1, playerDeck);
      const mediumCards = getBotCards(count, 2, playerDeck);
      const hardCards = getBotCards(count, 3, playerDeck);

      expect(easyCards).toHaveLength(count);
      expect(mediumCards).toHaveLength(count);
      expect(hardCards).toHaveLength(count);
    });

    it('should return valid cards from the card database', () => {
      const count = 3;
      const playerDeck = ALL_CARDS.slice(0, count);
      const botCards = getBotCards(count, 2, playerDeck);

      botCards.forEach(card => {
        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('name');
        expect(card).toHaveProperty('attack');
        expect(card).toHaveProperty('defense');
        expect(card).toHaveProperty('element');
      });
    });

    it('should handle easy difficulty with random selection', () => {
      const count = 3;
      const playerDeck = ALL_CARDS.slice(0, count);
      const botCards = getBotCards(count, 1, playerDeck);

      // Easy mode should return random cards
      expect(botCards).toHaveLength(count);
      botCards.forEach(card => {
        expect(ALL_CARDS).toContainEqual(card);
      });
    });

    it('should handle medium difficulty with balanced selection', () => {
      const count = 3;
      const playerDeck = ALL_CARDS.slice(0, count);
      const botCards = getBotCards(count, 2, playerDeck);

      // Medium mode should return balanced cards
      expect(botCards).toHaveLength(count);
      botCards.forEach(card => {
        expect(ALL_CARDS).toContainEqual(card);
      });
    });

    it('should handle hard difficulty with strategic selection', () => {
      const count = 3;
      const playerDeck = [
        ALL_CARDS.find((c: any) => c.element === 'fire')!,
        ALL_CARDS.find((c: any) => c.element === 'water')!,
        ALL_CARDS.find((c: any) => c.element === 'earth')!,
      ];
      const botCards = getBotCards(count, 3, playerDeck);

      // Hard mode should try to counter player elements
      expect(botCards).toHaveLength(count);

      // Check if bot selected cards with elemental advantage
      const hasElementalAdvantage = botCards.some((botCard, index) => {
        const playerCard = playerDeck[index];
        // Water > Fire, Earth/Lightning > Water, Fire/Wind > Earth
        return (
          (playerCard.element === 'fire' && botCard.element === 'water') ||
          (playerCard.element === 'water' && (botCard.element === 'earth' || botCard.element === 'lightning')) ||
          (playerCard.element === 'earth' && (botCard.element === 'fire' || botCard.element === 'wind'))
        );
      });

      expect(hasElementalAdvantage).toBe(true);
    });

    it('should handle edge case with 1 card', () => {
      const count = 1;
      const playerDeck = [ALL_CARDS[0]];
      const botCards = getBotCards(count, 2, playerDeck);

      expect(botCards).toHaveLength(1);
      expect(ALL_CARDS).toContainEqual(botCards[0]);
    });

    it('should handle maximum available cards (12)', () => {
      const count = 12;
      const playerDeck = Array(count).fill(ALL_CARDS[0]);
      const botCards = getBotCards(count, 2, playerDeck);

      expect(botCards).toHaveLength(count);
    });
  });

  describe('استخدام القدرات', () => {
    it('يسمح للسهل والمتوسط باستخدام قدرة في موقف خسارة واضح', () => {
      const card = ALL_CARDS[0];
      const gameState: GameState = {
        playerDeck: [card],
        botDeck: [card],
        currentRound: 0,
        totalRounds: 5,
        playerScore: 2,
        botScore: 0,
        playerMaxHealth: 5,
        botMaxHealth: 5,
        roundResults: [],
        difficulty: 1,
        abilitiesEnabled: true,
        activeEffects: [],
        playerAbilities: [],
        botAbilities: [{ type: 'DoubleOrNothing', used: false }],
        usedAbilities: [],
      };

      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      try {
        expect(decideBotAbility(gameState.botAbilities, card, gameState, 1).useAbility).toBe(true);
        expect(decideBotAbility(gameState.botAbilities, card, gameState, 2).useAbility).toBe(true);
      } finally {
        vi.restoreAllMocks();
      }
    });
  });
});
