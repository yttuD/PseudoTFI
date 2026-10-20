import { test, expect } from '@playwright/test';
import path from 'node:path';

const screenshotDir = path.resolve(__dirname, '../../../specs/006-closed-beta-readiness/evidence/screenshots');

for (const view of [
  { width: 1440, height: 900, theme: 'light' as const, name: 'catalog-error-desktop-light.png' },
  { width: 375, height: 812, theme: 'dark' as const, name: 'catalog-error-mobile-dark.png' },
]) {
  test(`beta catalog outage is honest at ${view.width}px ${view.theme}`, async ({ page }) => {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.emulateMedia({ colorScheme: view.theme });
    const response = await page.goto('/es/unidades', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('alert')).toContainText('no está disponible temporalmente');
    await expect(page.getByText('Departamento 2 Ambientes Frente al Río')).toHaveCount(0);
    if (view.width < 768) {
      await expect(page.getByRole('button', { name: 'Filtros del Catálogo' })).toHaveAttribute('aria-expanded', 'false');
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    await page.screenshot({ path: path.join(screenshotDir, view.name), fullPage: true });
  });
}

for (const view of [
  { width: 1440, height: 900, theme: 'light' as const, name: 'home-beta-desktop-light.png' },
  { width: 375, height: 812, theme: 'dark' as const, name: 'home-beta-mobile-dark.png' },
]) {
  test(`beta home is honest at ${view.width}px ${view.theme}`, async ({ page }) => {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.emulateMedia({ colorScheme: view.theme });
    const response = await page.goto('/es', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText('Beta cerrada de Rendo')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Una prueba para mejorar Rendo' })).toBeVisible();
    await expect(page.getByText('Cabaña Vista Río Paraná')).toHaveCount(0);
    await expect(page.getByText('0% Comisiones por Alquiler')).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    await page.screenshot({ path: path.join(screenshotDir, view.name), fullPage: true });
  });
}

for (const view of [
  { width: 1440, height: 900, theme: 'light' as const, name: 'detail-error-desktop-light.png' },
  { width: 375, height: 812, theme: 'dark' as const, name: 'detail-error-mobile-dark.png' },
]) {
  test(`beta detail outage has no fabricated unit at ${view.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.emulateMedia({ colorScheme: view.theme });
    const response = await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('alert')).toContainText('El detalle no está disponible temporalmente');
    await expect(page.getByText('Departamento 2 Ambientes Frente al Río')).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    await page.screenshot({ path: path.join(screenshotDir, view.name), fullPage: true });
  });
}

test('internal mock console cannot be opened in beta', async ({ page }) => {
  const response = await page.goto('/es/dev/moderacion', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
});

test('beta login rejects a browser-local account when Supabase is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    localStorage.setItem('rendo_local_accounts', JSON.stringify([{
      id: 'local-1', email: 'beta-seeker@example.test', password: 'local-pass', role: 'gestor',
    }]));
  });
  await page.route('**/*.example.test/**', (route) => route.abort('failed'));
  await page.goto('/es/auth/login?portal=marketplace', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill('beta-seeker@example.test');
  await page.locator('#password').fill('local-pass');
  await page.locator('form:has(#email) button[type="submit"]').click();
  await expect(page.getByText('No pudimos conectarnos para iniciar sesión. Intentá de nuevo más tarde.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Teléfono / SMS' })).toHaveCount(0);
  expect(page.url()).toContain('/auth/login');
  expect((await page.context().cookies()).some((cookie) => cookie.name === 'sb-localhost-auth-token')).toBe(false);
  await page.screenshot({ path: path.join(screenshotDir, 'login-error-mobile-dark.png'), fullPage: true });
});

test('beta registration does not create a local account on network failure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.route('**/*.example.test/**', (route) => route.abort('failed'));
  await page.goto('/es/auth/registro?portal=gestor', { waitUntil: 'domcontentloaded' });
  await page.locator('#fullName').fill('Beta Tester');
  await page.locator('#email').fill('beta-manager@example.test');
  await page.locator('#password').fill('correct-horse-battery');
  await page.locator('form:has(#email) button[type="submit"]').click();
  await expect(page.getByText('No pudimos conectarnos para completar el registro. Intentá de nuevo más tarde.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Teléfono / SMS' })).toHaveCount(0);
  expect(page.url()).toContain('/auth/registro');
  expect(await page.evaluate(() => localStorage.getItem('rendo_local_accounts'))).toBeNull();
  await page.screenshot({ path: path.join(screenshotDir, 'register-error-desktop-light.png'), fullPage: true });
});
