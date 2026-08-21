import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../lib/game/cards-data-exports';
import { getCharacterAbility } from '../lib/game/character-abilities';
import { gameReducer } from '../lib/game/game-context';
import type { Card, GameState } from '../lib/game/types';

const ROUNDS_PER_MATCH = 5;
const SCENARIOS_PER_ABILITY = 300;
const OUTPUT_PATH = resolve(process.cwd(), 'reports/ability-balance-simulation.json');

type MatchMetrics = {
  score: number;
  finalHealthGap: number;
  roundWins: number;
  roundLosses: number;
  netBaseDamage: number;
};

type AbilityBalanceRow = {
  cardId: string;
  ability: string;
  description: string;
  scenarios: number;
  missingCard: boolean;
  matchPointDelta: number;
  finalHealthGapDelta: number;
  roundWinDelta: number;
  netBaseDamageDelta: number;
  outcomeChangedRate: number;
};

/** مولّد ثابت لتبقى المحاكاة قابلة لإعادة الإنتاج والمراجعة. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function neutralizeProfessionalAbility(card: Card, index: number): Card {
  return {
    ...card,
    id: `balance-control-${card.id}-${index}`,
    characterAbilityId: undefined,
    specialAbility: undefined,
  };
}

function initialState(playerDeck: Card[], botDeck: Card[]): GameState {
  return {
    matchMode: 'solo',
    playerDeck,
    botDeck,
    currentRound: 0,
    totalRounds: playerDeck.length,
    playerScore: playerDeck.length,
    botScore: botDeck.length,
    playerMaxHealth: playerDeck.length,
    botMaxHealth: botDeck.length,
    roundResults: [],
    difficulty: 2,
    abilitiesEnabled: true,
    activeEffects: [],
    playerAbilities: [],
    botAbilities: [],
    usedAbilities: [],
  };
}

function simulateMatch(playerDeck: Card[], botDeck: Card[]): MatchMetrics {
  let state = gameReducer(initialState(playerDeck, botDeck), {
    type: 'START_BATTLE',
    payload: { playerDeck, botDeck, playerAbilities: [], botAbilities: [] },
  });

  for (let round = 0; round < ROUNDS_PER_MATCH; round += 1) {
    state = gameReducer(state, { type: 'PLAY_ROUND' });
    if (round < ROUNDS_PER_MATCH - 1) {
      state = gameReducer(state, { type: 'NEXT_ROUND', payload: { fromRound: round } });
    }
  }

  const roundWins = state.roundResults.filter(result => result.winner === 'player').length;
  const roundLosses = state.roundResults.filter(result => result.winner === 'bot').length;
  const netBaseDamage = state.roundResults.reduce(
    (sum, result) => sum + result.playerBaseDamage - result.botBaseDamage,
    0,
  );
  return {
    score: state.playerScore > state.botScore ? 1 : state.playerScore === state.botScore ? 0.5 : 0,
    finalHealthGap: state.playerScore - state.botScore,
    roundWins,
    roundLosses,
    netBaseDamage,
  };
}

function buildDecks(abilityCard: Card, random: () => number, control: boolean, scenario: number, fillerPool: Card[]) {
  const playerDeck = Array.from({ length: ROUNDS_PER_MATCH }, () => ({ ...pick(fillerPool, random) }));
  const botDeck = Array.from({ length: ROUNDS_PER_MATCH }, () => ({ ...pick(fillerPool, random) }));
  const insertionIndex = Math.floor(random() * ROUNDS_PER_MATCH);
  playerDeck[insertionIndex] = control ? neutralizeProfessionalAbility(abilityCard, scenario) : { ...abilityCard };
  return { playerDeck, botDeck };
}

function runBalanceSimulation(): AbilityBalanceRow[] {
  const abilityCards = ALL_CARDS
    .map(card => ({ card, definition: getCharacterAbility(card) }))
    .filter((entry): entry is { card: Card; definition: NonNullable<ReturnType<typeof getCharacterAbility>> } => Boolean(entry.definition));
  const abilityCardIds = new Set(abilityCards.map(entry => entry.card.id));
  const fillerPool = ALL_CARDS.filter(card => !abilityCardIds.has(card.id) && card.rarity !== 'special');
  const rows: AbilityBalanceRow[] = [];

  for (const [abilityIndex, { card: abilityCard, definition: ability }] of abilityCards.entries()) {

    let matchPointDelta = 0;
    let finalHealthGapDelta = 0;
    let roundWinDelta = 0;
    let netBaseDamageDelta = 0;
    let changedOutcomes = 0;

    for (let scenario = 0; scenario < SCENARIOS_PER_ABILITY; scenario += 1) {
      const seed = (abilityIndex + 1) * 100_000 + scenario;
      const withAbilityRandom = seededRandom(seed);
      const controlRandom = seededRandom(seed);
      const abilityDecks = buildDecks(abilityCard, withAbilityRandom, false, scenario, fillerPool);
      const controlDecks = buildDecks(abilityCard, controlRandom, true, scenario, fillerPool);
      const actual = simulateMatch(abilityDecks.playerDeck, abilityDecks.botDeck);
      const control = simulateMatch(controlDecks.playerDeck, controlDecks.botDeck);

      matchPointDelta += actual.score - control.score;
      finalHealthGapDelta += actual.finalHealthGap - control.finalHealthGap;
      roundWinDelta += (actual.roundWins - actual.roundLosses) - (control.roundWins - control.roundLosses);
      netBaseDamageDelta += actual.netBaseDamage - control.netBaseDamage;
      if (actual.score !== control.score) changedOutcomes += 1;
    }

    rows.push({
      cardId: abilityCard.id,
      ability: ability.nameAr,
      description: ability.descriptionAr,
      scenarios: SCENARIOS_PER_ABILITY,
      missingCard: false,
      matchPointDelta: Number((matchPointDelta / SCENARIOS_PER_ABILITY).toFixed(4)),
      finalHealthGapDelta: Number((finalHealthGapDelta / SCENARIOS_PER_ABILITY).toFixed(4)),
      roundWinDelta: Number((roundWinDelta / SCENARIOS_PER_ABILITY).toFixed(4)),
      netBaseDamageDelta: Number((netBaseDamageDelta / SCENARIOS_PER_ABILITY).toFixed(4)),
      outcomeChangedRate: Number((changedOutcomes / SCENARIOS_PER_ABILITY).toFixed(4)),
    });
  }
  return rows;
}

describe('ability balance simulation', () => {
  it('runs controlled repeatable matches with the production battle reducer', () => {
    const rows = runBalanceSimulation();
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify({
      generatedAt: new Date().toISOString(),
      roundsPerMatch: ROUNDS_PER_MATCH,
      scenariosPerAbility: SCENARIOS_PER_ABILITY,
      methodology: 'Each ability card is compared with an identical control card whose professional identifier is removed. Both receive the same deterministic five-round opponent and filler-card sequence.',
      rows,
    }, null, 2));
    expect(rows.filter(row => !row.missingCard)).not.toHaveLength(0);
    expect(rows.every(row => row.scenarios === 0 || row.scenarios === SCENARIOS_PER_ABILITY)).toBe(true);
  });
});
