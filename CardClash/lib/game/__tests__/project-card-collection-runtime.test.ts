import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { loadProjectCardCollection } from '../project-card-collection';
import { mergeCardCollectionEdits } from '../useCards';

const baseCard = (id: string): Card => ({
  id,
  name: id,
  nameAr: id,
  attack: 1,
  defense: 2,
  hp: 2,
  race: 'human',
  cardClass: 'warrior',
  element: 'fire',
  rarity: 'legendary',
  stars: 5,
});

describe('Project Card Collection runtime merge', () => {
  it('applies a project special ability and balanced stats to the playable card', () => {
    const project = loadProjectCardCollection();
    const [zoro] = mergeCardCollectionEdits(
      [baseCard('roronoa_zoro')],
      project,
      {},
      {},
      new Set(),
    );

    expect(zoro.specialAbility).toBe('يقطع 3 الجولات القادمه ');
    expect(zoro.attack).toBeGreaterThanOrEqual(27);
    expect(zoro.defense).toBeLessThanOrEqual(40);
    expect(zoro.attack).not.toBe(zoro.defense);
  });

  it('gives a device edit priority over the project edit', () => {
    const project = loadProjectCardCollection();
    const [zoro] = mergeCardCollectionEdits(
      [baseCard('roronoa_zoro')],
      project,
      { roronoa_zoro: { specialAbility: 'قدرة محلية اختبارية' } },
      {},
      new Set(),
    );

    expect(zoro.specialAbility).toBe('قدرة محلية اختبارية');
  });
});
