import { test, expect } from '@playwright/test';

test('UX-001: menú de Gestor accesible con teclado y etiquetas EN/PT/ES', async ({ page, isMobile }) => {
  test.skip(isMobile, 'La navegación móvil tiene su propio diálogo');
  const cases = [
    { lang: 'en', units: 'Units', analytics: 'Analytics', tax: 'AFIP invoicing', profile: 'My profile', theme: 'Change theme' },
    { lang: 'pt', units: 'Unidades', analytics: 'Métricas', tax: 'Faturamento AFIP', profile: 'Meu perfil', theme: 'Alternar tema' },
    { lang: 'es', units: 'Unidades', analytics: 'Métricas', tax: 'Facturación AFIP', profile: 'Mi perfil', theme: 'Cambiar tema' },
  ];

  for (const entry of cases) {
    await page.goto(`/${entry.lang}/dashboard`);
    const units = page.getByRole('link', { name: entry.units, exact: true }).first();
    await expect(units).toBeVisible();
    await expect(units).toHaveAttribute('aria-label', entry.units);
    await expect(page.getByRole('link', { name: entry.analytics, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: entry.tax, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: entry.profile, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: entry.theme })).toBeVisible();

    // The sidebar is collapsed initially, but keyboard focus must expose labels.
    await units.focus();
    await expect(units).toBeFocused();
    await expect(units.locator('span')).toBeVisible();
  }
});

test('UX-001: navegar desde el menú móvil cierra el diálogo', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Únicamente para el drawer de móvil');
  await page.goto('/es/dashboard');
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('link', { name: 'Unidades', exact: true }).click();
  await expect(page).toHaveURL(/\/es\/mis-unidades/);
  await expect(drawer).toHaveCount(0);
});
