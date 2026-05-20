import { describe, it, expect } from 'vitest';
import { getRandomCards, calculateBaseDamage, calculateDamage, getElementAdvantage, determineRoundWinner } from '../game-logic';
import { ALL_CARDS } from '../cards-collection';
import { Card, ELEMENT_ADVANTAGES, ELEMENT_WEAKNESSES, ELEMENT_MULTIPLIER } from '../types';

const FINAL_IMAGE_PLACEHOLDER = require('../../../assets/images/icon.png');

describe('Cards Data', () => {
  it('should have 12 cards in the database', () => {
    expect(ALL_CARDS.length).toBe(12);
  });

  it('each card should have required properties', () => {
    ALL_CARDS.forEach((card: any) => {
      expect(card.id).toBeDefined();
      expect(card.name).toBeDefined();
      expect(card.nameAr).toBeDefined();
      expect(card.hp).toBeGreaterThan(0);
      expect(card.attack).toBeGreaterThan(0);
      expect(card.defense).toBeGreaterThanOrEqual(0);
      expect(card.speed).toBeGreaterThan(0);
      expect(card.race).toBeDefined();
      expect(card.cardClass).toBeDefined();
      expect(card.element).toBeDefined();
      expect(card.emoji).toBeDefined();
    });
  });

  it('each card should have unique id', () => {
    const ids = ALL_CARDS.map((card: any) => card.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('getRandomCards', () => {
  it('should return the requested number of cards', () => {
    const cards3 = getRandomCards(3);
    expect(cards3.length).toBe(3);

    const cards5 = getRandomCards(5);
    expect(cards5.length).toBe(5);
  });

  it('should return valid cards from the database', () => {
    const cards = getRandomCards(3);
    cards.forEach((card: any) => {
      const found = ALL_CARDS.find((c: any) => c.id === card.id);
      expect(found).toBeDefined();
    });
  });

  it('should return different cards on multiple calls (randomness)', () => {
    // Run multiple times to check randomness
    const results: string[][] = [];
    for (let i = 0; i < 10; i++) {
      const cards = getRandomCards(3);
      results.push(cards.map((c: any) => c.id).sort());
    }
    // At least some results should be different
    const uniqueResults = new Set(results.map((r) => r.join(',')));
    expect(uniqueResults.size).toBeGreaterThan(1);
  });
});

describe('calculateBaseDamage', () => {
  it('should calculate base damage correctly (attack - defense)', () => {
    const attacker: Card = {
      id: 'test-attacker',
      name: 'Test Attacker',
      finalImage: FINAL_IMAGE_PLACEHOLDER,
      nameAr: 'مهاجم اختبار',
      hp: 100,
      attack: 30,
      defense: 10,
      
      race: 'human',
      cardClass: 'warrior',
      element: 'fire',
      tags: [],
      emoji: '⚔️',
    };

    const defender: Card = {
      id: 'test-defender',
      name: 'Test Defender',
      finalImage: FINAL_IMAGE_PLACEHOLDER,
      nameAr: 'مدافع اختبار',
      hp: 100,
      attack: 20,
      defense: 15,
      
      race: 'human',
      cardClass: 'knight',
      element: 'earth',
      tags: [],
      emoji: '🛡️',
    };

    // Damage = attacker.attack - defender.defense = 30 - 15 = 15
    const damage = calculateBaseDamage(attacker, defender);
    expect(damage).toBe(15);
  });

  it('should return 0 when defense is higher than attack', () => {
    const attacker: Card = {
      id: 'weak-attacker',
      name: 'Weak Attacker',
      finalImage: FINAL_IMAGE_PLACEHOLDER,
      nameAr: 'مهاجم ضعيف',
      hp: 100,
      attack: 10,
      defense: 10,
      
      race: 'human',
      cardClass: 'mage',
      element: 'water',
      tags: [],
      emoji: '🔮',
    };

    const defender: Card = {
      id: 'strong-defender',
      name: 'Strong Defender',
      finalImage: FINAL_IMAGE_PLACEHOLDER,
      nameAr: 'مدافع قوي',
      hp: 100,
      attack: 20,
      defense: 25,
      
      race: 'undead',
      cardClass: 'knight',
      element: 'water',
      tags: [],
      emoji: '💀',
    };

    // Damage = 10 - 25 = -15, but should return 0 (no negative damage)
    const damage = calculateBaseDamage(attacker, defender);
    expect(damage).toBe(0);
  });
});

describe('Element System', () => {
  describe('getElementAdvantage', () => {
    it('fire should be strong against ice', () => {
      const advantage = getElementAdvantage('fire', 'ice');
      expect(advantage).toBe('strong');
    });

    it('ice should be strong against earth', () => {
      const advantage = getElementAdvantage('ice', 'earth');
      expect(advantage).toBe('strong');
    });

    it('earth should be strong against fire', () => {
      const advantage = getElementAdvantage('earth', 'fire');
      expect(advantage).toBe('strong');
    });

    it('fire should be weak against earth', () => {
      const advantage = getElementAdvantage('fire', 'earth');
      expect(advantage).toBe('weak');
    });

    it('ice should be weak against fire', () => {
      const advantage = getElementAdvantage('ice', 'fire');
      expect(advantage).toBe('weak');
    });

    it('earth should be weak against ice', () => {
      const advantage = getElementAdvantage('earth', 'ice');
      expect(advantage).toBe('weak');
    });

    it('same element should be neutral', () => {
      expect(getElementAdvantage('fire', 'fire')).toBe('neutral');
      expect(getElementAdvantage('ice', 'ice')).toBe('neutral');
      expect(getElementAdvantage('earth', 'earth')).toBe('neutral');
    });

    it('unrelated elements should be neutral', () => {
      expect(getElementAdvantage('fire', 'water')).toBe('neutral');
      expect(getElementAdvantage('lightning', 'wind')).toBe('neutral');
      expect(getElementAdvantage('water', 'lightning')).toBe('neutral');
    });
  });

  describe('calculateDamage with element effects', () => {
    it('should increase damage when attacker has element advantage', () => {
      const fireCard: Card = {
        id: 'fire-card',
        name: 'Fire Card',
        finalImage: FINAL_IMAGE_PLACEHOLDER,
        nameAr: 'بطاقة نارية',
        hp: 100,
        attack: 20,
        defense: 10,
        
        race: 'human',
        cardClass: 'warrior',
        element: 'fire',
        tags: [],
        emoji: '🔥',
      };

      const iceCard: Card = {
        id: 'ice-card',
        name: 'Ice Card',
        finalImage: FINAL_IMAGE_PLACEHOLDER,
        nameAr: 'بطاقة جليدية',
        hp: 100,
        attack: 20,
        defense: 10,
        
        race: 'undead',
        cardClass: 'knight',
        element: 'water',
        tags: [],
        emoji: '❄️',
      };

      // Fire attacks Ice (strong advantage)
      // Base damage = 20 - 10 = 10
      // With 1.25x multiplier = 12.5 -> 13 (rounded)
      const result = calculateDamage(fireCard, iceCard);
      expect(result.baseDamage).toBe(10);
      expect(result.advantage).toBe('strong');
      expect(result.damage).toBe(13); // 10 * 1.25 = 12.5 -> 13
    });

    it('should decrease damage when attacker has element disadvantage', () => {
      const fireCard: Card = {
        id: 'fire-card',
        name: 'Fire Card',
        finalImage: FINAL_IMAGE_PLACEHOLDER,
        nameAr: 'بطاقة نارية',
        hp: 100,
        attack: 20,
        defense: 10,
        
        race: 'human',
        cardClass: 'warrior',
        element: 'fire',
        tags: [],
        emoji: '🔥',
      };

      const earthCard: Card = {
        id: 'earth-card',
        name: 'Earth Card',
        finalImage: FINAL_IMAGE_PLACEHOLDER,
        nameAr: 'بطاقة أرضية',
        hp: 100,
        attack: 20,
        defense: 10,
        
        race: 'orc',
        cardClass: 'knight',
        element: 'earth',
        tags: [],
        emoji: '🌍',
      };

      // Fire attacks Earth (weak disadvantage)
      // Base damage = 20 - 10 = 10
      // With 0.75x multiplier = 7.5 -> 8 (rounded)
      const result = calculateDamage(fireCard, earthCard);
      expect(result.baseDamage).toBe(10);
      expect(result.advantage).toBe('weak');
      expect(result.damage).toBe(8); // 10 * 0.75 = 7.5 -> 8
    });

    it('should not modify damage for neutral elements', () => {
      const fireCard: Card = {
        id: 'fire-card',
        name: 'Fire Card',
        finalImage: FINAL_IMAGE_PLACEHOLDER,
        nameAr: 'بطاقة نارية',
        hp: 100,
        attack: 20,
        defense: 10,
        
        race: 'human',
        cardClass: 'warrior',
        element: 'fire',
        tags: [],
        emoji: '🔥',
      };

      const waterCard: Card = {
        id: 'water-card',
        name: 'Water Card',
        finalImage: FINAL_IMAGE_PLACEHOLDER,
        nameAr: 'بطاقة مائية',
        hp: 100,
        attack: 20,
        defense: 10,
        
        race: 'elf',
        cardClass: 'mage',
        element: 'water',
        tags: [],
        emoji: '💧',
      };

      // Fire attacks Water (neutral)
      // Base damage = 20 - 10 = 10
      // With 1.0x multiplier = 10
      const result = calculateDamage(fireCard, waterCard);
      expect(result.baseDamage).toBe(10);
      expect(result.advantage).toBe('neutral');
      expect(result.damage).toBe(10);
    });
  });
});

describe('determineRoundWinner with elements', () => {
  it('should include element advantage info in result', () => {
    const fireCard: Card = {
      id: 'fire-card',
      name: 'Fire Card',
      finalImage: FINAL_IMAGE_PLACEHOLDER,
      nameAr: 'بطاقة نارية',
      hp: 100,
      attack: 25,
      defense: 15,
      
      race: 'human',
      cardClass: 'warrior',
      element: 'fire',
      tags: [],
      emoji: '🔥',
    };

    const iceCard: Card = {
      id: 'ice-card',
      name: 'Ice Card',
      finalImage: FINAL_IMAGE_PLACEHOLDER,
      nameAr: 'بطاقة جليدية',
      hp: 100,
      attack: 25,
      defense: 15,
      
      race: 'undead',
      cardClass: 'knight',
      element: 'water',
      tags: [],
      emoji: '❄️',
    };

    const result = determineRoundWinner(fireCard, iceCard);
    
    // Fire has advantage over Ice
    expect(result.playerElementAdvantage).toBe('strong');
    // Ice has disadvantage against Fire
    expect(result.botElementAdvantage).toBe('weak');
    
    // Fire should win due to element advantage
    expect(result.winner).toBe('player');
  });

  it('element advantage can change the winner', () => {
    // Create cards where base damage would be equal
    const earthCard: Card = {
      id: 'earth-card',
      name: 'Earth Card',
      finalImage: FINAL_IMAGE_PLACEHOLDER,
      nameAr: 'بطاقة أرضية',
      hp: 100,
      attack: 25,
      defense: 15,
      
      race: 'orc',
      cardClass: 'warrior',
      element: 'earth',
      tags: [],
      emoji: '🌍',
    };

    const fireCard: Card = {
      id: 'fire-card',
      name: 'Fire Card',
      finalImage: FINAL_IMAGE_PLACEHOLDER,
      nameAr: 'بطاقة نارية',
      hp: 100,
      attack: 25,
      defense: 15,
      
      race: 'human',
      cardClass: 'warrior',
      element: 'fire',
      tags: [],
      emoji: '🔥',
    };

    // Base damage for both = 25 - 15 = 10
    // Earth vs Fire: Earth is strong (1.25x = 12.5 -> 13)
    // Fire vs Earth: Fire is weak (0.75x = 7.5 -> 8)
    const result = determineRoundWinner(earthCard, fireCard);
    
    expect(result.playerBaseDamage).toBe(10);
    expect(result.botBaseDamage).toBe(10);
    expect(result.playerDamage).toBe(13); // Earth strong vs Fire
    expect(result.botDamage).toBe(8);     // Fire weak vs Earth
    expect(result.winner).toBe('player'); // Earth wins due to element advantage
  });
});
