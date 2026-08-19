/**
 * rage-engine.ts
 * منطق تفعيل وضع الغضب + القدرات الخاصة بالبطاقات أثناء المعركة
 */
import type { Card, RageModeData } from './types';
import { getCharacterAbility, matchesCharacterAbilityTarget } from './character-abilities';
import { getCardStatCap } from './card-power-balance';

// ─────────────────────────────────────────────
// RAGE STATE
// ─────────────────────────────────────────────

export interface RageState {
  activatedThisMatch: Set<string>;
}

export function buildRageState(): RageState {
  return { activatedThisMatch: new Set() };
}

export function shouldTriggerRage(card: Card, rageState: RageState): boolean {
  const rm = card.rageMode;
  if (!rm?.enabled) return false;
  if (rm.oncePer === 'match' && rageState.activatedThisMatch.has(card.id)) return false;
  return true;
}

export function applyRageToCard(card: Card, rageState: RageState): Card {
  const rm = card.rageMode as RageModeData;
  const statCap = getCardStatCap(card);
  if (rm.oncePer === 'match') rageState.activatedThisMatch.add(card.id);

  const hasRageImageOnly =
    !!(rm.rageImageUrl || (rm as any).image) &&
    !(rm.rageVideoUrl || (rm as any).video);
  const newImageUrl = rm.rageImageUrl || (rm as any).image || card.imageUrl;
  const newVideoUrl = hasRageImageOnly
    ? undefined
    : rm.rageVideoUrl || (rm as any).video || card.videoUrl;
  const hasNewRageMedia = !!(
    rm.rageImageUrl || (rm as any).image ||
    rm.rageVideoUrl || (rm as any).video
  );

  return {
    ...card,
    isRagedVersion: true,
    originalAttack: card.attack,
    originalDefense: card.defense,
    attack:  Math.min(statCap, card.attack  + (rm.rageAttackBoost  ?? 0)),
    defense: Math.min(statCap, card.defense + (rm.rageDefenseBoost ?? 0)),
    nameAr:  rm.rageNameAr ?? card.nameAr,
    imageUrl: newImageUrl,
    videoUrl: newVideoUrl,
    ...(hasNewRageMedia && {
      customImage: undefined,
      finalImage:  undefined,
      localImage:  undefined,
      ...(hasRageImageOnly && { videoUrl: undefined }),
    }),
    _rageActive: true,
  } as Card & { _rageActive: boolean };
}

export interface RageTriggerEvent {
  card: Card;
  rageCard: Card;
  videoUrl?: string;
  imageUrl?: string;
}

export function buildRageTriggerEvent(
  original: Card,
  rageCard: Card,
): RageTriggerEvent {
  return {
    card:     original,
    rageCard,
    videoUrl: original.rageMode?.rageVideoUrl ?? (original as any).videoUrl,
    imageUrl: original.rageMode?.rageImageUrl ?? original.imageUrl,
  };
}

// ─────────────────────────────────────────────
// SPECIAL ABILITIES
// ─────────────────────────────────────────────

export type BattleResult = 'win' | 'lose' | 'draw';

// ── Turin ──────────────────────────────────────

export function sortDeckWithTurinFirst(deck: Card[]): Card[] {
  const turin = deck.find(
    c => (c as any).nameEn === 'Turin' || c.nameAr === 'تورين',
  );
  if (!turin) return deck;
  return [turin, ...deck.filter(c => c.id !== turin.id)];
}

/**
 * Returns how many rounds Turin forces the player to lose.
 *
 * Formula: Math.max(1, Math.floor(totalRounds / 2))
 *
 * Examples:
 *   totalRounds =  1  →  1
 *   totalRounds =  2  →  1
 *   totalRounds =  6  →  3
 *   totalRounds =  7  →  3
 *   totalRounds = 10  →  5
 *   totalRounds = 20  → 10
 */
export function getTurinPenaltyRounds(totalRounds: number): number {
  return Math.max(1, Math.floor(totalRounds / 2));
}

/**
 * Returns true if Turin forces a loss on this round.
 *
 * Rules:
 *   - Turin must be present in playerDeck (any position)
 *   - currentRound is 1-based
 *   - Forces loss for rounds 1 → getTurinPenaltyRounds(totalRounds)
 *   - After that, normal battle logic runs
 *
 * Examples (totalRounds = 10, penaltyRounds = 5):
 *   round 1  → true  (forced loss)
 *   round 5  → true  (forced loss)
 *   round 6  → false (normal)
 *   round 10 → false (normal)
 */
export function isTurinForcedLoss(
  currentRound: number,
  totalRounds: number,
  playerDeck: Card[],
): boolean {
  const hasTurin = playerDeck.some(
    c => (c as any).nameEn === 'Turin' || c.nameAr === 'تورين',
  );
  if (!hasTurin) return false;

  const penaltyRounds = getTurinPenaltyRounds(totalRounds);
  return currentRound <= penaltyRounds;
}

// ── On-spawn passives ──────────────────────────

/** يمنح سجل القدرة صحة مباراة عند دخول البطاقة الجولة، من دون سقف للزيادة. */
export function getOnSpawnMatchHealthBonus(card: Card): number {
  return getCharacterAbility(card)?.roundStartHealthBonus ?? 0;
}

/**
 * Apply when a card enters the field.
 * - Tsunade → +2 HP on spawn
 */
export function applyOnSpawnPassive(card: Card): Card {
  const healthBonus = getOnSpawnMatchHealthBonus(card);
  if (healthBonus === 0) return card;

  return {
    ...card,
    hp: (card.hp ?? 0) + healthBonus,
  };
}

// ── Combat special abilities ───────────────────

/**
 * Check before normal stat comparison.
 * Returns 'win' | 'lose' or null (= use normal logic).
 *
 * - Dracule Mihawk  → wins vs all swordsmen  (tag: 'swordsman' | 'sword')
 * - Gehrman         → wins vs all monsters   (tag: 'monster' | 'beast')
 * - Sanji           → loses vs all females   (tag: 'female' | 'woman')
 */
export function resolveSpecialAbility(
  attacker: Card,
  defender: Card,
): BattleResult | null {
  const matchup = getCharacterAbility(attacker)?.matchup;
  if (!matchup || !matchesCharacterAbilityTarget(defender, matchup.target)) return null;

  return matchup.outcome;
}

// ── Post-battle passives ───────────────────────

/** تمنح القدرة صحة مباراة إضافية بعد الفوز، حتى إن كانت الصحة عند حدها الابتدائي. */
export function getPostBattleMatchHealthBonus(
  card: Card,
  result: BattleResult,
): number {
  return result === 'win' ? (getCharacterAbility(card)?.winHealthBonus ?? 0) : 0;
}

/**
 * Apply after combat resolves.
 * - Sakura Haruno → +1 HP on win only
 */
export function applyPostBattlePassive(
  card: Card,
  result: BattleResult,
): Card {
  const healthBonus = getPostBattleMatchHealthBonus(card, result);
  if (healthBonus === 0) return card;

  return {
    ...card,
    hp: (card.hp ?? 0) + healthBonus,
  };
}

// ─────────────────────────────────────────────
// MAIN BATTLE RESOLVER
// ─────────────────────────────────────────────

/**
 * resolveBattle — resolves a full round between two cards.
 *
 * Order of precedence:
 *   1. Turin forced loss  (first half of rounds)
 *   2. Special abilities  (Mihawk / Gehrman / Sanji)
 *   3. Normal stat comparison  (attack + defense)
 *   4. Post-battle passives  (Sakura)
 *
 * @param attacker     Player's card
 * @param defender     Bot's card
 * @param currentRound 1-based round number
 * @param totalRounds  Total rounds in the session
 * @param playerDeck   Player's full deck (to check for Turin)
 */
export function resolveBattle(
  attacker: Card,
  defender: Card,
  currentRound: number,
  totalRounds: number,
  playerDeck: Card[],
): { result: BattleResult; updatedAttacker: Card } {

  // 1. Turin — forced loss in first half
  if (isTurinForcedLoss(currentRound, totalRounds, playerDeck)) {
    return { result: 'lose', updatedAttacker: attacker };
  }

  // 2. Special abilities
  const special = resolveSpecialAbility(attacker, defender);

  let result: BattleResult;
  if (special) {
    result = special;
  } else {
    // 3. Normal stat comparison
    const atkPower = (attacker.attack ?? 0) + (attacker.defense ?? 0);
    const defPower = (defender.attack ?? 0) + (defender.defense ?? 0);

    if      (atkPower > defPower) result = 'win';
    else if (atkPower < defPower) result = 'lose';
    else                          result = 'draw';
  }

  // 4. Post-battle passives
  const updatedAttacker = applyPostBattlePassive(attacker, result);

  return { result, updatedAttacker };
}
