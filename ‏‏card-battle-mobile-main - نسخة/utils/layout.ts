import { useWindowDimensions } from 'react-native';

/**
 * Breakpoint sizes for landscape-responsive layouts.
 *
 * sm  – normal phones in landscape  (< 700px wide)
 * md  – S23 Ultra / wide phones     (700–899px wide)
 * lg  – tablets / very wide phones  (900–1199px wide)
 * xl  – large tablets / desktop     (≥ 1200px wide)
 */
export type LayoutSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LandscapeLayout {
    width: number;
    height: number;
    isLandscape: boolean;
    size: LayoutSize;
}

/**
 * Single source of truth for landscape-responsive layout values.
 * Re-renders whenever the window dimensions change (e.g. device rotation).
 */
export const useLandscapeLayout = (): LandscapeLayout => {
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const size: LayoutSize = (() => {
        if (width >= 1200) return 'xl'; // large tablets / desktop
        if (width >= 900) return 'lg'; // tablets / very wide phones
        if (width >= 700) return 'md'; // S23 Ultra class
        return 'sm';                    // normal phones
    })();

    return { width, height, isLandscape, size };
};

// ─── Shared responsive tokens ────────────────────────────────────────────────

/** Horizontal padding per size breakpoint. */
export const LAYOUT_PADDING: Record<LayoutSize, number> = {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
};

/**
 * Card width as a fraction of total screen width.
 * Height = width * (320/220) → original aspect ratio.
 */
export const CARD_WIDTH_FACTOR: Record<LayoutSize, number> = {
    sm: 0.42,
    md: 0.36,
    lg: 0.30,
    xl: 0.26,
};

/** Card scale factor for EpicCardTemplate scale prop. */
export const CARD_SCALE: Record<LayoutSize, number> = {
    sm: 0.44,
    md: 0.38,
    lg: 0.32,
    xl: 0.28,
};

/** Number of grid columns for list/gallery screens. */
export const GRID_COLUMNS: Record<LayoutSize, number> = {
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
};

// ─── Card sizes per usage context ────────────────────────────────────────────

/**
 * Card width (px) for the main grid / gallery view.
 * Designed to fit multiple cards side-by-side.
 */
export const GALLERY_CARD_W: Record<LayoutSize, number> = {
    sm: 130,
    md: 150,
    lg: 170,
    xl: 200,
};

/**
 * Card width (px) for modal / preview / focus contexts
 * (one card shown at a time, can be larger).
 */
export const MODAL_CARD_W: Record<LayoutSize, number> = {
    sm: 180,
    md: 210,
    lg: 240,
    xl: 280,
};

/** Card aspect ratio: height = width * CARD_ASPECT */
export const CARD_ASPECT = 320 / 220; // ≈ 1.4545

/**
 * Returns responsive { width, height } for a card given a base width map.
 * Usage:
 * const { cardW, cardH } = useCardSize('gallery');
 */
export const useCardSize = (
    context: 'gallery' | 'modal' | 'battle' | 'selection'
): { cardW: number; cardH: number; size: LayoutSize } => {
    const { width, height, size } = useLandscapeLayout();

    let cardW: number;

    switch (context) {
        case 'gallery':
            cardW = GALLERY_CARD_W[size];
            break;

        case 'modal':
            cardW = MODAL_CARD_W[size];
            break;

        case 'battle': {
            // fit inside 55% of screen height, capped by CARD_WIDTH_FACTOR
            const byHeight = (height * 0.55) / CARD_ASPECT;
            const byWidth = width * CARD_WIDTH_FACTOR[size] * 0.9;
            cardW = Math.min(byHeight, byWidth);
            break;
        }

        case 'selection':
            // slightly smaller than gallery so it fits inside grid cells
            cardW = GALLERY_CARD_W[size];
            break;

        default:
            cardW = GALLERY_CARD_W[size];
    }

    return { cardW, cardH: Math.round(cardW * CARD_ASPECT), size };
};
