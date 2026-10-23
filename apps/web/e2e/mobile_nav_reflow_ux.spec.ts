import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: mobile navigation and catalog controls remain physically reachable', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const locale of ['es', 'en', 'pt']) {
    for (const width of [320, 640]) {
      test(`${locale}: actions remain within ${width}px CSS viewport`, async ({ page, context }, info) => {
        test.skip(!info.project.name.includes('mobile'), 'Check mobile Chromium once per viewport');
        await context.clearCookies();
        await page.setViewportSize({ width, height: 740 });
        await page.goto(`/${locale}/unidades`);
        const nav = page.locator('nav.fixed.bottom-0');
        await expect(nav).toBeVisible();
        const items = nav.locator('a[href]');
        await expect(items).toHaveCount(5);
        const toggle = page.locator('button[aria-controls="catalog-filters"]');
        await expect(toggle).toBeVisible();
        for (const element of [...await items.all(), toggle]) {
          const bounds = await element.boundingBox();
          expect(bounds, 'The control must have a hit target').not.toBeNull();
          expect(bounds!.width).toBeGreaterThanOrEqual(24);
          expect(bounds!.height).toBeGreaterThanOrEqual(24);
          expect(bounds!.x, 'Control clipped at the left').toBeGreaterThanOrEqual(-1);
          expect(bounds!.x + bounds!.width, 'Control clipped at the right').toBeLessThanOrEqual(width + 1);
        }
        await toggle.focus();
        await expect(toggle).toBeFocused();
      });
    }
  }
});
