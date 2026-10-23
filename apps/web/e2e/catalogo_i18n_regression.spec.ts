import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: catálogo público traducido en ES, EN y PT', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const { locale, title, count, empty, error, retry } of [
    { locale: 'es', title: 'Catálogo de Unidades Disponibles', count: '0 unidades encontradas', empty: 'No encontramos unidades que coincidan', error: 'El catálogo no está disponible temporalmente', retry: 'Reintentar' },
    { locale: 'en', title: 'Available Units Catalog', count: '0 units found', empty: 'No units match the selected', error: 'The catalog is temporarily unavailable', retry: 'Try again' },
    { locale: 'pt', title: 'Catálogo de Unidades Disponíveis', count: '0 unidades encontradas', empty: 'Não encontramos unidades que correspondam', error: 'O catálogo está temporariamente indisponível', retry: 'Tentar novamente' },
  ]) {
    test(`${locale}: empty catalog and failure remain translated`, async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/${locale}/unidades?q=no-results`);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(page.getByText(count, { exact: true })).toBeVisible();
      await expect(page.getByText(empty, { exact: false })).toBeVisible();

      await page.goto(`/${locale}/unidades?q=trigger-error`);
      await expect(page.getByText(error, { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: retry, exact: true })).toBeVisible();
    });
  }

  for (const { locale, area, category, status, photo } of [
    { locale: 'es', area: 'Fuera de zonas predefinidas', category: 'Departamento', status: 'Unidad publicada', photo: 'Foto de la unidad' },
    { locale: 'en', area: 'Outside predefined areas', category: 'Apartment', status: 'Published unit', photo: 'Unit photo' },
    { locale: 'pt', area: 'Fora das áreas predefinidas', category: 'Apartamento', status: 'Unidade publicada', photo: 'Foto da unidade' },
  ]) {
    test(`${locale}: card and detail categories follow the language without changing API IDs`, async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/${locale}/unidades`);
      const first = page.getByTestId('unit-card').first();
      await expect(first).toBeVisible();
      await expect(first).toContainText(area);
      await expect(first).toContainText(category);
      await expect(first.getByTestId('unit-card-published')).toContainText(status);
      await first.getByTestId('unit-card-detail-link').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/unidades/a0000000-`));
      await expect(page.locator('body')).toContainText(category);
    });
  }
});
