// أنواع نظام الإحصائيات

export interface MatchHistory {
  id: string;
  date: string;
  playerScore: number;
  botScore: number;
  totalRounds: number;
  winner: 'player' | 'bot' | 'draw';
  elementsUsed: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ElementStats {
  element: string;
  timesUsed: number;
  wins: number;
  losses: number;
}

export interface PlayerStats {
  // إحصائيات عامة
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  
  // أفضل النتائج
  bestWinStreak: number;
  currentWinStreak: number;
  highestScore: number;
  
  // إحصائيات العناصر
  elementStats: Record<string, ElementStats>;
  
  // سجل المباريات (آخر 10)
  matchHistory: MatchHistory[];
  
  // تاريخ آخر تحديث
  lastUpdated: string;
}

export const DEFAULT_STATS: PlayerStats = {
  totalMatches: 0,
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  bestWinStreak: 0,
  currentWinStreak: 0,
  highestScore: 0,
  elementStats: {},
  matchHistory: [],
  lastUpdated: new Date().toISOString(),
};
