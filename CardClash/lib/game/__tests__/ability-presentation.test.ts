import { describe, expect, it } from 'vitest';
import { ALL_ABILITIES } from '../abilities';
import {
  CHARACTER_ABILITY_IDS,
  CHARACTER_ABILITY_PRESENTATION,
  MANUAL_ABILITY_PRESENTATION,
  getAbilityPresentation,
} from '../ability-presentation';

describe('ability presentation coverage', () => {
  it('covers every selectable runtime ability and keeps the automatic Turin penalty presentable', () => {
    const presentationIds = new Set(Object.keys(MANUAL_ABILITY_PRESENTATION));
    const selectablePresentationIds = new Set(
      [...presentationIds].filter((id) => id !== 'LoseHalfRounds'),
    );

    expect(selectablePresentationIds).toEqual(new Set(ALL_ABILITIES));
    expect(presentationIds.has('LoseHalfRounds')).toBe(true);
    expect(getAbilityPresentation('LoseHalfRounds').family).toBe('stat_down');
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
