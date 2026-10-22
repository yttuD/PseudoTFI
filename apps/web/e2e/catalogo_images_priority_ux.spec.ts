import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: catalog image requests respect visual priority', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('first card loads promptly, offscreen cards can defer without layout shift', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades');
    const images = page.locator('a[href^="/es/unidades/"] img');
    await expect(images).toHaveCount(2);
    await expect(images.nth(0)).toHaveAttribute('loading', 'eager');
    await expect(images.nth(0)).toHaveAttribute('fetchpriority', 'high');
    await expect(images.nth(1)).toHaveAttribute('loading', 'lazy');
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute('decoding', 'async');
      await expect(image).toHaveAttribute('width', '800');
      await expect(image).toHaveAttribute('height', '600');
      const alt = await image.getAttribute('alt');
      expect(alt?.trim().length || 0).toBeGreaterThan(0);
    }
  });
});
