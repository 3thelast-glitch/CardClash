import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateElo, DEFAULT_ELO, eloTier, type MatchResult } from '@/lib/stats/elo';

const RANKED_PROFILE_KEY = '@card_clash_ranked_profile_v1';

export interface RankedProfile {
  rating: number;
  tier: string;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
}

export const DEFAULT_RANKED_PROFILE: RankedProfile = {
  rating: DEFAULT_ELO,
  tier: eloTier(DEFAULT_ELO),
  wins: 0,
  losses: 0,
  draws: 0,
  matchesPlayed: 0,
};

export async function loadRankedProfile(): Promise<RankedProfile> {
  try {
    const saved = await AsyncStorage.getItem(RANKED_PROFILE_KEY);
    if (!saved) return { ...DEFAULT_RANKED_PROFILE };
    const parsed = JSON.parse(saved) as Partial<RankedProfile>;
    const rating = typeof parsed.rating === 'number' ? parsed.rating : DEFAULT_ELO;
    return {
      ...DEFAULT_RANKED_PROFILE,
      ...parsed,
      rating,
      tier: eloTier(rating),
    };
  } catch {
    return { ...DEFAULT_RANKED_PROFILE };
  }
}

export async function saveRankedProfile(profile: RankedProfile): Promise<void> {
  await AsyncStorage.setItem(RANKED_PROFILE_KEY, JSON.stringify(profile));
}

export async function recordRankedResult(
  profile: RankedProfile,
  opponentRating: number,
  result: MatchResult,
): Promise<RankedProfile> {
  const rating = calculateElo(profile.rating, opponentRating, result);
  const next: RankedProfile = {
    rating,
    tier: eloTier(rating),
    wins: profile.wins + (result === 'win' ? 1 : 0),
    losses: profile.losses + (result === 'loss' ? 1 : 0),
    draws: profile.draws + (result === 'draw' ? 1 : 0),
    matchesPlayed: profile.matchesPlayed + 1,
  };
  await saveRankedProfile(next);
  return next;
}
