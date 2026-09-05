import { test, expect, type Locator } from '@playwright/test';

// Anchor the checks to real AbilityCard copy instead of renderer-specific <img>
// details. React Native Web may implement Image with either an <img> or a
// background-image wrapper, so generic image selectors are not a stable card
// boundary and can accidentally match full-screen artwork.
const abilityNames = ['مصادفة منطقية', 'استدعاء', 'حماية'];

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

async function getAbilityCardRect(label: Locator) {
  await label.waitFor({ state: 'attached', timeout: 20_000 });
  return label.evaluate((node) => {
    let current = node as HTMLElement | null;
    let candidate: HTMLElement | null = null;

    // Walk from the ability title to the nearest card-sized shell. We keep the
    // outermost card-sized ancestor and stop once we reach the page/grid shell.
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
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  });
}

for (const viewport of viewports) {
  test(`كروت القدرات تستجيب في ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/screens/abilities', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('القدرات', { exact: true })).toBeVisible({ timeout: 20_000 });

    const cardRects = [];
    for (const abilityName of abilityNames) {
      cardRects.push(await getAbilityCardRect(page.getByText(abilityName, { exact: true }).first()));
    }

    const layout = await page.evaluate(() => {
      const body = document.body;
      const root = document.documentElement;
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollWidth: Math.max(body.scrollWidth, root.scrollWidth),
        scrollHeight: Math.max(body.scrollHeight, root.scrollHeight),
      };
    });

    expect(layout.scrollWidth, `${viewport.name}: تم العثور على تمرير أفقي`).toBeLessThanOrEqual(layout.viewportWidth + 2);
    expect(cardRects.length, `${viewport.name}: لم تظهر كروت القدرات`).toBe(abilityNames.length);

    for (const rect of cardRects) {
      expect(rect.left, `${viewport.name}: قص من الجهة اليسرى`).toBeGreaterThanOrEqual(-2);
      expect(rect.right, `${viewport.name}: قص من الجهة اليمنى`).toBeLessThanOrEqual(layout.viewportWidth + 2);
      expect(rect.width, `${viewport.name}: عرض الكرت غير صالح`).toBeGreaterThanOrEqual(150);
      expect(rect.height, `${viewport.name}: ارتفاع الكرت غير صالح`).toBeGreaterThanOrEqual(220);
    }
  });
}
