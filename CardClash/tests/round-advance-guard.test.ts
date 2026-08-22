import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gameReducer } from '../lib/game/game-context';
import type { Card, GameState } from '../lib/game/types';

const card: Card = {
  id: 'round-guard-card',
  name: 'Round Guard',
  nameAr: 'حارس الجولة',
  attack: 10,
  defense: 5,
  race: 'human',
  cardClass: 'warrior',
  element: 'fire',
};

const makeState = (currentRound = 0): GameState => ({
  playerDeck: [card, { ...card, id: 'p2' }, { ...card, id: 'p3' }],
  botDeck: [card, { ...card, id: 'b2' }, { ...card, id: 'b3' }],
  currentRound,
  totalRounds: 3,
  playerScore: 3,
  botScore: 3,
  playerMaxHealth: 3,
  botMaxHealth: 3,
  roundResults: [],
  difficulty: 2,
  abilitiesEnabled: true,
  activeEffects: [],
  playerAbilities: [],
  botAbilities: [],
  usedAbilities: [],
});

describe('Round advance guards', () => {
  it('ignores a delayed duplicate NEXT_ROUND action for a previously resolved round', () => {
    const advanced = gameReducer(makeState(), { type: 'NEXT_ROUND', payload: { fromRound: 0 } });
    const duplicate = gameReducer(advanced, { type: 'NEXT_ROUND', payload: { fromRound: 0 } });

    expect(advanced.currentRound).toBe(1);
    expect(duplicate.currentRound).toBe(1);
  });

  it('keeps legacy NEXT_ROUND behavior available for existing game engine callers', () => {
    expect(gameReducer(makeState(1), { type: 'NEXT_ROUND' }).currentRound).toBe(2);
  });

  it('cancels the local result timer and passes the expected round to the game engine', () => {
    const battleSource = readFileSync(resolve(process.cwd(), 'app/screens/battle.tsx'), 'utf8');
    const multiplayerSource = readFileSync(resolve(process.cwd(), 'app/screens/multiplayer-battle.tsx'), 'utf8');
    const lanSource = readFileSync(resolve(process.cwd(), 'app/screens/lan-battle.tsx'), 'utf8');
    const sandboxSource = readFileSync(resolve(process.cwd(), 'app/screens/sandbox.tsx'), 'utf8');

    expect(battleSource).toContain('const isAdvancingRound = useRef(false);');
    expect(battleSource).toContain('clearTimeout(nextRoundTimeout.current);');
    expect(battleSource).toContain('const entranceTimeout = useRef');
    expect(battleSource).toContain('clearTimeout(entranceTimeout.current);');
    expect(battleSource).toContain('nextRound(state.currentRound);');
    expect(battleSource).toContain('const playerAnim = useSharedValue(1);');
    expect(battleSource).toContain('const botAnim = useSharedValue(1);');
    expect(battleSource).toContain('}, [currentBotCard, currentPlayerCard, startBattle, state.playerDeck, state.totalRounds]);');
    expect(battleSource).toContain('playerAnim.value = 0.92; botAnim.value = 0.92;');
    expect(battleSource).toContain('playerAnim.value = 1;');
    expect(battleSource).toContain('botAnim.value = 1;');
    expect(multiplayerSource).toContain("phase !== 'result'");
    expect(multiplayerSource).toContain('isAdvancingRound.current = true;');
    expect(multiplayerSource.indexOf('const webTimelineSteps = useMemo')).toBeLessThan(
      multiplayerSource.indexOf("if (phase === 'game_over' && gameOver)"),
    );
    expect(lanSource).toContain('useAbility: activateAbility');
    expect(lanSource).toContain('activateAbility(ability.type)');
    expect(sandboxSource).toContain('return <SandboxScreenContent />;');
    expect(sandboxSource).toContain('function SandboxScreenContent()');
  });
});
