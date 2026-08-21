import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_ABILITIES } from '../lib/game/abilities';
import { ABILITY_DETAILS } from '../lib/game/ability-details';
import { ALL_CARDS } from '../lib/game/cards-data-exports';
import { gameReducer } from '../lib/game/game-context';
import type { AbilityType, Card, GameState } from '../lib/game/types';

const ROUNDS_PER_MATCH = 5;
const SCENARIOS_PER_ABILITY = 200;
const OUTPUT_PATH = resolve(process.cwd(), 'reports/player-ability-card-simulation.json');

type Metrics = {
  matchPoints: number;
  healthGap: number;
  roundGap: number;
  baseDamageGap: number;
};

type AbilityRow = {
  abilityType: AbilityType;
  ability: string;
  category: string;
  trigger: string;
  scenarios: number;
  matchPointDelta: number;
  finalHealthGapDelta: number;
  roundWinDelta: number;
  netBaseDamageDelta: number;
  outcomeChangedRate: number;
};

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

function createState(playerDeck: Card[], botDeck: Card[], ability?: AbilityType): GameState {
  const critical = ability === 'NothingHappened';
  const health = critical ? 1 : ROUNDS_PER_MATCH;
  return {
    matchMode: 'solo',
    playerDeck,
    botDeck,
    currentRound: 0,
    totalRounds: ROUNDS_PER_MATCH,
    playerScore: health,
    botScore: health,
    playerMaxHealth: ROUNDS_PER_MATCH,
    botMaxHealth: ROUNDS_PER_MATCH,
    roundResults: [],
    difficulty: 2,
    abilitiesEnabled: true,
    activeEffects: [],
    playerAbilities: ability ? [{ type: ability, used: false }] : [],
    // ضغط موحّد على كل مباراة: الخصم يضع تخفيض هجوم في الجولة الأولى.
    botAbilities: ability === 'StealAbility' ? [{ type: 'Protection', used: false }] : [{ type: 'Reduction', used: false }],
    usedAbilities: [],
  };
}

function dataFor(ability: AbilityType, state: GameState): Record<string, unknown> | undefined {
  const currentRoundNumber = state.currentRound + 1;
  const nextRound = Math.min(state.totalRounds, currentRoundNumber + 1);
  const opponentCard = state.botDeck[state.currentRound];

  switch (ability) {
    case 'LogicalEncounter': return { predictions: { [nextRound]: 'win' } };
    case 'Popularity':
    case 'Sniping': return nextRound > currentRoundNumber ? { round: nextRound } : undefined;
    case 'Disaster': return { roundIndex: 0 };
    case 'Subhan': return { guessedAttack: opponentCard?.attack ?? 0 };
    case 'Propaganda': return { selection: state.playerDeck[state.currentRound]?.cardClass ?? 'warrior' };
    case 'AddElement': return { faction: 'elf' };
    default: return undefined;
  }
}

function waitForHistory(ability: AbilityType) {
  return ['Recall', 'Arise', 'Revive', 'Disaster', 'Merge'].includes(ability);
}

function useAbility(state: GameState, ability: AbilityType): GameState {
  return gameReducer(state, {
    type: 'USE_ABILITY',
    payload: { abilityType: ability, isPlayer: true, data: dataFor(ability, state) },
  });
}

function simulate(playerDeck: Card[], botDeck: Card[], playerAbility?: AbilityType): Metrics {
  let state = gameReducer(createState(playerDeck, botDeck, playerAbility), {
    type: 'START_BATTLE',
    payload: {
      playerDeck,
      botDeck,
      playerAbilities: playerAbility ? [playerAbility] : [],
      botAbilities: playerAbility === 'StealAbility' ? ['Protection'] : ['Reduction'],
    },
  });

  for (let round = 0; round < ROUNDS_PER_MATCH; round += 1) {
    const shouldWait = playerAbility && waitForHistory(playerAbility);
    const shouldUseNow = playerAbility
      && !state.usedAbilities.includes(playerAbility)
      && (!shouldWait || state.roundResults.length > 0);

    if (round === 0 && playerAbility !== 'StealAbility') {
      state = gameReducer(state, { type: 'USE_ABILITY', payload: { abilityType: 'Reduction', isPlayer: false } });
    }
    if (shouldUseNow) state = useAbility(state, playerAbility);
    state = gameReducer(state, { type: 'PLAY_ROUND' });
    if (round < ROUNDS_PER_MATCH - 1) {
      state = gameReducer(state, { type: 'NEXT_ROUND', payload: { fromRound: round } });
    }
  }

  const wins = state.roundResults.filter(result => result.winner === 'player').length;
  const losses = state.roundResults.filter(result => result.winner === 'bot').length;
  return {
    matchPoints: state.playerScore > state.botScore ? 1 : state.playerScore === state.botScore ? 0.5 : 0,
    healthGap: state.playerScore - state.botScore,
    roundGap: wins - losses,
    baseDamageGap: state.roundResults.reduce((sum, result) => sum + result.playerBaseDamage - result.botBaseDamage, 0),
  };
}

function runSimulation(): AbilityRow[] {
  const playableCards = ALL_CARDS.filter(card => card.rarity !== 'special');
  return ALL_ABILITIES.map((abilityType, abilityIndex) => {
    let matchPointDelta = 0;
    let finalHealthGapDelta = 0;
    let roundWinDelta = 0;
    let netBaseDamageDelta = 0;
    let changedOutcomes = 0;

    for (let scenario = 0; scenario < SCENARIOS_PER_ABILITY; scenario += 1) {
      const random = seededRandom((abilityIndex + 1) * 100_000 + scenario);
      const playerDeck = Array.from({ length: ROUNDS_PER_MATCH }, () => ({ ...pick(playableCards, random) }));
      const botDeck = Array.from({ length: ROUNDS_PER_MATCH }, () => ({ ...pick(playableCards, random) }));
      const withAbility = simulate(playerDeck, botDeck, abilityType);
      const control = simulate(playerDeck, botDeck);
      matchPointDelta += withAbility.matchPoints - control.matchPoints;
      finalHealthGapDelta += withAbility.healthGap - control.healthGap;
      roundWinDelta += withAbility.roundGap - control.roundGap;
      netBaseDamageDelta += withAbility.baseDamageGap - control.baseDamageGap;
      if (withAbility.matchPoints !== control.matchPoints) changedOutcomes += 1;
    }

    const detail = ABILITY_DETAILS[abilityType];
    return {
      abilityType,
      ability: detail.nameAr,
      category: detail.category,
      trigger: detail.triggerAr,
      scenarios: SCENARIOS_PER_ABILITY,
      matchPointDelta: Number((matchPointDelta / SCENARIOS_PER_ABILITY).toFixed(4)),
      finalHealthGapDelta: Number((finalHealthGapDelta / SCENARIOS_PER_ABILITY).toFixed(4)),
      roundWinDelta: Number((roundWinDelta / SCENARIOS_PER_ABILITY).toFixed(4)),
      netBaseDamageDelta: Number((netBaseDamageDelta / SCENARIOS_PER_ABILITY).toFixed(4)),
      outcomeChangedRate: Number((changedOutcomes / SCENARIOS_PER_ABILITY).toFixed(4)),
    };
  });
}

describe('player ability card balance simulation', () => {
  it('compares each player ability with the same character-card match without that ability', () => {
    const rows = runSimulation();
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify({
      generatedAt: new Date().toISOString(),
      roundsPerMatch: ROUNDS_PER_MATCH,
      scenariosPerAbility: SCENARIOS_PER_ABILITY,
      methodology: 'Each player ability is used once by a fixed legal-use policy against the same five-round character-card decks and opponent first-round pressure. Control matches receive the same decks and pressure without the measured player ability.',
      policyLimitations: 'The fixed policy does not optimize every conditional or combinational ability. Zero or low values can indicate an unmet condition and require targeted stress tests.',
      rows,
    }, null, 2));
    expect(rows).toHaveLength(ALL_ABILITIES.length);
    expect(rows.every(row => row.scenarios === SCENARIOS_PER_ABILITY)).toBe(true);
  });
});
