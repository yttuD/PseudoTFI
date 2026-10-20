import { test, expect } from '@playwright/test';

test.describe('Validación de Cuentas Fijas de Demostración (Manual Testing Readiness)', () => {
  test.setTimeout(120000);

  test('1. Login de Gestor (gestor@renda.com.ar): Dashboard, 2 Unidades, Grupo, Inquilino y Alquiler', async ({ page }) => {
    await page.goto('/es/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await page.fill('input[type="email"], input[name="email"]', 'gestor@renda.com.ar');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Debe ingresar al Dashboard
    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main').getByText(/cupo|alquileres|terminal|resumen/i).first()).toBeVisible({ timeout: 15000 });

    // Comprobar inventario precargado en Mis Unidades
    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator(':visible').filter({ hasText: 'Departamento 2 Ambientes con Cochera - Centro' }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator(':visible').filter({ hasText: 'Cabaña Premium con Pileta y Quincho' }).first()).toBeVisible();

    // Comprobar Grupo
    await page.goto('/es/grupos');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator(':visible').filter({ hasText: 'Complejo Costanera Norte' }).first()).toBeVisible({ timeout: 15000 });

    // Comprobar Inquilino CRM
    await page.goto('/es/inquilinos');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator(':visible').filter({ hasText: 'Carlos Gómez' }).first()).toBeVisible({ timeout: 15000 });

    // Comprobar Alquiler Activo
    await page.goto('/es/alquileres');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator(':visible').filter({ hasText: /280\.000|280000/ }).first()).toBeVisible({ timeout: 15000 });
  });

  test('2. Login de Buscador (buscador@renda.com.ar): Redirige a Marketplace con WhatsApp desbloqueado', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await page.fill('input[type="email"], input[name="email"]', 'buscador@renda.com.ar');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Segregación estricta: debe estar en /es/unidades (Marketplace)
    await page.goto('/es/unidades');
    await page.waitForLoadState('networkidle');

    const unitCard = page.locator('a[href*="/unidades/"]').first();
    await expect(unitCard).toBeVisible({ timeout: 15000 });
    const href = await unitCard.getAttribute('href');
    if (href) {
      await page.goto(href);
    } else {
      await unitCard.click();
    }
    await page.waitForLoadState('domcontentloaded');

    // Botón de WhatsApp debe estar visible y habilitado para buscador
    const whatsappBtn = page.locator('a[href*="wa.me"]').first();
    await expect(whatsappBtn).toBeVisible({ timeout: 15000 });
    await expect(whatsappBtn).toHaveAttribute('href', /wa\.me/);

    // Acceso administrativo debe estar denegado para buscador
    await page.goto('/es/dashboard').catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });

  test('3. Login de Delegado (delegado@renda.com.ar): Acceso a unidades pero BLOQUEO de Facturación', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await page.fill('input[type="email"], input[name="email"]', 'delegado@renda.com.ar');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Acceder a mis unidades
    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator(':visible').filter({ hasText: 'Departamento 2 Ambientes con Cochera - Centro' }).first()).toBeVisible({ timeout: 15000 });

    // Intento de acceso a facturación
    await page.goto('/es/facturacion');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("Mercado Pago")')).toBeHidden();
  });

});
