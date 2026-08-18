import { describe, expect, it } from 'vitest';
import { isValidInviteCode, normalizeInviteCode } from '../../../lib/multiplayer/invites';
import { RoomManager, type Player } from '../room-manager';

const player = (id: string): Player => ({ id, name: id, socketId: id, isReady: false });

describe('private invite codes', () => {
  it('normalizes an invite code into a compact uppercase value', () => {
    expect(normalizeInviteCode('clash-24!')).toBe('CLASH24');
  });

  it('accepts invite codes from four to eight alphanumeric characters only', () => {
    expect(isValidInviteCode('CLASH24')).toBe(true);
    expect(isValidInviteCode('ABC')).toBe(false);
    expect(isValidInviteCode('CLASH-24')).toBe(false);
  });

  it('creates a private room using an available requested invite code', () => {
    const rooms = new RoomManager();
    expect(rooms.createRoom(player('host'), 'clash24')?.id).toBe('CLASH24');
  });

  it('rejects a duplicate or invalid private invite code', () => {
    const rooms = new RoomManager();
    rooms.createRoom(player('host'), 'CLASH24');
    expect(rooms.createRoom(player('another-host'), 'CLASH24')).toBeNull();
    expect(rooms.createRoom(player('third-host'), 'abc')).toBeNull();
  });
});
