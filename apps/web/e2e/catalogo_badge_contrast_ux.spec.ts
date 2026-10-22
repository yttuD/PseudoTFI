import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function linear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance(rgb: string) {
  const parts = rgb.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) || [];
  if (parts.length !== 3) throw Error('Expected computed RGB');
  return parts[0] * 0 + 0.2126 * linear(parts[0]) + 0.7152 * linear(parts[1]) + 0.0722 * linear(parts[2]);
}
function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
test.describe('UX-001: pricing and publishing badges remain readable above vivid photographs', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });
  test('opaque labels show at least 4.5:1 contrast in light and dark modes', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades');
    for (const mode of ['light', 'dark'] as const) {
      await page.locator('html').evaluate((node, value) => {
        node.classList.toggle('dark', value === 'dark');
      }, mode);
      const card = page.getByTestId('unit-card').first();
      for (const badge of [
        card.getByTestId('unit-card-published'),
        card.getByTestId('unit-card-price').locator('span.font-bold')
      ]) {
        await expect(badge).toBeVisible();
        const result = await badge.evaluate(el => {
          const text = getComputedStyle(el).color;
          const container = el.hasAttribute('data-testid') ? el : el.parentElement!;
          return { foreground: text, background: getComputedStyle(container).backgroundColor };
        });
        expect(result.background, 'Readable overlays need an opaque background').toMatch(/^rgb\(\d+, \d+, \d+\)$/);
        expect(contrast(result.foreground, result.background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
