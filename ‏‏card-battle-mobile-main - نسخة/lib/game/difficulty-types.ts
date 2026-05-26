/**
 * Shared difficulty type — moved here to break the circular import between
 * game-context.tsx (lib) and difficulty.tsx (app/screens).
 */
export type DifficultyLevel = 1 | 2 | 3 | 4;
