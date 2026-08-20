import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(resolve(process.cwd(), 'app/screens/how-to-play.tsx'), 'utf8');

describe('How to play guide layout', () => {
  it('explains every supported game mode and the four stages of a round', () => {
    const guide = source();
    expect(guide).toContain('const PLAY_MODES');
    expect(guide).toContain('واجه البوت');
    expect(guide).toContain('طرفان على جهاز واحد');
    expect(guide).toContain('جهازان وشبكة واحدة');
    expect(guide).toContain("number: '04'");
    expect(guide).toContain('أربع خطوات للمواجهة');
  });

  it('uses an RTL mobile-first layout that expands into balanced wide-screen grids', () => {
    const guide = source();
    expect(guide).toContain('const isWideLayout = width >= 720;');
    expect(guide).toContain('contentInnerWide');
    expect(guide).toContain('modesWide');
    expect(guide).toContain('stepCardWide');
    expect(guide).toContain('elementCardWide');
    expect(guide).toContain("flexDirection: 'row-reverse'");
    expect(guide).toContain("textAlign: 'right'");
  });

  it('presents faction markers as concise Arabic labels and retains the damage formula', () => {
    const guide = source();
    expect(guide).toContain("mark: 'بش'");
    expect(guide).toContain('element.mark');
    expect(guide).toContain('معادلة مبسطة للضرر');
    expect(guide).toContain('الهجوم × معامل الفصيلة');
  });

  it('explains recent updates, card classes, and the relationship between faction, class, and ability', () => {
    const guide = source();
    expect(guide).toContain('const RECENT_UPDATES');
    expect(guide).toContain('معاينة القدرات');
    expect(guide).toContain('فلاتر مصوّرة');
    expect(guide).toContain('const CARD_CLASSES');
    expect(guide).toContain("title: 'سياف'");
    expect(guide).toContain("title: 'طبيب'");
    expect(guide).toContain('الفصيلة والفئة والقدرة');
    expect(guide).toContain('لا توجد دورة تضاد بين الفئات');
  });
});
