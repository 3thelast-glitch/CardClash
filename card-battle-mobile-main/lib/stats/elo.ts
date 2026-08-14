// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ELO Rating System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const K = 32;
export const DEFAULT_ELO = 1000;

export type MatchResult = 'win' | 'loss' | 'draw';

/**
 * احسب تصنيف ELO الجديد بعد مباراة
 */
export function calculateElo(
  playerRating: number,
  opponentRating: number,
  result: MatchResult
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(playerRating + K * (score - expected));
}

/**
 * احسب الفرق في النقاط بعد المباراة
 */
export function eloDelta(
  playerRating: number,
  opponentRating: number,
  result: MatchResult
): number {
  return calculateElo(playerRating, opponentRating, result) - playerRating;
}

/**
 * أعطِ لقب حسب التصنيف
 */
export function eloTier(rating: number): string {
  if (rating >= 2000) return '👑 Legend';
  if (rating >= 1600) return '💎 Diamond';
  if (rating >= 1300) return '🥇 Gold';
  if (rating >= 1200) return '🥈 Silver';
  if (rating >= 1100) return '🥉 Bronze';
  return '⚔️ Iron';
}
