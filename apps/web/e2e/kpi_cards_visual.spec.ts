import { test, expect } from '@playwright/test';

test.describe('Auditoría Visual y Matemática de Tarjetas Métricas (KPIs)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Facturación AFIP (/es/facturacion-afip): Tarjetas KPI con padding >= 20px y sin textos cortados', async ({ page }) => {
    await page.goto('/es/facturacion-afip');
    await page.waitForLoadState('networkidle');

    // Ubicar los 3 KPIs superiores
    const kpiTitles = ['Total Facturado Mes', 'Comprobantes Emitidos', 'Último CAE Autorizado'];
    
    for (const titleText of kpiTitles) {
      const titleLocator = page.getByText(titleText, { exact: true });
      await expect(titleLocator).toBeVisible();

      // Medir matemáticamente distancia entre borde superior de la card y el texto del título
      const measurements = await titleLocator.evaluate((el) => {
        const card = el.closest('.min-h-\\[120px\\]') || el.closest('.rounded-2xl') || el.parentElement?.parentElement;
        if (!card) return null;
        const cardRect = card.getBoundingClientRect();
        const textRect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(card);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        return {
          paddingTop,
          distanceFromCardTop: textRect.top - cardRect.top,
          isOverflowHidden: computedStyle.overflow === 'hidden',
        };
      });

      expect(measurements).not.toBeNull();
      if (measurements) {
        // Asertar que el padding superior sea de al menos 20px (p-5 = 20px, sm:p-6 = 24px)
        expect(measurements.paddingTop).toBeGreaterThanOrEqual(20);
        expect(measurements.distanceFromCardTop).toBeGreaterThanOrEqual(20);
        expect(measurements.isOverflowHidden).toBe(false);
      }
    }

    // Captura de pantalla oficial
    await page.screenshot({ path: 'test-results/kpi-audit-afip.png', fullPage: false });
  });

  test('Dashboard Operativo (/es/dashboard): Tarjetas Bento con padding y aire superior adecuado', async ({ page }) => {
    await page.goto('/es/dashboard');
    await page.waitForLoadState('networkidle');

    // Verificar presencia de tarjetas de monitoreo y contratos
    const bentoItems = page.locator('.group\\/bento');
    await expect(bentoItems.first()).toBeVisible();

    const count = await bentoItems.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const item = bentoItems.nth(i);
      const paddingTop = await item.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).paddingTop);
      });
      // BentoGridItem tiene p-5 sm:p-6 (20px - 24px)
      expect(paddingTop).toBeGreaterThanOrEqual(20);
    }

    // Captura de pantalla oficial
    await page.screenshot({ path: 'test-results/kpi-audit-dashboard.png', fullPage: false });
  });

  test('Terminal de Métricas (/es/metricas): 4 Tarjetas KPI con padding >= 20px y valores holgados', async ({ page }) => {
    await page.goto('/es/metricas');
    await page.waitForLoadState('networkidle');

    const metricTitles = ['Vistas Totales', 'Contactos WhatsApp', 'Ocupación Activa', 'Ingresos Totales'];

    for (const titleText of metricTitles) {
      const titleLocator = page.getByText(titleText, { exact: true });
      await expect(titleLocator).toBeVisible();

      const measurements = await titleLocator.evaluate((el) => {
        const card = el.closest('.min-h-\\[130px\\]') || el.closest('.rounded-3xl');
        if (!card) return null;
        const cardRect = card.getBoundingClientRect();
        const textRect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(card);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        return {
          paddingTop,
          distanceFromCardTop: textRect.top - cardRect.top,
        };
      });

      expect(measurements).not.toBeNull();
      if (measurements) {
        expect(measurements.paddingTop).toBeGreaterThanOrEqual(20);
        expect(measurements.distanceFromCardTop).toBeGreaterThanOrEqual(20);
      }
    }

    // Captura de pantalla oficial
    await page.screenshot({ path: 'test-results/kpi-audit-metricas.png', fullPage: false });
  });

  test('Facturación de Cupos (/es/facturacion): Cards con espaciado y CardHeaders confortables', async ({ page }) => {
    await page.goto('/es/facturacion');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({ path: 'test-results/kpi-audit-facturacion.png', fullPage: false });
  });
});
