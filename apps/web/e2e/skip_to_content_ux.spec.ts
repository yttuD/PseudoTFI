import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function gestorCookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
    sub: id,
    accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  })).toString('base64url')}.test`;
  return {
    name: 'sb-localhost-auth-token',
    value: `base64-${Buffer.from(JSON.stringify({
      access_token: token,
      user: { id, email: 'gestor@example.invalid', user_metadata: { role: 'gestor' } },
    })).toString('base64')}`,
    domain: 'localhost',
    path: '/',
  };
}

test.describe('UX-001: keyboard bypass for repetitive navigation', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const { locale, label } of [
    { locale: 'es', label: 'Ir al contenido principal' },
    { locale: 'en', label: 'Skip to main content' },
    { locale: 'pt', label: 'Ir para o conteúdo principal' },
  ]) {
    for (const width of [375, 1440]) {
      test(`${locale} public ${width}px: skip link is focusable and targets the main landmark`, async ({ page, context }) => {
        await context.clearCookies();
        await page.setViewportSize({ width, height: 812 });
        await page.goto(`/${locale}/unidades`);
        const skip = page.getByRole('link', { name: label });
        const main = page.getByRole('main');
        await expect(skip).toHaveAttribute('href', '#main-content');
        await expect(main).toHaveAttribute('id', 'main-content');
        await skip.focus();
        await expect(skip).toBeVisible();
        await skip.press('Enter');
        await expect(main).toBeFocused();
      });
    }
  }

  test('gestor: shortcut bypasses desktop sidebar', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/dashboard');
    const skip = page.getByRole('link', { name: 'Ir al contenido principal' });
    const main = page.getByRole('main');
    await expect(skip).toBeAttached();
    await skip.focus();
    await skip.press('Enter');
    await expect(main).toBeFocused();
  });
});
