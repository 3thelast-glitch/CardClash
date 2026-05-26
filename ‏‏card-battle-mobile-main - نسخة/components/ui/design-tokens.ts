/**
 * Design Tokens — single source of truth for all screens.
 * Contains the advanced palette and professional typography system.
 */

// ── Colors ────────────────────────────────────────────────────────────────────
export const COLOR = {
    // Primary Palette
    bgDeep: '#1A0D1A',      // Dark Purple (Main Background)
    bgArena: '#240716',     // Deep Maroon (Battle arena background)
    bgCard: 'rgba(26,13,26,0.95)', // Card surface
    gold: '#E4A52A',        // Gold Primary (Buttons, borders, stars)
    goldAccent: '#FFD700',  // Bright Gold (Glow, selected)
    goldDim: 'rgba(228,165,42,0.35)', // Dimmed border
    goldFill: 'rgba(228,165,42,0.15)',// Soft fill
    textPrimary: '#F7F7F7', // Off-White Text
    textMuted: 'rgba(247,247,247,0.55)', // Muted Text

    // Elements
    fire: '#FF4500',        // High attack
    water: '#1E90FF',       // High defense
    earth: '#228B22',       // High HP
    light: '#FFD700',       // Balanced
    lightning: '#8A2BE2',   // Speed
    ice: '#00CED1',         // Control

    // Status Colors
    green: '#32CD32',       // Full life, Win
    amber: '#FF8C00',       // Warning, Medium
    red: '#FF4040',         // Danger, Defeat
    gray: '#666666',        // Disabled, locked
    white: '#FFFFFF',
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const SPACE = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
} as const;

// ── Border Radius ─────────────────────────────────────────────────────────────
export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 32,
    full: 999,
} as const;

// ── Typography System ─────────────────────────────────────────────────────────
export const FONT_FAMILY = {
    bold: 'DG-Bold',
    medium: 'DG-Bold',
    regular: 'DG-Bold',
    latin: 'RobotoCondensed_400Regular',
    latinBold: 'RobotoCondensed_700Bold',
} as const;

export const FONT = {
    // Typography Scale (increased +2px for custom Arabic font)
    xs: 14, // Subtext (Regular)
    sm: 16, // Labels (Medium)
    md: 18, // Body (Regular)
    base: 20, // Stats (SemiBold) / M
    lg: 22,
    xl: 26, // Card Names (Bold) / L
    xxl: 30,
    hero: 34, // Game Title (Bold) / XL
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────
export const SHADOW = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    gold: {
        shadowColor: COLOR.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    none: {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
} as const;

// ── Glass Panel ───────────────────────────────────────────────────────────────
export const GLASS_PANEL = {
    backgroundColor: COLOR.bgCard,
    borderRadius: RADIUS.md, // 12px everywhere
    borderWidth: 1,
    borderColor: 'rgba(228,165,42,0.25)',
    ...SHADOW.card,
} as const;
