/**
 * abilities-store.ts
 * حفظ / تحميل IDs القدرات المعطّلة في AsyncStorage.
 * يعتمد على id: number من data/abilities.ts فقط.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'disabled_ability_ids';

/** تحميل الـ IDs المعطّلة — يرجع Set<number> فارغة إذا لم يوجد شيء محفوظ */
export async function getDisabledAbilityIds(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<number>();
    const arr: number[] = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set<number>();
  }
}

/** حفظ ال**IDs المعطّلة */
export async function saveDisabledAbilityIds(ids: Set<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // تجاهل أخطاء الحفظ بصمت
  }
}

/** مسح كل التفضيلات */
export async function clearDisabledAbilityIds(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
