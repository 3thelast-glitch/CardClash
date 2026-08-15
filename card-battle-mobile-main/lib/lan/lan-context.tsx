import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { LanSession } from './lan-session';
import type { LanRoom, LanWireMessage } from './lan-protocol';

type LanState = 'idle' | 'hosting' | 'discovering' | 'connecting' | 'connected' | 'failed';
type LanContextValue = {
  rooms: LanRoom[];
  hostedRoom: LanRoom | null;
  state: LanState;
  notice: string | null;
  peer: { id: string; name: string } | null;
  lastGameEvent: { event: string; data: Record<string, unknown> } | null;
  isSupported: boolean;
  hostRoom: (name: string) => Promise<void>;
  refreshRooms: () => void;
  joinRoom: (room: LanRoom, name: string) => Promise<void>;
  sendGameEvent: (event: string, data: Record<string, unknown>) => boolean;
  leave: () => void;
};

const LanContext = createContext<LanContextValue | null>(null);

export function LanMultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<LanRoom[]>([]);
  const [hostedRoom, setHostedRoom] = useState<LanRoom | null>(null);
  const [state, setState] = useState<LanState>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [peer, setPeer] = useState<{ id: string; name: string } | null>(null);
  const [lastGameEvent, setLastGameEvent] = useState<{ event: string; data: Record<string, unknown> } | null>(null);
  const sessionRef = useRef<LanSession | null>(null);
  const playerIdRef = useRef(`lan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  if (!sessionRef.current) {
    sessionRef.current = new LanSession({
      onRooms: setRooms,
      onState: (next, message) => { setState(next); if (message) setNotice(message); },
      onPeer: setPeer,
      onMessage: (message: LanWireMessage) => {
        if (message.type === 'LAN_GAME_EVENT') setLastGameEvent(message.payload);
        if (message.type === 'LAN_ERROR') setNotice(message.payload.message);
      },
    });
  }

  useEffect(() => () => sessionRef.current?.dispose(), []);
  const hostRoom = useCallback(async (name: string) => { const room = await sessionRef.current!.host(playerIdRef.current, name); setHostedRoom(room); }, []);
  const refreshRooms = useCallback(() => sessionRef.current?.discover(), []);
  const joinRoom = useCallback(async (room: LanRoom, name: string) => { await sessionRef.current!.join(room, playerIdRef.current, name); }, []);
  const sendGameEvent = useCallback((event: string, data: Record<string, unknown>) => {
    if (state !== 'connected') return false;
    sessionRef.current?.sendGameEvent(event, data); return true;
  }, [state]);
  const leave = useCallback(() => { sessionRef.current?.stop(); setHostedRoom(null); setNotice(null); setLastGameEvent(null); }, []);

  return <LanContext.Provider value={{ rooms, hostedRoom, state, notice, peer, lastGameEvent, isSupported: Platform.OS !== 'web', hostRoom, refreshRooms, joinRoom, sendGameEvent, leave }}>{children}</LanContext.Provider>;
}

export function useLanMultiplayer() {
  const context = useContext(LanContext);
  if (!context) throw new Error('useLanMultiplayer must be used inside LanMultiplayerProvider');
  return context;
}
