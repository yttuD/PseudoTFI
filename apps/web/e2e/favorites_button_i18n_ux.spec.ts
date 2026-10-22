import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: favorites announce actions and state in the selected language', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });
  test('failed favorite update reverts pressed state and announces a recoverable error', async ({ page, context }) => {
    await context.clearCookies();
    const id='11111111-1111-1111-1111-111111111111';
    await context.addCookies([{
      name:'sb-localhost-auth-token',
      value:`base64-${Buffer.from(JSON.stringify({
        access_token:'test-favorite-error-token',
        user:{id,email:'buscador@example.invalid',user_metadata:{role:'buscador'}},
      })).toString('base64')}`,
      domain:'localhost',path:'/',
    }]);
    await page.route('**/favoritos', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 503, contentType:'application/json', body:'{"message":"unavailable"}' });
      } else {
        await route.continue();
      }
    });
    await page.goto('/es/unidades');
    const favorite=page.getByTestId('unit-card').first().getByRole('button',{name:'Guardar en favoritos'});
    await expect(favorite).toHaveAttribute('aria-pressed','false');
    await favorite.click();
    await expect(page.getByRole('alert').filter({hasText:'No pudimos actualizar favoritos'})).toBeVisible();
    const errorBounds = await page.getByRole('alert').filter({hasText:'No pudimos actualizar favoritos'}).boundingBox();
    expect(errorBounds).not.toBeNull();
    expect(errorBounds!.x).toBeGreaterThanOrEqual(-1);
    expect(errorBounds!.x + errorBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await expect(favorite).toHaveAttribute('aria-pressed','false');
    await expect(favorite).toBeEnabled();
    await expect(page).toHaveURL(/\/es\/unidades$/);
  });

  for (const { locale, name } of [
    { locale:'es', name:'Guardar en favoritos' },
    { locale:'en', name:'Save to favorites' },
    { locale:'pt', name:'Salvar nos favoritos' },
  ]) {
    test(`${locale}: keyboard and screen-reader label on public listing`, async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/${locale}/unidades`);
      const favorite=page.getByTestId('unit-card').first().getByRole('button',{name});
      await expect(favorite).toBeVisible();
      await expect(favorite).toHaveAttribute('aria-pressed','false');
      await favorite.focus();
      await expect(favorite).toBeFocused();
    });
  }
});
