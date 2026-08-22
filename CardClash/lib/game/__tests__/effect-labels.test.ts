import { describe, expect, it } from 'vitest';
import { withEffectSource } from '../effect-labels';
import type { Effect } from '../types';

const avatarAttackEffect: Pick<Effect, 'data'> = {
  data: { stat: 'attack', amount: 2, abilityType: 'Avatar' },
};

describe('effect source labels', () => {
  it('names the ability that created a stat buff', () => {
    expect(withEffectSource(avatarAttackEffect, 'هجوم +2')).toBe('أفاتار: هجوم +2');
  });

  it('keeps character and legacy effects readable when no manual ability source exists', () => {
    expect(withEffectSource({ data: { stat: 'defense', amount: 2 } }, 'دفاع +2')).toBe('دفاع +2');
  });
});
