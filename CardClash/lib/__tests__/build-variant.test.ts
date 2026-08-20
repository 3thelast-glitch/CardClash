import { describe, expect, it } from 'vitest';
import { getVisibleMenuItems, isDeveloperBuild, resolveBuildVariant } from '../build-variant';

describe('Android build variants', () => {
  it('defaults to the player build when no explicit developer marker exists', () => {
    expect(resolveBuildVariant(undefined)).toBe('player');
    expect(isDeveloperBuild({ buildVariant: 'player' })).toBe(false);
  });

  it('enables developer-only diagnostics only for the developer marker', () => {
    expect(resolveBuildVariant({ buildVariant: 'developer' })).toBe('developer');
    expect(isDeveloperBuild({ buildVariant: 'developer' })).toBe(true);
  });

  it('hides developer-only menu items from the player build only', () => {
    const menu = [
      { id: 'solo' },
      { id: 'collection', developerOnly: true },
      { id: 'sandbox', developerOnly: true },
      { id: 'wifi' },
    ] as const;

    expect(getVisibleMenuItems(menu, { buildVariant: 'player' }).map(item => item.id)).toEqual(['solo', 'wifi']);
    expect(getVisibleMenuItems(menu, { buildVariant: 'developer' }).map(item => item.id)).toEqual(['solo', 'collection', 'sandbox', 'wifi']);
  });
});
