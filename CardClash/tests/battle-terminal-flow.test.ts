import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');
const cardSelection = source('app/screens/card-selection.tsx');
const battle = source('app/screens/battle.tsx');
const gameContext = source('lib/game/game-context.tsx');

describe('ability preview and terminal battle flow', () => {
  it('lays all selected abilities out in a visible wrapping grid instead of a hidden horizontal rail', () => {
    expect(cardSelection).toContain("flexWrap: 'wrap'");
    expect(cardSelection).toContain("justifyContent: 'center'");
    expect(cardSelection).toContain('showsVerticalScrollIndicator={assignedAbilities.length > abilityGridColumns}');
  });

  it('treats the final resolved round as terminal and preserves the last valid card index', () => {
    expect(battle).toContain('lastRoundResult.round >= state.totalRounds');
    expect(battle).toContain('handleEndBattle();');
    expect(gameContext).toContain('Math.max(0, state.totalRounds - 1)');
  });
});
