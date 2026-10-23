import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: icon motion respects device accessibility preference', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });
  test('favorite icon stays still when the user prefers reduced motion', async ({ page, context }) => {
    await context.clearCookies();
    await page.emulateMedia({ reducedMotion:'reduce' });
    await page.goto('/es/unidades');
    const button = page.getByTestId('unit-card').first().getByRole('button',{name:'Guardar en favoritos'});
    const iconWrapper = button.locator('div').first();
    await expect(button).toBeVisible();
    const before = await iconWrapper.evaluate(el => getComputedStyle(el).transform);
    await button.hover();
    // Framer Motion must not set hover transforms when reduced motion is requested.
    await expect.poll(async () => iconWrapper.evaluate(el => getComputedStyle(el).transform))
      .toBe(before);
  });
});
