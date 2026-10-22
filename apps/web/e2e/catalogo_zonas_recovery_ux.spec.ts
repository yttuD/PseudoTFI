import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: zone failures are explained without interrupting public search', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const { locale, errorText, retryText } of [
    { locale: 'es', errorText: 'No pudimos cargar las zonas.', retryText: 'Reintentar zonas' },
    { locale: 'en', errorText: 'Areas could not be loaded.', retryText: 'Retry areas' },
    { locale: 'pt', errorText: 'Não foi possível carregar as regiões.', retryText: 'Tentar regiões novamente' },
  ]) {
    test(`${locale}: failure exposes inline retry and recovers options`, async ({ page, context }, info) => {
      test.skip(!info.project.name.includes('mobile'), 'Run localized failure path once on mobile Chromium');
      await context.clearCookies();
      let fail = true;
      await page.route('**/marketplace/zonas', async route => {
        if (fail) {
          await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporarily unavailable' }) });
        } else {
          await route.continue();
        }
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/${locale}/unidades`);
      const toggle = page.locator('button[aria-controls="catalog-filters"]');
      await toggle.click();
      const error = page.getByRole('status').filter({ hasText: errorText });
      await expect(error).toBeVisible();
      // Other filters remain available without disrupting the catalog.
      await expect(page.locator('#catalog-keywords')).toBeEnabled();
      fail = false;
      await error.getByRole('button', { name: retryText }).click();
      await expect(error).toHaveCount(0);
      const zoneTrigger = page.locator('#catalog-filters [data-slot="select-trigger"]').nth(1);
      await zoneTrigger.click();
      await expect(page.getByRole('option', { name: /Goya · Centro/ })).toBeVisible();
    });
  }
});
