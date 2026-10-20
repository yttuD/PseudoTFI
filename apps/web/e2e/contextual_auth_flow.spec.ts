import { test, expect } from '@playwright/test';

test.describe('Autenticación Contextual y Switch de Modo (Airbnb/ML style)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('1. Contexto Marketplace: UI de bienvenida a inquilinos y redirección a unidades', async ({ page }) => {
    await page.goto('/es/auth/login?portal=marketplace');
    await page.waitForLoadState('domcontentloaded');

    // Comprobar título y bajada contextual de Marketplace/Inquilino
    await expect(page.getByText(/te damos la bienvenida a rendo/i)).toBeVisible();
    await expect(page.getByText(/iniciá sesión para ver ubicaciones exactas/i)).toBeVisible();
    await expect(page.getByText(/accedé al portal de gestores aquí/i)).toBeVisible();

    // Iniciar sesión con cuenta de buscador
    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await page.fill('input[name="email"], input[type="email"]', 'buscador@renda.com.ar');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Debe mostrar feedback de éxito
    await expect(page.getByText(/ingreso exitoso/i)).toBeVisible();

    // Debe redirigir al catálogo de unidades del Marketplace (NO al dashboard de gestor)
    await page.waitForURL(/.*\/es\/unidades/, { timeout: 15000 });
    expect(page.url()).toContain('/es/unidades');
  });

  test('2. Contexto Gestor: UI operativa y redirección al Dashboard', async ({ page }) => {
    await page.goto('/es/auth/login?portal=gestor');
    await page.waitForLoadState('domcontentloaded');

    // Comprobar título y bajada contextual de Gestor
    await expect(page.getByText(/rendo gestor :: acceso operativo/i)).toBeVisible();
    await expect(page.getByText(/ingresá a tu terminal para administrar unidades/i)).toBeVisible();
    await expect(page.getByText(/ingresá como inquilino aquí/i)).toBeVisible();

    // Iniciar sesión como gestor
    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await page.fill('input[name="email"], input[type="email"]', 'gestor@renda.com.ar');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/ingreso exitoso/i)).toBeVisible();

    // Debe redirigir al Dashboard del Gestor
    await page.waitForURL(/.*\/es\/dashboard/, { timeout: 15000 });
    expect(page.url()).toContain('/es/dashboard');
  });

  test('3. Redirección dinámica por parámetro next (volver a la publicación original)', async ({ page }) => {
    // Simular que el usuario estaba en /es/favoritos y fue enviado al login con next
    await page.goto('/es/auth/login?portal=marketplace&next=/es/favoritos');
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await page.fill('input[name="email"], input[type="email"]', 'buscador@renda.com.ar');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Debe volver directamente a la ruta indicada en next (/es/favoritos)
    await page.waitForURL(/.*\/es\/favoritos/, { timeout: 15000 });
    expect(page.url()).toContain('/es/favoritos');
    await expect(page.getByText(/mis favoritos/i).first()).toBeVisible();
  });

  test('4. Navbar del Marketplace: Estado anónimo y Dropdown de perfil autenticado', async ({ page }) => {
    // A. Anónimo en la home del marketplace
    await page.goto('/es');
    await page.waitForLoadState('domcontentloaded');

    // Debe mostrar los enlaces de Iniciar Sesión y Panel Gestor
    const loginLink = page.locator('header a').filter({ hasText: /iniciar sesión|sign in|entrar/i }).first();
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', /.*portal=marketplace/);

    const gestorLink = page.locator('header a').filter({ hasText: /panel gestor|dashboard/i }).first();
    await expect(gestorLink).toBeVisible();
    await expect(gestorLink).toHaveAttribute('href', /.*portal=gestor.*next=.*dashboard/);

    // B. Autenticarse como Gestor
    await gestorLink.click();
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }
    await page.fill('input[name="email"], input[type="email"]', 'gestor@renda.com.ar');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/es\/dashboard/, { timeout: 15000 });

    // C. En el Sidebar del Gestor, hacer clic en Marketplace para volver al catálogo
    const marketplaceReturnBtn = page.getByRole('link', { name: /marketplace/i }).first();
    await expect(marketplaceReturnBtn).toBeVisible();
    await marketplaceReturnBtn.click();
    await page.waitForURL(/.*\/es\/?$/, { timeout: 15000 });

    // D. En el Marketplace como usuario logueado: Debe verse el Avatar Dropdown
    const profileBtn = page.locator('header button[aria-label="Menú de perfil"]').first();
    await expect(profileBtn).toBeVisible();

    // Abrir menú de perfil
    await profileBtn.click();

    // Debe contener Mis Favoritos y el botón para volver a su panel de gestor
    await expect(page.locator('header').getByText(/mis favoritos/i)).toBeVisible();
    const goToDashboard = page.locator('header a').filter({ hasText: /ir a mi panel de gestor/i }).first();
    await expect(goToDashboard).toBeVisible();

    // Navegar de regreso al Dashboard desde el dropdown
    await goToDashboard.click();
    await page.waitForURL(/.*\/es\/dashboard/, { timeout: 15000 });
    expect(page.url()).toContain('/es/dashboard');
  });
});
