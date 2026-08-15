import { expect, test, type Locator, type Page } from '@playwright/test';

type Bounds = { x: number; y: number; width: number; height: number };

async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(metrics.scrollWidth, 'يجب ألا يظهر تمرير أفقي غير مقصود').toBeLessThanOrEqual(
    metrics.viewportWidth + 1,
  );
}

async function expectInsideViewport(page: Page, locator: Locator): Promise<Bounds> {
  const bounds = await locator.boundingBox();
  expect(bounds, 'العنصر المطلوب يجب أن يكون مرئياً').not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const box = bounds as Bounds;

  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
  expect(box.y + box.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
  return box;
}

async function openSinglePlayerBattle(page: Page) {
  await page.goto('/screens/splash');
  await expect(page.getByText('ابدأ المواجهة')).toBeVisible();
  await page.getByText('ابدأ المواجهة').click();

  await expect(page.getByText('لعب فردي', { exact: true })).toBeVisible();
  await page.getByText('لعب فردي', { exact: true }).click();

  await expect(page.getByText('متوسط', { exact: true })).toBeVisible();
  await page.getByText('متوسط', { exact: true }).click();
  await page.getByText('التالي →', { exact: true }).click();

  await expect(page.getByText('🎲 عشوائي', { exact: true })).toBeVisible();
  await page.getByText('🎲 عشوائي', { exact: true }).click();
  await page.getByText('التالي →', { exact: true }).click();

  await expect(page.getByText('رتّب بطاقاتك')).toBeVisible();
  await page.getByText('🔀', { exact: true }).click();
  await page.getByText('ابدأ المعركة ⚔️', { exact: true }).click();
  await expect(page.getByTestId('battle-arena')).toBeVisible();
}

test('ساحة المعركة تنتقل من عمودي إلى أفقي بلا قص للعناصر', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSinglePlayerBattle(page);

  await page.waitForTimeout(350);
  await assertNoHorizontalOverflow(page);

  const portraitPlayer = await expectInsideViewport(page, page.getByTestId('battle-player-panel'));
  const portraitCommand = await expectInsideViewport(page, page.getByTestId('battle-command-panel'));
  const portraitBot = await expectInsideViewport(page, page.getByTestId('battle-bot-panel'));
  expect(portraitPlayer.y).toBeLessThan(portraitCommand.y);
  expect(portraitCommand.y).toBeLessThan(portraitBot.y);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(350);
  await assertNoHorizontalOverflow(page);

  const landscapePlayer = await expectInsideViewport(page, page.getByTestId('battle-player-panel'));
  const landscapeCommand = await expectInsideViewport(page, page.getByTestId('battle-command-panel'));
  const landscapeBot = await expectInsideViewport(page, page.getByTestId('battle-bot-panel'));
  expect(landscapePlayer.x).toBeLessThan(landscapeCommand.x);
  expect(landscapeCommand.x).toBeLessThan(landscapeBot.x);
});

test('الشاشة الرئيسية والإعدادات لا تكتسبان تمريراً أفقياً بعد التدوير', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/screens/splash');
    await expect(page.getByText('Card Clash', { exact: true })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.goto('/screens/settings');
    await expect(page.getByText('الإعدادات')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
});
