import { describe, expect, it } from 'vitest';
import { isDeveloperBuild, resolveBuildVariant } from '../build-variant';

describe('Android build variants', () => {
  it('defaults to the player build when no explicit developer marker exists', () => {
    expect(resolveBuildVariant(undefined)).toBe('player');
    expect(isDeveloperBuild({ buildVariant: 'player' })).toBe(false);
  });

  it('enables developer-only diagnostics only for the developer marker', () => {
    expect(resolveBuildVariant({ buildVariant: 'developer' })).toBe('developer');
    expect(isDeveloperBuild({ buildVariant: 'developer' })).toBe(true);
  });
});
