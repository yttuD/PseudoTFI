import { test, expect } from '@playwright/test';

test.describe('Internacionalización (i18n) — ES / EN / PT', () => {
  test('Renderiza landing con textos y glosario canónico en Español (/es)', async ({ page }) => {
    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Alquileres en Goya');
    await expect(page.getByText('Comunidad activa de Gestores e Inquilinos')).toBeVisible();
    await expect(page.getByRole('heading', { name: '0% Comisiones por Alquiler' })).toBeVisible();
    await expect(page.getByText('¿Cómo funciona para Gestores?')).toBeVisible();
  });

  test('Renderiza landing con textos y glosario canónico en Inglés (/en)', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Rentals in Goya');
    await expect(page.getByText('Active Community of Property Managers and Tenants')).toBeVisible();
    await expect(page.getByRole('heading', { name: '0% Rental Commissions' })).toBeVisible();
    await expect(page.getByText('How it works for Property Managers')).toBeVisible();
  });

  test('Renderiza landing con textos y glosario canónico en Portugués (/pt)', async ({ page }) => {
    await page.goto('/pt');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Aluguéis em Goya');
    await expect(page.getByText('Comunidade ativa de Gestores Imobiliários e Inquilinos')).toBeVisible();
    await expect(page.getByRole('heading', { name: '0% Comissões por Aluguel' })).toBeVisible();
    await expect(page.getByText('Como funciona para Gestores Imobiliários')).toBeVisible();
  });
});
