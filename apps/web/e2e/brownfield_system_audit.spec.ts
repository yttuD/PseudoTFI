import { test, expect, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.resolve(__dirname, '../../../specs/001-brownfield-system-audit/evidence/screenshots');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const VIEWPORTS = [
  { name: '375w', width: 375, height: 667 },
  { name: '768w', width: 768, height: 1024 },
  { name: '1024w', width: 1024, height: 768 },
  { name: '1440w', width: 1440, height: 900 }
];

const THEMES = ['light', 'dark'] as const;

interface AuditSurface {
  id: string;
  name: string;
  path: string;
  role: 'anon' | 'gestor' | 'dev' | 'usuario';
  isRedirectAlias?: boolean;
  expectedRedirect?: string;
  blocker?: string;
}

// 24 Rendered Surfaces + 1 Redirect Alias (SURF-014 -> SURF-011)
const SURFACES: AuditSurface[] = [
  // Public Marketplace (anon)
  { id: 'SURF-001', name: 'Home / Marketplace Search', path: '/es', role: 'anon' },
  { id: 'SURF-002', name: 'Catálogo de Unidades', path: '/es/unidades', role: 'anon' },
  { id: 'SURF-003', name: 'Detalle de Unidad', path: '/es/unidades/u0000000-0000-0000-0000-000000000001', role: 'anon' },
  { id: 'SURF-004', name: 'Favoritos del Usuario', path: '/es/favoritos', role: 'usuario' },
  { id: 'SURF-005', name: 'Términos y Condiciones', path: '/es/terminos', role: 'anon' },
  { id: 'SURF-006', name: 'Política de Privacidad', path: '/es/privacidad', role: 'anon' },
  { id: 'SURF-007', name: 'Inicio de Sesión', path: '/es/auth/login', role: 'anon' },
  { id: 'SURF-008', name: 'Registro de Usuario', path: '/es/auth/registro', role: 'anon' },
  { id: 'SURF-009', name: 'Onboarding Gestor', path: '/es/auth/onboarding-gestor', role: 'gestor' },

  // Gestor Panel (gestor)
  { id: 'SURF-010', name: 'Panel de Control Gestor', path: '/es/dashboard', role: 'gestor' },
  { id: 'SURF-011', name: 'Mis Unidades', path: '/es/mis-unidades', role: 'gestor' },
  { id: 'SURF-012', name: 'Nueva Unidad', path: '/es/mis-unidades/nueva', role: 'gestor' },
  { id: 'SURF-013', name: 'Editar Unidad', path: '/es/mis-unidades/u0000000-0000-0000-0000-000000000001/editar', role: 'gestor' },
  { id: 'SURF-014', name: 'Grupos de Unidades (Redirect Alias)', path: '/es/grupos', role: 'gestor', isRedirectAlias: true, expectedRedirect: '/es/mis-unidades' },
  { id: 'SURF-015', name: 'Inquilinos CRM', path: '/es/inquilinos', role: 'gestor' },
  { id: 'SURF-016', name: 'Gestión de Alquileres', path: '/es/alquileres', role: 'gestor' },
  { id: 'SURF-017', name: 'Planes y Facturación', path: '/es/facturacion', role: 'gestor' },
  { id: 'SURF-018', name: 'Facturación AFIP', path: '/es/facturacion-afip', role: 'gestor' },
  { id: 'SURF-019', name: 'Delegados y Permisos', path: '/es/delegados', role: 'gestor', blocker: 'BLOCK-SUPABASE-LOCAL' },
  { id: 'SURF-020', name: 'Métricas y Analítica', path: '/es/metricas', role: 'gestor' },
  { id: 'SURF-021', name: 'Logs de Auditoría', path: '/es/logs', role: 'gestor' },

  // Dev Dashboard (dev)
  { id: 'SURF-022', name: 'Dev Moderación', path: '/es/dev/moderacion', role: 'dev' },
  { id: 'SURF-023', name: 'Dev Logs', path: '/es/dev/logs', role: 'dev' },
  { id: 'SURF-024', name: 'Dev Métricas', path: '/es/dev/metricas', role: 'dev' },
  { id: 'SURF-025', name: 'Dev Auditoría Pagos', path: '/es/dev/auditoria-pagos', role: 'dev' },
];

test.describe('Targeted Audit Verification — Correction Pass 02', () => {
  test.setTimeout(60000);

  test('Targeted Check 1: Redirect alias /es/grupos resolves to /es/mis-unidades', async ({ browser }) => {
    // Uses authenticated gestor context
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await context.newPage();

    await page.goto('/es/grupos', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/.*\/es\/mis-unidades/, { timeout: 15000 });

    expect(page.url()).toContain('/es/mis-unidades');
    // Verify that SURF-014 is not a distinct rendered surface
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    await context.close();
  });

  test('Targeted Check 2: Explicit anonymous access to public marketplace routes', async ({ browser }) => {
    // Explicit empty storage state (strictly anonymous)
    const anonContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await anonContext.newPage();

    const responseHome = await page.goto('/es', { waitUntil: 'domcontentloaded' });
    expect(responseHome?.status()).toBe(200);
    expect(page.url()).not.toContain('/auth/login');

    const responseCatalog = await page.goto('/es/unidades', { waitUntil: 'domcontentloaded' });
    expect(responseCatalog?.status()).toBe(200);
    expect(page.url()).not.toContain('/auth/login');

    await anonContext.close();
  });

  test('Targeted Check 3: Protected operational routes reject anonymous actor', async ({ browser }) => {
    // Explicit empty storage state (strictly anonymous)
    const anonContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await anonContext.newPage();

    // Anonymous accessing gestor dashboard must redirect to login
    await page.goto('/es/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/.*\/auth\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/auth/login');

    // Anonymous accessing mis-unidades must redirect to login
    await page.goto('/es/mis-unidades', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/.*\/auth\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/auth/login');

    await anonContext.close();
  });

  test('Targeted Check 4: Dev/admin console authorization gap observation', async ({ browser }) => {
    // Anonymous is rejected to login with role=dev
    const anonContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const anonPage = await anonContext.newPage();
    await anonPage.goto('/es/dev/moderacion', { waitUntil: 'domcontentloaded' });
    await anonPage.waitForURL(/.*\/auth\/login/, { timeout: 15000 });
    expect(anonPage.url()).toContain('/auth/login');
    await anonContext.close();

    // Gestor accessing dev console: documents P1 gap where ordinary gestor is allowed
    const gestorContext = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const gestorPage = await gestorContext.newPage();
    await gestorPage.goto('/es/dev/moderacion', { waitUntil: 'domcontentloaded' });
    // In current implementation, dev/layout only redirects 'buscador', allowing gestores
    const currentUrl = gestorPage.url();
    const allowedInDev = currentUrl.includes('/dev/moderacion');
    // Record observation of P1 authorization gap
    expect(allowedInDev).toBe(true);
    await gestorContext.close();
  });

  test('Targeted Check 5: SURF-019 reproducibility and BLOCK-SUPABASE-LOCAL behavior', async ({ browser }) => {
    const gestorContext = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await gestorContext.newPage();

    let timedOutOrBlocked = false;
    try {
      await page.goto('/es/delegados', { timeout: 12000, waitUntil: 'domcontentloaded' });
      // If offline, the SSR fetch hangs or fails
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('Application error') || bodyText?.includes('Internal Server Error')) {
        timedOutOrBlocked = true;
      }
    } catch (err: any) {
      timedOutOrBlocked = true;
    }

    // Proves reproducibility of BLOCK-SUPABASE-LOCAL
    expect(timedOutOrBlocked).toBe(true);
    await gestorContext.close();
  });

  test('Targeted Check 6: Form validation assertions (FORM-010 registration disabled)', async ({ browser }) => {
    const anonContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await anonContext.newPage();

    await page.goto('/es/auth/registro', { waitUntil: 'domcontentloaded' });
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    await anonContext.close();
  });
});

// Full visual matrix test suite - available for full-matrix generation when AUDIT_FULL_MATRIX=true
test.describe('Brownfield System Audit - Multi-surface Visual & Interaction Suite', () => {
  test.skip(!process.env.AUDIT_FULL_MATRIX, 'Full matrix screenshot rerun skipped in targeted correction pass');
  test.setTimeout(180000);

  for (const surface of SURFACES) {
    if (surface.isRedirectAlias) continue; // Skip redirect aliases from visual matrix denominator

    test(`Visual capture matrix for ${surface.id} (${surface.name})`, async ({ browser }) => {
      // Use explicit actor contexts
      const storageState = surface.role === 'anon' 
        ? { cookies: [], origins: [] }
        : 'e2e/.auth/user.json';

      const context = await browser.newContext({ storageState });
      const page = await context.newPage();

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        for (const theme of THEMES) {
          const consoleErrors: string[] = [];
          const pageErrors: string[] = [];

          page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', err => {
            pageErrors.push(err.message);
          });

          const navTimeout = surface.id === 'SURF-019' ? 40000 : 25000;
          let response = null;
          try {
            response = await page.goto(surface.path, {
              timeout: navTimeout,
              waitUntil: 'domcontentloaded'
            });
          } catch (navErr) {
            if (surface.id === 'SURF-019') {
              console.warn(`[BLOCKER] SURF-019 blocked by offline local Supabase: ${navErr}`);
              return;
            }
            throw navErr;
          }

          expect(response).not.toBeNull();
          await page.waitForTimeout(600);

          const skeleton = page.locator('.animate-pulse').first();
          if (await skeleton.isVisible()) {
            await page.waitForTimeout(1500);
          }

          await page.evaluate((isDark) => {
            if (isDark) {
              document.documentElement.classList.add('dark');
              document.documentElement.setAttribute('data-theme', 'dark');
            } else {
              document.documentElement.classList.remove('dark');
              document.documentElement.setAttribute('data-theme', 'light');
            }
          }, theme === 'dark');

          await page.waitForTimeout(400);

          const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
          expect(hasDarkClass).toBe(theme === 'dark');

          const isOverflowing = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth + 5;
          });
          if (isOverflowing) {
            console.warn(`[OVERFLOW] ${surface.id} ${vp.name} ${theme} exhibits horizontal overflow`);
          }

          const filename = `${surface.id}__${surface.role}__${vp.name}__${theme}__default.png`;
          const dest = path.join(screenshotDir, filename);

          try {
            await page.screenshot({ path: dest, fullPage: true });
          } catch (scErr) {
            await page.waitForTimeout(500);
            await page.screenshot({ path: dest, fullPage: true });
          }
          expect(fs.existsSync(dest)).toBe(true);
        }
      }
      await context.close();
    });
  }
});
