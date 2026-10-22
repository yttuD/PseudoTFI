import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function gestorCookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
    sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  })).toString('base64url')}.test`;
  return {
    name: 'sb-localhost-auth-token',
    value: `base64-${Buffer.from(JSON.stringify({
      access_token: token, user: { id, email: 'gestor@example.invalid', user_metadata: { role: 'gestor' } },
    })).toString('base64')}`,
    domain: 'localhost', path: '/',
  };
}

test.describe('UX-001: a rental never chooses a tenant or unit on behalf of its manager', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('options can load but associations stay blank until explicitly chosen; no accidental POST', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/alquileres(?:\?|$)/.test(request.url())) writes.push(request.url());
    });
    await page.goto('/es/alquileres');
    await page.getByTestId('btn-nuevo-alquiler').click();
    const unit = page.locator('#unidad_id');
    const tenant = page.locator('#inquilino_id');
    await expect(unit.locator('option').nth(1)).toBeAttached();
    await expect(tenant.locator('option').nth(1)).toBeAttached();
    await expect(unit).toHaveValue('');
    await expect(tenant).toHaveValue('');

    await page.locator('#monto_total').fill('150000');
    await page.getByTestId('btn-guardar-alquiler').click();
    await expect(page.getByTestId('alquiler-validation-summary')).toBeVisible();
    await expect(unit).toBeFocused();
    await expect(unit).toHaveAttribute('aria-invalid', 'true');
    expect(writes).toEqual([]);

    await unit.selectOption({ index: 1 });
    await page.getByTestId('btn-guardar-alquiler').click();
    await expect(tenant).toBeFocused();
    await expect(tenant).toHaveAttribute('aria-invalid', 'true');
    expect(writes).toEqual([]);
    await tenant.selectOption({ index: 1 });
    await expect(unit).not.toHaveValue('');
    await expect(tenant).not.toHaveValue('');
    expect(writes).toEqual([]);
  });
});
