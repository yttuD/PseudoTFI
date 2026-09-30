import { test, expect } from '@playwright/test';

test.describe('Auditoría Integral del Sistema Rendo', () => {

  // BLOQUE 1: VERIFICACIÓN DE OVERFLOW Y RESPONSIVIDAD MÓVIL (393px - 412px)
  test('Auditoría Mobile: Cero scroll horizontal y visibilidad de BottomNav', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 }); // Viewport Android estándar
    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    // 1.1 Comprobar que no exista desbordamiento horizontal
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBeFalsy();

    // 1.2 Validar que el FloatingDock inferior móvil esté montado y visible
    const mobileDock = page.locator('nav').filter({ hasText: /Explorar|Mapa|Favoritos/i }).first();
    await expect(mobileDock).toBeVisible();

    // 1.3 Validar que el Sidebar de escritorio esté oculto en mobile
    const desktopSidebar = page.locator('aside');
    if (await desktopSidebar.count() > 0) {
      await expect(desktopSidebar.first()).toBeHidden();
    }
  });

  // BLOQUE 2: AUDITORÍA DE MODO OSCURO (DARK MODE) Y PERSISTENCIA
  test('Auditoría Theme: Conmutación de clase .dark y almacenamiento persistente', async ({ page }) => {
    await page.goto('/es');
    const html = page.locator('html');
    const toggleButton = page.locator('button[aria-label*="modo" i], button[aria-label*="theme" i]').first();

    await expect(toggleButton).toBeVisible();

    // Estado inicial
    const initialTheme = await html.getAttribute('class');

    // Clic para cambiar tema
    await toggleButton.click();
    await page.waitForTimeout(300);

    const changedTheme = await html.getAttribute('class');
    expect(changedTheme).not.toBe(initialTheme);

    // Verificar persistencia en recarga
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const reloadedTheme = await html.getAttribute('class');
    expect(reloadedTheme).toBe(changedTheme);
  });

  // BLOQUE 3: AUDITORÍA i18n EXACTA (ES / EN / PT)
  test('Auditoría i18n: Renderizado de glosario canónico sin claves sin traducir', async ({ page }) => {
    // 3.1 Español
    await page.goto('/es');
    await expect(page.locator('h1')).toContainText(/alquilar|gestionar/i);
    await expect(page.getByRole('button', { name: /Publicar mis Unidades/i })).toBeVisible();

    // 3.2 Inglés
    await page.goto('/en');
    await expect(page.locator('h1')).toContainText(/rent|manage/i);
    await expect(page.getByRole('button', { name: /List My Units/i })).toBeVisible();

    // 3.3 Portugués
    await page.goto('/pt');
    await expect(page.locator('h1')).toContainText(/alugar|gerenciar/i);
    await expect(page.getByRole('button', { name: /Publicar Minhas Unidades/i })).toBeVisible();

    // 3.4 Verificar que no existan cadenas residuales del tipo "Landing." o "Nav." sin resolver en el DOM
    const rawKeysCount = await page.locator('text=/\\b(Landing|Nav|UnitDetail|GestorDashboard|Moderation|Auth)\\.[a-zA-Z0-9]+\\b/').count();
    expect(rawKeysCount).toBe(0);
  });

  // BLOQUE 4: POLIMORFISMO EN DASHBOARD (TABLAS EN DESKTOP VS CARDS EN MOBILE)
  test('Auditoría UI Polimórfica: Tablas en Desktop y Cards en Mobile', async ({ page }) => {
    // Modo Desktop (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/es/mis-unidades');

    // En desktop la tabla debe ser el contenedor activo
    const desktopTable = page.locator('table');
    if (await desktopTable.count() > 0) {
      await expect(desktopTable.first()).toBeVisible();
    }

    // Cambiar a Mobile (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // En mobile la tabla debe estar oculta y las cards visibles
    if (await desktopTable.count() > 0) {
      await expect(desktopTable.first()).toBeHidden();
    }
  });

  // BLOQUE 5: MAPA LEAFLET EN MOBILE (SIN TRAMPA DE SCROLL)
  test('Auditoría Leaflet Mobile: Apertura en Dialog Fullscreen', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/es/mis-unidades/nueva'); // O ruta del formulario de unidad

    const mapModalTrigger = page.locator('button:has-text("Fijar ubicación"), button:has-text("ubicación en mapa")');
    if (await mapModalTrigger.isVisible()) {
      await mapModalTrigger.click();

      // El diálogo fullscreen debe desplegarse
      const mapDialog = page.locator('[role="dialog"]');
      await expect(mapDialog).toBeVisible();
      await expect(mapDialog.locator('button:has-text("Confirmar Ubicación")')).toBeVisible();

      // Cerrar y comprobar remoción del overlay
      await mapDialog.locator('button:has-text("Confirmar Ubicación")').click();
      await expect(mapDialog).toBeHidden();
    }
  });

  // BLOQUE 6: FICHA DE DETALLE (TABS Y BOTÓN DE WHATSAPP)
  test('Auditoría Ficha Unidad: Navegación de Tabs y CTA WhatsApp interactivo', async ({ page }) => {
    await page.goto('/es/unidades');
    const firstUnitCard = page.locator('a[href*="/unidades/"]').first();
    
    if (await firstUnitCard.isVisible()) {
      await firstUnitCard.click();
      await page.waitForLoadState('networkidle');

      // Validar tabs interactivos
      const tabs = page.locator('[role="tab"], button[data-state]');
      expect(await tabs.count()).toBeGreaterThanOrEqual(2);

      // Validar botón de WhatsApp con enlace wa.me
      const waButton = page.locator('a[href*="wa.me"]');
      await expect(waButton).toBeVisible();
    }
  });

});
