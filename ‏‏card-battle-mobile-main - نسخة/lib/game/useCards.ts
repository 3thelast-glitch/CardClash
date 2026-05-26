/**
 * useCards — Single source of truth for card data.
 *
 * Merges ALL_CARDS (static) + custom cards (AsyncStorage)
 * + gallery edits + custom images (IndexedDB) + rage overrides.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_CARDS } from './cards-data-exports';
import { loadCustomCards } from './custom-cards-store';
import { loadImage } from './image-storage';
import { Card } from './types';
import { getRageOverrides } from './rage-store';

export const CARD_EDITS_KEY = 'card_edits_v1';

function dedup(cards: Card[]): Card[] {
  return Object.values(
    cards.reduce<Record<string, Card>>((acc, card) => {
      acc[card.id] = card;
      return acc;
    }, {})
  );
}

function isVideoUri(uri: string): boolean {
  const lower = uri.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov')
    || lower.startsWith('data:video/');
}

const DELETED_CARDS_KEY = 'deleted_cards_v1';

/**
 * Returns ALL_CARDS + custom cards merged with:
 *  1. Gallery edits (attack, defense, nameAr, rarity, etc.)
 *  2. Custom images / videos from IndexedDB
 *  3. Rage mode overrides
 *  4. Filters out cards the player has deleted
 */
export async function getCardsWithEdits(): Promise<Card[]> {
  try {
    const [customCards, rawEdits, rageMap, rawDeleted] = await Promise.all([
      loadCustomCards(),
      AsyncStorage.getItem(CARD_EDITS_KEY),
      getRageOverrides(),
      AsyncStorage.getItem(DELETED_CARDS_KEY),
    ]);

    // Build deleted IDs set
    const deletedIds: Set<string> = rawDeleted ? new Set(JSON.parse(rawDeleted)) : new Set();

    const unique = dedup([...ALL_CARDS, ...customCards])
      .filter(c => !deletedIds.has(c.id));

    const editsMap: Record<string, any> = rawEdits ? JSON.parse(rawEdits) : {};

    // تحميل الصور من IndexedDB لكل كارت عنده hasCustomImage
    const imageEntries = await Promise.all(
      unique
        .filter(c => editsMap[c.id]?.hasCustomImage)
        .map(async c => {
          const img = await loadImage(`card_img_${c.id}`);
          return [c.id, img] as [string, string | undefined];
        })
    );
    const imageMap = Object.fromEntries(
      imageEntries.filter(([, img]) => !!img)
    );

    return unique.map(c => {
      const edit = editsMap[c.id];
      let merged: Card = edit ? { ...c, ...edit } : { ...c };

      // ربط الصورة / الفيديو
      if (imageMap[c.id]) {
        (merged as any).customImage = imageMap[c.id];
        (merged as any).isVideo = edit?.isVideo ?? isVideoUri(imageMap[c.id]!);
      }

      if (rageMap[c.id]) merged = { ...merged, rageMode: rageMap[c.id] };
      return merged;
    });
  } catch {
    return dedup(ALL_CARDS);
  }
}

/**
 * React hook — returns all cards (base + custom) with edits + images + rage applied.
 * @param ids  Optional card IDs to filter.
 */
export function useCards(ids?: string[]): Card[] {
  const [cards, setCards] = useState<Card[]>(() => {
    const unique = dedup(ALL_CARDS);
    return ids ? unique.filter(c => ids.includes(c.id)) : unique;
  });

  useEffect(() => {
    let cancelled = false;
    getCardsWithEdits().then(merged => {
      if (cancelled) return;
      setCards(ids ? merged.filter(c => ids.includes(c.id)) : merged);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids?.join(',')]);

  return cards;
}
