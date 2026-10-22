import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function gestorCookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
    sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  })).toString('base64url')}.test`;
  return { name: 'sb-localhost-auth-token',
    value: `base64-${Buffer.from(JSON.stringify({
      access_token: token, user: { id, email: 'gestor@example.invalid', user_metadata: { role: 'gestor' } },
    })).toString('base64')}`, domain: 'localhost', path: '/' };
}

test.describe('UX-001: unit form sections remain reachable without excessive mobile scrolling', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const { locale, jump, prices } of [
    { locale: 'es', jump: 'Ir a una sección', prices: 'Tarifas y precios' },
    { locale: 'en', jump: 'Jump to a section', prices: 'Rates and prices' },
    { locale: 'pt', jump: 'Ir para uma seção', prices: 'Tarifas e preços' },
  ]) {
    test(`${locale}: mobile section switch reaches prices and location`, async ({ page, context }) => {
      await context.clearCookies();
      await context.addCookies([gestorCookie()]);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/${locale}/mis-unidades/nueva`);
      const nav = page.getByTestId('unidad-mobile-section-nav');
      const selector = nav.getByRole('combobox', { name: jump });
      await expect(nav).toBeVisible();
      await selector.selectOption('modalidades');
      await expect(selector).toHaveValue('modalidades');
      await expect(page.locator('#modalidades')).toBeInViewport({ ratio: 0.1 });
      await expect(selector.getByRole('option', { name: prices })).toHaveCount(1);
      await selector.selectOption('ubicacion');
      await expect(page.locator('#ubicacion')).toBeInViewport({ ratio: 0.1 });
    });
  }

  test('desktop keeps the existing section navigation instead', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/mis-unidades/nueva');
    await expect(page.getByTestId('unidad-mobile-section-nav')).toBeHidden();
    await expect(page.getByRole('button', { name: /3\. Tarifas & Precios/ })).toBeVisible();
  });
});
