import { test, expect } from '@playwright/test';

interface ViewportConfig {
  name: string;
  category: 'phone' | 'tablet_portrait' | 'tablet_landscape' | 'desktop';
  width: number;
  height: number;
  deviceLabel: string;
}

const VIEWPORT_MATRIX: ViewportConfig[] = [
  // 1. Teléfonos Móviles (Smartphones)
  { name: 'phone_compact', category: 'phone', width: 375, height: 667, deviceLabel: 'iPhone SE / Compact Android (375x667)' },
  { name: 'phone_standard_ios', category: 'phone', width: 390, height: 844, deviceLabel: 'iPhone 14/15 (390x844)' },
  { name: 'phone_standard_android', category: 'phone', width: 393, height: 851, deviceLabel: 'Pixel 7 / Galaxy S (393x851)' },
  { name: 'phone_large_pro_max', category: 'phone', width: 412, height: 915, deviceLabel: 'Galaxy S23 Ultra / Pixel 8 Pro (412x915)' },

  // 2. Tablets
  { name: 'tablet_portrait', category: 'tablet_portrait', width: 768, height: 1024, deviceLabel: 'iPad Mini / iPad 10.2" Portrait (768x1024)' },
  { name: 'tablet_landscape_standard', category: 'tablet_landscape', width: 1024, height: 768, deviceLabel: 'iPad Landscape / Galaxy Tab (1024x768)' },
  { name: 'tablet_landscape_pro', category: 'tablet_landscape', width: 1180, height: 820, deviceLabel: 'iPad Air / Pro Landscape (1180x820)' },

  // 3. Computadoras / Desktop
  { name: 'desktop_laptop_hd', category: 'desktop', width: 1366, height: 768, deviceLabel: 'Laptop Compacta HD (1366x768)' },
  { name: 'desktop_workstation', category: 'desktop', width: 1440, height: 900, deviceLabel: 'Monitor de Trabajo WXGA+ (1440x900)' },
  { name: 'desktop_full_hd', category: 'desktop', width: 1920, height: 1080, deviceLabel: 'Monitor Full HD (1920x1080)' },
];

test.describe('MATRIZ DE AUDITORÍA MULTI-DISPOSITIVO (RESPONSIVE & NATIVE UX)', () => {
  test.setTimeout(90000);

  for (const vp of VIEWPORT_MATRIX) {
    test(`[${vp.category.toUpperCase()}] ${vp.deviceLabel}: Layout, Cero Desbordamiento y Adaptación Ergonómica`, async ({ page }) => {
      // 1. Configurar Viewport exacto
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 2. Probar comportamiento según categoría
      if (vp.category === 'phone') {
        // En Smartphones: La landing /es debe aplicar Native Bypass al catálogo de unidades
        await page.goto('/es');
        await page.waitForLoadState('domcontentloaded');

        // Verificar redirección automática a catálogo
        await expect(page).toHaveURL(/\/unidades/);

        // Sin desbordamiento horizontal en el catálogo
        const hasOverflowCatalog = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasOverflowCatalog).toBe(false);

        // Shell Nativo Móvil Activo
        const nativeHeader = page.locator('header').filter({ hasText: /Goya/i });
        await expect(nativeHeader).toBeVisible();

        const nativeBottomNav = page.locator('nav[aria-label="Navegación Móvil Principal"]');
        await expect(nativeBottomNav).toBeVisible();

        // Navbar y Footer institucionales Desktop deben estar ocultos
        const desktopNavbar = page.locator('.hidden.md\\:block nav, nav:has-text("Portal Gestor")').first();
        await expect(desktopNavbar).toBeHidden();

        const desktopFooter = page.locator('.hidden.md\\:block footer').first();
        await expect(desktopFooter).toBeHidden();

      } else if (vp.category === 'tablet_portrait') {
        // En Tablet Portrait (768px):
        await page.goto('/es/unidades');
        await page.waitForLoadState('domcontentloaded');

        // Cero desbordamiento horizontal
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasOverflow).toBe(false);

        // En 768px md:block activa el Navbar institucional
        const desktopNavbar = page.locator('.hidden.md\\:block').first();
        await expect(desktopNavbar).toBeVisible();

        // La barra inferior móvil se oculta en tablet
        const nativeBottomNav = page.locator('nav[aria-label="Navegación Móvil Principal"]');
        await expect(nativeBottomNav).toBeHidden();

        // Feed de unidades visible
        const catalogHeading = page.locator('h1').filter({ hasText: /Catálogo de Unidades/i });
        await expect(catalogHeading).toBeVisible();

      } else if (vp.category === 'tablet_landscape') {
        // En Tablet Landscape (>= 1024px):
        await page.goto('/es/unidades');
        await page.waitForLoadState('domcontentloaded');

        // Cero desbordamiento horizontal
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasOverflow).toBe(false);

        // Sidebar lateral de filtros y catálogo se despliegan en paralelo sin colapsos
        const filtrosSidebar = page.locator('text=Filtros del Catálogo').first();
        await expect(filtrosSidebar).toBeVisible();

        const catalogTitle = page.locator('h1').filter({ hasText: /Catálogo/i });
        await expect(catalogTitle).toBeVisible();

      } else if (vp.category === 'desktop') {
        // En Desktop / Computadoras:
        // 1. Landing comercial completa visible
        await page.goto('/es');
        await page.waitForLoadState('domcontentloaded');

        // Cero desbordamiento horizontal en Landing
        const hasOverflowLanding = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasOverflowLanding).toBe(false);

        // SearchWizard interactivo visible en la Landing
        const wizard = page.locator('[data-testid="search-wizard"]');
        await expect(wizard).toBeVisible();

        // Footer institucional desplegado
        const footer = page.locator('footer').filter({ hasText: /Rendo|RENDA/i });
        await expect(footer).toBeVisible();

        // 2. Vista de Catálogo en Desktop
        await page.goto('/es/unidades');
        await page.waitForLoadState('domcontentloaded');

        const hasOverflowCatalog = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasOverflowCatalog).toBe(false);

        // 3. Vista de Dashboard del Gestor en Desktop (con Sidebar denso y Bento Grid)
        await page.context().addCookies([
          {
            name: 'sb-localhost-auth-token',
            value: 'base64-' + Buffer.from(JSON.stringify({
              access_token: 'dev-token-gestor-test',
              user: { id: 'usr-gestor-demo-001', email: 'gestor@renda.com.ar', user_metadata: { rol: 'gestor' } },
            })).toString('base64'),
            domain: 'localhost',
            path: '/',
          },
        ]);

        await page.goto('/es/dashboard');
        await page.waitForLoadState('domcontentloaded');

        // Sidebar expandible del Gestor presente
        const sidebar = page.locator('aside').filter({ hasText: /Dashboard|Unidades|Alquileres/i });
        await expect(sidebar).toBeVisible();

        // Cero desbordamiento en Dashboard
        const hasOverflowDashboard = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(hasOverflowDashboard).toBe(false);
      }
    });
  }
});
