import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(process.cwd());
const source = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), 'utf8');
const battle = source('app/screens/battle.tsx');
const gameContext = source('lib/game/game-context.tsx');

describe('developer nothing happened shortcut', () => {
  it('replaces only the first unused player ability and preserves an existing special card', () => {
    expect(gameContext).toContain("type: 'GRANT_DEVELOPER_NOTHING_HAPPENED'");
    expect(gameContext).toContain("state.playerAbilities.findIndex(ability => !ability.used)");
    expect(gameContext).toContain("ability.type === 'NothingHappened'");
  });

  it('mounts the portrait shortcut only behind the developer build gate', () => {
    expect(battle).toContain('isDeveloperBuild(Constants.expoConfig?.extra)');
    expect(battle).toContain('developer-nothing-happened-shortcut');
    expect(battle).toContain('grantDeveloperNothingHappened');
  });

  it('does not display a toast notification when the developer shortcut is used', () => {
    const shortcutBlock = battle.match(/const handleDeveloperAbilityGrant[\s\S]*?\n  }, \[grantDeveloperNothingHappened, hapticImpact\]\);/);
    expect(shortcutBlock?.[0]).toBeDefined();
    expect(shortcutBlock?.[0]).not.toContain('showToast');
  });
});
