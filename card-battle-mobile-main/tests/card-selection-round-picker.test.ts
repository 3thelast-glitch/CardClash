import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cardSelectionSource = readFileSync(
  resolve(process.cwd(), 'app/screens/card-selection.tsx'),
  'utf8',
);

describe('card selection round picker', () => {
  it('uses a responsive, scrollable grid rather than a single vertical round column', () => {
    expect(cardSelectionSource).toContain('const stackRoundPicker = !isLandscape;');
    expect(cardSelectionSource).toContain('const roundPickerColumns = stackRoundPicker');
    expect(cardSelectionSource).toContain('style={[styles.roundPickerScroll, { maxHeight: roundPickerHeight }]}');
    expect(cardSelectionSource).toContain('contentContainerStyle={[styles.roundPickerGrid, { gap: roundPickerGap }]}');
    expect(cardSelectionSource).not.toContain('focusModalLeftCol');
  });

  it('highlights the first available round as an ordering suggestion', () => {
    expect(cardSelectionSource).toContain('const suggestedRound = selectedCardRound === null');
    expect(cardSelectionSource).toContain('roundPickerButtonSuggested');
    expect(cardSelectionSource).toContain('الاقتراح الذهبي: ج ${suggestedRound}');
  });
});
