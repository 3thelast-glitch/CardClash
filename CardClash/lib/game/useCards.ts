/**
 * useCards — Single source of truth for card data.
 *
 * Merges ALL_CARDS (static) + project Card Collection + custom cards (AsyncStorage)
 * + gallery edits + custom images (IndexedDB) + rage overrides.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_CARDS } from './cards-data-exports';
import { loadCustomCards } from './custom-cards-store';
import { loadImage } from './image-storage';
import { Card } from './types';
import { getRageOverrides } from './rage-store';
import { normalizeCardPower } from './card-power-balance';
import { rebalanceCardStats } from './card-stat-rebalance';
import { loadProjectCardCollection } from './project-card-collection';
import type { CardCollectionExport } from './card-collection-export-format';
import { attachProfessionalCardAbilities } from './professional-card-abilities';

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
 * يدمج تعديلات ملف المشروع مع تعديلات الجهاز قبل إرجاع البطاقات المستخدمة في اللعب.
 * لتعديل الجهاز أولوية على ملف المشروع حتى لا تضيع تعديلات اللاعب غير المصدّرة بعد.
 */
export function mergeCardCollectionEdits(
  cards: Card[],
  projectCollection: Pick<CardCollectionExport, 'cardEdits' | 'deletedCards' | 'rageOverrides'>,
  localEdits: Record<string, any>,
  localRageOverrides: Record<string, any>,
  localDeletedIds: Set<string>,
): Card[] {
  const deletedIds = new Set([...projectCollection.deletedCards, ...localDeletedIds]);
  const editsMap = { ...projectCollection.cardEdits, ...localEdits } as Record<string, any>;
  const rageMap = { ...projectCollection.rageOverrides, ...localRageOverrides } as Record<string, any>;

  return attachProfessionalCardAbilities(rebalanceCardStats(cards
    .filter(card => !deletedIds.has(card.id))
    .map(card => {
      let merged: Card = editsMap[card.id] ? { ...card, ...editsMap[card.id] } : { ...card };
      if (rageMap[card.id]) merged = { ...merged, rageMode: rageMap[card.id] };
      return normalizeCardPower(merged);
    })));
}

/**
 * Returns ALL_CARDS + custom cards merged with:
 *  1. Project Card Collection edits and local gallery edits
 *  2. Custom images / videos from IndexedDB and project data
 *  3. Project and local rage mode overrides
 *  4. Project and local deleted cards
 */
export async function getCardsWithEdits(): Promise<Card[]> {
  try {
    const projectCollection = loadProjectCardCollection();
    const [customCards, rawEdits, localRageOverrides, rawDeleted] = await Promise.all([
      loadCustomCards(),
      AsyncStorage.getItem(CARD_EDITS_KEY),
      getRageOverrides(),
      AsyncStorage.getItem(DELETED_CARDS_KEY),
    ]);

    const localDeletedIds: Set<string> = rawDeleted ? new Set(JSON.parse(rawDeleted)) : new Set();
    const unique = dedup([...ALL_CARDS, ...customCards]);
    const localEdits: Record<string, any> = rawEdits ? JSON.parse(rawEdits) : {};
    const editsMap = { ...projectCollection.cardEdits, ...localEdits } as Record<string, any>;

    const imageEntries = await Promise.all(
      unique
        .filter(card => editsMap[card.id]?.hasCustomImage)
        .map(async card => {
          const image = await loadImage(`card_img_${card.id}`)
            ?? projectCollection.images[`card_img_${card.id}`];
          return [card.id, image] as [string, string | undefined];
        })
    );
    const imageMap = Object.fromEntries(imageEntries.filter(([, image]) => !!image));
    const cardsWithImages = unique.map(card => {
      const edit = editsMap[card.id];
      const merged: Card = { ...card };
      if (imageMap[card.id]) {
        (merged as any).customImage = imageMap[card.id];
        (merged as any).isVideo = edit?.isVideo ?? isVideoUri(imageMap[card.id]!);
      }
      return merged;
    });

    return mergeCardCollectionEdits(
      cardsWithImages,
      projectCollection,
      localEdits,
      localRageOverrides,
      localDeletedIds,
    );
  } catch {
    return rebalanceCardStats(dedup(ALL_CARDS));
  }
}

/**
 * React hook — returns all cards (base + custom) with edits + images + rage applied.
 * @param ids  Optional card IDs to filter.
 */
export function useCards(ids?: string[]): Card[] {
  const [cards, setCards] = useState<Card[]>(() => {
    const unique = dedup(ALL_CARDS);
    return ids ? unique.filter(card => ids.includes(card.id)) : unique;
  });

  useEffect(() => {
    let cancelled = false;
    getCardsWithEdits().then(merged => {
      if (cancelled) return;
      setCards(ids ? merged.filter(card => ids.includes(card.id)) : merged);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids?.join(',')]);

  return cards;
}
