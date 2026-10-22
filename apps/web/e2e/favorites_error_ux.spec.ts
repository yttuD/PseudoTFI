import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function authCookie(token: string) {
  const id = '11111111-1111-1111-1111-111111111111';
  const user = { id, email: 'user@example.invalid', user_metadata: { role: 'buscador' } };
  return {
    name: 'sb-localhost-auth-token',
    value: `base64-${Buffer.from(JSON.stringify({ access_token: token, user })).toString('base64')}`,
    domain: 'localhost',
    path: '/',
  };
}

test.describe('UX-001: favorites never misrepresent a failed request as an empty collection', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const { locale, error, empty } of [
    { locale: 'es', error: 'No pudimos cargar tus favoritos', empty: 'Aún no tienes favoritos guardados' },
    { locale: 'en', error: "Your favorites couldn't be loaded", empty: 'No saved favorites yet' },
    { locale: 'pt', error: 'Não foi possível carregar seus favoritos', empty: 'Você ainda não tem favoritos' },
  ]) {
    test(`${locale}: API 500 displays recovery, not an empty list`, async ({ page, context }) => {
      await context.clearCookies();
      await context.addCookies([authCookie('test.service-error.token')]);
      await page.goto(`/${locale}/favoritos?simulate-error=true`);
      await expect(page.getByTestId('favorites-load-error')).toBeVisible();
      await expect(page.getByRole('heading', { name: error })).toBeVisible();
      await expect(page.getByRole('heading', { name: empty })).toHaveCount(0);
      await expect(page.getByRole('link', { name: /Reintentar|Try again|Tentar novamente/ })).toBeVisible();
    });

    test(`${locale}: HTTP 200 empty response displays genuine empty state`, async ({ page, context }) => {
      await context.clearCookies();
      await context.addCookies([authCookie('test.empty-favs.token')]);
      await page.goto(`/${locale}/favoritos?empty=true`);
      await expect(page.getByRole('heading', { name: empty })).toBeVisible();
      await expect(page.getByTestId('favorites-load-error')).toHaveCount(0);
    });
  }
});
