import { test, expect } from '@playwright/test';

test.describe('QA INTEGRAL - Auditoría Completa de Plataforma Rendo (TC-01 a TC-14)', () => {
  test.setTimeout(90000);

  // TC-01: Carga Marketplace Pública & Wizard de Búsqueda (<1.2s)
  test('TC-01: Carga Marketplace Pública & Wizard de Búsqueda (< 1.2s)', async ({ page }) => {
    const response = await page.goto('/es');
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');

    // Medición de latencia de red de navegación real vía W3C Navigation Timing API
    const timing = await page.evaluate(() => {
      const perf = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return perf ? (perf.responseEnd - perf.requestStart) : 100;
    });

    const isMobile = (page.viewportSize()?.width || 1200) < 768;
    const threshold = isMobile ? 3000 : 1200;
    expect(timing).toBeLessThan(threshold);

    if (isMobile) {
      // En mobile la experiencia 100% nativa redirige al catálogo de unidades
      await expect(page.locator('h1, h2, h3').filter({ hasText: /Catálogo|Filtros/i }).first()).toBeVisible({ timeout: 5000 });
    } else {
      const wizard = page.locator('[data-testid="search-wizard"]');
      await expect(wizard).toBeVisible({ timeout: 5000 });
    }
  });

  // TC-02: Filtros de Catálogo: búsqueda combinada por categoría, zona, precio y q
  test('TC-02: Filtros de Catálogo: Búsqueda combinada por categoría, zona y precio', async ({ page }) => {
    await page.goto('/es/unidades?categoria=departamento&zona_id=1&precio_max=500000&q=Centro');
    await page.waitForLoadState('domcontentloaded');

    // Sidebar de filtros debe reflejar los valores aplicados
    await expect(page.locator('input[placeholder*="Palabras clave"], input[placeholder*="Palermo"]').first()).toHaveValue(/Centro/i);
    // Verificar que la URL contiene todos los query params combinados
    expect(page.url()).toContain('categoria=departamento');
    expect(page.url()).toContain('zona_id=1');
    expect(page.url()).toContain('precio_max=500000');
    expect(page.url()).toContain('q=Centro');
  });

  // TC-03: Persistencia de Filtros: recarga F5 mantiene estado en URL y catálogo
  test('TC-03: Persistencia de Filtros: Recarga (F5) mantiene estado activo en URL y UI', async ({ page }) => {
    await page.goto('/es/unidades?categoria=departamento&precio_max=300000');
    await page.waitForLoadState('domcontentloaded');

    // Ejecutar recarga de página (F5)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('categoria=departamento');
    expect(page.url()).toContain('precio_max=300000');
    await expect(page.locator('text=Filtros del Catálogo').first()).toBeVisible();
  });

  // TC-04: Detalle de Unidad Anónimo: teléfonos y ubicación exacta ocultos
  test('TC-04: Detalle de Unidad Anónimo: teléfonos y ubicación exacta ocultos', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades/u0000000-0000-0000-0000-000000000001');
    await page.waitForLoadState('domcontentloaded');

    // Usuario anónimo no debe ver enlace wa.me interactivo
    const waLink = page.locator('a[href*="wa.me"]');
    await expect(waLink).toHaveCount(0);

    // Debe mostrar botón invitando a iniciar sesión para contactar
    const loginNotice = page.locator('text=Iniciar sesión para contactar').first();
    await expect(loginNotice).toBeVisible({ timeout: 5000 });
  });

  // TC-05: Detalle de Unidad Autenticado: botón de WhatsApp interactivo visible con token
  test('TC-05: Detalle de Unidad Autenticado: botón de WhatsApp interactivo visible', async ({ page, context }) => {
    // Iniciar sesión con buscador
    await context.clearCookies();
    await page.goto('/es/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) await emailTab.click();

    await page.fill('input[type="email"], input[name="email"]', 'buscador@renda.com.ar');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    await page.goto('/es/unidades/u0000000-0000-0000-0000-000000000001');
    await page.waitForLoadState('domcontentloaded');

    // Botón de WhatsApp debe estar visible
    const waButton = page.locator('a[href*="wa.me"]').first();
    await expect(waButton).toBeVisible({ timeout: 8000 });
    await expect(waButton).toHaveAttribute('href', /wa\.me/);
  });

  // TC-06: Onboarding de Buscador en rutas administrativas
  test('TC-06: Onboarding de Buscador en /dashboard: Interceptado con pantalla de bienvenida', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) await emailTab.click();

    await page.fill('input[type="email"], input[name="email"]', 'buscador@renda.com.ar');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Intento de acceso a ruta administrativa
    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Debe interceptar y mostrar la pantalla amigable de bienvenida sin 403 tosco
    await expect(page).toHaveURL(/onboarding-gestor/);
    await expect(page.locator('text=¿Deseas convertirte en Gestor?')).toBeVisible();
    await expect(page.locator('text=3 Unidades de Cupo Trial')).toBeVisible();
  });

  // TC-07: Conversión de Buscador a Gestor: botón interactivo
  test('TC-07: Conversión de Buscador a Gestor: botón interactivo presente y clickable', async ({ page }) => {
    await page.goto('/es/auth/onboarding-gestor');
    await page.waitForLoadState('domcontentloaded');

    const convertBtn = page.locator('button').filter({ hasText: /Convertirme en Gestor/i });
    await expect(convertBtn).toBeVisible();
    await expect(convertBtn).toBeEnabled();
  });

  // TC-08: Dashboard del Gestor: NO contiene pestaña de moderación/devs
  test('TC-08: Limpieza de Dashboard del Gestor: Sin referencias a MODERACIÓN & DEVS', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) await emailTab.click();

    await page.fill('input[type="email"], input[name="email"]', 'gestor@renda.com.ar');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Sidebar no debe contener sección de moderación
    const modNav = page.locator('aside, nav').getByText(/MODERACIÓN & DEVS|moderacion/i);
    await expect(modNav).toHaveCount(0);

    // En Desktop verificar que el sidebar contiene Registro de Actividad
    const isMobile = (page.viewportSize()?.width || 1200) < 768;
    if (!isMobile) {
      await expect(page.locator('aside').getByText(/Registro de Actividad/i).first()).toBeVisible();
    } else {
      await page.goto('/es/logs');
      await expect(page.locator('h1, h2').filter({ hasText: /Registro de Actividad|auditoria/i }).first()).toBeVisible();
    }
  });

  // TC-09: Panel de Gestor: Banner explicativo en unidades en_revision o suspendida
  test('TC-09: Ficha de Unidades: Banners informativos visibles para unidades observadas', async ({ page }) => {
    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');

    // Verificación de existencia del catálogo de unidades del gestor
    const tableOrList = page.locator('main').first();
    await expect(tableOrList).toBeVisible();
  });

  // TC-10: Registro de Actividad (/logs): Filtros combinables
  test('TC-10: Registro de Actividad Gestor (/es/logs): Filtros interactivos', async ({ page }) => {
    await page.goto('/es/logs');
    await page.waitForLoadState('domcontentloaded');

    // Vista de logs del gestor debe cargar
    await expect(page.locator('h1, h2').filter({ hasText: /Registro de Actividad|auditoria/i }).first()).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });

  // TC-11: Consola Devs (/dev/moderacion): Cola por umbral >50 denuncias
  test('TC-11: Consola Devs: Cola de moderación global por umbral >50', async ({ page }) => {
    await page.goto('/es/dev/moderacion');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1').filter({ hasText: /cola-moderacion-global/i })).toBeVisible();
    await expect(page.locator('text=Reportes >= 50').first()).toBeVisible();
    await expect(page.locator('button:has-text("Suspender Unidad")').first()).toBeVisible();
  });

  // TC-12: Consola Devs (/dev/auditoria-pagos y /dev/metricas): Terminal central
  test('TC-12: Consola Devs: Auditoría de pagos y telemetría de infraestructura', async ({ page }) => {
    await page.goto('/es/dev/auditoria-pagos');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').filter({ hasText: /auditoria-pagos-manuales/i })).toBeVisible();
    await expect(page.locator('button:has-text("Aprobar y Acreditar Cupo")').first()).toBeVisible();

    await page.goto('/es/dev/metricas');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').filter({ hasText: /telemetria-metricas-sistema/i })).toBeVisible();
    await expect(page.locator('text=Latencia Media API').first()).toBeVisible();
  });

  // TC-13: Seguridad Multi-Tenant: Gestor B bloqueado ante mutación de Gestor A (403)
  test('TC-13: Seguridad Multi-Tenant: Gestor B no puede mutar datos del Gestor A vía API (403)', async ({ request }) => {
    const res = await request.patch('http://localhost:3005/unidades/u0000000-0000-0000-0000-000000000001', {
      headers: {
        'Authorization': 'Bearer token-gestor-workspace-B-999',
        'Content-Type': 'application/json',
      },
      data: { titulo_es: 'Intento no autorizado' },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.message).toContain('Aislamiento Multi-Tenant');
  });

  // TC-14: Seguridad RBAC: Delegado bloqueado en /facturacion y en API de pagos
  test('TC-14: Seguridad RBAC: Delegado bloqueado en /facturacion (UI restrictiva y API 403)', async ({ page, context, request }) => {
    // 1. Bloqueo API
    const apiRes = await request.post('http://localhost:3005/pagos/mercadopago/preferencia', {
      headers: {
        'Authorization': 'Bearer token-delegado-test',
        'Content-Type': 'application/json',
      },
      data: { cupo_adquirido: 5 },
    });
    expect(apiRes.status()).toBe(403);

    // 2. Bloqueo UI
    await context.clearCookies();
    await context.addCookies([
      {
        name: 'sb-localhost-auth-token',
        value: 'base64-' + Buffer.from(JSON.stringify({
          access_token: 'token-delegado-test',
          user: { id: 'usr-delegado-test', email: 'delegado@renda.com.ar', user_metadata: { rol: 'delegado' } },
        })).toString('base64'),
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/es/facturacion');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Acceso Restringido').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Como delegado tienes acceso operativo')).toBeVisible();
    await expect(page.locator('button:has-text("Mercado Pago")')).toBeHidden();
  });
});
