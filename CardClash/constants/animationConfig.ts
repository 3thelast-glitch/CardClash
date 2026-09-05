/**
 * Obsidian Arcana presentation timings.
 * These values affect visuals only and must never gate game/network state.
 */
export const ANIM_DURATION = {
  PRESS_IN: 100,
  PRESS_OUT: 130,
  TAP: 150,
  SELECT: 180,
  SUMMON: 360,
  DEAL: 360,
  FLIP: 380,
  DRAG_IN: 90,
  DRAG_OUT: 240,
  INVALID_RETURN: 220,
  ATTACK: 480,
  DAMAGE_FLOAT: 620,
  ABILITY: 480,
  ROUND_TRANSITION: 280,
  HP_BAR: 420,
  RESULT_FADE: 480,
  CINEMATIC: 520,
  GLOW_PULSE: 1100,
} as const;

export const ANIM_VALUES = {
  TAP_SCALE: 0.97,
  TAP_ROTATE: 0,
  SELECT_SCALE: 1.025,
  SELECT_LIFT: -5,
  SUMMON_PEAK: 1.06,
  SHAKE: 7,
  DRAG_SHADOW: 24,
  DAMAGE_RISE: 58,
  GLOW_SCALE_PEAK: 1.025,
  GLOW_SCALE_TROUGH: 0.99,
  HOVER_SCALE: 1.025,
} as const;

export const SPRING = {
  TAP: { damping: 18, stiffness: 320, mass: 0.65 },
  SUMMON: { damping: 18, stiffness: 210, mass: 0.8 },
  SNAP_BACK: { damping: 18, stiffness: 240, mass: 0.85 },
  HOVER: { damping: 18, stiffness: 220, mass: 0.75 },
  PLACEMENT: { damping: 20, stiffness: 260, mass: 0.8 },
} as const;

export const HP_COLORS = {
  FULL: '#4ADE80',
  HALF: '#FBBF24',
  LOW: '#FB7185',
  TRACK: '#1B2A40',
} as const;

export function hpColor(fraction: number): string {
  if (fraction > 0.6) return HP_COLORS.FULL;
  if (fraction > 0.3) return HP_COLORS.HALF;
  return HP_COLORS.LOW;
}
