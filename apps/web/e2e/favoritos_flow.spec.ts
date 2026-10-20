import { test, expect } from '@playwright/test';

test.describe('Ciclo Completo de Favoritos (Inquilino / Marketplace)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('1. Usuario anónimo al intentar acceder a /favoritos es redirigido a login', async ({ page }) => {
    await page.goto('/es/favoritos');
    await page.waitForURL(/.*\/es\/auth\/login.*next=.*favoritos/, { timeout: 15000 });
    expect(page.url()).toContain('/es/auth/login');
    expect(page.url()).toContain('next');
  });

  test('2. Ciclo completo de agregar, consultar y quitar de Favoritos', async ({ page }) => {
    // A. Iniciar sesión como buscador
    await page.goto('/es/auth/login?portal=marketplace');
    await page.waitForLoadState('domcontentloaded');

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await page.fill('input[name="email"], input[type="email"]', 'buscador@renda.com.ar');
    await page.fill('input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*\/es\/unidades/, { timeout: 15000 });
    expect(page.url()).toContain('/es/unidades');

    // B. En el catálogo de unidades, hacer clic en el botón de favorito de una tarjeta
    const favButton = page.locator('button[aria-label*="favorito"]').first();
    await expect(favButton).toBeVisible();

    // Guardar en favoritos con respuesta optimista
    await favButton.click();

    // C. Navegar a /es/favoritos y verificar que aparezca la tarjeta
    await page.goto('/es/favoritos');
    await page.waitForLoadState('domcontentloaded');

    // Debe mostrar la tarjeta en la grilla de favoritos
    const cardEnFavoritos = page.locator('a[href*="/es/unidades/"]').first();
    await expect(cardEnFavoritos).toBeVisible({ timeout: 10000 });

    // D. Desmarcar el favorito desde la página de favoritos
    const removeFavBtn = page.locator('button[aria-label*="favorito"]').first();
    await expect(removeFavBtn).toBeVisible();
    await removeFavBtn.click();

    // E. Navegar nuevamente a /es/favoritos para confirmar persistencia de la desmarcación
    await page.goto('/es/favoritos');
    await page.waitForLoadState('domcontentloaded');

    // Debe mostrar el Empty State estético
    await expect(page.getByText(/aún no tienes favoritos guardados/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#btn-explorar-unidades')).toBeVisible();
  });
});
