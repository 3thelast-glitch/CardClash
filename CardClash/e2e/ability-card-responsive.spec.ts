import { test, expect } from '@playwright/test';

// The unified AbilityCard no longer exposes a renderer-specific artwork testID.
// Card artwork is the set of large, card-sized <img> nodes; full-screen
// background art is excluded by the upper viewport-width bound below.
const abilityArtworkSelector = 'img';

const viewports = [
  { name: 'هاتف صغير عمودي', width: 320, height: 568 },
  { name: 'هاتف قياسي عمودي', width: 375, height: 667 },
  { name: 'هاتف حديث عمودي', width: 393, height: 852 },
  { name: 'هاتف كبير عمودي', width: 430, height: 932 },
  { name: 'هاتف أفقي', width: 667, height: 375 },
  { name: 'هاتف حديث أفقي', width: 932, height: 430 },
  { name: 'جهاز لوحي عمودي', width: 768, height: 1024 },
  { name: 'جهاز لوحي أفقي', width: 1024, height: 768 },
];

for (const viewport of viewports) {
  test(`كروت القدرات تستجيب في ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/screens/abilities', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('القدرات', { exact: true })).toBeVisible({ timeout: 20_000 });
    await page.waitForFunction(
      (selector) => Array.from(document.querySelectorAll(selector)).some((node) => {
        const target = node instanceof HTMLImageElement ? node : node.querySelector('img') ?? node;
        const rect = target.getBoundingClientRect();
        return rect.width > 100
          && rect.height > 100
          && rect.width < window.innerWidth * 0.9;
      }),
      abilityArtworkSelector,
      { timeout: 10_000 },
    );

    const layout = await page.evaluate((selector) => {
      const body = document.body;
      const root = document.documentElement;
      const cardImages = Array.from(document.querySelectorAll(selector)).filter((node) => {
        const target = node instanceof HTMLImageElement ? node : node.querySelector('img') ?? node;
        const rect = target.getBoundingClientRect();
        return rect.width > 100
          && rect.height > 100
          && rect.width < window.innerWidth * 0.9;
      });
      const cardRects = cardImages.map((node) => {
        const target = node instanceof HTMLImageElement ? node : node.querySelector('img') ?? node;
        const rect = target.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollWidth: Math.max(body.scrollWidth, root.scrollWidth),
        scrollHeight: Math.max(body.scrollHeight, root.scrollHeight),
        cardRects,
      };
    }, abilityArtworkSelector);

    expect(layout.scrollWidth, `${viewport.name}: تم العثور على تمرير أفقي`).toBeLessThanOrEqual(layout.viewportWidth + 2);
    expect(layout.cardRects.length, `${viewport.name}: لم تظهر صور كروت كبيرة`).toBeGreaterThan(0);

    for (const rect of layout.cardRects) {
      expect(rect.left, `${viewport.name}: قص من الجهة اليسرى`).toBeGreaterThanOrEqual(-2);
      expect(rect.right, `${viewport.name}: قص من الجهة اليمنى`).toBeLessThanOrEqual(layout.viewportWidth + 2);
      expect(rect.width, `${viewport.name}: عرض الكرت غير صالح`).toBeGreaterThan(100);
      expect(rect.height, `${viewport.name}: ارتفاع الكرت غير صالح`).toBeGreaterThan(100);
    }
  });
}
