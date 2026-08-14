import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { mpClient, MPMessage } from './websocket-client';
import { Card } from '../game/types';
import { DEFAULT_RANKED_PROFILE, loadRankedProfile, recordRankedResult, type RankedProfile } from './ranked-profile';

// ── URL ───────────────────────────────────────────────────────────────────
// يقرأ من .env — EXPO_PUBLIC_MP_SERVER_URL
// نفس المتغير المستخدم في websocket-client.ts
const SERVER_URL =
  process.env.EXPO_PUBLIC_MP_SERVER_URL ??
  'ws://localhost:3001/multiplayer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoundResult {
  roundIndex: number;
  p1Card: any;
  p2Card: any;
  winner: 'player1' | 'player2' | 'draw';
  p1Score: number;
  p2Score: number;
  advantage: 'element' | 'attack' | 'draw';
}

export interface MatchSettings {
  rounds: number;
  withAbilities: boolean;
  rarityWeights: Record<string, number>;
}

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
  totalRounds: number;
  playerScore: number;
  opponentScore: number;
  opponentRevealedThisRound: boolean;
  lastRoundResult: RoundResult | null;
  gameOverWinner: 'player' | 'opponent' | 'draw' | null;
  status: 'idle' | 'waiting' | 'ready' | 'playing' | 'revealing' | 'result' | 'finished';
  reconnectGraceSeconds: number;
  pendingMatchSettings: MatchSettings | null;
  opponentArrangementReady: boolean;
  rankedProfile: RankedProfile;
  isRankedMatch: boolean;
  opponentRating: number | null;
  matchmaking: {
    status: 'idle' | 'searching' | 'matched';
    position: number | null;
    searchRange: number | null;
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type MultiplayerAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_ROOM'; payload: { roomId: string; isHost: boolean } }
  | { type: 'SET_OPPONENT'; payload: { opponentId: string; opponentName: string } }
  | { type: 'SET_PLAYER_READY'; payload: boolean }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'SET_OPPONENT_READY'; payload: boolean }
  | { type: 'SET_PLAYER_CARDS'; payload: Card[] }
  | { type: 'START_BATTLE'; payload: { totalRounds: number; p1Score: number; p2Score: number; isHost: boolean; p1Cards: Card[]; p2Cards: Card[] } }
  | { type: 'OPPONENT_REVEALED' }
  | { type: 'ROUND_RESULT'; payload: RoundResult }
  | { type: 'NEXT_ROUND' }
  | { type: 'GAME_OVER'; payload: { winner: 'player1' | 'player2' | 'draw'; p1Score: number; p2Score: number } }
  | { type: 'OPPONENT_DISCONNECTED'; payload: { grace: number } }
  | { type: 'TICK_GRACE' }
  | { type: 'OPPONENT_RECONNECTED' }
  | { type: 'SET_STATUS'; payload: MultiplayerState['status'] }
  | { type: 'SET_PENDING_MATCH_SETTINGS'; payload: MatchSettings }
  | { type: 'SET_OPPONENT_ARRANGEMENT_READY' }
  | { type: 'SET_RANK_PROFILE'; payload: RankedProfile }
  | { type: 'SET_MATCHMAKING_QUEUE'; payload: { position: number | null; searchRange: number | null } }
  | { type: 'SET_MATCH_FOUND'; payload: { roomId: string; isHost: boolean; opponentId: string; opponentName: string; opponentRating: number } }
  | { type: 'CLEAR_MATCHMAKING' }
  | { type: 'RESET' };

// ─── Initial State ────────────────────────────────────────────────────────────

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
  totalRounds: 0,
  playerScore: 3,
  opponentScore: 3,
  opponentRevealedThisRound: false,
  lastRoundResult: null,
  gameOverWinner: null,
  status: 'idle',
  reconnectGraceSeconds: 0,
  pendingMatchSettings: null,
  opponentArrangementReady: false,
  rankedProfile: DEFAULT_RANKED_PROFILE,
  isRankedMatch: false,
  opponentRating: null,
  matchmaking: { status: 'idle', position: null, searchRange: null },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function multiplayerReducer(state: MultiplayerState, action: MultiplayerAction): MultiplayerState {
  switch (action.type) {
    case 'SET_CONNECTED': return { ...state, isConnected: action.payload };
    case 'SET_ROOM': return { ...state, roomId: action.payload.roomId, isHost: action.payload.isHost, status: 'waiting', matchmaking: { status: 'idle', position: null, searchRange: null } };
    case 'SET_OPPONENT': return { ...state, opponentId: action.payload.opponentId, opponentName: action.payload.opponentName };
    case 'SET_PLAYER_READY': return { ...state, isPlayerReady: action.payload };
    case 'SET_PLAYER_NAME': return { ...state, playerName: action.payload };
    case 'SET_OPPONENT_READY': return { ...state, isOpponentReady: action.payload };
    case 'SET_PLAYER_CARDS': return { ...state, playerCards: action.payload };
    case 'SET_PENDING_MATCH_SETTINGS': return { ...state, pendingMatchSettings: action.payload };
    case 'SET_OPPONENT_ARRANGEMENT_READY': return { ...state, opponentArrangementReady: true };
    case 'SET_RANK_PROFILE': return { ...state, rankedProfile: action.payload };
    case 'SET_MATCHMAKING_QUEUE': return { ...state, matchmaking: { status: 'searching', position: action.payload.position, searchRange: action.payload.searchRange } };
    case 'SET_MATCH_FOUND': return {
      ...state,
      roomId: action.payload.roomId,
      isHost: action.payload.isHost,
      opponentId: action.payload.opponentId,
      opponentName: action.payload.opponentName,
      opponentRating: action.payload.opponentRating,
      isRankedMatch: true,
      status: 'waiting',
      matchmaking: { status: 'matched', position: null, searchRange: null },
    };
    case 'CLEAR_MATCHMAKING': return { ...state, matchmaking: { status: 'idle', position: null, searchRange: null } };
    case 'START_BATTLE': {
      const { totalRounds, p1Score, p2Score, isHost, p1Cards, p2Cards } = action.payload;
      return { ...state, status: 'playing', currentRound: 0, totalRounds, playerScore: isHost ? p1Score : p2Score, opponentScore: isHost ? p2Score : p1Score, playerCards: isHost ? p1Cards : p2Cards, opponentCards: isHost ? p2Cards : p1Cards, opponentRevealedThisRound: false, lastRoundResult: null, opponentArrangementReady: false };
    }
    case 'OPPONENT_REVEALED': return { ...state, opponentRevealedThisRound: true };
    case 'ROUND_RESULT': {
      const r = action.payload;
      const playerIsP1 = state.isHost;
      return { ...state, lastRoundResult: r, playerScore: playerIsP1 ? r.p1Score : r.p2Score, opponentScore: playerIsP1 ? r.p2Score : r.p1Score, status: 'result', opponentRevealedThisRound: false };
    }
    case 'NEXT_ROUND': return { ...state, currentRound: state.currentRound + 1, status: 'playing', lastRoundResult: null, opponentRevealedThisRound: false };
    case 'GAME_OVER': {
      const { winner, p1Score, p2Score } = action.payload;
      const myWinner = state.isHost ? (winner === 'player1' ? 'player' : winner === 'player2' ? 'opponent' : 'draw') : (winner === 'player2' ? 'player' : winner === 'player1' ? 'opponent' : 'draw');
      return { ...state, status: 'finished', gameOverWinner: myWinner as any, playerScore: state.isHost ? p1Score : p2Score, opponentScore: state.isHost ? p2Score : p1Score };
    }
    case 'OPPONENT_DISCONNECTED': return { ...state, reconnectGraceSeconds: action.payload.grace };
    case 'TICK_GRACE': return { ...state, reconnectGraceSeconds: Math.max(0, state.reconnectGraceSeconds - 1) };
    case 'OPPONENT_RECONNECTED': return { ...state, reconnectGraceSeconds: 0 };
    case 'SET_STATUS': return { ...state, status: action.payload };
    case 'RESET': return { ...initialState, playerId: state.playerId, playerName: state.playerName, rankedProfile: state.rankedProfile };
    default: return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface MultiplayerContextType {
  state: MultiplayerState;
  wsClient: typeof mpClient | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  setPlayerCards: (cards: Card[], rounds: number) => void;
  setPlayerReady: (isReady: boolean) => void;
  revealCard: (roundIndex: number, card: Card) => void;
  advanceToNextRound: () => void;
  sendMatchSettings: (settings: MatchSettings) => void;
  sendArrangementReady: (cards: Card[]) => void;
  queueRankedMatch: (playerName: string) => void;
  cancelMatchmaking: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(multiplayerReducer, {
    ...initialState,
    playerId: generatePlayerId(),
  });
  const wsClientRef = useRef<typeof mpClient | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubscribeMessageRef = useRef<(() => void) | null>(null);
  const unsubscribeStatusRef = useRef<(() => void) | null>(null);
  const stateRef = useRef(state);
  const rankResultRoomRef = useRef<string | null>(null);
  const [pendingBattleStart, setPendingBattleStart] = React.useState<any>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;
    loadRankedProfile().then((profile) => {
      if (active) dispatch({ type: 'SET_RANK_PROFILE', payload: profile });
    });
    return () => { active = false; };
  }, []);

  const connect = useCallback(async () => {
    if (wsClientRef.current?.isConnected()) return;

    const client = mpClient;
    unsubscribeMessageRef.current?.();
    unsubscribeStatusRef.current?.();
    unsubscribeMessageRef.current = client.onAny(handleMessageWithBattle);
    unsubscribeStatusRef.current = client.onStatus((status) => {
      dispatch({ type: 'SET_CONNECTED', payload: status === 'connected' });
    });
    wsClientRef.current = client;

    try {
      await client.connect();
      dispatch({ type: 'SET_CONNECTED', payload: true });
    } catch {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      throw new Error('Connection failed');
    }
  }, []);

  const disconnect = useCallback(() => {
    unsubscribeMessageRef.current?.();
    unsubscribeStatusRef.current?.();
    unsubscribeMessageRef.current = null;
    unsubscribeStatusRef.current = null;
    wsClientRef.current?.disconnect();
    wsClientRef.current = null;
    dispatch({ type: 'SET_CONNECTED', payload: false });
  }, []);

  const send = useCallback((msg: MPMessage) => {
    wsClientRef.current?.send(msg.type, msg.payload);
  }, []);

  // ─── Message Handler ───────────────────────────────────────────────────────

  const handleMessage = useCallback((message: MPMessage) => {
    const { type, payload } = message;
    switch (type) {
      case 'ROOM_CREATED':
        dispatch({ type: 'SET_ROOM', payload: { roomId: payload.roomId, isHost: true } });
        break;
      case 'ROOM_JOINED':
        dispatch({ type: 'SET_ROOM', payload: { roomId: payload.roomId, isHost: false } });
        if (payload.player1) dispatch({ type: 'SET_OPPONENT', payload: { opponentId: payload.player1.id, opponentName: payload.player1.name } });
        break;
      case 'PLAYER_JOINED':
        dispatch({ type: 'SET_OPPONENT', payload: { opponentId: payload.player.id, opponentName: payload.player.name } });
        break;
      case 'MATCHMAKING_QUEUED':
        dispatch({ type: 'SET_MATCHMAKING_QUEUE', payload: { position: payload.position ?? null, searchRange: payload.searchRange ?? null } });
        break;
      case 'MATCHMAKING_CANCELLED':
        dispatch({ type: 'CLEAR_MATCHMAKING' });
        break;
      case 'MATCH_FOUND': {
        const snapshot = stateRef.current;
        const isHost = payload.player1?.id === snapshot.playerId;
        const opponent = isHost ? payload.player2 : payload.player1;
        if (!opponent) break;
        rankResultRoomRef.current = null;
        dispatch({
          type: 'SET_MATCH_FOUND',
          payload: {
            roomId: payload.roomId,
            isHost,
            opponentId: opponent.id,
            opponentName: opponent.name,
            opponentRating: opponent.rating ?? 1000,
          },
        });
        break;
      }
      case 'OPPONENT_READY':
        dispatch({ type: 'SET_OPPONENT_READY', payload: payload.isReady });
        break;
      case 'MATCH_SETTINGS_RECEIVED':
        dispatch({ type: 'SET_PENDING_MATCH_SETTINGS', payload: { rounds: payload.rounds, withAbilities: payload.withAbilities, rarityWeights: payload.rarityWeights } });
        break;
      case 'OPPONENT_ARRANGEMENT_READY':
        dispatch({ type: 'SET_OPPONENT_ARRANGEMENT_READY' });
        break;
      case 'OPPONENT_CARD_REVEALED':
        dispatch({ type: 'OPPONENT_REVEALED' });
        break;
      case 'ROUND_RESULT':
        dispatch({ type: 'ROUND_RESULT', payload: payload as RoundResult });
        break;
      case 'GAME_OVER':
        dispatch({ type: 'GAME_OVER', payload });
        {
          const snapshot = stateRef.current;
          if (snapshot.isRankedMatch && snapshot.roomId && rankResultRoomRef.current !== snapshot.roomId) {
            rankResultRoomRef.current = snapshot.roomId;
            const result = payload.winner === 'draw'
              ? 'draw'
              : (snapshot.isHost ? payload.winner === 'player1' : payload.winner === 'player2') ? 'win' : 'loss';
            recordRankedResult(snapshot.rankedProfile, snapshot.opponentRating ?? 1000, result)
              .then((profile) => dispatch({ type: 'SET_RANK_PROFILE', payload: profile }))
              .catch(() => console.warn('[Multiplayer] Failed to store ranked result'));
          }
        }
        break;
      case 'OPPONENT_DISCONNECTED':
        dispatch({ type: 'OPPONENT_DISCONNECTED', payload: { grace: payload.grace ?? 30 } });
        if (graceTimerRef.current) clearInterval(graceTimerRef.current);
        graceTimerRef.current = setInterval(() => dispatch({ type: 'TICK_GRACE' }), 1000);
        break;
      case 'OPPONENT_RECONNECTED':
        dispatch({ type: 'OPPONENT_RECONNECTED' });
        if (graceTimerRef.current) { clearInterval(graceTimerRef.current); graceTimerRef.current = null; }
        break;
      case 'OPPONENT_LEFT_PERMANENTLY':
        if (graceTimerRef.current) { clearInterval(graceTimerRef.current); graceTimerRef.current = null; }
        Alert.alert('المنافس غادر', 'غادر خصمك اللعبة. أنت الفائز!');
        dispatch({ type: 'GAME_OVER', payload: { winner: 'player2', p1Score: 0, p2Score: 3 } });
        break;
      case 'RECONNECTED':
        dispatch({ type: 'SET_CONNECTED', payload: true });
        break;
      case 'PLAYER_LEFT':
      case 'ERROR':
        console.warn('[Multiplayer]', type, payload);
        break;
    }
  }, []);

  const handleMessageWithBattle = useCallback((message: MPMessage) => {
    if (message.type === 'BATTLE_START') { setPendingBattleStart(message.payload); return; }
    handleMessage(message);
  }, [handleMessage]);

  useEffect(() => {
    if (!pendingBattleStart) return;
    const isHost = state.playerId === pendingBattleStart.player1.id;
    dispatch({
      type: 'START_BATTLE',
      payload: {
        totalRounds: pendingBattleStart.totalRounds,
        p1Score: pendingBattleStart.p1Score,
        p2Score: pendingBattleStart.p2Score,
        isHost,
        p1Cards: pendingBattleStart.player1.cards ?? [],
        p2Cards: pendingBattleStart.player2.cards ?? [],
      },
    });
    setPendingBattleStart(null);
  }, [pendingBattleStart]);

  useEffect(() => {
    return () => { disconnect(); if (graceTimerRef.current) clearInterval(graceTimerRef.current); };
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const createRoom = useCallback((playerName: string) => {
    dispatch({ type: 'SET_PLAYER_NAME', payload: playerName });
    dispatch({ type: 'SET_PLAYER_READY', payload: false });
    send({ type: 'CREATE_ROOM', payload: { playerId: state.playerId, playerName } });
  }, [state.playerId, send]);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    dispatch({ type: 'SET_PLAYER_NAME', payload: playerName });
    send({ type: 'JOIN_ROOM', payload: { roomId, playerId: state.playerId, playerName } });
  }, [state.playerId, send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'LEAVE_ROOM', payload: { playerId: state.playerId } });
    dispatch({ type: 'RESET' });
  }, [state.playerId, send]);

  const setPlayerCards = useCallback((cards: Card[], rounds: number) => {
    dispatch({ type: 'SET_PLAYER_CARDS', payload: cards });
    send({ type: 'SET_CARDS', payload: { playerId: state.playerId, cards, rounds } });
  }, [state.playerId, send]);

  const setPlayerReady = useCallback((isReady: boolean) => {
    dispatch({ type: 'SET_PLAYER_READY', payload: isReady });
    send({ type: 'PLAYER_READY', payload: { playerId: state.playerId, isReady } });
  }, [state.playerId, send]);

  const revealCard = useCallback((roundIndex: number, card: Card) => {
    dispatch({ type: 'SET_STATUS', payload: 'revealing' });
    send({ type: 'REVEAL_CARD', payload: { playerId: state.playerId, roundIndex, card } });
  }, [state.playerId, send]);

  const advanceToNextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  const sendMatchSettings = useCallback((settings: MatchSettings) => {
    send({ type: 'MATCH_SETTINGS', payload: { playerId: state.playerId, ...settings } });
  }, [state.playerId, send]);

  const sendArrangementReady = useCallback((cards: Card[]) => {
    dispatch({ type: 'SET_PLAYER_READY', payload: true });
    send({ type: 'ARRANGEMENT_READY', payload: { playerId: state.playerId, cards } });
  }, [state.playerId, send]);

  const queueRankedMatch = useCallback((playerName: string) => {
    dispatch({ type: 'SET_PLAYER_NAME', payload: playerName });
    const sent = wsClientRef.current?.queueRankedMatch(state.playerId, playerName, state.rankedProfile.rating);
    if (!sent) dispatch({ type: 'CLEAR_MATCHMAKING' });
  }, [state.playerId, state.rankedProfile.rating]);

  const cancelMatchmaking = useCallback(() => {
    wsClientRef.current?.cancelMatchmaking(state.playerId);
    dispatch({ type: 'CLEAR_MATCHMAKING' });
  }, [state.playerId]);

  return (
    <MultiplayerContext.Provider value={{
      state, wsClient: wsClientRef.current,
      connect, disconnect,
      createRoom, joinRoom, leaveRoom,
      setPlayerCards, setPlayerReady, revealCard, advanceToNextRound,
      sendMatchSettings, sendArrangementReady, queueRankedMatch, cancelMatchmaking,
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer must be within MultiplayerProvider');
  return ctx;
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
