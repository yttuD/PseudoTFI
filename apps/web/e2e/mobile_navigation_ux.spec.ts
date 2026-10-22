import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: mobile navigation truth, keyboard and locale', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const { locale, navigation, explore, favorites, search } of [
    { locale: 'es', navigation: 'Navegación principal móvil', explore: 'Explorar', favorites: 'Favoritos', search: 'Buscar unidades' },
    { locale: 'en', navigation: 'Mobile main navigation', explore: 'Explore', favorites: 'Saved', search: 'Search listings' },
    { locale: 'pt', navigation: 'Navegação principal móvel', explore: 'Explorar', favorites: 'Favoritos', search: 'Buscar imóveis' },
  ]) {
    test(`${locale}: links are discoverable, translated and point to implemented routes`, async ({ page, context }) => {
      await context.clearCookies();
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/${locale}/unidades`);
      const nav = page.getByRole('navigation', { name: navigation });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('link', { name: explore })).toHaveAttribute('aria-current', 'page');
      await expect(nav.getByRole('link', { name: favorites })).toHaveAttribute('href', `/${locale}/favoritos`);
      await expect(nav.getByRole('link', { name: /Mapa|Map/i })).toHaveCount(0);

      const searchLink = page.getByRole('link', { name: search });
      await expect(searchLink).toHaveAttribute('href', `/${locale}/unidades`);
      await searchLink.focus();
      await expect(searchLink).toBeFocused();
    });
  }
});
