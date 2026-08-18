import React, { createContext, useContext, useReducer, useState, ReactNode } from 'react';
import { Card, GameState, RoundResult, ActiveEffect, AbilityType } from './types';
import { abilityExecutors, getRandomAbilities } from './abilities';
import type { DifficultyLevel } from '@/app/screens/difficulty';
import { determineRoundWinner } from './cards-data';
import { getBotCards } from './bot-ai';

// الحالة الأولية
const initialState: GameState = {
  playerDeck: [],
  botDeck: [],
  currentRound: 0,
  totalRounds: 0,
  playerScore: 3, // نقاط الصحة الابتدائية
  botScore: 3,
  roundResults: [],
  difficulty: 'medium',
  activeEffects: [],
  playerAbilities: [],
  botAbilities: [],
  usedAbilities: [],
};

const initialDifficulty: DifficultyLevel = 'medium';

// أنواع الإجراءات
type GameAction =
  | { type: 'SET_PLAYER_DECK'; payload: Card[] }
  | { type: 'SET_BOT_DECK'; payload: Card[] }
  | { type: 'SET_TOTAL_ROUNDS'; payload: number }
  | { type: 'START_BATTLE' }
  | { type: 'PLAY_ROUND' }
  | { type: 'RESET_GAME' }
  | { type: 'ADD_EFFECT'; payload: ActiveEffect }
  | { type: 'REMOVE_EFFECTS'; payload: { target: 'player' | 'bot' | 'all', type: 'buff' | 'debuff' | 'all' } }
  | { type: 'SET_DIFFICULTY'; payload: DifficultyLevel }
  | { type: 'USE_ABILITY'; payload: { abilityType: AbilityType, isPlayer: boolean } };

// المخفض
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PLAYER_DECK':
      return {
        ...state,
        playerDeck: action.payload,
        totalRounds: action.payload.length,
      };

    case 'SET_BOT_DECK':
      return {
        ...state,
        botDeck: action.payload,
      };

    case 'SET_TOTAL_ROUNDS':
      return {
        ...state,
        totalRounds: action.payload,
      };

    case 'START_BATTLE':
      return {
        ...state,
        currentRound: 0,
        playerScore: 3, // إعادة تعيين نقاط الصحة
        botScore: 3,
        roundResults: [],
        activeEffects: [],
        playerAbilities: getRandomAbilities(3).map(type => ({ type, used: false })),
        botAbilities: getRandomAbilities(3).map(type => ({ type, used: false })),
        usedAbilities: [],
      };

    case 'PLAY_ROUND': {
      if (state.currentRound >= state.totalRounds) {
        return state;
      }

      const playerCard = state.playerDeck[state.currentRound];
      const botCard = state.botDeck[state.currentRound];

      // تصفية التأثيرات حسب الهدف
      const allPlayerEffects = state.activeEffects.filter(
        e => e.target === 'player' || e.target === 'all'
      );
      const allBotEffects = state.activeEffects.filter(
        e => e.target === 'bot' || e.target === 'all'
      );

      // تحديد الفائز بعد تطبيق التأثيرات
      const result = determineRoundWinner(
        playerCard,
        botCard,
        allPlayerEffects,
        allBotEffects
      );

      const roundResult: RoundResult = {
        round: state.currentRound + 1,
        playerCard,
        botCard,
        playerDamage: result.playerDamage,
        botDamage: result.botDamage,
        playerBaseDamage: result.playerBaseDamage,
        botBaseDamage: result.botBaseDamage,
        playerElementAdvantage: result.playerElementAdvantage,
        botElementAdvantage: result.botElementAdvantage,
        winner: result.winner,
      };

      // تحديث عدد الجولات المتبقية للتأثيرات النشطة
      const nextActiveEffects = state.activeEffects
        .map(effect => ({ ...effect, roundsLeft: effect.roundsLeft - 1 }))
        .filter(effect => effect.roundsLeft > 0);

      // تطبيق تأثيرات ما بعد الجولة
      let postRoundEffects: ActiveEffect[] = [];
      let finalPlayerScore = state.playerScore;
      let finalBotScore = state.botScore;

      // تحديث نقاط الصحة بناءً على الفائز
      if (result.winner === 'player') {
        finalBotScore = Math.max(0, finalBotScore - 1);
      } else if (result.winner === 'bot') {
        finalPlayerScore = Math.max(0, finalPlayerScore - 1);
      }

      // القدرات المستخدمة في هذه الجولة
      const usedAbilitiesInThisRound = state.usedAbilities;

      usedAbilitiesInThisRound.forEach((ability) => {
        const remainingRounds = state.totalRounds - state.currentRound - 1;

        switch (ability) {
          case 'Reinforcement': // التدعيم (في حال الفوز +1 دفاع لكل الكروت لك)
            if (result.winner === 'player' && remainingRounds > 0) {
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: 'defense',
                value: 1,
                roundsLeft: remainingRounds,
                sourceAbility: ability,
              });
            }
            break;

          case 'Greed': // الجشع (في حال الفوز +1 هجوم لكل الكروت لك)
            if (result.winner === 'player' && remainingRounds > 0) {
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: 'attack',
                value: 1,
                roundsLeft: remainingRounds,
                sourceAbility: ability,
              });
            }
            break;

          case 'Lifesteal': // سرقة الحياة (مع الفوز ترجع نقطة صحة)
            if (result.winner === 'player') {
              finalPlayerScore = Math.min(finalPlayerScore + 1, 3); // حد أقصى 3
            }
            break;

          case 'Revenge': // الانتقام (في حال الخسارة +1 هجوم لكل الكروت لك)
            if (result.winner === 'bot' && remainingRounds > 0) {
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: 'attack',
                value: 1,
                roundsLeft: remainingRounds,
                sourceAbility: ability,
              });
            }
            break;

          case 'Compensation': // التعويض (في حال الخسارة +1 دفاع لكل الكروت لك)
            if (result.winner === 'bot' && remainingRounds > 0) {
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: 'defense',
                value: 1,
                roundsLeft: remainingRounds,
                sourceAbility: ability,
              });
            }
            break;

          case 'Suicide': // الانتحار (مع الخسارة ينقص الخصم نقطة)
            if (result.winner === 'bot') {
              finalBotScore = Math.max(0, finalBotScore - 1);
            }
            break;

          case 'Weakening': // الإضعاف (في حال الخسارة -1 هجوم للخصم)
            if (result.winner === 'bot' && remainingRounds > 0) {
              postRoundEffects.push({
                type: 'debuff',
                target: 'bot',
                stat: 'attack',
                value: -1,
                roundsLeft: remainingRounds,
                sourceAbility: ability,
              });
            }
            break;

          case 'Explosion': // الانفجار (في حال الخسارة -1 دفاع لكل كروت الخصم)
            if (result.winner === 'bot' && remainingRounds > 0) {
              postRoundEffects.push({
                type: 'debuff',
                target: 'bot',
                stat: 'defense',
                value: -1,
                roundsLeft: remainingRounds,
                sourceAbility: ability,
              });
            }
            break;

          case 'DoubleOrNothing': // دبل أو نثنق
            if (result.winner === 'player') {
              finalPlayerScore = Math.min(finalPlayerScore + 1, 3);
            } else if (result.winner === 'bot') {
              finalPlayerScore = Math.max(0, finalPlayerScore - 2);
            }
            break;

          case 'Sacrifice': // تضحية (تشيل خاصية خصم في حال الخسارة)
            if (result.winner === 'bot') {
              // منطق إزالة قدرة من البوت
              // يمكن تنفيذه لاحقاً
            }
            break;

          case 'ConsecutiveLossBuff': // تعزيز الخسارة
            // التحقق من خسارتين متتاليتين
            const lastTwo = state.roundResults.slice(-2);
            if (lastTwo.length === 2 && 
                lastTwo.every(r => r.winner === 'bot') && 
                remainingRounds > 0) {
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: 'all',
                value: 1,
                roundsLeft: remainingRounds,
                sourceAbility: ability,
              });
            }
            break;
        }
      });

      // دمج التأثيرات الجديدة مع التأثيرات النشطة
      const finalActiveEffects = [...nextActiveEffects, ...postRoundEffects];

      return {
        ...state,
        currentRound: state.currentRound + 1,
        playerScore: finalPlayerScore,
        botScore: finalBotScore,
        roundResults: [...state.roundResults, roundResult],
        activeEffects: finalActiveEffects,
        usedAbilities: [], // مسح القدرات المستخدمة بعد التطبيق
      };
    }

    case 'USE_ABILITY': {
      const { abilityType, isPlayer } = action.payload;
      const executor = abilityExecutors[abilityType];
      
      if (!executor) {
        console.warn(`No executor found for ability: ${abilityType}`);
        return state;
      }

      // التحقق من الختم (Seal)
      const sealEffect = state.activeEffects.find(
        (e) => e.type === 'seal' && 
               e.target === (isPlayer ? 'player' : 'bot') && 
               e.stat === 'ability'
      );

      if (sealEffect) {
        console.log(`⛔ القدرة ${abilityType} مختومة!`);
        return state;
      }

      const abilityStateList = isPlayer ? state.playerAbilities : state.botAbilities;
      const abilityIndex = abilityStateList.findIndex(a => a.type === abilityType && !a.used);

      if (abilityIndex === -1) {
        console.warn(`القدرة ${abilityType} غير متاحة أو مستخدمة بالفعل`);
        return state;
      }

      // تنفيذ القدرة
      const result = executor(state, isPlayer);

      // تحديث حالة القدرة إلى مستخدمة
      const newAbilityStateList = [...abilityStateList];
      newAbilityStateList[abilityIndex] = { 
        ...newAbilityStateList[abilityIndex], 
        used: true 
      };

      // تحديث حالة اللعبة
      let newState: GameState = {
        ...state,
        activeEffects: [...state.activeEffects, ...result.newEffects],
        usedAbilities: [...state.usedAbilities, abilityType],
        playerAbilities: isPlayer ? newAbilityStateList : state.playerAbilities,
        botAbilities: isPlayer ? state.botAbilities : newAbilityStateList,
        playerScore: result.newPlayerScore !== undefined ? result.newPlayerScore : state.playerScore,
        botScore: result.newBotScore !== undefined ? result.newBotScore : state.botScore,
      };

      // معالجة القدرات الخاصة
      if (abilityType === 'Wipe') {
        // المسح: إزالة جميع التأثيرات السلبية عن اللاعب
        const target = isPlayer ? 'player' : 'bot';
        newState.activeEffects = newState.activeEffects.filter(
          e => !(e.target === target && e.type === 'debuff')
        );
      }

      if (abilityType === 'Purge') {
        // التطهير: إزالة جميع التأثيرات
        newState.activeEffects = [];
      }

      if (abilityType === 'ConvertDebuffsToBuffs') {
        // تحويل النيرفات لبفات
        const target = isPlayer ? 'player' : 'bot';
        newState.activeEffects = newState.activeEffects.map(e => {
          if (e.target === target && e.type === 'debuff') {
            return { ...e, type: 'buff', value: Math.abs(e.value) };
          }
          return e;
        });
      }

      if (abilityType === 'TakeIt') {
        // خذها وأنا بو مبارك: نقل النيرفات للخصم
        const myTarget = isPlayer ? 'player' : 'bot';
        const opponentTarget = isPlayer ? 'bot' : 'player';
        newState.activeEffects = newState.activeEffects.map(e => {
          if (e.target === myTarget && e.type === 'debuff') {
            return { ...e, target: opponentTarget };
          }
          return e;
        });
      }

      if (abilityType === 'Deprivation') {
        // السلب: إزالة بفات الخصم
        const opponentTarget = isPlayer ? 'bot' : 'player';
        newState.activeEffects = newState.activeEffects.filter(
          e => !(e.target === opponentTarget && e.type === 'buff')
        );
      }

      if (abilityType === 'DoubleYourBuffs') {
        // مضاعفة البفات
        const target = isPlayer ? 'player' : 'bot';
        const myBuffs = newState.activeEffects.filter(
          e => e.target === target && e.type === 'buff'
        );
        const doubledBuffs = myBuffs.map(e => ({
          ...e,
          value: e.value * 2,
          sourceAbility: 'DoubleYourBuffs' as AbilityType,
        }));
        
        // استبدال البفات القديمة بالمضاعفة
        newState.activeEffects = [
          ...newState.activeEffects.filter(
            e => !(e.target === target && e.type === 'buff')
          ),
          ...doubledBuffs,
        ];
      }

      if (abilityType === 'Conversion') {
        // التحويل: تحويل بفات الخصم لنيرفات
        const opponentTarget = isPlayer ? 'bot' : 'player';
        newState.activeEffects = newState.activeEffects.map(e => {
          if (e.target === opponentTarget && e.type === 'buff') {
            return { ...e, type: 'debuff', value: -Math.abs(e.value) };
          }
          return e;
        });
      }

      if (abilityType === 'Skip') {
        // تخطي: لا يحدث شيء (مفيد للاستراتيجية)
        console.log('⏭️ تم تخطي الدور');
      }

      return newState;
    }

    case 'ADD_EFFECT':
      return {
        ...state,
        activeEffects: [...state.activeEffects, action.payload],
      };

    case 'REMOVE_EFFECTS': {
      const { target, type } = action.payload;
      return {
        ...state,
        activeEffects: state.activeEffects.filter(effect => {
          const targetMatch = target === 'all' || effect.target === target;
          const typeMatch = type === 'all' || effect.type === type;
          return !(targetMatch && typeMatch);
        }),
      };
    }

    case 'SET_DIFFICULTY':
      return {
        ...state,
        difficulty: action.payload,
      };

    case 'RESET_GAME':
      return { ...initialState, difficulty: state.difficulty };

    default:
      return state;
  }
}

// السياق
interface GameContextType {
  state: GameState;
  difficulty: DifficultyLevel;
  setPlayerDeck: (cards: Card[]) => void;
  setTotalRounds: (rounds: number) => void;
  startBattle: (playerDeck?: Card[]) => void;
  playRound: () => void;
  addEffect: (effect: ActiveEffect) => void;
  removeEffects: (target: 'player' | 'bot' | 'all', type: 'buff' | 'debuff' | 'all') => void;
  useAbility: (abilityType: AbilityType) => void;
  resetGame: () => void;
  setDifficulty: (level: DifficultyLevel) => void;
  isGameOver: boolean;
  currentPlayerCard: Card | null;
  currentBotCard: Card | null;
  lastRoundResult: RoundResult | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// المزود
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [difficulty, setDifficultyState] = useState<DifficultyLevel>(initialDifficulty);

  const setPlayerDeck = (cards: Card[]) => {
    dispatch({ type: 'SET_PLAYER_DECK', payload: cards });
  };

  const setTotalRounds = (rounds: number) => {
    dispatch({ type: 'SET_TOTAL_ROUNDS', payload: rounds });
  };

  const startBattle = (playerDeck?: Card[]) => {
    const deck = playerDeck || state.playerDeck;
    const botDeck = getBotCards(deck.length, difficulty, deck);
    dispatch({ type: 'SET_BOT_DECK', payload: botDeck });
    dispatch({ type: 'START_BATTLE' });
  };

  const playRound = () => {
    dispatch({ type: 'PLAY_ROUND' });
  };

  const addEffect = (effect: ActiveEffect) => {
    dispatch({ type: 'ADD_EFFECT', payload: effect });
  };

  const removeEffects = (target: 'player' | 'bot' | 'all', type: 'buff' | 'debuff' | 'all') => {
    dispatch({ type: 'REMOVE_EFFECTS', payload: { target, type } });
  };

  const useAbility = (abilityType: AbilityType) => {
    dispatch({ type: 'USE_ABILITY', payload: { abilityType, isPlayer: true } });
  };

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const setDifficulty = (level: DifficultyLevel) => {
    setDifficultyState(level);
    dispatch({ type: 'SET_DIFFICULTY', payload: level });
  };

  const isGameOver = state.currentRound >= state.totalRounds && state.totalRounds > 0;

  const currentPlayerCard = state.currentRound < state.totalRounds
    ? state.playerDeck[state.currentRound]
    : null;

  const currentBotCard = state.currentRound < state.totalRounds
    ? state.botDeck[state.currentRound]
    : null;

  const lastRoundResult = state.roundResults.length > 0
    ? state.roundResults[state.roundResults.length - 1]
    : null;

  return (
    <GameContext.Provider
      value={{
        state,
        difficulty,
        setPlayerDeck,
        setTotalRounds,
        startBattle,
        playRound,
        addEffect,
        removeEffects,
        useAbility,
        resetGame,
        setDifficulty,
        isGameOver,
        currentPlayerCard,
        currentBotCard,
        lastRoundResult,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

// هوك للاستخدام
export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
