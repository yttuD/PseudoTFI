import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: card navigation and favorite are separate accessible actions', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('a card offers keyboard access to details and favorites, without nested interactive elements', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades');
    const first = page.getByTestId('unit-card').first();
    await expect(first).toBeVisible();
    const detail = first.getByTestId('unit-card-detail-link');
    await expect(detail).toHaveAttribute('href', /\/es\/unidades\//);
    await expect(detail).toHaveAccessibleName(/Departamento 2 Ambientes/);
    const favorite = first.getByRole('button', { name: 'Guardar en favoritos' });
    await expect(favorite).toBeVisible();
    await expect(detail.locator('button')).toHaveCount(0);
    await detail.focus();
    await expect(detail).toBeFocused();
    await favorite.focus();
    await expect(favorite).toBeFocused();
    // The separate favorite button is above the full-card clickable overlay.
    const hitTargetIsFavorite = await favorite.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit != null && el.contains(hit);
    });
    expect(hitTargetIsFavorite).toBe(true);
    await detail.click();
    await expect(page).toHaveURL(/\/es\/unidades\/a0000000-0000-0000-0000-000000000001/);
  });
});
