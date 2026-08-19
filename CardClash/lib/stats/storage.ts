import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerStats, DEFAULT_STATS, MatchHistory } from './types';

const STATS_KEY = '@card_battle_stats';

// قراءة الإحصائيات
export async function loadStats(): Promise<PlayerStats> {
  try {
    const data = await AsyncStorage.getItem(STATS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_STATS,
        ...parsed,
        factionStats: parsed.factionStats ?? {},
        matchHistory: (parsed.matchHistory ?? []).map((match: any) => ({
          ...match,
          factionsUsed: match.factionsUsed ?? [],
        })),
      };
    }
    return { ...DEFAULT_STATS, factionStats: { ...DEFAULT_STATS.factionStats }, matchHistory: [...DEFAULT_STATS.matchHistory] };
  } catch (error) {
    console.error('Error loading stats: - storage.ts:15', error);
    return { ...DEFAULT_STATS, factionStats: { ...DEFAULT_STATS.factionStats }, matchHistory: [...DEFAULT_STATS.matchHistory] };
  }
}

// حفظ الإحصائيات
export async function saveStats(stats: PlayerStats): Promise<void> {
  try {
    const updatedStats = {
      ...stats,
      lastUpdated: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updatedStats));
  } catch (error) {
    console.error('Error saving stats: - storage.ts:29', error);
  }
}

// تحديث الإحصائيات بعد المباراة
export async function updateStatsAfterMatch(
  playerScore: number,
  botScore: number,
  totalRounds: number,
  factionsUsed: string[],
  difficulty: 1 | 2 | 3 | 4 | 5 = 2
): Promise<PlayerStats> {
  const stats = await loadStats();

  // تحديد الفائز
  let winner: 'player' | 'bot' | 'draw';
  if (playerScore > botScore) {
    winner = 'player';
    stats.totalWins++;
    stats.currentWinStreak++;
    if (stats.currentWinStreak > stats.bestWinStreak) {
      stats.bestWinStreak = stats.currentWinStreak;
    }
  } else if (botScore > playerScore) {
    winner = 'bot';
    stats.totalLosses++;
    stats.currentWinStreak = 0;
  } else {
    winner = 'draw';
    stats.totalDraws++;
    stats.currentWinStreak = 0;
  }

  stats.totalMatches++;

  // تحديث أعلى نتيجة
  if (playerScore > stats.highestScore) {
    stats.highestScore = playerScore;
  }

  // تحديث إحصائيات الفصائل
  factionsUsed.forEach((faction) => {
    if (!stats.factionStats[faction]) {
      stats.factionStats[faction] = {
        faction,
        timesUsed: 0,
        wins: 0,
        losses: 0,
      };
    }
    stats.factionStats[faction].timesUsed++;
    if (winner === 'player') {
      stats.factionStats[faction].wins++;
    } else if (winner === 'bot') {
      stats.factionStats[faction].losses++;
    }
  });

  // إضافة المباراة إلى السجل
  const match: MatchHistory = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    playerScore,
    botScore,
    totalRounds,
    winner,
    factionsUsed,
    difficulty,
  };

  stats.matchHistory.unshift(match);

  // الاحتفاظ بآخر 10 مباريات فقط
  if (stats.matchHistory.length > 10) {
    stats.matchHistory = stats.matchHistory.slice(0, 10);
  }

  await saveStats(stats);
  return stats;
}

// إعادة تعيين الإحصائيات
export async function resetStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATS_KEY);
  } catch (error) {
    console.error('Error resetting stats: - storage.ts:115', error);
  }
}
