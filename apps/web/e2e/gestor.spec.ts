import { test, expect } from '@playwright/test';

test.describe('Gestor Protected Routes (With Auth)', () => {
  test('GET /es/dashboard → 200, contiene texto "Dashboard"', async ({ page }) => {
    await page.goto('/es/dashboard');
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
  });

  test('GET /es/mis-unidades → 200, contiene botón "+ Nueva Unidad"', async ({ page }) => {
    await page.goto('/es/mis-unidades');
    await expect(page.locator('text=Nueva Unidad')).toBeVisible();
  });

  test('Formulario Unidad: puede navegar a creación y ver tabs', async ({ page }) => {
    await page.goto('/es/mis-unidades');
    await page.getByRole('link', { name: 'Nueva Unidad' }).first().click();
    await expect(page).toHaveURL(/\/es\/mis-unidades\/nueva/, { timeout: 30000 });
    
    // Check tabs
    await expect(page.locator('text=Datos básicos')).toBeVisible();
    await expect(page.locator('text=Marketplace')).toBeVisible();
    await expect(page.locator('text=Modalidades')).toBeVisible();
  });

  test('GET /es/inquilinos → 200, muestra tabla y botón Nuevo Inquilino', async ({ page }) => {
    await page.goto('/es/inquilinos');
    await expect(page.locator('h1', { hasText: 'Inquilinos' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuevo Inquilino/i })).toBeVisible();
  });

  test('GET /es/alquileres → 200, muestra tabla y botón Nuevo Alquiler', async ({ page }) => {
    await page.goto('/es/alquileres');
    await expect(page.locator('h1', { hasText: 'Alquileres' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuevo Alquiler/i })).toBeVisible();
  });

  test('GET /es/grupos → 200, muestra tabla y botón Nuevo Grupo', async ({ page }) => {
    await page.goto('/es/grupos');
    await expect(page.locator('h1', { hasText: 'Grupos' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuevo Grupo/i })).toBeVisible();
  });
});
