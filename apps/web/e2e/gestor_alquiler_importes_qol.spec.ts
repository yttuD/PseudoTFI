import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function gestorCookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
    sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  })).toString('base64url')}.test`;
  const value = `base64-${Buffer.from(JSON.stringify({
    access_token: token, user: { id, email: 'qa@example.invalid', user_metadata: { role: 'gestor' } },
  })).toString('base64')}`;
  return { name: 'sb-localhost-auth-token', value, domain: 'localhost', path: '/' };
}

test.describe('UX-001: importes reales al crear Alquiler', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('sin monto inventado ni seña personalizada ficticia; validación bloquea guardar', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    const writes: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && /\/api\/alquileres(?:\?|$)/.test(request.url())) writes.push(request.url());
    });
    await page.goto('/es/alquileres');
    await page.getByTestId('btn-nuevo-alquiler').click();
    const total = page.locator('#monto_total');
    await expect(total).toHaveValue('0');
    await expect(page.getByTestId('alquiler-monto-ayuda')).toContainText('No se precarga ningún importe de ejemplo');
    await page.getByTestId('btn-guardar-alquiler').click();
    await expect(page.getByText('El monto total debe ser mayor a 0')).toBeVisible();
    expect(writes).toHaveLength(0);
    await page.getByTestId('btn-sena-personalizada').click();
    const custom = page.getByTestId('sena-valor-input');
    await expect(custom).toHaveValue('');
    await custom.fill('5000');
    await page.getByTestId('sena-tipo-porcentaje').click();
    await expect(custom).toHaveValue('');
    await page.getByTestId('sena-tipo-monto-fijo').click();
    await expect(custom).toHaveValue('');
    expect(writes).toHaveLength(0);
  });
});
