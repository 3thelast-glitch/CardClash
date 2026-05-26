/**
 * custom-cards-store.ts
 * يخزن الكروت المضافة من داخل التطبيق في AsyncStorage
 * ويولّد كود TypeScript جاهز للنسخ/اللصق في cards-batch
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from './types';
import { getRarityFromStars } from './card-rarity';

export const CUSTOM_CARDS_KEY = 'custom_cards_v1';

/** حفظ كارت جديد أو تحديث موجود */
export async function saveCustomCard(card: Card): Promise<void> {
  const existing = await loadCustomCards();
  const normalizedCard = {
    ...card,
    rarity: getRarityFromStars(card.stars)
  };
  const updated = [...existing.filter(c => c.id !== card.id), normalizedCard];
  await AsyncStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(updated));
}

/** تحميل كل الكروت المخصصة */
export async function loadCustomCards(): Promise<Card[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** حذف كارت */
export async function deleteCustomCard(id: string): Promise<void> {
  const existing = await loadCustomCards();
  await AsyncStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(existing.filter(c => c.id !== id)));
}

/** توليد كود TypeScript للكارت — للنسخ إلى cards-batch */
export function generateCardCode(card: Card): string {
  const tagsStr    = (card.tags || []).map(t => `'${t}'`).join(', ');
  const effectsStr = card.cardEffects?.length
    ? `\n  cardEffects: [${card.cardEffects.map(e => `'${e}'`).join(', ')}],`
    : '';
  const abilityStr = card.specialAbility
    ? `\n  specialAbility: '${card.specialAbility.replace(/'/g, "\\'")}'` + ','
    : '';
  const starsCount = card.stars ?? 1;
  const determinedRarity = getRarityFromStars(starsCount);
  return `  {
  id: '${card.id}',
  name: '${card.name}',
  nameAr: '${card.nameAr}',
  attack: ${card.attack},
  defense: ${card.defense},
  hp: ${card.hp ?? card.defense},
  race: '${card.race}',
  cardClass: '${card.cardClass}',
  element: '${card.element}',
  tags: [${tagsStr}],
  rarity: '${determinedRarity}',
  stars: ${starsCount},${abilityStr}${effectsStr}
},`;
}
