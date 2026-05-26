/**
 * shared/rage-engine.ts
 * Re-exports everything from lib/game/rage-engine and adds
 * getEffectiveStats + applyAbilityEffect used by battle.tsx.
 */

export * from '@/lib/game/rage-engine';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ActiveEffect {
  kind: string;
  targetSide: 'player' | 'bot' | 'all';
  isBuff?: boolean;
  data?: Record<string, any>;
  roundsLeft?: number;
}

export interface EffectiveStats {
  attack: number;
  defense: number;
}

// ── getEffectiveStats ──────────────────────────────────────────────────────
/**
 * Applies all active stat-modifier effects for a given side and returns
 * the resulting { attack, defense }.
 */
export function getEffectiveStats(
  baseAttack: number,
  baseDefense: number,
  activeEffects: ActiveEffect[],
  side: 'player' | 'bot'
): EffectiveStats {
  let attack = baseAttack;
  let defense = baseDefense;

  for (const effect of activeEffects) {
    if (effect.targetSide !== side && effect.targetSide !== 'all') continue;
    if (effect.kind !== 'statModifier') continue;

    const d = effect.data ?? {};
    const amount: number = d.amount ?? 0;
    const stat: string = d.stat ?? '';
    const multiplier: boolean = !!d.multiplier;

    if (stat === 'attack' || stat === 'all') {
      attack = multiplier ? Math.round(attack * amount) : attack + amount;
    }
    if (stat === 'defense' || stat === 'all') {
      defense = multiplier ? Math.round(defense * amount) : defense + amount;
    }
  }

  return { attack: Math.max(0, attack), defense: Math.max(0, defense) };
}

// ── applyAbilityEffect ─────────────────────────────────────────────────────
/**
 * Merges a new effect into the existing activeEffects array.
 * Returns a new array (immutable).
 */
export function applyAbilityEffect(
  activeEffects: ActiveEffect[],
  newEffect: ActiveEffect
): ActiveEffect[] {
  return [...activeEffects, newEffect];
}
