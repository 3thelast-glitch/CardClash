import { describe, expect, it } from 'vitest';
import { determineRoundWinner } from '../cards-data-exports';
import { gameReducer } from '../game-context';
import type { Card, GameState } from '../types';

const makeCard = (id: string, overrides: Partial<Card> = {}): Card => ({
  id,
  name: id,
  nameAr: id,
  attack: 10,
  defense: 0,
  race: 'human',
  cardClass: 'warrior',
  element: 'fire',
  ...overrides,
});

const makeState = (playerCard: Card, botCard: Card): GameState => ({
  playerDeck: [playerCard],
  botDeck: [botCard],
  currentRound: 0,
  totalRounds: 1,
  playerScore: 1,
  botScore: 1,
  playerMaxHealth: 1,
  botMaxHealth: 1,
  roundResults: [],
  difficulty: 2,
  abilitiesEnabled: false,
  activeEffects: [],
  playerAbilities: [],
  botAbilities: [],
  usedAbilities: [],
});

describe('نموذج صحة المباراة وأفضلية الفصائل', () => {
  it('يطبق أفضلية البشر على الألف من دون علاج تلقائي', () => {
    const humanCard = makeCard('human-card', { race: 'human', attack: 10 });
    const elfCard = makeCard('elf-card', { race: 'elf', attack: 1 });

    const result = determineRoundWinner(humanCard, elfCard);

    expect(result.playerFactionAdvantage).toBe('strong');
    expect(result.playerHealthDelta).toBe(0);
    expect(result.botHealthDelta).toBe(0);
  });

  it('يسجل ضعف الألف أمام البشر من دون تفاعل عنصري', () => {
    const elfCard = makeCard('elf-card', { race: 'elf', attack: 10 });
    const humanCard = makeCard('human-card', { race: 'human', attack: 1 });

    const result = determineRoundWinner(elfCard, humanCard);

    expect(result.playerFactionAdvantage).toBe('weak');
    expect(result.playerHealthDelta).toBe(0);
    expect(result.botHealthDelta).toBe(0);
  });

  it('لا يغيّر أفضلية الفصيلة صحة اللاعب أو حدها الأقصى', () => {
    const player = makeCard('human-card', { race: 'human', attack: 10 });
    const bot = makeCard('elf-card', { race: 'elf', attack: 1 });

    const resolved = gameReducer(makeState(player, bot), { type: 'PLAY_ROUND' });

    expect(resolved.playerScore).toBe(1);
    expect(resolved.playerMaxHealth).toBe(1);
    expect(resolved.botScore).toBe(0);
    expect(resolved.botMaxHealth).toBe(1);
    expect(resolved.roundResults[0].playerHealthDelta).toBe(0);
  });

  it('يطبق أفضلية الفصيلة للبوت من دون علاج تلقائي', () => {
    const player = makeCard('elf-card', { race: 'elf', attack: 1 });
    const bot = makeCard('human-card', { race: 'human', attack: 10 });

    const resolved = gameReducer(makeState(player, bot), { type: 'PLAY_ROUND' });

    expect(resolved.botScore).toBe(1);
    expect(resolved.botMaxHealth).toBe(1);
    expect(resolved.playerScore).toBe(0);
    expect(resolved.playerMaxHealth).toBe(1);
    expect(resolved.roundResults[0].botHealthDelta).toBe(0);
  });

  it('يعيد InfinityLoop بناء الصحة القصوى من الجولات المحتفظ بها', () => {
    const playerDeck = Array.from({ length: 4 }, (_, index) => makeCard(`p${index}`));
    const botDeck = Array.from({ length: 4 }, (_, index) => makeCard(`b${index}`));
    const makeRoundResult = (round: number, playerHealthDelta: number, botHealthDelta: number) => ({
      round,
      playerCard: playerDeck[round - 1],
      botCard: botDeck[round - 1],
      playerDamage: 1,
      botDamage: 0,
      playerBaseDamage: 1,
      botBaseDamage: 0,
      playerFactionAdvantage: 'neutral' as const,
      botFactionAdvantage: 'neutral' as const,
      playerHealthDelta,
      botHealthDelta,
      winner: 'player' as const,
    });
    const state: GameState = {
      ...makeState(playerDeck[0], botDeck[0]),
      playerDeck,
      botDeck,
      currentRound: 4,
      totalRounds: 4,
      playerScore: 8,
      botScore: 0,
      playerMaxHealth: 8,
      botMaxHealth: 4,
      abilitiesEnabled: true,
      playerAbilities: [{ type: 'InfinityLoop', used: false }],
      roundResults: [
        makeRoundResult(1, 4, -1),
        makeRoundResult(2, 0, -1),
        makeRoundResult(3, 0, -1),
        makeRoundResult(4, 0, -1),
      ],
    };

    const rewound = gameReducer(state, {
      type: 'USE_ABILITY',
      payload: { abilityType: 'InfinityLoop', isPlayer: true },
    });

    expect(rewound.currentRound).toBe(1);
    expect(rewound.playerScore).toBe(8);
    expect(rewound.botScore).toBe(3);
    expect(rewound.playerMaxHealth).toBe(8);
    expect(rewound.botMaxHealth).toBe(4);
  });
});
