import { test, expect } from '@playwright/test';

test.describe('Auditoría Integral Impeccable: Buscador, Gestor y Delegado (Desktop & Mobile)', () => {

  // =========================================================================
  // 1. FLUJO DEL BUSCADOR / INQUILINO POTENCIAL
  // =========================================================================

  test('Buscador Desktop: Landing con CityBackground animado, SearchWizard y Bento', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Específico de viewport Desktop (en mobile la UX redirige de forma fluida a /unidades)');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    // 1. Verificar Fondo Animado de Ciudad (CityBackground) tras montaje determinista
    const distantSkyline = page.locator('#distantSkyline');
    await expect(distantSkyline).toBeAttached({ timeout: 10000 });
    const citySkyline = page.locator('#citySkyline');
    await expect(citySkyline).toBeAttached({ timeout: 10000 });

    // 2. Verificar que el contenido del Hero esté en z-10 por encima del fondo
    const heroContent = page.locator('.relative.z-10').first();
    await expect(heroContent).toBeVisible();

    // 3. SearchWizard: Input interactivo y pasos
    const wizard = page.locator('.shadow-glass').first();
    await expect(wizard).toBeVisible();

    // 4. Bento Grid de características
    const bento = page.locator('.grid').filter({ hasText: /0% comisiones/i });
    await expect(bento.first()).toBeVisible();

    // Captura visual de verificación Impeccable en Desktop
    await page.screenshot({ path: 'test-results/impeccable-hero-desktop.png', fullPage: false });
  });

  test('Buscador Mobile (375px): Catálogo de unidades y Ficha de Detalle con WhatsApp y Mapa', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/es/unidades');
    await page.waitForLoadState('networkidle');

    // 1. Catálogo móvil: verificar presencia de tarjetas con precio monospace
    const card = page.locator('article, .group').filter({ hasText: /\$/ }).first();
    await expect(card).toBeVisible();

    // 2. Click en la primera unidad para abrir la Ficha de Detalle
    await card.click();
    await page.waitForURL('**/unidades/**');

    // 3. Verificar botón de WhatsApp enriquecido
    const wsBtn = page.getByRole('link', { name: /WhatsApp/i }).first();
    await expect(wsBtn).toBeVisible();
    const href = await wsBtn.getAttribute('href');
    expect(href).toContain('wa.me');

    // 4. Verificar mapa Leaflet
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible();

    // 5. Modal de Reporte
    const reportBtn = page.getByRole('button', { name: /Reportar/i }).first();
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      const reportDialog = page.getByRole('dialog');
      await expect(reportDialog).toBeVisible();
      const cancelReport = reportDialog.getByRole('button', { name: /Cancelar/i });
      await cancelReport.click();
    }

    // Captura móvil
    await page.screenshot({ path: 'test-results/impeccable-unidad-mobile.png', fullPage: false });
  });

  test('Buscador: Páginas Legales (/terminos y /privacidad) y Auth (/login)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Términos
    await page.goto('/es/terminos');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/Términos/i);

    // Privacidad
    await page.goto('/es/privacidad');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/Privacidad/i);

    // Login
    await page.goto('/es/auth/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="password"], input[type="tel"]').first()).toBeVisible();
  });

  // =========================================================================
  // 2. FLUJO DEL GESTOR (PANEL OPERATIVO)
  // =========================================================================

  test('Gestor: Dashboard Operativo, Widgets de Equipo y Registro de Actividad', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/dashboard');
    await page.waitForLoadState('networkidle');

    // 1. Sidebar: Verificar ausencia de enlace "Grupos" y presencia de enlaces gestor
    const sidebar = page.locator('nav, aside').first();
    await expect(sidebar.locator('a[href*="/grupos"]')).not.toBeVisible();
    await expect(sidebar.locator('a[href*="/facturacion-afip"]')).toBeVisible();

    // 2. Widget Equipo & Delegados
    await expect(page.getByText(/Equipo & Delegados/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Invitar/i })).toBeVisible();

    // 3. Widget Registro de Actividad
    await expect(page.getByRole('heading', { name: /Registro de Actividad Reciente/i })).toBeVisible();

    await page.screenshot({ path: 'test-results/impeccable-dashboard-desktop.png', fullPage: false });
  });

  test('Gestor: Módulo de Métricas (/metricas) con los 4 bloques completos', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/metricas');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/Métricas/i);

    // Bloque 1: KPIs
    await expect(page.getByText('Vistas Totales')).toBeVisible();
    await expect(page.getByText('Contactos WhatsApp')).toBeVisible();
    await expect(page.getByText('Ocupación Activa')).toBeVisible();
    await expect(page.getByText('Ingresos Totales')).toBeVisible();

    // Bloque 2: Gráfico de Evolución Temporal
    await expect(page.getByText('Evolución Temporal Continua')).toBeVisible();

    // Bloque 3: Ocupación por Tipo y Rendimiento
    await expect(page.getByText('Ocupación por Tipo')).toBeVisible();
    await expect(page.getByText('Rendimiento Individual de Unidades')).toBeVisible();

    // Bloque 4: Financiero y CRM
    await expect(page.getByText(/Módulo Financiero y Facturación/i)).toBeVisible();
    await expect(page.getByText(/Actividad CRM e Inquilinos/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/impeccable-metricas-desktop.png', fullPage: false });
  });

  test('Gestor: Formulario de Unidad (/mis-unidades/nueva) con Mapa y Tarifas Simétricas', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/mis-unidades/nueva');
    await page.waitForLoadState('networkidle');

    // Verificar layout amplio max-w-7xl
    const container = page.locator('.max-w-7xl');
    await expect(container.first()).toBeVisible();

    // Verificar tarjetas simétricas de tarifas
    await expect(page.getByText(/Alquiler por Día/i)).toBeVisible();
    await expect(page.getByText(/Alquiler Mensual/i)).toBeVisible();

    // Verificar dropzone de fotos
    await expect(page.getByText(/Arrastrá hasta 10 imágenes/i)).toBeVisible();

    // Verificar mapa interactivo
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  // =========================================================================
  // 3. FLUJO DEL DELEGADO (RBAC & RESTRICCIONES STRICT)
  // =========================================================================

  test('Delegado: Restricción estricta en Facturación, Facturación AFIP y Candado RF-G12 en Métricas', async ({ browser }) => {
    const delegadoPayload = {
      access_token: 'mock-delegado-jwt-token-12345',
      token_type: 'bearer',
      user: {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'delegado@renda.com.ar',
        role: 'authenticated',
        user_metadata: { role: 'delegado', rol: 'delegado' },
      },
    };
    const b64 = 'base64-' + Buffer.from(JSON.stringify(delegadoPayload)).toString('base64');

    // Crear contexto autenticado con rol delegado
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      storageState: {
        cookies: [
          {
            name: 'sb-127-auth-token',
            value: b64,
            domain: 'localhost',
            path: '/',
            expires: Date.now() / 1000 + 86400,
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          },
          {
            name: 'sb-localhost-auth-token',
            value: b64,
            domain: 'localhost',
            path: '/',
            expires: Date.now() / 1000 + 86400,
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          },
        ],
        origins: [
          {
            origin: 'http://localhost:3000',
            localStorage: [
              {
                name: 'auth-storage',
                value: JSON.stringify({
                  state: {
                    user: delegadoPayload.user,
                    token: delegadoPayload.access_token,
                    isAuthenticated: true,
                  },
                  version: 0,
                }),
              },
            ],
          },
        ],
      },
    });

    const page = await context.newPage();

    // 1. Acceso directo a /facturacion -> debe mostrar Acceso Restringido
    await page.goto('/es/facturacion');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Acceso Restringido/i)).toBeVisible();

    // 2. Acceso directo a /facturacion-afip -> debe mostrar Acceso Restringido
    await page.goto('/es/facturacion-afip');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Acceso Restringido/i)).toBeVisible();

    // 3. En /metricas -> debe exhibir el candado RF-G12 en el bloque financiero
    await page.goto('/es/metricas');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/RF-G12/i).first()).toBeVisible();
    await expect(page.getByText(/Restricción RF-G12: Rol Delegado/i)).toBeVisible();

    await page.screenshot({ path: 'test-results/impeccable-delegado-rf-g12.png', fullPage: false });

    await context.close();
  });
});
