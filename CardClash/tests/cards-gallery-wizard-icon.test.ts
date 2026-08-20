import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const screenPath = new URL('../app/screens/cards-gallery.tsx', import.meta.url).pathname;
const wizardIconPath = new URL('../assets/icons/classes/wizard-category.png', import.meta.url).pathname;
const source = readFileSync(screenPath, 'utf8');

describe('أيقونة الساحر في فلتر الفئات', () => {
  it('يربط زر ساحر بأصل مصور محلي', () => {
    expect(existsSync(wizardIconPath)).toBe(true);
    expect(source).toContain("require('../../assets/icons/classes/wizard-category.png')");
    expect(source).toContain("option.value === 'mage' ? { ...option, icon: WIZARD_CATEGORY_ICON } : option");
  });

  it('يعرض الأيقونة المصورة في الفلتر فقط ويحافظ على محرر البطاقات', () => {
    expect(source).toContain('CLASS_FILTER_OPTIONS.map(opt =>');
    expect(source).toContain('CLASS_OPTIONS as any');
    expect(source).toContain("icon: CLASS_EMOJI.mage");
  });

  it('يستخدم صورة متجاوبة قابلة للتصغير داخل شريحة الفئة', () => {
    expect(source).toContain('typeof icon !== \'string\'');
    expect(source).toContain('resizeMode="contain"');
    expect(source).toContain('artIcon: { width: 18, height: 18');
  });
});
