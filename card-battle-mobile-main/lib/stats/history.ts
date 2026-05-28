// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Match History — Solo & Multiplayer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'match_history';
const MAX_RECORDS = 50;

export interface RoundResult {
  round:        number;
  playerCard:   string;
  botCard:      string;
  winner:       'player' | 'bot' | 'draw';
  playerDamage: number;
  botDamage:    number;
}

export interface MatchRecord {
  id:           string;
  date:         string;
  mode:         'solo' | 'online';
  opponentType: 'bot' | 'human';
  result:       'win' | 'loss' | 'draw';
  rounds:       RoundResult[];
  totalRounds:  number;
  // Solo only
  difficulty?:  'easy' | 'medium' | 'hard';
  // Online only
  eloBefore?:   number;
  eloAfter?:    number;
  eloDelta?:    number;
}

export async function getHistory(): Promise<MatchRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addMatchRecord(record: Omit<MatchRecord, 'id' | 'date'>): Promise<void> {
  const history = await getHistory();
  const newRecord: MatchRecord = {
    ...record,
    id:   `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
  };
  // أبقِ آخر MAX_RECORDS مباراة فقط
  const updated = [newRecord, ...history].slice(0, MAX_RECORDS);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

/** فلترة حسب النمط */
export async function getHistoryByMode(mode: 'solo' | 'online'): Promise<MatchRecord[]> {
  const all = await getHistory();
  return all.filter(r => r.mode === mode);
}
