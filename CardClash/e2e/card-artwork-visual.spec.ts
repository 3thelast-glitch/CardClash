import { test, expect, type Locator } from '@playwright/test';

// React Native Web does not guarantee that <Image> becomes a literal <img> or
// a CSS background-image node. This visual gate therefore anchors to stable,
// user-visible AbilityCard content, validates the rendered card bounds, and
// captures viewport screenshots for review without depending on RNW internals.
const abilityNames = ['مصادفة منطقية', 'استدعاء', 'حماية'];

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

async function inspectAbilityCard(label: Locator) {
  await label.waitFor({ state: 'attached', timeout: 20_000 });
  return label.evaluate((node) => {
    let current = node as HTMLElement | null;
    let candidate: HTMLElement | null = null;

    while (current && current !== document.body) {
      const rect = current.getBoundingClientRect();
      if (
        rect.width >= 150
        && rect.width <= 300
        && rect.height >= 220
        && rect.height <= 380
      ) {
        candidate = current;
      } else if (candidate && (rect.width > 320 || rect.height > 420)) {
        break;
      }
      current = current.parentElement;
    }

    if (!candidate) throw new Error('Ability card shell was not found');
    const rect = candidate.getBoundingClientRect();
    const text = (candidate.textContent ?? '').replace(/\s+/g, ' ').trim();

    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      textLength: text.length,
    };
  });
}

test.describe('المقارنة البصرية لتوافق كروت القدرات', () => {
  // Retrying deterministic visual-layout assertions only multiplies large
  // screenshot/video artifacts without adding signal.
  test.describe.configure({ retries: 0 });

  for (const viewport of viewports) {
    test(`يحافظ على تكوين الكرت في ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/screens/abilities', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('القدرات', { exact: true })).toBeVisible({ timeout: 30_000 });

      const cards = [];
      for (const abilityName of abilityNames) {
        const label = page.getByText(abilityName, { exact: true }).first();
        await expect(label).toBeVisible({ timeout: 20_000 });
        cards.push(await inspectAbilityCard(label));
      }

      const measurement = await page.evaluate(() => {
        const body = document.body;
        const root = document.documentElement;
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          scrollWidth: Math.max(body.scrollWidth, root.scrollWidth),
        };
      });

      await testInfo.attach(`قياسات-${viewport.id}.json`, {
        body: JSON.stringify({ ...measurement, cards }, null, 2),
        contentType: 'application/json',
      });
      await page.screenshot({
        path: testInfo.outputPath(`كروت-القدرات-${viewport.id}.png`),
        fullPage: false,
      });

      expect(cards.length, `${viewport.name}: لم تظهر كروت القدرات`).toBe(abilityNames.length);
      expect(measurement.scrollWidth, `${viewport.name}: ظهر تمرير أفقي`).toBeLessThanOrEqual(viewport.width + 2);

      for (const card of cards) {
        expect(card.left, `${viewport.name}: قص من اليسار`).toBeGreaterThanOrEqual(-2);
        expect(card.right, `${viewport.name}: قص من اليمين`).toBeLessThanOrEqual(viewport.width + 2);
        expect(card.width, `${viewport.name}: عرض الكرت غير صالح`).toBeGreaterThanOrEqual(150);
        expect(card.height, `${viewport.name}: ارتفاع الكرت غير صالح`).toBeGreaterThanOrEqual(220);
        expect(card.textLength, `${viewport.name}: محتوى الكرت فارغ`).toBeGreaterThan(10);
      }
    });
  }
});
