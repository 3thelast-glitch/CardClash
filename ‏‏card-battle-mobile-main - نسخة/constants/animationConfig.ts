/**
 * Animation Timing & Value Constants
 * Central source for all animation durations, spring configs, and motion values.
 */

// ─── Durations (ms) ───────────────────────────────────────────────────────────

export const ANIM_DURATION = {
    /** Card tap spring bounce */
    TAP: 150,
    /** Card entrance slide + scale */
    SUMMON: 400,
    /** Attack shake total */
    ATTACK: 300,
    /** Drag shadow increase */
    DRAG_IN: 80,
    /** Drag shadow decrease on release */
    DRAG_OUT: 200,
    /** Epic/Legendary glow pulse half-period */
    GLOW_PULSE: 900,
    /** Damage number float + fade */
    DAMAGE_FLOAT: 800,
    /** HP bar smooth fill transition */
    HP_BAR: 500,
    /** Win/lose cinematic overlay slide-in */
    CINEMATIC: 350,
    /** Result overlay fade-in */
    RESULT_FADE: 300,
} as const;

// ─── Motion Values ────────────────────────────────────────────────────────────

export const ANIM_VALUES = {
    /** Tap scale overshoot */
    TAP_SCALE: 1.06,
    /** Tap rotation in degrees */
    TAP_ROTATE: 2,
    /** Summon peak scale before settling at 1 */
    SUMMON_PEAK: 1.25,
    /** Attack shake displacement in dp */
    SHAKE: 8,
    /** Shadow radius while dragging */
    DRAG_SHADOW: 30,
    /** Damage number rise height in dp */
    DAMAGE_RISE: 70,
    /** Glow ring scale pulse peak */
    GLOW_SCALE_PEAK: 1.07,
    /** Glow ring scale pulse trough */
    GLOW_SCALE_TROUGH: 0.97,
    /** Selected card hover scale */
    HOVER_SCALE: 1.05,
} as const;

// ─── Spring Presets ───────────────────────────────────────────────────────────

export const SPRING = {
    TAP: {
        damping: 12,
        stiffness: 280,
        mass: 0.8,
    },
    SUMMON: {
        damping: 14,
        stiffness: 200,
        mass: 1,
    },
    SNAP_BACK: {
        damping: 15,
        stiffness: 220,
        mass: 1,
    },
    HOVER: {
        damping: 15,
        stiffness: 200,
        mass: 1,
    },
} as const;

// ─── HP Bar Color Stops ───────────────────────────────────────────────────────

export const HP_COLORS = {
    FULL: '#22c55e',    // green-500  > 60%
    HALF: '#eab308',    // yellow-500 30–60%
    LOW: '#ef4444',     // red-500    < 30%
    TRACK: '#1f2937',   // gray-800
} as const;

/** Returns correct bar fill color for a fraction 0–1 */
export function hpColor(fraction: number): string {
    if (fraction > 0.6) return HP_COLORS.FULL;
    if (fraction > 0.3) return HP_COLORS.HALF;
    return HP_COLORS.LOW;
}
