import { describe, expect, it } from 'vitest';
import { ALL_ABILITIES } from '../abilities';
import {
  CHARACTER_ABILITY_IDS,
  CHARACTER_ABILITY_PRESENTATION,
  MANUAL_ABILITY_PRESENTATION,
  getAbilityPresentation,
} from '../ability-presentation';

describe('ability presentation coverage', () => {
  it('covers every selectable runtime ability exactly once', () => {
    expect(new Set(Object.keys(MANUAL_ABILITY_PRESENTATION))).toEqual(new Set(ALL_ABILITIES));
  });

  it('covers every declared character presentation id', () => {
    expect(Object.keys(CHARACTER_ABILITY_PRESENTATION).sort()).toEqual([...CHARACTER_ABILITY_IDS].sort());
    expect(new Set(CHARACTER_ABILITY_IDS).size).toBe(CHARACTER_ABILITY_IDS.length);
  });

  it('returns an explicit, readable neutral fallback for custom content', () => {
    const fallback = getAbilityPresentation('custom_future_ability');
    expect(fallback.family).toBe('utility');
    expect(fallback.shortLabel).toContain('Custom');
    expect(fallback.accessibilityAnnouncement.length).toBeGreaterThan(0);
  });
});
