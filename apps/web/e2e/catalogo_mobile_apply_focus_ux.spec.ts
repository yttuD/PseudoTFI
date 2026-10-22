import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: applying mobile filters reveals results without losing focus', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('collapses only after application, preserves applied state and restores keyboard access', async ({ page, context }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile behavior tested once on mobile Chromium');
    await context.clearCookies();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/es/unidades');
    const toggle = page.locator('button[aria-controls="catalog-filters"]');
    const panel = page.locator('#catalog-filters');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(panel).toBeVisible();
    const query = panel.getByRole('textbox', { name: 'Palabras clave' });
    await query.fill('casa');
    await expect(page.getByRole('status').filter({ hasText: 'Tenés cambios sin aplicar.' })).toBeVisible();
    await panel.getByRole('button', { name: 'Aplicar Filtros' }).click();
    await expect(page).toHaveURL(/q=casa/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(page.getByTestId('catalog-active-filter-count')).toHaveText('1');
    await toggle.press('Enter');
    await expect(panel).toBeVisible();
    await expect(query).toHaveValue('casa');
    await expect(page.getByText('“casa”')).toBeVisible();
  });
});
