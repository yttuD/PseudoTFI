import { test, expect, Page, BrowserContext } from '@playwright/test';
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
} from './fixtures/product-readiness';

const GESTOR_SCREENSHOTS_DIR = process.env.GESTOR_SCREENSHOTS_DIR
  ? path.resolve(process.env.GESTOR_SCREENSHOTS_DIR)
  : path.resolve(
      __dirname,
      '../../../specs/005-web-product-readiness/evidence/screenshots/gestor/baseline'
    );

if (!fs.existsSync(GESTOR_SCREENSHOTS_DIR)) {
  fs.mkdirSync(GESTOR_SCREENSHOTS_DIR, { recursive: true });
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

  await page.route('**tile.openstreetmap.org/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: dummySvg,
    });
  });

  await page.route('**nominatim.openstreetmap.org/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ lat: '-29.1445', lon: '-59.2645', display_name: 'Goya, Corrientes, Argentina' }]),
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

// Helper to prepare authenticated page with persisted theme
async function prepareGestorPage(
  page: Page,
  options: {
    actor?: 'gestor' | 'delegado_read' | 'delegado_manage';
    width: number;
    height: number;
    theme: 'light' | 'dark';
    url: string;
  }
) {
  const actor = options.actor || 'gestor';
  await setTestSessionForActor(page.context(), actor);
  await page.setViewportSize({ width: options.width, height: options.height });
  await page.emulateMedia({ colorScheme: options.theme, reducedMotion: 'reduce' });

  await page.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
      document.cookie = `theme=${t}; path=/; max-age=31536000`;
    } catch {}
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
    document.documentElement.setAttribute('data-theme', t);
  }, options.theme);

  const res = await page.goto(options.url, { waitUntil: 'domcontentloaded' });
  await settleFullPageMedia(page);
  await setThemeAndWait(page, options.theme, 800);
  return res;
}

test.describe('Antigravity Batch 03A — Gestor Baseline Audit (T026 & T029)', () => {

  // ==========================================================================
  // T026: Functional, Boundary, Authorization & CRUD Journeys
  // ==========================================================================
  test.describe('T026: Gestor Operational Routes, CRUD and Authorization Journeys', () => {

    test('TC-GES-001: Fail-closed boundaries and unauthorized direct navigation', async ({ page }) => {
      test.setTimeout(60000);
      // 1. Anonymous visitor navigating to /es/dashboard -> must redirect to /es/auth/login
      await setTestSessionForActor(page.context(), 'anonymous');
      await page.goto('/es/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/es\/auth\/login/);

      // 2. Authenticated public user (buscador) navigating to /es/dashboard -> redirected to onboarding
      await setTestSessionForActor(page.context(), 'public_user');
      await page.goto('/es/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/es\/auth\/onboarding-gestor/);

      // 3. Delegado Read navigating to /es/mis-unidades/nueva -> forbidden banner 403
      await setTestSessionForActor(page.context(), 'delegado_read');
      await page.goto('/es/mis-unidades/nueva', { waitUntil: 'domcontentloaded' });
      const denialBanner = page.getByTestId('denial-feedback-banner');
      await expect(denialBanner).toBeVisible();
      await expect(denialBanner).toContainText(/Acceso Denegado|Permisos Insuficientes|403/i);

      // 4. Delegado Read navigating to owner-only billing: /es/facturacion -> forbidden banner
      await page.goto('/es/facturacion', { waitUntil: 'domcontentloaded' });
      const billingForbidden = page.getByTestId('owner-only-forbidden');
      await expect(billingForbidden).toBeVisible();
      await expect(billingForbidden).toContainText(/Acceso Restringido|Gestor titular/i);

      // 5. Delegado Read navigating to owner-only AFIP: /es/facturacion-afip -> forbidden banner
      await page.goto('/es/facturacion-afip', { waitUntil: 'domcontentloaded' });
      const afipForbidden = page.getByTestId('owner-only-forbidden');
      await expect(afipForbidden).toBeVisible();

      // 6. Delegado Read navigating to owner-only Delegados: /es/delegados -> forbidden banner
      await page.goto('/es/delegados', { waitUntil: 'domcontentloaded' });
      const delegadosForbidden = page.getByTestId('owner-only-forbidden');
      await expect(delegadosForbidden).toBeVisible();

      // 7. Delegado Read navigating to owner-only Logs: /es/logs -> forbidden banner
      await page.goto('/es/logs', { waitUntil: 'domcontentloaded' });
      const logsForbidden = page.getByTestId('owner-only-forbidden');
      await expect(logsForbidden).toBeVisible();

      // 8. Gestor sidebar must NOT leak dev console links (/es/dev/*)
      await setTestSessionForActor(page.context(), 'gestor');
      await page.goto('/es/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('a[href*="/dev/"]')).toHaveCount(0);
    });

    test('TC-GES-002: Grupo CRUD journey and Bento Grid interaction (SURF-011, FORM-003, CTRL-005)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/mis-unidades', { waitUntil: 'domcontentloaded' });

      // Bento grid should display managed groups
      const bentoGrid = page.locator('[data-testid="bento-grupos-grid"], .grid').first();
      await expect(bentoGrid).toBeVisible();

      // Trigger Nuevo Grupo modal
      const newGroupBtn = page.locator('button:has-text("Nuevo Grupo"), [data-testid="btn-nuevo-grupo"]').first();
      await expect(newGroupBtn).toBeVisible();
      await newGroupBtn.click();

      // Modal verification
      const groupModal = page.locator('[role="dialog"]').first();
      await expect(groupModal).toBeVisible();
      await expect(groupModal.locator('input[id="nombre"], input[name="nombre"]').first()).toBeVisible();

      // Fill group form
      const nameInput = groupModal.locator('input[id="nombre"], input[name="nombre"]').first();
      await nameInput.fill('Torre Costanera');

      const descInput = groupModal.locator('textarea[id="descripcion"], textarea[name="descripcion"], input[name="descripcion"]').first();
      if (await descInput.isVisible()) {
        await descInput.fill('Complejo residencial premium frente al río');
      }

      // Submit
      const submitBtn = groupModal.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first();
      await submitBtn.click();
      await page.waitForTimeout(400);
    });

    test('TC-GES-003: Unidad CRUD journey with Location Picker Map (SURF-012, SURF-013, FORM-005, FORM-006)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });

      // Navigate to Nueva Unidad
      await page.goto('/es/mis-unidades/nueva', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/es\/mis-unidades\/nueva/);

      // Verify Unidad Form components
      const titleInput = page.locator('input[id="titulo_es"], input[name="titulo_es"]').first();
      await expect(titleInput).toBeVisible();

      // Location Picker Map container (FORM-006)
      const mapContainer = page.locator('.leaflet-container, [data-testid="location-picker-map"]').first();
      await expect(mapContainer).toBeVisible();

      // Modalidades de precio fields
      const priceInput = page.locator('input[id^="precio_"], input[data-testid="input-precio"], input[name*="precio"]').first();
      await expect(priceInput).toBeVisible();

      // Navigate to Editar Unidad
      await page.goto('/es/mis-unidades/a0000000-0000-0000-0000-000000000001/editar', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/es\/mis-unidades\/.*\/editar/);
      const editHeader = page.locator('h1:has-text("Editar Unidad")');
      await expect(editHeader).toBeVisible();
    });

    test('TC-GES-004: Inquilinos CRM journey with In Situ creation (SURF-015, FORM-004)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/inquilinos', { waitUntil: 'domcontentloaded' });

      // Inquilinos table presence
      await expect(page.locator('table, [role="table"]')).toBeVisible();

      // Trigger Inquilino modal
      const newInqBtn = page.locator('button:has-text("Nuevo Inquilino"), [data-testid="btn-nuevo-inquilino"]').first();
      await expect(newInqBtn).toBeVisible();
      await newInqBtn.click();

      // Modal verification
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('input[id="nombre_completo"], input[name="nombre_completo"]').first()).toBeVisible();

      // Check guarantor and consent fields presence
      const docInput = dialog.locator('input[id="documento"], input[name="documento"], input[id="dni"]').first();
      await expect(docInput).toBeVisible();
    });

    test('TC-GES-005: Delegados and Permissions administration (SURF-019, FORM-007, FORM-013)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/delegados', { waitUntil: 'domcontentloaded' });

      // Invitation form modal trigger
      const inviteBtn = page.locator('button:has-text("Invitar"), [data-testid="btn-invitar-delegado"]').first();
      await expect(inviteBtn).toBeVisible();
      await inviteBtn.click();

      // Dialog presence
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
      const emailInput = dialog.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // Verify active delegations list with canonical identity
      await expect(page.getByText('Delegado Sólo Lectura')).toBeVisible();
      await expect(page.getByText('delegado-ver@test.com')).toBeVisible();

      // Permission editor control presence
      const editScopeBtn = page.locator('button:has-text("Editar Permisos"), button:has-text("Permisos")').first();
      await expect(editScopeBtn).toBeVisible();

      // Two-step revoke control presence and interaction
      const revokeBtn = page.locator('button:has-text("Revocar")').first();
      await expect(revokeBtn).toBeVisible();
      await revokeBtn.click();

      const revokeModal = page.locator('[data-testid="FORM-013"]');
      await expect(revokeModal).toBeVisible();
      await expect(revokeModal).toContainText(/Revocar Acceso de Delegado/i);

      const cancelRevokeBtn = revokeModal.locator('button:has-text("Cancelar")').first();
      await cancelRevokeBtn.click();
      await expect(revokeModal).not.toBeVisible();
    });

    test('TC-GES-006: Facturación AFIP fiscal configuration and invoices (SURF-018, FORM-002)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/facturacion-afip', { waitUntil: 'domcontentloaded' });

      // Page heading
      await expect(page.locator('h1, h2').filter({ hasText: /AFIP|Comprobantes/i }).first()).toBeVisible();

      // Comprobantes table or empty state
      await expect(page.locator('table, [role="table"], [data-testid="afip-empty-state"]').first()).toBeVisible();

      // CUIT and fiscal data display
      await expect(page.getByText('20-33445566-7').first()).toBeVisible();
    });

    test('TC-GES-007: Gestor Portfolio Metrics & Analytics (SURF-020)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/metricas', { waitUntil: 'domcontentloaded' });

      // KPI summary cards
      await expect(page.getByText('Vistas Totales')).toBeVisible();
      await expect(page.getByText('Contactos WhatsApp')).toBeVisible();
      await expect(page.getByText('Ocupación Activa')).toBeVisible();

      // Charts container
      const charts = page.locator('[data-testid="metricas-charts"], .recharts-responsive-container').first();
      await expect(charts).toBeVisible();
    });

    test('TC-GES-008: Gestor Activity Audit Trail (SURF-021)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/logs', { waitUntil: 'domcontentloaded' });

      // Page heading
      await expect(page.getByRole('heading', { name: 'Registro de Actividad' })).toBeVisible();

      // Logs entries list
      await expect(page.getByTestId('logs-list')).toBeVisible();

      // Filters presence
      await expect(page.locator('input[placeholder*="Buscar por detalle"]').first()).toBeVisible();
      await expect(page.locator('select').first()).toBeVisible();
    });

    test('TC-GES-009: Plans & Commercial Billing Checkout (SURF-017)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/facturacion', { waitUntil: 'domcontentloaded' });

      // Cupo progress bar and subscription details
      await expect(page.getByText('Estado Actual de Cupo')).toBeVisible();
      await expect(page.getByText('Ampliar o Renovar Cupo de Unidades')).toBeVisible();

      // Checkout payment modal trigger
      const payBtn = page.locator('button:has-text("Continuar al Pago")').first();
      await expect(payBtn).toBeVisible();
      await payBtn.click();

      // Modal verification
      const payModal = page.locator('[data-testid="FORM-002"]');
      await expect(payModal).toBeVisible();
      await expect(payModal).toContainText(/Confirmar y Abonar Cupo/i);
    });

    test('TC-GES-010: Grupos Redirect Destination (SURF-014 -> SURF-011)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.goto('/es/grupos', { waitUntil: 'domcontentloaded' });

      // Must be redirected to /es/mis-unidades
      await expect(page).toHaveURL(/\/es\/mis-unidades/);
    });

    test('TC-GES-DASH: Gestor Dashboard default load has no Next.js error overlay and renders KPI shell (SURF-010)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/dashboard', { waitUntil: 'domcontentloaded' });

      // Explicitly assert absence of Next.js runtime error overlay
      const errorOverlay = page.locator('nextjs-portal, [data-nextjs-dialog-overlay]').or(page.getByText('Cannot read properties of undefined'));
      await expect(errorOverlay, 'FIND-005-035: Gestor Dashboard throws TypeError: Cannot read properties of undefined (reading \'length\')').toHaveCount(0);

      // Assert main heading and KPI shell
      const heading = page.locator('h1, h2').filter({ hasText: /Dashboard|Panel de Control|Resumen/i });
      await expect(heading.first()).toBeVisible();
    });
  });

  // ==========================================================================
  // T029: Complete Visual & Accessibility Baseline (20 Items x 4 Viewports x 2 Themes)
  // Total: 160 Full-Page Deterministic PNG Screenshots
  // ==========================================================================
  test.describe('T029: Visual Matrix Baseline Captures and Audit', () => {

    const SURFACES_CONFIG = [
      { id: 'SURF-010', name: 'Dashboard', path: '/es/dashboard', state: 'default', actor: 'gestor' },
      { id: 'SURF-011', name: 'Mis Unidades', path: '/es/mis-unidades', state: 'default', actor: 'gestor' },
      { id: 'SURF-012', name: 'Nueva Unidad', path: '/es/mis-unidades/nueva', state: 'default', actor: 'gestor' },
      { id: 'SURF-013', name: 'Editar Unidad', path: '/es/mis-unidades/a0000000-0000-0000-0000-000000000001/editar', state: 'default', actor: 'gestor' },
      { id: 'SURF-014', name: 'Grupos Redirect', path: '/es/grupos', state: 'redirected', actor: 'gestor' },
      { id: 'SURF-015', name: 'Inquilinos', path: '/es/inquilinos', state: 'default', actor: 'gestor' },
      { id: 'SURF-016', name: 'Alquileres', path: '/es/alquileres', state: 'default', actor: 'gestor' },
      { id: 'SURF-017', name: 'Facturacion Planes', path: '/es/facturacion', state: 'default', actor: 'gestor' },
      { id: 'SURF-018', name: 'Facturacion AFIP', path: '/es/facturacion-afip', state: 'default', actor: 'gestor' },
      { id: 'SURF-019', name: 'Delegados', path: '/es/delegados', state: 'default', actor: 'gestor' },
      { id: 'SURF-020', name: 'Metricas', path: '/es/metricas', state: 'default', actor: 'gestor' },
      { id: 'SURF-021', name: 'Logs', path: '/es/logs', state: 'default', actor: 'gestor' },
    ] as const;

    // 1. Operational Surfaces Baseline Captures (12 surfaces x 4 viewports x 2 themes = 96 cells)
    for (const surface of SURFACES_CONFIG) {
      for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
          test(`Visual [${surface.id}] ${surface.name} @ ${vp.width}w (${theme})`, async ({ page }) => {
            await prepareGestorPage(page, {
              actor: surface.actor,
              width: vp.width,
              height: vp.height,
              theme,
              url: surface.path,
            });

            await waitForSettledState(page, 500);
            await setThemeAndWait(page, theme, 500);

            // Capture screenshot into baseline directory
            await captureReadinessScreenshot(
              page,
              GESTOR_SCREENSHOTS_DIR,
              {
                id: surface.id,
                actor: surface.actor,
                state: surface.state,
                width: vp.width,
                theme,
              },
              { fullPage: true }
            );

            // Audit checks (soft assertions so audit records all findings)
            const overflow = await checkHorizontalOverflow(page);
            expect.soft(overflow.hasOverflow, `${surface.id} has horizontal overflow at ${vp.width}w ${theme}`).toBe(false);

            if (vp.width <= 768) {
              const touch = await checkTouchTargets(page, 44);
              expect.soft(touch.tooSmall, `${surface.id} touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
            }

            const contrast = await checkComprehensiveContrast(page);
            expect.soft(contrast.pass, `${surface.id} contrast issues at ${vp.width}w ${theme}`).toBe(true);
          });
        }
      }
    }

    // 2. Forms & Interacted Dialog Cells (8 forms x 4 viewports x 2 themes = 64 cells)

    // FORM-001: Modal Formulario Alquiler
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Visual [FORM-001] Modal Alquiler @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: '/es/alquileres',
          });

          const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
          await btn.click({ force: true }).catch(() => {});
          const dialog = page.locator('[role="dialog"]').first();
          await expect.soft(dialog).toBeVisible({ timeout: 5000 });

          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(
            page,
            GESTOR_SCREENSHOTS_DIR,
            {
              id: 'FORM-001',
              actor: 'gestor',
              state: 'modal-open',
              width: vp.width,
              theme,
            },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-001 overflow at ${vp.width}w ${theme}`).toBe(false);
          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            expect.soft(touch.tooSmall, `FORM-001 touch targets at ${vp.width}w ${theme}`).toBe(0);
          }
        });
      }
    }

    // FORM-002: Facturación AFIP Fiscal Config Form
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Visual [FORM-002] Facturacion AFIP Config @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: '/es/facturacion-afip',
          });

          // Expand or focus config card if toggle exists
          const configBtn = page.locator('button:has-text("Configurar"), button:has-text("Editar Datos")').first();
          if (await configBtn.isVisible()) {
            await configBtn.click({ force: true }).catch(() => {});
          }

          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(
            page,
            GESTOR_SCREENSHOTS_DIR,
            {
              id: 'FORM-002',
              actor: 'gestor',
              state: 'config-form',
              width: vp.width,
              theme,
            },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-002 overflow at ${vp.width}w ${theme}`).toBe(false);
        });
      }
    }

    // FORM-003: Modal Grupo de Unidades
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Visual [FORM-003] Modal Grupo @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: '/es/mis-unidades',
          });

          const btn = page.locator('button:has-text("Nuevo Grupo"), [data-testid="btn-nuevo-grupo"]').first();
          await btn.click({ force: true }).catch(() => {});
          const dialog = page.locator('[role="dialog"]').first();
          await expect.soft(dialog).toBeVisible({ timeout: 5000 });

          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(
            page,
            GESTOR_SCREENSHOTS_DIR,
            {
              id: 'FORM-003',
              actor: 'gestor',
              state: 'modal-open',
              width: vp.width,
              theme,
            },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-003 overflow at ${vp.width}w ${theme}`).toBe(false);
        });
      }
    }

    // FORM-004: Modal Inquilino y Garantes
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Visual [FORM-004] Modal Inquilino @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: '/es/inquilinos',
          });

          const btn = page.locator('button:has-text("Nuevo Inquilino"), [data-testid="btn-nuevo-inquilino"]').first();
          await btn.click({ force: true }).catch(() => {});
          const dialog = page.locator('[role="dialog"]').first();
          await expect.soft(dialog).toBeVisible({ timeout: 5000 });

          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(
            page,
            GESTOR_SCREENSHOTS_DIR,
            {
              id: 'FORM-004',
              actor: 'gestor',
              state: 'modal-open',
              width: vp.width,
              theme,
            },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-004 overflow at ${vp.width}w ${theme}`).toBe(false);
        });
      }
    }

    // FORM-005: Formulario de Unidad (Active Form)
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Visual [FORM-005] Formulario Unidad @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: '/es/mis-unidades/nueva',
          });

          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(
            page,
            GESTOR_SCREENSHOTS_DIR,
            {
              id: 'FORM-005',
              actor: 'gestor',
              state: 'active-form',
              width: vp.width,
              theme,
            },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-005 overflow at ${vp.width}w ${theme}`).toBe(false);
        });
      }
    }

    // FORM-006: Selector de Ubicación en Mapa (Interactive Container)
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Visual [FORM-006] Map Picker @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: '/es/mis-unidades/nueva',
          });

          if (vp.width < 768) {
            const mobileBtn = page.locator('button:has-text("ubicación en mapa"), button:has-text("Fijar ubicación")').first();
            await mobileBtn.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
            await mobileBtn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
          }

          // Scroll map into view with bounded timeout
          const map = page.locator('.leaflet-container, [data-testid="location-picker-map"], section#ubicacion').first();
          await map.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});

          await waitForSettledState(page, 400);
          await setThemeAndWait(page, theme, 500);
          await captureReadinessScreenshot(
            page,
            GESTOR_SCREENSHOTS_DIR,
            {
              id: 'FORM-006',
              actor: 'gestor',
              state: 'interactive-map',
              width: vp.width,
              theme,
            },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-006 overflow at ${vp.width}w ${theme}`).toBe(false);
        });
      }
    }

    // FORM-007: Modal Invitar Delegado
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Visual [FORM-007] Modal Invitar Delegado @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: '/es/delegados',
          });

          const btn = page.locator('button:has-text("Invitar"), [data-testid="btn-invitar-delegado"]').first();
          await btn.click({ force: true }).catch(() => {});
          const dialog = page.locator('[role="dialog"]').first();
          await expect.soft(dialog).toBeVisible({ timeout: 5000 });

          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(
            page,
            GESTOR_SCREENSHOTS_DIR,
            {
              id: 'FORM-007',
              actor: 'gestor',
              state: 'modal-open',
              width: vp.width,
              theme,
            },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-007 overflow at ${vp.width}w ${theme}`).toBe(false);
        });
      }
    }

    // FORM-013: Editor de Alcance y Permisos Delegado
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Visual [FORM-013] Delegation Access Editor @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: '/es/delegados',
          });

          // Look for configure button in active delegation row
          const editScopeBtn = page.locator('button:has-text("Permisos"), button:has-text("Configurar"), button:has-text("Alcance")').first();
          if (await editScopeBtn.isVisible()) {
            await editScopeBtn.click({ force: true }).catch(() => {});
          }

          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(
            page,
            GESTOR_SCREENSHOTS_DIR,
            {
              id: 'FORM-013',
              actor: 'gestor',
              state: 'scope-editor-open',
              width: vp.width,
              theme,
            },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect.soft(overflow.hasOverflow, `FORM-013 overflow at ${vp.width}w ${theme}`).toBe(false);
        });
      }
    }

  });
});
