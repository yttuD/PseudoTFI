import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: catalog filters should be calm, accurate and accessible', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('draft edits never masquerade as applied filters; keep search state on navigation', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades?q=casa');
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
      const panel = page.locator('#catalog-filters');
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(panel.getByRole('textbox', { name: keyword })).toBeVisible();
      await expect(page.getByRole('button', { name: button })).toBeVisible();
      await panel.locator('[data-slot="select-trigger"]').first().click();
      await expect(page.getByRole('option', { name: category })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(panel.getByText('Filtros del Catálogo')).toHaveCount(0);
    });
  }
});
