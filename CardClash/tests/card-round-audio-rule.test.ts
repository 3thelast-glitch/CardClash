import { describe, expect, it } from 'vitest';
import { shouldPlayRoundCardAudio } from '../lib/game/ui-helpers';

describe('round card audio rule', () => {
  const normalCard = { rarity: 'common' } as const;
  const specialCard = { rarity: 'special' } as const;

  it('plays an ordinary card audio only after that card wins', () => {
    expect(shouldPlayRoundCardAudio(normalCard, true, true)).toBe(true);
    expect(shouldPlayRoundCardAudio(normalCard, true, false)).toBe(false);
    expect(shouldPlayRoundCardAudio(normalCard, false, true)).toBe(false);
  });

  it('plays a special card audio whenever the card is visible, even on a loss or draw', () => {
    expect(shouldPlayRoundCardAudio(specialCard, true, true)).toBe(true);
    expect(shouldPlayRoundCardAudio(specialCard, true, false)).toBe(true);
    expect(shouldPlayRoundCardAudio(specialCard, false, false)).toBe(false);
  });
});
