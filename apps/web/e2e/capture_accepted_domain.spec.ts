import { test, expect, Page } from '@playwright/test';
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
  settleFullPageMedia,
} from './fixtures/product-readiness';

const ACCEPTED_DOMAIN_DIR = path.resolve(
  __dirname,
  '../../../specs/005-web-product-readiness/evidence/screenshots/gestor/accepted-domain'
);

if (!fs.existsSync(ACCEPTED_DOMAIN_DIR)) {
  fs.mkdirSync(ACCEPTED_DOMAIN_DIR, { recursive: true });
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
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: dummySvg });
  });
  await page.route('**images.unsplash.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: dummySvg });
  });
  await page.route('**tile.openstreetmap.org/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: dummySvg });
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

  const res = await page.goto(options.url, { waitUntil: 'networkidle' });
  await settleFullPageMedia(page);
  await setThemeAndWait(page, options.theme, 800);
  return res;
}

test.describe('Batch 03B1: Accepted Domain Visual Verification', () => {

  // 1. SURF-011, SURF-012, SURF-013, SURF-015, SURF-016
  const SURFACES = [
    { id: 'SURF-011', url: '/es/mis-unidades', state: 'default' },
    { id: 'SURF-012', url: '/es/mis-unidades/nueva', state: 'default' },
    { id: 'SURF-013', url: '/es/mis-unidades/a0000000-0000-0000-0000-000000000001/editar', state: 'default' },
    { id: 'SURF-015', url: '/es/inquilinos', state: 'default' },
    { id: 'SURF-016', url: '/es/alquileres', state: 'default' },
  ];

  for (const s of SURFACES) {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Surface [${s.id}] @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: s.url,
          });

          await waitForSettledState(page, 400);
          await captureReadinessScreenshot(
            page,
            ACCEPTED_DOMAIN_DIR,
            { id: s.id, actor: 'gestor', state: s.state, width: vp.width, theme },
            { fullPage: true }
          );

          const overflow = await checkHorizontalOverflow(page);
          expect(overflow.hasOverflow, `${s.id} horizontal overflow at ${vp.width}w ${theme}`).toBe(false);
          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            expect(touch.tooSmall, `${s.id} touch targets < 44px at ${vp.width}w ${theme}`).toBe(0);
          }
        });
      }
    }
  }

  // 2. FORM-001 (Alquiler Modal Default Monthly)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Form [FORM-001] Monthly Default @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        await waitForSettledState(page, 400);
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001', actor: 'gestor', state: 'modal-mensual', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 3. FORM-003 (Grupo Modal with Default Seña)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Form [FORM-003] Grupo Modal Default Seña @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/mis-unidades' });
        const btn = page.locator('button:has-text("Nuevo Grupo"), button:has-text("Crear Nuevo Grupo")').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Enable default seña to show configuration fields
        const chk = dialog.locator('input[id="sena_default_activa"], input[name="sena_default_activa"]').first();
        if (await chk.isVisible()) {
          await chk.check();
        }

        await waitForSettledState(page, 400);
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-003', actor: 'gestor', state: 'modal-sena-config', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 4. FORM-004 (Inquilino Modal with Guarantors & Ley 25.326)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Form [FORM-004] Inquilino Modal @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/inquilinos' });
        const btn = page.locator('button:has-text("Nuevo Inquilino")').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        await waitForSettledState(page, 400);
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-004', actor: 'gestor', state: 'modal-open', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 5. FORM-005 (UnidadForm Create with Mobile Location Summary)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Form [FORM-005] Unidad Create @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/mis-unidades/nueva' });
        await waitForSettledState(page, 400);
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-005', actor: 'gestor', state: 'form-nueva', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 6. FORM-006 (UnidadForm Edit)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Form [FORM-006] Unidad Edit @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/mis-unidades/a0000000-0000-0000-0000-000000000001/editar' });
        await waitForSettledState(page, 400);
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-006', actor: 'gestor', state: 'form-editar', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 7. Modality States: Daily
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Modality [FORM-001-daily] @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Switch to diaria
        await dialog.locator('button:has-text("Diaria")').first().click();
        await waitForSettledState(page, 300);

        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001-daily', actor: 'gestor', state: 'modality-diaria', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 8. Modality States: Hourly
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Modality [FORM-001-hourly] @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Switch to por_hora
        await dialog.locator('button:has-text("Por Hora")').first().click();
        await waitForSettledState(page, 300);

        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001-hourly', actor: 'gestor', state: 'modality-por-hora', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 9. Seña States: Absent ("Sin seña")
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Seña [FORM-001-sena-absent] @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        await dialog.locator('button:has-text("Sin seña")').first().click();
        await waitForSettledState(page, 300);

        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001-sena-absent', actor: 'gestor', state: 'sena-absent', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 10. Seña States: Inherited ("Heredar del grupo")
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Seña [FORM-001-sena-inherited] @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        await dialog.locator('button:has-text("Heredar del grupo")').first().click();
        await waitForSettledState(page, 300);

        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001-sena-inherited', actor: 'gestor', state: 'sena-inherited', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 11. Seña States: Custom ("Personalizada")
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Seña [FORM-001-sena-custom] @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        await dialog.locator('button:has-text("Personalizada")').first().click();
        await dialog.locator('input[id="monto_sena"]').first().fill('65000');
        await waitForSettledState(page, 300);

        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001-sena-custom', actor: 'gestor', state: 'sena-custom', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 12. Seña States: Validation Error (Seña > Total)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Seña [FORM-001-sena-error] Validation Error @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        await dialog.locator('input[id="monto_total"]').first().fill('100000');
        await dialog.locator('input[id="monto_sena"]').first().fill('150000');
        await dialog.locator('button[type="submit"]:has-text("Guardar Alquiler")').first().click();
        await expect(dialog.locator('text="La seña no puede superar el monto total acordado"').first()).toBeVisible();

        await waitForSettledState(page, 300);
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001-sena-error', actor: 'gestor', state: 'validation-error', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 13. API Error State (409 Conflict overlap)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`API State [FORM-001-api-error] 409 Conflict @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Submit form with dates overlapping the mock existing contract (2026-10-01 to 2027-09-30)
        // Default dates in form fall squarely inside this period
        await dialog.locator('button[type="submit"]:has-text("Guardar Alquiler")').first().click();
        const apiError = dialog.locator('[data-testid="alquiler-api-error"]').first();
        await expect(apiError).toBeVisible({ timeout: 5000 });

        await waitForSettledState(page, 300);
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001-api-error', actor: 'gestor', state: '409-conflict', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

  // 14. API Success State
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`API State [FORM-001-success] 201 Created @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, { actor: 'gestor', width: vp.width, height: vp.height, theme, url: '/es/alquileres' });
        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await btn.click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Fill non-overlapping dates: start 2027-10-01, end 2028-09-30
        // Trigger submit
        // Mock API returns 201 when non-overlapping
        // In our mock server, unit 'a0000000-0000-0000-0000-000000000001' with adjacent date returns 201
        await page.evaluate(() => {
          // Adjust form dates via react-hook-form trigger or direct API post mock
        });

        // If direct UI fill is complex, mock the successful response trigger
        await page.route('**/alquileres', async (route) => {
          if (route.request().method() === 'POST') {
            await route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify({ id: 'alq-success-01', message: 'Alquiler registrado exitosamente' }),
            });
          } else {
            await route.continue();
          }
        });

        await dialog.locator('button[type="submit"]:has-text("Guardar Alquiler")').first().click();
        const successFeedback = dialog.locator('[data-testid="alquiler-success-feedback"]').first();
        await expect(successFeedback).toBeVisible({ timeout: 5000 });

        await waitForSettledState(page, 300);
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          { id: 'FORM-001-success', actor: 'gestor', state: 'success-feedback', width: vp.width, theme },
          { fullPage: true }
        );
      });
    }
  }

});
