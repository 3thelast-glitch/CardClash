import React, { createContext, useContext, useReducer, useState, ReactNode } from 'react';
import { Card, GameState, RoundResult, ActiveEffect } from './types';
import { executeAbility } from './abilities';
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
  | { type: 'SET_DIFFICULTY'; payload: DifficultyLevel };

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
      };

    case 'PLAY_ROUND': {
      if (state.currentRound >= state.totalRounds) {
        return state;
      }

      const playerCard = state.playerDeck[state.currentRound];
      const botCard = state.botDeck[state.currentRound];
      
      // تصفية التأثيرات حسب الهدف
      const playerEffects = state.activeEffects.filter(e => e.target === 'player' || e.target === 'all');
      const botEffects = state.activeEffects.filter(e => e.target === 'bot' || e.target === 'all');
      
      // 1. تنفيذ قدرة اللاعب
      const playerAbilityResult = executeAbility(playerCard, botCard, state, true);
      
      // 2. تنفيذ قدرة البوت
      const botAbilityResult = executeAbility(botCard, playerCard, state, false);

      // 2.5. معالجة قدرات المسح والتطهير
      let currentEffects = [...state.activeEffects];
      
      if (playerCard.ability === 'Wipe') {
        // المسح (امسح اي تأثيرات عليك فاللعبة)
        currentEffects = currentEffects.filter(e => !(e.target === 'player' && e.type === 'debuff'));
      }
      if (playerCard.ability === 'Purge') {
        // التطهير (نظف كل التأثيرات فاللعبة)
        currentEffects = [];
      }
      
      // دمج التأثيرات الجديدة مع التأثيرات الحالية
      let newActiveEffects = [
        ...currentEffects,
        ...playerAbilityResult.newEffects,
        ...botAbilityResult.newEffects,
      ];
      
      // تصفية التأثيرات الجديدة حسب الهدف لتطبيقها في الجولة الحالية
      const allPlayerEffects = newActiveEffects.filter(e => e.target === 'player' || e.target === 'all');
      const allBotEffects = newActiveEffects.filter(e => e.target === 'bot' || e.target === 'all');

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
      const nextActiveEffects = newActiveEffects
        .map(effect => ({ ...effect, roundsLeft: effect.roundsLeft - 1 }))
        .filter(effect => effect.roundsLeft > 0);

      // 5. تطبيق تأثيرات ما بعد الجولة (مثل Reinforcement, Revenge, Lifesteal)
      let finalScore = {
        playerScore: result.winner === 'player' ? state.playerScore + 1 : state.playerScore,
        botScore: result.winner === 'bot' ? state.botScore + 1 : state.botScore,
      };
      
      // 5. تطبيق تأثيرات ما بعد الجولة (مثل Reinforcement, Revenge, Lifesteal)
      let postRoundEffects: ActiveEffect[] = [];
      let finalPlayerScore = finalScore.playerScore;
      let finalBotScore = finalScore.botScore;

      // قدرات اللاعب التي تعتمد على نتيجة الجولة
      if (playerCard.ability) {
        switch (playerCard.ability) {
          case 'Reinforcement': // التدعيم (في حال الفوز +1 دفاع لكل الكروت لك)
          case 'Greed': // الجشع (في حال الفوز +1 هجوم لكل الكروت لك)
            if (result.winner === 'player') {
              const stat = playerCard.ability === 'Reinforcement' ? 'defense' : 'attack';
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: stat,
                value: 1,
                roundsLeft: state.totalRounds - state.currentRound, // حتى نهاية اللعبة
                sourceAbility: playerCard.ability,
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
              const stat = playerCard.ability === 'Revenge' ? 'attack' : 'defense';
              postRoundEffects.push({
                type: 'buff',
                target: 'player',
                stat: stat,
                value: 1,
                roundsLeft: state.totalRounds - state.currentRound,
                sourceAbility: playerCard.ability,
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
                sourceAbility: playerCard.ability,
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
                sourceAbility: playerCard.ability,
              });
            }
            break;
          // القدرات المعقدة الأخرى سيتم إضافتها لاحقاً
        }
      }

      // قدرات البوت التي تعتمد على نتيجة الجولة (للتوازن)
      if (botCard.ability) {
        // يمكن إضافة منطق مماثل هنا إذا كان البوت يستخدم قدرات ما بعد الجولة
      }

      // دمج التأثيرات الجديدة مع التأثيرات النشطة
      const finalActiveEffects = [...nextActiveEffects, ...postRoundEffects];

      return {
        ...state,
        currentRound: state.currentRound + 1,
        playerScore: finalPlayerScore,
        botScore: finalBotScore,
        roundResults: [...state.roundResults, roundResult],
        activeEffects: finalActiveEffects,
      };
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
