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

test.describe('Correction Brief 10: Seña Contract Visual Matrices (24 PNGs)', () => {

  // 1. FORM-001-sena-custom-fixed (8 captures)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Seña Contract [FORM-001-sena-custom-fixed] Fixed 65000 @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, {
          actor: 'gestor',
          width: vp.width,
          height: vp.height,
          theme,
          url: '/es/alquileres',
        });

        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await expect(btn).toBeVisible();
        await btn.click();

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Fill total contract amount
        const totalInput = dialog.locator('input[id="monto_total"], input[name="monto_total"]').first();
        await totalInput.fill('200000');

        // Select personalizada
        const btnPersonalizada = dialog.locator('[data-testid="btn-sena-personalizada"]');
        await btnPersonalizada.click();

        // Switch to monto_fijo
        const btnMontoFijo = dialog.locator('[data-testid="sena-tipo-monto-fijo"]');
        await btnMontoFijo.click();

        // Fill fixed value 65000
        const valInput = dialog.locator('[data-testid="sena-valor-input"]');
        await valInput.fill('65000');

        // Assert preview amount is reactive and shows $65.000
        const previewAmount = dialog.locator('[data-testid="sena-preview-amount"]');
        await expect(previewAmount).toContainText('65.000');

        await waitForSettledState(page, 400);

        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          {
            id: 'FORM-001-sena-custom-fixed',
            actor: 'gestor',
            state: 'custom-fixed',
            width: vp.width,
            theme,
          },
          { fullPage: true }
        );
      });
    }
  }

  // 2. FORM-001-sena-custom-percentage (8 captures)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Seña Contract [FORM-001-sena-custom-percentage] Percentage 20% @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, {
          actor: 'gestor',
          width: vp.width,
          height: vp.height,
          theme,
          url: '/es/alquileres',
        });

        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await expect(btn).toBeVisible();
        await btn.click();

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Fill total contract amount
        const totalInput = dialog.locator('input[id="monto_total"], input[name="monto_total"]').first();
        await totalInput.fill('200000');

        // Select personalizada
        const btnPersonalizada = dialog.locator('[data-testid="btn-sena-personalizada"]');
        await btnPersonalizada.click();

        // Switch to porcentaje
        const btnPorcentaje = dialog.locator('[data-testid="sena-tipo-porcentaje"]');
        await btnPorcentaje.click();

        // Fill percentage value 20
        const valInput = dialog.locator('[data-testid="sena-valor-input"]');
        await valInput.fill('20');

        // Assert preview amount is reactive and shows calculated $40.000 (20% of 200,000)
        const previewAmount = dialog.locator('[data-testid="sena-preview-amount"]');
        await expect(previewAmount).toContainText('40.000');
        await expect(previewAmount).toContainText('20% de $200.000');

        await waitForSettledState(page, 400);

        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          {
            id: 'FORM-001-sena-custom-percentage',
            actor: 'gestor',
            state: 'custom-percentage',
            width: vp.width,
            theme,
          },
          { fullPage: true }
        );
      });
    }
  }

  // 3. FORM-001-sena-unavailable (8 captures)
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Seña Contract [FORM-001-sena-unavailable] No Active Grupo @ ${vp.width}w (${theme})`, async ({ page }) => {
        await prepareGestorPage(page, {
          actor: 'gestor',
          width: vp.width,
          height: vp.height,
          theme,
          url: '/es/alquileres',
        });

        const btn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
        await expect(btn).toBeVisible();
        await btn.click();

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Select SAMPLE_UNIDAD_3 (grupo_id: null)
        const unidadSelect = dialog.locator('select[id="unidad_id"]');
        await unidadSelect.selectOption('a0000000-0000-0000-0000-000000000003');

        // Verify inheritance indicator and button are absent (no fabricated grupo info)
        await expect(dialog.locator('[data-testid="sena-inheritance-source"]')).toHaveCount(0);
        await expect(dialog.locator('[data-testid="btn-sena-heredar-grupo"]')).toHaveCount(0);

        await waitForSettledState(page, 400);

        await captureReadinessScreenshot(
          page,
          ACCEPTED_DOMAIN_DIR,
          {
            id: 'FORM-001-sena-unavailable',
            actor: 'gestor',
            state: 'unavailable',
            width: vp.width,
            theme,
          },
          { fullPage: true }
        );
      });
    }
  }

});
