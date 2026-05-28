// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Multiplayer Statistics — AsyncStorage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateElo, DEFAULT_ELO, MatchResult } from './elo';

const MP_STATS_KEY = 'mp_stats';
const ELO_KEY      = 'mp_elo';

export interface MultiplayerStats {
  onlineWins:   number;
  onlineLosses: number;
  onlineDraws:  number;
  totalOnline:  number;
  winRate:      number; // 0–100
  currentElo:   number;
  peakElo:      number;
}

const DEFAULT_STATS: MultiplayerStats = {
  onlineWins:   0,
  onlineLosses: 0,
  onlineDraws:  0,
  totalOnline:  0,
  winRate:      0,
  currentElo:   DEFAULT_ELO,
  peakElo:      DEFAULT_ELO,
};

export async function getMpStats(): Promise<MultiplayerStats> {
  try {
    const raw = await AsyncStorage.getItem(MP_STATS_KEY);
    return raw ? JSON.parse(raw) : { ...DEFAULT_STATS };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export async function recordMpMatch(
  result: MatchResult,
  opponentElo: number = DEFAULT_ELO
): Promise<{ stats: MultiplayerStats; eloDelta: number }> {
  const stats = await getMpStats();

  // تحديث الأعداد
  if (result === 'win')  stats.onlineWins++;
  if (result === 'loss') stats.onlineLosses++;
  if (result === 'draw') stats.onlineDraws++;
  stats.totalOnline++;

  // حساب نسبة الفوز
  stats.winRate = Math.round((stats.onlineWins / stats.totalOnline) * 100);

  // تحديث ELO
  const newElo  = calculateElo(stats.currentElo, opponentElo, result);
  const delta   = newElo - stats.currentElo;
  stats.currentElo = newElo;
  if (newElo > stats.peakElo) stats.peakElo = newElo;

  await AsyncStorage.setItem(MP_STATS_KEY, JSON.stringify(stats));
  return { stats, eloDelta: delta };
}

export async function resetMpStats(): Promise<void> {
  await AsyncStorage.setItem(MP_STATS_KEY, JSON.stringify({ ...DEFAULT_STATS }));
}
