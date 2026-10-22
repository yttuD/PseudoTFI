import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: changing catalog language preserves user filters', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('desktop catalog retains URL query and does not navigate twice', async ({ page, context }, info) => {
    test.skip(!info.project.name.includes('desktop'), 'The desktop navbar owns LanguageSelector');
    await context.clearCookies();
    await page.goto('/es/unidades?q=casa&tipo=departamento');
    const language = page.getByRole('button',{name:'Idioma'});
    await expect(language).toBeVisible();
    const requested: string[] = [];
    page.on('request',request=> {
      if (request.isNavigationRequest() && request.url().includes('/en/unidades')) requested.push(request.url());
    });
    await language.click();
    await page.getByRole('listbox',{name:'Idioma'}).getByRole('option',{name:/English/i}).click();
    await expect(page).toHaveURL(/\/en\/unidades\?q=casa&tipo=departamento/);
    const url = new URL(page.url());
    expect(url.searchParams.get('q')).toBe('casa');
    expect(url.searchParams.get('tipo')).toBe('departamento');
    expect(requested.length).toBeLessThanOrEqual(1);
  });
});
