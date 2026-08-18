import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { doesRoundPickerNeedScroll, getRoundPickerLayout } from '../utils/round-picker-layout';

const cardSelectionSource = readFileSync(
  resolve(process.cwd(), 'app/screens/card-selection.tsx'),
  'utf8',
);

describe('card selection round picker', () => {
  it('uses a responsive, scrollable grid rather than a single vertical round column', () => {
    expect(cardSelectionSource).toContain('getRoundPickerLayout({ width, height, isLandscape, modalCardW, modalCardH })');
    expect(cardSelectionSource).toContain('style={[styles.roundPickerScroll, { maxHeight: roundPickerHeight }]}');
    expect(cardSelectionSource).toContain('contentContainerStyle={[styles.roundPickerGrid, { gap: roundPickerGap }]}');
    expect(cardSelectionSource).toContain('testID="round-picker-grid"');
    expect(cardSelectionSource).toContain('testID={`round-picker-round-${round}`}');
    expect(cardSelectionSource).not.toContain('focusModalLeftCol');
  });

  it('highlights the first available round as an ordering suggestion', () => {
    expect(cardSelectionSource).toContain('const suggestedRound = selectedCardRound === null');
    expect(cardSelectionSource).toContain('roundPickerButtonSuggested');
    expect(cardSelectionSource).toContain('الاقتراح الذهبي: ج ${suggestedRound}');
  });

  it('keeps 5, 18, and 30 rounds inside a usable portrait picker', () => {
    const layout = getRoundPickerLayout({
      width: 375,
      height: 667,
      isLandscape: false,
      modalCardW: 180,
      modalCardH: 262,
    });

    expect(layout.stackRoundPicker).toBe(true);
    expect(layout.roundPickerColumns).toBe(4);
    expect(layout.roundPickerChipW).toBeGreaterThanOrEqual(72);
    expect(doesRoundPickerNeedScroll(5, layout)).toBe(false);
    expect(doesRoundPickerNeedScroll(18, layout)).toBe(true);
    expect(doesRoundPickerNeedScroll(30, layout)).toBe(true);
  });

  it('uses the horizontal space beside the card in landscape mode', () => {
    const layout = getRoundPickerLayout({
      width: 667,
      height: 375,
      isLandscape: true,
      modalCardW: 180,
      modalCardH: 262,
    });

    expect(layout.stackRoundPicker).toBe(false);
    expect(layout.focusPickerW).toBeGreaterThanOrEqual(158);
    expect(layout.roundPickerChipW).toBeGreaterThan(30);
  });
});
