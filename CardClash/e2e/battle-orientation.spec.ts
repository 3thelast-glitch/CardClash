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


test('صفحة التعليمات تعمل في الوضعين وتعرض الأدلة بلا قص', async ({ page }) => {
  const viewports = [
    { width: 390, height: 844, name: 'عمودي' },
    { width: 1024, height: 768, name: 'أفقي' },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    // تحميل التطبيق أولاً يجعل مترجم Expo يجهز حزمة المسار قبل فتح صفحة الدليل مباشرةً.
    await page.goto('/screens/splash');
    await expect(page.getByTestId('how-to-play-link')).toBeVisible();
    await page.goto('/screens/how-to-play');

    await expect(page.getByTestId('how-to-play-screen')).toBeVisible();
    await expect(page.getByText('افهم المواجهة. خطّط بذكاء. وانتصر.')).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await expect(page.getByTestId('training-arena')).toBeAttached();
    // تعيد بطاقات التدريب الرسم بعد تحميل بيانات البطاقات من التخزين؛ ننتظر الاستقرار ثم نلتقط العنصر من جديد.
    await page.waitForTimeout(350);
    const trainingArena = page.getByTestId('training-arena');
    await trainingArena.scrollIntoViewIfNeeded();
    await expectInsideViewport(page, trainingArena);
    await expect(page.getByTestId('training-run-button')).toBeVisible();
    await page.getByTestId('training-run-button').click();
    await expect(page.getByText(/تفوقت بطاقة اللاعب|تفوقت بطاقة الخصم|تعادل الضرر/)).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const visualDemo = page.getByTestId('guide-mechanics-demo');
    await visualDemo.scrollIntoViewIfNeeded();
    await expectInsideViewport(page, visualDemo);
    await page.getByTestId('replay-guide-animation').click();

    const sketches = page.getByTestId('guide-sketch-board');
    await sketches.scrollIntoViewIfNeeded();
    await expectInsideViewport(page, sketches);
    await expect(page.getByText('سكتش الجولة')).toBeVisible();
    await expect(page.getByText('سكتش العناصر')).toBeVisible();
    await expect(page.getByText('سكتش القدرات')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
});
