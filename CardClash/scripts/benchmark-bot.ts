import { performance } from 'node:perf_hooks';
import { decideBotAbility } from '../lib/game/bot-ai';
import type { Card, GameState, RoundResult } from '../lib/game/types';
import type { DifficultyLevel } from '../app/screens/difficulty';

const card: Card = {
  id: 'benchmark-card',
  name: 'Benchmark',
  nameAr: 'اختبار',
  attack: 10,
  defense: 5,
  race: 'human',
  cardClass: 'warrior',
  element: 'fire',
};

const history: RoundResult[] = Array.from({ length: 5 }, (_, index) => ({
  round: index + 1,
  playerCard: { ...card, id: `p-${index}`, element: index % 2 ? 'water' : 'fire' },
  botCard: { ...card, id: `b-${index}` },
  playerDamage: 2,
  botDamage: 1,
  playerBaseDamage: 2,
  botBaseDamage: 1,
  playerElementAdvantage: 'neutral',
  botElementAdvantage: 'neutral',
  playerHealthDelta: 0,
  botHealthDelta: 0,
  winner: index % 2 ? 'bot' : 'player',
}));

const makeState = (difficulty: DifficultyLevel, scenario: { playerScore: number; botScore: number; currentRound: number }): GameState => ({
  playerDeck: [card, card, card, card, card],
  botDeck: [card, card, card, card, card],
  currentRound: scenario.currentRound,
  totalRounds: 5,
  playerScore: scenario.playerScore,
  botScore: scenario.botScore,
  playerMaxHealth: 5,
  botMaxHealth: 5,
  roundResults: history,
  difficulty,
  abilitiesEnabled: true,
  activeEffects: [],
  playerAbilities: [],
  botAbilities: [
    { type: 'Protection', used: false },
    { type: 'DoublePoints', used: false },
    { type: 'Popularity', used: false },
  ],
  usedAbilities: [],
});

const iterations = 2000;
const originalRandom = Math.random;
Math.random = () => 0.5;
try {
  const scenarios = [
    { name: 'متأخر', playerScore: 4, botScore: 1, currentRound: 1 },
    { name: 'متقارب', playerScore: 2, botScore: 2, currentRound: 2 },
    { name: 'متقدم قرب النهاية', playerScore: 1, botScore: 4, currentRound: 3 },
  ];
  const measurements = scenarios.flatMap((scenario) => ([1, 2, 3] as DifficultyLevel[]).map((difficulty) => {
    const state = makeState(difficulty, scenario);
    const started = performance.now();
    let uses = 0;
    let confidenceTotal = 0;
    for (let index = 0; index < iterations; index += 1) {
      const decision = decideBotAbility(state.botAbilities, card, state, difficulty);
      if (decision.useAbility) uses += 1;
      confidenceTotal += decision.prediction?.confidence ?? 0;
    }
    const elapsedMs = performance.now() - started;
    return {
      scenario: scenario.name,
      difficulty,
      iterations,
      elapsedMs: Number(elapsedMs.toFixed(3)),
      avgDecisionMs: Number((elapsedMs / iterations).toFixed(6)),
      abilityUseRate: Number((uses / iterations).toFixed(3)),
      avgPredictionConfidence: Number((confidenceTotal / iterations).toFixed(3)),
    };
  }));
  process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), measurements })}\n`);
} finally {
  Math.random = originalRandom;
}
