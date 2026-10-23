import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: 320px layout does not hide tasks behind horizontal scrolling', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const route of ['/es', '/es/unidades', '/es/auth/login']) {
    test(`${route} has no horizontal document overflow at 320 CSS pixels`, async ({ page, context }, testInfo) => {
      test.skip(!testInfo.project.name.includes('mobile'), '320px narrow viewport checks run once on mobile Chromium');
      await context.clearCookies();
      await page.setViewportSize({ width: 320, height: 740 });
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      const sizes = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      expect(sizes.documentWidth, `Viewport overflow on ${route}: ${JSON.stringify(sizes)}`)
        .toBeLessThanOrEqual(sizes.viewportWidth + 1);
    });
  }
});
