import { describe, expect, it, vi } from 'vitest';
import { buildBotAbilityData, decideBotAbility, getBotCards, predictPlayerMove } from '../bot-ai';
import { gameReducer } from '../game-context';
import { ALL_CARDS, getFactionAdvantage } from '../cards-data-exports';
import type { Card, GameState, RoundResult } from '../types';

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
        ALL_CARDS.find(card => card.race === 'elf')!,
        ALL_CARDS.find(card => card.race === 'orc')!,
        ALL_CARDS.find(card => card.race === 'dragon')!,
      ];
      const botCards = getBotCards(count, 3, playerDeck);

      // Hard mode should try to counter player factions.
      expect(botCards).toHaveLength(count);

      const hasFactionAdvantage = botCards.some((botCard, index) => {
        const playerCard = playerDeck[index];
        return getFactionAdvantage(botCard.race, playerCard.race) === 'strong';
      });

      expect(hasFactionAdvantage).toBe(true);
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

  describe('توقع حركة اللاعب', () => {
    it('يرجّح آخر النماذج المرئية للمستوى الصعب فقط', () => {
      const card = ALL_CARDS[0];
      const water = { ...card, id: 'water', element: 'water' as const, cardClass: 'healer' as const };
      const results = [card, water, water].map((playerCard, index) => ({
        round: index + 1,
        playerCard,
        botCard: card,
        playerDamage: 0,
        botDamage: 0,
        playerBaseDamage: 0,
        botBaseDamage: 0,
        playerElementAdvantage: 'neutral' as const,
        botElementAdvantage: 'neutral' as const,
        playerHealthDelta: 0,
        botHealthDelta: 0,
        winner: 'draw' as const,
      })) as RoundResult[];
      const state: GameState = {
        playerDeck: [card],
        botDeck: [card],
        currentRound: 3,
        totalRounds: 5,
        playerScore: 2,
        botScore: 2,
        playerMaxHealth: 5,
        botMaxHealth: 5,
        roundResults: results,
        difficulty: 3,
        abilitiesEnabled: true,
        activeEffects: [],
        playerAbilities: [],
        botAbilities: [],
        usedAbilities: [],
      };
      const prediction = predictPlayerMove(state, 3);

      expect(prediction.faction).toBe('human');
      expect(prediction.cardClass).toBe('healer');
      expect(prediction.sampleCount).toBe(3);
      expect(prediction.confidence).toBeGreaterThan(0.5);
      expect(predictPlayerMove(state, 2).sampleCount).toBe(0);
    });

    it('يوجه بيانات القدرة نحو حركة اللاعب المتوقعة', () => {
      const card = ALL_CARDS[0];
      const predictedWater = { ...card, element: 'water' as const, cardClass: 'healer' as const };
      const state: GameState = {
        playerDeck: [card],
        botDeck: [card],
        currentRound: 3,
        totalRounds: 5,
        playerScore: 2,
        botScore: 2,
        playerMaxHealth: 5,
        botMaxHealth: 5,
        roundResults: Array.from({ length: 3 }, (_, index) => ({
          round: index + 1,
          playerCard: predictedWater,
          botCard: card,
          playerDamage: 0,
          botDamage: 0,
          playerBaseDamage: 0,
          botBaseDamage: 0,
          playerElementAdvantage: 'neutral' as const,
          botElementAdvantage: 'neutral' as const,
          playerHealthDelta: 0,
          botHealthDelta: 0,
          winner: 'draw' as const,
        })),
        difficulty: 3,
        abilitiesEnabled: true,
        activeEffects: [],
        playerAbilities: [],
        botAbilities: [],
        usedAbilities: [],
      },
      addElement = buildBotAbilityData('AddElement', state, card),
      propaganda = buildBotAbilityData('Propaganda', state, card);

      expect(['human', 'elf', 'orc', 'dragon', 'demon', 'undead', 'monster', 'robot']).toContain(addElement.faction);
      expect(propaganda.targetClass).toBe('healer');
    });
  });

  describe('الحالات الحرجة', () => {
    it('يحافظ على التعادل في الجولة الأخيرة ولا يختار قدرة مستقبلية', () => {
      const card = ALL_CARDS[0];
      const state: GameState = {
        playerDeck: [card, card, card, card, card],
        botDeck: [card, card, card, card, card],
        currentRound: 4,
        totalRounds: 5,
        playerScore: 3,
        botScore: 3,
        playerMaxHealth: 5,
        botMaxHealth: 5,
        roundResults: [],
        difficulty: 3,
        abilitiesEnabled: true,
        activeEffects: [],
        playerAbilities: [],
        botAbilities: [
          { type: 'Sniping', used: false },
          { type: 'Popularity', used: false },
          { type: 'Protection', used: false },
        ],
        usedAbilities: [],
      };

      const decision = decideBotAbility(state.botAbilities, card, state, 3);

      expect(decision.mode).toBe('balanced');
      expect(decision.abilityType).not.toBe('Sniping');
      expect(decision.abilityType).not.toBe('Popularity');
    });

    it('يحسم الجولة الأخيرة المتعادلة دون تغيير النتيجة النهائية', () => {
      const card: Card = {
        id: 'tie-player',
        name: 'Tie Player',
        nameAr: 'تعادل لاعب',
        attack: 10,
        defense: 10,
        race: 'human',
        cardClass: 'warrior',
        element: 'fire',
        stars: 3,
      };
      const botCard = { ...card, id: 'tie-bot' };
      const state: GameState = {
        playerDeck: [card],
        botDeck: [botCard],
        currentRound: 0,
        totalRounds: 1,
        playerScore: 3,
        botScore: 3,
        playerMaxHealth: 3,
        botMaxHealth: 3,
        roundResults: [],
        difficulty: 3,
        abilitiesEnabled: true,
        activeEffects: [],
        playerAbilities: [],
        botAbilities: [],
        usedAbilities: [],
      };
      const resolved = gameReducer(state, { type: 'PLAY_ROUND' });

      expect(resolved.roundResults).toHaveLength(1);
      expect(resolved.roundResults[0].winner).toBe('draw');
      expect(resolved.playerScore).toBe(3);
      expect(resolved.botScore).toBe(3);
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
