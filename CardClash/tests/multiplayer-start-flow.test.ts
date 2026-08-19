import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');
const cardSelection = source('app/screens/card-selection.tsx');
const multiplayerContext = source('lib/multiplayer/multiplayer-context.tsx');
const multiplayerBattle = source('app/screens/multiplayer-battle.tsx');
const roomManager = source('server/multiplayer/room-manager.ts');
const websocketServer = source('server/multiplayer/websocket-server.ts');

describe('multiplayer battle start flow', () => {
  it('starts only from server-confirmed decks and readiness, then broadcasts a single BATTLE_START', () => {
    expect(roomManager).toContain('startMatch(roomId: string): Room | null');
    expect(roomManager).toContain("room.status = 'playing'");
    expect(websocketServer).toContain('const startedRoom = roomManager.startMatch(room.id);');
    expect(websocketServer).toContain("type: 'BATTLE_START'");
  });

  it('routes to the multiplayer arena and hydrates it from shared state if BATTLE_START arrives early', () => {
    expect(cardSelection).toContain("router.replace('/screens/multiplayer-battle' as any)");
    expect(multiplayerContext).toContain('sendArrangementReady: (cards: Card[]) => boolean;');
    expect(multiplayerBattle).toContain('const hydrateBattle = useCallback');
    expect(multiplayerBattle).toContain('multiplayer.state.status !== \'playing\'');
  });
});
