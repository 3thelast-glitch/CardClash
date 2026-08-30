import { ALL_CARDS } from '../../lib/game/cards-data-exports';
import { attachProfessionalCardAbilities } from '../../lib/game/professional-card-abilities';
import { normalizeCardPower } from '../../lib/game/card-power-balance';
import { rebalanceCardStats } from '../../lib/game/card-stat-rebalance';
import { loadProjectCardCollection } from '../../lib/game/project-card-collection';
import type { Card } from '../../lib/game/types';

export type CardIdResolver = (cardIds: readonly string[]) => Card[] | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlayableProjectCard(value: unknown): value is Card {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.nameAr === 'string'
    && typeof value.attack === 'number'
    && Number.isFinite(value.attack)
    && typeof value.defense === 'number'
    && Number.isFinite(value.defense)
    && typeof value.race === 'string'
    && typeof value.cardClass === 'string';
}

function cloneServerCard(card: Card): Card {
  return {
    ...card,
    tags: card.tags ? [...card.tags] : undefined,
    cardEffects: card.cardEffects ? [...card.cardEffects] : undefined,
    rageMode: card.rageMode ? { ...card.rageMode } : undefined,
  };
}

/**
 * Builds the server-owned card catalog from repository-tracked data only.
 * Device-local edits and arbitrary client statistics never enter online matches.
 */
export function buildTrustedCardCatalog(): ReadonlyMap<string, Card> {
  const project = loadProjectCardCollection();
  const deletedIds = new Set(project.deletedCards);
  const projectCards: Card[] = project.customCards
    .filter(isPlayableProjectCard)
    .map((rawCard) => {
      const card = rawCard as unknown as Card;
      return {
        ...card,
        element: card.element ?? 'fire',
        hp: card.hp ?? card.defense,
      };
    });
  const deduplicated = [...ALL_CARDS, ...projectCards].reduce<Map<string, Card>>((cards, card) => {
    cards.set(card.id, card);
    return cards;
  }, new Map());

  const merged = [...deduplicated.values()]
    .filter((card) => !deletedIds.has(card.id))
    .map((card) => {
      const edit = project.cardEdits[card.id];
      const rageOverride = project.rageOverrides[card.id];
      const withEdit = isRecord(edit) ? { ...card, ...edit } as Card : { ...card };
      const withRage = isRecord(rageOverride) ? { ...withEdit, rageMode: rageOverride as unknown as Card['rageMode'] } : withEdit;
      return normalizeCardPower(withRage);
    });

  const balanced = attachProfessionalCardAbilities(rebalanceCardStats(merged));
  return new Map(balanced.map((card) => [card.id, cloneServerCard(card)]));
}

const TRUSTED_CARD_CATALOG = buildTrustedCardCatalog();

export const resolveTrustedCardIds: CardIdResolver = (cardIds) => {
  const cards: Card[] = [];
  for (const cardId of cardIds) {
    const card = TRUSTED_CARD_CATALOG.get(cardId);
    if (!card) return null;
    cards.push(cloneServerCard(card));
  }
  return cards;
};

export function hasTrustedCardId(cardId: string): boolean {
  return TRUSTED_CARD_CATALOG.has(cardId);
}
