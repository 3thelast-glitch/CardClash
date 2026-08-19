export const CARD_COLLECTION_EXPORT_VERSION = 2;

export interface CardCollectionExport {
  version: number;
  exportedAt: string;
  cardEdits: Record<string, unknown>;
  deletedCards: string[];
  customCards: Record<string, unknown>[];
  rageOverrides: Record<string, unknown>;
  images: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCustomCard(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const id = value.id;
  const attack = value.attack;
  const defense = value.defense;
  return (typeof id === 'string' || typeof id === 'number')
    && typeof attack === 'number' && Number.isFinite(attack)
    && typeof defense === 'number' && Number.isFinite(defense);
}

export function validateCardCollectionExport(value: unknown): value is CardCollectionExport {
  if (!isRecord(value)) return false;
  return value.version === CARD_COLLECTION_EXPORT_VERSION
    && typeof value.exportedAt === 'string' && value.exportedAt.length > 0
    && isRecord(value.cardEdits)
    && Array.isArray(value.deletedCards) && value.deletedCards.every(id => typeof id === 'string')
    && Array.isArray(value.customCards) && value.customCards.every(isCustomCard)
    && isRecord(value.rageOverrides)
    && isRecord(value.images) && Object.values(value.images).every(image => typeof image === 'string');
}

export function parseCardCollectionExport(value: unknown): CardCollectionExport | null {
  return validateCardCollectionExport(value) ? value : null;
}
