import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { MultiplayerWebSocketClient, GameMessage } from './websocket-client';
import { Card } from '../game/types';
import Constants from 'expo-constants';

// أنواع حالة اللعب الجماعي
interface MultiplayerState {
  isConnected: boolean;
  roomId: string | null;
  playerId: string;
  playerName: string;
  opponentId: string | null;
  opponentName: string | null;
  isHost: boolean;
  isPlayerReady: boolean;
  isOpponentReady: boolean;
  playerCards: Card[];
  opponentCards: Card[];
  currentRound: number;
  playerScore: number;
  opponentScore: number;
  status: 'idle' | 'waiting' | 'ready' | 'playing' | 'finished';
}

// أنواع الإجراءات
type MultiplayerAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_ROOM'; payload: { roomId: string; isHost: boolean } }
  | { type: 'SET_OPPONENT'; payload: { opponentId: string; opponentName: string } }
  | { type: 'SET_PLAYER_READY'; payload: boolean }
  | { type: 'SET_OPPONENT_READY'; payload: boolean }
  | { type: 'SET_PLAYER_CARDS'; payload: Card[] }
  | { type: 'SET_OPPONENT_CARDS'; payload: Card[] }
  | { type: 'START_BATTLE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'UPDATE_SCORE'; payload: { playerScore: number; opponentScore: number } }
  | { type: 'SET_STATUS'; payload: MultiplayerState['status'] }
  | { type: 'RESET' };

// الحالة الأولية
const initialState: MultiplayerState = {
  isConnected: false,
  roomId: null,
  playerId: '',
  playerName: '',
  opponentId: null,
  opponentName: null,
  isHost: false,
  isPlayerReady: false,
  isOpponentReady: false,
  playerCards: [],
  opponentCards: [],
  currentRound: 0,
  playerScore: 0,
  opponentScore: 0,
  status: 'idle',
};

// المخفض
function multiplayerReducer(state: MultiplayerState, action: MultiplayerAction): MultiplayerState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
      
    case 'SET_ROOM':
      return {
        ...state,
        roomId: action.payload.roomId,
        isHost: action.payload.isHost,
        status: 'waiting',
      };
      
    case 'SET_OPPONENT':
      return {
        ...state,
        opponentId: action.payload.opponentId,
        opponentName: action.payload.opponentName,
      };
      
    case 'SET_PLAYER_READY':
      return { ...state, isPlayerReady: action.payload };
      
    case 'SET_OPPONENT_READY':
      return { ...state, isOpponentReady: action.payload };
      
    case 'SET_PLAYER_CARDS':
      return { ...state, playerCards: action.payload };
      
    case 'SET_OPPONENT_CARDS':
      return { ...state, opponentCards: action.payload };
      
    case 'START_BATTLE':
      return { ...state, status: 'playing', currentRound: 0 };
      
    case 'NEXT_ROUND':
      return { ...state, currentRound: state.currentRound + 1 };
      
    case 'UPDATE_SCORE':
      return {
        ...state,
        playerScore: action.payload.playerScore,
        opponentScore: action.payload.opponentScore,
      };
      
    case 'SET_STATUS':
      return { ...state, status: action.payload };
      
    case 'RESET':
      return { ...initialState, playerId: state.playerId, playerName: state.playerName };
      
    default:
      return state;
  }
}

// السياق
interface MultiplayerContextType {
  state: MultiplayerState;
  wsClient: MultiplayerWebSocketClient | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  setPlayerCards: (cards: Card[], rounds: number) => void;
  setPlayerReady: (isReady: boolean) => void;
  revealCard: (roundIndex: number, card: Card) => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

// المزود
export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(multiplayerReducer, {
    ...initialState,
    playerId: generatePlayerId(),
  });
  
  const wsClientRef = useRef<MultiplayerWebSocketClient | null>(null);
  
  // الحصول على URL الخادم
  const getServerUrl = () => {
    const apiUrl = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/multiplayer';
    return wsUrl;
  };
  
  // الاتصال بالخادم
  const connect = async () => {
    if (wsClientRef.current?.isConnected()) {
      return;
    }
    
    const serverUrl = getServerUrl();
    wsClientRef.current = new MultiplayerWebSocketClient(serverUrl);
    
    // إضافة معالج الرسائل
    wsClientRef.current.onMessage(handleMessage);
    
    try {
      await wsClientRef.current.connect();
      dispatch({ type: 'SET_CONNECTED', payload: true });
    } catch (error) {
      console.error('[Multiplayer] Connection failed:', error);
      dispatch({ type: 'SET_CONNECTED', payload: false });
    }
  };
  
  // قطع الاتصال
  const disconnect = () => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
    dispatch({ type: 'SET_CONNECTED', payload: false });
  };
  
  // معالجة الرسائل الواردة
  const handleMessage = (message: GameMessage) => {
    const { type, payload } = message;
    
    switch (type) {
      case 'ROOM_CREATED':
        dispatch({
          type: 'SET_ROOM',
          payload: { roomId: payload.roomId, isHost: true },
        });
        break;
        
      case 'ROOM_JOINED':
        dispatch({
          type: 'SET_ROOM',
          payload: { roomId: payload.roomId, isHost: false },
        });
        if (payload.player1) {
          dispatch({
            type: 'SET_OPPONENT',
            payload: {
              opponentId: payload.player1.id,
              opponentName: payload.player1.name,
            },
          });
        }
        break;
        
      case 'PLAYER_JOINED':
        dispatch({
          type: 'SET_OPPONENT',
          payload: {
            opponentId: payload.player.id,
            opponentName: payload.player.name,
          },
        });
        break;
        
      case 'OPPONENT_READY':
        dispatch({ type: 'SET_OPPONENT_READY', payload: payload.isReady });
        break;
        
      case 'BATTLE_START':
        dispatch({ type: 'START_BATTLE' });
        // تحديث بطاقات اللاعبين
        const isPlayer1 = payload.player1.id === state.playerId;
        if (isPlayer1) {
          dispatch({ type: 'SET_PLAYER_CARDS', payload: payload.player1.cards });
          dispatch({ type: 'SET_OPPONENT_CARDS', payload: payload.player2.cards });
        } else {
          dispatch({ type: 'SET_PLAYER_CARDS', payload: payload.player2.cards });
          dispatch({ type: 'SET_OPPONENT_CARDS', payload: payload.player1.cards });
        }
        break;
        
      case 'OPPONENT_CARD_REVEALED':
        // معالجة كشف بطاقة الخصم
        break;
        
      case 'PLAYER_LEFT':
      case 'OPPONENT_DISCONNECTED':
        dispatch({ type: 'SET_STATUS', payload: 'idle' });
        // يمكن إضافة إشعار للمستخدم
        break;
        
      case 'ERROR':
        console.error('[Multiplayer] Server error:', payload.error);
        break;
    }
  };
  
  // إنشاء غرفة
  const createRoom = (playerName: string) => {
    if (!wsClientRef.current?.isConnected()) {
      console.error('[Multiplayer] Not connected to server');
      return;
    }
    
    wsClientRef.current.send({
      type: 'CREATE_ROOM',
      payload: {
        playerId: state.playerId,
        playerName,
      },
    });
  };
  
  // الانضمام لغرفة
  const joinRoom = (roomId: string, playerName: string) => {
    if (!wsClientRef.current?.isConnected()) {
      console.error('[Multiplayer] Not connected to server');
      return;
    }
    
    wsClientRef.current.send({
      type: 'JOIN_ROOM',
      payload: {
        roomId,
        playerId: state.playerId,
        playerName,
      },
    });
  };
  
  // مغادرة الغرفة
  const leaveRoom = () => {
    if (!wsClientRef.current?.isConnected()) {
      return;
    }
    
    wsClientRef.current.send({
      type: 'LEAVE_ROOM',
      payload: {
        playerId: state.playerId,
      },
    });
    
    dispatch({ type: 'RESET' });
  };
  
  // تحديد بطاقات اللاعب
  const setPlayerCards = (cards: Card[], rounds: number) => {
    if (!wsClientRef.current?.isConnected()) {
      return;
    }
    
    dispatch({ type: 'SET_PLAYER_CARDS', payload: cards });
    
    wsClientRef.current.send({
      type: 'SET_CARDS',
      payload: {
        playerId: state.playerId,
        cards,
        rounds,
      },
    });
  };
  
  // تحديد جاهزية اللاعب
  const setPlayerReady = (isReady: boolean) => {
    if (!wsClientRef.current?.isConnected()) {
      return;
    }
    
    dispatch({ type: 'SET_PLAYER_READY', payload: isReady });
    
    wsClientRef.current.send({
      type: 'PLAYER_READY',
      payload: {
        playerId: state.playerId,
        isReady,
      },
    });
  };
  
  // كشف البطاقة
  const revealCard = (roundIndex: number, card: Card) => {
    if (!wsClientRef.current?.isConnected()) {
      return;
    }
    
    wsClientRef.current.send({
      type: 'REVEAL_CARD',
      payload: {
        playerId: state.playerId,
        roundIndex,
        card,
      },
    });
  };
  
  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);
  
  const value: MultiplayerContextType = {
    state,
    wsClient: wsClientRef.current,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    setPlayerCards,
    setPlayerReady,
    revealCard,
  };
  
  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
}

// Hook للوصول للسياق
export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within MultiplayerProvider');
  }
  return context;
}

// دالة مساعدة لتوليد معرف اللاعب
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
