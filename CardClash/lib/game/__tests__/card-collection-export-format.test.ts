import { describe, expect, it } from 'vitest';
import {
  CARD_COLLECTION_EXPORT_VERSION,
  parseCardCollectionExport,
  validateCardCollectionExport,
} from '../card-collection-export-format';
import { loadProjectCardCollection } from '../project-card-collection';

const validExport = {
  version: CARD_COLLECTION_EXPORT_VERSION,
  exportedAt: '2026-08-20T00:00:00.000Z',
  cardEdits: {},
  deletedCards: [],
  customCards: [],
  rageOverrides: {},
  images: {},
};

describe('card collection project export', () => {
  it('accepts a valid local Card Collection export', () => {
    expect(validateCardCollectionExport(validExport)).toBe(true);
    expect(parseCardCollectionExport(validExport)).toEqual(validExport);
  });

  it('rejects an export with a malformed custom card or image payload', () => {
    expect(validateCardCollectionExport({ ...validExport, customCards: [{ id: 'bad', attack: '7', defense: 3 }] })).toBe(false);
    expect(validateCardCollectionExport({ ...validExport, images: { art: 7 } })).toBe(false);
  });

  it('rejects an incompatible export version before it reaches local storage', () => {
    expect(parseCardCollectionExport({ ...validExport, version: 1 })).toBeNull();
  });

  it('loads the Git-tracked project collection with the same validated format', () => {
    const projectCollection = loadProjectCardCollection();
    expect(validateCardCollectionExport(projectCollection)).toBe(true);
    expect(projectCollection.version).toBe(CARD_COLLECTION_EXPORT_VERSION);
  });
});
