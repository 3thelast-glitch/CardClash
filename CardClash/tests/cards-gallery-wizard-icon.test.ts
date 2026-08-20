import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const screenPath = new URL('../app/screens/cards-gallery.tsx', import.meta.url).pathname;
const filterArtworkPaths = [
  '../assets/icons/classes/wizard-category.png',
  '../assets/icons/classes/fighter-category.png',
  '../assets/icons/classes/healer-category.png',
  '../assets/icons/classes/robot-category.png',
  '../assets/icons/classes/swordsman-category.png',
  '../assets/icons/classes/archer-category.png',
  '../assets/icons/factions/dragon.png',
].map(path => new URL(path, import.meta.url).pathname);
const source = readFileSync(screenPath, 'utf8');

describe('الأيقونات المصورة في فلتر الفئات والفصائل', () => {
  it('يحتفظ بأصول محلية لأيقونات الساحر والسياف والرامي والمقاتل والطبيب والروبوت والتنين', () => {
    filterArtworkPaths.forEach(path => expect(existsSync(path)).toBe(true));
    expect(source).toContain("require('../../assets/icons/classes/wizard-category.png')");
    expect(source).toContain("require('../../assets/icons/classes/fighter-category.png')");
    expect(source).toContain("require('../../assets/icons/classes/healer-category.png')");
    expect(source).toContain("require('../../assets/icons/classes/robot-category.png')");
    expect(source).toContain("require('../../assets/icons/classes/swordsman-category.png')");
    expect(source).toContain("require('../../assets/icons/classes/archer-category.png')");
    expect(source).toContain("require('../../assets/icons/factions/dragon.png')");
  });

  it('يربط الأيقونات بخيارات الفلترة الصحيحة ويحافظ على محرر البطاقات', () => {
    expect(source).toContain('CLASS_FILTER_OPTIONS.map(opt =>');
    expect(source).toContain('RACE_FILTER_OPTIONS.map(opt =>');
    expect(source).toContain('mage: WIZARD_CATEGORY_ICON');
    expect(source).toContain('swordsman: SWORDSMAN_CATEGORY_ICON');
    expect(source).toContain('archer: ARCHER_CATEGORY_ICON');
    expect(source).toContain('fighter: FIGHTER_CATEGORY_ICON');
    expect(source).toContain('healer: HEALER_CATEGORY_ICON');
    expect(source).toContain('guardian: ROBOT_CATEGORY_ICON');
    expect(source).toContain('dragon: DRAGON_FACTION_ICON');
    expect(source).toContain('CLASS_OPTIONS as any');
    expect(source).toContain("icon: CLASS_EMOJI.mage");
  });

  it('يستخدم صورة متجاوبة قابلة للتصغير داخل شريحة الفئة', () => {
    expect(source).toContain('typeof icon !== \'string\'');
    expect(source).toContain('resizeMode="contain"');
    expect(source).toContain('artIcon: { width: 18, height: 18');
  });

  it('يعرض الفئات كأيقونات فقط مباشرة بعد الفصائل', () => {
    expect(source).toContain('iconOnly = false');
    expect(source).toContain('iconOnly && fc.iconOnlyChip');
    expect(source).toContain('!iconOnly && <RNText');
    expect(source).toContain('categoryArtIcon: { width: 26, height: 26');
    expect(source).toContain('categoryChipsRow: { marginTop: -2, marginBottom: 8 }');
    expect(source).toContain('onPress={() => patch({ cardClass: opt.value as CardClass | null })} iconOnly');
  });
});
