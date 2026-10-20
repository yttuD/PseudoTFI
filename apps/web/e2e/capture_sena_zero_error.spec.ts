import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';
import { setTestSessionForActor } from './fixtures/actors';
import {
  setThemeAndWait,
  waitForSettledState,
  captureReadinessScreenshot,
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

test.describe('Correction Brief 09: FORM-003-sena-zero-error Visual & Validation Matrix', () => {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Form [FORM-003-sena-zero-error] Grupo Modal Active Seña Value 0 Error @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, {
          actor: 'gestor',
          width: vp.width,
          height: vp.height,
          theme,
          url: '/es/mis-unidades',
        });

        const btn = page.locator('button:has-text("Nuevo Grupo"), button:has-text("Crear Nuevo Grupo")').first();
        await expect(btn).toBeVisible();
        await btn.click();

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Fill required group name
        const nombreInput = dialog.locator('input[id="nombre"], input[name="nombre"]').first();
        await nombreInput.fill('Grupo Seña Cero Test');

        // Check active default seña checkbox
        const chk = dialog.locator('input[id="sena_default_activa"], input[name="sena_default_activa"]').first();
        await expect(chk).toBeVisible();
        await chk.check();

        // Fill 0 in seña default value
        const senaValueInput = dialog.locator('input[id="sena_default_valor"], [data-testid="grupo-sena-default"]').first();
        await expect(senaValueInput).toBeVisible();
        await senaValueInput.fill('0');

        // Attempt submission to trigger validation
        const submitBtn = dialog.locator('button[type="submit"]:has-text("Crear Grupo"), button[type="submit"]:has-text("Guardar")').first();
        await submitBtn.click();

        // Inline error must be visible with actionable copy
        const errorEl = dialog.locator('[data-testid="grupo-sena-error"]').first();
        await expect(errorEl).toBeVisible();
        await expect(errorEl).toContainText('El valor de la seña debe ser mayor a 0');

        // Verify modal remains open (submission prevented)
        await expect(dialog).toBeVisible();

        await waitForSettledState(page, 400);

        // Capture non-overwriting screenshot
        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          {
            id: 'FORM-003-sena-zero-error',
            actor: 'gestor',
            state: 'error',
            width: vp.width,
            theme,
          },
          { fullPage: true }
        );
      });
    }
  }
});
