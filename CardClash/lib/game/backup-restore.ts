/**
 * backup-restore.ts
 * نظام تصدير واستيراد شامل للكروت وصورها
 * يحمي البيانات من ضياع IndexedDB عند إعادة البناء
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { saveImage, loadImage } from './image-storage';
import { CARD_EDITS_KEY, DELETED_CARDS_KEY } from '@/app/screens/cards-gallery';
import { CUSTOM_CARDS_KEY } from './custom-cards-store';
import { getRageOverrides, saveRageOverride } from './rage-store';
import { loadProjectCardCollection } from './project-card-collection';
import {
  CARD_COLLECTION_EXPORT_VERSION,
  parseCardCollectionExport,
  type CardCollectionExport,
} from './card-collection-export-format';

export const BACKUP_VERSION = CARD_COLLECTION_EXPORT_VERSION;

export type BackupData = CardCollectionExport;

// ── Export ──────────────────────────────────────────────────────────
export async function exportBackup(): Promise<void> {
  if (Platform.OS !== 'web') {
    throw new Error('تصدير ملف المشروع متاح من نسخة الويب؛ افتح Card Collection في المتصفح أولاً');
  }

  const projectCollection = loadProjectCardCollection();

  // 1. اقرأ AsyncStorage وادمجه مع الملف المتتبع في Git
  const [rawEdits, rawDeleted, rawCustom] = await Promise.all([
    AsyncStorage.getItem(CARD_EDITS_KEY),
    AsyncStorage.getItem(DELETED_CARDS_KEY),
    AsyncStorage.getItem(CUSTOM_CARDS_KEY),
  ]);

  const localCardEdits: Record<string, any> = rawEdits ? JSON.parse(rawEdits) : {};
  const localDeletedCards: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
  const localCustomCards: any[] = rawCustom ? JSON.parse(rawCustom) : [];
  const localRageOverrides = await getRageOverrides();
  const cardEdits = { ...projectCollection.cardEdits, ...localCardEdits };
  const deletedCards = [...new Set([...projectCollection.deletedCards, ...localDeletedCards])];
  const customCards = Object.values(
    [...projectCollection.customCards, ...localCustomCards].reduce<Record<string, any>>((acc, card) => {
      if (typeof card?.id === 'string') acc[card.id] = card;
      return acc;
    }, {})
  );
  const rageOverrides = { ...projectCollection.rageOverrides, ...localRageOverrides };

  // 2. اقرأ كل الصور من IndexedDB
  const images: Record<string, string> = { ...projectCollection.images };
  const imageKeys = [
    ...Object.entries(cardEdits)
      .filter(([, d]) => d.hasCustomImage)
      .map(([id]) => `card_img_${id}`),
    ...Object.entries(rageOverrides)
      .filter(([, r]) => (r as any).rageImageUrl?.startsWith('data:'))
      .map(([id]) => `rage_img_${id}`),
  ];

  await Promise.all(
    imageKeys.map(async key => {
      const img = await loadImage(key);
      if (img) images[key] = img;
    })
  );

  // 3. أيضاً رورات الغضب اللي صورها مضمّنة مباشرة كـ base64
  const cleanRage: Record<string, any> = {};
  for (const [id, data] of Object.entries(rageOverrides)) {
    const r = { ...(data as any) };
    if (r.rageImageUrl?.startsWith('data:')) {
      images[`rage_img_${id}`] = r.rageImageUrl;
      r.rageImageUrl = `__ref:rage_img_${id}`;
    }
    cleanRage[id] = r;
  }

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    cardEdits,
    deletedCards,
    customCards,
    rageOverrides: cleanRage,
    images,
  };

  // 4. نزّل الملف
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `card-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ──────────────────────────────────────────────────────────
export async function importBackup(
  onDone: () => void,
  onError: (msg: string) => void
): Promise<void> {
  if (Platform.OS !== 'web') return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = parseCardCollectionExport(JSON.parse(text));

      if (!backup) {
        onError('الملف غير صالح أو تالف');
        return;
      }

      // 1. استرجع الصور إلى IndexedDB
      await Promise.all(
        Object.entries(backup.images || {}).map(([key, base64]) =>
          saveImage(key, base64)
        )
      );

      // 2. أعد ربط صور الغضب
      const rage = { ...(backup.rageOverrides || {}) };
      for (const [id, data] of Object.entries(rage)) {
        const r = { ...(data as any) };
        if (r.rageImageUrl?.startsWith('__ref:')) {
          const refKey = r.rageImageUrl.replace('__ref:', '');
          r.rageImageUrl = backup.images[refKey];
        }
        rage[id] = r;
      }

      // 3. احفظ في AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(CARD_EDITS_KEY, JSON.stringify(backup.cardEdits)),
        AsyncStorage.setItem(
          DELETED_CARDS_KEY,
          JSON.stringify(backup.deletedCards || [])
        ),
        AsyncStorage.setItem(
          CUSTOM_CARDS_KEY,
          JSON.stringify(backup.customCards || [])
        ),
      ]);

      // 4. احفظ rage overrides
      await Promise.all(
        Object.entries(rage).map(([id, data]) =>
          saveRageOverride(id, data as any)
        )
      );

      onDone();
    } catch (err) {
      onError('فشل قراءة الملف: ' + String(err));
    }
  };
  input.click();
}
