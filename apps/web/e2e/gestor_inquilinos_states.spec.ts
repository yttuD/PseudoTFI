import { expect, test } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function syntheticGestorCookie(signature: string) {
  const id = '11111111-1111-1111-1111-111111111111';
  const payload = {
    sub: id,
    accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  };
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`;
  const cookieData = {
    access_token: token,
    user: { id, email: 'qa@example.invalid', user_metadata: { role: 'gestor' } },
  };
  return {
    name: 'sb-localhost-auth-token', domain: 'localhost', path: '/',
    value: `base64-${Buffer.from(JSON.stringify(cookieData)).toString('base64')}`,
  };
}

test.describe('UX-001: Inquilinos, error vs vacío con API local controlada', () => {
  test.beforeAll(async () => {
    await startMockApiServer(3001);
  });
  test.afterAll(async () => {
    await stopMockApiServer();
  });

  test('fallo 500 muestra reintento, no borra visualmente los registros y se recupera', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([syntheticGestorCookie('service-error')]);
    await page.goto('/es/inquilinos');
    await expect(page.getByTestId('inquilinos-load-error')).toBeVisible();
    await expect(page.getByText('No pudimos cargar los inquilinos')).toBeVisible();
    await expect(page.getByText('No hay inquilinos registrados.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuevo Inquilino|Registrar Inquilino/ })).toHaveCount(0);

    await context.clearCookies();
    await context.addCookies([syntheticGestorCookie('test')]);
    await page.reload();
    await expect(page.getByTestId('inquilinos-load-error')).toHaveCount(0);
    await expect(page.getByText('Juan Manuel Pérez').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('No hay inquilinos registrados.')).toHaveCount(0);
  });

  test('sin filas confirmadas por API muestra vacío legítimo sin advertencia', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([syntheticGestorCookie('empty-inquilinos')]);
    await page.goto('/es/inquilinos');
    await expect(page.getByText('No hay inquilinos registrados.')).toBeVisible();
    await expect(page.getByTestId('inquilinos-load-error')).toHaveCount(0);
  });
});
