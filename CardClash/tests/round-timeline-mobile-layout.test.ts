import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelPath = resolve(process.cwd(), 'components/game/RoundInsightPanel.tsx');
const battlePath = resolve(process.cwd(), 'app/screens/battle.tsx');

describe('Round timeline mobile layout', () => {
  it('keeps the three phases legible in a compact panel and provides a full-details action', () => {
    const source = readFileSync(panelPath, 'utf8');

    expect(source).toContain('const compactLineCount = 1;');
    expect(source).toContain('numberOfLines={compact ? compactLineCount : 3}');
    expect(source).toContain('accessibilityLabel="فتح التفاصيل الكاملة لخط زمني الجولة"');
    expect(source).toContain('تفاصيل حسم الجولة');
    expect(source).toContain("timelineCopy: { flex: 1, minWidth: 0, flexShrink: 1");
  });

  it('does not stack a duplicate event log below the compact timeline in the solo result view', () => {
    const source = readFileSync(battlePath, 'utf8');

    expect(source).toContain("!isLandscape && phase === 'result' && S.centerPanelPortraitResult");
    expect(source).toContain("phase === 'result' && lastRoundResult && (isLandscape || lastRoundTimeline.length === 0)");
    expect(source).toContain('centerPanelPortraitResult: { maxHeight: 188, flexShrink: 0, gap: 4 }');
  });
});
