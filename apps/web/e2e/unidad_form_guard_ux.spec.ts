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
    })).toString('base64')}`,
    domain: 'localhost', path: '/' };
}

test.describe('UX-001: unit form should prevent accidental data loss and guide validation', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    await page.goto('/es/mis-unidades/nueva');
    await expect(page.getByRole('heading', { name: 'Nueva Unidad' })).toBeVisible();
  });

  test('clean Cancel returns without a confirmation or mutation', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(/\/es\/mis-unidades\/?$/);
    await expect(page.getByTestId('unidad-unsaved-confirm')).toHaveCount(0);
  });

  test('Cancel with edits retains the draft until explicit discard', async ({ page }) => {
    const title = page.locator('input[name="titulo_es"]');
    await title.fill('Casa de prueba UX');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    const warning = page.getByTestId('unidad-unsaved-confirm');
    await expect(warning).toBeVisible();
    await expect(page).toHaveURL(/\/es\/mis-unidades\/nueva/);
    await expect(title).toHaveValue('Casa de prueba UX');
    const continueEditing = page.getByTestId('unidad-seguir-editando');
    await expect(continueEditing).toBeFocused();
    await continueEditing.click();
    await expect(warning).toHaveCount(0);
    await expect(title).toHaveValue('Casa de prueba UX');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByTestId('unidad-descartar-cambios').click();
    await expect(page).toHaveURL(/\/es\/mis-unidades\/?$/);
  });

  test('invalid tariff directs the user to the specific price field without POST', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/unidades')) writes.push(request.url());
    });
    await page.getByRole('button', { name: 'Alquiler por Día', exact: false }).click();
    const price = page.getByTestId('input-precio');
    await expect(price).toHaveValue('');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(price).toHaveAttribute('aria-invalid', 'true');
    await expect(price).toBeFocused();
    await expect(page.getByText('Ingresá un precio válido en ARS (0 o más).')).toBeVisible();
    await expect(page).toHaveURL(/\/es\/mis-unidades\/nueva/);
    expect(writes).toEqual([]);
    await price.fill('12300');
    await page.getByRole('button', { name: 'Guardar borrador' }).focus();
    await expect(price).toHaveAttribute('aria-invalid', 'false');
  });
});
