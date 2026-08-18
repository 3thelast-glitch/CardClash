export type AndroidBuildVariant = 'player' | 'developer';

export function resolveBuildVariant(extra: unknown): AndroidBuildVariant {
  if (extra && typeof extra === 'object' && (extra as { buildVariant?: unknown }).buildVariant === 'developer') return 'developer';
  return 'player';
}

export function isDeveloperBuild(extra: unknown): boolean {
  return resolveBuildVariant(extra) === 'developer';
}
