/**
 * Design Tokens — single source of truth for all screens.
 * Contains the advanced palette and professional typography system.
 */

// ── Colors ────────────────────────────────────────────────────────────────────
export const COLOR = {
    // Primary Palette — Card Clash vault: dark ink + cyan energy + restrained gold
    bgDeep: '#061017',      // Ink background for every screen
    bgArena: '#07141B',     // Arena surface, distinct but not purple
    bgCard: 'rgba(9,25,32,0.96)', // Elevated archive panel
    gold: '#39E6D0',        // Primary action / active border (legacy token name retained)
    goldAccent: '#9CFFF2',  // Bright active glow
    goldDim: 'rgba(57,230,208,0.32)', // Subtle cyan border
    goldFill: 'rgba(57,230,208,0.12)',// Soft cyan fill
    textPrimary: '#F2F7F1', // Warm readable white
    textMuted: 'rgba(203,221,221,0.62)', // Muted but accessible text

    // Elements
    fire: '#FF4500',        // High attack
    water: '#1E90FF',       // High defense
    earth: '#228B22',       // High HP
    light: '#F4C96A',       // Balanced / legendary accent
    lightning: '#8A2BE2',   // Speed
    ice: '#00CED1',         // Control

    // Status Colors
    green: '#4ADE80',       // Full life, Win
    amber: '#F4C96A',       // Warning, Medium
    red: '#FB7185',         // Danger, Defeat
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
        shadowColor: '#0B948C',
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
    borderColor: 'rgba(57,230,208,0.22)',
    ...SHADOW.card,
} as const;
