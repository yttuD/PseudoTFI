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

test.describe('UX-001: image upload is keyboard discoverable for an existing unit', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('upload control is focusable and visibly indicated', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    await page.goto('/es/mis-unidades/a0000000-0000-0000-0000-000000000001/editar');
    await expect(page.getByRole('heading', { name: 'Editar Unidad' })).toBeVisible();
    const file = page.locator('label').filter({ hasText: 'Seleccionar Archivos' }).locator('input[type="file"]');
    await expect(file).toBeAttached();
    await expect(file).toBeEnabled();
    await expect(file).toHaveAccessibleName('Seleccionar Archivos');
    await expect(file).toHaveClass(/sr-only/);
    await file.focus();
    await expect(file).toBeFocused();
    const shadow = await file.locator('xpath=..').evaluate((node) => getComputedStyle(node).boxShadow);
    expect(shadow).not.toBe('none');
  });
});
