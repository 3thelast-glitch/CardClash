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

  it('keeps portrait battle commands visible and gives card rage a dedicated row', () => {
    expect(battle).toContain('const portraitCommandWidth = Math.min(centerWidth, 340);');
    expect(battle).toContain('const commandFullButtonWidth = isLandscape');
    expect(battle).toContain('centerPanelPortrait: { minHeight: 176, maxHeight: 330, flexGrow: 0, flexShrink: 0');
    expect(battle).toContain("actionButtonsPortrait: { flexDirection: 'column'");
    expect(battle).toContain('testID="guest-rage-button"');
    expect(battle).toContain("onPress={() => openRageForSide('bot')}");
    expect(battle).toContain("const rageStates = useRef({ player: buildRageState(), bot: buildRageState() });");
    expect(battle).toContain('[currentPlayerCard?.id, currentBotCard?.id, phase, state.currentRound]');
  });

  it('treats the final resolved round as terminal and preserves the last valid card index', () => {
    expect(battle).toContain('lastRoundResult.round >= state.totalRounds');
    expect(battle).toContain('handleEndBattle();');
    expect(gameContext).toContain('Math.max(0, state.totalRounds - 1)');
  });
});
