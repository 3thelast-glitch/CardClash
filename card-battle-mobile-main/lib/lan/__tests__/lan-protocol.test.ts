import { describe, expect, it } from 'vitest';
import { createLanRoomId, encodeLanMessage, isLocalIpv4, LAN_GAME_PORT, LanLineDecoder } from '../lan-protocol';

describe('LAN TCP protocol', () => {
  it('reassembles a split TCP JSON message and ignores malformed frames', () => {
    const decoder = new LanLineDecoder();
    const encoded = encodeLanMessage({ type: 'LAN_HELLO', payload: { playerId: 'p1', playerName: 'محلي', version: 1 } });
    expect(decoder.push(encoded.slice(0, 10))).toEqual([]);
    expect(decoder.push(`${encoded.slice(10)}bad-json\n`)).toEqual([
      { type: 'LAN_HELLO', payload: { playerId: 'p1', playerName: 'محلي', version: 1 } },
    ]);
  });

  it('uses a stable direct-play port and rejects unusable local addresses', () => {
    expect(LAN_GAME_PORT).toBe(45983);
    expect(createLanRoomId()).toMatch(/^LAN-[A-Z0-9]{5}$/);
    expect(isLocalIpv4('192.168.1.14')).toBe(true);
    expect(isLocalIpv4('10.0.0.8')).toBe(true);
    expect(isLocalIpv4('0.0.0.0')).toBe(false);
    expect(isLocalIpv4('not-an-ip')).toBe(false);
  });
});
