import { describe, expect, it } from 'vitest';
import type { Card } from '@/lib/game/types';
import { LAN_ABILITY_POOL, applyLanAbility, createLanAbilities, resolveLanAbilityRound, type LanAbilityMatchInput } from '../lan-ability-adapter';

const card = (id: string, attack: number, defense: number): Card => ({
  id, name: id, nameAr: id, attack, defense, race: 'human', cardClass: 'warrior', element: 'fire',
});

const match = (): LanAbilityMatchInput => ({
  hostDeck: [card('host-1', 15, 8)],
  guestDeck: [card('guest-1', 10, 6)],
  hostScore: 3,
  guestScore: 3,
  hostAbilities: [{ type: 'Protection', used: false }],
  guestAbilities: [{ type: 'Reduction', used: false }],
  activeEffects: [],
  roundResults: [],
  currentRound: 0,
  totalRounds: 1,
  abilitiesEnabled: true,
});

describe('LAN ability adapter', () => {
  it('deals independent compatible abilities and respects the disabled ability mode', () => {
    expect(createLanAbilities(false)).toEqual([]);
    const dealt = createLanAbilities(true);
    expect(dealt).toHaveLength(3);
    expect(dealt.every(ability => LAN_ABILITY_POOL.includes(ability.type))).toBe(true);
    expect(new Set(dealt.map(ability => ability.type)).size).toBe(dealt.length);
  });

  it('uses a host ability through the shared reducer and carries the effect into round resolution', () => {
    const afterAbility = applyLanAbility(match(), 'host', 'Protection');
    expect(afterAbility.hostAbilities[0]).toEqual({ type: 'Protection', used: true });
    expect(afterAbility.activeEffects).toHaveLength(1);

    const resolved = resolveLanAbilityRound({ ...match(), ...afterAbility });
    expect(resolved.roundResult?.winner).toBe('player');
    expect(resolved.snapshot.roundResults).toHaveLength(1);
    expect(resolved.snapshot.hostScore).toBe(3);
    expect(resolved.snapshot.guestScore).toBe(2);
  });
});
