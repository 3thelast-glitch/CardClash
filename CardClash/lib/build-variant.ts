export type AndroidBuildVariant = 'player' | 'developer';

export function resolveBuildVariant(extra: unknown): AndroidBuildVariant {
  if (extra && typeof extra === 'object' && (extra as { buildVariant?: unknown }).buildVariant === 'developer') return 'developer';
  return 'player';
}

export function isDeveloperBuild(extra: unknown): boolean {
  return resolveBuildVariant(extra) === 'developer';
}

/**
 * Keeps development tools out of the player build while leaving the public
 * gameplay modes untouched. The helper is deliberately pure for unit tests.
 */
export function getVisibleMenuItems<T extends object>(items: readonly T[], extra: unknown): T[] {
  return isDeveloperBuild(extra)
    ? [...items]
    : items.filter(item => !(item as { developerOnly?: boolean }).developerOnly);
}
