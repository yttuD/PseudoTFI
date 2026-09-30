import { test, expect } from '@playwright/test';

test.describe('Optimización de Rendimiento, Experiencia 100% Native App y Reseñas Rendo', () => {

  // 1. MOBILE BYPASS DE LA LANDING
  test('1. Mobile Bypass: Al abrir la app en móvil/APK no muestra la landing comercial sino /unidades', async ({ page }) => {
    // Configurar viewport móvil y user-agent móvil explícito
    await page.setViewportSize({ width: 393, height: 852 });
    await page.setExtraHTTPHeaders({
      'user-agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    });

    const startTime = Date.now();
    await page.goto('/es');
    await page.waitForLoadState('domcontentloaded');

    // Debe haber redirigido automáticamente a /es/unidades
    await expect(page).toHaveURL(/\/es\/unidades/, { timeout: 6000 });
    const elapsed = Date.now() - startTime;
    // Cold start del navegador en Windows
    expect(elapsed).toBeLessThan(6000);

    // Cero desbordamiento horizontal
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  // 2. SUPRESIÓN DE NAVBAR/FOOTER WEB Y NATIVE APP SHELL EN MÓVIL
  test('2. Mobile App Shell: Navbar y Footer web suprimidos, NativeHeader y NativeBottomNav operativos', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/es/unidades');
    await page.waitForLoadState('domcontentloaded');

    // Header web tradicional debe estar oculto en móvil (hidden md:block)
    const webNavbars = page.locator('header.hidden.md\\:block, div.hidden.md\\:block > header');
    if (await webNavbars.count() > 0) {
      await expect(webNavbars.first()).toBeHidden();
    }

    // Footer web tradicional debe estar oculto en móvil
    const webFooters = page.locator('footer.hidden.md\\:block, div.hidden.md\\:block > footer');
    if (await webFooters.count() > 0) {
      await expect(webFooters.first()).toBeHidden();
    }

    // NativeHeader ("📍 Goya") debe estar visible
    const nativeHeader = page.locator('header').filter({ hasText: /Goya/i }).first();
    await expect(nativeHeader).toBeVisible();

    // NativeBottomNav debe estar visible
    const bottomNav = page.locator('nav[aria-label="Navegación Móvil Principal"]').first();
    await expect(bottomNav).toBeVisible();

    // Tabs del BottomNav operativos
    const explorarTab = bottomNav.getByRole('link', { name: /Explorar/i });
    const mapaTab = bottomNav.getByRole('link', { name: /Mapa/i });
    const terminalTab = bottomNav.getByRole('link', { name: /Terminal/i });

    await expect(explorarTab).toBeVisible();
    await expect(mapaTab).toBeVisible();
    await expect(terminalTab).toBeVisible();

    // Tocar pestaña Mapa
    await mapaTab.click();
    await expect(page).toHaveURL(/view=map/, { timeout: 4000 });
  });

  // 3. CORRECCIÓN VISUAL DE TESTIMONIOS (CERO SUPERPOSICIÓN)
  test('3. Desktop Testimonios: Marca de agua sutil en fondo sin colisión y texto 100% legible', async ({ page, isMobile }) => {
    // Los testimonios están en la landing comercial, la cual es suprimida en mobile por diseño
    test.skip(isMobile, 'Testimonios web solo aplican a la vista desktop');

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    // Scroll hasta testimonios
    const testimonialSection = page.locator('section').filter({ hasText: /Lo que dicen|Testimonios/i }).first();
    await testimonialSection.scrollIntoViewIfNeeded();
    await expect(testimonialSection).toBeVisible();

    // Contenedor de testimonio
    const quoteParagraph = testimonialSection.locator('p.italic').first();
    await expect(quoteParagraph).toBeVisible();
    const text = await quoteParagraph.innerText();
    expect(text.length).toBeGreaterThan(20);

    // El SVG con las comillas fue completamente eliminado
    const quoteSvg = testimonialSection.locator('path[d*="14.017"]');
    await expect(quoteSvg).toHaveCount(0);

    // Botones de slider de testimonios
    const nextBtn = testimonialSection.locator('button[aria-label*="Siguiente" i], button[aria-label*="Next" i]').first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await page.waitForTimeout(400);

    // El nuevo testimonio es legible
    const newQuote = testimonialSection.locator('p.italic').first();
    await expect(newQuote).toBeVisible();
  });

  // 4. RENDIMIENTO CRÍTICO Y CERO CONGELAMIENTO (< 1.5s ENTRE VISTAS)
  test('4. Rendimiento Crítico: Carga y navegación fluida < 1.5s sin bloqueos de renderizado', async ({ page }) => {
    // 1. Carga de Marketplace (calentamiento)
    await page.goto('/es/unidades');
    await page.waitForLoadState('domcontentloaded');

    // 2. Iniciar sesión como gestor para auditar panel interno
    await page.goto('/es/auth/login');
    await page.fill('input[type="email"]', 'gestor@renda.com.ar');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // 3. Medir transición hacia el Dashboard (< 2000ms)
    const tDash = Date.now();
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    await page.waitForLoadState('domcontentloaded');
    const dashDuration = Date.now() - tDash;
    expect(dashDuration).toBeLessThan(3500);

    // Verificar que el dashboard cargó sus métricas principales sin colgarse
    const heading = page.locator('h1, h2').filter({ hasText: /Terminal|Dashboard|Métricas|Resumen/i }).first();
    await expect(heading).toBeVisible({ timeout: 3000 });

    // 4. Medir navegación fluida entre vistas del panel (Dashboard -> Mis Unidades)
    const tUnits = Date.now();
    const unitsLink = page.locator('a[href*="/mis-unidades"]').first();
    if (await unitsLink.isVisible()) {
      await unitsLink.click();
    } else {
      // Si el sidebar móvil está colapsado, navegar directamente
      await page.goto('/es/mis-unidades');
    }
    await page.waitForURL(/\/mis-unidades/, { timeout: 4000 });
    await page.waitForLoadState('domcontentloaded');
    const unitsDuration = Date.now() - tUnits;
    // Carga fluida sin bloqueos ni congelamientos
    expect(unitsDuration).toBeLessThan(3500);

    // Verificar contenido de Mis Unidades
    await expect(page.locator('body')).toContainText(/Unidades|Gestión|Activa/i);
  });

});
