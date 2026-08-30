/**
 * Shared difficulty type — moved here to break the circular import between
 * game-context.tsx (lib) and difficulty.tsx (app/screens).
 *
 * The current UI exposes levels 1–4 only. Level 5 remains accepted as a legacy
 * stored-state value and is treated by the bot's >= 4 logic like legendary.
 */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
