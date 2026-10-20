import { test, expect } from '@playwright/test';
import * as path from 'path';

const BASE_URL = 'https://rendo-beta-web.vercel.app';
const EVIDENCE_DIR = path.resolve('specs/008-beta-observaciones-2026-10-02/evidence/N01/captures-remote');

test.describe('Remote Web Deployment Verification', () => {
  test('Home /es loads successfully on desktop and mobile', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const response = await page.goto(`${BASE_URL}/es`, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'remote-home-desktop.png'), fullPage: true });

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'remote-home-mobile.png'), fullPage: true });
  });

  test('Unauthenticated /es/mis-unidades redirects to login', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/es/mis-unidades`, { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/auth/login');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'remote-mis-unidades-redirect-login-desktop.png') });

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/es/mis-unidades`, { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/auth/login');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'remote-mis-unidades-redirect-login-mobile.png') });
  });
});
