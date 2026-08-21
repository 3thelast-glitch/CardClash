import React, { createContext, useContext, useReducer, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, GameState, RoundResult, Effect, AbilityData, AbilityType, Side, FactionAdvantage, Race, MatchMode } from './types';
import { getRandomAbilities } from './abilities';
import type { DifficultyLevel } from './difficulty-types';
import { determineRoundWinner } from './cards-data-exports';
import { getBotCards } from './bot-ai';
import {
  applyOnSpawnPassive,
  applyPostBattlePassive,
  getOnSpawnMatchHealthBonus,
  getPostBattleMatchHealthBonus,
} from './rage-engine';
import { useAbilityActivationOverlay } from '../../components/game/AbilityActivationOverlay';
import { ABILITY_DETAILS } from './ability-details';
import {
  buildAlphonseGoodAlignmentEffects,
  applyYataMirrorDefense,
  buildAllMightAlignmentEffects,
  buildBulmaClassScan,
  buildKaidoFactionEffects,
  getPostLossProfessionalBonus,
  isObitoCard,
  shouldArtoriasSwapNextRound,
} from './professional-card-abilities';
import { getCharacterAbility } from './character-abilities';

// ─────────────────────────────────────────────────────────────────────────────────
const initialState: GameState = {
  matchMode: 'solo',
  playerDeck: [],
  botDeck: [],
  currentRound: 0,
  totalRounds: 0,
  playerScore: 0,
  botScore: 0,
  playerMaxHealth: 0,
  botMaxHealth: 0,
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
function isTurinCard(card: Card): boolean {
  return card.id === 'Turin_Turambar' || card.name === 'Turin' || card.nameAr === 'تورين';
}

function sortDeckWithTurinFirst(deck: Card[]): Card[] {
  const turinIdx = deck.findIndex(isTurinCard);
  if (turinIdx <= 0) return deck;
  const result = [...deck];
  const [turin] = result.splice(turinIdx, 1);
  result.unshift(turin);
  return result;
}

function hasTurinInDeck(deck: Card[]): boolean {
  return deck.some(isTurinCard);
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
  | { type: 'SET_MATCH_MODE'; payload: MatchMode }
  | { type: 'SET_PLAYER_DECK'; payload: Card[] }
  | { type: 'SET_BOT_DECK'; payload: Card[] }
  | { type: 'SET_TOTAL_ROUNDS'; payload: number }
  | { type: 'START_BATTLE'; payload?: { playerDeck?: Card[]; playerAbilities?: AbilityType[]; botDeck?: Card[]; botAbilities?: AbilityType[] } }
  | { type: 'PLAY_ROUND' }
  | { type: 'NEXT_ROUND'; payload?: { fromRound: number } }
  | { type: 'RESET_GAME' }
  | { type: 'ADD_EFFECT'; payload: Effect }
  | { type: 'REMOVE_EFFECTS'; payload: { targetSide?: Side | 'all'; sourceSide?: Side | 'all' } }
  | { type: 'SET_DIFFICULTY'; payload: DifficultyLevel }
  | { type: 'SET_ABILITIES_ENABLED'; payload: boolean }
  | { type: 'USE_ABILITY'; payload: { abilityType: AbilityType; isPlayer: boolean; data?: Record<string, unknown> } }
  | { type: 'GRANT_DEVELOPER_NOTHING_HAPPENED' }
  | { type: 'SYNC_DECKS'; payload: { playerDeck: Card[]; botDeck: Card[] } };

// ─────────────────────────────────────────────────────────────────────────────────
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    case 'SET_MATCH_MODE':
      return { ...state, matchMode: action.payload };

    case 'SET_PLAYER_DECK':
      return { ...state, playerDeck: action.payload, totalRounds: action.payload.length };

    case 'SET_BOT_DECK':
      return { ...state, botDeck: action.payload };

    case 'SYNC_DECKS':
      return { ...state, playerDeck: action.payload.playerDeck, botDeck: action.payload.botDeck };

    case 'SET_TOTAL_ROUNDS':
      return { ...state, totalRounds: action.payload };

    case 'GRANT_DEVELOPER_NOTHING_HAPPENED': {
      if (state.playerAbilities.some(ability => ability.type === 'NothingHappened')) return state;
      const replacementIndex = state.playerAbilities.findIndex(ability => !ability.used);
      if (replacementIndex < 0) return state;
      const playerAbilities = [...state.playerAbilities];
      playerAbilities[replacementIndex] = { type: 'NothingHappened', used: false };
      return { ...state, playerAbilities };
    }

    case 'NEXT_ROUND': {
      // إذا وصل ضغط/مؤقت متأخر لجولة سابقة فلا نسمح له بتحريك الجولة الحالية مرة أخرى.
      if (action.payload && action.payload.fromRound !== state.currentRound) return state;
      // لا نتجاوز فهرس آخر كرت؛ نهاية المباراة تُعالَج في شاشة المعركة من نتيجة الجولة الأخيرة.
      return { ...state, currentRound: Math.min(state.currentRound + 1, Math.max(0, state.totalRounds - 1)) };
    }

    case 'START_BATTLE': {
      const assignedAbilities = action.payload?.playerAbilities;
      const incomingBotDeck   = action.payload?.botDeck;
      const assignedBotAbilities = action.payload?.botAbilities;
      // ── FIX: إذا أُرسل playerDeck ضمن الـ action استخدمه مباشرة، وإلا استخدم الـ state
      const rawPlayerDeck     = (action.payload?.playerDeck && action.payload.playerDeck.length > 0)
        ? action.payload.playerDeck
        : state.playerDeck;
      const sortedPlayerDeck  = sortDeckWithTurinFirst(rawPlayerDeck);
      const deckWithPassives  = sortedPlayerDeck.map(applyOnSpawnPassive);
      const turinEffects = hasTurinInDeck(deckWithPassives)
        ? buildTurinPenaltyEffects(deckWithPassives.length)
        : [];

      const resolvedBotDeck =
        (incomingBotDeck && incomingBotDeck.length > 0)
          ? incomingBotDeck
          : (state.botDeck && state.botDeck.length > 0)
            ? state.botDeck
            : getBotCards(deckWithPassives.length, state.difficulty as DifficultyLevel ?? 2);
      const botDeckWithPassives = resolvedBotDeck.map(applyOnSpawnPassive);
      const allMightEffects = [
        ...buildAllMightAlignmentEffects(deckWithPassives, 'player', deckWithPassives.length),
        ...buildAllMightAlignmentEffects(botDeckWithPassives, 'bot', deckWithPassives.length),
      ];
      const kaidoEffects = [
        ...buildKaidoFactionEffects(deckWithPassives, 'player', deckWithPassives.length),
        ...buildKaidoFactionEffects(botDeckWithPassives, 'bot', deckWithPassives.length),
      ];
      const alphonseEffects = [
        ...buildAlphonseGoodAlignmentEffects(deckWithPassives, 'player', deckWithPassives.length),
        ...buildAlphonseGoodAlignmentEffects(botDeckWithPassives, 'bot', deckWithPassives.length),
      ];

      return {
        ...state,
        playerDeck: deckWithPassives,
        botDeck: botDeckWithPassives,
        totalRounds: deckWithPassives.length,
        currentRound: 0,
        playerScore: deckWithPassives.length,
        botScore:    deckWithPassives.length,
        playerMaxHealth: deckWithPassives.length,
        botMaxHealth: botDeckWithPassives.length,
        roundResults: [],
        forcedMatchOutcome: undefined,
        activeEffects: [...turinEffects, ...allMightEffects, ...kaidoEffects, ...alphonseEffects],
        playerAbilities: state.abilitiesEnabled
          ? (assignedAbilities
              ? assignedAbilities.map(type => ({ type, used: false }))
              : getRandomAbilities(3).map(type => ({ type, used: false })))
          : [],
        botAbilities: state.abilitiesEnabled
          ? (assignedBotAbilities
              ? assignedBotAbilities.map(type => ({ type, used: false }))
              : getRandomAbilities(3).map(type => ({ type, used: false })))
          : [],
        usedAbilities: [],
      };
    }

    case 'PLAY_ROUND': {
      if (state.currentRound >= state.totalRounds) return state;

      const roundNumber  = getRoundNumber(state);
      const activeEffects = state.abilitiesEnabled
        ? state.activeEffects.filter(e => isEffectActive(e, roundNumber))
        : [];

      const nextRoundSwapEffects = activeEffects.filter(effect =>
        effect.kind === 'nextRoundCardSwap'
        && (effect.data as { appliesToRound?: number } | undefined)?.appliesToRound === roundNumber,
      );
      const cardsAreSwapped = nextRoundSwapEffects.length % 2 === 1;
      const playerCard = (cardsAreSwapped ? state.botDeck : state.playerDeck)[state.currentRound];
      const botCard    = (cardsAreSwapped ? state.playerDeck : state.botDeck)[state.currentRound];
      if (!playerCard || !botCard) return state;

      // مرآة ياتا لا تعمل في الجولة الأولى، لأن سجل الجولة السابقة لا يكون موجوداً بعد.
      const previousRound = state.roundResults.at(-1);
      const resolvedPlayerCard = applyYataMirrorDefense(botCard, playerCard, previousRound?.playerCard);
      const resolvedBotCard = applyYataMirrorDefense(playerCard, botCard, previousRound?.botCard);

      const playerEffects = activeEffects.filter(e => e.targetSide === 'player' || e.targetSide === 'all');
      const botEffects    = activeEffects.filter(e => e.targetSide === 'bot'    || e.targetSide === 'all');
      const isStatDebuff = (effect: Effect) => effect.kind === 'statModifier' && ((effect.data as AbilityData | undefined)?.amount ?? 0) < 0;
      const shouldSwapDebuffs = isObitoCard(playerCard) !== isObitoCard(botCard);
      const resolvedPlayerEffects = shouldSwapDebuffs
        ? [...playerEffects.filter(effect => !isStatDebuff(effect)), ...botEffects.filter(isStatDebuff)]
        : playerEffects;
      const resolvedBotEffects = shouldSwapDebuffs
        ? [...botEffects.filter(effect => !isStatDebuff(effect)), ...playerEffects.filter(isStatDebuff)]
        : botEffects;

      const absoluteDominanceEffect = activeEffects
        .filter(e => e.kind === 'absoluteDominance')
        .filter(e => { const d = e.data as { appliesToRound?: number } | undefined; return !d?.appliesToRound || d.appliesToRound === roundNumber; })
        .sort((a, b) => b.priority - a.priority)[0];

      const forcedOutcomeEffect = activeEffects
        .filter(e => e.kind === 'forcedOutcome')
        .filter(e => { const d = e.data as { appliesToRound?: number } | undefined; return !d?.appliesToRound || d.appliesToRound === roundNumber; })
        .sort((a, b) => b.priority - a.priority || b.createdAtRound - a.createdAtRound)[0];

      const starAdvantageEffect = activeEffects
        .filter(e => e.kind === 'starAdvantage')
        .filter(e => { const d = e.data as { appliesToRound?: number } | undefined; return !d?.appliesToRound || d.appliesToRound === roundNumber; })
        .sort((a, b) => b.priority - a.priority || b.createdAtRound - a.createdAtRound)[0];

      const turinForcedLoss = isTurinForcedLoss(state.currentRound, state.totalRounds, state.playerDeck);

      let result: {
        winner: Side | 'draw';
        playerDamage: number;
        botDamage: number;
        playerBaseDamage: number;
        botBaseDamage: number;
        playerFactionAdvantage: FactionAdvantage;
        botFactionAdvantage: FactionAdvantage;
        playerHealthDelta: number;
        botHealthDelta: number;
      };

      if (absoluteDominanceEffect) {
        // السيطرة المطلقة — أعلى أولوية، تتجاوز حتى تورين والنتائج المضمونة
        result = { winner: absoluteDominanceEffect.sourceSide, playerDamage: 0, botDamage: 0, playerBaseDamage: 0, botBaseDamage: 0, playerFactionAdvantage: 'neutral' as FactionAdvantage, botFactionAdvantage: 'neutral' as FactionAdvantage, playerHealthDelta: 0, botHealthDelta: 0 };
      } else if (turinForcedLoss) {
        result = { winner: 'bot', playerDamage: 0, botDamage: 0, playerBaseDamage: 0, botBaseDamage: 0, playerFactionAdvantage: 'neutral' as FactionAdvantage, botFactionAdvantage: 'neutral' as FactionAdvantage, playerHealthDelta: 0, botHealthDelta: 0 };
      } else if (forcedOutcomeEffect) {
        const forcedData = forcedOutcomeEffect.data as { outcome?: 'draw' } | undefined;
        result = { winner: forcedData?.outcome === 'draw' ? 'draw' : forcedOutcomeEffect.sourceSide, playerDamage: 0, botDamage: 0, playerBaseDamage: 0, botBaseDamage: 0, playerFactionAdvantage: 'neutral' as FactionAdvantage, botFactionAdvantage: 'neutral' as FactionAdvantage, playerHealthDelta: 0, botHealthDelta: 0 };
      } else if (starAdvantageEffect) {
        result = { winner: starAdvantageEffect.sourceSide, playerDamage: 0, botDamage: 0, playerBaseDamage: 0, botBaseDamage: 0, playerFactionAdvantage: 'neutral' as FactionAdvantage, botFactionAdvantage: 'neutral' as FactionAdvantage, playerHealthDelta: 0, botHealthDelta: 0 };
      } else {
        result = determineRoundWinner(resolvedPlayerCard, resolvedBotCard, resolvedPlayerEffects, resolvedBotEffects, state.abilitiesEnabled, {
          playerScore: state.playerScore,
          botScore: state.botScore,
        });
      }

      const winner = result.winner;
      let updatedPlayerCard = resolvedPlayerCard;
      if (winner === 'player') {
        updatedPlayerCard = { ...applyPostBattlePassive(resolvedPlayerCard, 'win'), winState: 'win' };
      } else if (winner === 'bot') {
        updatedPlayerCard = { ...applyPostBattlePassive(resolvedPlayerCard, 'lose'), winState: 'lose' };
      } else {
        updatedPlayerCard = { ...applyPostBattlePassive(resolvedPlayerCard, 'draw'), winState: 'draw' };
      }

      let updatedBotCard = resolvedBotCard;
      if (winner === 'bot') {
        updatedBotCard = { ...applyPostBattlePassive(resolvedBotCard, 'win'), winState: 'win' };
      } else if (winner === 'player') {
        updatedBotCard = { ...applyPostBattlePassive(resolvedBotCard, 'lose'), winState: 'lose' };
      } else {
        updatedBotCard = { ...applyPostBattlePassive(resolvedBotCard, 'draw'), winState: 'draw' };
      }

      const updatedPlayerDeck = state.playerDeck.map((c, i) => i === state.currentRound ? updatedPlayerCard : c);
      const updatedBotDeck = state.botDeck.map((c, i) => i === state.currentRound ? updatedBotCard : c);

      const hasDoublePoints = activeEffects.some(e => e.kind === 'doublePoints');
      const pointsMultiplier = hasDoublePoints ? 2 : 1;

      let playerHpDelta = result.playerHealthDelta;
      let botHpDelta    = result.botHealthDelta;
      if (result.winner === 'player') botHpDelta    -= pointsMultiplier;
      else if (result.winner === 'bot') playerHpDelta -= pointsMultiplier;

      const effectsToRemove  = new Set<string>();
      const effectsToReplace = new Map<string, Effect>();
      const effectsToAdd: Effect[] = [];

      const queueProfessionalPostLossBonus = (card: Card, side: Side) => {
        const bonus = getPostLossProfessionalBonus(card);
        if (!bonus || roundNumber >= state.totalRounds) return;
        const alreadyLost = state.roundResults.some(result => side === 'player'
          ? result.winner === 'bot'
          : result.winner === 'player');
        if (card.id === 'chopper' && alreadyLost) return;
        if (bonus.health) {
          if (side === 'player') playerHpDelta += bonus.health;
          else botHpDelta += bonus.health;
        }
        if (bonus.attack) effectsToAdd.push({
          id: `professional-post-loss-attack-${side}-${roundNumber}`,
          kind: 'statModifier', sourceSide: side, targetSide: side,
          createdAtRound: roundNumber + 1, expiresAtRound: roundNumber + 1,
          priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'attack', amount: bonus.attack },
        });
        if (bonus.defense) effectsToAdd.push({
          id: `professional-post-loss-defense-${side}-${roundNumber}`,
          kind: 'statModifier', sourceSide: side, targetSide: side,
          createdAtRound: roundNumber + 1, expiresAtRound: roundNumber + 1,
          priority: EFFECT_PRIORITY.statModifiers, data: { stat: 'defense', amount: bonus.defense },
        });
      };

      if (winner === 'bot') queueProfessionalPostLossBonus(playerCard, 'player');
      if (winner === 'player') queueProfessionalPostLossBonus(botCard, 'bot');

      const queueZoroCut = (card: Card, side: Side) => {
        const cutNextRounds = getCharacterAbility(card)?.cutNextRounds ?? 0;
        if (cutNextRounds <= 0 || roundNumber >= state.totalRounds) return;
        const firstAffectedRound = roundNumber + 1;
        const lastAffectedRound = Math.min(state.totalRounds, roundNumber + cutNextRounds);
        effectsToAdd.push({
          id: `zoro-cut-${side}-${roundNumber}`,
          kind: 'forcedOutcome',
          sourceSide: side,
          targetSide: getOppositeSide(side),
          createdAtRound: firstAffectedRound,
          expiresAtRound: lastAffectedRound,
          priority: 95,
          data: { zoroCut: true, rounds: lastAffectedRound - firstAffectedRound + 1 },
        });
      };

      // زورو لا يحسم ظهوره الحالي؛ يبدأ أثر القطع في ثلاث جولات تالية فقط.
      queueZoroCut(playerCard, 'player');
      queueZoroCut(botCard, 'bot');

      const queueArtoriasSwap = (card: Card, opponentCard: Card, side: Side) => {
        if (!shouldArtoriasSwapNextRound(card, opponentCard) || roundNumber >= state.totalRounds) return;
        effectsToAdd.push({
          id: `artorias-next-round-swap-${side}-${roundNumber}`,
          kind: 'nextRoundCardSwap',
          sourceSide: side,
          targetSide: getOppositeSide(side),
          createdAtRound: roundNumber + 1,
          expiresAtRound: roundNumber + 1,
          charges: 1,
          priority: EFFECT_PRIORITY.statModifiers,
          data: { appliesToRound: roundNumber + 1 },
        });
      };
      queueArtoriasSwap(playerCard, botCard, 'player');
      queueArtoriasSwap(botCard, playerCard, 'bot');

      const queueTogeNextRoundPenalty = (card: Card, side: Side) => {
        if (card.id !== 'toge_inumaki' || winner !== side || roundNumber >= state.totalRounds) return;
        effectsToAdd.push({
          id: `toge-next-round-attack-${side}-${roundNumber}`,
          kind: 'statModifier',
          sourceSide: side,
          targetSide: getOppositeSide(side),
          createdAtRound: roundNumber + 1,
          expiresAtRound: roundNumber + 1,
          priority: EFFECT_PRIORITY.statModifiers,
          data: { stat: 'attack', amount: -2 },
        });
      };
      queueTogeNextRoundPenalty(playerCard, 'player');
      queueTogeNextRoundPenalty(botCard, 'bot');

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
            case 'doubleDebuffs': {
              const opponentSide = getOppositeSide(effect.sourceSide);
              activeEffects.filter(e => e.kind === 'statModifier' && e.targetSide === opponentSide && (e.data as any)?.amount < 0).forEach(ne => {
                effectsToReplace.set(ne.id, { ...ne, data: { ...(ne.data as object), amount: (ne.data as any).amount * 2 } });
              });
              effectsToRemove.add(effect.id); break;
            }
            case 'doublePoints': {
              effectsToRemove.add(effect.id); break;
            }
            case 'factionMastery': {
              effectsToRemove.add(effect.id); break;
            }
            case 'absoluteDominance': {
              effectsToRemove.add(effect.id); break;
            }
            case 'phantomBlade': {
              effectsToRemove.add(effect.id); break;
            }
            case 'nextRoundCardSwap': {
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
      const forcedData = forcedOutcomeEffect?.data as AbilityData | undefined;
      if (forcedOutcomeEffect && !forcedData?.zoroCut) nextEffects = nextEffects.filter(e => e.id !== forcedOutcomeEffect.id);
      nextEffects = nextEffects.filter(e => !isEffectExpired(e, roundNumber));
      if (!state.abilitiesEnabled) nextEffects = [];

      // قدرة الظهور تتفعل عندما تدخل البطاقة لهذه الجولة، حتى في الجولة الأولى.
      const playerSpawnHealthBonus = getOnSpawnMatchHealthBonus(playerCard);
      const botSpawnHealthBonus = getOnSpawnMatchHealthBonus(botCard);
      const playerPostBattleHealthBonus = winner === 'player'
        ? getPostBattleMatchHealthBonus(playerCard, 'win')
        : 0;
      const botPostBattleHealthBonus = winner === 'bot'
        ? getPostBattleMatchHealthBonus(botCard, 'win')
        : 0;

      const playerRoundHealthDelta = playerHpDelta + playerSpawnHealthBonus + playerPostBattleHealthBonus;
      const botRoundHealthDelta = botHpDelta + botSpawnHealthBonus + botPostBattleHealthBonus;
      const nextPlayerScore = Math.max(0, state.playerScore + playerRoundHealthDelta);
      const nextBotScore = Math.max(0, state.botScore + botRoundHealthDelta);
      const forcedOutcomeData = forcedOutcomeEffect?.data as { forceMatchDraw?: boolean } | undefined;
      const forceMatchDraw = forcedOutcomeData?.forceMatchDraw === true;
      const equalizedScore = Math.min(nextPlayerScore, nextBotScore);
      const roundResult: RoundResult = {
        round: state.currentRound + 1,
        playerCard: updatedPlayerCard,
        botCard: updatedBotCard,
        playerDamage: result.playerDamage,
        botDamage: result.botDamage,
        playerBaseDamage: result.playerBaseDamage,
        botBaseDamage: result.botBaseDamage,
        playerFactionAdvantage: result.playerFactionAdvantage,
        botFactionAdvantage: result.botFactionAdvantage,
        playerHealthDelta: playerRoundHealthDelta,
        botHealthDelta: botRoundHealthDelta,
        botAbilityUsed: state.botAbilityUsedThisRound,
        playerInfo: playerCard.id === 'bulma' ? buildBulmaClassScan(state.botDeck) : undefined,
        botInfo: botCard.id === 'bulma' ? buildBulmaClassScan(state.playerDeck) : undefined,
        winner: result.winner,
      };

      return {
        ...state,
        playerDeck: updatedPlayerDeck,
        botDeck: updatedBotDeck,
        // لا نضع سقفاً أعلى: العلاج الفائز في الجولة الأولى يحتفظ بزيادته فوق الصحة الابتدائية.
        playerScore: forceMatchDraw ? equalizedScore : nextPlayerScore,
        botScore: forceMatchDraw ? equalizedScore : nextBotScore,
        playerMaxHealth: Math.max(state.playerMaxHealth, forceMatchDraw ? equalizedScore : nextPlayerScore),
        botMaxHealth: Math.max(state.botMaxHealth, forceMatchDraw ? equalizedScore : nextBotScore),
        roundResults: [...state.roundResults, roundResult],
        forcedMatchOutcome: forceMatchDraw ? 'draw' : state.forcedMatchOutcome,
        activeEffects: nextEffects,
        usedAbilities: [],
        botAbilityUsedThisRound: undefined,
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
        case 'Misdirection': {
          nextEffects = [...nextEffects, { id: makeEffectId('Misdirection', side, roundNumber), kind: 'doubleDebuffs', sourceSide: side, targetSide: opponentSide, createdAtRound: roundNumber, expiresAtRound: roundNumber, charges: 1, priority: EFFECT_PRIORITY.rewards, data: {} }];
          break;
        }
        case 'StealAbility': {
          const oppAbilities = isPlayer ? state.botAbilities : state.playerAbilities;
          const stealable = oppAbilities.filter(a => !a.used);
          if (stealable.length > 0) {
            const stolen = stealable[Math.floor(Math.random() * stealable.length)];
            const newOppAbilities = oppAbilities.map(a => a.type === stolen.type ? { ...a, used: true } : a);
            const ownAbilities = isPlayer ? state.playerAbilities : state.botAbilities;
            const newOwnAbilities = [...ownAbilities, { type: stolen.type, used: false }];
            if (isPlayer) {
              nextState = { ...nextState, botAbilities: newOppAbilities, playerAbilities: newOwnAbilities };
            } else {
              nextState = { ...nextState, playerAbilities: newOppAbilities, botAbilities: newOwnAbilities };
            }
          }
          break;
        }
        case 'Rescue': {
          const currentCard = isPlayer ? state.playerDeck[state.currentRound] : state.botDeck[state.currentRound];
          if (currentCard) {
            const defAmount = currentCard.defense;
            nextEffects = [...nextEffects, {
              id: makeEffectId('Rescue', side, roundNumber),
              kind: 'statModifier',
              sourceSide: side,
              targetSide: side,
              createdAtRound: roundNumber + 1,
              expiresAtRound: roundNumber + 1,
              charges: 1,
              priority: EFFECT_PRIORITY.statModifiers,
              data: { stat: 'defense', amount: defAmount }
            }];
          }
          break;
        }
        case 'Trap': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Trap', side, roundNumber),
            kind: 'trap',
            sourceSide: side,
            targetSide: opponentSide,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.hpDelta,
            data: { appliesToRound: roundNumber }
          }];
          break;
        }
        case 'ConvertDebuffsToBuffs': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('ConvertDebuffsToBuffs', side, roundNumber),
            kind: 'convertDebuffs',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.cleanseEffects,
            data: {}
          }];
          break;
        }
        case 'Sniping': {
          const selectedRound = Number(data?.round);
          if (!Number.isInteger(selectedRound) || selectedRound <= roundNumber || selectedRound > state.totalRounds) return state;
          nextEffects = [...nextEffects, {
            id: makeEffectId('Sniping', side, roundNumber),
            kind: 'forcedOutcome',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: selectedRound,
            charges: 1,
            priority: EFFECT_PRIORITY.forcedOutcome,
            data: { appliesToRound: selectedRound }
          }];
          break;
        }
        case 'Merge': {
          const mergeIdx = data?.roundIndex !== undefined ? Number(data.roundIndex) : state.roundResults.length - 1;
          const mergeResult = state.roundResults[mergeIdx];
          if (mergeResult) {
            const pastCard = side === 'player' ? mergeResult.playerCard : mergeResult.botCard;
            if (pastCard) {
              const currentCard = side === 'player' ? state.playerDeck[state.currentRound] : state.botDeck[state.currentRound];
              if (currentCard) {
                const mergedCard = {
                  ...currentCard,
                  attack: currentCard.attack + pastCard.attack,
                  defense: currentCard.defense + pastCard.defense,
                };
                if (side === 'player') {
                  const d = [...state.playerDeck];
                  d[state.currentRound] = mergedCard;
                  nextState = { ...nextState, playerDeck: d };
                } else {
                  const d = [...state.botDeck];
                  d[state.currentRound] = mergedCard;
                  nextState = { ...nextState, botDeck: d };
                }
              }
            }
          }
          break;
        }
        case 'DoubleNextCards': {
          nextEffects = [
            ...nextEffects,
            {
              id: makeEffectId('DoubleNextCards', side, roundNumber),
              kind: 'statModifier',
              sourceSide: side,
              targetSide: side,
              createdAtRound: roundNumber + 1,
              expiresAtRound: roundNumber + 1,
              charges: 1,
              priority: EFFECT_PRIORITY.statModifiers,
              data: { stat: 'attack', multiplier: true, double: true }
            },
            {
              id: makeEffectId('DoubleNextCards', side, roundNumber + 1),
              kind: 'statModifier',
              sourceSide: side,
              targetSide: side,
              createdAtRound: roundNumber + 2,
              expiresAtRound: roundNumber + 2,
              charges: 1,
              priority: EFFECT_PRIORITY.statModifiers,
              data: { stat: 'attack', multiplier: true, double: true }
            }
          ];
          break;
        }
        case 'Deprivation': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Deprivation', side, roundNumber),
            kind: 'deprivation',
            sourceSide: side,
            targetSide: opponentSide,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.cleanseEffects,
            data: {}
          }];
          break;
        }
        case 'Greed': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Greed', side, roundNumber),
            kind: 'greedBuff',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.rewards,
            data: {}
          }];
          break;
        }
        case 'Dilemma': {
          const dilemmaIdx = data?.roundIndex !== undefined ? Number(data.roundIndex) : state.roundResults.length - 1;
          const dilemmaResult = state.roundResults[dilemmaIdx];
          if (dilemmaResult) {
            const pastCard = side === 'player' ? dilemmaResult.playerCard : dilemmaResult.botCard;
            if (pastCard) {
              if (side === 'player') {
                const d = [...state.botDeck];
                d[state.currentRound] = { ...pastCard, ability: undefined };
                nextState = { ...nextState, botDeck: d };
              } else {
                const d = [...state.playerDeck];
                d[state.currentRound] = { ...pastCard, ability: undefined };
                nextState = { ...nextState, playerDeck: d };
              }
            }
          }
          break;
        }
        case 'Subhan': {
          const guessed = Number(data?.guessedAttack);
          const oppCard = side === 'player' ? state.botDeck[state.currentRound] : state.playerDeck[state.currentRound];
          if (oppCard && !Number.isNaN(guessed)) {
            const diff = Math.abs(oppCard.attack - guessed);
            if (diff <= 3) {
              nextEffects = [...nextEffects, {
                id: makeEffectId('Subhan', side, roundNumber),
                kind: 'statModifier',
                sourceSide: side,
                targetSide: side,
                createdAtRound: roundNumber,
                expiresAtRound: roundNumber,
                charges: 1,
                priority: EFFECT_PRIORITY.statModifiers,
                data: { stat: 'attack', amount: 2 }
              }];
            }
          }
          break;
        }
        case 'Propaganda': {
          const targetClass = data?.selection as string;
          if (targetClass) {
            nextEffects = [...nextEffects, {
              id: makeEffectId('Propaganda', side, roundNumber),
              kind: 'statModifier',
              sourceSide: side,
              targetSide: opponentSide,
              createdAtRound: roundNumber,
              expiresAtRound: state.totalRounds,
              priority: EFFECT_PRIORITY.statModifiers,
              data: { stat: 'all_stats', amount: -2, targetClass }
            }];
          }
          break;
        }
        case 'DoubleYourBuffs': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('DoubleYourBuffs', side, roundNumber),
            kind: 'doubleBuffs',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.rewards,
            data: {}
          }];
          break;
        }
        case 'Avatar': {
          nextEffects = [
            ...nextEffects,
            {
              id: makeEffectId('Avatar', side, roundNumber),
              kind: 'statModifier',
              sourceSide: side,
              targetSide: side,
              createdAtRound: roundNumber,
              expiresAtRound: state.totalRounds,
              priority: EFFECT_PRIORITY.statModifiers,
              data: { stat: 'attack', amount: 2 }
            },
            {
              id: makeEffectId('Avatar', side, roundNumber),
              kind: 'statModifier',
              sourceSide: side,
              targetSide: side,
              createdAtRound: roundNumber,
              expiresAtRound: state.totalRounds,
              priority: EFFECT_PRIORITY.statModifiers,
              data: { stat: 'defense', amount: 2 }
            }
          ];
          break;
        }
        case 'Penetration': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Penetration', side, roundNumber),
            kind: 'statModifier',
            sourceSide: side,
            targetSide: opponentSide,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.statModifiers,
            data: { stat: 'defense', amount: -9999 }
          }];
          break;
        }
        case 'Pool': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Pool', side, roundNumber),
            kind: 'pool',
            sourceSide: side,
            targetSide: opponentSide,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.hpDelta,
            data: { appliesToRound: roundNumber }
          }];
          break;
        }
        case 'Conversion': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Conversion', side, roundNumber),
            kind: 'conversion',
            sourceSide: side,
            targetSide: opponentSide,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.cleanseEffects,
            data: {}
          }];
          break;
        }
        case 'Shield': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Shield', side, roundNumber),
            kind: 'shieldGuard',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.preventHpLoss,
            data: { appliesToRound: roundNumber }
          }];
          break;
        }
        case 'SwapClass': {
          const pCard = state.playerDeck[state.currentRound];
          const bCard = state.botDeck[state.currentRound];
          if (pCard && bCard) {
            const updatedPlayerCard = { ...pCard, cardClass: bCard.cardClass };
            const updatedBotCard = { ...bCard, cardClass: pCard.cardClass };
            const pDeck = [...state.playerDeck];
            pDeck[state.currentRound] = updatedPlayerCard;
            const bDeck = [...state.botDeck];
            bDeck[state.currentRound] = updatedBotCard;
            nextState = { ...nextState, playerDeck: pDeck, botDeck: bDeck };
          }
          break;
        }
        case 'TakeIt': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('TakeIt', side, roundNumber),
            kind: 'takeIt',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.cleanseEffects,
            data: {}
          }];
          break;
        }
        case 'Skip': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Skip', side, roundNumber),
            kind: 'forcedOutcome',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.forcedOutcome,
            data: { appliesToRound: roundNumber, outcome: 'draw' }
          }];
          break;
        }
        case 'AddElement': {
          const chosenFaction = data?.faction as Race;
          if (chosenFaction) {
            const currentCard = side === 'player' ? state.playerDeck[state.currentRound] : state.botDeck[state.currentRound];
            if (currentCard) {
              const updatedCard = { ...currentCard, race: chosenFaction };
              if (side === 'player') {
                const d = [...state.playerDeck];
                d[state.currentRound] = updatedCard;
                nextState = { ...nextState, playerDeck: d };
              } else {
                const d = [...state.botDeck];
                d[state.currentRound] = updatedCard;
                nextState = { ...nextState, botDeck: d };
              }
            }
          }
          break;
        }
        case 'Explosion': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('Explosion', side, roundNumber),
            kind: 'explosionDebuff',
            sourceSide: side,
            targetSide: opponentSide,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.rewards,
            data: {}
          }];
          break;
        }
        case 'DoublePoints': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('DoublePoints', side, roundNumber),
            kind: 'doublePoints',
            sourceSide: side,
            targetSide: 'all',
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.rewards,
            data: {}
          }];
          break;
        }
        case 'ElementalMastery': {
          nextEffects = [...nextEffects, {
            id: makeEffectId('ElementalMastery', side, roundNumber),
            kind: 'factionMastery',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.starAdvantage,
            data: {}
          }];
          break;
        }
        case 'AbsoluteDominance': {
          // السيطرة المطلقة — فوز مضمون بأعلى أولوية (200)
          nextEffects = [...nextEffects, {
            id: makeEffectId('AbsoluteDominance', side, roundNumber),
            kind: 'absoluteDominance',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: 200, // أعلى من أي تأثير آخر
            data: { appliesToRound: roundNumber }
          }];
          break;
        }
        case 'InfinityLoop': {
          // الحلقة الأبدية — إعادة آخر 3 جولات
          const rewindCount = Math.min(3, state.roundResults.length);
          if (rewindCount > 0) {
            const rewindedResults = state.roundResults.slice(0, -rewindCount);
            // نعيد بناء الصحة من دلتا كل جولة كي لا تضيع العلاجات أو الآثار الخاصة.
            let newPlayerScore = state.playerDeck.length;
            let newBotScore = state.botDeck.length;
            let newPlayerMaxHealth = newPlayerScore;
            let newBotMaxHealth = newBotScore;
            for (const rr of rewindedResults) {
              const playerDelta = rr.playerHealthDelta
                ?? (rr.winner === 'bot' ? -1 : 0);
              const botDelta = rr.botHealthDelta
                ?? (rr.winner === 'player' ? -1 : 0);
              newPlayerScore = Math.max(0, newPlayerScore + playerDelta);
              newBotScore = Math.max(0, newBotScore + botDelta);
              newPlayerMaxHealth = Math.max(newPlayerMaxHealth, newPlayerScore);
              newBotMaxHealth = Math.max(newBotMaxHealth, newBotScore);
            }
            nextState = {
              ...nextState,
              currentRound: Math.max(0, state.currentRound - rewindCount),
              roundResults: rewindedResults,
              playerScore: newPlayerScore,
              botScore: newBotScore,
              playerMaxHealth: newPlayerMaxHealth,
              botMaxHealth: newBotMaxHealth,
            };
          }
          break;
        }
        case 'PhantomBlade': {
          // شفرة الوهم — هجوم مضاعف هذه الجولة
          const currentCard = side === 'player' ? state.playerDeck[state.currentRound] : state.botDeck[state.currentRound];
          if (currentCard) {
            nextEffects = [...nextEffects, {
              id: makeEffectId('PhantomBlade', side, roundNumber),
              kind: 'phantomBlade',
              sourceSide: side,
              targetSide: side,
              createdAtRound: roundNumber,
              expiresAtRound: roundNumber,
              charges: 1,
              priority: EFFECT_PRIORITY.statModifiers,
              data: { stat: 'attack', amount: currentCard.attack }
            }];
          }
          break;
        }
        case 'NothingHappened': {
          // لا شيء لا شيء حدث — نجاة أخيرة عند 1 HP أو في الجولة النهائية.
          const ownScore = side === 'player' ? state.playerScore : state.botScore;
          const isFinalRound = state.currentRound === state.totalRounds - 1;
          if (ownScore !== 1 && !isFinalRound) return state;
          nextEffects = [...nextEffects, {
            id: makeEffectId('NothingHappened', side, roundNumber),
            kind: 'forcedOutcome',
            sourceSide: side,
            targetSide: side,
            createdAtRound: roundNumber,
            expiresAtRound: roundNumber,
            charges: 1,
            priority: EFFECT_PRIORITY.forcedOutcome,
            data: { appliesToRound: roundNumber, outcome: 'draw', forceMatchDraw: true },
          }];
          break;
        }
        default: break;
      }

      const abilityOwnerList = isPlayer ? nextState.playerAbilities : nextState.botAbilities;
      const updatedAbilities = abilityOwnerList.map((a, i) =>
        i === abilityIndex ? { ...a, used: true } : a
      );

      return {
        ...nextState,
        activeEffects: nextEffects,
        ...(isPlayer ? { playerAbilities: updatedAbilities } : { botAbilities: updatedAbilities }),
        usedAbilities: [...state.usedAbilities, abilityType],
        ...(isPlayer ? {} : { botAbilityUsedThisRound: abilityType }),
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
      return { ...initialState, matchMode: state.matchMode, difficulty: state.difficulty, abilitiesEnabled: state.abilitiesEnabled };

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
  setMatchMode: (mode: MatchMode) => void;
  setTotalRounds: (rounds: number) => void;
  startBattle: (deck: Card[], abilities?: AbilityType[], botDeck?: Card[], botAbilities?: AbilityType[]) => void;
  syncDecks: (playerDeck: Card[], botDeck: Card[]) => void;
  setDifficulty: (level: DifficultyLevel) => void;
  setAbilitiesEnabled: (enabled: boolean) => void;
  playRound: () => void;
  nextRound: (fromRound?: number) => void;
  resetGame: () => void;
  useAbility: (abilityType: AbilityType, data?: Record<string, unknown>, isPlayer?: boolean) => void;
  grantDeveloperNothingHappened: () => AbilityType | null;
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
  const { showAbilityCard } = useAbilityActivationOverlay();

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

  const setMatchMode = useCallback((mode: MatchMode) => {
    dispatch({ type: 'SET_MATCH_MODE', payload: mode });
  }, []);

  // ── FIX: إرسال playerDeck داخل START_BATTLE مباشرة بدل dispatch منفصل
  // كانت المشكلة أن dispatch('SET_PLAYER_DECK') + dispatch('START_BATTLE') يحدثان
  // في نفس الـ render cycle، فـ START_BATTLE كان يقرأ totalRounds = 0 من الـ state القديم
  const startBattle = useCallback((deck: Card[], abilities?: AbilityType[], botDeck?: Card[], botAbilities?: AbilityType[]) => {
    dispatch({ type: 'START_BATTLE', payload: { playerDeck: deck, playerAbilities: abilities, botDeck, botAbilities } });
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

  const nextRound = useCallback((fromRound?: number) => {
    dispatch({ type: 'NEXT_ROUND', payload: fromRound === undefined ? undefined : { fromRound } });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const useAbility = useCallback((abilityType: AbilityType, data?: Record<string, unknown>, isPlayer: boolean = true) => {
    dispatch({ type: 'USE_ABILITY', payload: { abilityType, isPlayer, data } });
    try {
      const detail = ABILITY_DETAILS[abilityType];
      if (detail) {
        showAbilityCard({
          abilityType,
          target: isPlayer ? 'player' : 'bot',
          duration: state.matchMode === 'local' ? 15000 : 3200,
        });
      }
    } catch (e) {
      console.warn('Ability card overlay trigger error in useAbility:', e);
    }
  }, [showAbilityCard, state.matchMode]);

  const grantDeveloperNothingHappened = useCallback((): AbilityType | null => {
    if (state.playerAbilities.some(ability => ability.type === 'NothingHappened')) return null;
    const replaced = state.playerAbilities.find(ability => !ability.used);
    if (!replaced) return null;
    dispatch({ type: 'GRANT_DEVELOPER_NOTHING_HAPPENED' });
    return replaced.type;
  }, [state.playerAbilities]);

  // ── derived state ──
  const isGameOver = useMemo(() =>
    state.forcedMatchOutcome === 'draw' || (state.totalRounds > 0 && state.roundResults.length >= state.totalRounds),
    [state.forcedMatchOutcome, state.totalRounds, state.roundResults.length]
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
    const roundNumber = state.currentRound + 1;
    const activeEffects = state.abilitiesEnabled
      ? state.activeEffects.filter(e => isEffectActive(e, roundNumber))
      : [];
    const nextRoundSwapEffects = activeEffects.filter(effect =>
      effect.kind === 'nextRoundCardSwap'
      && (effect.data as { appliesToRound?: number } | undefined)?.appliesToRound === roundNumber,
    );
    const cardsAreSwapped = nextRoundSwapEffects.length % 2 === 1;
    const playerCard = (cardsAreSwapped ? state.botDeck : state.playerDeck)[state.currentRound];
    const botCard = (cardsAreSwapped ? state.playerDeck : state.botDeck)[state.currentRound];
    if (!playerCard || !botCard) return null;
    const previousRound = state.roundResults.at(-1);
    const resolvedPlayerCard = applyYataMirrorDefense(botCard, playerCard, previousRound?.playerCard);
    const resolvedBotCard = applyYataMirrorDefense(playerCard, botCard, previousRound?.botCard);
    const playerEffects = activeEffects.filter(e => e.targetSide === 'player' || e.targetSide === 'all');
    const botEffects = activeEffects.filter(e => e.targetSide === 'bot' || e.targetSide === 'all');
    const isStatDebuff = (effect: Effect) => effect.kind === 'statModifier' && ((effect.data as AbilityData | undefined)?.amount ?? 0) < 0;
    const shouldSwapDebuffs = isObitoCard(playerCard) !== isObitoCard(botCard);
    const resolvedPlayerEffects = shouldSwapDebuffs
      ? [...playerEffects.filter(effect => !isStatDebuff(effect)), ...botEffects.filter(isStatDebuff)]
      : playerEffects;
    const resolvedBotEffects = shouldSwapDebuffs
      ? [...botEffects.filter(effect => !isStatDebuff(effect)), ...playerEffects.filter(isStatDebuff)]
      : botEffects;

    // Mirror the exact same resolution order as PLAY_ROUND:
    // 1. absoluteDominance (highest priority — overrides everything)
    const absoluteDominanceEffect = activeEffects
      .filter(e => e.kind === 'absoluteDominance')
      .filter(e => { const d = e.data as { appliesToRound?: number } | undefined; return !d?.appliesToRound || d.appliesToRound === roundNumber; })
      .sort((a, b) => b.priority - a.priority)[0];

    // 2. turinForcedLoss
    const turinForcedLoss = isTurinForcedLoss(state.currentRound, state.totalRounds, state.playerDeck);

    // 3. forcedOutcome (Popularity / Sniping / Skip)
    const forcedOutcomeEffect = activeEffects
      .filter(e => e.kind === 'forcedOutcome')
      .filter(e => { const d = e.data as { appliesToRound?: number } | undefined; return !d?.appliesToRound || d.appliesToRound === roundNumber; })
      .sort((a, b) => b.priority - a.priority || b.createdAtRound - a.createdAtRound)[0];

    const emptyPreview = {
      playerDamage: 0,
      botDamage: 0,
      playerBaseDamage: 0,
      botBaseDamage: 0,
      playerFactionAdvantage: 'neutral' as FactionAdvantage,
      botFactionAdvantage: 'neutral' as FactionAdvantage,
      playerHealthDelta: 0,
      botHealthDelta: 0,
    };
    let preview: Omit<RoundResult, 'round' | 'playerCard' | 'botCard' | 'winner'> = emptyPreview;
    let winner: Side | 'draw';
    if (absoluteDominanceEffect) {
      winner = absoluteDominanceEffect.sourceSide;
    } else if (turinForcedLoss) {
      winner = 'bot';
    } else if (forcedOutcomeEffect) {
      const forcedData = forcedOutcomeEffect.data as { outcome?: 'draw' } | undefined;
      winner = forcedData?.outcome === 'draw' ? 'draw' : forcedOutcomeEffect.sourceSide;
    } else {
      const battlePreview = determineRoundWinner(resolvedPlayerCard, resolvedBotCard, resolvedPlayerEffects, resolvedBotEffects, state.abilitiesEnabled);
      preview = battlePreview;
      winner = battlePreview.winner;
    }
    return {
      round: roundNumber,
      playerCard: resolvedPlayerCard,
      botCard: resolvedBotCard,
      ...preview,
      winner,
    };
  }, [state.playerDeck, state.botDeck, state.currentRound, state.roundResults, state.activeEffects, state.abilitiesEnabled, state.totalRounds]);

  return (
    <GameContext.Provider value={{
      state, dispatch, rarityWeights, updateRarityWeights,
      setRarityWeights: (w: RarityWeights) => { setRarityWeights(w); saveRarityWeights(w); },
      setPlayerDeck, setMatchMode, setTotalRounds, startBattle, syncDecks,
      setDifficulty, setAbilitiesEnabled,
      playRound, nextRound, resetGame, useAbility, grantDeveloperNothingHappened,
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
