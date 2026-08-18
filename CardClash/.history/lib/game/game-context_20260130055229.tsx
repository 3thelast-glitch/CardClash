import React, { createContext, useContext, useReducer, useState, ReactNode } from 'react';
import { Card, GameState, RoundResult } from './types';
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
};

const initialDifficulty: DifficultyLevel = 'medium';

// أنواع الإجراءات
type GameAction =
  | { type: 'SET_PLAYER_DECK'; payload: Card[] }
  | { type: 'SET_BOT_DECK'; payload: Card[] }
  | { type: 'START_BATTLE' }
  | { type: 'PLAY_ROUND' }
  | { type: 'RESET_GAME' }
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

    case 'START_BATTLE':
      return {
        ...state,
        currentRound: 0,
        playerScore: 0,
        botScore: 0,
        roundResults: [],
      };

    case 'PLAY_ROUND': {
      if (state.currentRound >= state.totalRounds) {
        return state;
      }

      const playerCard = state.playerDeck[state.currentRound];
      const botCard = state.botDeck[state.currentRound];
      const result = determineRoundWinner(playerCard, botCard);

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

      return {
        ...state,
        currentRound: state.currentRound + 1,
        playerScore: result.winner === 'player' ? state.playerScore + 1 : state.playerScore,
        botScore: result.winner === 'bot' ? state.botScore + 1 : state.botScore,
        roundResults: [...state.roundResults, roundResult],
      };
    }

    case 'SET_DIFFICULTY':
      return {
        ...state,
        difficulty: action.payload,
      };

    case 'RESET_GAME':
      return initialState;

    default:
      return state;
  }
}

// السياق
interface GameContextType {
  state: GameState;
  difficulty: DifficultyLevel;
  setPlayerDeck: (cards: Card[]) => void;
  startBattle: () => void;
  playRound: () => void;
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

  const startBattle = () => {
    // توليد بطاقات البوت حسب مستوى الصعوبة
    const botDeck = getBotCards(state.playerDeck.length, difficulty, state.playerDeck);
    dispatch({ type: 'SET_BOT_DECK', payload: botDeck });
    dispatch({ type: 'START_BATTLE' });
  };

  const playRound = () => {
    dispatch({ type: 'PLAY_ROUND' });
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
        startBattle,
        playRound,
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
