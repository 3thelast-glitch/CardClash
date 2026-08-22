import { getAbilityNameOnly } from './ability-names';
import type { Effect } from './types';

/** يضيف اسم القدرة المنشئة للتأثير عندما يكون المصدر محفوظاً في بياناته. */
export function withEffectSource(effect: Pick<Effect, 'data'>, label: string): string {
  const source = effect.data?.sourceLabel
    ?? (effect.data?.abilityType ? getAbilityNameOnly(effect.data.abilityType) : undefined);
  return source ? `${source}: ${label}` : label;
}
