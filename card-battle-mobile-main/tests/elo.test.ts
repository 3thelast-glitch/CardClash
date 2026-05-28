// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Unit Tests — ELO System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { calculateElo, eloDelta, eloTier, DEFAULT_ELO } from '../lib/stats/elo';

describe('ELO Rating System', () => {

  describe('calculateElo', () => {
    it('should increase rating on win', () => {
      const newRating = calculateElo(1000, 1000, 'win');
      expect(newRating).toBeGreaterThan(1000);
    });

    it('should decrease rating on loss', () => {
      const newRating = calculateElo(1000, 1000, 'loss');
      expect(newRating).toBeLessThan(1000);
    });

    it('should stay close to same on draw vs equal opponent', () => {
      const newRating = calculateElo(1000, 1000, 'draw');
      expect(newRating).toBe(1000);
    });

    it('should gain less ELO when beating a weaker opponent', () => {
      const vsWeak   = eloDelta(1000, 800,  'win');
      const vsStrong = eloDelta(1000, 1200, 'win');
      expect(vsWeak).toBeLessThan(vsStrong);
    });

    it('should lose less ELO when losing to a stronger opponent', () => {
      const lossVsStrong = Math.abs(eloDelta(1000, 1200, 'loss'));
      const lossVsWeak   = Math.abs(eloDelta(1000, 800,  'loss'));
      expect(lossVsStrong).toBeLessThan(lossVsWeak);
    });
  });

  describe('eloTier', () => {
    it('should return Iron for new player', () => {
      expect(eloTier(DEFAULT_ELO)).toBe('⚔️ Iron');
    });
    it('should return Legend for 2000+', () => {
      expect(eloTier(2000)).toBe('👑 Legend');
    });
    it('should return Gold for 1300–1599', () => {
      expect(eloTier(1300)).toBe('🥇 Gold');
    });
  });

});
