/**
 * rage-store.ts
 * حفظ وقراءة إعدادات وضع الغضب لكل كرت — يُخزَّن في AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RageModeData } from './types';

const RAGE_KEY = 'rage_overrides_v1';

export type RageOverridesMap = Record<string, RageModeData>;

/** قراءة كامل خريطة إعدادات الغضب */
export async function getRageOverrides(): Promise<RageOverridesMap> {
  try {
    const raw = await AsyncStorage.getItem(RAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RageOverridesMap;
  } catch {
    return {};
  }
}

/** حفظ إعدادات الغضب لكرت واحد */
export async function saveRageOverride(cardId: string, data: RageModeData): Promise<void> {
  try {
    const map = await getRageOverrides();
    map[cardId] = data;
    await AsyncStorage.setItem(RAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[rage-store] save failed:', e);
  }
}

/** حذف إعدادات الغضب لكرت واحد */
export async function deleteRageOverride(cardId: string): Promise<void> {
  try {
    const map = await getRageOverrides();
    delete map[cardId];
    await AsyncStorage.setItem(RAGE_KEY, JSON.stringify(map));
  } catch {}
}

/** دمج إعدادات الغضب المحفوظة على قائمة بطاقات */
export async function injectRageModes<T extends { id: string; rageMode?: RageModeData }>(cards: T[]): Promise<T[]> {
  const map = await getRageOverrides();
  return cards.map(c => map[c.id] ? { ...c, rageMode: map[c.id] } : c);
}
