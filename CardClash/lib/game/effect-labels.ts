import { getAbilityNameOnly } from './ability-names';
import type { Effect } from './types';

/** يضيف اسم القدرة المنشئة للتأثير عندما يكون المصدر محفوظاً في بياناته. */
export function withEffectSource(effect: Pick<Effect, 'data'>, label: string): string {
  const abilityType = effect.data?.abilityType;
  return abilityType ? `${getAbilityNameOnly(abilityType)}: ${label}` : label;
}
