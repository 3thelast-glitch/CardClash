import { describe, expect, it } from 'vitest';
import {
  allowedRatingDifference,
  MatchmakingManager,
  tierForRating,
} from '../matchmaking-manager';

function player(id: string, rating: number) {
  return { id, name: id, socketId: id, isReady: false, rating };
}

describe('competitive tiers', () => {
  it('maps the default and threshold ratings to stable tiers', () => {
    expect(tierForRating(1000)).toBe('Iron');
    expect(tierForRating(1100)).toBe('Bronze');
    expect(tierForRating(1200)).toBe('Silver');
    expect(tierForRating(1300)).toBe('Gold');
    expect(tierForRating(1600)).toBe('Diamond');
    expect(tierForRating(2000)).toBe('Legend');
  });

  it('widens the accepted rating gap gradually with a maximum cap', () => {
    expect(allowedRatingDifference(0)).toBe(100);
    expect(allowedRatingDifference(10_000)).toBe(150);
    expect(allowedRatingDifference(120_000)).toBe(400);
  });
});

describe('MatchmakingManager', () => {
  it('selects the closest eligible queued opponent', () => {
    let now = 0;
    const manager = new MatchmakingManager(() => now);

    manager.enqueue(player('p1', 1000));
    now = 1_000;
    manager.enqueue(player('p2', 1200));
    now = 2_000;
    const match = manager.enqueue(player('p3', 1005));

    expect(match).toEqual(expect.objectContaining({
      host: expect.objectContaining({ id: 'p1' }),
      guest: expect.objectContaining({ id: 'p3' }),
      ratingDifference: 5,
    }));
    expect(manager.size).toBe(1);
  });

  it('matches a wider rating gap only after the older player has waited', () => {
    let now = 0;
    const manager = new MatchmakingManager(() => now);
    manager.enqueue(player('p1', 1000));

    now = 10_000;
    const match = manager.enqueue(player('p2', 1150));

    expect(match).toEqual(expect.objectContaining({ ratingDifference: 150 }));
    expect(manager.size).toBe(0);
  });

  it('allows a queued player to cancel safely', () => {
    const manager = new MatchmakingManager(() => 0);
    manager.enqueue(player('p1', 1000));

    expect(manager.getQueuePosition('p1')).toBe(1);
    expect(manager.cancel('p1')).toBe(true);
    expect(manager.cancel('p1')).toBe(false);
    expect(manager.size).toBe(0);
  });
});
