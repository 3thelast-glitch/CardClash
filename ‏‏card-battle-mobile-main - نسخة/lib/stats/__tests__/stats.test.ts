import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadStats, saveStats, updateStatsAfterMatch, resetStats } from '../storage';
import { DEFAULT_STATS } from '../types';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('نظام الإحصائيات', () => {
  let mockStorage: any = {};

  beforeEach(async () => {
    // تنظيف التخزين قبل كل اختبار
    mockStorage = {};
    vi.clearAllMocks();
    
    (AsyncStorage.getItem as any).mockImplementation((key: string) => {
      return Promise.resolve(mockStorage[key] || null);
    });
    
    (AsyncStorage.setItem as any).mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    });
    
    (AsyncStorage.removeItem as any).mockImplementation((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    });
  });

  it('يجب تحميل الإحصائيات الافتراضية عند عدم وجود بيانات', async () => {
    const stats = await loadStats();
    expect(stats.totalMatches).toBe(0);
    expect(stats.totalWins).toBe(0);
    expect(stats.totalLosses).toBe(0);
  });

  it('يجب حفظ الإحصائيات بنجاح', async () => {
    const testStats = {
      ...DEFAULT_STATS,
      totalMatches: 5,
      totalWins: 3,
      totalLosses: 2,
    };
    
    await saveStats(testStats);
    const loaded = await loadStats();
    
    expect(loaded.totalMatches).toBe(5);
    expect(loaded.totalWins).toBe(3);
    expect(loaded.totalLosses).toBe(2);
  });

  it('يجب تحديث الإحصائيات بعد الفوز', async () => {
    const stats = await updateStatsAfterMatch(3, 2, 5, ['🔥 نار', '❄️ جليد']);
    
    expect(stats.totalMatches).toBe(1);
    expect(stats.totalWins).toBe(1);
    expect(stats.totalLosses).toBe(0);
    expect(stats.currentWinStreak).toBeGreaterThanOrEqual(1);
    expect(stats.highestScore).toBe(3);
  });

  it('يجب تحديث الإحصائيات بعد الخسارة', async () => {
    const stats = await updateStatsAfterMatch(2, 3, 5, ['🔥 نار']);
    
    expect(stats.totalMatches).toBeGreaterThanOrEqual(1);
    expect(stats.totalLosses).toBeGreaterThanOrEqual(1);
  });

  it('يجب تحديث إحصائيات العناصر', async () => {
    const stats = await updateStatsAfterMatch(3, 2, 5, ['🔥 نار', '❄️ جليد', '🔥 نار']);
    
    expect(stats.elementStats['🔥 نار']).toBeDefined();
    expect(stats.elementStats['🔥 نار'].timesUsed).toBeGreaterThanOrEqual(2);
    expect(stats.elementStats['❄️ جليد']).toBeDefined();
  });

  it('يجب إعادة تعيين الإحصائيات', async () => {
    // إنشاء مخزن جديد لهذا الاختبار
    mockStorage = {};
    
    await updateStatsAfterMatch(3, 2, 5, ['🔥 نار']);
    await resetStats();
    
    const stats = await loadStats();
    expect(stats.totalMatches).toBe(0);
    expect(stats.totalWins).toBe(0);
  });
});
