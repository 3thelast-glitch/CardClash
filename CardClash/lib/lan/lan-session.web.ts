import type { LanRoom, LanWireMessage } from './lan-protocol';

export type LanSessionEvents = {
  onRooms: (rooms: LanRoom[]) => void;
  onState: (state: 'idle' | 'hosting' | 'discovering' | 'connecting' | 'connected' | 'failed', notice?: string) => void;
  onPeer: (peer: { id: string; name: string } | null) => void;
  onMessage: (message: LanWireMessage) => void;
};

export class LanSession {
  constructor(private readonly events: LanSessionEvents) {}
  async host(_playerId: string, _playerName: string): Promise<never> { this.events.onState('failed', 'وضع LAN يتطلب Development Build أصلياً على Android أو iOS.'); throw new Error('Native LAN is unavailable on web'); }
  discover() { this.events.onState('failed', 'اكتشاف mDNS غير متاح في معاينة الويب. افتح التطبيق في Development Build.'); }
  async join(_room: LanRoom, playerId: string, playerName: string): Promise<never> { return this.host(playerId, playerName); }
  sendGameEvent(_event: string, _data: Record<string, unknown>) { return false; }
  stop() { this.events.onRooms([]); this.events.onPeer(null); this.events.onState('idle'); }
  dispose() { this.stop(); }
}
