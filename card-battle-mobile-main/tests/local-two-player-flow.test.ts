import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');
const gameContext = source('lib/game/game-context.tsx');
const gameMode = source('app/screens/game-mode.tsx');
const cardSelection = source('app/screens/card-selection.tsx');
const battle = source('app/screens/battle.tsx');

describe('local two-player match flow', () => {
  it('keeps the engine slots while exposing an explicit local match mode', () => {
    expect(gameContext).toContain("matchMode: 'solo'");
    expect(gameContext).toContain("type: 'SET_MATCH_MODE'");
    expect(gameContext).toContain('assignedBotAbilities');
    expect(gameMode).toContain("matchMode: 'local'");
  });

  it('requires a private host arrangement and an explicit guest handover before battle', () => {
    expect(cardSelection).toContain("const [localStage, setLocalStage] = useState<'host' | 'handover' | 'guest'>('host')");
    expect(cardSelection).toContain('مرّر الجهاز إلى الضيف');
    expect(cardSelection).toContain('startBattle(hostDeck, hostAbilities, sorted, assignedAbilities)');
  });

  it('disables bot automation and exposes guest abilities during a local match', () => {
    expect(battle).toContain('if (isLocalTwoPlayer) return;');
    expect(battle).toContain("setAbilityOwnerSide('bot')");
    expect(battle).toContain('قدرة الضيف');
    expect(battle).toContain("state.botAbilities");
  });
});
