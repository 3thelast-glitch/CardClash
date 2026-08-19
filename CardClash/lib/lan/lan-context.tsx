import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Card } from '@/lib/game/types';
import { LanSession } from './lan-session';
import { isLanGameOver, resolveLanRound, type LanPlayerRole, type LanRoundResult } from './lan-match-engine';
import type { LanRoom, LanWireMessage } from './lan-protocol';

type LanState = 'idle' | 'hosting' | 'discovering' | 'connecting' | 'connected' | 'failed';
type LanMatchPhase = 'idle' | 'configuring' | 'arranging' | 'playing' | 'result' | 'finished';
type LanRarityWeights = Record<'common' | 'rare' | 'epic' | 'legendary' | 'special', number>;

const DEFAULT_RARITY_WEIGHTS: LanRarityWeights = { common: 45, rare: 28, epic: 17, legendary: 8, special: 2 };

function asRarityWeights(value: unknown, fallback: LanRarityWeights = DEFAULT_RARITY_WEIGHTS): LanRarityWeights {
  if (!value || typeof value !== 'object') return fallback;
  const source = value as Record<string, unknown>;
  const read = (key: keyof LanRarityWeights) => {
    const weight = typeof source[key] === 'number' ? Math.round(source[key] as number) : fallback[key];
    return Math.max(0, Math.min(100, weight));
  };
  return { common: read('common'), rare: read('rare'), epic: read('epic'), legendary: read('legendary'), special: read('special') };
}

export type LanMatchState = {
  role: LanPlayerRole | null;
  phase: LanMatchPhase;
  hostName: string;
  guestName: string;
  totalRounds: number;
  abilitiesEnabled: boolean;
  rarityWeights: LanRarityWeights;
  hostDeck: Card[];
  guestDeck: Card[];
  hostReady: boolean;
  guestReady: boolean;
  currentRound: number;
  hostScore: number;
  guestScore: number;
  hostRevealed: boolean;
  guestRevealed: boolean;
  lastResult: LanRoundResult | null;
  results: LanRoundResult[];
};

const emptyMatch = (): LanMatchState => ({
  role: null,
  phase: 'idle',
  hostName: '',
  guestName: '',
  totalRounds: 0,
  abilitiesEnabled: true,
  rarityWeights: { ...DEFAULT_RARITY_WEIGHTS },
  hostDeck: [],
  guestDeck: [],
  hostReady: false,
  guestReady: false,
  currentRound: 0,
  hostScore: 3,
  guestScore: 3,
  hostRevealed: false,
  guestRevealed: false,
  lastResult: null,
  results: [],
});

type LanContextValue = {
  rooms: LanRoom[];
  hostedRoom: LanRoom | null;
  state: LanState;
  notice: string | null;
  peer: { id: string; name: string } | null;
  lastGameEvent: { event: string; data: Record<string, unknown> } | null;
  isSupported: boolean;
  match: LanMatchState;
  hostRoom: (name: string) => Promise<void>;
  refreshRooms: () => void;
  joinRoom: (room: LanRoom, name: string) => Promise<void>;
  configureMatch: (rounds: number, abilitiesEnabled: boolean, rarityWeights: LanRarityWeights) => void;
  submitArrangement: (deck: Card[]) => void;
  revealCurrentCard: () => void;
  advanceRound: () => void;
  finishMatch: () => void;
  sendGameEvent: (event: string, data: Record<string, unknown>) => boolean;
  leave: () => void;
};

const LanContext = createContext<LanContextValue | null>(null);

function asCards(value: unknown): Card[] {
  return Array.isArray(value) ? value as Card[] : [];
}

function asFiniteRoundCount(value: unknown): number {
  const rounds = typeof value === 'number' ? Math.floor(value) : 0;
  return rounds >= 1 && rounds <= 30 ? rounds : 0;
}

/** يربط mDNS/TCP المباشر بحالة مباراة كاملة بين هاتفين من دون خادم خارجي. */
export function LanMultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<LanRoom[]>([]);
  const [hostedRoom, setHostedRoom] = useState<LanRoom | null>(null);
  const [state, setState] = useState<LanState>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [peer, setPeer] = useState<{ id: string; name: string } | null>(null);
  const [lastGameEvent, setLastGameEvent] = useState<{ event: string; data: Record<string, unknown> } | null>(null);
  const [match, setMatch] = useState<LanMatchState>(emptyMatch);
  const sessionRef = useRef<LanSession | null>(null);
  const playerIdRef = useRef(`lan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const nameRef = useRef('لاعب محلي');
  const roleRef = useRef<LanPlayerRole | null>(null);
  const matchRef = useRef(match);

  const updateMatch = useCallback((updater: (previous: LanMatchState) => LanMatchState) => {
    setMatch(previous => {
      const next = updater(previous);
      matchRef.current = next;
      return next;
    });
  }, []);

  const sendDirectEvent = useCallback((event: string, data: Record<string, unknown>) => {
    sessionRef.current?.sendGameEvent(event, data);
  }, []);

  const startWhenReady = useCallback((next: LanMatchState) => {
    if (next.role !== 'host' || !next.hostReady || !next.guestReady || !next.hostDeck.length || !next.guestDeck.length) return;
    const started: LanMatchState = {
      ...next,
      phase: 'playing',
      currentRound: 0,
      hostScore: 3,
      guestScore: 3,
      hostRevealed: false,
      guestRevealed: false,
      lastResult: null,
      results: [],
    };
    updateMatch(() => started);
    sendDirectEvent('LAN_MATCH_START', {
      totalRounds: started.totalRounds,
      abilitiesEnabled: started.abilitiesEnabled,
      rarityWeights: started.rarityWeights,
      hostName: started.hostName,
      guestName: started.guestName,
      hostDeck: started.hostDeck,
      guestDeck: started.guestDeck,
    });
  }, [sendDirectEvent, updateMatch]);

  const resolveIfReady = useCallback((next: LanMatchState) => {
    if (next.role !== 'host' || !next.hostRevealed || !next.guestRevealed || next.phase !== 'playing') return;
    const hostCard = next.hostDeck[next.currentRound];
    const guestCard = next.guestDeck[next.currentRound];
    if (!hostCard || !guestCard) return;
    const result = resolveLanRound(next.currentRound, hostCard, guestCard, next.hostScore, next.guestScore);
    const resolved: LanMatchState = {
      ...next,
      phase: 'result',
      hostScore: result.hostScore,
      guestScore: result.guestScore,
      lastResult: result,
      results: [...next.results, result],
    };
    updateMatch(() => resolved);
    sendDirectEvent('LAN_ROUND_RESULT', { result });
  }, [sendDirectEvent, updateMatch]);

  const handleGameEvent = useCallback((event: string, data: Record<string, unknown>) => {
    setLastGameEvent({ event, data });
    if (event === 'LAN_MATCH_SETTINGS') {
      const totalRounds = asFiniteRoundCount(data.totalRounds);
      if (!totalRounds) return;
      updateMatch(previous => ({
        ...previous,
        role: 'guest',
        phase: 'arranging',
        totalRounds,
        abilitiesEnabled: data.abilitiesEnabled !== false,
        rarityWeights: asRarityWeights(data.rarityWeights, previous.rarityWeights),
        hostName: typeof data.hostName === 'string' ? data.hostName : previous.hostName,
        guestName: nameRef.current,
      }));
      return;
    }

    if (event === 'LAN_HOST_ARRANGED') {
      const hostDeck = asCards(data.deck);
      updateMatch(previous => ({ ...previous, hostDeck, hostReady: hostDeck.length > 0 }));
      return;
    }

    if (event === 'LAN_GUEST_ARRANGED') {
      const guestDeck = asCards(data.deck);
      updateMatch(previous => {
        const next = { ...previous, guestDeck, guestReady: guestDeck.length > 0, guestName: typeof data.guestName === 'string' ? data.guestName : previous.guestName };
        queueMicrotask(() => startWhenReady(next));
        return next;
      });
      return;
    }

    if (event === 'LAN_MATCH_START') {
      const totalRounds = asFiniteRoundCount(data.totalRounds);
      const hostDeck = asCards(data.hostDeck);
      const guestDeck = asCards(data.guestDeck);
      if (!totalRounds || hostDeck.length !== totalRounds || guestDeck.length !== totalRounds) return;
      updateMatch(previous => ({
        ...previous,
        role: 'guest',
        phase: 'playing',
        totalRounds,
        abilitiesEnabled: data.abilitiesEnabled !== false,
        rarityWeights: asRarityWeights(data.rarityWeights, previous.rarityWeights),
        hostName: typeof data.hostName === 'string' ? data.hostName : previous.hostName,
        guestName: typeof data.guestName === 'string' ? data.guestName : previous.guestName,
        hostDeck,
        guestDeck,
        hostReady: true,
        guestReady: true,
        currentRound: 0,
        hostScore: 3,
        guestScore: 3,
        hostRevealed: false,
        guestRevealed: false,
        lastResult: null,
        results: [],
      }));
      return;
    }

    if (event === 'LAN_REVEAL') {
      const roundIndex = typeof data.roundIndex === 'number' ? data.roundIndex : -1;
      const card = data.card as Card | undefined;
      if (!card) return;
      updateMatch(previous => {
        if (previous.phase !== 'playing' || previous.currentRound !== roundIndex) return previous;
        const next = roleRef.current === 'host'
          ? { ...previous, guestRevealed: true, guestDeck: previous.guestDeck.map((current, index) => index === roundIndex ? card : current) }
          : { ...previous, hostRevealed: true, hostDeck: previous.hostDeck.map((current, index) => index === roundIndex ? card : current) };
        queueMicrotask(() => resolveIfReady(next));
        return next;
      });
      return;
    }

    if (event === 'LAN_ROUND_RESULT') {
      const result = data.result as LanRoundResult | undefined;
      if (!result || typeof result.roundIndex !== 'number') return;
      updateMatch(previous => ({ ...previous, phase: 'result', hostScore: result.hostScore, guestScore: result.guestScore, lastResult: result, results: [...previous.results, result] }));
      return;
    }

    if (event === 'LAN_NEXT_ROUND') {
      const roundIndex = typeof data.roundIndex === 'number' ? data.roundIndex : -1;
      updateMatch(previous => ({ ...previous, phase: 'playing', currentRound: roundIndex, hostRevealed: false, guestRevealed: false, lastResult: null }));
      return;
    }

    if (event === 'LAN_GAME_OVER') {
      updateMatch(previous => ({ ...previous, phase: 'finished' }));
    }
  }, [resolveIfReady, startWhenReady, updateMatch]);

  if (!sessionRef.current) {
    sessionRef.current = new LanSession({
      onRooms: setRooms,
      onState: (next, message) => { setState(next); if (message) setNotice(message); },
      onPeer: (nextPeer) => {
        setPeer(nextPeer);
        if (nextPeer) updateMatch(previous => roleRef.current === 'host'
          ? { ...previous, guestName: nextPeer.name }
          : { ...previous, hostName: nextPeer.name });
      },
      onMessage: (message: LanWireMessage) => {
        if (message.type === 'LAN_GAME_EVENT') handleGameEvent(message.payload.event, message.payload.data);
        if (message.type === 'LAN_ERROR') setNotice(message.payload.message);
      },
    });
  }

  useEffect(() => () => sessionRef.current?.dispose(), []);

  const hostRoom = useCallback(async (name: string) => {
    nameRef.current = name.trim().slice(0, 20) || 'المضيف';
    roleRef.current = 'host';
    const room = await sessionRef.current!.host(playerIdRef.current, nameRef.current);
    setHostedRoom(room);
    updateMatch(() => ({ ...emptyMatch(), role: 'host', phase: 'configuring', hostName: nameRef.current }));
  }, [updateMatch]);

  const refreshRooms = useCallback(() => sessionRef.current?.discover(), []);

  const joinRoom = useCallback(async (room: LanRoom, name: string) => {
    nameRef.current = name.trim().slice(0, 20) || 'الضيف';
    roleRef.current = 'guest';
    updateMatch(() => ({ ...emptyMatch(), role: 'guest', phase: 'configuring', hostName: room.hostName, guestName: nameRef.current }));
    try {
      await sessionRef.current!.join(room, playerIdRef.current, nameRef.current);
    } catch (error) {
      roleRef.current = null;
      updateMatch(emptyMatch);
      throw error;
    }
  }, [updateMatch]);

  const configureMatch = useCallback((rounds: number, abilitiesEnabled: boolean, rarityWeights: LanRarityWeights) => {
    if (roleRef.current !== 'host' || state !== 'connected') return;
    const totalRounds = Math.min(30, Math.max(1, Math.floor(rounds)));
    const sharedRarityWeights = asRarityWeights(rarityWeights);
    updateMatch(previous => ({ ...previous, role: 'host', phase: 'arranging', totalRounds, abilitiesEnabled, rarityWeights: sharedRarityWeights, hostName: nameRef.current, guestName: previous.guestName || peer?.name || 'الضيف' }));
    sendDirectEvent('LAN_MATCH_SETTINGS', { totalRounds, abilitiesEnabled, rarityWeights: sharedRarityWeights, hostName: nameRef.current });
  }, [peer?.name, sendDirectEvent, state, updateMatch]);

  const submitArrangement = useCallback((deck: Card[]) => {
    const current = matchRef.current;
    if (current.phase !== 'arranging' || deck.length !== current.totalRounds || !roleRef.current) return;
    if (roleRef.current === 'host') {
      updateMatch(previous => ({ ...previous, hostDeck: deck, hostReady: true }));
      sendDirectEvent('LAN_HOST_ARRANGED', { deck });
    } else {
      updateMatch(previous => ({ ...previous, guestDeck: deck, guestReady: true }));
      sendDirectEvent('LAN_GUEST_ARRANGED', { deck, guestName: nameRef.current });
    }
  }, [sendDirectEvent, updateMatch]);

  const revealCurrentCard = useCallback(() => {
    const current = matchRef.current;
    const role = roleRef.current;
    if (!role || current.phase !== 'playing') return;
    const deck = role === 'host' ? current.hostDeck : current.guestDeck;
    const card = deck[current.currentRound];
    if (!card || (role === 'host' ? current.hostRevealed : current.guestRevealed)) return;
    updateMatch(previous => role === 'host' ? { ...previous, hostRevealed: true } : { ...previous, guestRevealed: true });
    sendDirectEvent('LAN_REVEAL', { roundIndex: current.currentRound, card });
  }, [sendDirectEvent, updateMatch]);

  const advanceRound = useCallback(() => {
    const current = matchRef.current;
    if (roleRef.current !== 'host' || current.phase !== 'result' || !current.lastResult) return;
    if (isLanGameOver(current.lastResult, current.totalRounds)) return;
    const roundIndex = current.currentRound + 1;
    updateMatch(previous => ({ ...previous, phase: 'playing', currentRound: roundIndex, hostRevealed: false, guestRevealed: false, lastResult: null }));
    sendDirectEvent('LAN_NEXT_ROUND', { roundIndex });
  }, [sendDirectEvent, updateMatch]);

  const finishMatch = useCallback(() => {
    const current = matchRef.current;
    if (roleRef.current !== 'host' || current.phase !== 'result' || !current.lastResult || !isLanGameOver(current.lastResult, current.totalRounds)) return;
    updateMatch(previous => ({ ...previous, phase: 'finished' }));
    sendDirectEvent('LAN_GAME_OVER', {});
  }, [sendDirectEvent, updateMatch]);

  const sendGameEvent = useCallback((event: string, data: Record<string, unknown>) => {
    if (state !== 'connected') return false;
    sendDirectEvent(event, data);
    return true;
  }, [sendDirectEvent, state]);

  const leave = useCallback(() => {
    sessionRef.current?.stop();
    roleRef.current = null;
    setHostedRoom(null);
    setNotice(null);
    setLastGameEvent(null);
    updateMatch(emptyMatch);
  }, [updateMatch]);

  return <LanContext.Provider value={{
    rooms, hostedRoom, state, notice, peer, lastGameEvent, isSupported: Platform.OS !== 'web', match,
    hostRoom, refreshRooms, joinRoom, configureMatch, submitArrangement, revealCurrentCard, advanceRound, finishMatch, sendGameEvent, leave,
  }}>{children}</LanContext.Provider>;
}

export function useLanMultiplayer() {
  const context = useContext(LanContext);
  if (!context) throw new Error('useLanMultiplayer must be used inside LanMultiplayerProvider');
  return context;
}
