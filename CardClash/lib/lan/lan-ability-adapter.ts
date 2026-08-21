import { getRandomAbilitiesFromPool } from '../game/abilities';
import { gameReducer } from '../game/game-context';
import type { AbilityState, AbilityType, Card, Effect, GameState, RoundResult } from '../game/types';
import { buildAllMightAlignmentEffects, buildAlphonseGoodAlignmentEffects, buildKaidoFactionEffects } from '../game/professional-card-abilities';
import type { LanPlayerRole } from './lan-match-engine';

/** القدرات التي لا تحتاج نافذة اختيار إضافية، فتظل متزامنة وواضحة في Wi‑Fi. */
export const LAN_ABILITY_POOL: AbilityType[] = [
  'Protection', 'Reinforcement', 'Wipe', 'Purge', 'HalvePoints', 'Seal',
  'DoubleOrNothing', 'StarSuperiority', 'Reduction', 'Sacrifice', 'Eclipse',
  'CancelAbility', 'ConsecutiveLossBuff', 'Lifesteal', 'Revenge', 'Suicide',
  'Compensation', 'Weakening', 'Misdirection', 'StealAbility', 'Rescue', 'Trap',
  'ConvertDebuffsToBuffs', 'DoubleNextCards', 'Deprivation', 'Greed',
  'DoubleYourBuffs', 'Penetration', 'Pool', 'Conversion', 'Shield', 'TakeIt',
  'Skip', 'Explosion', 'DoublePoints', 'ElementalMastery', 'AbsoluteDominance',
  'PhantomBlade',
];

export type LanAbilitySnapshot = {
  hostDeck: Card[];
  guestDeck: Card[];
  hostScore: number;
  guestScore: number;
  hostAbilities: AbilityState[];
  guestAbilities: AbilityState[];
  activeEffects: Effect[];
  roundResults: RoundResult[];
};

export type LanAbilityMatchInput = LanAbilitySnapshot & {
  currentRound: number;
  totalRounds: number;
  abilitiesEnabled: boolean;
};

export function createLanAbilities(enabled: boolean): AbilityState[] {
  return enabled ? getRandomAbilitiesFromPool(LAN_ABILITY_POOL, 3).map(type => ({ type, used: false })) : [];
}

function toGameState(match: LanAbilityMatchInput): GameState {
  const generatedCharacterEffects = [
    ...buildAllMightAlignmentEffects(match.hostDeck, 'player', match.totalRounds),
    ...buildAllMightAlignmentEffects(match.guestDeck, 'bot', match.totalRounds),
    ...buildKaidoFactionEffects(match.hostDeck, 'player', match.totalRounds),
    ...buildKaidoFactionEffects(match.guestDeck, 'bot', match.totalRounds),
    ...buildAlphonseGoodAlignmentEffects(match.hostDeck, 'player', match.totalRounds),
    ...buildAlphonseGoodAlignmentEffects(match.guestDeck, 'bot', match.totalRounds),
  ];
  const activeEffects = [
    ...match.activeEffects,
    ...generatedCharacterEffects.filter(generated => !match.activeEffects.some(effect => effect.id === generated.id)),
  ];
  return {
    matchMode: 'lan',
    playerDeck: match.hostDeck,
    botDeck: match.guestDeck,
    currentRound: match.currentRound,
    totalRounds: match.totalRounds,
    playerScore: match.hostScore,
    botScore: match.guestScore,
    playerMaxHealth: Math.max(match.totalRounds, match.hostScore),
    botMaxHealth: Math.max(match.totalRounds, match.guestScore),
    roundResults: match.roundResults,
    difficulty: 2,
    abilitiesEnabled: match.abilitiesEnabled,
    activeEffects,
    playerAbilities: match.hostAbilities,
    botAbilities: match.guestAbilities,
    usedAbilities: [],
  };
}

function toSnapshot(state: GameState): LanAbilitySnapshot {
  return {
    hostDeck: state.playerDeck,
    guestDeck: state.botDeck,
    hostScore: state.playerScore,
    guestScore: state.botScore,
    hostAbilities: state.playerAbilities,
    guestAbilities: state.botAbilities,
    activeEffects: state.activeEffects,
    roundResults: state.roundResults.map(({ playerInfo: _playerInfo, botInfo: _botInfo, ...roundResult }) => roundResult),
  };
}

export function applyLanAbility(match: LanAbilityMatchInput, role: LanPlayerRole, abilityType: AbilityType): LanAbilitySnapshot {
  const next = gameReducer(toGameState(match), { type: 'USE_ABILITY', payload: { abilityType, isPlayer: role === 'host' } });
  return toSnapshot(next);
}

export function resolveLanAbilityRound(match: LanAbilityMatchInput): { snapshot: LanAbilitySnapshot; roundResult: RoundResult | null } {
  const next = gameReducer(toGameState(match), { type: 'PLAY_ROUND' });
  return { snapshot: toSnapshot(next), roundResult: next.roundResults.at(-1) ?? null };
}
