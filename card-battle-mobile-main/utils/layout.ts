import { useWindowDimensions } from 'react-native';

/**
 * Breakpoint sizes for grids, galleries and other width-led layouts.
 * Unlike battle dimensions, these are based on available horizontal space.
 */
export type LayoutSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LandscapeLayout {
  width: number;
  height: number;
  isLandscape: boolean;
  size: LayoutSize;
}

export interface BattleLayout extends LandscapeLayout {
  arenaPadding: number;
  hudPadding: number;
  arenaGap: number;
  centerWidth: number;
  actionButtonWidth: number;
  actionButtonHeight: number;
  cardWidth: number;
  cardHeight: number;
  isCompact: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Card aspect ratio: height = width * CARD_ASPECT. */
export const CARD_ASPECT = 320 / 220;

/**
 * A responsive viewport snapshot. It recalculates after device rotation,
 * browser resizing, tablet split-screen changes and desktop window resizing.
 */
export const useLandscapeLayout = (): LandscapeLayout => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width >= height;
  const size: LayoutSize = (() => {
    if (width >= 1200) return 'xl';
    if (width >= 900) return 'lg';
    if (width >= 700) return 'md';
    return 'sm';
  })();

  return { width, height, isLandscape, size };
};

/**
 * Builds the arena from the actual remaining width after the central command
 * area and gutters. Both cards and the action column are therefore bounded by
 * the viewport in portrait, landscape, tablet, desktop and split-screen use.
 */
export const useBattleLayout = (): BattleLayout => {
  const layout = useLandscapeLayout();
  const { width, height, isLandscape } = layout;
  const shortSide = Math.min(width, height);
  const isCompact = width < 430 || height < 430;

  const arenaPadding = clamp(width * (isCompact ? 0.018 : 0.028), 8, 32);
  const hudPadding = clamp(width * 0.024, 8, 32);
  const arenaGap = clamp(shortSide * 0.022, 6, 16);
  const centerMin = isCompact ? 68 : 82;
  const centerMax = isLandscape ? 148 : Math.min(300, width - arenaPadding * 2);
  // في الوضع العمودي تصبح منطقة الأوامر شريطاً بين البطاقتين، وليس عموداً يزاحمها أفقياً.
  const centerWidth = isLandscape
    ? clamp(width * 0.15, centerMin, centerMax)
    : Math.floor(clamp(width - arenaPadding * 2, 180, centerMax));
  const availableCardWidth = isLandscape
    ? Math.max(72, (width - arenaPadding * 2 - arenaGap * 2 - centerWidth) / 2)
    : Math.max(72, width * (isCompact ? 0.46 : 0.52));
  const portraitCommandHeight = clamp(height * 0.14, 92, 132);
  const usableCardHeight = isLandscape
    ? Math.max(118, height * (isCompact ? 0.5 : 0.58))
    : Math.max(118, (height * 0.7 - portraitCommandHeight - arenaGap * 2) / 2);
  // نستخدم floor بدلاً من round حتى لا يسبب التقريب تجاوزاً بمقدار بكسل في الشاشات الضيقة.
  const cardWidth = Math.floor(clamp(
    Math.min(availableCardWidth, usableCardHeight / CARD_ASPECT),
    72,
    isLandscape ? 290 : 210,
  ));
  const cardHeight = Math.round(cardWidth * CARD_ASPECT);

  return {
    ...layout,
    arenaPadding,
    hudPadding,
    arenaGap,
    centerWidth,
    actionButtonWidth: Math.round(clamp(isLandscape ? centerWidth : centerWidth / 2 - arenaGap, 68, 128)),
    actionButtonHeight: Math.round(clamp(height * 0.065, 34, 48)),
    cardWidth,
    cardHeight,
    isCompact,
  };
};

/** Horizontal padding per size breakpoint for lists and regular screens. */
export const LAYOUT_PADDING: Record<LayoutSize, number> = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

/**
 * Legacy width factors retained for compatibility. Battle screens should use
 * useBattleLayout(), which accounts for the command column and usable height.
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

/** Number of grid columns for list and gallery screens. */
export const GRID_COLUMNS: Record<LayoutSize, number> = {
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
};

/** Preferred card widths; final values are constrained by the live viewport. */
export const GALLERY_CARD_W: Record<LayoutSize, number> = {
  sm: 130,
  md: 150,
  lg: 170,
  xl: 200,
};

/** Preferred modal card widths; final values are constrained by the live viewport. */
export const MODAL_CARD_W: Record<LayoutSize, number> = {
  sm: 180,
  md: 210,
  lg: 240,
  xl: 280,
};

/**
 * Returns dimensions that fit their grid cell or modal at the current viewport
 * size, and updates automatically when the viewport changes.
 */
export const useCardSize = (
  context: 'gallery' | 'modal' | 'battle' | 'selection',
): { cardW: number; cardH: number; size: LayoutSize } => {
  const { width, height, size } = useLandscapeLayout();
  const padding = LAYOUT_PADDING[size];
  let cardW: number;

  switch (context) {
    case 'gallery':
    case 'selection': {
      const columns = GRID_COLUMNS[size];
      const gridGap = 12;
      const cellWidth = Math.max(92, (width - padding * 2 - gridGap * (columns - 1)) / columns);
      cardW = Math.min(GALLERY_CARD_W[size], cellWidth);
      break;
    }
    case 'modal': {
      const byWidth = Math.max(140, width * 0.72);
      const byHeight = Math.max(140, (height * 0.62) / CARD_ASPECT);
      cardW = Math.min(MODAL_CARD_W[size], byWidth, byHeight);
      break;
    }
    case 'battle': {
      const byHeight = (height * 0.55) / CARD_ASPECT;
      const byWidth = width * CARD_WIDTH_FACTOR[size] * 0.9;
      cardW = Math.min(byHeight, byWidth);
      break;
    }
  }

  const roundedWidth = Math.round(cardW);
  return { cardW: roundedWidth, cardH: Math.round(roundedWidth * CARD_ASPECT), size };
};
