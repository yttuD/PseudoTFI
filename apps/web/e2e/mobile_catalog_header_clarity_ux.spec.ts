import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.describe('UX-001: mobile catalog header prioritizes search and keeps status readable', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('375px: search has room; heading and status occupy separate rows', async ({ page, context }, info) => {
    test.skip(!info.project.name.includes('mobile'), 'Run mobile header geometry once');
    await context.clearCookies();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/es/unidades');
    const search = page.getByTestId('mobile-search-shortcut');
    await expect(search).toBeVisible();
    const searchBounds = await search.boundingBox();
    expect(searchBounds?.width ?? 0, 'Search affordance should not shrink to a single character').toBeGreaterThanOrEqual(90);
    const locationLabel = page.getByTestId('mobile-location-badge').locator('span');
    await expect(locationLabel).toHaveClass(/sr-only/);
    const resultHead = page.getByTestId('catalog-results-heading');
    const title = resultHead.locator('h1');
    const count = resultHead.locator('span').first();
    await expect(title).toBeVisible();
    await expect(count).toBeVisible();
    const titleBox = await title.boundingBox();
    const countBox = await count.boundingBox();
    expect(titleBox && countBox).toBeTruthy();
    expect(countBox!.y - (titleBox!.y + titleBox!.height)).toBeGreaterThanOrEqual(7);
    await page.screenshot({ path: 'test-results/mobile-catalog-header-375.png' });
  });
});
