import { test, expect } from '@playwright/test';

test.describe('Marketplace Public Routes', () => {
  test('GET /es → 200, contiene el wizard de búsqueda', async ({ page }) => {
    const response = await page.goto('/es');
    expect(response?.status()).toBe(200);
    // Verify a characteristic of the wizard
    await expect(page.getByTestId('search-wizard')).toBeVisible();
  });

  test('GET /es/unidades → 200, renderiza el grid', async ({ page }) => {
    const response = await page.goto('/es/unidades');
    expect(response?.status()).toBe(200);
    // Assuming we have some unit cards or the filters
    await expect(page.getByText('Filtros').first()).toBeVisible();
  });

  test('GET /pt/unidades → 200, URL válida con locale pt', async ({ page }) => {
    const response = await page.goto('/pt/unidades');
    expect(response?.status()).toBe(200);
  });

  test('GET /en/unidades → 200, URL válida con locale en', async ({ page }) => {
    const response = await page.goto('/en/unidades');
    expect(response?.status()).toBe(200);
  });
});
