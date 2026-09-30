import { test, expect } from '@playwright/test';

test.describe('Verificación de Correcciones UI/UX y Páginas Legales (Tareas 1 a 6)', () => {
  
  // TAREA 5: Landing Page Bento Grid sin badges técnicos y propuesta de negocio
  test('TC-UI-01: Bento Grid en Landing con 4 tarjetas de valor comercial y sin badges técnicos', async ({ page, isMobile }) => {
    test.skip(isMobile, 'En mobile la landing redirige a catálogo nativo');
    await page.goto('/es');
    await page.waitForLoadState('domcontentloaded');

    // Validar tarjetas de negocio
    await expect(page.locator('text=0% Comisiones por Alquiler').first()).toBeVisible();
    await expect(page.locator('text=Contacto Directo por WhatsApp').first()).toBeVisible();
    await expect(page.locator('text=Ubicación Clara y Segura').first()).toBeVisible();
    await expect(page.locator('text=Gestión Integral y Control').first()).toBeVisible();

    // Validar que NO existen badges técnicos eliminados
    await expect(page.locator('text="100% Directo"')).toHaveCount(0);
    await expect(page.locator('text="OSM + Leaflet"')).toHaveCount(0);
    await expect(page.locator('text="JetBrains Mono"')).toHaveCount(0);
    await expect(page.locator('text="next-intl"')).toHaveCount(0);
  });

  // TAREA 6: Páginas Legales y Enlaces del Footer
  test('TC-UI-02: Páginas Legales (/privacidad y /terminos) y navegación directa', async ({ page }) => {
    // 1. Probar ruta Términos
    await page.goto('/es/terminos');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toContainText(/Términos y Condiciones/i);
    await expect(page.locator('text=0% Comisiones sobre Transacciones').first()).toBeVisible();
    await expect(page.locator('text=Goya, Provincia de Corrientes').first()).toBeVisible();

    // 2. Probar ruta Privacidad (Ley 25.326)
    await page.goto('/es/privacidad');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toContainText(/Política de Privacidad/i);
    await expect(page.locator('text=Ley 25.326').first()).toBeVisible();
    await expect(page.locator('text=privacidad@rendo.com.ar').first()).toBeVisible();
    await expect(page.locator('text=AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA').first()).toBeVisible();
  });

  // TAREA 1: Sidebar del Gestor y Redirección de Grupos
  test('TC-UI-03: Sidebar sin enlace "Grupos", con selector de tema, y redirect de /grupos', async ({ page, isMobile }) => {
    // 1. Redirección de /grupos a /mis-unidades
    await page.goto('/es/grupos');
    await page.waitForURL('**/mis-unidades');
    expect(page.url()).toContain('/mis-unidades');

    // 2. En Desktop inspeccionar Sidebar en dashboard
    test.skip(isMobile, 'Sidebar expandido con selector es inspeccionado en Desktop');
    const cookie = {
      name: 'sb-localhost-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify({
        user: { id: 'test-gestor-id', email: 'gestor@rendo.com.ar', user_metadata: { role: 'gestor' } },
        access_token: 'fake-token'
      })).toString('base64'),
      domain: 'localhost',
      path: '/'
    };
    await page.context().addCookies([cookie]);

    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Sidebar no debe tener link a /grupos
    const gruposSidebarLink = page.locator('aside a[href*="/grupos"], nav a[href*="/grupos"]');
    await expect(gruposSidebarLink).toHaveCount(0);

    // Sidebar debe tener selector de tema
    const themeBtn = page.locator('button[aria-label="Cambiar tema"]');
    await expect(themeBtn.first()).toBeVisible();
  });

  // TAREAS 2, 3 y 4: Formulario de Unidad
  test('TC-UI-04: Formulario Nueva Unidad con layout amplio, textos simplificados y botones de tarifas ordenados', async ({ page }) => {
    const cookie = {
      name: 'sb-localhost-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify({
        user: { id: 'test-gestor-id', email: 'gestor@rendo.com.ar', user_metadata: { role: 'gestor' } },
        access_token: 'fake-token'
      })).toString('base64'),
      domain: 'localhost',
      path: '/'
    };
    await page.context().addCookies([cookie]);

    await page.goto('/es/mis-unidades/nueva');
    await page.waitForLoadState('domcontentloaded');

    // TAREA 3: Textos simplificados de traducción
    await expect(page.locator('text=Traducción automática').first()).toBeVisible();
    await expect(page.locator('text=Disponible en inglés y portugués').first()).toBeVisible();
    
    // Switch de pestañas para ver callout
    const tabEn = page.locator('button:has-text("English")');
    if (await tabEn.isVisible()) {
      await tabEn.click();
      await expect(page.locator('text=Automatic translation enabled').first()).toBeVisible();
    }

    // TAREA 4: Botones de modalidad de tarifas
    await expect(page.locator('text=Alquiler por Día').first()).toBeVisible();
    await expect(page.locator('text=Alquiler Mensual').first()).toBeVisible();
    await expect(page.locator('text=Alquiler por Hora').first()).toBeVisible();
    await expect(page.locator('text=Por noche o temporada').first()).toBeVisible();
    await expect(page.locator('text=Contratos tradicionales').first()).toBeVisible();
    await expect(page.locator('text=Canchas, eventos y turnos').first()).toBeVisible();

    // TAREA 2: Botón de Guardar en barra inferior visible
    const saveBtn = page.locator('button[type="submit"]:has-text("Guardar Unidad")');
    await expect(saveBtn).toBeVisible();
  });

});
