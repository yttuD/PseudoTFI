import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const artifactDir = process.env.ARTIFACT_DIR || path.join('C:', 'Users', 'carlo', '.gemini', 'antigravity-ide', 'brain', 'a616a5c7-dabe-4098-bbb8-1b2573a889d1');
const outDir = path.join(artifactDir, 'scratch');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

test.describe('UX Visual Audit', () => {
  test('Landing Page (Option C)', async ({ page }) => {
    await page.goto('/es');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'landing_page_initial.png'), fullPage: true });
    
    const cta = page.locator('a[href^="/es/unidades"]').first();
    if (await cta.isVisible()) {
      await cta.hover();
      await page.waitForTimeout(500); // wait for hover animation
      await page.screenshot({ path: path.join(outDir, 'landing_page_cta_hover.png') });
    }
  });

  test('Marketplace Search & Cards (Option B)', async ({ page }) => {
    await page.goto('/es/unidades');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'marketplace_search_initial.png'), fullPage: true });

    const firstCard = page.locator('a[href^="/es/unidades/"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.hover();
      await page.waitForTimeout(500); // wait for hover transform scale
      await page.screenshot({ path: path.join(outDir, 'marketplace_card_hover.png') });
      
      // Navigate to detail
      const href = await firstCard.getAttribute('href');
      if (href) {
         await page.goto(href);
         await page.waitForLoadState('networkidle');
         await page.waitForTimeout(1000);
         await page.screenshot({ path: path.join(outDir, 'marketplace_detalle.png'), fullPage: true });
      }
    }
  });

  test('Dashboard Gestor (Option A) - Login Page', async ({ page }) => {
    await page.goto('/es/auth/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'login_page.png'), fullPage: true });
  });
});
