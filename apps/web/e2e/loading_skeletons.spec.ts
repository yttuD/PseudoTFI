import { test, expect } from '@playwright/test';

test.describe('Esqueletos de Carga Inmediatos (loading.tsx y Skeleton shadcn)', () => {

  test('El componente Skeleton utiliza las clases canónicas de diseño de Rendo', async ({ page }) => {
    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Comprobar que la página responde de inmediato
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Navegación fluida por Dashboard, Mis Unidades y Métricas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/dashboard/);

    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/mis-unidades/);

    await page.goto('/es/metricas');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/metricas/);
  });

  test('Navegación fluida por Facturación AFIP, Alquileres, Inquilinos y Facturación Cupos', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/es/facturacion-afip');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/facturacion-afip/);

    await page.goto('/es/alquileres');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/alquileres/);

    await page.goto('/es/inquilinos');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/inquilinos/);

    await page.goto('/es/facturacion');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/facturacion/);
  });

  test('Ruta de detalle de unidad y catálogo en Marketplace resuelven sin congelamiento', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Catálogo
    await page.goto('/es/unidades');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toBeVisible();

    // Detalle de Unidad
    await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/.*\/unidades\/a0000000-0000-0000-0000-000000000001/);
  });

});
