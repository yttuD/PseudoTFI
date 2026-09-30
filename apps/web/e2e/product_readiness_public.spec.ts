import { test, expect, Page, BrowserContext, Locator } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';
import { setTestSessionForActor } from './fixtures/actors';
import {
  setThemeAndWait,
  waitForSettledState,
  captureReadinessScreenshot,
  checkHorizontalOverflow,
  checkTouchTargets,
  checkElementContrast,
  checkComprehensiveContrast,
  checkVisibleFocus,
  settleFullPageMedia,
  assertUnitCardImagesLoaded,
} from './fixtures/product-readiness';

const ACCEPTED_SCREENSHOTS_DIR = process.env.PUBLIC_SCREENSHOTS_DIR
  ? path.resolve(process.env.PUBLIC_SCREENSHOTS_DIR)
  : path.resolve(
      __dirname,
      '../../../specs/005-web-product-readiness/evidence/screenshots/public/accepted'
    );

if (!fs.existsSync(ACCEPTED_SCREENSHOTS_DIR)) {
  fs.mkdirSync(ACCEPTED_SCREENSHOTS_DIR, { recursive: true });
}

test.beforeAll(async () => {
  await startMockApiServer();
});

test.afterAll(async () => {
  await stopMockApiServer();
});

test.beforeEach(async ({ page }) => {
  const dummySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#2563eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#ffffff">Rendo Mock Media</text></svg>`;

  await page.route('**/_next/image*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: dummySvg,
    });
  });

  await page.route('**images.unsplash.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: dummySvg,
    });
  });
});

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const THEMES = ['light', 'dark'] as const;

test.describe('Antigravity Batch 02A — Public Baseline Audit (T017–T020)', () => {

  // --------------------------------------------------------------------------
  // T017: Public Route, Boundary, Privacy, Failure, and Empty State Coverage
  // --------------------------------------------------------------------------
  test.describe('T017: Public Route, Boundary, Privacy, Failure & Empty States', () => {

    test('TC-PUB-001: Anonymous default browsing on Home/Marketplace (SURF-001, FORM-009, CTRL-003, CTRL-004)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      // On desktop, /es renders Home without redirect
      const response = await page.goto('/es', { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);

      // Verify branding / title / navigation
      await expect(page).toHaveTitle(/Rendo|Marketplace|Alquiler/i);

      // Language selector (CTRL-003) and Theme switcher (CTRL-004) presence
      const langTrigger = page.locator('[data-testid="language-selector"], button:has-text("ES"), button:has-text("Español")').first();
      await expect.soft(langTrigger).toBeVisible();

      // Quick search input or SearchWizard (FORM-009)
      const searchInputs = page.locator('input[type="text"], input[type="search"]');
      await expect.soft(searchInputs.first()).toBeVisible();

      // Verify no direct Gestor operational dashboard or Dev console links leaked to anonymous
      await expect.soft(page.locator('a[href*="/dashboard"]:not([href*="/auth/"])')).toHaveCount(0);
      await expect.soft(page.locator('a[href*="/dev/"]')).toHaveCount(0);

      // Mobile web browsing (375w): must remain on /es (Home) and not redirect to /unidades
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/es', { waitUntil: 'domcontentloaded' });
      const mobilePathname = new URL(page.url()).pathname.replace(/\/$/, '');
      expect.soft(mobilePathname, 'Mobile web visitor on /es must not be redirected').toBe('/es');
      await expect.soft(page.locator('h1').first()).toBeVisible();
    });

    test('TC-PUB-002: Catálogo de Unidades browsing & filtering (SURF-002, FORM-015)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      const response = await page.goto('/es/unidades', { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);

      // Expect unit cards to render from mock API
      const unitCard = page.locator('a[href*="/unidades/a0000000-0000-0000-0000-000000000001"]').first();
      await expect.soft(unitCard).toBeVisible({ timeout: 5000 });

      // Verify filter inputs (FORM-015)
      const searchFilter = page.locator('input[placeholder*="Buscar"], input[name="q"]').first();
      await expect.soft(searchFilter).toBeVisible();

      // Category selector or pills
      const categorySelect = page.locator('select, [role="combobox"]').first();
      await expect.soft(categorySelect).toBeVisible();
    });

    test('TC-PUB-003: Catálogo empty results state (SURF-002 empty)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto('/es/unidades?q=no-results', { waitUntil: 'domcontentloaded' });
      // Should show empty message, not crash or freeze
      const bodyText = await page.textContent('body');
      expect.soft(bodyText).toMatch(/no se encontraron|sin resultados|no hay unidades|0 unidades/i);
    });

    test('TC-PUB-004: Catálogo API failure resilience (SURF-002 error)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      const response = await page.goto('/es/unidades?simulate-error=1', { waitUntil: 'domcontentloaded' });
      // Next.js SSR should catch or render gracefully without unhandled raw stack trace
      const content = await page.content();
      expect.soft(content).not.toContain('ECONNREFUSED');
      expect.soft(content).not.toContain('node:internal');
    });

    test('TC-PUB-005: Detalle de Unidad anonymous privacy boundary & WhatsApp contact (SURF-003, CTRL-002)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      const res = await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001', { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBe(200);

      // Title & description visible
      await expect.soft(page.locator('h1, [data-testid="unit-title"]').first()).toContainText(/Departamento 2 Ambientes/i);

      // WhatsApp contact button (CTRL-002)
      const waLink = page.locator('a[href*="wa.me"]').first();
      await expect.soft(waLink).toBeVisible({ timeout: 2000 });
      if (await waLink.isVisible()) {
        const href = await waLink.getAttribute('href');
        expect.soft(href).toContain('5493777123456');
      }

      // Privacy assertion: Exact location pin must NOT be exposed to anonymous user
      // There must be a login prompt/banner over exact map or indicator
      const loginOverlay = page.locator('a[href*="/auth/login"]').filter({ hasText: /inici.*sesi/i }).first();
      await expect.soft(loginOverlay).toBeVisible();
    });

    test('TC-PUB-006: Detalle de Unidad 404 / not found handling', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      const res = await page.goto('/es/unidades/not-found-unit-999', { waitUntil: 'domcontentloaded' });
      const content = await page.content();
      const isNotFound = res?.status() === 404 || content.includes('404') || content.includes('no encontrada') || content.includes('No se pudo encontrar');
      expect.soft(isNotFound).toBe(true);
    });

    test('TC-PUB-007: Public legal surfaces (SURF-005 Términos, SURF-006 Privacidad)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      // Términos
      const resTerminos = await page.goto('/es/terminos', { waitUntil: 'domcontentloaded' });
      expect.soft(resTerminos?.status()).toBe(200);
      await expect.soft(page.locator('h1, h2').first()).toContainText(/términos|condiciones/i);

      // Privacidad
      const resPrivacidad = await page.goto('/es/privacidad', { waitUntil: 'domcontentloaded' });
      expect.soft(resPrivacidad?.status()).toBe(200);
      await expect.soft(page.locator('h1, h2').first()).toContainText(/privacidad|datos/i);
    });

    test('TC-PUB-008: Auth entry surfaces (SURF-007 Login, SURF-008 Registro)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      // Login page
      const resLogin = await page.goto('/es/auth/login', { waitUntil: 'domcontentloaded' });
      expect.soft(resLogin?.status()).toBe(200);
      await expect.soft(page.locator('input[type="email"], input[name="email"], input[type="tel"]').first()).toBeVisible();

      // Registro page
      const resReg = await page.goto('/es/auth/registro', { waitUntil: 'domcontentloaded' });
      expect.soft(resReg?.status()).toBe(200);
      await expect.soft(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    });

    test('TC-PUB-009: Anonymous direct access to private / operational destinations fails safely', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      // 1. /favoritos must redirect to /auth/login with next param
      await page.goto('/es/favoritos', { waitUntil: 'domcontentloaded' });
      await page.waitForURL(/\/auth\/login/, { timeout: 6000 });
      expect.soft(page.url()).toContain('/auth/login');
      expect.soft(page.url()).toContain('favoritos');

      // 2. /cuenta/invitaciones must redirect or require auth
      await page.goto('/es/cuenta/invitaciones', { waitUntil: 'domcontentloaded' });
      // In InvitationInbox client component: if unauthenticated, shows error or empty or redirects
      const unauthContent = await page.content();
      expect.soft(unauthContent).not.toContain('inv-001');

      // 3. /dashboard must redirect away from operational workspace
      await page.goto('/es/dashboard', { waitUntil: 'domcontentloaded' });
      const currentUrl = page.url();
      const isRedirectedToAuth = currentUrl.includes('/auth/login') || currentUrl.includes('/unidades');
      expect.soft(isRedirectedToAuth).toBe(true);

      // 4. /dev/moderacion must be forbidden / closed
      await page.goto('/es/dev/moderacion', { waitUntil: 'domcontentloaded' });
      const devContent = await page.content();
      const isBlocked = devContent.includes('Acceso restringido') || devContent.includes('403') || devContent.includes('404') || page.url().includes('/auth/login');
      expect.soft(isBlocked).toBe(true);
    });

    test('TC-PUB-010: Anonymous interactive boundaries on Detalle (Favorito & Reporte triggers)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001', { waitUntil: 'networkidle' });

      // Click Favorite button (CTRL-001) as anonymous -> must redirect to login
      const favBtn = page.locator('button:has([class*="lucide-heart"]), button[aria-label*="favorito"]').first();
      if (await favBtn.isVisible()) {
        await favBtn.click();
        await page.waitForURL(/\/auth\/login/, { timeout: 10000 }).catch(() => {});
        expect.soft(page.url()).toContain('/auth/login');
      }

      // Return to detail
      await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001', { waitUntil: 'networkidle' });

      // Click Report button (FORM-008) as anonymous -> must redirect to login
      const reportBtn = page.locator('button:has-text("Reportar"), button:has([class*="lucide-flag"])').first();
      if (await reportBtn.isVisible()) {
        await reportBtn.click();
        await page.waitForURL(/\/auth\/login/, { timeout: 10000 }).catch(() => {});
        expect.soft(page.url()).toContain('/auth/login');
      }
    });

    test('TC-PUB-011: Onboarding Gestor route guard for anonymous and buscador', async ({ page }) => {
      // 1. Anonymous access
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.goto('/es/auth/onboarding-gestor', { waitUntil: 'domcontentloaded' });
      // Should render onboarding prompt or redirect
      const anonContent = await page.content();
      expect.soft(anonContent).toContain('Gestor');

      // 2. Buscador access
      await setTestSessionForActor(page.context(), 'public_user');
      await page.goto('/es/auth/onboarding-gestor', { waitUntil: 'domcontentloaded' });
      const buscadorContent = await page.content();
      expect.soft(buscadorContent).toContain('Gestor');
    });
  });

  // --------------------------------------------------------------------------
  // T019: Authenticated Public User Journeys (Favorites, Report, Invitations)
  // --------------------------------------------------------------------------
  test.describe('T019: Authenticated Public User Journeys (public_user / buscador)', () => {

    test('TC-PUB-012: Authenticated user manages favorites (SURF-004, CTRL-001)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'public_user');
      await page.setViewportSize({ width: 1440, height: 900 });

      // 1. Populated favorites list
      await page.goto('/es/favoritos', { waitUntil: 'domcontentloaded' });
      await expect.soft(page.locator('h1')).toContainText(/Mis Favoritos/i);

      // Verify unit card in favorites
      const card = page.locator('a[href*="/unidades/a0000000-0000-0000-0000-000000000001"]').first();
      await expect.soft(card).toBeVisible({ timeout: 5000 });

      // 2. Empty favorites list
      await page.goto('/es/favoritos?empty=true', { waitUntil: 'domcontentloaded' });
      const emptyText = await page.textContent('body');
      expect.soft(emptyText).toMatch(/no tienes favoritos|aún no agregaste/i);

      // 3. Error state handling
      await page.goto('/es/favoritos?simulate-error=1', { waitUntil: 'domcontentloaded' });
      const content = await page.content();
      expect.soft(content).not.toContain('node:internal');
    });

    test('TC-PUB-013: Authenticated user submits unit report modal with validation (SURF-003, FORM-008)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'public_user');
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001', { waitUntil: 'domcontentloaded' });

      // Click Report button -> should OPEN dialog, NOT redirect to login
      const reportBtn = page.locator('button:has-text("Reportar")').first();
      await expect.soft(reportBtn).toBeVisible();
      await reportBtn.click();

      // Dialog should be visible
      const dialog = page.locator('[role="dialog"], [data-slot="dialog-content"]').first();
      await expect.soft(dialog).toBeVisible({ timeout: 4000 });
      await expect.soft(dialog).toContainText(/Reportar publicación|motivo/i);

      // Verify Select trigger for motivo
      const selectTrigger = dialog.locator('button[role="combobox"], select, [data-slot="select-trigger"]').first();
      await expect.soft(selectTrigger).toBeVisible();

      // Submit button inside dialog
      const submitBtn = dialog.locator('button[type="submit"], button:has-text("Enviar")').first();
      await expect.soft(submitBtn).toBeVisible();
    });

    test('TC-PUB-014: Authenticated user views and responds to invitations (SURF-026, FORM-014)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'public_user');
      await page.setViewportSize({ width: 1440, height: 900 });

      // 1. Populated invitations inbox
      await page.goto('/es/cuenta/invitaciones', { waitUntil: 'domcontentloaded' });
      await expect.soft(page.locator('h1')).toContainText(/Invitaciones de Colaboración/i);

      // Verify invitation item rendered
      const invitationItem = page.locator('[data-testid^="invitation-item-"]').first();
      await expect.soft(invitationItem).toBeVisible({ timeout: 5000 });
      await expect.soft(invitationItem).toContainText(/Gestor Inmobiliario Central/i);

      // Verify Accept and Reject action buttons (FORM-014)
      const acceptBtn = invitationItem.locator('button:has-text("Aceptar")');
      const rejectBtn = invitationItem.locator('button:has-text("Rechazar")');
      await expect.soft(acceptBtn).toBeVisible();
      await expect.soft(rejectBtn).toBeVisible();

      // 2. Empty invitations inbox
      await page.goto('/es/cuenta/invitaciones?empty=true', { waitUntil: 'domcontentloaded' });
      const emptyInbox = page.locator('[data-testid="empty-invitaciones"]');
      await expect.soft(emptyInbox).toBeVisible({ timeout: 5000 });
      await expect.soft(emptyInbox).toContainText(/No tienes invitaciones pendientes/i);
    });

    test('TC-PUB-015: Authenticated public user direct access barriers to operational and dev', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'public_user');
      await page.setViewportSize({ width: 1440, height: 900 });

      // 1. /dashboard attempt: buscador should NOT access Gestor operational dashboard
      await page.goto('/es/dashboard', { waitUntil: 'domcontentloaded' });
      const currentUrl = page.url();
      const content = await page.content();
      const isRestricted = currentUrl.includes('/auth/login') || currentUrl.includes('/auth/onboarding-gestor') || currentUrl.includes('/unidades') || content.includes('Acceso restringido') || content.includes('No autorizado');
      expect.soft(isRestricted).toBe(true);

      // 2. /dev/moderacion attempt: buscador should be blocked with forbidden
      await page.goto('/es/dev/moderacion', { waitUntil: 'domcontentloaded' });
      const devContent = await page.content();
      const isDevBlocked = devContent.includes('Acceso restringido') || devContent.includes('403') || devContent.includes('404') || page.url().includes('/auth/login');
      expect.soft(isDevBlocked).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // T018: Visual & Accessibility Baseline Matrix (All Public Surfaces & Forms)
  // --------------------------------------------------------------------------
  test.describe('T018: Public Visual & Accessibility Baseline Matrix', () => {

    const PUBLIC_SURFACES = [
      { id: 'SURF-001', name: 'Home', path: '/es', actor: 'anonymous' as const },
      { id: 'SURF-002', name: 'Catálogo', path: '/es/unidades', actor: 'anonymous' as const },
      { id: 'SURF-003', name: 'Detalle Unidad', path: '/es/unidades/a0000000-0000-0000-0000-000000000001', actor: 'anonymous' as const },
      { id: 'SURF-004', name: 'Favoritos', path: '/es/favoritos', actor: 'public_user' as const },
      { id: 'SURF-005', name: 'Términos', path: '/es/terminos', actor: 'anonymous' as const },
      { id: 'SURF-006', name: 'Privacidad', path: '/es/privacidad', actor: 'anonymous' as const },
      { id: 'SURF-007', name: 'Login', path: '/es/auth/login', actor: 'anonymous' as const },
      { id: 'SURF-008', name: 'Registro', path: '/es/auth/registro', actor: 'anonymous' as const },
      { id: 'SURF-009', name: 'Onboarding Gestor', path: '/es/auth/onboarding-gestor', actor: 'public_user' as const },
      { id: 'SURF-026', name: 'Bandeja Invitaciones', path: '/es/cuenta/invitaciones', actor: 'public_user' as const },
    ];

    // 1. Default Surface Cells (10 surfaces x 4 viewports x 2 themes = 80 cells)
    for (const surface of PUBLIC_SURFACES) {
      for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
          test(`${surface.id} ${surface.name} @ ${vp.width}w (${theme})`, async ({ page }) => {
            await setTestSessionForActor(page.context(), surface.actor);
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
            await page.addInitScript((t) => {
              try {
                localStorage.setItem('theme', t);
                document.cookie = `theme=${t}; path=/; max-age=31536000`;
              } catch {}
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(t);
              document.documentElement.setAttribute('data-theme', t);
            }, theme);

            await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
            await setThemeAndWait(page, theme, 600);
            await settleFullPageMedia(page);

            if (surface.id === 'SURF-001' || surface.id === 'SURF-002') {
              await assertUnitCardImagesLoaded(page);
            }

            // 1. Capture complete-page baseline screenshot
            await captureReadinessScreenshot(page, ACCEPTED_SCREENSHOTS_DIR, {
              id: surface.id,
              actor: surface.actor,
              state: 'default',
              width: vp.width,
              theme,
            }, { fullPage: true });

            // 2. Horizontal overflow check
            const overflow = await checkHorizontalOverflow(page);
            if (overflow.hasOverflow) {
              console.log(`[OVERFLOW] ${surface.id} @ ${vp.width}w (${theme}):`, overflow.offendingElements);
            }
            expect.soft(overflow.hasOverflow, `${surface.id} overflow at ${vp.width}w ${theme}`).toBe(false);

            // 3. Touch target check on mobile / tablet (<= 768px)
            if (vp.width <= 768) {
              const touch = await checkTouchTargets(page, 44);
              if (touch.tooSmall > 0) {
                console.log(`[TOUCH-TARGET] ${surface.id} @ ${vp.width}w (${theme}): ${touch.tooSmall} elements < 44px`, touch.smallDetails.slice(0, 5));
              }
              expect.soft(touch.tooSmall, `${surface.id} touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
            }

            // 4. Expanded contrast check across headings, body, links, buttons, inputs
            const contrast = await checkComprehensiveContrast(page);
            if (!contrast.pass) {
              console.log(`[CONTRAST-FAILURES] ${surface.id} @ ${vp.width}w (${theme}): ${contrast.failures.length} failures out of ${contrast.totalEvaluated} elements`, contrast.failures.slice(0, 3));
            }
            expect.soft(contrast.pass, `${surface.id} contrast at ${vp.width}w ${theme} (${contrast.failures.length} failures)`).toBe(true);

            // 5. Supervisor-observed specific defect reproductions
            if (surface.id === 'SURF-001') {
              // Ensure ordinary mobile/desktop web remains on requested public route /es without redirect
              const currentPath = new URL(page.url()).pathname.replace(/\/$/, '');
              expect.soft(currentPath, `SURF-001 at ${vp.width}w (${theme}) must remain on requested route /es`).toBe('/es');
              const hasHero = await page.locator('h1').first().isVisible();
              expect.soft(hasHero, `SURF-001 at ${vp.width}w (${theme}) must visibly render Home content`).toBe(true);
            }

            if (vp.width === 768) {
              // Direct viewport-containment assertion for visible header controls at 768 px
              const uncontainedHeaderElements = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('header a, header button, header [role="button"], header input'));
                const uncontained: string[] = [];
                const innerWidth = window.innerWidth;
                for (const el of elements) {
                  const r = el.getBoundingClientRect();
                  if (r.width > 0 && r.height > 0 && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden') {
                    // Allow at most 1 CSS pixel tolerance
                    if (r.left < -1 || r.right > innerWidth + 1) {
                      uncontained.push(`${el.tagName} (${el.textContent?.trim().slice(0, 20)}): left=${r.left.toFixed(1)}, right=${r.right.toFixed(1)}, innerWidth=${innerWidth}`);
                    }
                  }
                }
                return uncontained;
              });
              expect.soft(uncontainedHeaderElements.length, `${surface.id} has uncontained header controls at 768px (${theme}): ${uncontainedHeaderElements.join(', ')}`).toBe(0);

              // Wrapped/cramped desktop navigation at 768 px
              const isNavWrapped = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('header a, header button'));
                const visibleLinks = links.filter((el) => {
                  const r = el.getBoundingClientRect();
                  return r.width > 0 && r.height > 0;
                });
                const topPositions = new Set(visibleLinks.map((el) => Math.round(el.getBoundingClientRect().top)));
                const header = document.querySelector('header');
                const headerHeight = header ? header.getBoundingClientRect().height : 0;
                return topPositions.size > 2 || headerHeight > 68;
              });
              expect.soft(!isNavWrapped, 'SURF-001 has cramped/wrapped desktop navigation at 768px').toBe(true);
            }

            if (surface.id === 'SURF-001' && vp.width === 1440 && theme === 'dark') {
              // Dark-theme CTA / control contrast failures on Home
              const secondaryCtaContrast = await checkElementContrast(page, 'a[href*="/unidades"] span', { minRatio: 4.5 });
              expect.soft(secondaryCtaContrast.pass, `Home secondary CTA dark contrast: ratio ${secondaryCtaContrast.ratio} < 4.5`).toBe(true);

              const searchBtnContrast = await checkElementContrast(page, 'form button[type="submit"]', { minRatio: 4.5 });
              expect.soft(searchBtnContrast.pass, `Home quick search button dark contrast: ratio ${searchBtnContrast.ratio} < 4.5`).toBe(true);
            }

            if (surface.id === 'SURF-003' && vp.width === 768) {
              // Unbalanced half-image/half-empty hero region on unit detail at 768 px
              const hasEmptyHeroSplit = await page.evaluate(() => {
                const heroRight = document.querySelector('.hidden.md\\:grid');
                if (!heroRight) return false;
                const placeholders = heroRight.querySelectorAll('.bg-muted\\/50, [class*="bg-muted"]');
                return placeholders.length > 0;
              });
              expect.soft(!hasEmptyHeroSplit, 'SURF-003 hero at 768px has unbalanced half-image/half-empty split').toBe(true);
            }

            if (surface.id === 'SURF-003' && vp.width === 375) {
              // Clipped/illegible detail tabs on 375 px
              const tabsContained = await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
                if (tabs.length === 0) return true;
                const vpWidth = window.innerWidth;
                return tabs.every((t) => {
                  const r = t.getBoundingClientRect();
                  return r.right <= vpWidth && r.left >= 0;
                });
              });
              expect.soft(tabsContained, 'SURF-003 detail tabs at 375px are clipped/overflow viewport').toBe(true);
            }
          });
        }
      }
    }

    // 2. Interacted Form Cells (6 forms x 4 viewports x 2 themes = 48 cells)

    // FORM-008: Report Modal Open
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`FORM-008 Report Modal @ ${vp.width}w (${theme})`, async ({ page }) => {
          await setTestSessionForActor(page.context(), 'public_user');
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.addInitScript((t) => {
            try {
              localStorage.setItem('theme', t);
              document.cookie = `theme=${t}; path=/; max-age=31536000`;
            } catch {}
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(t);
            document.documentElement.setAttribute('data-theme', t);
          }, theme);

          await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001', { waitUntil: 'domcontentloaded' });
          await setThemeAndWait(page, theme, 600);
          await settleFullPageMedia(page);

          // Real action: click Reportar with retry resilience
          const reportBtn = page.locator('button:has-text("Reportar")').first();
          await expect(reportBtn).toBeVisible({ timeout: 5000 });
          await reportBtn.scrollIntoViewIfNeeded().catch(() => {});
          await reportBtn.click({ force: true });

          // Hard assertion: report dialog is visible and contains expected fields/actions
          const dialog = page.locator('[role="dialog"], [data-slot="dialog-content"]').first();
          if (!await dialog.isVisible()) {
            await page.waitForTimeout(400);
            await reportBtn.click({ force: true }).catch(() => {});
          }
          await expect(dialog).toBeVisible({ timeout: 5000 });
          await expect(dialog.locator('button[type="submit"], button:has-text("Enviar")').first()).toBeVisible({ timeout: 3000 });

          // Settle and capture fullPage screenshot
          await waitForSettledState(page, 500);
          await captureReadinessScreenshot(page, ACCEPTED_SCREENSHOTS_DIR, {
            id: 'FORM-008',
            actor: 'public_user',
            state: 'report-modal-open',
            width: vp.width,
            theme,
          }, { fullPage: true });

          // Soft assertions
          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-008 overflow at ${vp.width}w ${theme}`).toBe(false);

          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            expect.soft(touch.tooSmall, `FORM-008 touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
          }

          const contrast = await checkComprehensiveContrast(page);
          expect.soft(contrast.pass, `FORM-008 contrast at ${vp.width}w ${theme}`).toBe(true);
        });
      }
    }

    // FORM-009: Search Wizard Active
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`FORM-009 Search Wizard Active @ ${vp.width}w (${theme})`, async ({ page }) => {
          await setTestSessionForActor(page.context(), 'anonymous');
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.addInitScript((t) => {
            try {
              localStorage.setItem('theme', t);
              document.cookie = `theme=${t}; path=/; max-age=31536000`;
            } catch {}
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(t);
            document.documentElement.setAttribute('data-theme', t);
          }, theme);

          await page.goto('/es', { waitUntil: 'domcontentloaded' });
          await setThemeAndWait(page, theme, 600);
          await settleFullPageMedia(page);

          // Explicit responsive branch:
          // When [data-testid="search-wizard"] is visible, use that component and its real input/combobox;
          // Otherwise, require the responsive catalog fallback. Resolve enclosing filter card from "Filtros del Catálogo" heading.
          const wizardContainer = page.locator('[data-testid="search-wizard"]').first();
          let searchInput: Locator;
          let categoryTrigger: Locator;

          if (await wizardContainer.isVisible()) {
            searchInput = wizardContainer.locator('input[placeholder*="Buscar por zona"], input[type="text"]').first();
            await expect(searchInput).toBeVisible({ timeout: 5000 });
            await searchInput.click();
            await searchInput.fill('Centro');

            categoryTrigger = wizardContainer.locator('button[role="combobox"]').first();
            await expect(categoryTrigger).toBeVisible({ timeout: 5000 });
            await categoryTrigger.scrollIntoViewIfNeeded().catch(() => {});
            await categoryTrigger.click({ force: true });

            const optionDept = page.locator('[role="option"]:has-text("Departamento")').first();
            await expect(optionDept).toBeVisible({ timeout: 5000 });
            await optionDept.click({ force: true });
          } else {
            // Responsive catalog fallback
            const heading = page.locator('h3:has-text("Filtros del Catálogo")').first();
            await expect(heading).toBeVisible({ timeout: 5000 });
            // Nearest stable card ancestor enclosing heading, input and combobox
            const filterCard = heading.locator('xpath=ancestor::div[contains(@class, "bg-card") or contains(@class, "rounded-2xl")][1]');
            await expect(filterCard).toBeVisible({ timeout: 5000 });

            searchInput = filterCard.locator('input[placeholder*="Palermo"], input[placeholder*="Buscar"], input[type="text"]').first();
            await expect(searchInput).toBeVisible({ timeout: 5000 });
            await searchInput.click();
            await searchInput.fill('Centro');

            categoryTrigger = filterCard.locator('button[role="combobox"]').first();
            await expect(categoryTrigger).toBeVisible({ timeout: 5000 });
            await categoryTrigger.scrollIntoViewIfNeeded().catch(() => {});
            await categoryTrigger.click({ force: true });

            const optionDept = page.locator('[role="option"]:has-text("Departamento")').first();
            await expect(optionDept).toBeVisible({ timeout: 5000 });
            await optionDept.click({ force: true });
          }

          // Hard assertions: active inputs visibly retain values in active responsive component
          await expect(searchInput).toBeVisible();
          await expect(searchInput).toHaveValue('Centro');
          await expect(categoryTrigger).toBeVisible();
          await expect(categoryTrigger).toContainText(/departamento/i);

          // Settle and capture fullPage screenshot
          await waitForSettledState(page, 500);
          await captureReadinessScreenshot(page, ACCEPTED_SCREENSHOTS_DIR, {
            id: 'FORM-009',
            actor: 'anonymous',
            state: 'wizard-active',
            width: vp.width,
            theme,
          }, { fullPage: true });

          // Soft assertions
          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-009 overflow at ${vp.width}w ${theme}`).toBe(false);

          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            expect.soft(touch.tooSmall, `FORM-009 touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
          }

          const contrast = await checkComprehensiveContrast(page);
          expect.soft(contrast.pass, `FORM-009 contrast at ${vp.width}w ${theme}`).toBe(true);
        });
      }
    }

    // FORM-010: Registro Validation Error
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`FORM-010 Registro Validation @ ${vp.width}w (${theme})`, async ({ page }) => {
          await setTestSessionForActor(page.context(), 'anonymous');
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.addInitScript((t) => {
            try {
              localStorage.setItem('theme', t);
              document.cookie = `theme=${t}; path=/; max-age=31536000`;
            } catch {}
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(t);
            document.documentElement.setAttribute('data-theme', t);
          }, theme);

          await page.route('**/auth/v1/signup**', (route) =>
            route.fulfill({
              status: 422,
              contentType: 'application/json',
              body: JSON.stringify({ message: 'El correo electrónico ya está registrado.', error_description: 'El correo electrónico ya está registrado.' }),
            })
          );
          await page.goto('/es/auth/registro', { waitUntil: 'domcontentloaded' });
          await setThemeAndWait(page, theme, 600);
          await settleFullPageMedia(page);

          // Ensure Email tab is active if present
          const emailTab = page.locator('button:has-text("Email"), button:has-text("Correo")').first();
          if (await emailTab.isVisible()) {
            await emailTab.click();
            await page.waitForTimeout(200);
          }

          // Fill in email and password then submit
          const emailInput = page.locator('input[type="email"], input[name="email"]').first();
          await emailInput.click();
          await emailInput.fill('existente@test.com');

          const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
          await passwordInput.click();
          await passwordInput.fill('123456');

          const submitBtn = page.locator('button[type="submit"]').first();
          await expect(submitBtn).toBeEnabled({ timeout: 5000 });
          await submitBtn.click();

          // Hard assertion: visible validation feedback is rendered
          const errorFeedback = page.locator('.text-destructive, [role="alert"]').first();
          await expect(errorFeedback).toBeVisible({ timeout: 5000 });
          await expect(errorFeedback).toContainText(/registrado|error/i);

          // Settle and capture fullPage screenshot
          await waitForSettledState(page, 500);
          await captureReadinessScreenshot(page, ACCEPTED_SCREENSHOTS_DIR, {
            id: 'FORM-010',
            actor: 'anonymous',
            state: 'validation-error',
            width: vp.width,
            theme,
          }, { fullPage: true });

          // Soft assertions
          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-010 overflow at ${vp.width}w ${theme}`).toBe(false);

          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            expect.soft(touch.tooSmall, `FORM-010 touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
          }

          const contrast = await checkComprehensiveContrast(page);
          expect.soft(contrast.pass, `FORM-010 contrast at ${vp.width}w ${theme}`).toBe(true);
        });
      }
    }

    // FORM-011: Login Validation Error
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`FORM-011 Login Validation @ ${vp.width}w (${theme})`, async ({ page }) => {
          await setTestSessionForActor(page.context(), 'anonymous');
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.addInitScript((t) => {
            try {
              localStorage.setItem('theme', t);
              document.cookie = `theme=${t}; path=/; max-age=31536000`;
              localStorage.setItem(
                'rendo_local_accounts',
                JSON.stringify([
                  {
                    id: 'test-user-id',
                    email: 'usuario@rendo.com.ar',
                    password: 'CorrectPassword123!',
                    full_name: 'Usuario Prueba',
                    role: 'gestor',
                  },
                ])
              );
            } catch {}
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(t);
            document.documentElement.setAttribute('data-theme', t);
          }, theme);

          await page.goto('/es/auth/login', { waitUntil: 'domcontentloaded' });
          await setThemeAndWait(page, theme, 600);
          await settleFullPageMedia(page);

          // Ensure Email tab is active if present
          const emailTab = page.locator('button:has-text("Email"), button:has-text("Correo")').first();
          if (await emailTab.isVisible()) {
            await emailTab.click();
            await page.waitForTimeout(200);
          }

          // Fill in email with existing account and wrong password, then click submit
          const emailInput = page.locator('input[type="email"], input[name="email"]').first();
          await emailInput.click();
          await emailInput.fill('usuario@rendo.com.ar');

          const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
          await passwordInput.click();
          await passwordInput.fill('WrongPassword!');

          const submitBtn = page.locator('button[type="submit"]').first();
          await expect(submitBtn).toBeEnabled({ timeout: 5000 });
          await submitBtn.click();

          // Hard assertion: visible validation feedback is rendered
          const errorFeedback = page.locator('.text-destructive, [role="alert"]').first();
          await expect(errorFeedback).toBeVisible({ timeout: 5000 });
          await expect(errorFeedback).toContainText(/contraseña incorrecta|error/i);

          // Settle and capture fullPage screenshot
          await waitForSettledState(page, 500);
          await captureReadinessScreenshot(page, ACCEPTED_SCREENSHOTS_DIR, {
            id: 'FORM-011',
            actor: 'anonymous',
            state: 'validation-error',
            width: vp.width,
            theme,
          }, { fullPage: true });

          // Soft assertions
          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-011 overflow at ${vp.width}w ${theme}`).toBe(false);

          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            expect.soft(touch.tooSmall, `FORM-011 touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
          }

          const contrast = await checkComprehensiveContrast(page);
          expect.soft(contrast.pass, `FORM-011 contrast at ${vp.width}w ${theme}`).toBe(true);
        });
      }
    }

    // FORM-014: Invitaciones Inbox Accepting Action
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`FORM-014 Invitaciones Accepting Action @ ${vp.width}w (${theme})`, async ({ page }) => {
          await setTestSessionForActor(page.context(), 'public_user');
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.addInitScript((t) => {
            try {
              localStorage.setItem('theme', t);
              document.cookie = `theme=${t}; path=/; max-age=31536000`;
            } catch {}
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(t);
            document.documentElement.setAttribute('data-theme', t);
          }, theme);

          let resolveAcceptRoute: () => void = () => {};
          const acceptHoldPromise = new Promise<void>((resolve) => {
            resolveAcceptRoute = resolve;
          });

          await page.route('**/api/delegados/invitaciones/*/aceptar', async (route) => {
            await acceptHoldPromise;
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true, message: 'Invitación aceptada' }),
            });
          });

          await page.goto('/es/cuenta/invitaciones', { waitUntil: 'domcontentloaded' });
          await setThemeAndWait(page, theme, 600);
          await settleFullPageMedia(page);

          // Hard assertion: populated invitation item and action buttons are visible
          const invitationItem = page.locator('[data-testid^="invitation-item-"]').first();
          await expect(invitationItem).toBeVisible({ timeout: 5000 });
          const acceptBtn = page.locator('[data-testid="btn-aceptar-invitacion"]').first();
          await expect(acceptBtn).toBeVisible({ timeout: 5000 });

          // Perform real action: click Aceptar
          await acceptBtn.click();

          // Hard assertion: button transitions to "Aceptando..." and disabled
          const acceptingBtn = page.locator('button:has-text("Aceptando...")').first();
          await expect(acceptingBtn).toBeVisible({ timeout: 5000 });
          await expect(acceptingBtn).toBeDisabled();

          // Settle and capture fullPage screenshot
          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(page, ACCEPTED_SCREENSHOTS_DIR, {
            id: 'FORM-014',
            actor: 'public_user',
            state: 'invitation-accepting',
            width: vp.width,
            theme,
          }, { fullPage: true });

          // Release route and cleanup
          resolveAcceptRoute();
          await page.unroute('**/api/delegados/invitaciones/*/aceptar');

          // Soft assertions
          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-014 overflow at ${vp.width}w ${theme}`).toBe(false);

          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            expect.soft(touch.tooSmall, `FORM-014 touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
          }

          const contrast = await checkComprehensiveContrast(page);
          expect.soft(contrast.pass, `FORM-014 contrast at ${vp.width}w ${theme}`).toBe(true);
        });
      }
    }

    // FORM-015: Catálogo Filtros Active
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`FORM-015 Filtros Catálogo Active @ ${vp.width}w (${theme})`, async ({ page }) => {
          await setTestSessionForActor(page.context(), 'anonymous');
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.addInitScript((t) => {
            try {
              localStorage.setItem('theme', t);
              document.cookie = `theme=${t}; path=/; max-age=31536000`;
            } catch {}
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(t);
            document.documentElement.setAttribute('data-theme', t);
          }, theme);

          await page.goto('/es/unidades?categoria=departamento', { waitUntil: 'domcontentloaded' });
          await setThemeAndWait(page, theme, 600);
          await settleFullPageMedia(page);

          // Hard assertion: filter UI and active state are visible
          const filterSidebar = page.locator('text=Filtros del Catálogo').first();
          await expect(filterSidebar).toBeVisible({ timeout: 5000 });
          const activeIndicator = page.locator('text=Filtros Activos:').first();
          await expect(activeIndicator).toBeVisible({ timeout: 5000 });
          const clearBtn = page.locator('button:has-text("Limpiar")').first();
          await expect(clearBtn).toBeVisible({ timeout: 5000 });

          // Settle and capture fullPage screenshot
          await waitForSettledState(page, 500);
          await captureReadinessScreenshot(page, ACCEPTED_SCREENSHOTS_DIR, {
            id: 'FORM-015',
            actor: 'anonymous',
            state: 'filters-active',
            width: vp.width,
            theme,
          }, { fullPage: true });

          // Soft assertions
          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-015 overflow at ${vp.width}w ${theme}`).toBe(false);

          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            expect.soft(touch.tooSmall, `FORM-015 touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
          }

          const contrast = await checkComprehensiveContrast(page);
          expect.soft(contrast.pass, `FORM-015 contrast at ${vp.width}w ${theme}`).toBe(true);
        });
      }
    }

    // Visible keyboard focus via real Tab navigation on representative primary controls
    test('Keyboard Reachability and Visible Focus Indicator (WCAG 2.4.7)', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      // 1. Home / Search input focus
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.goto('/es', { waitUntil: 'domcontentloaded' });
      await setThemeAndWait(page, 'light', 400);

      const homeSearchInput = page.locator('input[type="text"], input[type="search"]').first();
      if (await homeSearchInput.isVisible()) {
        const inputSelector = 'input[type="text"], input[type="search"]';
        const focusResult = await checkVisibleFocus(page, inputSelector, { maxTabs: 30 });
        if (!focusResult.hasVisibleFocus) {
          console.log(`[FOCUS-FAIL] Home search input:`, focusResult.diagnostic);
        }
        expect.soft(focusResult.hasVisibleFocus, `Home search input visible focus`).toBe(true);
      }

      // 2. Login submit button focus
      await page.goto('/es/auth/login', { waitUntil: 'domcontentloaded' });
      await setThemeAndWait(page, 'light', 400);
      const loginFocus = await checkVisibleFocus(page, 'button[type="submit"]', { maxTabs: 30 });
      if (!loginFocus.hasVisibleFocus) {
        console.log(`[FOCUS-FAIL] Login submit button:`, loginFocus.diagnostic);
      }
      expect.soft(loginFocus.hasVisibleFocus, `Login submit button visible focus`).toBe(true);

      // 3. Catálogo filter button / input focus
      await page.goto('/es/unidades', { waitUntil: 'domcontentloaded' });
      await setThemeAndWait(page, 'light', 400);
      const catalogFocus = await checkVisibleFocus(page, 'input[placeholder*="Buscar"], input[name="q"]', { maxTabs: 30 });
      if (!catalogFocus.hasVisibleFocus) {
        console.log(`[FOCUS-FAIL] Catalog search input:`, catalogFocus.diagnostic);
      }
      expect.soft(catalogFocus.hasVisibleFocus, `Catalog search input visible focus`).toBe(true);
    });
  });
});
