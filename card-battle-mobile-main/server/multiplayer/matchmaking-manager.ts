import type { Player } from './room-manager';

export const DEFAULT_RATING = 1000;
export const INITIAL_RATING_WINDOW = 100;
export const RATING_WINDOW_STEP = 50;
export const RATING_WINDOW_STEP_MS = 10_000;
export const MAX_RATING_WINDOW = 400;

export type CompetitiveTier = 'Iron' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Legend';

export interface RankedPlayer extends Player {
  rating: number;
}

export interface QueueEntry {
  player: RankedPlayer;
  queuedAt: number;
}

export interface MatchPair {
  host: RankedPlayer;
  guest: RankedPlayer;
  ratingDifference: number;
}

export function normalizeRating(rating: number | undefined): number {
  if (!Number.isFinite(rating)) return DEFAULT_RATING;
  return Math.max(0, Math.min(3000, Math.round(rating as number)));
}

export function tierForRating(rating: number): CompetitiveTier {
  if (rating >= 2000) return 'Legend';
  if (rating >= 1600) return 'Diamond';
  if (rating >= 1300) return 'Gold';
  if (rating >= 1200) return 'Silver';
  if (rating >= 1100) return 'Bronze';
  return 'Iron';
}

export function allowedRatingDifference(waitedMs: number): number {
  const expandedSteps = Math.max(0, Math.floor(waitedMs / RATING_WINDOW_STEP_MS));
  return Math.min(MAX_RATING_WINDOW, INITIAL_RATING_WINDOW + expandedSteps * RATING_WINDOW_STEP);
}

/**
 * In-memory ranked queue. It prefers the closest eligible rating, while an
 * older queued player progressively accepts a wider rating difference.
 */
export class MatchmakingManager {
  private readonly queue = new Map<string, QueueEntry>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  enqueue(player: RankedPlayer): MatchPair | null {
    this.cancel(player.id);
    const candidate: RankedPlayer = { ...player, rating: normalizeRating(player.rating) };
    const now = this.now();
    const match = this.findBestMatch(candidate, now);

    if (!match) {
      this.queue.set(candidate.id, { player: candidate, queuedAt: now });
      return null;
    }

    this.queue.delete(match.player.id);
    const host = match.queuedAt <= now ? match.player : candidate;
    const guest = host.id === candidate.id ? match.player : candidate;
    return {
      host,
      guest,
      ratingDifference: Math.abs(host.rating - guest.rating),
    };
  }

  cancel(playerId: string): boolean {
    return this.queue.delete(playerId);
  }

  getQueuePosition(playerId: string): number | null {
    const entry = this.queue.get(playerId);
    if (!entry) return null;
    const ordered = [...this.queue.values()].sort((a, b) => a.queuedAt - b.queuedAt);
    return ordered.findIndex((item) => item.player.id === entry.player.id) + 1;
  }

  getSearchRange(playerId: string): number | null {
    const entry = this.queue.get(playerId);
    return entry ? allowedRatingDifference(this.now() - entry.queuedAt) : null;
  }

  get size(): number {
    return this.queue.size;
  }

  private findBestMatch(candidate: RankedPlayer, now: number): QueueEntry | null {
    const eligible = [...this.queue.values()].filter((entry) => {
      const difference = Math.abs(candidate.rating - entry.player.rating);
      const candidateRange = allowedRatingDifference(0);
      const entryRange = allowedRatingDifference(now - entry.queuedAt);
      return difference <= Math.max(candidateRange, entryRange);
    });

    return eligible.sort((a, b) => {
      const aDifference = Math.abs(candidate.rating - a.player.rating);
      const bDifference = Math.abs(candidate.rating - b.player.rating);
      if (aDifference !== bDifference) return aDifference - bDifference;
      return a.queuedAt - b.queuedAt;
    })[0] ?? null;
  }
}
