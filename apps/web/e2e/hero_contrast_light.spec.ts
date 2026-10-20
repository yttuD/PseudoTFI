import { test, expect } from '@playwright/test';

test.describe('Auditoría de Contraste en Modo Claro (Azul Navy de Marca)', () => {
  test('Hero, Buscadores y Navbar con alto contraste en modo claro', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Landing Hero exclusiva de Desktop por Native Mobile Bypass');

    await page.goto('/es', { waitUntil: 'domcontentloaded' });
    // Forzar modo claro
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 1. Título H1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect(h1.locator('span').first()).toHaveClass(/text-azul-900/);

    // 2. Eyebrow / Trust badge
    const badge = page.locator('text=Marketplace Inmobiliario Oficial').first();
    await expect(badge).toBeVisible();

    // 3. Párrafo descriptivo
    const desc = page.locator('text=Marketplace inmobiliario y terminal').first();
    await expect(desc).toBeVisible();
    await expect(desc).toHaveClass(/text-azul-900/);

    // 4. Pre-search bar rápida
    const quickInput = page.locator('input[placeholder*="casa, depto"]').first();
    await expect(quickInput).toBeVisible();
    await expect(quickInput).toHaveClass(/text-azul-900/);

    const quickBtn = page.locator('button:has-text("Buscar")').first();
    await expect(quickBtn).toBeVisible();
    await expect(quickBtn).toHaveClass(/bg-azul-900/);
    await expect(quickBtn).toHaveClass(/text-crema/);

    // 5. Botones de acción rápida
    const ctaGestor = page.locator('button:has-text("Publicar mis Unidades")').first();
    await expect(ctaGestor).toBeVisible();
    await expect(ctaGestor).toHaveClass(/text-azul-900/);

    const ctaBuscador = page.locator('a:has-text("Explorar Unidades")').first();
    await expect(ctaBuscador).toBeVisible();
    await expect(ctaBuscador).toHaveClass(/text-azul-900/);

    // 6. SearchWizard
    const searchWizard = page.locator('[data-testid="search-wizard"]');
    await expect(searchWizard).toBeVisible();
    await expect(searchWizard).toHaveClass(/bg-white\/95/);

    const wizardSearchInput = searchWizard.locator('input[placeholder*="zona, título"]');
    await expect(wizardSearchInput).toBeVisible();
    await expect(wizardSearchInput).toHaveClass(/text-azul-900/);

    const wizardBtn = searchWizard.locator('button:has-text("Buscar")');
    await expect(wizardBtn).toBeVisible();
    await expect(wizardBtn).toHaveClass(/bg-azul-900/);
    await expect(wizardBtn).toHaveClass(/text-crema/);

    // 7. Navbar
    const navExplore = page.locator('header a[href*="/unidades"]').first();
    await expect(navExplore).toBeVisible();
    await expect(navExplore).toHaveClass(/hover:text-azul-900/);

    const navDashboard = page.locator('header a[href*="/dashboard"]').first();
    await expect(navDashboard).toBeVisible();
    await expect(navDashboard).toHaveClass(/bg-dorado-500/);
    await expect(navDashboard).toHaveClass(/text-azul-900/);

    // 8. Captura de pantalla de la landing en modo claro
    await page.screenshot({ path: 'test-results/hero-light-contrast-fix.png', fullPage: false });
  });
});
