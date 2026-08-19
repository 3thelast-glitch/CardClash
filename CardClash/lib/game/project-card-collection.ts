import {
  CARD_COLLECTION_EXPORT_VERSION,
  parseCardCollectionExport,
  type CardCollectionExport,
} from './card-collection-export-format';

const EMPTY_PROJECT_COLLECTION: CardCollectionExport = {
  version: CARD_COLLECTION_EXPORT_VERSION,
  exportedAt: '',
  cardEdits: {},
  deletedCards: [],
  customCards: [],
  rageOverrides: {},
  images: {},
};

/**
 * بيانات Card Collection التي يتتبعها Git. تبقى قراءة فقط وقت التشغيل؛
 * لذلك لا يمكن لتعديل عابر في التطبيق الكتابة فوق ملف المصدر دون تصديره يدوياً.
 */
export function loadProjectCardCollection(): CardCollectionExport {
  try {
    const raw = require('../../data/card-collection.json') as unknown;
    return parseCardCollectionExport(raw) ?? EMPTY_PROJECT_COLLECTION;
  } catch {
    return EMPTY_PROJECT_COLLECTION;
  }
}
