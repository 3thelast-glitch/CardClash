import React, { createContext, useContext, useReducer, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, GameState, RoundResult, Effect, AbilityType, Side, ElementAdvantage } from './types';
import { getRandomAbilities } from './abilities';
import type { DifficultyLevel } from './difficulty-types';
import { determineRoundWinner } from './cards-data-exports';
import { getBotCards } from './bot-ai';
import { applyOnSpawnPassive, applyPostBattlePassive } from './rage-engine';

// ─────────────────────────────────────────────────────────────────────────────────
const initialState: GameState = {
  playerDeck: [],
  botDeck: [],
  currentRound: 0,
  totalRounds: 0,
  playerScore: 0,
  botScore: 0,
  roundResults: [],
  difficulty: 2,
  abilitiesEnabled: true,
  activeEffects: [],
  playerAbilities: [],
  botAbilities: [],
  usedAbilities: [],
};

export type RarityKey = 'common' | 'rare' | 'epic' | 'legendary' | 'special';
export type RarityWeights = Record<RarityKey, number>;

export const DEFAULT_RARITY_WEIGHTS: RarityWeights = {
  common: 52, rare: 25, epic: 14, legendary: 7, special: 2,
};

const RARITY_WEIGHTS_KEY = '@game_rarity_weights';

async function loadRarityWeights(): Promise<RarityWeights> {
  try {
    const raw = await AsyncStorage.getItem(RARITY_WEIGHTS_KEY);
    if (raw) return { ...DEFAULT_RARITY_WEIGHTS, ...JSON.parse(raw) };
  } catch { }
  return { ...DEFAULT_RARITY_WEIGHTS };
}

async function saveRarityWeights(weights: RarityWeights): Promise<void> {
  try {
    await AsyncStorage.setItem(RARITY_WEIGHTS_KEY, JSON.stringify(weights));
  } catch { }
}

// ─────────────────────────────────────────────────────────────────────────────────
function sortDeckWithTurinFirst(deck: Card[]): Card[] {
  const turinIdx = deck.findIndex(c => c.name === 'تورين تورامباز' || c.name === 'Turin');
  if (turinIdx <= 0) return deck;
  const result = [...deck];
  const [turin] = result.splice(turinIdx, 1);
  result.unshift(turin);
  return result;
}

function hasTurinInDeck(deck: Card[]): boolean {
  return deck.some(c => c.name === 'تورين تورامباز' || c.name === 'Turin');
}

export function getTurinPenaltyRounds(totalRounds: number): number {
  return Math.max(1, Math.floor(totalRounds / 2));
}

function isTurinForcedLoss(currentRound: number, totalRounds: number, playerDeck: Card[]): boolean {
  if (!hasTurinInDeck(playerDeck)) return false;
  const penaltyRounds = getTurinPenaltyRounds(totalRounds);
  return currentRound < penaltyRounds;
}

function buildTurinPenaltyEffects(totalRounds: number): Effect[] {
  const penaltyCount = getTurinPenaltyRounds(totalRounds);
  const effects: Effect[] = [];
  for (let i = 0; i < penaltyCount; i++) {
    effects.push({
      id: `turinPenalty-player-${i + 1}`,
      kind: 'turinPenalty',
      sourceSide: 'bot',
      targetSide: 'player',
      createdAtRound: 0,
      expiresAtRound: i + 1,
      priority: 100,
      data: { appliesToRound: i + 1, penaltyRound: i + 1, totalPenalty: penaltyCount },
    });
  }
  return effects;
}

// ─────────────────────────────────────────────────────────────────────────────────
const EFFECT_PRIORITY = {
  forcedOutcome: 100,
  silenceAbilities: 90,
  statModifiers: 80,
  starAdvantage: 80,
  preventHpLoss: 70,
  hpDelta: 60,
  rewards: 50,
  cleanseEffects: 10,
  sacrifice: 10,
} as const;

const getRoundNumber = (state: GameState) => state.currentRound + 1;
const getOppositeSide = (side: Side): Side => (side === 'player' ? 'bot' : 'player');

const isEffectActive = (effect: Effect, roundNumber: number) => {
  if (effect.createdAtRound > roundNumber) return false;
  if (effect.expiresAtRound !== undefined && roundNumber > effect.expiresAtRound) return false;
  if (effect.charges !== undefined && effect.charges <= 0) return false;
  return true;
};

const isEffectExpired = (effect: Effect, roundNumber: number) => {
  if (effect.expiresAtRound !== undefined && roundNumber >= effect.expiresAtRound) return true;
  if (effect.charges !== undefined && effect.charges <= 0) return true;
  return false;
};

const makeEffectId = (abilityType: AbilityType, side: Side, roundNumber: number) =>
  `${abilityType}-${side}-${roundNumber}-${Math.random().toString(36).slice(2, 6)}`;

// ─────────────────────────────────────────────────────────────────────────────────
type GameAction =
  | { type: 'SET_PLAYER_DECK'; payload: Card[] }
  | { type: 'SET_BOT_DECK'; payload: Card[] }
  | { type: 'SET_TOTAL_ROUNDS'; payload: number }
  | { type: 'START_BATTLE'; payload?: { playerAbilities?: AbilityType[] } }
  | { type: 'PLAY_ROUND' }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET_GAME' }
  | { type: 'ADD_EFFECT'; payload: Effect }
  | { type: 'REMOVE_EFFECTS'; payload: { targetSide?: Side | 'all'; sourceSide?: Side | 'all' } }
  | { type: 'SET_DIFFICULTY'; payload: DifficultyLevel }
  | { type: 'SET_ABILITIES_ENABLED'; payload: boolean }
  | { type: 'USE_ABILITY'; payload: { abilityType: AbilityType; isPlayer: boolean; data?: Record<string, unknown> } }
  | { type: 'SYNC_DECKS'; payload: { playerDeck: Card[]; botDeck: Card[] } };

// ─────────────────────────────────────────────────────────────────────────────────
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    case 'SET_PLAYER_DECK':
      return { ...state, playerDeck: action.payload, totalRounds: action.payload.length };

    case 'SET_BOT_DECK':
      return { ...state, botDeck: action.payload };

    case 'SYNC_DECKS':
      return { ...state, playerDeck: action.payload.playerDeck, botDeck: action.payload.botDeck };

    case 'SET_TOTAL_ROUNDS':
      return { ...state, totalRounds: action.payload };

    case 'NEXT_ROUND':
      return { ...state, currentRound: Math.min(state.currentRound + 1, state.totalRounds) };

    case 'START_BATTLE': {
      const assignedAbilities = action.payload?.playerAbilities;
      const sortedPlayerDeck = sortDeckWithTurinFirst(state.playerDeck);
      const deckWithPassives = sortedPlayerDeck.map(applyOnSpawnPassive);
      const turinEffects = hasTurinInDeck(deckWithPassives)
        ? buildTurinPenaltyEffects(state.totalRounds)
        : [];
      return {
        ...state,
        playerDeck: deckWithPassives,
        currentRound: 0,
        playerScore: state.totalRounds,
        botScore:    state.totalRounds,
        roundResults: [],
        activeEffects: turinEffects,
        playerAbilities: state.abilitiesEnabled
          ? (assignedAbilities
              ? assignedAbilities.map(type => ({ type, used: false }))
              : getRandomAbilities(3).map(type => ({ type, used: false })))
          : [],
        botAbilities: state.abilitiesEnabled
          ? getRandomAbilities(3).map(type => ({ type, used: false }))
          : [],
        usedAbilities: [],
      };
    }

    case 'PLAY_ROUND': {
      if (state.currentRound >= state.totalRounds) return state;

      const playerCard = state.playerDeck[state.currentRound];
      const botCard    = state.botDeck[state.currentRound];
      if (!playerCard || !botCard) return state;

      const roundNumber  = getRoundNumber(state);
      const activeEffects = state.abilitiesEnabled
        ? state.activeEffects.filter(e => isEffectActive(e, roundNumber))
        : [];

      const playerEffects = activeEffects.filter(e => e.targetSide === 'player' || e.targetSide === 'all');
      const botEffects    = activeEffects.filter(e => e.targetSide === 'bot'    || e.targetSide === 'all');

      const forcedOutcomeEffect = activeEffects
        .filter(e => e.kind === 'forcedOutcome')
        .filter(e => { const d = e.data as { appliesToRound?: number } | undefined; return !d?.appliesToRound || d.appliesToRound === roundNumber; })
        .sort((a, b) => b.priority - a.priority || b.createdAtRound - a.createdAtRound)[0];

      const turinForcedLoss = isTurinForcedLoss(state.currentRound, state.totalRounds, state.playerDeck);

      let result: { winner: Side | 'draw'; playerDamage: number; botDamage: number; playerBaseDamage: number; botBaseDamage: number; playerElementAdvantage: ElementAdvantage; botElementAdvantage: ElementAdvantage };

      if (turinForcedLoss) {
        result = { winner: 'bot', playerDamage: 0, botDamage: 0, playerBaseDamage: 0, botBaseDamage: 0, playerElementAdvantage: 'neutral' as ElementAdvantage, botElementAdvantage: 'neutral' as ElementAdvantage };
      } else if (forcedOutcomeEffect) {
        result = { winner: forcedOutcomeEffect.sourceSide, playerDamage: 0, botDamage: 0, playerBaseDamage: 0, botBaseDamage: 0, playerElementAdvantage: 'neutral' as ElementAdvantage, botElementAdvantage: 'neutral' as ElementAdvantage };
      } else {
        result = determineRoundWinner(playerCard, botCard, playerEffects, botEffects, state.abilitiesEnabled);
      }

      const winner = result.winner;
      let updatedPlayerCard = playerCard;
      if (winner === 'player') updatedPlayerCard = applyPostBattlePassive(playerCard, 'win');
      else if (winner === 'bot') updatedPlayerCard = applyPostBattlePassive(playerCard, 'lose');
      else updatedPlayerCard = applyPostBattlePassive(playerCard, 'draw');

      const updatedPlayerDeck = updatedPlayerCard !== playerCard
        ? state.playerDeck.map((c, i) => i === state.currentRound ? updatedPlayerCard : c)
        : state.playerDeck;

      const roundResult: RoundResult = {
        round: state.currentRound + 1,
        playerCard: updatedPlayerCard, botCard,
        playerDamage: result.playerDamage, botDamage: result.botDamage,
        playerBaseDamage: result.playerBaseDamage, botBaseDamage: result.botBaseDamage,
        playerElementAdvantage: result.playerElementAdvantage,
        botElementAdvantage:    result.botElementAdvantage,
        winner: result.winner,
      };

      let playerHpDelta = 0;
      let botHpDelta    = 0;
      if (result.winner === 'player') botHpDelta    -= 1;
      else if (result.winner === 'bot') playerHpDelta -= 1;

      const effectsToRemove  = new Set<string>();
      const effectsToReplace = new Map<string, Effect>();
      const effectsToAdd: Effect[] = [];

      if (!turinForcedLoss) {
        const orderedEffects = [...activeEffects].sort((a, b) => a.priority - b.priority);
        orderedEffects.forEach(effect => {
          switch (effect.kind) {
            case 'turinPenalty': { effectsToRemove.add(effect.id); break; }
            case 'protection': {
              const d = effect.data as { appliesToRound?: number } | undefined;
              if (d?.appliesToRound !== undefined && d.appliesToRound !== roundNumber) break;
              if (effect.targetSide === 'player' && playerHpDelta < 0) { playerHpDelta = 0; effectsToRemove.add(effect.id); }
              if (effect.targetSide === 'bot'    && botHpDelta    < 0) { botHpDelta    = 0; effectsToRemove.add(effect.id); }
              break;
            }
            case 'doubleOrNothing': {
              const d = effect.data as { appliesToRound?: number } | undefined;
              if (!d?.appliesToRound || d.appliesToRound === roundNumber) {
                if (result.winner === effect.sourceSide) { if (effect.sourceSide === 'player') botHpDelta -= 1; if (effect.sourceSide === 'bot') playerHpDelta -= 1; }
                else if (result.winner === getOppositeSide(effect.sourceSide)) { if (effect.sourceSide === 'player') playerHpDelta -= 1; if (effect.sourceSide === 'bot') botHpDelta -= 1; }
                effectsToRemove.add(effect.id);
              }
              break;
            }
            case 'prediction': {
              const d = effect.data as { predictions?: Record<number, 'win' | 'loss'>; rewardHp?: number; penaltyHp?: number } | undefined;
              const prediction = d?.predictions?.[roundNumber];
              if (!prediction) break;
              const expectedWinner = prediction === 'win' ? effect.sourceSide : getOppositeSide(effect.sourceSide);
              if (result.winner === expectedWinner) { const reward = d?.rewardHp ?? 1; if (effect.sourceSide === 'player') botHpDelta -= reward; if (effect.sourceSide === 'bot') playerHpDelta -= reward; }
              else if (result.winner && result.winner !== 'draw') { const penalty = d?.penaltyHp ?? 1; if (effect.sourceSide === 'player') playerHpDelta -= penalty; if (effect.sourceSide === 'bot') botHpDelta -= penalty; }
              const nextPredictions = { ...(d?.predictions ?? {}) }; delete nextPredictions[roundNumber];
              const nextCharges = Math.max(0, (effect.charges ?? 0) - 1);
              if (nextCharges <= 0 || Object.keys(nextPredictions).length === 0) effectsToRemove.add(effect.id);
              else effectsToReplace.set(effect.id, { ...effect, charges: nextCharges, data: { ...d, predictions: nextPredictions } });
              break;
            }
            case 'halvePoints': {
              if (effect.targetSide === 'bot' && botHpDelta < 0) botHpDelta = Math.ceil(botHpDelta / 2);
              else if (effect.targetSide === 'player' && playerHpDelta < 0) playerHpDelta = Math.ceil(playerHpDelta / 2);
              effectsToRemove.add(effect.id); break;
            }
            case 'starAdvantage': {
              const d = effect.data as { appliesToRound?: number } | undefined;
              if (d?.appliesToRound !== undefined && d.appliesToRound !== roundNumber) break;
              if (effect.targetSide === 'player') { playerHpDelta = 0; botHpDelta = Math.min(botHpDelta, -1); }
              else if (effect.targetSide === 'bot') { botHpDelta = 0; playerHpDelta = Math.min(playerHpDelta, -1); }
              effectsToRemove.add(effect.id); break;
            }
            case 'fortify': {
              if (result.winner === effect.sourceSide) effectsToAdd.push({ id: makeEffectId('Reinforcement', effect.sourceSide, roundNumber), kind: 'statModifier', sourceSide: effect.sourceSide, targetSide: effect.sourceSide, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'defense', amount: 1 } });
              effectsToRemove.add(effect.id); break;
            }
            case 'greedBuff': {
              if (result.winner === effect.sourceSide) effectsToAdd.push({ id: makeEffectId('Greed', effect.sourceSide, roundNumber), kind: 'statModifier', sourceSide: effect.sourceSide, targetSide: effect.sourceSide, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'attack', amount: 1 } });
              effectsToRemove.add(effect.id); break;
            }
            case 'lifesteal': {
              if (result.winner === effect.sourceSide) { if (effect.sourceSide === 'player') botHpDelta -= 1; if (effect.sourceSide === 'bot') playerHpDelta -= 1; }
              effectsToRemove.add(effect.id); break;
            }
            case 'revengeBuff': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              if (result.winner === opponentSide) effectsToAdd.push({ id: makeEffectId('Revenge', effect.sourceSide, roundNumber), kind: 'statModifier', sourceSide: effect.sourceSide, targetSide: effect.sourceSide, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'attack', amount: 1 } });
              effectsToRemove.add(effect.id); break;
            }
            case 'suicidePact': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              if (result.winner === opponentSide) { if (opponentSide === 'player') playerHpDelta = 0; if (opponentSide === 'bot') botHpDelta = 0; }
              effectsToRemove.add(effect.id); break;
            }
            case 'compensationBuff': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              if (result.winner === opponentSide) effectsToAdd.push({ id: makeEffectId('Compensation', effect.sourceSide, roundNumber), kind: 'statModifier', sourceSide: effect.sourceSide, targetSide: effect.sourceSide, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'defense', amount: 1 } });
              effectsToRemove.add(effect.id); break;
            }
            case 'weakeningDebuff': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              if (result.winner === opponentSide) effectsToAdd.push({ id: makeEffectId('Weakening', effect.sourceSide, roundNumber), kind: 'statModifier', sourceSide: effect.sourceSide, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'attack', amount: -1 } });
              effectsToRemove.add(effect.id); break;
            }
            case 'explosionDebuff': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              if (result.winner === opponentSide) effectsToAdd.push({ id: makeEffectId('Explosion', effect.sourceSide, roundNumber), kind: 'statModifier', sourceSide: effect.sourceSide, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'defense', amount: -1 } });
              effectsToRemove.add(effect.id); break;
            }
            case 'consecutiveLoss': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              const d = effect.data as { lossCount?: number } | undefined;
              const lossCount = d?.lossCount ?? 0;
              if (result.winner === opponentSide) {
                const newCount = lossCount + 1;
                if (newCount >= 2) {
                  effectsToAdd.push({ id: makeEffectId('ConsecutiveLossBuff', effect.sourceSide, roundNumber), kind: 'statModifier', sourceSide: effect.sourceSide, targetSide: effect.sourceSide, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'attack', amount: 1 } });
                  effectsToAdd.push({ id: makeEffectId('ConsecutiveLossBuff', effect.sourceSide, roundNumber), kind: 'statModifier', sourceSide: effect.sourceSide, targetSide: effect.sourceSide, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'defense', amount: 1 } });
                  effectsToRemove.add(effect.id);
                } else effectsToReplace.set(effect.id, { ...effect, data: { lossCount: newCount } });
              } else { if (lossCount > 0) effectsToReplace.set(effect.id, { ...effect, data: { lossCount: 0 } }); }
              break;
            }
            case 'sacrifice': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              if (result.winner === opponentSide) {
                const removable = activeEffects.filter(a => a.id !== effect.id).filter(a => a.sourceSide === opponentSide || a.targetSide === opponentSide).sort((a, b) => b.priority - a.priority || a.createdAtRound - b.createdAtRound);
                if (removable.length > 0) effectsToRemove.add(removable[0].id);
              }
              effectsToRemove.add(effect.id); break;
            }
            case 'shieldGuard': {
              const d = effect.data as { appliesToRound?: number } | undefined;
              if (d?.appliesToRound !== undefined && d.appliesToRound !== roundNumber) break;
              if (effect.targetSide === 'player' && playerHpDelta < 0) { playerHpDelta = 0; effectsToRemove.add(effect.id); }
              if (effect.targetSide === 'bot'    && botHpDelta    < 0) { botHpDelta    = 0; effectsToRemove.add(effect.id); }
              break;
            }
            case 'trap': {
              const d = effect.data as { appliesToRound?: number } | undefined;
              if (!d?.appliesToRound || d.appliesToRound !== roundNumber) break;
              const opponentSide = getOppositeSide(effect.sourceSide);
              if (opponentSide === 'player') { playerHpDelta = Math.min(playerHpDelta, -1); botHpDelta = 0; }
              if (opponentSide === 'bot')    { botHpDelta = Math.min(botHpDelta, -1); playerHpDelta = 0; }
              effectsToRemove.add(effect.id); break;
            }
            case 'convertDebuffs': {
              const sideName = effect.sourceSide;
              activeEffects.filter(e => e.kind === 'statModifier' && e.targetSide === sideName && (e.data as any)?.amount < 0).forEach(ne => { effectsToRemove.add(ne.id); effectsToAdd.push({ ...ne, id: makeEffectId('ConvertDebuffsToBuffs', sideName, roundNumber), sourceSide: sideName, data: { ...(ne.data as object), amount: Math.abs((ne.data as any).amount) } }); });
              effectsToRemove.add(effect.id); break;
            }
            case 'doubleBuffs': {
              const sideName = effect.sourceSide;
              activeEffects.filter(e => e.kind === 'statModifier' && e.targetSide === sideName && (e.data as any)?.amount > 0 && e.id !== effect.id).forEach(pe => { effectsToReplace.set(pe.id, { ...pe, data: { ...(pe.data as object), amount: (pe.data as any).amount * 2 } }); });
              effectsToRemove.add(effect.id); break;
            }
            case 'conversion': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              activeEffects.filter(e => e.kind === 'statModifier' && e.targetSide === opponentSide && (e.data as any)?.amount > 0).forEach(ob => { effectsToReplace.set(ob.id, { ...ob, data: { ...(ob.data as object), amount: -(Math.abs((ob.data as any).amount)) } }); });
              effectsToRemove.add(effect.id); break;
            }
            case 'takeIt': {
              const sideName = effect.sourceSide;
              const opponentSide = getOppositeSide(sideName);
              activeEffects.filter(e => e.kind === 'statModifier' && e.targetSide === sideName && (e.data as any)?.amount < 0).forEach(d => { effectsToRemove.add(d.id); effectsToAdd.push({ ...d, id: makeEffectId('TakeIt', opponentSide, roundNumber), targetSide: opponentSide, sourceSide: sideName }); });
              effectsToRemove.add(effect.id); break;
            }
            case 'deprivation': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              const d = effect.data as { chosenBuffId?: string } | undefined;
              const targetBuff = d?.chosenBuffId
                ? activeEffects.find(e => e.id === d.chosenBuffId && e.targetSide === opponentSide && (e.data as any)?.amount > 0)
                : activeEffects.filter(e => e.kind === 'statModifier' && e.targetSide === opponentSide && (e.data as any)?.amount > 0).sort((a, b) => (b.data as any).amount - (a.data as any).amount)[0];
              if (targetBuff) { effectsToRemove.add(targetBuff.id); effectsToAdd.push({ ...targetBuff, id: makeEffectId('Deprivation', effect.sourceSide, roundNumber), targetSide: effect.sourceSide, sourceSide: effect.sourceSide }); }
              effectsToRemove.add(effect.id); break;
            }
            case 'pool': {
              const d = effect.data as { appliesToRound?: number } | undefined;
              if (!d?.appliesToRound || d.appliesToRound !== roundNumber) break;
              const opponentSide = getOppositeSide(effect.sourceSide);
              if (opponentSide === 'player') playerHpDelta = 0;
              if (opponentSide === 'bot')    botHpDelta    = 0;
              effectsToRemove.add(effect.id); break;
            }
          }
        });
      } else {
        state.activeEffects
          .filter(e => e.kind === 'turinPenalty' && (e.data as any)?.appliesToRound === roundNumber)
          .forEach(e => effectsToRemove.add(e.id));
      }

      let nextEffects = state.activeEffects
        .filter(e => !effectsToRemove.has(e.id))
        .map(e => effectsToReplace.get(e.id) ?? e);
      if (effectsToAdd.length > 0) nextEffects = [...nextEffects, ...effectsToAdd];
      if (forcedOutcomeEffect) nextEffects = nextEffects.filter(e => e.id !== forcedOutcomeEffect.id);
      nextEffects = nextEffects.filter(e => !isEffectExpired(e, roundNumber));
      if (!state.abilitiesEnabled) nextEffects = [];

      return {
        ...state,
        playerDeck: updatedPlayerDeck,
        playerScore: Math.max(0, state.playerScore + playerHpDelta),
        botScore:    Math.max(0, state.botScore    + botHpDelta),
        roundResults: [...state.roundResults, roundResult],
        activeEffects: nextEffects,
        usedAbilities: [],
      };
    }

    case 'USE_ABILITY': {
      const { abilityType, isPlayer, data } = action.payload;
      if (!state.abilitiesEnabled) return state;

      const side: Side         = isPlayer ? 'player' : 'bot';
      const opponentSide: Side = getOppositeSide(side);
      const roundNumber        = getRoundNumber(state);

      const isSealed = state.activeEffects.some(e => e.kind === 'silenceAbilities' && isEffectActive(e, roundNumber) && (e.targetSide === side || e.targetSide === 'all'));
      if (isSealed) return state;

      const abilityStateList = isPlayer ? state.playerAbilities : state.botAbilities;
      const abilityIndex = abilityStateList.findIndex(a => a.type === abilityType && !a.used);
      if (abilityIndex === -1) return state;

      let nextState: GameState = state;
      let nextEffects = state.activeEffects;

      switch (abilityType) {
        case 'LogicalEncounter': { const rawPredictions = (data?.predictions ?? {}) as Record<string, 'win' | 'loss'>; const predictions: Record<number, 'win' | 'loss'> = {}; const allowedRounds = new Set([roundNumber + 1, roundNumber + 2].filter(r => r <= state.totalRounds)); Object.entries(rawPredictions).forEach(([key, value]) => { const parsed = Number(key); if (!Number.isNaN(parsed) && allowedRounds.has(parsed) && (value === 'win' || value === 'loss')) predictions[parsed] = value; }); if (Object.keys(predictions).length === 0) return state; const rounds = Object.keys(predictions).map(Number); nextEffects = [...nextEffects, { id: makeEffectId('LogicalEncounter', side, roundNumber), kind: 'prediction', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: Math.max(...rounds), charges: rounds.length, priority: EFFECT_PRIORITY.rewards, data: { predictions, rewardHp: 1, penaltyHp: 1 } }]; break; }
        case 'Recall': { const recallIdx = data?.roundIndex !== undefined ? Number(data.roundIndex) : state.roundResults.length - 1; const recallResult = state.roundResults[recallIdx]; if (recallResult) { if (side === 'player') { const d = [...state.playerDeck]; d[state.currentRound] = { ...recallResult.playerCard, ability: undefined }; nextState = { ...nextState, playerDeck: d }; } else { const d = [...state.botDeck]; d[state.currentRound] = { ...recallResult.botCard, ability: undefined }; nextState = { ...nextState, botDeck: d }; } } break; }
        case 'Protection': { nextEffects = [...nextEffects, { id: makeEffectId('Protection', side, roundNumber), kind: 'protection', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.preventHpLoss, data: { appliesToRound: roundNumber } }]; break; }
        case 'Arise': { const ariseIdx = data?.roundIndex !== undefined ? Number(data.roundIndex) : state.roundResults.length - 1; const ariseResult = state.roundResults[ariseIdx]; if (ariseResult) { const oppCard = side === 'player' ? ariseResult.botCard : ariseResult.playerCard; if (oppCard) { if (side === 'player') { const d = [...state.playerDeck]; d[state.currentRound] = { ...oppCard, ability: undefined }; nextState = { ...nextState, playerDeck: d }; } else { const d = [...state.botDeck]; d[state.currentRound] = { ...oppCard, ability: undefined }; nextState = { ...nextState, botDeck: d }; } } } break; }
        case 'Reinforcement': { nextEffects = [...nextEffects, { id: makeEffectId('Reinforcement', side, roundNumber), kind: 'fortify', sourceSide: side, targetSide: side, createdAtRound: roundNumber, priority: EFFECT_PRIORITY.rewards, data: {} }]; break; }
        case 'Wipe': { nextEffects = nextEffects.filter(e => e.targetSide !== side && e.sourceSide !== side); break; }
        case 'Purge': { nextEffects = []; break; }
        case 'HalvePoints': { nextEffects = [...nextEffects, { id: makeEffectId('HalvePoints', side, roundNumber), kind: 'halvePoints', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.statModifiers, data: { multiplier: 0.5 } }]; break; }
        case 'Seal': { nextEffects = [...nextEffects, { id: makeEffectId('Seal', side, roundNumber), kind: 'silenceAbilities', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber + 4, priority: EFFECT_PRIORITY.silenceAbilities, data: { rounds: 5 } }]; break; }
        case 'DoubleOrNothing': { nextEffects = [...nextEffects, { id: makeEffectId('DoubleOrNothing', side, roundNumber), kind: 'doubleOrNothing', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.hpDelta, data: { appliesToRound: roundNumber } }]; break; }
        case 'StarSuperiority': { nextEffects = [...nextEffects, { id: makeEffectId('StarSuperiority', side, roundNumber), kind: 'starAdvantage', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.starAdvantage, data: { appliesToRound: roundNumber } }]; break; }
        case 'Reduction': { nextEffects = [...nextEffects, { id: makeEffectId('Reduction', side, roundNumber), kind: 'statModifier', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'attack', amount: -2 } }]; break; }
        case 'Sacrifice': { nextEffects = [...nextEffects, { id: makeEffectId('Sacrifice', side, roundNumber), kind: 'sacrifice', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.sacrifice, data: {} }]; break; }
        case 'Popularity': { const selectedRound = Number(data?.round); if (!Number.isInteger(selectedRound) || selectedRound <= roundNumber || selectedRound > state.totalRounds) return state; nextEffects = [...nextEffects, { id: makeEffectId('Popularity', side, roundNumber), kind: 'forcedOutcome', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: selectedRound, charges: 1, priority: EFFECT_PRIORITY.forcedOutcome, data: { appliesToRound: selectedRound } }]; break; }
        case 'Eclipse': { nextEffects = [...nextEffects, { id: makeEffectId('Eclipse', side, roundNumber), kind: 'statModifier', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'attack', amount: -9999 } }]; break; }
        case 'CancelAbility': { nextEffects = nextEffects.filter(e => e.sourceSide !== opponentSide || (e.expiresAtRound !== undefined && e.expiresAtRound < roundNumber)); nextEffects = [...nextEffects, { id: makeEffectId('CancelAbility', side, roundNumber), kind: 'silenceAbilities', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.silenceAbilities, data: {} }]; break; }
        case 'Revive': { const reviveIdx = data?.roundIndex !== undefined ? Number(data.roundIndex) : state.roundResults.length - 1; const reviveResult = state.roundResults[reviveIdx]; if (reviveResult) { const pastCard = side === 'player' ? reviveResult.playerCard : reviveResult.botCard; const revivedCard: Card = { ...pastCard, attack: Math.ceil(pastCard.attack / 2), defense: Math.ceil(pastCard.defense / 2) }; if (side === 'player') { const d = [...state.playerDeck]; d[state.currentRound] = revivedCard; nextState = { ...nextState, playerDeck: d }; } else { const d = [...state.botDeck]; d[state.currentRound] = revivedCard; nextState = { ...nextState, botDeck: d }; } } break; }
        case 'ConsecutiveLossBuff': { nextEffects = [...nextEffects, { id: makeEffectId('ConsecutiveLossBuff', side, roundNumber), kind: 'consecutiveLoss', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: state.totalRounds, priority: EFFECT_PRIORITY.rewards, data: { lossCount: 0 } }]; break; }
        case 'Lifesteal': { nextEffects = [...nextEffects, { id: makeEffectId('Lifesteal', side, roundNumber), kind: 'lifesteal', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.rewards, data: {} }]; break; }
        case 'Revenge': { nextEffects = [...nextEffects, { id: makeEffectId('Revenge', side, roundNumber), kind: 'revengeBuff', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.rewards, data: {} }]; break; }
        case 'Suicide': { nextEffects = [...nextEffects, { id: makeEffectId('Suicide', side, roundNumber), kind: 'suicidePact', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.hpDelta, data: {} }]; break; }
        case 'Disaster': { const chosenRoundIndex = Number(data?.roundIndex ?? -1); const chosenResult = state.roundResults[chosenRoundIndex]; if (chosenResult) { const replacementCard = side === 'player' ? chosenResult.botCard : chosenResult.playerCard; if (side === 'player') { const d = [...state.botDeck]; d[state.currentRound] = { ...replacementCard, ability: undefined }; nextState = { ...nextState, botDeck: d }; } else { const d = [...state.playerDeck]; d[state.currentRound] = { ...replacementCard, ability: undefined }; nextState = { ...nextState, playerDeck: d }; } } break; }
        case 'Compensation': { nextEffects = [...nextEffects, { id: makeEffectId('Compensation', side, roundNumber), kind: 'compensationBuff', sourceSide: side, targetSide: side, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.rewards, data: {} }]; break; }
        case 'Weakening': { nextEffects = [...nextEffects, { id: makeEffectId('Weakening', side, roundNumber), kind: 'weakeningDebuff', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.rewards, data: {} }]; break; }
        default: break;
      }

      const updatedAbilities = (isPlayer ? state.playerAbilities : state.botAbilities).map((a, i) =>
        i === abilityIndex ? { ...a, used: true } : a
      );

      return {
        ...nextState,
        activeEffects: nextEffects,
        ...(isPlayer ? { playerAbilities: updatedAbilities } : { botAbilities: updatedAbilities }),
        usedAbilities: [...state.usedAbilities, abilityType],
      };
    }

    case 'ADD_EFFECT':
      return { ...state, activeEffects: [...state.activeEffects, action.payload] };

    case 'REMOVE_EFFECTS': {
      const { targetSide, sourceSide } = action.payload;
      return {
        ...state,
        activeEffects: state.activeEffects.filter(e => {
          if (targetSide && targetSide !== 'all' && e.targetSide === targetSide) return false;
          if (targetSide === 'all') return false;
          if (sourceSide && sourceSide !== 'all' && e.sourceSide === sourceSide) return false;
          if (sourceSide === 'all') return false;
          return true;
        }),
      };
    }

    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.payload };

    case 'SET_ABILITIES_ENABLED':
      return { ...state, abilitiesEnabled: action.payload };

    case 'RESET_GAME':
      return { ...initialState, difficulty: state.difficulty, abilitiesEnabled: state.abilitiesEnabled };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
type GameContextType = {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  rarityWeights: RarityWeights;
  updateRarityWeights: (weights: RarityWeights) => Promise<void>;
  setRarityWeights: (weights: RarityWeights) => void;
  // ── helpers — جميعها مكشوفة لجميع الشاشات ──
  setPlayerDeck: (deck: Card[]) => void;
  setTotalRounds: (rounds: number) => void;
  startBattle: (deck: Card[], abilities?: AbilityType[]) => void;
  syncDecks: (playerDeck: Card[], botDeck: Card[]) => void;
  setDifficulty: (level: DifficultyLevel) => void;
  setAbilitiesEnabled: (enabled: boolean) => void;
  playRound: () => void;
  nextRound: () => void;
  resetGame: () => void;
  useAbility: (abilityType: AbilityType, data?: Record<string, unknown>, isPlayer?: boolean) => void;
  // ── derived state ──
  isGameOver: boolean;
  currentPlayerCard: Card | null;
  currentBotCard: Card | null;
  lastRoundResult: RoundResult | null;
  expectedRoundResult: RoundResult | null;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [rarityWeights, setRarityWeights] = useState<RarityWeights>(DEFAULT_RARITY_WEIGHTS);

  useEffect(() => {
    loadRarityWeights().then(setRarityWeights);
  }, []);

  const updateRarityWeights = async (weights: RarityWeights) => {
    setRarityWeights(weights);
    await saveRarityWeights(weights);
  };

  const setTotalRounds = useCallback((rounds: number) => {
    dispatch({ type: 'SET_TOTAL_ROUNDS', payload: rounds });
  }, []);

  const setPlayerDeck = useCallback((deck: Card[]) => {
    dispatch({ type: 'SET_PLAYER_DECK', payload: deck });
  }, []);

  const startBattle = useCallback((deck: Card[], abilities?: AbilityType[]) => {
    dispatch({ type: 'SET_PLAYER_DECK', payload: deck });
    dispatch({ type: 'START_BATTLE', payload: { playerAbilities: abilities } });
  }, []);

  const syncDecks = useCallback((playerDeck: Card[], botDeck: Card[]) => {
    dispatch({ type: 'SYNC_DECKS', payload: { playerDeck, botDeck } });
  }, []);

  const setDifficulty = useCallback((level: DifficultyLevel) => {
    dispatch({ type: 'SET_DIFFICULTY', payload: level });
  }, []);

  const setAbilitiesEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_ABILITIES_ENABLED', payload: enabled });
  }, []);

  const playRound = useCallback(() => {
    dispatch({ type: 'PLAY_ROUND' });
  }, []);

  const nextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const useAbility = useCallback((abilityType: AbilityType, data?: Record<string, unknown>, isPlayer: boolean = true) => {
    dispatch({ type: 'USE_ABILITY', payload: { abilityType, isPlayer, data } });
  }, []);

  // ── derived state ──
  const isGameOver = useMemo(() =>
    state.totalRounds > 0 && state.roundResults.length >= state.totalRounds,
    [state.totalRounds, state.roundResults.length]
  );

  const currentPlayerCard = useMemo(() =>
    state.playerDeck[state.currentRound] ?? null,
    [state.playerDeck, state.currentRound]
  );

  const currentBotCard = useMemo(() =>
    state.botDeck[state.currentRound] ?? null,
    [state.botDeck, state.currentRound]
  );

  const lastRoundResult = useMemo(() =>
    state.roundResults.length > 0 ? state.roundResults[state.roundResults.length - 1] : null,
    [state.roundResults]
  );

  const expectedRoundResult = useMemo((): RoundResult | null => {
    const playerCard = state.playerDeck[state.currentRound];
    const botCard = state.botDeck[state.currentRound];
    if (!playerCard || !botCard) return null;
    const roundNumber = state.currentRound + 1;
    const activeEffects = state.activeEffects.filter(e => isEffectActive(e, roundNumber));
    const playerEffects = activeEffects.filter(e => e.targetSide === 'player' || e.targetSide === 'all');
    const botEffects = activeEffects.filter(e => e.targetSide === 'bot' || e.targetSide === 'all');
    const turinForcedLoss = isTurinForcedLoss(state.currentRound, state.totalRounds, state.playerDeck);
    let winner: Side | 'draw';
    if (turinForcedLoss) {
      winner = 'bot';
    } else {
      const r = determineRoundWinner(playerCard, botCard, playerEffects, botEffects, state.abilitiesEnabled);
      winner = r.winner;
    }
    return {
      round: roundNumber,
      playerCard,
      botCard,
      playerDamage: 0,
      botDamage: 0,
      playerBaseDamage: 0,
      botBaseDamage: 0,
      playerElementAdvantage: 'neutral',
      botElementAdvantage: 'neutral',
      winner,
    };
  }, [state.playerDeck, state.botDeck, state.currentRound, state.activeEffects, state.abilitiesEnabled, state.totalRounds]);

  return (
    <GameContext.Provider value={{
      state, dispatch, rarityWeights, updateRarityWeights,
      setRarityWeights: (w: RarityWeights) => { setRarityWeights(w); saveRarityWeights(w); },
      setPlayerDeck, setTotalRounds, startBattle, syncDecks,
      setDifficulty, setAbilitiesEnabled,
      playRound, nextRound, resetGame, useAbility,
      isGameOver, currentPlayerCard, currentBotCard,
      lastRoundResult, expectedRoundResult,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
