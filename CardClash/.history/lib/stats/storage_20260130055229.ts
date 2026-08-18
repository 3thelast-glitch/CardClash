import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerStats, DEFAULT_STATS, MatchHistory, ElementStats } from './types';

const STATS_KEY = '@card_battle_stats';

// قراءة الإحصائيات
export async function loadStats(): Promise<PlayerStats> {
  try {
    const data = await AsyncStorage.getItem(STATS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return DEFAULT_STATS;
  } catch (error) {
    console.error('Error loading stats:', error);
    return DEFAULT_STATS;
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
    console.error('Error saving stats:', error);
  }
}

// تحديث الإحصائيات بعد المباراة
export async function updateStatsAfterMatch(
  playerScore: number,
  botScore: number,
  totalRounds: number,
  elementsUsed: string[],
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
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
  
  // تحديث إحصائيات العناصر
  elementsUsed.forEach((element) => {
    if (!stats.elementStats[element]) {
      stats.elementStats[element] = {
        element,
        timesUsed: 0,
        wins: 0,
        losses: 0,
      };
    }
    stats.elementStats[element].timesUsed++;
    if (winner === 'player') {
      stats.elementStats[element].wins++;
    } else if (winner === 'bot') {
      stats.elementStats[element].losses++;
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
    elementsUsed,
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
    console.error('Error resetting stats:', error);
  }
}
