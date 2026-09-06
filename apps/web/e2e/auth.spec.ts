import { test, expect } from '@playwright/test';

test.describe('Gestor Protected Routes (No Auth)', () => {
  // Disable storage state for this suite to test unauthenticated access
  test.use({ storageState: { cookies: [], origins: [] } });

  test('GET /es/dashboard sin cookies → redirect a /es/auth/login', async ({ page }) => {
    await page.goto('/es/dashboard');
    await expect(page).toHaveURL(/.*\/es\/auth\/login/);
  });

  test('GET /es/mis-unidades sin cookies → redirect a /es/auth/login', async ({ page }) => {
    await page.goto('/es/mis-unidades');
    await expect(page).toHaveURL(/.*\/es\/auth\/login/);
  });
});
