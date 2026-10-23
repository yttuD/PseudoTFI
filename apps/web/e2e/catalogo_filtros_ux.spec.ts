import { test, expect, type Page } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

async function expandFiltersIfNeeded(page: Page) {
  const panel = page.locator('#catalog-filters');
  if (!(await panel.isVisible())) {
    const button = page.locator('button[aria-controls="catalog-filters"]');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
  }
  await expect(panel).toBeVisible();
}

test.describe('UX-001: catalog filters should be calm, accurate and accessible', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });


  test('mobile shows listings before the optional filters, while preserving applied filter count', async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/es/unidades?q=casa&categoria=casa');
    const panel = page.locator('#catalog-filters');
    const control = page.locator('button[aria-controls="catalog-filters"]');
    await expect(control).toBeVisible();
    await expect(control).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();
    await expect(page.getByTestId('catalog-active-filter-count')).toHaveText('2');
    await control.click();
    await expect(panel).toBeVisible();
    await expect(page.getByText('“casa”')).toBeVisible();
    await control.click();
    await expect(panel).toBeHidden();
  });

  test('desktop keeps catalog filters open for advanced workflows', async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/unidades');
    await expect(page.locator('#catalog-filters')).toBeVisible();
    await expect(page.locator('button[aria-controls="catalog-filters"]')).toBeHidden();
  });

  test('draft edits never masquerade as applied filters; keep search state on navigation', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades?q=casa');
    await expandFiltersIfNeeded(page);
    const panel = page.locator('#catalog-filters');
    const keywords = panel.getByRole('textbox', { name: 'Palabras clave' });
    await expect(keywords).toHaveValue('casa');
    await expect(page.getByText('Filtros Activos:')).toBeVisible();
    await expect(page.getByText('“casa”')).toBeVisible();

    await keywords.fill('jardín');
    await expect(page.getByRole('status').filter({ hasText: 'Tenés cambios sin aplicar.' })).toBeVisible();
    await expect(page.getByText('“casa”')).toBeVisible();
    await expect(page.getByText('“jardín”')).toHaveCount(0);
    await page.getByRole('button', { name: 'Aplicar Filtros' }).click();
    await expect(page).toHaveURL(/q=jard%C3%ADn/);
    await expect(page.getByText('“jardín”')).toBeVisible();
    await expect(page.getByText('“casa”')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Tenés cambios sin aplicar.' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpiar' }).click();
    await expect(page).toHaveURL(/\/es\/unidades$/);
    await expect(page.getByText('Filtros Activos:')).toHaveCount(0);
  });

  test('invalid prices are explained inline and cannot be applied', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades');
    await expandFiltersIfNeeded(page);
    const min = page.locator('#catalog-filters').getByRole('spinbutton', { name: 'Mínimo' });
    const max = page.locator('#catalog-filters').getByRole('spinbutton', { name: 'Máximo' });
    await min.fill('500');
    await max.fill('100');
    await expect(page.getByRole('alert').filter({ hasText: 'Ingresá un rango válido' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aplicar Filtros' })).toBeDisabled();
    await max.fill('700');
    await expect(page.getByRole('button', { name: 'Aplicar Filtros' })).toBeEnabled();
    await max.press('Enter');
    await expect(page).toHaveURL(/precio_min=500/);
    await expect(page).toHaveURL(/precio_max=700/);
  });

  for (const { locale, title, button, keyword, category } of [
    { locale: 'en', title: 'Catalog filters', button: 'Apply filters', keyword: 'Keywords', category: 'Apartment' },
    { locale: 'pt', title: 'Filtros do catálogo', button: 'Aplicar filtros', keyword: 'Palavras-chave', category: 'Apartamento' },
  ]) {
    test(`${locale} has translated filters and keyboard-accessible labels`, async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/${locale}/unidades`);
      await expandFiltersIfNeeded(page);
      const panel = page.locator('#catalog-filters');
      await expect(page.getByRole('heading', { name: title }).or(page.getByRole('button', { name: title })).first()).toBeVisible();
      await expect(panel.getByRole('textbox', { name: keyword })).toBeVisible();
      await expect(page.getByRole('button', { name: button })).toBeVisible();
      await panel.locator('[data-slot="select-trigger"]').first().click();
      await expect(page.getByRole('option', { name: category })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(panel.getByText('Filtros del Catálogo')).toHaveCount(0);
    });
  }
});
