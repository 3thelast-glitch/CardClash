import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');
const cardSelection = source('app/screens/card-selection.tsx');
const battle = source('app/screens/battle.tsx');
const gameContext = source('lib/game/game-context.tsx');

describe('ability preview and terminal battle flow', () => {
  it('uses a three-across phone layout and a wrapping grid for selected abilities', () => {
    expect(cardSelection).toContain("flexWrap: 'wrap'");
    expect(cardSelection).toContain("justifyContent: 'center'");
    expect(cardSelection).toContain('const abilityMobileThreeAcross = !isLandscape && width < 520;');
    expect(cardSelection).toContain('const abilityPreviewHorizontal = false;');
    expect(cardSelection).toContain('Math.floor((abilityModalInnerWidth - abilityPreviewGap * 2) / 3)');
  });

  it('keeps portrait battle commands visible and uses stable card identities for the action transition', () => {
    expect(battle).toContain('const portraitCommandWidth = Math.min(centerWidth, 340);');
    expect(battle).toContain('centerPanelPortrait: { minHeight: 136, maxHeight: 190, flexGrow: 0, flexShrink: 0');
    expect(battle).toContain('[currentPlayerCard?.id, currentBotCard?.id, phase, state.currentRound]');
  });

  it('treats the final resolved round as terminal and preserves the last valid card index', () => {
    expect(battle).toContain('lastRoundResult.round >= state.totalRounds');
    expect(battle).toContain('handleEndBattle();');
    expect(gameContext).toContain('Math.max(0, state.totalRounds - 1)');
  });
});
