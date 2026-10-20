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
  checkHorizontalOverflow,
  checkTouchTargets,
} from './fixtures/product-readiness';

const ACCEPTED_OPERATIONS_DIR = path.resolve(
  __dirname,
  '../../../specs/005-web-product-readiness/evidence/screenshots/gestor/accepted-operations'
);

if (!fs.existsSync(ACCEPTED_OPERATIONS_DIR)) {
  fs.mkdirSync(ACCEPTED_OPERATIONS_DIR, { recursive: true });
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
  await setThemeAndWait(page, options.theme, 600);
  return res;
}

interface OperationItemDef {
  key: string;
  id: string;
  state: string;
  url: string;
  expectedSelector?: string;
}

const CANONICAL_ITEMS: OperationItemDef[] = [
  { key: 'SURF-010', id: 'SURF-010', state: 'default', url: '/es/dashboard', expectedSelector: 'h1' },
  { key: 'SURF-017', id: 'SURF-017', state: 'default', url: '/es/facturacion', expectedSelector: 'h1' },
  { key: 'SURF-018', id: 'SURF-018', state: 'default', url: '/es/facturacion-afip', expectedSelector: 'h1' },
  { key: 'SURF-019', id: 'SURF-019', state: 'default', url: '/es/delegados', expectedSelector: 'h1' },
  { key: 'SURF-020', id: 'SURF-020', state: 'default', url: '/es/metricas', expectedSelector: 'h1' },
  { key: 'SURF-021', id: 'SURF-021', state: 'default', url: '/es/logs', expectedSelector: 'h1' },
  { key: 'FORM-002', id: 'FORM-002', state: 'default', url: '/es/facturacion?modal=FORM-002', expectedSelector: '[data-testid="FORM-002"]' },
  { key: 'FORM-007', id: 'FORM-007', state: 'default', url: '/es/delegados?modal=FORM-007', expectedSelector: '[data-testid="FORM-007"]' },
  { key: 'FORM-013', id: 'FORM-013', state: 'default', url: '/es/delegados?modal=FORM-013', expectedSelector: '[data-testid="FORM-013"]' },
];

const MATERIAL_STATE_ITEMS: OperationItemDef[] = [
  { key: 'SURF-010-empty', id: 'SURF-010-empty', state: 'empty', url: '/es/dashboard?state=empty', expectedSelector: 'h1' },
  { key: 'SURF-010-api-error', id: 'SURF-010-api-error', state: 'api-error', url: '/es/dashboard?state=api-error', expectedSelector: '[data-testid="dashboard-api-error"]' },
  { key: 'SURF-020-empty', id: 'SURF-020-empty', state: 'empty', url: '/es/metricas?state=empty', expectedSelector: '[data-testid="metricas-empty-state"]' },
  { key: 'SURF-020-api-error', id: 'SURF-020-api-error', state: 'api-error', url: '/es/metricas?state=api-error', expectedSelector: '[data-testid="metricas-api-error"]' },
  { key: 'SURF-021-empty', id: 'SURF-021-empty', state: 'empty', url: '/es/logs?state=empty', expectedSelector: '[data-testid="logs-empty-state"]' },
  { key: 'SURF-021-api-error', id: 'SURF-021-api-error', state: 'api-error', url: '/es/logs?state=api-error', expectedSelector: '[data-testid="logs-api-error"]' },
  { key: 'FORM-002-validation-error', id: 'FORM-002-validation-error', state: 'validation-error', url: '/es/facturacion?state=FORM-002-validation-error', expectedSelector: '[data-testid="FORM-002-validation-error"]' },
  { key: 'FORM-002-api-error', id: 'FORM-002-api-error', state: 'api-error', url: '/es/facturacion?state=FORM-002-api-error', expectedSelector: '[data-testid="FORM-002-api-error"]' },
  { key: 'FORM-002-success', id: 'FORM-002-success', state: 'success', url: '/es/facturacion?state=FORM-002-success', expectedSelector: '[data-testid="FORM-002-success"]' },
  { key: 'FORM-007-validation-error', id: 'FORM-007-validation-error', state: 'validation-error', url: '/es/delegados?state=FORM-007-validation-error', expectedSelector: '[data-testid="FORM-007-validation-error"]' },
  { key: 'FORM-007-api-error', id: 'FORM-007-api-error', state: 'api-error', url: '/es/delegados?state=FORM-007-api-error', expectedSelector: '[data-testid="FORM-007-api-error"]' },
  { key: 'FORM-007-success', id: 'FORM-007-success', state: 'success', url: '/es/delegados?state=FORM-007-success', expectedSelector: '[data-testid="FORM-007-success"]' },
  { key: 'FORM-013-api-error', id: 'FORM-013-api-error', state: 'api-error', url: '/es/delegados?state=FORM-013-api-error', expectedSelector: '[data-testid="FORM-013-api-error"]' },
  { key: 'FORM-013-success', id: 'FORM-013-success', state: 'success', url: '/es/delegados?state=FORM-013-success', expectedSelector: '[data-testid="FORM-013-success"]' },
];

const ALL_OPERATIONS_ITEMS = [...CANONICAL_ITEMS, ...MATERIAL_STATE_ITEMS];

test.describe('Batch 03B2: Accepted Operations Visual Verification (184 PNGs)', () => {
  for (const item of ALL_OPERATIONS_ITEMS) {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Operations [${item.key}] @ ${vp.width}w (${theme})`, async ({ page }) => {
          await prepareGestorPage(page, {
            actor: 'gestor',
            width: vp.width,
            height: vp.height,
            theme,
            url: item.url,
          });

          await waitForSettledState(page, 500);

          if (item.expectedSelector) {
            await expect(page.locator(item.expectedSelector).first()).toBeVisible({ timeout: 5000 });
          }

          await captureReadinessScreenshot(
            page,
            ACCEPTED_OPERATIONS_DIR,
            { id: item.key, actor: 'gestor', state: item.state, width: vp.width, theme },
            { fullPage: true }
          );

          // Verify no document level horizontal overflow (FIND-005-031)
          const overflow = await checkHorizontalOverflow(page);
          expect(overflow.hasOverflow, `${item.key} document horizontal overflow at ${vp.width}w ${theme}`).toBe(false);

          // Verify touch targets at mobile / tablet (FIND-005-032)
          if (vp.width <= 768) {
            const touch = await checkTouchTargets(page, 44);
            if (touch.tooSmall > 0) {
              console.log(`[TOUCH-TARGET-FAIL] ${item.key} @ ${vp.width}w (${theme}):`, touch.smallDetails);
            }
            expect(touch.tooSmall, `${item.key} touch targets < 44px at ${vp.width}w ${theme}: ${touch.smallDetails.join(', ')}`).toBe(0);
          }
        });
      }
    }
  }
});
