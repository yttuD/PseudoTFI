import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function gestorCookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
    sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  })).toString('base64url')}.test`;
  const value = `base64-${Buffer.from(JSON.stringify({
    access_token: token, user: { id, email: 'gestor@example.invalid', user_metadata: { role: 'gestor' } },
  })).toString('base64')}`;
  return { name: 'sb-localhost-auth-token', value, domain: 'localhost', path: '/' };
}

test.describe('UX-001: rental validation guides people to the first problem', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('zero contract amount is not submitted; focus and alert explain the error', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/alquileres(?:\?|$)/.test(request.url())) mutations.push(request.url());
    });
    await page.goto('/es/alquileres');
    await page.getByTestId('btn-nuevo-alquiler').click();
    const amount = page.locator('#monto_total');
    await expect(amount).toHaveValue('0');
    await page.getByTestId('btn-guardar-alquiler').click();
    const summary = page.getByTestId('alquiler-validation-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('No se registró ningún alquiler.');
    await expect(amount).toBeFocused();
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await expect(amount).toHaveAttribute('aria-describedby', 'alquiler-monto-error');
    await expect(page.locator('#alquiler-monto-error')).toContainText('mayor a 0');
    expect(mutations).toEqual([]);
    await amount.fill('150000');
    await expect(amount).toHaveAttribute('aria-invalid', 'false');
  });
});
