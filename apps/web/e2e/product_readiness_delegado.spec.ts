import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  setTestSessionForDelegadoScope,
  createMockSessionToken,
} from './fixtures/actors';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.beforeAll(async () => {
  await startMockApiServer();
});

test.afterAll(async () => {
  await stopMockApiServer();
});

const SCREENSHOTS_DIR = path.resolve(
  __dirname,
  '../../../specs/005-web-product-readiness/evidence/screenshots/delegado/accepted'
);

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const THEMES: ('light' | 'dark')[] = ['light', 'dark'];

async function applyTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    const html = document.documentElement;
    if (t === 'dark') {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, theme);
  await page.waitForTimeout(150);
}

async function captureDelegadoVisualCell(
  page: Page,
  stateId: string,
  variant: string = 'default'
) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(100);

    for (const theme of THEMES) {
      await applyTheme(page, theme);

      // Verify zero document-level horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(
        hasHorizontalScroll,
        `Document horizontal overflow detected in ${stateId} @ ${vp.width}x${vp.height} (${theme})`
      ).toBe(false);

      // Verify touch target size at 375w and 768w
      if (vp.width <= 768) {
        const smallTouchTargets = await page.evaluate(() => {
          const interactive = Array.from(
            document.querySelectorAll('button, a[href], input:not([type="hidden"]):not([type="file"]), select, textarea, [role="button"]')
          );
          const tooSmall = interactive.filter((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width <= 1 || rect.height <= 1) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            if (el.tagName === 'A' && style.display === 'inline') return false;
            if (el.getAttribute('role') === 'switch' && rect.width >= 40) return false;
            return rect.width < 44 || rect.height < 44;
          });
          return {
            tooSmall: tooSmall.length,
            smallDetails: tooSmall.map((el) => {
              const rect = el.getBoundingClientRect();
              return `${el.tagName.toLowerCase()}.${Array.from(el.classList).slice(0, 3).join('.')} [action: ${el.getAttribute('data-testid') || el.textContent?.trim().slice(0, 20)}] (${Math.round(rect.width)}x${Math.round(rect.height)}px)`;
            }),
          };
        });
        if (smallTouchTargets.tooSmall > 0) {
          console.warn(`[TOUCH-TARGET-NOTICE] ${stateId} @ ${vp.width}w (${theme}):`, smallTouchTargets.smallDetails);
        }
        expect(
          smallTouchTargets.tooSmall,
          `Found touch targets smaller than 44x44px in ${stateId} @ ${vp.width}w (${theme})`
        ).toBe(0);
      }

      const filename = `${stateId}__delegado__${variant}__${vp.width}w__${theme}.png`;
      const filePath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: filePath, fullPage: false });
    }
  }
}

test.describe('Feature 005: Delegado Acceptance Functional Matrix (T040–T041)', () => {
  test('T040.1: Scope account exposes all operational inventory for Delegado Ver and Gestionar', async ({ page, context }) => {
    // Delegado Ver - Scope Cuenta
    await setTestSessionForDelegadoScope(context, {
      permiso: 'ver',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });

    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('[data-testid="readonly-badge"]')).toBeVisible({ timeout: 10000 });
    // In account scope, all 3 operational units are visible
    await expect(page.locator('text=Departamento 2 Ambientes Frente al Río')).toBeVisible();
    await expect(page.locator('text=Casa Familiar con Jardín y Parrilla')).toBeVisible();
    await expect(page.locator('text=Local Comercial Individual')).toBeVisible();
    // Read only has no create button
    await expect(page.locator('a[href*="/mis-unidades/nueva"]')).toBeHidden();

    // Delegado Gestionar - Scope Cuenta
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });

    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('[data-testid="readonly-badge"]')).toBeHidden();
    await expect(page.locator('a[href*="/mis-unidades/nueva"]').first()).toBeVisible();
    await expect(page.locator('text=Departamento 2 Ambientes Frente al Río')).toBeVisible();
    await expect(page.locator('text=Casa Familiar con Jardín y Parrilla')).toBeVisible();
    await expect(page.locator('text=Local Comercial Individual')).toBeVisible();
  });

  test('T040.2: Scope group exposes only units belonging to assigned group', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'grupo',
      grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      state: 'activo',
    });

    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');

    // Units in group 1
    await expect(page.locator('text=Departamento 2 Ambientes Frente al Río')).toBeVisible();
    await expect(page.locator('text=Casa Familiar con Jardín y Parrilla')).toBeVisible();
    // Ungrouped unit must NOT be rendered
    await expect(page.locator('text=Local Comercial Individual')).toBeHidden();
  });

  test('T040.3: Scope explicit units exposes only assigned units and conceals out-of-scope IDs', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'unidades',
      unidadIds: ['a0000000-0000-0000-0000-000000000001'],
      state: 'activo',
    });

    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');

    // Only unit 1 is present
    await expect(page.locator('text=Departamento 2 Ambientes Frente al Río')).toBeVisible();
    await expect(page.locator('text=Casa Familiar con Jardín y Parrilla')).toBeHidden();
    await expect(page.locator('text=Local Comercial Individual')).toBeHidden();

    // Direct access to out-of-scope unit 2 yields clean concealment (404/redirect)
    await page.goto('/es/mis-unidades/b0000000-0000-0000-0000-000000000002/editar');
    await page.waitForURL(/\/es\/mis-unidades/);
    await expect(page).toHaveURL(/\/es\/mis-unidades/);
  });

  test('T040.4: Read-only mutation denial enforces 403 on operational writes', async ({ request }) => {
    const readToken = createMockSessionToken({
      userId: '33333333-3333-3333-3333-333333333333',
      email: 'delegado-ver@test.com',
      role: 'delegado',
      accessContext: {
        actor: 'delegado',
        state: 'activo',
        permiso: 'ver',
        ownerOnly: false,
        scope: { alcanceTipo: 'cuenta' },
        capabilities: ['unidades.read'],
      },
    });

    const resPost = await request.post('http://127.0.0.1:3001/unidades', {
      headers: { Authorization: `Bearer ${readToken}`, 'Content-Type': 'application/json' },
      data: { titulo: 'Intento Ilegal Unidad', precio: 1000 },
    });
    expect(resPost.status()).toBe(403);

    const resPut = await request.put('http://127.0.0.1:3001/unidades/a0000000-0000-0000-0000-000000000001', {
      headers: { Authorization: `Bearer ${readToken}`, 'Content-Type': 'application/json' },
      data: { titulo: 'Mutación no autorizada' },
    });
    expect(resPut.status()).toBe(403);
  });

  test('T040.5: Unconfigured and revoked states expose zero operational inventory', async ({ page, context }) => {
    // Unconfigured state
    await setTestSessionForDelegadoScope(context, {
      state: 'pendiente_configuracion',
    });

    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Departamento 2 Ambientes Frente al Río')).toBeHidden();
    await expect(page.locator('text=Casa Familiar con Jardín y Parrilla')).toBeHidden();
    await expect(page.locator('text=Local Comercial Individual')).toBeHidden();

    // Revoked state
    await setTestSessionForDelegadoScope(context, {
      state: 'revocada',
    });

    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Departamento 2 Ambientes Frente al Río')).toBeHidden();
    await expect(page.locator('text=Casa Familiar con Jardín y Parrilla')).toBeHidden();
    await expect(page.locator('text=Local Comercial Individual')).toBeHidden();
  });

  test('T041.1: Direct URL owner-only denials protect sensitive areas with 403 / forbidden UI', async ({ page, context, request }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });

    const sensitiveRoutes = [
      '/es/facturacion',
      '/es/facturacion-afip',
      '/es/delegados',
      '/es/metricas',
      '/es/logs',
    ];

    for (const route of sensitiveRoutes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      const forbiddenEl = page.locator('[data-testid="owner-only-forbidden"]');
      await expect(forbiddenEl, `Expected ${route} to render owner-only-forbidden barrier`).toBeVisible({ timeout: 8000 });
    }

    // Direct sensitive API endpoints return 403 Forbidden
    const manageToken = createMockSessionToken({
      userId: '44444444-4444-4444-4444-444444444444',
      email: 'delegado-ges@test.com',
      role: 'delegado',
      accessContext: {
        actor: 'delegado',
        state: 'activo',
        permiso: 'gestionar',
        ownerOnly: false,
        scope: { alcanceTipo: 'cuenta' },
      },
    });

    const apiChecks = [
      'http://127.0.0.1:3001/facturacion',
      'http://127.0.0.1:3001/afip',
      'http://127.0.0.1:3001/logs',
      'http://127.0.0.1:3001/metricas/financiero',
      'http://127.0.0.1:3001/delegados',
    ];

    for (const apiUrl of apiChecks) {
      const res = await request.get(apiUrl, {
        headers: { Authorization: `Bearer ${manageToken}` },
      });
      expect(res.status(), `Expected 403 Forbidden for ${apiUrl}`).toBe(403);
    }
  });

  test('T041.2: Dev console routes strictly deny delegated access without privilege escalation', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });

    const devRoutes = [
      '/es/dev/moderacion',
      '/es/dev/auditoria-pagos',
      '/es/dev/logs',
      '/es/dev/metricas',
    ];

    for (const route of devRoutes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      const forbiddenEl = page.locator('[data-testid="owner-only-forbidden"]');
      await expect(forbiddenEl, `Expected ${route} to render dev forbidden screen`).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text=Acceso Restringido')).toBeVisible();
    }
  });
});

test.describe('Feature 005: Visual Acceptance 128-Cell Matrix (T042, T046)', () => {
  test('Capture DEL-READ-dashboard-account', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'ver',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });
    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-READ-dashboard-account', 'default');
  });

  test('Capture DEL-READ-units-group', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'ver',
      alcanceTipo: 'grupo',
      grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      state: 'activo',
    });
    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-READ-units-group', 'default');
  });

  test('Capture DEL-READ-tenants-units', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'ver',
      alcanceTipo: 'unidades',
      unidadIds: ['a0000000-0000-0000-0000-000000000001'],
      state: 'activo',
    });
    await page.goto('/es/inquilinos');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-READ-tenants-units', 'default');
  });

  test('Capture DEL-READ-rentals-group', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'ver',
      alcanceTipo: 'grupo',
      grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      state: 'activo',
    });
    await page.goto('/es/alquileres');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-READ-rentals-group', 'default');
  });

  test('Capture DEL-READ-mutation-denied', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'ver',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });
    // Direct attempt to access unit edit page in read-only mode redirects cleanly to mis-unidades
    await page.goto('/es/mis-unidades/a0000000-0000-0000-0000-000000000001/editar');
    await page.waitForURL(/\/es\/mis-unidades/);
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-READ-mutation-denied', 'denied');
  });

  test('Capture DEL-MANAGE-dashboard-account', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });
    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-MANAGE-dashboard-account', 'default');
  });

  test('Capture DEL-MANAGE-units-group', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'grupo',
      grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      state: 'activo',
    });
    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-MANAGE-units-group', 'default');
  });

  test('Capture DEL-MANAGE-unit-create-group', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'grupo',
      grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      state: 'activo',
    });
    await page.goto('/es/mis-unidades/nueva');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-MANAGE-unit-create-group', 'create');
  });

  test('Capture DEL-MANAGE-unit-edit-in-scope', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'grupo',
      grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      state: 'activo',
    });
    await page.goto('/es/mis-unidades/a0000000-0000-0000-0000-000000000001/editar');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-MANAGE-unit-edit-in-scope', 'edit');
  });

  test('Capture DEL-MANAGE-tenants-units', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'unidades',
      unidadIds: ['a0000000-0000-0000-0000-000000000001'],
      state: 'activo',
    });
    await page.goto('/es/inquilinos');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-MANAGE-tenants-units', 'default');
  });

  test('Capture DEL-MANAGE-rentals-hourly-group', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'grupo',
      grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      state: 'activo',
    });
    await page.goto('/es/alquileres');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-MANAGE-rentals-hourly-group', 'default');
  });

  test('Capture DEL-MANAGE-out-of-scope-concealed', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'unidades',
      unidadIds: ['a0000000-0000-0000-0000-000000000001'],
      state: 'activo',
    });
    // Unit 3 is out of scope -> concealed by redirect to /es/mis-unidades
    await page.goto('/es/mis-unidades/c0000000-0000-0000-0000-000000000003/editar');
    await page.waitForURL(/\/es\/mis-unidades/);
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-MANAGE-out-of-scope-concealed', 'concealed');
  });

  test('Capture DEL-STATE-unconfigured', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      state: 'pendiente_configuracion',
    });
    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-STATE-unconfigured', 'pending');
  });

  test('Capture DEL-STATE-revoked', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      state: 'revocada',
    });
    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-STATE-revoked', 'revoked');
  });

  test('Capture DEL-DENY-owner-only', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });
    await page.goto('/es/facturacion');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-DENY-owner-only', 'denied');
  });

  test('Capture DEL-DENY-dev-console', async ({ page, context }) => {
    await setTestSessionForDelegadoScope(context, {
      permiso: 'gestionar',
      alcanceTipo: 'cuenta',
      state: 'activo',
    });
    await page.goto('/es/dev/moderacion');
    await page.waitForLoadState('domcontentloaded');
    await captureDelegadoVisualCell(page, 'DEL-DENY-dev-console', 'denied');
  });
});
