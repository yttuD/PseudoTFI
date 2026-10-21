import { expect, test } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function cookie(signature: string, actor: 'gestor' | 'delegado' = 'gestor') {
  const id = '11111111-1111-1111-1111-111111111111';
  const claims = {
    sub: id,
    accessContext: actor === 'gestor'
      ? { actor, ownerOnly: true, capabilities: ['*'] }
      : { actor, state: 'activo', permiso: 'ver', scope: { alcanceTipo: 'cuenta' } },
  };
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}`;
  const value = `base64-${Buffer.from(JSON.stringify({
    access_token: token, user: { id, email: 'qa@example.invalid', user_metadata: { role: actor } },
  })).toString('base64')}`;
  return { name: 'sb-localhost-auth-token', value, domain: 'localhost', path: '/' };
}

test.describe('UX-001: Delegados SSR and client operations with local API only', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('error 500 and invalid payload are not shown as an empty team; recovery works', async ({ page, context }) => {
    for (const signature of ['delegados-error', 'invalid-delegados']) {
      await context.clearCookies();
      await context.addCookies([cookie(signature)]);
      await page.goto('/es/delegados');
      await expect(page.getByTestId('delegados-load-error')).toBeVisible();
      await expect(page.getByText('No pudimos cargar tu equipo de delegados')).toBeVisible();
      await expect(page.getByTestId('empty-delegados')).toHaveCount(0);
      await expect(page.getByTestId('cancel-invitation-btn')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    }

    await context.clearCookies();
    await context.addCookies([cookie('test')]);
    await page.reload();
    await expect(page.getByTestId('delegados-load-error')).toHaveCount(0);
    await expect(page.getByTestId('invitacion-row-inv-test-only-001')).toBeVisible();
  });

  test('invitation survives failed cancellation; is hidden only after 204 success', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([cookie('cancel-error')]);
    await page.goto('/es/delegados');
    const invite = page.getByTestId('invitacion-row-inv-test-only-001');
    await expect(invite).toBeVisible();
    // Allow the initial browser session refresh to settle before exercising actions.
    await page.waitForResponse(r => r.url().includes('/api/delegados') && r.request().method() === 'GET');
    await page.getByTestId('cancel-invitation-btn').click();
    await expect(page.getByTestId('delegados-action-error')).toContainText('No se pudo cancelar la invitación');
    await expect(invite).toBeVisible();

    await context.clearCookies();
    await context.addCookies([cookie('test')]);
    await page.reload();
    await expect(invite).toBeVisible();
    await page.waitForResponse(r => r.url().includes('/api/delegados') && r.request().method() === 'GET');
    await page.getByTestId('cancel-invitation-btn').click();
    await expect(invite).toHaveCount(0);
    await expect(page.getByTestId('delegados-action-error')).toHaveCount(0);
  });

  test('confirmed empty team has a genuine empty state', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([cookie('empty-delegados')]);
    await page.goto('/es/delegados');
    await expect(page.getByTestId('empty-delegados')).toBeVisible();
    await expect(page.getByTestId('delegados-load-error')).toHaveCount(0);
  });

  test('delegate in read-only mode cannot manage a team', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([cookie('delegate-test', 'delegado')]);
    await page.goto('/es/delegados');
    await expect(page.getByTestId('owner-only-forbidden')).toBeVisible();
    await expect(page.getByTestId('invitacion-row-inv-test-only-001')).toHaveCount(0);
  });
});
