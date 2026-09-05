import { test, expect, type Locator } from '@playwright/test';

// Inspect real AbilityCard shells and their media descendants. React Native Web
// can render Image as either an <img> or a background-image wrapper, so this
// avoids coupling the visual test to one renderer implementation.
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
    const media = Array.from(candidate.querySelectorAll<HTMLElement>('*'))
      .map((element) => {
        const style = getComputedStyle(element);
        const isImage = element instanceof HTMLImageElement;
        const hasBackgroundImage = style.backgroundImage !== 'none' && style.backgroundImage.includes('url(');
        if (!isImage && !hasBackgroundImage) return null;
        const mediaRect = element.getBoundingClientRect();
        return {
          left: mediaRect.left,
          right: mediaRect.right,
          top: mediaRect.top,
          bottom: mediaRect.bottom,
          width: mediaRect.width,
          height: mediaRect.height,
          fit: isImage ? style.objectFit : style.backgroundSize,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry && entry.width > 20 && entry.height > 20));

    return {
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      media,
    };
  });
}

test.describe('المقارنة البصرية لتوافق كروت القدرات', () => {
  for (const viewport of viewports) {
    test(`يحافظ على ملء الصور وتوافق الكرت في ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/screens/abilities', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('القدرات', { exact: true })).toBeVisible({ timeout: 30_000 });

      const cards = [];
      for (const abilityName of abilityNames) {
        cards.push(await inspectAbilityCard(page.getByText(abilityName, { exact: true }).first()));
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

      const report = { ...measurement, cards };
      await testInfo.attach(`قياسات-${viewport.id}.json`, {
        body: JSON.stringify(report, null, 2),
        contentType: 'application/json',
      });
      await page.screenshot({
        path: testInfo.outputPath(`كروت-القدرات-${viewport.id}.png`),
        fullPage: false,
      });

      expect(cards.length, `${viewport.name}: لم تظهر كروت القدرات`).toBe(abilityNames.length);
      expect(measurement.scrollWidth, `${viewport.name}: ظهر تمرير أفقي`).toBeLessThanOrEqual(viewport.width + 2);

      for (const card of cards) {
        expect(card.rect.left, `${viewport.name}: قص من اليسار`).toBeGreaterThanOrEqual(-2);
        expect(card.rect.right, `${viewport.name}: قص من اليمين`).toBeLessThanOrEqual(viewport.width + 2);
        expect(card.media.length, `${viewport.name}: لم يتم العثور على artwork داخل الكرت`).toBeGreaterThan(0);
        expect(card.media.some((entry) => ['cover', 'contain'].includes(entry.fit)), `${viewport.name}: artwork لا يملك سياسة ملء صالحة`).toBe(true);
      }
    });
  }
});
