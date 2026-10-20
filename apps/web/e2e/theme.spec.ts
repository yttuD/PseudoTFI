import { test, expect } from '@playwright/test';

test.describe('Theme Toggle (next-themes & Skiper4)', () => {
  test('conmuta la clase .dark en el documento y persiste el estado', async ({ page }) => {
    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    // Ubicar el botón de alternar tema
    const toggleBtn = page.locator('button[aria-label*="modo"]');
    await expect(toggleBtn).toBeVisible();

    // Obtener estado inicial de la clase dark en <html>
    const initialIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    // Hacer clic en el toggle
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // Verificar que la clase dark cambió
    const afterClickIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(afterClickIsDark).toBe(!initialIsDark);

    // Recargar la página y verificar persistencia en localStorage
    await page.reload();
    await page.waitForLoadState('networkidle');

    const persistedIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(persistedIsDark).toBe(afterClickIsDark);
  });
});
