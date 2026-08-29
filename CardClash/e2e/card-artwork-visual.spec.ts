import { test, expect } from '@playwright/test';

const abilityArtworkSelector = '[data-testid="ability-artwork-image"]';

const viewports = [
  { id: 'phone-small-portrait', name: 'هاتف صغير عمودي', width: 320, height: 568 },
  { id: 'phone-portrait', name: 'هاتف قياسي عمودي', width: 375, height: 667 },
  { id: 'phone-modern-portrait', name: 'هاتف حديث عمودي', width: 393, height: 852 },
  { id: 'phone-large-portrait', name: 'هاتف كبير عمودي', width: 430, height: 932 },
  { id: 'phone-landscape', name: 'هاتف أفقي', width: 667, height: 375 },
  { id: 'phone-modern-landscape', name: 'هاتف حديث أفقي', width: 932, height: 430 },
  { id: 'tablet-portrait', name: 'جهاز لوحي عمودي', width: 768, height: 1024 },
  { id: 'tablet-landscape', name: 'جهاز لوحي أفقي', width: 1024, height: 768 },
];

test.describe('المقارنة البصرية لتوافق كروت القدرات', () => {
  for (const viewport of viewports) {
    test(`يحافظ على ملء الصور وتوافق الكرت في ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/screens/abilities', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('القدرات', { exact: true })).toBeVisible({ timeout: 30_000 });

      await page.waitForFunction((selector) =>
        Array.from(document.querySelectorAll(selector)).some((node) => {
          const target = node instanceof HTMLImageElement ? node : node.querySelector('img') ?? node;
          const rect = target.getBoundingClientRect();
          return rect.width > 100 && rect.height > 100;
        }),
        abilityArtworkSelector,
      );

      const measurement = await page.evaluate((selector) => {
        const body = document.body;
        const root = document.documentElement;
        const images = Array.from(document.querySelectorAll(selector))
          .map((node) => {
            const image = node instanceof HTMLImageElement ? node : node.querySelector('img');
            const target = image ?? node;
            const rect = target.getBoundingClientRect();
            const style = getComputedStyle(target);
            return {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
              objectFit: style.objectFit,
              naturalWidth: image?.naturalWidth ?? 0,
              naturalHeight: image?.naturalHeight ?? 0,
            };
          })
          .filter((image) => image.width > 100 && image.height > 100);

        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          scrollWidth: Math.max(body.scrollWidth, root.scrollWidth),
          images,
        };
      }, abilityArtworkSelector);

      await testInfo.attach(`قياسات-${viewport.id}.json`, {
        body: JSON.stringify(measurement, null, 2),
        contentType: 'application/json',
      });
      await page.screenshot({
        path: testInfo.outputPath(`كروت-القدرات-${viewport.id}.png`),
        fullPage: true,
      });

      expect(measurement.images.length, `${viewport.name}: لم تظهر صور كروت`).toBeGreaterThan(0);
      expect(measurement.scrollWidth, `${viewport.name}: ظهر تمرير أفقي`).toBeLessThanOrEqual(viewport.width + 2);

      for (const image of measurement.images) {
        expect(image.left, `${viewport.name}: قص من اليسار`).toBeGreaterThanOrEqual(-2);
        expect(image.right, `${viewport.name}: قص من اليمين`).toBeLessThanOrEqual(viewport.width + 2);
        expect(['cover', 'contain', 'scale-down']).toContain(image.objectFit);
      }
    });
  }
});
