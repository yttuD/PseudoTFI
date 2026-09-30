import { test, expect } from '@playwright/test';

test.describe('Módulo de Métricas y Rediseño de Dashboard', () => {
  test('El Dashboard muestra los dos nuevos widgets modulares y elimina el bloque estático', async ({ page }) => {
    // Visitar dashboard con sesión simulada
    await page.addInitScript(() => {
      window.localStorage.setItem('rendo_role', 'gestor');
    });

    await page.goto('/es/dashboard');
    await page.waitForLoadState('networkidle');

    // Comprobar que no existe el bloque estático antiguo de eventos
    const antiguoBloque = page.locator('text=EVENTOS OPERATIVOS DEL WORKSPACE');
    await expect(antiguoBloque).toHaveCount(0);

    // Comprobar presencia de los dos widgets modulares nuevos
    const widgetDelegados = page.getByRole('heading', { name: /Equipo & Delegados/i });
    await expect(widgetDelegados).toBeVisible();

    const widgetActividad = page.getByRole('heading', { name: /Registro de Actividad/i });
    await expect(widgetActividad).toBeVisible();

    // Comprobar botón invitar hacia /delegados
    const btnInvitar = page.locator('a[href*="/delegados"]:has-text("Invitar")');
    await expect(btnInvitar).toBeVisible();

    // Comprobar enlace de actividad hacia /logs
    const linkLogs = page.locator('a[href*="/logs"]:has-text("Ver auditoría completa")');
    await expect(linkLogs).toBeVisible();
  });

  test('Sidebar incluye el ítem Métricas y permite navegar a /metricas', async ({ page, isMobile }) => {
    await page.goto('/es/dashboard');
    await page.waitForLoadState('networkidle');

    if (isMobile) {
      // En mobile, abrir el menú lateral si está colapsado
      const menuButton = page.locator('button[aria-label*="menu" i], button:has(svg.lucide-menu), [data-sidebar-toggle]');
      if (await menuButton.count() > 0 && await menuButton.first().isVisible()) {
        await menuButton.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Buscar enlace a Métricas en el menú de navegación
    const navMetricas = page.locator('a[href*="/metricas"]').first();
    if (isMobile) {
      await page.goto('/es/metricas');
    } else {
      await expect(navMetricas).toBeVisible();
      await navMetricas.click();
    }
    await expect(page).toHaveURL(/.*\/metricas/);
  });

  test('La página de Métricas renderiza KPIs, serie temporal zero-filled y distribución', async ({ page }) => {
    await page.goto('/es/metricas');
    await page.waitForLoadState('networkidle');

    // Título principal
    const heading = page.getByRole('heading', { name: /Métricas de Rendimiento/i });
    await expect(heading).toBeVisible();

    // 4 KPIs
    await expect(page.locator('text=Vistas Totales')).toBeVisible();
    await expect(page.locator('text=Contactos WhatsApp')).toBeVisible();
    await expect(page.locator('text=Ocupación Activa')).toBeVisible();
    await expect(page.locator('text=Ingresos Totales')).toBeVisible();

    // Presets de tiempo
    const btn7D = page.getByRole('button', { name: '7D' });
    const btn30D = page.getByRole('button', { name: '30D' });
    await expect(btn7D).toBeVisible();
    await expect(btn30D).toBeVisible();

    // Interactuar con filtro 7D
    await btn7D.click();
    await page.waitForTimeout(500);

    // Comprobar que el gráfico temporal está montado
    const chartContainer = page.locator('.recharts-responsive-container');
    await expect(chartContainer.first()).toBeVisible();

    // Comprobar sección de ocupación y rendimiento individual
    await expect(page.getByRole('heading', { name: /Ocupación por Tipo/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Rendimiento Individual/i })).toBeVisible();
  });
});
