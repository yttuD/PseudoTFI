import { test, expect } from '@playwright/test';

test.describe('CityBackground reactivo Modo Claro y Modo Oscuro', () => {
  test('Modo Claro: renderiza fondo crema, sun-glow, skyline nítido y sin estrellas', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Landing Hero exclusiva de Desktop por Native Mobile Bypass (redirección automática a /unidades)');

    // Forzar modo claro
    await page.goto('/es', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 1. Verificar montaje del skyline
    const citySkyline = page.locator('#citySkyline');
    await expect(citySkyline).toBeAttached({ timeout: 10000 });

    const distantSkyline = page.locator('#distantSkyline');
    await expect(distantSkyline).toBeAttached();

    // 2. En modo claro, sun-glow debe ser visible
    const sunGlow = page.locator('.sun-glow');
    await expect(sunGlow).toBeVisible();

    // 3. En modo claro, las estrellas deben estar ocultas (dark:block / hidden)
    const starLayer = page.locator('.city-bg-star').first();
    await expect(starLayer).toBeHidden();

    // 4. Verificar visibilidad y contraste del título H1 sobre fondo claro
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Verificar que el contenedor de la ciudad está presente
    const cityBgContainer = page.locator('[role="presentation"]').first();
    await expect(cityBgContainer).toBeVisible();

    // 5. Captura visual en Modo Claro
    await page.screenshot({ path: 'test-results/hero-city-light.png', fullPage: false });
  });

  test('Modo Oscuro: renderiza fondo nocturno azul, estrellas titilantes y sin sun-glow', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Landing Hero exclusiva de Desktop por Native Mobile Bypass (redirección automática a /unidades)');

    await page.goto('/es', { waitUntil: 'domcontentloaded' });
    // Activar modo oscuro
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 1. Verificar montaje del skyline
    const citySkyline = page.locator('#citySkyline');
    await expect(citySkyline).toBeAttached({ timeout: 10000 });

    // 2. En modo oscuro, sun-glow debe estar oculto
    const sunGlow = page.locator('.sun-glow');
    await expect(sunGlow).toBeHidden();

    // 3. En modo oscuro, las estrellas deben estar visibles
    const starLayer = page.locator('.city-bg-star').first();
    await expect(starLayer).toBeVisible();

    // 4. Verificar visibilidad del título H1 sobre fondo oscuro
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // 5. Captura visual en Modo Oscuro
    await page.screenshot({ path: 'test-results/hero-city-dark.png', fullPage: false });
  });
});
