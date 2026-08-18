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
  playerScore: 0,
  botScore: 0,
  roundResults: [],
  difficulty: 'medium',
  activeEffects: [], // إضافة التأثيرات النشطة
  playerAbilities: [], // القدرات الممنوحة للاعب
  botAbilities: [], // القدرات الممنوحة للبوت
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
        playerScore: 0,
        botScore: 0,
        roundResults: [],
        activeEffects: [], // إعادة تعيين التأثيرات عند بدء معركة جديدة
        playerAbilities: getRandomAbilities(3).map(type => ({ type, used: false })), // توزيع 3 قدرات عشوائية للاعب
        botAbilities: getRandomAbilities(3).map(type => ({ type, used: false })), // توزيع 3 قدرات عشوائية للبوت
        usedAbilities: [],
      };

    case 'PLAY_ROUND': {
      if (state.currentRound >= state.totalRounds) {
        return state;
      }

      const playerCard = state.playerDeck[state.currentRound];
      const botCard = state.botDeck[state.currentRound];

      // تصفية التأثيرات حسب الهدف
      const allPlayerEffects = state.activeEffects.filter(e => e.target === 'player' || e.target === 'all');
      const allBotEffects = state.activeEffects.filter(e => e.target === 'bot' || e.target === 'all');

      // 3. تحديد الفائز بعد تطبيق التأثيرات
      const result = determineRoundWinner(playerCard, botCard, allPlayerEffects, allBotEffects);

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

      // 4. تحديث عدد الجولات المتبقية للتأثيرات النشطة
      const nextActiveEffects = state.activeEffects
        .map(effect => ({ ...effect, roundsLeft: effect.roundsLeft - 1 }))
        .filter(effect => effect.roundsLeft > 0);

      // 5. تطبيق تأثيرات ما بعد الجولة (مثل Reinforcement, Revenge, Lifesteal)
      let postRoundEffects: ActiveEffect[] = [];
      let finalPlayerScore = result.winner === 'player' ? state.playerScore + 1 : state.playerScore;
      let finalBotScore = result.winner === 'bot' ? state.botScore + 1 : state.botScore;

      // القدرات التي تم استخدامها في هذه الجولة وتعتمد على نتيجة الجولة
      const usedAbilitiesInThisRound = state.usedAbilities.filter(
        (ability) =>
          ability === 'Reinforcement' ||
          ability === 'Greed' ||
          ability === 'Lifesteal' ||
          ability === 'Revenge' ||
          ability === 'Compensation' ||
          ability === 'Suicide' ||
          ability === 'Weakening' ||
          ability === 'Explosion' ||
          ability === 'DoubleOrNothing' ||
          ability === 'Sacrifice'
      );

      usedAbilitiesInThisRound.forEach((ability) => {
        switch (ability) {
          case 'Reinforcement': // التدعيم (في حال الفوز +1 دفاع لكل الكروت لك)
          case 'Greed': // الجشع (في حال الفوز +1 هجوم لكل الكروت لك)
            if (result.winner === 'player') {
              const stat = ability === 'Reinforcement' ? 'defense' : 'attack';
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: stat,
                value: 1,
                roundsLeft: state.totalRounds - state.currentRound, // حتى نهاية اللعبة
                sourceAbility: ability,
              });
            }
            break;

          case 'Lifesteal': // اللايف ستيل (مع الفوز ترجع نقطة صحة)
            if (result.winner === 'player') {
              finalPlayerScore += 1;
            }
            break;

          case 'Revenge': // الانتقام (في حال الخسارة +1 هجوم لكل الكروت لك)
          case 'Compensation': // التعويض (في حال الخسارة +1 دفاع لكل الكروت لك)
            if (result.winner === 'bot') {
              const stat = ability === 'Revenge' ? 'attack' : 'defense';
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: stat,
                value: 1,
                roundsLeft: state.totalRounds - state.currentRound,
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
            if (result.winner === 'bot') {
              postRoundEffects.push({
                type: 'debuff',
                target: 'bot',
                stat: 'attack',
                value: -1,
                roundsLeft: state.totalRounds - state.currentRound,
                sourceAbility: ability,
              });
            }
            break;

          case 'Explosion': // الانفجار (في حال الخسارة -1 دفاع لكل كروت الخصم)
            if (result.winner === 'bot') {
              postRoundEffects.push({
                type: 'debuff',
                target: 'bot',
                stat: 'defense',
                value: -1,
                roundsLeft: state.totalRounds - state.currentRound,
                sourceAbility: ability,
              });
            }
            break;

          case 'DoubleOrNothing': // دبل أور نثنق: إذا فزت +1 صحة، وإذا خسرت -2 صحة
            if (result.winner === 'player') {
              finalPlayerScore += 1;
            } else if (result.winner === 'bot') {
              finalPlayerScore = Math.max(0, finalPlayerScore - 2);
            }
            break;

          case 'Sacrifice': // تضحية: عند الخسارة تزال خاصية من خصمك
            // يتم تطبيق هذا المنطق في مكان آخر (ربما في playRound)
            break;
        }
      });

      // قدرات البوت التي تعتمد على نتيجة الجولة (للتوازن)
      // لا يوجد تنفيذ تلقائي للقدرات هنا، يتم تنفيذها عبر إجراء USE_ABILITY

      // دمج التأثيرات الجديدة مع التأثيرات النشطة
      const finalActiveEffects = [...nextActiveEffects, ...postRoundEffects];

      return {
        ...state,
        currentRound: state.currentRound + 1,
        playerScore: finalPlayerScore,
        botScore: finalBotScore,
        roundResults: [...state.roundResults, roundResult],
        activeEffects: finalActiveEffects,
        usedAbilities: [], // مسح القدرات المستخدمة في هذه الجولة
      };
    }

    case 'USE_ABILITY': {
      const { abilityType, isPlayer } = action.payload;
      const executor = abilityExecutors[abilityType];
      if (!executor) return state;

      // التحقق من الختم (Seal)
      const sealEffect = state.activeEffects.find(
        (e) => e.type === 'seal' && e.target === (isPlayer ? 'player' : 'bot') && e.stat === 'ability'
      );

      if (sealEffect) {
        console.log(`Ability ${abilityType} is sealed for ${isPlayer ? 'player' : 'bot'}`);
        return state;
      }

      const abilityStateList = isPlayer ? state.playerAbilities : state.botAbilities;
      const abilityIndex = abilityStateList.findIndex(a => a.type === abilityType && !a.used);

      if (abilityIndex === -1) return state; // القدرة غير متاحة أو مستخدمة

      const result = executor(state, isPlayer);

      // تحديث حالة القدرة إلى مستخدمة
      const newAbilityStateList = [...abilityStateList];
      newAbilityStateList[abilityIndex] = { ...newAbilityStateList[abilityIndex], used: true };

      // تحديث حالة اللعبة
      let newState = {
        ...state,
        activeEffects: [...state.activeEffects, ...result.newEffects],
        usedAbilities: [...state.usedAbilities, abilityType],
        playerAbilities: isPlayer ? newAbilityStateList : state.playerAbilities,
        botAbilities: isPlayer ? state.botAbilities : newAbilityStateList,
        playerScore: result.newPlayerScore !== undefined ? result.newPlayerScore : state.playerScore,
        botScore: result.newBotScore !== undefined ? result.newBotScore : state.botScore,
      };

      // معالجة قدرات المسح والتطهير والتحويل
      if (abilityType === 'Wipe') {
        newState.activeEffects = newState.activeEffects.filter(e => !(e.target === 'player' && e.type === 'debuff'));
      }

      if (abilityType === 'Purge') {
        newState.activeEffects = [];
      }

      if (abilityType === 'ConvertDebuffsToBuffs') {
        // تحويل النيرفات عليك لبفات
        newState.activeEffects = newState.activeEffects.map(e => {
          if (e.target === 'player' && e.type === 'debuff') {
            return { ...e, type: 'buff', value: Math.abs(e.value) };
          }
          return e;
        });
      }

      if (abilityType === 'TakeIt') {
        // خذها وانا بو مبارك: اعطي النيرفات للخصم
        newState.activeEffects = newState.activeEffects.map(e => {
          if (e.target === 'player' && e.type === 'debuff') {
            return { ...e, target: 'bot' };
          }
          return e;
        });
      }

      if (abilityType === 'Deprivation') {
        // السلب: اسلب الخصم من البفات
        newState.activeEffects = newState.activeEffects.filter(e => !(e.target === 'bot' && e.type === 'buff'));
      }

      if (abilityType === 'DoubleYourBuffs') {
        // دبل البفات لك
        const playerBuffs = newState.activeEffects.filter(e => e.target === 'player' && e.type === 'buff');
        const doubledBuffs = playerBuffs.map(e => ({ ...e, value: e.value * 2, sourceAbility: 'DoubleYourBuffs' as AbilityType }));
        newState.activeEffects = [...newState.activeEffects.filter(e => !(e.target === 'player' && e.type === 'buff')), ...doubledBuffs];
      }

      if (abilityType === 'Conversion') {
        // التحويل: حول بفات الخصم لنيرفات
        newState.activeEffects = newState.activeEffects.map(e => {
          if (e.target === 'bot' && e.type === 'buff') {
            return { ...e, type: 'debuff', value: -e.value };
          }
          return e;
        });
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
    // توليد بطاقات البوت حسب مستوى الصعوبة
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
        resetGame,
        setDifficulty,
        isGameOver,
        currentPlayerCard,
        currentBotCard,
        lastRoundResult,
        addEffect,
        removeEffects,
        useAbility,
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
